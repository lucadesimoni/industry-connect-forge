import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UNSNode } from '@/types/industrial';
import { toast } from '@/hooks/use-toast';

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
        siteId: node.site_id || undefined,
        createdAt: new Date(node.created_at),
        updatedAt: new Date(node.updated_at),
      })) as UNSNode[];
    },
  });

  const createNode = useMutation({
    mutationFn: async (node: Omit<UNSNode, 'id' | 'createdAt' | 'updatedAt'>) => {
      // Check authentication
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
          site_id: node.siteId,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['uns-nodes'] });
      toast({ title: 'UNS node created successfully' });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Failed to create UNS node', 
        description: error.message || 'An unknown error occurred',
        variant: 'destructive' 
      });
    },
  });

  const updateNode = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UNSNode> & { id: string }) => {
      // Check authentication
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
          site_id: updates.siteId,
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
    onError: (error: any) => {
      toast({ 
        title: 'Failed to update UNS node', 
        description: error.message || 'An unknown error occurred',
        variant: 'destructive' 
      });
    },
  });

  const deleteNode = useMutation({
    mutationFn: async (id: string) => {
      // Check authentication
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
    onError: (error: any) => {
      toast({ 
        title: 'Failed to delete UNS node', 
        description: error.message || 'An unknown error occurred',
        variant: 'destructive' 
      });
    },
  });

  return {
    nodes,
    isLoading,
    createNode,
    updateNode,
    deleteNode,
  };
};
