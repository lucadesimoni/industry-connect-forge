import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ForgeGuideDialog } from './ForgeGuideDialog';
import { scopeKey, type ForgeGuideScope } from '@/lib/forgeGuide';

/**
 * Floating chat button, available on every screen. It opens Forge Guide for
 * what is in view: the selected asset, the selected UNS node, or the plant.
 */
export const ForgeGuideLauncher = ({ scope, open, onOpenChange }: {
  scope: ForgeGuideScope;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => (
  <>
    {!open && (
      <Button
        onClick={() => onOpenChange(true)}
        className="fixed bottom-20 right-4 z-40 h-12 gap-2 rounded-full px-4 shadow-lg md:bottom-6 md:right-6"
        aria-label={`Ask Forge Guide about ${scope.label}`}
        title={`Ask Forge Guide about ${scope.label}`}
      >
        <MessageSquare className="h-5 w-5" />
        <span className="hidden sm:inline">Ask Forge Guide</span>
      </Button>
    )}
    <ForgeGuideDialog key={scopeKey(scope)} scope={scope} open={open} onOpenChange={onOpenChange} />
  </>
);
