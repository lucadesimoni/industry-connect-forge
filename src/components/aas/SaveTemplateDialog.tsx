import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  onSave: (name: string) => void;
}

export const SaveTemplateDialog = ({ open, onOpenChange, defaultName, onSave }: SaveTemplateDialogProps) => {
  const [name, setName] = useState('');

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) setName(defaultName);
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Save as Custom Template</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="templateName">Template Name *</Label>
          <Input
            id="templateName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., My Motor Template"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            This template will be saved to your current site and reusable across all AAS entities.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => name.trim() && onSave(name.trim())} disabled={!name.trim()}>
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
