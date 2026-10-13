import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';
import { UNSNode, UNSNodeMetadata } from '@/types/industrial';
import { toast } from '@/hooks/use-toast';
import { mapErrorToUserMessage } from '@/lib/errorHandler';
import { regenerateUNSMetadata } from '@/lib/hierarchyUtils';

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
        metadata: node.metadata as UNSNodeMetadata,
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
          metadata: (node.metadata || {}) as Json,
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
          metadata: updates.metadata as Json | undefined,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uns-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
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
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
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

      // Location RDS (aspect '+') are the source of truth for location codes
      const { data: locationRDS, error: rdsError } = await supabase
        .from('rds_designations')
        .select('designation, aspect_code, linked_uns_node_id')
        .eq('aspect_code', '+');
      if (rdsError) throw rdsError;
      const rdsList = (locationRDS ?? []).map(r => ({
        designation: r.designation,
        aspectCode: r.aspect_code,
        linkedUNSNodeId: r.linked_uns_node_id,
      }));

      const { nodes: regenerated, clashes } = regenerateUNSMetadata(nodes, rdsList);
      let updatedCount = 0;
      for (const node of regenerated) {
        const { error } = await supabase
          .from('uns_nodes')
          .update({ metadata: node.metadata as Json, updated_at: new Date().toISOString() })
          .eq('id', node.id);
        if (error) throw error;
        updatedCount++;
      }
      return { count: updatedCount, clashes };
    },
    onSuccess: ({ count, clashes }) => {
      queryClient.invalidateQueries({ queryKey: ['uns-nodes'] });
      if (clashes.length > 0) {
        toast({
          title: `Regenerated topics for ${count} nodes – ${clashes.length} location code clash(es)`,
          description: clashes.map(c => `${c.code}: ${c.nodes.join(', ')}`).join(' | ') +
            '. Assign distinct codes via the location RDS of these nodes.',
          variant: 'destructive',
        });
        return;
      }
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
