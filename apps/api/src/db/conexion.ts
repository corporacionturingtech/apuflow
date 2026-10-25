import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as esquema from './esquema';

export function crearBd(url: string) {
  const pool = new pg.Pool({ connectionString: url });
  return { pool, db: drizzle(pool, { schema: esquema }) };
}

export type Bd = ReturnType<typeof crearBd>['db'];
