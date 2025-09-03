import * as cheerio from 'cheerio';
import { Location } from '../../lib/types';
import { keyOf, slugify } from '../../lib/geo';

type StateCode = string;

const UA = { 'User-Agent': 'rawmilk.ai bot (contact: hello@rawmilk.ai)' };

export async function scrapeRealMilkState(stateSlug: StateCode, { maxPages = 10 } = {}): Promise<Location[]> {
  const base = 'https://www.realmilk.com/farm-directory';
  const out: Location[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const url = page === 1
      ? `${base}/?wpbdm-region=${encodeURIComponent(stateSlug)}`
      : `${base}/page/${page}/?wpbdm-region=${encodeURIComponent(stateSlug)}`;

    try {
      const res: any = await (globalThis as any).fetch(url, { headers: UA } as any);
      if (!res?.ok) break;
      const html = await res.text();
      const $ = cheerio.load(html);

      const items: any[] = $('.wpbdp-listing, .listing-item, article').toArray();
      if (items.length === 0) break;

      for (const el of items) {
        const $el = $(el);
        const title = $el.find('h2, .listing-title, .wpbdp-title').first().text().trim();
        if (!title) continue;

        const blockText = $el.text().replace(/\s+/g, ' ').trim();
        const address =
          blockText.match(/\d{1,5}\s+[^,]+,\s*[^,]+,\s*[A-Z]{2}\s*\d{5}(-\d{4})?/)?.[0] ||
          blockText.match(/\d{1,5}\s+[^,]+,\s*[^,]+/)?.[0];
        const cityMatch = blockText.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\,?\s+[A-Z]{2}\b/);
        const stateMatch = blockText.match(/\b[A-Z]{2}\b/);
        const zip = blockText.match(/\b\d{5}(?:-\d{4})?\b/)?.[0];
        const phone = blockText.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/)?.[1];
        const website = $el.find('a[href^="http"]').first().attr('href') || undefined;

        out.push({
          id: `realmilk-${slugify(stateSlug)}-${keyOf(title, zip)}`,
          name: title,
          type: /pickup|CSA|drop/i.test(blockText) ? 'pickup' : 'farm',
          address,
          city: cityMatch?.[1],
          state: stateMatch?.[0],
          zip,
          phone,
          website,
          source: { name: 'RealMilk Directory', url },
          updatedAt: new Date().toISOString()
        });
      }
    } catch {
      break;
    }
  }

  const seen = new Set<string>();
  return out.filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}
