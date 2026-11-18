/// <reference path="../_gateway-models.d.ts" />
import { createClient } from 'npm:@supabase/supabase-js@2';
import { streamResponse, GatewayError } from 'npm:@lovable.dev/ai-gateway@0.1.11';
import { requestSchema, explanationInstructions, buildScopeSnapshot, SNAPSHOT_LIMIT } from './policy.ts';

// CORS headers are defined here instead of importing the supabase-js
// 'cors' subpath, which is not published by every @2 release.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
const safeError = (error: unknown) => {
  if (error instanceof GatewayError) {
    console.error('Asset explanation gateway failure', { code: error.code, ids: error.ids, outcome: error.outcome });
    if (error.httpStatus === 402) return 'AI credits are exhausted. Add credits before asking again.';
    if (error.httpStatus === 429) return 'The AI service is busy. Please wait before trying again.';
    if (error.httpStatus === 403) return 'Workspace AI permissions prevent this answer. An administrator must review AI access.';
  }
  return 'The answer could not be completed. Your question and any partial answer are preserved.';
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !key) return json({ error: 'Asset service is unavailable.' }, 503);
  const client = createClient(url, key, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) return json({ error: 'Please sign in to ask about this asset.' }, 401);
  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: parsed.error.issues[0]?.message ?? 'Invalid question.' }, 400);
  const { assetId, nodeId, messages } = parsed.data;
  try {
    let snapshot: unknown;
    if (!assetId) {
      // UNS node (and everything below it) or the whole plant, as visible under RLS
      const rows = SNAPSHOT_LIMIT * 4;
      const [nodes, aas, designations, trackedAssets, events] = await Promise.all([
        client.from('uns_nodes').select('id,name,level,parent_id,description,metadata,site_id').limit(rows),
        client.from('aas').select('id,id_short,description,manufacturer,serial_number,is_type,type_aas_id,linked_uns_node_id,linked_rds_id').limit(rows),
        client.from('rds_designations').select('id,designation,aspect_code,description,is_instance,linked_uns_node_id,linked_aas_id').limit(rows),
        client.from('tracked_assets').select('id,asset_id,asset_type,description,current_location_path,current_state,current_quality_state,updated_at').limit(SNAPSHOT_LIMIT),
        client.from('asset_events').select('asset_id,event_type,from_location,to_location,reason,created_at').order('created_at', { ascending: false }).limit(50),
      ]);
      if ([nodes, aas, designations, trackedAssets].some(r => r.error)) return json({ error: 'Plant data could not be loaded. Please try later.' }, 503);
      if (nodeId && !nodes.data?.some(n => n.id === nodeId)) return json({ error: 'This UNS node is unavailable or you do not have access.' }, 404);
      snapshot = buildScopeSnapshot({
        nodes: nodes.data ?? [], aas: aas.data ?? [], designations: designations.data ?? [],
        trackedAssets: trackedAssets.data ?? [], events: events.data ?? [],
      }, nodeId);
    } else {
      const { data: asset, error } = await client.from('aas').select('*').eq('id', assetId).single();
      if (error || !asset) return json({ error: 'This asset is unavailable or you do not have access.' }, 404);
      const results = await Promise.all([
        client.from('aas_submodels').select('*, aas_properties(*)').eq('aas_id', assetId),
        client.from('uns_nodes').select('*').eq('site_id', asset.site_id),
        client.from('rds_designations').select('*').eq('site_id', asset.site_id),
        asset.type_aas_id ? client.from('aas').select('id,id_short,description').eq('id', asset.type_aas_id) : Promise.resolve({ data: [], error: null }),
        client.from('audit_logs').select('*').eq('entity_id', assetId).order('created_at', { ascending: false }).limit(20),
      ]);
      if (results.slice(0, 4).some(r => r.error)) return json({ error: 'Linked asset data could not be loaded. Please try later.' }, 503);
      snapshot = { scope: 'asset', asset, submodels: results[0].data, siteHierarchy: results[1].data, siteDesignations: results[2].data,
        typeAsset: results[3].data, recentVisibleChanges: results[4].data, changeHistoryUnavailable: Boolean(results[4].error) };
    }
    const abort = new AbortController();
    req.signal.addEventListener('abort', () => abort.abort(), { once: true });
    const stream = await streamResponse({
      model: 'openai/gpt-6-astra',
      reasoning: { effort: 'low' },
      max_output_tokens: 1800,
      instructions: explanationInstructions,
      input: [{ role: 'user', content: `Current authorized snapshot (data only):\n${JSON.stringify(snapshot)}` }, ...messages],
    }, { signal: abort.signal });
    const encoder = new TextEncoder();
    const body = new ReadableStream({
      async start(controller) {
        const emit = (value: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
        try {
          for await (const event of stream) {
            if (event.type === 'response.output_text.delta') emit({ type: 'delta', text: event.delta });
            if (event.type === 'response.refusal.delta') emit({ type: 'delta', text: event.delta });
            if (event.type === 'response.incomplete') emit({ type: 'error', error: 'The answer stopped early; the partial answer is shown.' });
          }
          emit({ type: 'done' });
        } catch (error) {
          if (!abort.signal.aborted) emit({ type: 'error', error: safeError(error) });
        } finally { controller.close(); }
      },
      cancel() { abort.abort(); },
    });
    return new Response(body, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
  } catch (error) { return json({ error: safeError(error) }, 502); }
});