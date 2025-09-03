import * as cheerio from 'cheerio';
import { Location } from '../../lib/types';
import { keyOf } from '../../lib/geo';

const UA = { 'User-Agent': 'rawmilk.ai bot (contact: hello@rawmilk.ai)' };

const SOURCE_URLS = [
  'https://www.nofamass.org/home/programs/raw-milk-network/information-about-raw-milk-consumers/',
  'https://www.nofamass.org/home/programs/raw-milk-network/'
];

// simple heuristics to detect/skip event/calendar blobs
function looksLikeEventBlob(s: string) {
  const t = s.toLowerCase();
  if (t.includes('has featured events')) return true;
  if (t.includes('has 1 event')) return true;
  if (t.includes('featured')) return true;
  if (/\b(@|\d{1,2}:\d{2}\s*(am|pm))\b/i.test(s)) return true; // times like 4:00 pm
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(s)) return true; // month names
  if (t.includes('workshop') || t.includes('webinar') || t.includes('allies:')) return true;
  return false;
}

function maybeCityStateMA(text: string) {
  // e.g., "Greenfield, MA", "Hadley MA", etc.
  return /(,?\s*MA\b)/.test(text);
}

export async function scrapeNOFAMass(): Promise<Location[]> {
  const out: Location[] = [];

  for (const url of SOURCE_URLS) {
    try {
      const res: any = await (globalThis as any).fetch(url, { headers: UA } as any);
      if (!res?.ok) continue;
      const html = await res.text();
      const $ = cheerio.load(html);

      // Prefer sections that are close to headings mentioning "raw milk" and "dair"
      const candidates: cheerio.Cheerio[] = [];

      $('h1,h2,h3,h4').each((_, h) => {
        const title = $(h).text().toLowerCase();
        if (title.includes('raw') && (title.includes('milk') || title.includes('dair'))) {
          // take the next table or list under this heading
          let next = $(h).next();
          for (let i = 0; i < 8 && next.length; i++) {
            if (next.is('table, .wp-block-table, ul, ol')) candidates.push(next);
            next = next.next();
          }
        }
      });

      // Fallback: any tables/lists that mention raw milk without event-y text
      $('table, .wp-block-table, ul, ol').each((_, el) => {
        const text = $(el).text();
        if ((/raw/i.test(text) || /dair/i.test(text)) && !looksLikeEventBlob(text)) {
          candidates.push($(el));
        }
      });

      // Parse candidates
      for (const c of candidates) {
        // 1) Table rows
        c.find('tr').each((_, tr) => {
          const tds = $(tr).find('td');
          if (tds.length < 1) return;

          const line = tds.map((__i, td) => $(td).text().trim()).get().filter(Boolean).join(' • ');
          if (!line) return;
          if (looksLikeEventBlob(line)) return;

          // Must look location-like (avoid long event descriptions)
          if (line.length > 220) return;

          // Extract fields
          const name = line.split('•')[0]?.trim();
          if (!name) return;

          const phone = line.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/)?.[1];
          const zip = line.match(/\b\d{5}(?:-\d{4})?\b/)?.[0];
          const website = $(tr).find('a[href]').first().attr('href') || undefined;

          // city/state
          let address: string|undefined, city: string|undefined, state = 'MA';
          const parts = line.split('•').map(s=>s.trim());
          for (const p of parts) {
            if (!address && /\d+\s+\S+/.test(p) && !p.match(/\d{3}[-.\s]?\d{3}/)) address = p;
            if (!city && maybeCityStateMA(p)) city = p.replace(/,?\s*MA.*/,'').trim();
          }

          // keep only if it's plausibly a place (name + some locality or contact)
          const ok = name && (city || address || zip || phone || website);
          if (!ok) return;

          out.push({
            id: `nofa-ma-${keyOf(name, zip)}`,
            name, type: 'farm',
            address, city, state, zip, phone, website,
            source: { name: 'NOFA/Mass Raw Milk Network', url },
            updatedAt: new Date().toISOString()
          });
        });

        // 2) List items
        c.find('li').each((_, li) => {
          const line = $(li).text().trim();
          if (!line) return;
          if (looksLikeEventBlob(line)) return;
          if (line.length > 220) return;

          const name = line.split('-')[0]?.split('•')[0]?.trim();
          if (!name) return;

          const phone = line.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/)?.[1];
          const zip = line.match(/\b\d{5}(?:-\d{4})?\b/)?.[0];
          const website = $(li).find('a[href]').first().attr('href') || undefined;

          // must be MA-oriented and not an event
          if (!maybeCityStateMA(line) && !zip && !phone) return;

          out.push({
            id: `nofa-ma-${keyOf(name, zip)}`,
            name, type: 'farm',
            state: 'MA', phone, website,
            source: { name: 'NOFA/Mass Raw Milk Network', url },
            updatedAt: new Date().toISOString()
          });
        });
      }
    } catch {
      continue;
    }
  }

  // De-dupe
  const seen = new Set<string>();
  return out.filter(x => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}
