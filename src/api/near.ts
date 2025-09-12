import { Router, Request, Response } from 'express';
import data from '../../data/locations.json';
import { geocodeAddress, haversineKm } from '../lib/geocode';

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

/**
 * GET /api/near
 * Query:
 *   address=...  (OR lat/lng)
 *   lat=..&lng=..
 * Optional:
 *   max=number (default 5)
 *   radiusKm=number (default 200)
 */
nearRouter.get('/', async (req: Request, res: Response) => {
  const max = Math.min(50, Math.max(1, Number(req.query.max ?? 5)));
  const radiusKm = Number(req.query.radiusKm ?? 200) || 200;

  let lat: number | undefined;
  let lng: number | undefined;

  if (req.query.lat && req.query.lng) {
    lat = Number(req.query.lat);
    lng = Number(req.query.lng);
  } else if (req.query.address) {
    const g = await geocodeAddress(String(req.query.address));
    if (g) { lat = g.lat; lng = g.lng; }
  }

  if (!Number.isFinite(lat as number) || !Number.isFinite(lng as number)) {
    res.status(400).json({ error: 'Provide ?address=... or ?lat=..&lng=..' });
    return;
  }

  const here = { lat: lat as number, lng: lng as number };
  const locs: Loc[] = (data as any).locations.filter((l: Loc) => l.lat != null && l.lng != null);

  const scored = locs
    .map((l: Loc) => ({ ...l, distanceKm: haversineKm(here, { lat: l.lat!, lng: l.lng! }) }))
    .filter((l: Loc) => l.distanceKm! <= radiusKm)
    .sort((a: Loc, b: Loc) => (a.distanceKm! - b.distanceKm!))
    .slice(0, max);

  res.json({ count: scored.length, locations: scored });
});
