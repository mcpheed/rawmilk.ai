import './env';              // ensure env is loaded
import { env } from './env';
import { Pool } from 'pg';

export const pool = new Pool({ connectionString: env.DATABASE_URL });
