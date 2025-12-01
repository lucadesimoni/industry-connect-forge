import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UNSNode, ISA95Level } from '@/types/industrial';
import { useUNSNodes } from '@/hooks/useUNSNodes';
import { useRDS } from '@/hooks/useRDS';

interface UNSDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node?: UNSNode | null;
  nodes: UNSNode[];
}

const ISA95_LEVELS: ISA95Level[] = ['Enterprise', 'Site', 'Area', 'Line', 'Cell'];

const getRDSAspectCode = (level: ISA95Level): string => {
  // Location aspect code for UNS hierarchy
  return '+';
};

const getRDSObjectClass = (level: ISA95Level): string => {
  const mapping: Record<ISA95Level, string> = {
    'Enterprise': 'ENT',
    'Site': 'SITE',
    'Area': 'AREA',
    'Line': 'LINE',
    'Cell': 'CELL',
  };
  return mapping[level] || 'OBJ';
};

export const UNSDialog = ({ open, onOpenChange, node, nodes }: UNSDialogProps) => {
  const { createNode, updateNode } = useUNSNodes();
  const { createRDS } = useRDS();
  
  const [name, setName] = useState(node?.name || '');
  const [description, setDescription] = useState(node?.description || '');
  const [level, setLevel] = useState<ISA95Level>(node?.level || 'Enterprise');
  const [parentId, setParentId] = useState<string | null>(node?.parentId || null);

  const handleSubmit = async () => {
    if (!name.trim()) return;

    try {
      // Build UNS path
      let unsPath = name;
      if (parentId) {
        const parent = nodes.find(n => n.id === parentId);
        if (parent?.metadata?.uns_path) {
          unsPath = `${parent.metadata.uns_path}/${name}`;
        }
      }

      // Build RDS location code
      let rdsLocation = getRDSAspectCode(level) + getRDSObjectClass(level);
      if (parentId) {
        const parent = nodes.find(n => n.id === parentId);
        if (parent?.metadata?.rds_location) {
          rdsLocation = `${parent.metadata.rds_location}.${getRDSObjectClass(level)}`;
        }
      }

      const metadata = {
        uns_path: unsPath,
        rds_location: rdsLocation,
      };

      if (node) {
        // Update existing node
        await updateNode.mutateAsync({
          id: node.id,
          name,
          description,
          level,
          parentId,
          metadata,
        });
      } else {
        // Create new node
        const result = await createNode.mutateAsync({
          name,
          description,
          level,
          parentId,
          metadata,
        });

        // Auto-create corresponding RDS designation
        if (result?.id) {
          const rdsDesignation = rdsLocation;
          const brokerTopic = unsPath;
          
          try {
            await createRDS.mutateAsync({
              designation: rdsDesignation,
              aspectCode: getRDSAspectCode(level),
              objectClass: getRDSObjectClass(level),
              description: `Location designation for ${name}`,
              linkedUNSNodeId: result.id,
              linkedAASId: null,
              isInstance: false, // Location aspects are not instances
              locationAspect: getRDSObjectClass(level),
              metadata: {
                uns_topic: unsPath,
                broker_topic: brokerTopic,
                hierarchy_level: level,
              },
            });
          } catch (rdsError) {
            console.error('Failed to create RDS designation:', rdsError);
            // Continue even if RDS creation fails
          }
        }
      }

      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Failed to save UNS node:', error);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setLevel('Enterprise');
    setParentId(null);
  };

  const availableParents = nodes.filter(n => {
    // Can't be your own parent
    if (node && n.id === node.id) return false;
    
    // Filter based on hierarchy
    const levelIndex = ISA95_LEVELS.indexOf(level);
    const parentLevelIndex = ISA95_LEVELS.indexOf(n.level);
    
    return parentLevelIndex < levelIndex;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{node ? 'Edit UNS Node' : 'Create UNS Node'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Node name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Node description"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">ISA-95 Level</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as ISA95Level)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ISA95_LEVELS.map((lvl) => (
                  <SelectItem key={lvl} value={lvl}>
                    {lvl}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parent">Parent Node (Optional)</Label>
            <Select value={parentId || 'none'} onValueChange={(v) => setParentId(v === 'none' ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select parent node" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Parent (Root)</SelectItem>
                {availableParents.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name} ({n.level})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {node ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};