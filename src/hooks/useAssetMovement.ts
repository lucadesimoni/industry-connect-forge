import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { UNSNode } from '@/types/industrial';

export interface LocationHistoryEntry {
  id: string;
  entityType: 'AAS' | 'RDS';
  entityId: string;
  previousUnsNodeId: string | null;
  newUnsNodeId: string | null;
  previousLocationAspect: string | null;
  newLocationAspect: string | null;
  previousDesignation: string | null;
  newDesignation: string | null;
  movedBy: string | null;
  reason: string | null;
  createdAt: Date;
}

export interface EntityValidationIssue {
  issueType: string;
  entityType: string;
  entityId: string;
  description: string;
}

export interface MoveAssetParams {
  rdsId: string;
  newUnsNodeId: string;
  reason?: string;
  updateLinkedAAS?: boolean;
}

// Build RDS location from UNS hierarchy
export const buildLocationFromUNS = (node: UNSNode, allNodes: UNSNode[]): string => {
  const path: string[] = [];
  let current: UNSNode | undefined = node;
  
  while (current) {
    // Use the RDS location from metadata if available, otherwise use name
    const locationPart = current.metadata?.rds_location?.replace(/^\+/, '') || current.name;
    path.unshift(locationPart);
    current = current.parentId ? allNodes.find(n => n.id === current!.parentId) : undefined;
  }
  
  return path.join('.');
};

// Generate full RDS designation with dynamic location
export const generateDynamicDesignation = (
  functionAspect: string | undefined,
  productAspect: string | undefined,
  locationAspect: string | undefined,
  aspectCode: string
): string => {
  if (aspectCode === '+') {
    // Pure location designation
    return `+${locationAspect || ''}`;
  }
  
  // Function or Product aspect with optional location
  const baseDesignation = aspectCode === '=' 
    ? `=${functionAspect || ''}` 
    : `-${productAspect || ''}`;
  
  if (locationAspect) {
    return `${baseDesignation}+${locationAspect}`;
  }
  
  return baseDesignation;
};

export const useAssetMovement = () => {
  const queryClient = useQueryClient();

  // Fetch location history for an entity
  const useLocationHistory = (entityType: 'AAS' | 'RDS', entityId: string) => {
    return useQuery({
      queryKey: ['location-history', entityType, entityId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('asset_location_history')
          .select('*')
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return data.map(entry => ({
          id: entry.id,
          entityType: entry.entity_type as 'AAS' | 'RDS',
          entityId: entry.entity_id,
          previousUnsNodeId: entry.previous_uns_node_id,
          newUnsNodeId: entry.new_uns_node_id,
          previousLocationAspect: entry.previous_location_aspect,
          newLocationAspect: entry.new_location_aspect,
          previousDesignation: entry.previous_designation,
          newDesignation: entry.new_designation,
          movedBy: entry.moved_by,
          reason: entry.reason,
          createdAt: new Date(entry.created_at),
        })) as LocationHistoryEntry[];
      },
      enabled: !!entityId,
    });
  };

  // Validate entity links
  const validateEntityLinks = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('validate_entity_links');
      
      if (error) throw error;
      
      return (data as any[]).map(issue => ({
        issueType: issue.issue_type,
        entityType: issue.entity_type,
        entityId: issue.entity_id,
        description: issue.description,
      })) as EntityValidationIssue[];
    },
  });

  // Move an RDS instance to a new location
  const moveRDSToLocation = useMutation({
    mutationFn: async ({ rdsId, newUnsNodeId, reason, updateLinkedAAS = true }: MoveAssetParams) => {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required. Please sign in to move assets.');
      }

      // Get current RDS
      const { data: currentRDS, error: rdsError } = await supabase
        .from('rds_designations')
        .select('*')
        .eq('id', rdsId)
        .single();
      
      if (rdsError) throw rdsError;
      if (!currentRDS) throw new Error('RDS designation not found');

      // Get new UNS node with hierarchy
      const { data: allNodes, error: nodesError } = await supabase
        .from('uns_nodes')
        .select('*');
      
      if (nodesError) throw nodesError;

      const newNode = allNodes?.find(n => n.id === newUnsNodeId);
      if (!newNode) throw new Error('Target UNS node not found');

      // Build new location aspect from UNS hierarchy
      const mappedNodes = allNodes.map(n => ({
        id: n.id,
        name: n.name,
        level: n.level as UNSNode['level'],
        parentId: n.parent_id,
        metadata: n.metadata as Record<string, any>,
        createdAt: new Date(n.created_at),
        updatedAt: new Date(n.updated_at),
      }));

      const newLocationAspect = buildLocationFromUNS(
        mappedNodes.find(n => n.id === newUnsNodeId)!,
        mappedNodes
      );

      // Generate new designation
      const newDesignation = generateDynamicDesignation(
        currentRDS.function_aspect || undefined,
        currentRDS.product_aspect || undefined,
        newLocationAspect,
        currentRDS.aspect_code
      );

      // Record history
      const { error: historyError } = await supabase
        .from('asset_location_history')
        .insert({
          entity_type: 'RDS',
          entity_id: rdsId,
          previous_uns_node_id: currentRDS.linked_uns_node_id,
          new_uns_node_id: newUnsNodeId,
          previous_location_aspect: currentRDS.location_aspect,
          new_location_aspect: newLocationAspect,
          previous_designation: currentRDS.designation,
          new_designation: newDesignation,
          moved_by: user.id,
          reason: reason || null,
        });

      if (historyError) throw historyError;

      // Update RDS
      const nodeMetadata = newNode.metadata as Record<string, any> | null;
      const { data: updatedRDS, error: updateError } = await supabase
        .from('rds_designations')
        .update({
          linked_uns_node_id: newUnsNodeId,
          location_aspect: newLocationAspect,
          designation: newDesignation,
          metadata: {
            ...((currentRDS.metadata as Record<string, any>) || {}),
            uns_topic: nodeMetadata?.uns_path || newNode.name,
            broker_topic: nodeMetadata?.uns_path || newNode.name,
            last_moved_at: new Date().toISOString(),
          },
        })
        .eq('id', rdsId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Update linked AAS if requested
      if (updateLinkedAAS && currentRDS.linked_aas_id) {
        const { error: aasError } = await supabase
          .from('aas')
          .update({
            linked_uns_node_id: newUnsNodeId,
          })
          .eq('id', currentRDS.linked_aas_id);

        if (aasError) {
          console.warn('Failed to update linked AAS:', aasError);
        }

        // Record AAS history too
        await supabase
          .from('asset_location_history')
          .insert({
            entity_type: 'AAS',
            entity_id: currentRDS.linked_aas_id,
            previous_uns_node_id: currentRDS.linked_uns_node_id,
            new_uns_node_id: newUnsNodeId,
            moved_by: user.id,
            reason: `Moved with linked RDS: ${reason || 'No reason provided'}`,
          });
      }

      return updatedRDS;
    },
    onSuccess: () => {
      // Invalidate all rds and aas queries (including site-specific ones)
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'rds' });
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'aas' });
      queryClient.invalidateQueries({ queryKey: ['location-history'] });
      toast({ title: 'Asset moved successfully', description: 'Location and designations updated.' });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to move asset',
        description: error.message || 'An unknown error occurred',
        variant: 'destructive',
      });
    },
  });

  // Sync RDS designation with current UNS location
  const syncRDSWithUNS = useMutation({
    mutationFn: async (rdsId: string) => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required.');
      }

      // Get RDS
      const { data: rds, error: rdsError } = await supabase
        .from('rds_designations')
        .select('*')
        .eq('id', rdsId)
        .single();

      if (rdsError) throw rdsError;
      if (!rds.linked_uns_node_id) {
        throw new Error('RDS is not linked to a UNS node');
      }

      // Get all nodes for hierarchy building
      const { data: allNodes, error: nodesError } = await supabase
        .from('uns_nodes')
        .select('*');

      if (nodesError) throw nodesError;

      const mappedNodes = allNodes.map(n => ({
        id: n.id,
        name: n.name,
        level: n.level as UNSNode['level'],
        parentId: n.parent_id,
        metadata: n.metadata as Record<string, any>,
        createdAt: new Date(n.created_at),
        updatedAt: new Date(n.updated_at),
      }));

      const linkedNode = mappedNodes.find(n => n.id === rds.linked_uns_node_id);
      if (!linkedNode) throw new Error('Linked UNS node not found');

      const newLocationAspect = buildLocationFromUNS(linkedNode, mappedNodes);
      const newDesignation = generateDynamicDesignation(
        rds.function_aspect || undefined,
        rds.product_aspect || undefined,
        newLocationAspect,
        rds.aspect_code
      );

      // Only update if changed
      if (newDesignation !== rds.designation) {
        const { error: updateError } = await supabase
          .from('rds_designations')
          .update({
            location_aspect: newLocationAspect,
            designation: newDesignation,
          })
          .eq('id', rdsId);

        if (updateError) throw updateError;
      }

      return { synced: newDesignation !== rds.designation, newDesignation };
    },
    onSuccess: (result) => {
      // Invalidate all rds queries (including site-specific ones)
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === 'rds' });
      if (result.synced) {
        toast({ title: 'RDS synced with UNS location' });
      } else {
        toast({ title: 'RDS already in sync' });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Sync failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    useLocationHistory,
    validateEntityLinks,
    moveRDSToLocation,
    syncRDSWithUNS,
    buildLocationFromUNS,
    generateDynamicDesignation,
  };
};
