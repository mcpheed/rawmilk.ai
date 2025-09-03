import { runAllProviders } from '../src/scrapers';
import { writeFileSync, mkdirSync } from 'fs';

(async () => {
  const all = await runAllProviders();
  const cleaned = all.filter(x => x.name && (x.city || x.state || x.address));
  mkdirSync('data', { recursive: true });
  writeFileSync('data/locations.json', JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: cleaned.length,
    locations: cleaned
  }, null, 2));
  console.log(`Wrote data/locations.json with ${cleaned.length} locations`);
})();
