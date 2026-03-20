import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UNSNode } from '@/types/industrial';
import { toast } from '@/hooks/use-toast';
import { mapErrorToUserMessage } from '@/lib/errorHandler';
import { buildUNSMetadata, isLocationLevel } from '@/lib/hierarchyUtils';

export const useUNSNodes = () => {
  const queryClient = useQueryClient();

  const { data: nodes = [], isLoading } = useQuery({
    queryKey: ['uns-nodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uns_nodes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      return data.map(node => ({
        id: node.id,
        name: node.name,
        level: node.level as UNSNode['level'],
        parentId: node.parent_id,
        description: node.description || undefined,
        metadata: node.metadata as Record<string, any>,
        createdAt: new Date(node.created_at),
        updatedAt: new Date(node.updated_at),
      })) as UNSNode[];
    },
  });

  const createNode = useMutation({
    mutationFn: async (node: Omit<UNSNode, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required. Please sign in to create UNS nodes.');
      }

      const { data, error } = await supabase
        .from('uns_nodes')
        .insert({
          name: node.name,
          level: node.level,
          parent_id: node.parentId,
          description: node.description,
          metadata: node.metadata || {},
          site_id: node.siteId ?? null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uns-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      toast({ title: 'UNS node created successfully' });
    },
    onError: (error: unknown) => {
      toast({ 
        title: 'Failed to create UNS node', 
        description: mapErrorToUserMessage(error),
        variant: 'destructive' 
      });
    },
  });

  const updateNode = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UNSNode> & { id: string }) => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required. Please sign in to update UNS nodes.');
      }

      const { data, error } = await supabase
        .from('uns_nodes')
        .update({
          name: updates.name,
          level: updates.level,
          parent_id: updates.parentId,
          description: updates.description,
          metadata: updates.metadata,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uns-nodes'] });
      toast({ title: 'UNS node updated successfully' });
    },
    onError: (error: unknown) => {
      toast({ 
        title: 'Failed to update UNS node', 
        description: mapErrorToUserMessage(error),
        variant: 'destructive' 
      });
    },
  });

  const deleteNode = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required. Please sign in to delete UNS nodes.');
      }

      const { error } = await supabase
        .from('uns_nodes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uns-nodes'] });
      toast({ title: 'UNS node deleted successfully' });
    },
    onError: (error: unknown) => {
      toast({ 
        title: 'Failed to delete UNS node', 
        description: mapErrorToUserMessage(error),
        variant: 'destructive' 
      });
    },
  });

  const regenerateAllMetadata = useMutation({
    mutationFn: async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Authentication required.');
      }

      const levelOrder = ['Enterprise', 'Site', 'Area', 'Line', 'Cell'];
      const currentNodes = [...nodes];
      let updatedCount = 0;

      for (const level of levelOrder) {
        const levelNodes = currentNodes.filter(n => n.level === level);
        for (const node of levelNodes) {
          const parentNode = node.parentId
            ? currentNodes.find(n => n.id === node.parentId) || null
            : null;

          const existingTopics: string[] = Array.isArray(node.metadata?.mqtt_topics) ? node.metadata.mqtt_topics : [];
          const autoTopic = node.metadata?.mqtt_topic;
          const autoLocation = node.metadata?.location_topic;
          const autoAssets = node.metadata?.location_assets_topic;
          const extraTopics = existingTopics.filter(
            t => t !== autoTopic && t !== autoLocation && t !== autoAssets
          );

          const linkedRDS = !isLocationLevel(node.level as any)
            ? { functionAspect: node.metadata?.function_aspect, productAspect: node.metadata?.product_aspect }
            : null;

          const metadata = buildUNSMetadata(
            node.level as any,
            node.name,
            parentNode,
            currentNodes,
            linkedRDS,
            extraTopics
          );

          const idx = currentNodes.findIndex(n => n.id === node.id);
          if (idx !== -1) {
            currentNodes[idx] = { ...currentNodes[idx], metadata };
          }

          const { error } = await supabase
            .from('uns_nodes')
            .update({ metadata, updated_at: new Date().toISOString() })
            .eq('id', node.id);

          if (error) throw error;
          updatedCount++;
        }
      }
      return updatedCount;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['uns-nodes'] });
      toast({ title: `Regenerated topics for ${count} nodes` });
    },
    onError: (error: unknown) => {
      toast({
        title: 'Failed to regenerate topics',
        description: mapErrorToUserMessage(error),
        variant: 'destructive',
      });
    },
  });

  return {
    nodes,
    isLoading,
    createNode,
    updateNode,
    deleteNode,
    regenerateAllMetadata,
  };
};
