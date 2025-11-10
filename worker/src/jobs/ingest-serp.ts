#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { harvestSERP } from '../ingest/serp.harvester';
import { pool } from '../common/db';

const argv = await yargs(hideBin(process.argv))
  .option('city', { type: 'string', demandOption: true })
  .option('state', { type: 'string' })
  .option('lat', { type: 'number', demandOption: true })
  .option('lng', { type: 'number', demandOption: true })
  .parse();

const { city, state, lat, lng } = argv as any;

const client = await pool.connect();
try {
  const hits = await harvestSERP(city, state);

  for (const r of hits) {
    await client.query(
      `INSERT INTO sources (source_type, source_name, url, title, snippet, fetched_at, geom)
       VALUES ($1,$2,$3,$4,$5, now(), ST_SetSRID(ST_MakePoint($6,$7),4326)::geography)
       ON CONFLICT DO NOTHING`,
      [r.source_type, r.source_name, r.url, r.title ?? null, r.snippet ?? null, Number(lng), Number(lat)]
    );
  }

  console.log(`SERP: stored ${hits.length} rows for ${city}, ${state ?? ''}`);
} finally {
  client.release();
  await pool.end();
}
