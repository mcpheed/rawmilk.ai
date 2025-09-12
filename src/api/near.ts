import { Router, Request, Response } from 'express';
import data from '../../data/locations.json';
import { geocodeAddress, haversineKm } from '../lib/geocode';
import { extractLocationFromText } from '../lib/ai';

interface Loc {
  id: string;
  name: string;
  type: 'farm' | 'pickup' | 'retail';
  address?: string; city?: string; state?: string; zip?: string;
  phone?: string; website?: string;
  lat?: number; lng?: number;
  source?: { name: string; url: string };
  updatedAt?: string;
  distanceKm?: number;
}

export const nearRouter = Router();

function joinAddr(l: Partial<Loc>) {
  const parts = [l.address, l.city, l.state, l.zip].filter(Boolean);
  return parts.join(', ');
}

/**
 * GET /api/near
 * Options:
 *   q=free text   (AI tries to extract location)
 *   address=...   (geocode directly)
 *   lat=..&lng=..
 *   max=5         (default 5)
 *   radiusKm=200  (default 200)
 */
nearRouter.get('/', async (req: Request, res: Response) => {
  const max = Math.min(50, Math.max(1, Number(req.query.max ?? 5)));
  const radiusKm = Number(req.query.radiusKm ?? 200) || 200;

  let lat: number | undefined;
  let lng: number | undefined;

  // 1) lat/lng direct
  if (req.query.lat && req.query.lng) {
    lat = Number(req.query.lat);
    lng = Number(req.query.lng);
  }

  // 2) AI extraction from q=
  if ((lat == null || lng == null) && typeof req.query.q === 'string' && req.query.q.trim()) {
    const extracted = await extractLocationFromText(req.query.q.trim());
    if (extracted?.lat != null && extracted?.lng != null) {
      lat = extracted.lat; lng = extracted.lng;
    } else {
      const addr = extracted?.address || joinAddr({ city: extracted?.city, state: extracted?.state });
      if (addr) {
        const g = await geocodeAddress(addr);
        if (g) { lat = g.lat; lng = g.lng; }
      }
    }
  }

  // 3) address=
  if ((lat == null || lng == null) && typeof req.query.address === 'string' && req.query.address.trim()) {
    const g = await geocodeAddress(req.query.address.trim());
    if (g) { lat = g.lat; lng = g.lng; }
  }

  if (!Number.isFinite(lat as number) || !Number.isFinite(lng as number)) {
    res.status(400).json({ error: 'Provide q=, address=, or lat/lng.' });
    return;
  }

  const here = { lat: lat as number, lng: lng as number };
  const locs: Loc[] = (data as any).locations.filter((l: Loc) => l.lat != null && l.lng != null);

  const scored = locs
    .map((l: Loc) => ({ ...l, distanceKm: haversineKm(here, { lat: l.lat!, lng: l.lng! }) }))
    .filter((l: Loc) => l.distanceKm! <= radiusKm)
    .sort((a: Loc, b: Loc) => (a.distanceKm! - b.distanceKm!))
    .slice(0, max);

  res.json({ origin: here, count: scored.length, locations: scored });
});
