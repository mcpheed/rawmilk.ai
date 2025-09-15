import { Location } from '../lib/types';
import { scrapeNOFAMass } from './providers/nofa_ma';
import { scrapeRealMilkState } from './providers/realmilk_state';

// Start with a broad set; you can add all 50 over time.
const STATES = [
  // New England + NY
  'massachusetts','new-hampshire','vermont','connecticut','rhode-island','maine','new-york',
  // Mid-Atlantic / Midwest big coverage
  'pennsylvania','ohio','michigan','illinois','wisconsin','minnesota','indiana','missouri',
  // South
  'texas','florida','georgia','north-carolina','tennessee','alabama','kentucky','virginia',
  // West
  'california','washington','oregon','colorado','arizona','utah','idaho','nevada','new-mexico',
  // Plains / Rockies
  'oklahoma','kansas','nebraska','iowa','montana','wyoming','north-dakota','south-dakota',
  // Others
  'arkansas','louisiana','south-carolina','west-virginia','maryland','delaware',
];

export async function runAllProviders(): Promise<Location[]> {
  const buckets: Location[][] = [];

  // 1) curated MA
  try {
    const nofa = await scrapeNOFAMass();
    buckets.push(nofa);
    console.log(`NOFA/Mass: ${nofa.length} records`);
  } catch (e) { console.warn('NOFA/Mass failed:', e); }

  // 2) RealMilk by state
  for (const s of STATES) {
    try {
      const list = await scrapeRealMilkState(s, { maxPages: 8 });
      buckets.push(list);
      console.log(`RealMilk ${s}: ${list.length} records`);
      await new Promise(r => setTimeout(r, 800)); // polite delay
    } catch (e) {
      console.warn(`RealMilk ${s} failed:`, e);
    }
  }

  // Merge by id
  const byId = new Map<string, Location>();
  for (const arr of buckets) for (const loc of arr) {
    const prev = byId.get(loc.id) || {};
    byId.set(loc.id, { ...prev, ...loc });
  }
  const merged = [...byId.values()];
  console.log(`Total merged: ${merged.length}`);
  return merged;
}
