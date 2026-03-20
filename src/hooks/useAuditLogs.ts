import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  changes: Record<string, any>;
  entitySnapshot: Record<string, any>;
  performedBy: string | null;
  siteId: string | null;
  createdAt: Date;
}

function mapRow(row: any): AuditLogEntry {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    action: row.action,
    changes: row.changes ?? {},
    entitySnapshot: row.entity_snapshot ?? {},
    performedBy: row.performed_by,
    siteId: row.site_id,
    createdAt: new Date(row.created_at),
  };
}

export function useAuditLogs(entityType?: string, entityId?: string) {
  return useQuery({
    queryKey: ['audit-logs', entityType, entityId],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (entityType) {
        query = query.eq('entity_type', entityType);
      }
      if (entityId) {
        query = query.eq('entity_id', entityId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as any[]).map(mapRow);
    },
    enabled: !!entityType,
  });
}

/** Fetch all audit logs related to a specific AAS (including its submodels) */
export function useAASAuditLogs(aasId?: string) {
  return useQuery({
    queryKey: ['audit-logs', 'aas-full', aasId],
    queryFn: async () => {
      if (!aasId) return [];

      // Get AAS logs + submodel logs that reference this AAS
      const { data, error } = await supabase
        .from('audit_logs' as any)
        .select('*')
        .or(`and(entity_type.eq.AAS,entity_id.eq.${aasId}),and(entity_type.eq.AAS_SUBMODEL,changes->aas_id.eq."${aasId}")`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        // Fallback: just get AAS-level logs
        const { data: fallback, error: err2 } = await supabase
          .from('audit_logs' as any)
          .select('*')
          .eq('entity_type', 'AAS')
          .eq('entity_id', aasId)
          .order('created_at', { ascending: false })
          .limit(50);
        if (err2) throw err2;
        return (fallback as any[]).map(mapRow);
      }

      return (data as any[]).map(mapRow);
    },
    enabled: !!aasId,
  });
}
