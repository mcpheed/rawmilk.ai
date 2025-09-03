import { Router, Request, Response } from 'express';
import data from '../../data/locations.json';

export const locationsRouter = Router();

locationsRouter.get('/', (req: Request, res: Response) => {
  const state = (req.query.state as string | undefined)?.toUpperCase();
  const q = (req.query.q as string | undefined)?.toLowerCase();

  let locs = (data as any).locations as any[];

  if (state) {
    locs = locs.filter((l) => (l.state || '').toUpperCase() === state);
  }
  if (q) {
    locs = locs.filter((l) =>
      [l.name, l.city, l.address, l.website]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }

  res.json({ count: locs.length, locations: locs });
});
