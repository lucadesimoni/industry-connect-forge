import { useEffect, useRef, useState } from 'react';
import type { ChatStatus, UIMessage } from 'ai';
import { Factory, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptInput, PromptInputTextarea, PromptInputFooter, PromptInputSubmit } from '@/components/ai-elements/prompt-input';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { supabase } from '@/integrations/supabase/client';
import type { AAS } from '@/types/industrial';

const starters = ['Explain this asset and its links', 'What information is missing?', 'How do AAS, UNS and RDS fit together?'];

export function AssetExplainDialog({ aas, open, onOpenChange }: { aas: AAS; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [messages, setMessages] = useState<UIMessage[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ChatStatus>('ready');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const busy = status === 'submitted' || status === 'streaming';
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    if (!open) abortRef.current?.abort();
    if (open && !busy) inputRef.current?.focus();
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
      if (!session) throw new Error('Please sign in to ask about this asset.');
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explain-asset`, {
        method: 'POST', signal: abort.signal,
        headers: { Authorization: `Bearer ${session.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId: aas.id, messages: history.map(m => ({ role: m.role, content: m.parts.filter(p => p.type === 'text').map(p => p.text).join('\n') })).filter(m => m.content) }),
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
      inputRef.current?.focus();
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex h-[min(740px,90dvh)] max-w-2xl flex-col gap-0 overflow-hidden p-0" aria-describedby={undefined}>
      <DialogHeader className="border-b px-5 py-4 pr-12">
        <div className="flex items-center gap-3">
          <Factory className="h-6 w-6 shrink-0 text-primary" />
          <div className="min-w-0 flex-1"><DialogTitle>Forge Guide</DialogTitle><p className="mt-1 truncate text-sm text-muted-foreground">{aas.idShort}</p></div>
          <Badge variant="secondary">Read only</Badge>
          <Button variant="ghost" size="icon-sm" title="Clear conversation" aria-label="Clear conversation" disabled={busy} onClick={() => { setMessages([]); setError(null); setInput(''); inputRef.current?.focus(); }}><RotateCcw className="h-4 w-4" /></Button>
        </div>
      </DialogHeader>
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="gap-5 p-5">
          {messages.length === 0 && <div className="space-y-3 py-6"><h3 className="text-base font-semibold">{aas.idShort}</h3>{starters.map(question => <Button key={question} variant="outline" className="h-auto w-full justify-start whitespace-normal py-3 text-left" onClick={() => void send(question)}>{question}</Button>)}</div>}
          {messages.map(message => <Message key={message.id} from={message.role}>
            <MessageContent className={message.role === 'user' ? 'group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground' : 'w-full'}>
              {message.parts.map((part, index) => part.type === 'text' ? <MessageResponse key={index}>{part.text}</MessageResponse> : null)}
            </MessageContent>
          </Message>)}
          {status === 'submitted' && <Shimmer>Reading asset data…</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="border-t p-4">
        {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
        <PromptInput onSubmit={({ text }) => send(text)}>
          <PromptInputTextarea ref={inputRef} autoFocus value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about this asset…" aria-label="Question about this asset" maxLength={16000} className="min-h-20" />
          <PromptInputFooter className="justify-end"><PromptInputSubmit status={status} disabled={!busy && !input.trim()} onStop={() => abortRef.current?.abort()} /></PromptInputFooter>
        </PromptInput>
      </div>
    </DialogContent>
  </Dialog>;
}