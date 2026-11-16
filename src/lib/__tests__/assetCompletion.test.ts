import { describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { assets, templates, completionSQL } from '../../../scripts/complete-existing-assets';
import { SUBMODEL_TEMPLATES } from '../aasTemplates';

describe('approved nine-asset completion', () => {
  it('uses exactly seven approved links and leaves both navigation assets unassigned', () => {
    expect(assets.map(a => [a[0], a[4]])).toEqual([
      ['CNC5_Machine_01', '=H1-H1+PIL.STANS.HALL5.LN01'], ['CNC5_Machine_02', '=H2-H1+PIL.STANS.HALL5.LN01'],
      ['CNC_Lathe_01', '=M1-H2+PIL.STANS.HALL5.LN01'], ['CNC_Lathe_02', '=M2-H2+PIL.STANS.HALL5.LN01'],
      ['FuelPump_01', '=V1-V1+PIL.STANS.HALL3.LN01'], ['FuelPump_02', '=V2-V1+PIL.STANS.HALL3.LN01'],
      ['SolenoidValve_01', '=Q1-Q1+PIL.STANS.HALL3.LN01'], ['NavComputer_01', null], ['NavComputer_02', null],
    ]);
  });
  it('reuses template semantics and never seeds an assumed operational state', () => {
    expect(templates.find(t => t.idShort === 'Nameplate')?.semanticId).toBe('https://admin-shell.io/idta/nameplate/3/0/Nameplate');
    expect(templates.find(t => t.idShort === 'TechnicalData')?.semanticId).toBe('0173-1#01-AHX837#002');
    for (const t of templates) {
      const source = SUBMODEL_TEMPLATES.find(s => s.idShort === t.idShort);
      expect(t.properties.map(p => [p.idShort, p.semanticId])).toEqual(source?.properties.map(p => [p.idShort, p.semanticId]));
      expect(t.properties.filter(p => p.idShort !== '_aasStructure').every(p => p.value === '')).toBe(true);
    }
    expect(templates.find(t => t.idShort === 'OperationalData')?.properties.find(p => p.idShort === 'CurrentState')?.value).toBe('');
  });
  it('applies atomically, preserves identity and existing values, and is repeatable', async () => {
    const db = new PGlite();
    await db.exec(`CREATE TABLE aas(id uuid PRIMARY KEY,id_short text,asset_id text,is_type boolean,site_id uuid,linked_uns_node_id uuid,linked_rds_id uuid,manufacturer text,serial_number text);
      CREATE TABLE uns_nodes(id uuid PRIMARY KEY,level text,site_id uuid,metadata jsonb);
      CREATE TABLE rds_designations(id uuid PRIMARY KEY,designation text,site_id uuid,is_instance boolean,linked_uns_node_id uuid,location_aspect text,linked_aas_id uuid);
      CREATE TABLE aas_submodels(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,aas_id uuid,id_short text,semantic_id text,description text);
      CREATE TABLE aas_properties(id uuid DEFAULT gen_random_uuid() PRIMARY KEY,submodel_id uuid,id_short text,value_type text,value jsonb,unit text,description text,semantic_id text);`);
    const site = '00000000-0000-0000-0000-000000000001';
    for (const [name,id,asset,cell,designation] of assets) {
      const cellId = `e0000005-0000-0000-0000-000000000${cell}`;
      const location = name.startsWith('CNC') ? 'PIL.STANS.HALL5.LN01' : 'PIL.STANS.HALL3.LN01';
      await db.query('INSERT INTO uns_nodes VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',[cellId,'Cell',site,JSON.stringify({rds_location:`+${location}`})]);
      await db.query('INSERT INTO aas VALUES ($1,$2,$3,false,$4,$5,NULL,$6,$7)',[id,name,`urn:pilatus:aas:instance:${asset}`,site,cellId,'Known manufacturer','Known serial']);
      if (designation) await db.query('INSERT INTO rds_designations VALUES (gen_random_uuid(),$1,$2,true,$3,$4,NULL)',[designation,site,cellId,location]);
    }
    const before = (await db.query('SELECT id,asset_id,linked_uns_node_id FROM aas ORDER BY id')).rows;
    await db.exec(completionSQL());
    expect((await db.query('SELECT id,asset_id,linked_uns_node_id FROM aas ORDER BY id')).rows).toEqual(before);
    expect((await db.query('SELECT count(*)::int AS n FROM aas_submodels')).rows).toEqual([{n:17}]);
    expect((await db.query('SELECT count(*)::int AS n FROM aas a JOIN rds_designations r ON r.id=a.linked_rds_id AND r.linked_aas_id=a.id')).rows).toEqual([{n:7}]);
    expect((await db.query("SELECT count(*)::int AS n FROM aas_properties WHERE id_short='SerialNumber' AND value='\"Known serial\"'::jsonb")).rows).toEqual([{n:9}]);
    expect((await db.query("SELECT count(*)::int AS n FROM aas_properties WHERE id_short='YearOfConstruction' AND value='\"\"'::jsonb")).rows).toEqual([{n:9}]);
    const count = (await db.query('SELECT count(*)::int AS n FROM aas_properties')).rows;
    await db.exec(`UPDATE aas_properties SET value='"confirmed"'::jsonb WHERE id_short='CurrentState'`);
    await db.exec(completionSQL());
    expect((await db.query('SELECT count(*)::int AS n FROM aas_properties')).rows).toEqual(count);
    expect((await db.query("SELECT count(*)::int AS n FROM aas_properties WHERE id_short='CurrentState' AND value='\"confirmed\"'::jsonb")).rows).toEqual([{n:4}]);
    await db.exec('UPDATE rds_designations SET linked_aas_id=NULL; UPDATE aas SET linked_rds_id=NULL;');
    await db.query('UPDATE aas SET asset_id=$1 WHERE id=$2',['urn:changed',assets[8][1]]);
    await expect(db.exec(completionSQL())).rejects.toThrow(/identity\/site\/Cell changed/);
    expect((await db.query('SELECT count(*)::int AS n FROM aas WHERE linked_rds_id IS NOT NULL')).rows).toEqual([{n:0}]);
    await db.close();
  }, 60000);
});