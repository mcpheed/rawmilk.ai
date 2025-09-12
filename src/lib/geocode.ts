type GeoResult = { lat: number, lng: number };
type Cache = Record<string, GeoResult>;

const UA = { 'User-Agent': 'rawmilk.ai bot (contact: hello@rawmilk.ai)' };
const EMAIL = 'hello@rawmilk.ai'; // change if you want

import { readFileSync, writeFileSync, existsSync } from 'fs';

const CACHE_PATH = 'data/geocode-cache.json';
let CACHE: Cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH,'utf-8')) : {};

function saveCache() {
  try { writeFileSync(CACHE_PATH, JSON.stringify(CACHE, null, 2)); } catch {}
}

export async function geocodeAddress(q: string): Promise<GeoResult | null> {
  const key = q.trim().toLowerCase();
  if (CACHE[key]) return CACHE[key];

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&email=${encodeURIComponent(EMAIL)}&q=${encodeURIComponent(q)}`;
  // @ts-ignore Node 20 global fetch
  const res = await fetch(url, { headers: UA as any });
  if (!res?.ok) return null;
  const arr = await res.json();
  if (!Array.isArray(arr) || !arr[0]) return null;

  const lat = parseFloat(arr[0].lat), lng = parseFloat(arr[0].lon);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    CACHE[key] = { lat, lng };
    saveCache();
    return { lat, lng };
  }
  return null;
}

export function haversineKm(a: GeoResult, b: GeoResult) {
  const R=6371, toRad=(x:number)=>x*Math.PI/180;
  const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
  const sa = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(sa));
}
