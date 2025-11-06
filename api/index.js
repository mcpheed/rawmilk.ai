import express from 'express';
import cors from 'cors';
import fs from 'fs';
import pg from 'pg';
const { Pool } = pg;

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

let fileMode = !process.env.DATABASE_URL;
let pool = null;
let PLACES = null;

if (fileMode) {
  console.log('API starting in FILE mode (no DATABASE_URL found)');
  PLACES = JSON.parse(fs.readFileSync(new URL('../data/places.seed.json', import.meta.url)));
} else {
  console.log('API starting in DB mode');
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
}

const kmToMeters = km => km * 1000;
const q = (req,k,def)=> (req.query[k]!==undefined? req.query[k] : def);

app.get('/health', async (_req, res) => {
  if (fileMode) return res.json({ ok: true, mode: 'file' });
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, mode: 'db' });
  } catch (e) {
    res.status(500).json({ ok: false, mode: 'db', error: String(e) });
  }
});

app.get('/v1/search', async (req,res)=>{
  const lat = Number(q(req,'lat', NaN));
  const lng = Number(q(req,'lng', NaN));
  const radiusKm = Number(q(req,'radius_km', 75));
  const minConf = Number(q(req,'min_conf', 0.55));
  const limit = Number(q(req,'limit', 20));
  const offset = Number(q(req,'offset', 0));
  if (Number.isNaN(lat) || Number.isNaN(lng)) return res.status(400).json({error:'lat,lng required'});

  if (fileMode) {
    const R=6371000, toRad=d=>d*Math.PI/180;
    const hv=(a,b,c,d)=>{const dLat=toRad(c-a), dLng=toRad(d-b);
      const A=Math.sin(dLat/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLng/2)**2;
      return 2*R*Math.asin(Math.sqrt(A));};
    const results = PLACES
      .filter(p => p.confidence >= minConf)
      .map(p => ({...p, meters: hv(lat,lng,p.lat,p.lng)}))
      .filter(p => p.meters <= kmToMeters(radiusKm))
      .sort((a,b)=> (a.meters - b.meters) || (b.confidence - a.confidence))
      .slice(0, limit)
      .map(p => ({ id:p.id, name:p.name, kind:p.kind, phone:p.phone, website:p.website,
                   city:p.city, state:p.state, postcode:p.postcode, lat:p.lat, lng:p.lng,
                   meters: Math.round(p.meters), confidence:p.confidence }));
    return res.json({results, count: results.length});
  }

  const sql = `
    SELECT id, name, kind, phone, website, city, state, postcode, confidence,
           ST_X(ST_AsText(geom)) AS lng, ST_Y(ST_AsText(geom)) AS lat,
           ST_Distance(geom, ST_MakePoint($1,$2)::geography) AS meters
    FROM places
    WHERE confidence >= $3
      AND geom IS NOT NULL
      AND ST_DWithin(geom, ST_MakePoint($1,$2)::geography, $4)
    ORDER BY geom <-> ST_MakePoint($1,$2)::geography, confidence DESC
    LIMIT $5 OFFSET $6
  `;
  const params = [lng, lat, minConf, kmToMeters(radiusKm), limit, offset];
  const r = await pool.query(sql, params);
  const results = r.rows.map(p => ({
    id: p.id, name: p.name, kind: p.kind,
    phone: p.phone, website: p.website,
    city: p.city, state: p.state, postcode: p.postcode,
    lat: Number(p.lat), lng: Number(p.lng),
    meters: Math.round(Number(p.meters)),
    confidence: Number(p.confidence)
  }));
  return res.json({results, count: results.length});
});

app.listen(PORT, ()=>console.log(`rawmilk api on :${PORT}`));
