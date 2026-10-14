import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, CloudUpload, PlugZap, XCircle } from 'lucide-react';
import { AAS } from '@/types/industrial';
import {
  PushResult,
  checkBaSyxConnection,
  loadBaSyxUrl,
  loadBaSyxUser,
  pushAASToBaSyx,
  saveBaSyxUrl,
  saveBaSyxUser,
} from '@/lib/basyxClient';

interface BaSyxPushDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aasList: AAS[];
}

/**
 * Push AAS to an Eclipse BaSyx AAS Environment (deploy/docker-compose.yml) via
 * the AAS API (IDTA-01002). The request goes directly from the browser, so the
 * BaSyx server must be reachable from this network and allow this app's origin
 * (BASYX_CORS_ALLOWED_ORIGINS). The HTTPS proxy of the stack requires a login;
 * the username is remembered in this browser, the password only in memory.
 */
export const BaSyxPushDialog = ({ open, onOpenChange, aasList }: BaSyxPushDialogProps) => {
  const [url, setUrl] = useState(loadBaSyxUrl);
  const [username, setUsername] = useState(loadBaSyxUser);
  const [password, setPassword] = useState('');
  const credentials = username.trim() ? { username: username.trim(), password } : undefined;
  const [connection, setConnection] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<PushResult | null>(null);

  useEffect(() => {
    if (open) {
      setConnection(null);
      setResult(null);
    }
  }, [open]);

  const handleTest = async () => {
    setBusy(true);
    const error = await checkBaSyxConnection(url, { credentials });
    setConnection(error ? { ok: false, message: error } : { ok: true, message: 'BaSyx AAS Environment reachable' });
    setBusy(false);
  };

  const handlePush = async () => {
    setBusy(true);
    saveBaSyxUrl(url);
    saveBaSyxUser(username);
    setResult(await pushAASToBaSyx(url, aasList, { credentials }));
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudUpload className="h-5 w-5" /> Push to BaSyx
          </DialogTitle>
          <DialogDescription>
            Sends {aasList.length} AAS with their submodels and concept descriptions to an Eclipse BaSyx AAS
            Environment (AAS API, IDTA-01002). Existing entries with the same id are replaced.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="basyx-url">BaSyx AAS Environment URL</Label>
          <div className="flex gap-2">
            <Input id="basyx-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://localhost:8443" />
            <Button type="button" variant="outline" onClick={handleTest} disabled={busy || !url.trim()}>
              <PlugZap className="h-4 w-4 mr-2" />Test
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="basyx-user" className="text-xs">Username</Label>
              <Input id="basyx-user" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" placeholder="forge" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="basyx-password" className="text-xs">Password</Label>
              <Input id="basyx-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            URL and username are stored in this browser; the password is kept only until the page is closed.
            The server must allow this app's origin (CORS) and use a certificate your browser trusts, see deploy/README.md.
          </p>
          {connection && (
            <Alert variant={connection.ok ? 'default' : 'destructive'}>
              <AlertDescription className="text-xs">{connection.message}</AlertDescription>
            </Alert>
          )}
        </div>

        {result && (
          <div className="space-y-2">
            <div className="flex gap-2 text-sm">
              <Badge variant="secondary">{result.created} created</Badge>
              <Badge variant="secondary">{result.updated} updated</Badge>
              <Badge variant={result.failed ? 'destructive' : 'secondary'}>{result.failed} failed</Badge>
            </div>
            <ScrollArea className="h-48 rounded border p-2">
              {result.items.map((item) => (
                <div key={`${item.kind}:${item.id}`} className="flex items-start gap-2 py-1 text-xs">
                  {item.outcome === 'failed'
                    ? <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                    : <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <span className="font-medium">{item.kind}</span>{' '}
                    <code className="break-all">{item.id}</code>{' '}
                    <span className="text-muted-foreground">{item.outcome}{item.status ? ` (${item.status})` : ''}</span>
                    {item.message && <div className="text-destructive break-all">{item.message}</div>}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handlePush} disabled={busy || !url.trim() || aasList.length === 0}>
            <CloudUpload className="h-4 w-4 mr-2" />{busy ? 'Working…' : `Push ${aasList.length} AAS`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
