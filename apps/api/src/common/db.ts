import { Pool } from 'pg';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://rawmilk:rawmilk@localhost:5432/rawmilk';

export const pool = new Pool({
  connectionString,
  // If you ever run through a proxy/SSL in prod, add ssl options here.
});
