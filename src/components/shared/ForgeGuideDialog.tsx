import { useEffect, useRef, useState } from 'react';
import type { ChatStatus, UIMessage } from 'ai';
import { Factory, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput, PromptInputTextarea, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { supabase } from '@/integrations/supabase/client';
import type { ForgeGuideScope } from '@/lib/forgeGuide';

const STARTERS: Record<ForgeGuideScope['kind'], string[]> = {
  asset: ['Explain this asset and its links', 'What information is missing?', 'How do AAS, UNS and RDS fit together?'],
  node: ['Summarize this area', 'Which assets here have data gaps?', 'Which movable assets are here and what is their state?'],
  plant: ['Give me an overview of the plant', 'Where are the biggest data gaps?', 'Which movable assets need attention?'],
};
const SCOPE_LABEL: Record<ForgeGuideScope['kind'], string> = { asset: 'Asset', node: 'UNS node', plant: 'Whole plant' };

/** Touch devices: don't pop up the keyboard on open or after an answer, so the answer stays visible. */
const isTouch = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

/** Markdown answers sized for a chat panel: modest headings, real list markers, long codes wrap, wide tables scroll. */
const ANSWER_STYLE = [
  'text-sm leading-relaxed',
  '[&_h1]:text-base [&_h1]:font-semibold [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-semibold',
  '[&_h1]:mt-4 [&_h2]:mt-4 [&_h3]:mt-3 [&_h1]:mb-2 [&_h2]:mb-2 [&_h3]:mb-1',
  '[&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-5 [&_ul]:pl-5 [&_li]:my-0.5',
  '[&_code]:break-all [&_code]:whitespace-pre-wrap',
  '[&_table]:text-xs [&_th]:px-2 [&_td]:px-2 [&_th]:py-1.5 [&_td]:py-1.5 [&_td]:align-top',
].join(' ');

export function ForgeGuideDialog({ scope, open, onOpenChange }: { scope: ForgeGuideScope; open: boolean; onOpenChange: (open: boolean) => void }) {
  const starters = STARTERS[scope.kind];
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ChatStatus>('ready');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // PromptInputTextarea (AI Elements) takes ref as a prop like React 19; with
  // React 18 it is dropped, so focus the textarea through a wrapper instead
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const focusInput = () => inputWrapRef.current?.querySelector('textarea')?.focus();
  const busy = status === 'submitted' || status === 'streaming';
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!open) abortRef.current?.abort();
    if (open && !busy && !isTouch()) focusInput();
  }, [open, busy]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    const user: UIMessage = { id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text: question }] };
    const history = [...messages, user];
    const assistantId = crypto.randomUUID();
    setMessages(history);
    setInput('');
    setError(null);
    setStatus('submitted');
    const abort = new AbortController();
    abortRef.current = abort;
    let answer = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Please sign in to ask Forge Guide.');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explain-asset`, {
        method: 'POST', signal: abort.signal,
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(scope.kind === 'asset' ? { assetId: scope.id } : scope.kind === 'node' ? { nodeId: scope.id } : {}), messages: history.map(m => ({ role: m.role, content: m.parts.filter(p => p.type === 'text').map(p => p.text).join('\n') })).filter(m => m.content) }),
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error ?? 'The answer could not be loaded.');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error('The answer stream is unavailable.');
      const decoder = new TextDecoder();
      let buffer = '';
      let completed = false;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';
        for (const frame of frames) {
          const line = frame.split('\n').find(l => l.startsWith('data: '));
          if (!line) continue;
          const event: { type: string; text?: string; error?: string } = JSON.parse(line.slice(6));
          if (event.type === 'error') throw new Error(event.error ?? 'The answer stopped early.');
          if (event.type === 'done') completed = true;
          if (event.type === 'delta' && event.text) {
            answer += event.text;
            setStatus('streaming');
            setMessages([...history, { id: assistantId, role: 'assistant', parts: [{ type: 'text', text: answer }] }]);
          }
        }
      }
      if (!completed) throw new Error('The connection closed before the answer was complete.');
      if (!answer) throw new Error('No answer was returned.');
    } catch (failure) {
      if (!abort.signal.aborted) {
        setError(failure instanceof Error ? failure.message : 'The answer could not be completed.');
        setInput(question);
      }
    } finally {
      abortRef.current = null;
      setStatus('ready');
      if (!isTouch()) focusInput();
    }
  };

  const placeholder = scope.kind === 'plant' ? 'Ask about the plant…' : scope.kind === 'node' ? 'Ask about this area…' : 'Ask about this asset…';
  const loadingText = scope.kind === 'asset' ? 'Reading asset data…' : scope.kind === 'node' ? 'Reading area data…' : 'Reading plant data…';

  return <Dialog open={open} onOpenChange={onOpenChange}>
    {/* Phones: full-screen sheet sized to the visible viewport (dvh follows the on-screen keyboard); larger screens: centered panel */}
    <DialogContent
      className="flex h-[100dvh] max-w-none flex-col gap-0 overflow-hidden rounded-none border-0 p-0 max-sm:left-0 max-sm:top-0 max-sm:translate-x-0 max-sm:translate-y-0 sm:h-[min(740px,90dvh)] sm:max-w-2xl sm:rounded-lg sm:border"
      aria-describedby={undefined}
      onOpenAutoFocus={e => { if (isTouch()) e.preventDefault(); }}
    >
      <DialogHeader className="space-y-0 border-b px-4 py-3 pr-12 text-left sm:px-5 sm:py-4">
        <div className="flex items-center gap-3">
          <Factory className="hidden h-6 w-6 shrink-0 text-primary sm:block" />
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base sm:text-lg">Forge Guide</DialogTitle>
            <div className="mt-0.5 flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="shrink-0 px-1.5 text-[10px]">{scope.kind === 'node' ? scope.level : SCOPE_LABEL[scope.kind]}</Badge>
              <span className="truncate" title={scope.label}>{scope.label}</span>
            </div>
          </div>
          <Badge variant="secondary" className="hidden sm:inline-flex">Read only</Badge>
          <Button variant="ghost" size="icon-sm" title="Clear conversation" aria-label="Clear conversation" disabled={busy || messages.length === 0} onClick={() => { setMessages([]); setError(null); setInput(''); focusInput(); }}><RotateCcw className="h-4 w-4" /></Button>
        </div>
      </DialogHeader>
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-4 p-4 sm:gap-5 sm:p-5">
          {messages.length === 0 && <div className="space-y-2 py-2 sm:space-y-3 sm:py-6">
            <p className="text-sm text-muted-foreground">Read-only answers from the stored data you have access to. Nothing is changed.</p>
            {starters.map(question => <Button key={question} variant="outline" className="h-auto w-full justify-start whitespace-normal py-2.5 text-left text-sm font-normal" onClick={() => void send(question)}>{question}</Button>)}
          </div>}
          {messages.map(message => <Message key={message.id} from={message.role}>
            <MessageContent className={message.role === 'user' ? 'group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground' : `w-full ${ANSWER_STYLE}`}>
              {message.parts.map((part, index) => part.type === 'text' ? <MessageResponse key={index}>{part.text}</MessageResponse> : null)}
            </MessageContent>
          </Message>)}
          {status === 'submitted' && <Shimmer>{loadingText}</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:p-4">
        {error && <p role="alert" className="mb-2 px-1 text-sm text-destructive">{error}</p>}
        <div ref={inputWrapRef}>
        <PromptInput onSubmit={({ text }) => send(text)}>
          <PromptInputTextarea rows={1} autoFocus={!isTouch()} value={input} onChange={e => setInput(e.target.value)} placeholder={placeholder} aria-label="Question for Forge Guide" maxLength={16000} className="!min-h-11 max-h-36 py-3 pr-14 sm:!min-h-20" />
          {/* send/stop inside the field: one compact row on phones, grows only while typing */}
          <PromptInputSubmit className="absolute bottom-1.5 right-1.5" status={status} disabled={!busy && !input.trim()} onStop={() => abortRef.current?.abort()} />
        </PromptInput>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}