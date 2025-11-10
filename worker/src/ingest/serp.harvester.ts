import { got } from 'got';
import pLimit from 'p-limit';
import { env } from '../common/env';

const limit = pLimit(5);
const TEMPLATES = (city: string, state?: string) => [
  `raw milk near ${city} ${state ?? ''}`,
  `buy raw milk ${city} ${state ?? ''}`,
  `herd share ${city} ${state ?? ''}`,
  `cow share ${city} ${state ?? ''}`,
  `farm stand raw milk ${city} ${state ?? ''}`
];

export type SerpResult = {
  url: string; title?: string; snippet?: string;
  source_type: 'serp'; source_name: 'google';
};

export async function harvestSERP(city: string, state?: string): Promise<SerpResult[]> {
  if (!env.SERPAPI_KEY) return [];
  const tasks = TEMPLATES(city, state).map(q => limit(async () => {
    const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&location=${encodeURIComponent(`${city}, ${state ?? ''}`)}&hl=en&num=10&api_key=${env.SERPAPI_KEY}`;
    const data = await got(url, { timeout: { request: 15000 } }).json<any>();
    return (data.organic_results ?? []).map((r: any) => ({
      url: r.link, title: r.title, snippet: r.snippet,
      source_type: 'serp' as const, source_name: 'google' as const
    }));
  }));
  const flat = (await Promise.all(tasks)).flat();

  const seen = new Set<string>();
  return flat.filter(r => (r.url && !seen.has(r.url)) && seen.add(r.url));
}
