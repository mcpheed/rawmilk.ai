import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load ../.env (repo-root) so DATABASE_URL (5433) and SERPAPI_KEY are visible
config({ path: resolve(process.cwd(), '../.env') });

export const REQUIRED = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
};

// Named export expected by the harvester
export const env = {
  DATABASE_URL: REQUIRED('DATABASE_URL'),
  SERPAPI_KEY:  REQUIRED('SERPAPI_KEY'),
};
