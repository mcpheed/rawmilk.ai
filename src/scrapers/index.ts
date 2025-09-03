import { Location } from '../lib/types';
import { scrapeNOFAMass } from './providers/nofa_ma';
import { scrapeRealMilkState } from './providers/realmilk_state';

export async function runAllProviders(): Promise<Location[]> {
  const chunks: Location[][] = [];
  chunks.push(await scrapeNOFAMass());
  chunks.push(await scrapeRealMilkState('massachusetts'));
  // add more states later: chunks.push(await scrapeRealMilkState('california'));

  const byId = new Map<string, Location>();
  for (const list of chunks) for (const loc of list) byId.set(loc.id, { ...byId.get(loc.id), ...loc });
  return [...byId.values()];
}
