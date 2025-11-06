import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

const url = process.env.DATABASE_URL || 'postgres://rawmilk:rawmilk@localhost:5432/rawmilk';
const pool = new Pool({ connectionString: url });

const data = JSON.parse(fs.readFileSync(new URL('../data/places.seed.json', import.meta.url)));

const up = async () => {
  for (const p of data) {
    await pool.query(
      `INSERT INTO places (name,kind,phone,website,addr_original,city,state,postcode,geom,confidence,source_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,ST_SetSRID(ST_MakePoint($9,$10),4326)::geography,$11,$12)
       ON CONFLICT DO NOTHING`,
      [
        p.name, p.kind, p.phone, p.website,
        `${p.city}, ${p.state} ${p.postcode}`,
        p.city, p.state, p.postcode,
        p.lng, p.lat,
        p.confidence, 1
      ]
    );
  }
  await pool.end();
  console.log('Seeded places -> DB');
};

up().catch(e => (console.error(e), process.exit(1)));
