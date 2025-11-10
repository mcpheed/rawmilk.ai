import { config } from 'dotenv';
import { resolve } from 'node:path';

// Load ../.env (repo-root) so DATABASE_URL:5433 and SERPAPI_KEY are seen
config({ path: resolve(process.cwd(), '../.env') });

export const REQUIRED = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
};
