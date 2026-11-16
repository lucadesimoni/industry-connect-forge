// Reviewed one-off data repair; emit SQL for the database data-write tool.
import { SUBMODEL_TEMPLATES } from '../src/lib/aasTemplates';

export const assets = [
  ['CNC5_Machine_01', '5e455103-29d7-4eb5-b295-32037cbda22f', 'cnc5:001', '003', '=H1-H1+PIL.STANS.HALL5.LN01'],
  ['CNC5_Machine_02', '8b52d67b-ed2f-4b80-84fd-0fb708e14cee', 'cnc5:002', '003', '=H2-H1+PIL.STANS.HALL5.LN01'],
  ['CNC_Lathe_01', '80e9826d-ee14-4f28-85e7-d978224b2e16', 'lth3:001', '004', '=M1-H2+PIL.STANS.HALL5.LN01'],
  ['CNC_Lathe_02', 'bbf44bef-0a1d-434a-9098-960ab7910259', 'lth3:002', '004', '=M2-H2+PIL.STANS.HALL5.LN01'],
  ['FuelPump_01', '33f78836-3cd2-4afc-b9c3-9123486cf0a4', 'fp:001', '001', '=V1-V1+PIL.STANS.HALL3.LN01'],
  ['FuelPump_02', 'b53b3464-c969-42d7-99b8-154985a5761c', 'fp:002', '001', '=V2-V1+PIL.STANS.HALL3.LN01'],
  ['SolenoidValve_01', 'e466f3b2-c244-4bf5-882c-773469594481', 'sv:001', '001', '=Q1-Q1+PIL.STANS.HALL3.LN01'],
  ['NavComputer_01', 'ea20945d-a800-47dd-8685-e8668c2d47e6', 'nav:001', '002', null],
  ['NavComputer_02', '1fbfb551-7251-42a1-a07c-511bf04c66b8', 'nav:002', '002', null],
] as const;

export const templates = SUBMODEL_TEMPLATES.filter(t => ['Nameplate', 'TechnicalData', 'OperationalData'].includes(t.idShort)).map(t => ({
  ...t,
  properties: t.properties.map(p => ({ ...p, value: p.idShort === '_aasStructure' ? p.value : '' })),
}));

const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;

export function completionSQL(): string {
  const rows = assets.map(([name, id, asset, cell, rds]) => ({ name, id, asset: `urn:pilatus:aas:instance:${asset}`, cell: `e0000005-0000-0000-0000-000000000${cell}`, rds }));
  return `-- Approved asset completion: no schema changes; all writes roll back on failure.
DO $repair$
DECLARE
  expected jsonb := ${quote(JSON.stringify(rows))}::jsonb;
  templates jsonb := ${quote(JSON.stringify(templates))}::jsonb;
  e jsonb; t jsonb; p jsonb; a public.aas%ROWTYPE; r public.rds_designations%ROWTYPE;
  sm uuid; v jsonb; loc text;
BEGIN
  LOCK TABLE public.aas, public.rds_designations, public.aas_submodels, public.aas_properties, public.uns_nodes IN SHARE ROW EXCLUSIVE MODE;
  FOR e IN SELECT value FROM jsonb_array_elements(expected) LOOP
    SELECT * INTO a FROM public.aas WHERE id=(e->>'id')::uuid;
    IF NOT FOUND OR a.is_type OR a.id_short<>e->>'name' OR a.asset_id<>e->>'asset'
       OR a.site_id IS DISTINCT FROM '00000000-0000-0000-0000-000000000001'::uuid
       OR a.linked_uns_node_id IS DISTINCT FROM (e->>'cell')::uuid THEN
      RAISE EXCEPTION 'Asset identity/site/Cell changed: %', e->>'name';
    END IF;
    SELECT metadata->>'rds_location' INTO loc FROM public.uns_nodes WHERE id=a.linked_uns_node_id AND level='Cell' AND site_id=a.site_id;
    IF loc IS NULL THEN RAISE EXCEPTION 'Missing Cell location: %', a.id_short; END IF;
    IF e->>'rds' IS NOT NULL THEN
      IF (SELECT count(*) FROM public.rds_designations WHERE designation=e->>'rds' AND site_id=a.site_id)<>1 THEN
        RAISE EXCEPTION 'Missing or ambiguous RDS: %', e->>'rds';
      END IF;
      SELECT * INTO r FROM public.rds_designations WHERE designation=e->>'rds' AND site_id=a.site_id;
      IF NOT r.is_instance OR r.linked_uns_node_id IS DISTINCT FROM a.linked_uns_node_id
         OR r.location_aspect IS DISTINCT FROM substring(loc FROM 2)
         OR (r.linked_aas_id IS NOT NULL AND r.linked_aas_id<>a.id)
         OR (a.linked_rds_id IS NOT NULL AND a.linked_rds_id<>r.id)
         OR EXISTS (SELECT 1 FROM public.aas WHERE linked_rds_id=r.id AND id<>a.id) THEN
        RAISE EXCEPTION 'RDS target changed/occupied: %', r.designation;
      END IF;
      UPDATE public.aas SET linked_rds_id=r.id WHERE id=a.id AND linked_rds_id IS DISTINCT FROM r.id;
      UPDATE public.rds_designations SET linked_aas_id=a.id WHERE id=r.id AND linked_aas_id IS DISTINCT FROM a.id;
    ELSIF a.linked_rds_id IS NOT NULL THEN
      RAISE EXCEPTION 'Navigation asset already linked: %', a.id_short;
    END IF;
    FOR t IN SELECT value FROM jsonb_array_elements(templates) LOOP
      IF t->>'idShort'<>'Nameplate' AND a.id_short NOT LIKE 'CNC%' THEN CONTINUE; END IF;
      IF (SELECT count(*) FROM public.aas_submodels WHERE aas_id=a.id AND id_short=t->>'idShort')>1 THEN
        RAISE EXCEPTION 'Duplicate submodel on %', a.id_short;
      END IF;
      SELECT id INTO sm FROM public.aas_submodels WHERE aas_id=a.id AND id_short=t->>'idShort';
      IF sm IS NULL THEN
        INSERT INTO public.aas_submodels (aas_id,id_short,semantic_id,description)
        VALUES (a.id,t->>'idShort',t->>'semanticId',t->>'description') RETURNING id INTO sm;
      ELSIF EXISTS (SELECT 1 FROM public.aas_submodels WHERE id=sm AND semantic_id IS DISTINCT FROM t->>'semanticId') THEN
        RAISE EXCEPTION 'Existing submodel semantics differ on %', a.id_short;
      END IF;
      FOR p IN SELECT value FROM jsonb_array_elements(t->'properties') LOOP
        v := p->'value';
        IF t->>'idShort'='Nameplate' THEN
          CASE p->>'idShort'
            WHEN 'URIOfTheProduct' THEN v:=to_jsonb(a.asset_id);
            WHEN 'ManufacturerName' THEN v:=to_jsonb(coalesce(a.manufacturer,''));
            WHEN 'SerialNumber' THEN v:=to_jsonb(coalesce(a.serial_number,''));
            ELSE NULL;
          END CASE;
        ELSIF t->>'idShort'='TechnicalData' AND p->>'idShort'='GeneralInformation.ManufacturerName' THEN
          v:=to_jsonb(coalesce(a.manufacturer,''));
        END IF;
        INSERT INTO public.aas_properties (submodel_id,id_short,value_type,value,unit,description,semantic_id)
        SELECT sm,p->>'idShort',p->>'valueType',v,p->>'unit',p->>'description',p->>'semanticId'
        WHERE NOT EXISTS (SELECT 1 FROM public.aas_properties WHERE submodel_id=sm AND id_short=p->>'idShort');
      END LOOP;
    END LOOP;
  END LOOP;
END;
$repair$;`;
}

if (process.argv[1]?.endsWith('complete-existing-assets.ts')) console.log(completionSQL());