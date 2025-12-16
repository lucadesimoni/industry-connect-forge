import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Check, Zap, Info } from 'lucide-react';
import { useState } from 'react';
import { AASSubmodel, AAS, UNSNode } from '@/types/industrial';
import { 
  generateSubmodelPayload, 
  generateAASBirthPayload, 
  generateAASSparkplugTopic,
  generateExamplePayload,
  formatPayloadJSON,
  SparkplugPayload 
} from '@/lib/sparkplugPayload';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SparkplugPayloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submodel?: AASSubmodel | null;
  aas?: AAS | null;
  unsNode?: UNSNode | null;
  mode?: 'submodel' | 'aas' | 'example';
}

export const SparkplugPayloadDialog = ({ 
  open, 
  onOpenChange, 
  submodel, 
  aas,
  unsNode,
  mode = 'submodel' 
}: SparkplugPayloadDialogProps) => {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  // Generate payloads based on mode
  const getPayloadData = () => {
    if (mode === 'example') {
      const example = generateExamplePayload();
      return {
        topic: example.topic,
        ddataPayload: example.payload,
        dbirthPayload: null,
        description: example.description,
      };
    }

    if (mode === 'aas' && aas) {
      return {
        topic: generateAASSparkplugTopic(aas, unsNode || null, 'DDATA'),
        ddataPayload: aas.submodels.length > 0 
          ? generateSubmodelPayload(aas.submodels[0], aas.idShort)
          : null,
        dbirthPayload: generateAASBirthPayload(aas, unsNode || null),
        description: `Sparkplug B payloads for AAS instance: ${aas.idShort}`,
      };
    }

    if (mode === 'submodel' && submodel) {
      const namespace = aas?.idShort || 'Device';
      return {
        topic: aas 
          ? generateAASSparkplugTopic(aas, unsNode || null, 'DDATA')
          : `spBv1.0/namespace/group/DDATA/${namespace}`,
        ddataPayload: generateSubmodelPayload(submodel, namespace),
        dbirthPayload: null,
        description: `Sparkplug B DDATA payload for submodel: ${submodel.idShort}`,
      };
    }

    return null;
  };

  const payloadData = getPayloadData();

  if (!payloadData) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Sparkplug B Payload Preview
          </DialogTitle>
          <DialogDescription>
            {payloadData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Topic */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">MQTT Topic</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(payloadData.topic, 'topic')}
              >
                {copied === 'topic' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <code className="block bg-muted p-3 rounded-md text-sm font-mono break-all">
              {payloadData.topic}
            </code>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-md p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-blue-400 mb-1">Sparkplug B Best Practice</p>
              <p>
                AAS submodels map naturally to Sparkplug B metrics. Each property becomes a metric with:
                name (idShort), dataType (valueType), value, and optional properties (unit, description).
                Use DBIRTH on device connect and DDATA for periodic updates.
              </p>
            </div>
          </div>

          {/* Payload Tabs */}
          <Tabs defaultValue="ddata" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ddata" disabled={!payloadData.ddataPayload}>
                DDATA Payload
              </TabsTrigger>
              <TabsTrigger value="dbirth" disabled={!payloadData.dbirthPayload}>
                DBIRTH Payload
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="ddata" className="mt-4">
              {payloadData.ddataPayload && (
                <PayloadView 
                  payload={payloadData.ddataPayload} 
                  onCopy={(text) => handleCopy(text, 'ddata')}
                  copied={copied === 'ddata'}
                />
              )}
            </TabsContent>
            
            <TabsContent value="dbirth" className="mt-4">
              {payloadData.dbirthPayload && (
                <PayloadView 
                  payload={payloadData.dbirthPayload} 
                  onCopy={(text) => handleCopy(text, 'dbirth')}
                  copied={copied === 'dbirth'}
                />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface PayloadViewProps {
  payload: SparkplugPayload;
  onCopy: (text: string) => void;
  copied: boolean;
}

const PayloadView = ({ payload, onCopy, copied }: PayloadViewProps) => {
  const jsonString = formatPayloadJSON(payload);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{payload.metrics.length} metrics</Badge>
          <Badge variant="secondary">seq: {payload.seq}</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={() => onCopy(jsonString)}>
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy JSON
            </>
          )}
        </Button>
      </div>

      <ScrollArea className="h-[400px] w-full rounded-md border">
        <pre className="p-4 text-xs font-mono bg-muted/50">
          {jsonString}
        </pre>
      </ScrollArea>

      {/* Metrics Summary */}
      <div className="space-y-2">
        <span className="text-sm font-medium">Metrics Summary</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[150px] overflow-y-auto">
          {payload.metrics.slice(0, 10).map((metric, idx) => (
            <div key={idx} className="bg-muted/50 p-2 rounded text-xs">
              <code className="font-mono text-primary">{metric.name}</code>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-[10px]">{metric.dataType}</Badge>
                <span className="text-muted-foreground truncate">
                  {String(metric.value).substring(0, 30)}
                </span>
              </div>
            </div>
          ))}
          {payload.metrics.length > 10 && (
            <div className="col-span-2 text-center text-xs text-muted-foreground py-2">
              ... and {payload.metrics.length - 10} more metrics
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
