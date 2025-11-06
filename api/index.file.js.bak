import express from 'express';
import cors from 'cors';
import fs from 'fs';

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

const PLACES = JSON.parse(fs.readFileSync(new URL('../data/places.seed.json', import.meta.url)));

function haversineMeters(lat1,lng1,lat2,lng2){
  const R=6371000, toRad=d=>d*Math.PI/180;
  const dLat=toRad(lat2-lat1), dLng=toRad(lng2-lng1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(a));
}

app.get('/health', (_,res)=>res.json({ok:true}));

// GET /v1/search?lat=..&lng=..&radius_km=..&min_conf=..
app.get('/v1/search', (req,res)=>{
  const lat=Number(req.query.lat), lng=Number(req.query.lng);
  const radiusKm=Number(req.query.radius_km ?? 75);
  const minConf=Number(req.query.min_conf ?? 0.55);
  const limit=Number(req.query.limit ?? 20);
  if(Number.isNaN(lat)||Number.isNaN(lng)) return res.status(400).json({error:'lat,lng required'});

  const results = PLACES
    .filter(p => p.confidence >= minConf)
    .map(p => ({...p, meters: haversineMeters(lat,lng,p.lat,p.lng)}))
    .filter(p => p.meters <= radiusKm*1000)
    .sort((a,b)=> (a.meters - b.meters) || (b.confidence - a.confidence))
    .slice(0, limit)
    .map(p => ({
      id: p.id, name: p.name, kind: p.kind,
      phone: p.phone, website: p.website,
      city: p.city, state: p.state, postcode: p.postcode,
      lat: p.lat, lng: p.lng, meters: Math.round(p.meters),
      confidence: p.confidence
    }));

  res.json({results, count: results.length});
});

app.listen(PORT, ()=>console.log(`rawmilk proto api on :${PORT}`));
