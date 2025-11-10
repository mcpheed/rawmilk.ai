import 'dotenv/config';
export const env = {
  DATABASE_URL: process.env.DATABASE_URL!,
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  SERPAPI_KEY: process.env.SERPAPI_KEY || '',
  MAPBOX_TOKEN: process.env.MAPBOX_TOKEN || '',
  OPENCAGE_KEY: process.env.OPENCAGE_KEY || ''
};
