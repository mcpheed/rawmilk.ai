import { runAllProviders } from '../src/scrapers';
import { writeFileSync, mkdirSync } from 'fs';
import { geocodeAddress } from '../src/lib/geocode';

type Loc = {
  id: string; name: string; type:'farm'|'pickup'|'retail';
  address?: string; city?: string; state?: string; zip?: string;
  phone?: string; website?: string;
  lat?: number; lng?: number;
  source: { name: string; url: string };
  updatedAt: string;
};

function addrString(l: Loc) {
  const s = [l.address, l.city, l.state, l.zip].filter(Boolean).join(', ');
  return s || [l.city, l.state].filter(Boolean).join(', ');
}

(async () => {
  const all = await runAllProviders();
  const cleaned = all.filter(x => x.name && (x.city || x.state || x.address)) as Loc[];

  // Geocode any without lat/lng (cached)
  for (const l of cleaned) {
    if (l.lat != null && l.lng != null) continue;
    const q = addrString(l);
    if (!q) continue;
    try {
      const g = await geocodeAddress(q);
      if (g) { l.lat = g.lat; l.lng = g.lng; }
      await new Promise(r => setTimeout(r, 1000)); // be polite to Nominatim
    } catch {}
  }

  mkdirSync('data', { recursive: true });
  writeFileSync('data/locations.json', JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: cleaned.length,
    locations: cleaned
  }, null, 2));
  console.log(`Wrote data/locations.json with ${cleaned.length} locations`);
})();
