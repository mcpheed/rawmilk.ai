import { load } from 'cheerio';
import { Location } from '../../lib/types';
import { keyOf } from '../../lib/geo';

const UA = { 'User-Agent': 'rawmilk.ai bot (contact: hello@rawmilk.ai)' };

const SOURCE_URLS = [
  'https://www.nofamass.org/home/programs/raw-milk-network/information-about-raw-milk-consumers/',
  'https://www.nofamass.org/home/programs/raw-milk-network/'
];

function looksLikeEventBlob(s: string) {
  const t = s.toLowerCase();
  if (t.includes('has featured events')) return true;
  if (t.includes('has 1 event')) return true;
  if (t.includes('featured')) return true;
  if (/\b(@|\d{1,2}:\d{2}\s*(am|pm))\b/i.test(s)) return true;
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(s)) return true;
  if (t.includes('workshop') || t.includes('webinar')) return true;
  return false;
}
function maybeCityStateMA(text: string) { return /(,?\s*MA\b)/.test(text); }

export async function scrapeNOFAMass(): Promise<Location[]> {
  const out: Location[] = [];

  for (const url of SOURCE_URLS) {
    try {
      const res: any = await (globalThis as any).fetch(url, { headers: UA } as any);
      if (!res?.ok) continue;
      const html = await res.text();
      const $ = load(html);

      const candidates: any[] = [];
      $('h1,h2,h3,h4').each((_: any, h: any) => {
        const title = $(h).text().toLowerCase();
        if (title.includes('raw') && (title.includes('milk') || title.includes('dair'))) {
          let next = $(h).next();
          for (let i = 0; i < 8 && next.length; i++) {
            if (next.is('table, .wp-block-table, ul, ol')) candidates.push(next);
            next = next.next();
          }
        }
      });
      $('table, .wp-block-table, ul, ol').each((_: any, el: any) => {
        const text = $(el).text();
        if ((/raw/i.test(text) || /dair/i.test(text)) && !looksLikeEventBlob(text)) candidates.push($(el));
      });

      for (const c of candidates) {
        // Tables
        c.find('tr').each((_: any, tr: any) => {
          const tds = $(tr).find('td');
          if (tds.length < 1) return;

          const line = tds.map((__i: any, td: any) => $(td).text().trim()).get().filter(Boolean).join(' • ');
          if (!line || looksLikeEventBlob(line) || line.length > 220) return;

          const name = line.split('•')[0]?.trim();
          if (!name) return;

          const phone = line.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/)?.[1];
          const zip = line.match(/\b\d{5}(?:-\d{4})?\b/)?.[0];
          const website = $(tr).find('a[href]').first().attr('href') || undefined;

          let address: string|undefined, city: string|undefined, state = 'MA';
          const parts = line.split('•').map(s=>s.trim());
          for (const p of parts) {
            if (!address && /\d+\s+\S+/.test(p) && !p.match(/\d{3}[-.\s]?\d{3}/)) address = p;
            if (!city && maybeCityStateMA(p)) city = p.replace(/,?\s*MA.*/,'').trim();
          }

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

        // Lists
        c.find('li').each((_: any, li: any) => {
          const line = $(li).text().trim();
          if (!line || looksLikeEventBlob(line) || line.length > 220) return;

          const name = line.split('-')[0]?.split('•')[0]?.trim();
          if (!name) return;

          const phone = line.match(/(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/)?.[1];
          const zip = line.match(/\b\d{5}(?:-\d{4})?\b/)?.[0];
          const website = $(li).find('a[href]').first().attr('href') || undefined;

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
    } catch {}
  }

  const seen = new Set<string>();
  return out.filter(x => (seen.has(x.id) ? false : (seen.add(x.id), true)));
}
