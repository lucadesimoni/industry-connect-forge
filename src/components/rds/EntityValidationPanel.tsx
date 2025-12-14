import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, CheckCircle2, RefreshCw, Link2Off, MapPinOff } from 'lucide-react';
import { useAssetMovement, EntityValidationIssue } from '@/hooks/useAssetMovement';

export const EntityValidationPanel = () => {
  const { validateEntityLinks } = useAssetMovement();
  const [issues, setIssues] = useState<EntityValidationIssue[]>([]);
  const [hasRun, setHasRun] = useState(false);

  const handleValidate = async () => {
    const result = await validateEntityLinks.mutateAsync();
    setIssues(result);
    setHasRun(true);
  };

  const getIssueIcon = (issueType: string) => {
    switch (issueType) {
      case 'orphaned_uns_link':
      case 'orphaned_rds_link':
      case 'orphaned_aas_link':
        return <Link2Off className="h-4 w-4 text-destructive" />;
      case 'location_mismatch':
        return <MapPinOff className="h-4 w-4 text-amber-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getIssueBadge = (issueType: string) => {
    switch (issueType) {
      case 'orphaned_uns_link':
        return <Badge variant="destructive">Orphaned UNS</Badge>;
      case 'orphaned_rds_link':
        return <Badge variant="destructive">Orphaned RDS</Badge>;
      case 'orphaned_aas_link':
        return <Badge variant="destructive">Orphaned AAS</Badge>;
      case 'location_mismatch':
        return <Badge className="bg-amber-500">Location Mismatch</Badge>;
      default:
        return <Badge variant="secondary">{issueType}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              Entity Link Validation
            </CardTitle>
            <CardDescription className="text-xs">
              Check for orphaned references and location mismatches
            </CardDescription>
          </div>
          <Button 
            size="sm" 
            variant="outline"
            onClick={handleValidate}
            disabled={validateEntityLinks.isPending}
          >
            {validateEntityLinks.isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              'Run Validation'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!hasRun ? (
          <Alert>
            <AlertDescription className="text-xs">
              Click "Run Validation" to check for consistency issues between UNS, RDS, and AAS entities.
            </AlertDescription>
          </Alert>
        ) : issues.length === 0 ? (
          <Alert className="border-green-500/50 bg-green-500/5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-xs">
              All entity links are valid. No orphaned references or location mismatches found.
            </AlertDescription>
          </Alert>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {issues.map((issue, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  {getIssueIcon(issue.issueType)}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      {getIssueBadge(issue.issueType)}
                      <Badge variant="outline">{issue.entityType}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {issue.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
