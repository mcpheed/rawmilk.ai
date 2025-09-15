import { mkdirSync, writeFileSync } from 'fs';
import { runAllProviders } from '../src/scrapers';
import { geocodeAddress } from '../src/lib/geocode';

interface Loc {
  id: string;
  name: string;
  type: string;
  address?: string;
  city?: string;
  state?: string; // may be 'Massachusetts' or 'MA' etc.
  zip?: string;
  phone?: string;
  website?: string;
  source?: { name: string; url: string };
  lat?: number;
  lng?: number;
}

// ---------- helpers ---------------------------------------------------------

const STATE_TO_ABBR: Record<string,string> = {
  'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA','colorado':'CO','connecticut':'CT',
  'delaware':'DE','florida':'FL','georgia':'GA','hawaii':'HI','idaho':'ID','illinois':'IL','indiana':'IN',
  'iowa':'IA','kansas':'KS','kentucky':'KY','louisiana':'LA','maine':'ME','maryland':'MD','massachusetts':'MA',
  'michigan':'MI','minnesota':'MN','mississippi':'MS','missouri':'MO','montana':'MT','nebraska':'NE','nevada':'NV',
  'new hampshire':'NH','new-hampshire':'NH','new jersey':'NJ','new-jersey':'NJ','new mexico':'NM','new-mexico':'NM',
  'new york':'NY','new-york':'NY','north carolina':'NC','north-carolina':'NC','north dakota':'ND','north-dakota':'ND',
  'ohio':'OH','oklahoma':'OK','oregon':'OR','pennsylvania':'PA','rhode island':'RI','rhode-island':'RI',
  'south carolina':'SC','south-carolina':'SC','south dakota':'SD','south-dakota':'SD','tennessee':'TN',
  'texas':'TX','utah':'UT','vermont':'VT','virginia':'VA','washington':'WA','west virginia':'WV','west-virginia':'WV',
  'wisconsin':'WI','wyoming':'WY','district of columbia':'DC','dc':'DC'
};
const ABBR_SET = new Set(Object.values(STATE_TO_ABBR));

function normState(s?: string): string | undefined {
  if (!s) return undefined;
  const t = s.trim();
  const up = t.toUpperCase();
  if (ABBR_SET.has(up)) return up;
  const low = t.toLowerCase();
  return STATE_TO_ABBR[low];
}

// Trim junk & insert missing commas between “StreetBarre” / “Rd.Warwick”
function sanitizeBlock(raw: string) {
  if (!raw) return '';
  let q = raw.replace(/\s+/g, ' ').trim();
  q = q.replace(/\bWebsite\s+https?:\/\/\S+.*/i, '').trim();
  q = q.replace(/\bPhone\s*Number\s*\d[\d\s().-]+/i, '').trim();
  q = q.replace(/\bDescription\b.*$/i, '').trim();
  q = q.replace(/\bUSA\b/gi, '').trim();
  q = q.replace(/([a-z])([A-Z])/g, '$1, $2');
  return q;
}

function padZipIfNeeded(s?: string) {
  if (!s) return undefined;
  if (/^\d{5}$/.test(s)) return s;
  if (/^\d{4}$/.test(s)) return '0' + s; // fix dropped leading 0 (e.g. 01267)
  return undefined;
}

function extractPieces(raw: string, defaultState?: string) {
  const s = sanitizeBlock(raw);
  const zipRaw = s.match(/\b\d{5}\b/)?.[0] || s.match(/\b\d{4}\b/)?.[0];
  const zip = padZipIfNeeded(zipRaw);

  // detect state in the blob OR fall back to provided state
  const blobState =
    normState(s.match(/\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New\s?Hampshire|New\s?Jersey|New\s?Mexico|New\s?York|North\s?Carolina|North\s?Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode\s?Island|South\s?Carolina|South\s?Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West\s?Virginia|Wisconsin|Wyoming)\b/i)?.[0])
    || normState(s.match(/\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/)?.[0]);
  const state = blobState || normState(defaultState);

  // city patterns
  let city = s.match(/([A-Za-z][A-Za-z .'-]+),\s*(?:[A-Za-z .'-]+|[A-Z]{2})\b/)?.[1]?.trim();
  if (!city) city = s.match(/\.\s*([A-Za-z][A-Za-z .'-]+),\s*(?:[A-Za-z .'-]+|[A-Z]{2})\b/)?.[1]?.trim();
  if (!city && state) city = s.match(new RegExp(`([A-Za-z][A-Za-z .'-]+)\\s+${state}\\b`,'i'))?.[1]?.trim();

  // street at start
  const street =
    s.match(/^\s*\d{1,6}\s+[A-Za-z0-9 .,'-]+?(?:\b(Rd|Road|St|Street|Ave|Avenue|Blvd|Lane|Ln|Dr|Drive|Way|Route|Rte|Hwy|Highway|Ct|Court|Pl|Place)\b)\.?,?/i)?.[0]?.trim()
    || s.match(/^\s*\d{1,6}\s+[A-Za-z0-9 .,'-]+?(?=,|$)/)?.[0]?.trim();

  return { s, street, city, state, zip };
}

function buildCandidateQueries(l: Loc): string[] {
  const defaultState = normState(l.state);
  const pieces = extractPieces(
    [(l.address||''), (l.city||''), (l.state||''), (l.zip||'')].join(' '),
    defaultState
  );

  const cands: string[] = [];
  const structured = [l.address, l.city, defaultState, l.zip].filter(Boolean).join(', ');
  if (structured) cands.push(`${structured}, USA`);

  if (pieces.zip) cands.push(`${pieces.zip}, USA`);

  if (pieces.city && (pieces.state || defaultState)) {
    const st = pieces.state || defaultState!;
    cands.push(`${pieces.city}, ${st}`, `${pieces.city}, ${st}, USA`);
  }

  if (pieces.street && pieces.city && (pieces.state || defaultState)) {
    const st = pieces.state || defaultState!;
    cands.push(`${pieces.street}, ${pieces.city}, ${st}`, `${pieces.street}, ${pieces.city}, ${st}, USA`);
  }

  if (l.name && (pieces.state || defaultState)) {
    const st = pieces.state || defaultState!;
    cands.push(`${l.name}, ${st}`, `${l.name}, ${st}, USA`);
  }

  // final raw cleaned string + USA as last resort
  cands.push(`${pieces.s}, USA`);

  // dedupe
  const seen = new Set<string>();
  return cands.map(x => x.replace(/\s+/g,' ').trim()).filter(x => x && !seen.has(x) && seen.add(x));
}

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ---------- main ------------------------------------------------------------

(async () => {
  console.log('Scraping providers…');
  const all: Loc[] = await runAllProviders();
  const cleaned = all.filter(x => x.name && (x.city || x.state || x.address));
  console.log(`Got ${all.length} raw; keeping ${cleaned.length}`);

  let success = 0, fail = 0;

  for (const loc of cleaned) {
    if (loc.lat != null && loc.lng != null) continue;

    const candidates = buildCandidateQueries(loc);
    let hit: null | { lat:number; lng:number } = null;

    for (const q of candidates) {
      hit = await geocodeAddress(q);
      if (hit) {
        loc.lat = hit.lat; loc.lng = hit.lng; success++;
        console.log(`✓ ${loc.name} -> (${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}) | ${q}`);
        break;
      } else {
        console.warn(`… retry with: ${q}`);
      }
      await sleep(850); // polite to Nominatim
    }

    if (!hit) {
      fail++;
      console.warn(`× Geocode failed: ${loc.name} (tried ${candidates.length} variants)`);
    }
  }

  mkdirSync('data', { recursive: true });
  writeFileSync('data/locations.json', JSON.stringify({
    generatedAt: new Date().toISOString(),
    count: cleaned.length,
    locations: cleaned
  }, null, 2));

  console.log(`Wrote data/locations.json with ${cleaned.length} locations (geocoded: ${success}, failed: ${fail})`);
})();
