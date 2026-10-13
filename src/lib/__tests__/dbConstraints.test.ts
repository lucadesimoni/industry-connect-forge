/**
 * Runs the real constraint migration on an in-process PostgreSQL (PGlite) and
 * checks that the database accepts/rejects exactly what the TypeScript
 * validators accept/reject.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';
import { validateIdShort } from '../validation';
import { validateRDSDesignation } from '../hierarchyUtils';

const MIGRATION = resolve(__dirname, '../../../supabase/migrations/20261014000000_aas_rds_syntax_constraints.sql');

let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  // minimal stand-ins for the Supabase tables (only the constrained columns)
  await db.exec(`
    CREATE TABLE public.aas (id serial primary key, id_short text not null);
    CREATE TABLE public.aas_submodels (id serial primary key, id_short text not null);
    CREATE TABLE public.aas_properties (id serial primary key, id_short text not null);
    CREATE TABLE public.rds_designations (id serial primary key, designation text not null);
  `);
  await db.exec(readFileSync(MIGRATION, 'utf8'));
}, 60_000);

const accepts = async (table: string, column: string, value: string) => {
  try {
    await db.query(`INSERT INTO public.${table} (${column}) VALUES ($1)`, [value]);
    return true;
  } catch {
    return false;
  }
};

const ID_SHORTS = ['CNC_001', 'Ab', 'A', 'Motor-Drive', '1Motor', 'Motor Drive', 'a'.repeat(128), 'a'.repeat(129), 'x_'];
const PATHS = ['Contact.Phone', 'Contact..Phone', 'Documents.Document01.Id01', 'A.Bc', '.Ab', 'Ab.'];
const DESIGNATIONS = ['=M1-DRV1+PIL.STANS.LN01', '+PIL', '=m1', '=M1+', 'M1', '+PIL..X', '-CNC2+A.B'];

describe('database constraints match the TypeScript validators', () => {
  it('aas.id_short and aas_submodels.id_short', async () => {
    for (const v of ID_SHORTS) {
      const expected = validateIdShort(v).valid;
      expect(await accepts('aas', 'id_short', v), `aas: ${v}`).toBe(expected);
      expect(await accepts('aas_submodels', 'id_short', v), `aas_submodels: ${v}`).toBe(expected);
    }
  });

  it('aas_properties.id_short (dotted paths + structure map row)', async () => {
    for (const v of [...ID_SHORTS, ...PATHS]) {
      expect(await accepts('aas_properties', 'id_short', v), v).toBe(validateIdShort(v, { allowPath: true }).valid);
    }
    expect(await accepts('aas_properties', 'id_short', '_aasStructure')).toBe(true);
  });

  it('rds_designations.designation', async () => {
    for (const v of DESIGNATIONS) {
      expect(await accepts('rds_designations', 'designation', v), v).toBe(validateRDSDesignation(v).valid);
    }
  });
});
