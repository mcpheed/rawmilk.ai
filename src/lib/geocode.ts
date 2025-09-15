import { readFileSync, writeFileSync, existsSync } from 'fs';

type GeoResult = { lat: number, lng: number };
type Cache = Record<string, GeoResult>;

const EMAIL = 'hello@rawmilk.ai'; // change to yours if you like
const UA = `rawmilk.ai bot (contact: ${EMAIL})`;

const CACHE_PATH = 'data/geocode-cache.json';
let CACHE: Cache = existsSync(CACHE_PATH) ? JSON.parse(readFileSync(CACHE_PATH,'utf-8')) : {};

function saveCache() {
  try { writeFileSync(CACHE_PATH, JSON.stringify(CACHE, null, 2)); } catch {}
}

function norm(q: string) {
  return q.trim().replace(/\s+/g,' ');
}

async function nominatim(q: string): Promise<GeoResult | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&email=${encodeURIComponent(EMAIL)}&q=${encodeURIComponent(q)}`;
  // @ts-ignore Node 20 global fetch
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.8',
      'Referer': 'https://rawmilk.ai/'
    } as any
  });

  // Retry once on 429 politely
  if (res.status === 429) {
    await new Promise(r => setTimeout(r, 1500));
    // @ts-ignore
    const res2 = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.8', 'Referer': 'https://rawmilk.ai/' } as any });
    if (!res2.ok) return null;
    const arr2 = await res2.json();
    if (Array.isArray(arr2) && arr2[0]) {
      const lat = parseFloat(arr2[0].lat), lng = parseFloat(arr2[0].lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    }
    return null;
  }

  if (!res.ok) return null;
  const arr = await res.json();
  if (!Array.isArray(arr) || !arr[0]) return null;
  const lat = parseFloat(arr[0].lat), lng = parseFloat(arr[0].lon);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
}

export async function geocodeAddress(raw: string): Promise<GeoResult | null> {
  let q = norm(raw);
  if (!q) return null;

  const key = q.toLowerCase();
  if (CACHE[key]) return CACHE[key];

  // Try as-is
  let hit = await nominatim(q);
  // If not found, bias to USA
  if (!hit) {
    const hasUSA = /\bUSA\b|\bUnited States\b/i.test(q);
    const q2 = hasUSA ? q : `${q}, USA`;
    hit = await nominatim(q2);
    if (!hit) {
      // Try city + state only (drop long street fragments) then + USA
      const simple = q.replace(/(^\d+\s+[^,]+,?\s*)/,'').trim(); // drop leading street number + name
      if (simple && simple !== q) {
        hit = await nominatim(simple);
        if (!hit && !/\bUSA\b|\bUnited States\b/i.test(simple)) {
          hit = await nominatim(`${simple}, USA`);
        }
      }
    }
  }

  if (hit) {
    CACHE[key] = hit;
    saveCache();
    return hit;
  }
  return null;
}

export function haversineKm(a: GeoResult, b: GeoResult) {
  const R=6371, toRad=(x:number)=>x*Math.PI/180;
  const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
  const sa = Math.sin(dLat/2)**2 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(sa));
}
