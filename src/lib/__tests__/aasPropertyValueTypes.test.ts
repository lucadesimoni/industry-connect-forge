import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { VALUE_TYPE_OPTIONS } from '../aasTemplates';

const sql = readFileSync(resolve(__dirname, '../../../scripts/aas-property-value-types.sql'), 'utf8');
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE TABLE public.aas_properties (value_type text NOT NULL CONSTRAINT aas_properties_value_type_check CHECK (value_type IN ('string','number','boolean','date')));
    INSERT INTO public.aas_properties VALUES ('string'),('number'),('boolean'),('date');`);
  await db.exec(sql);
}, 60000);
afterAll(async () => { await db.close(); });
it.each(VALUE_TYPE_OPTIONS.map(o => o.value))('accepts current XSD type %s', async type => {
  await expect(db.query('INSERT INTO public.aas_properties VALUES ($1) RETURNING value_type', [type])).resolves.toMatchObject({ rows: [{ value_type: type }] });
});
it('preserves all four legacy value types', async () => {
  expect((await db.query("SELECT value_type FROM public.aas_properties WHERE value_type NOT LIKE 'xs:%' ORDER BY value_type")).rows).toEqual([
    { value_type: 'boolean' }, { value_type: 'date' }, { value_type: 'number' }, { value_type: 'string' },
  ]);
});
it('rejects invalid value types', async () => {
  await expect(db.query('INSERT INTO public.aas_properties VALUES ($1)', ['xs:madeUp'])).rejects.toThrow(/aas_properties_value_type_check/);
});