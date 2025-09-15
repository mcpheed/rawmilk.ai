import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { geocodeAddress } from '../src/lib/geocode';

// Minimal Loc type for this script
type Loc = {
  id: string; name: string; type?: string;
  address?: string; city?: string; state?: string; zip?: string;
  phone?: string; website?: string;
  lat?: number; lng?: number;
};

// ---------- helpers (same logic as full scrape) ----------
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
const normState = (s?:string)=> s ? (ABBR_SET.has(s.toUpperCase()) ? s.toUpperCase() : STATE_TO_ABBR[s.toLowerCase()]) : undefined;

function sanitizeBlock(raw: string) {
  let q = (raw||'').replace(/\s+/g,' ').trim();
  q = q.replace(/\bWebsite\s+https?:\/\/\S+.*/i,'').trim();
  q = q.replace(/\bPhone\s*Number\s*\d[\d\s().-]+/i,'').trim();
  q = q.replace(/\bDescription\b.*$/i,'').trim();
  q = q.replace(/\bUSA\b/gi,'').trim();
  q = q.replace(/([a-z])([A-Z])/g,'$1, $2'); // insert missing commas
  return q;
}
const padZip = (z?:string)=> z ? (/^\d{5}$/.test(z)? z : (/^\d{4}$/.test(z)? '0'+z : undefined)) : undefined;

function extractPieces(raw: string, defaultState?: string) {
  const s = sanitizeBlock(raw);
  const zip = padZip(s.match(/\b\d{5}\b/)?.[0] || s.match(/\b\d{4}\b/)?.[0]);
  const blobState =
    normState(s.match(/\b(Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New\s?Hampshire|New\s?Jersey|New\s?Mexico|New\s?York|North\s?Carolina|North\s?Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode\s?Island|South\s?Carolina|South\s?Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West\s?Virginia|Wisconsin|Wyoming)\b/i)?.[0])
    || normState(s.match(/\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/)?.[0]);
  const state = blobState || normState(defaultState);
  let city = s.match(/([A-Za-z][A-Za-z .'-]+),\s*(?:[A-Za-z .'-]+|[A-Z]{2})\b/)?.[1]?.trim()
          || s.match(/\.\s*([A-Za-z][A-Za-z .'-]+),\s*(?:[A-Za-z .'-]+|[A-Z]{2})\b/)?.[1]?.trim();
  if (!city && state) city = s.match(new RegExp(`([A-Za-z][A-Za-z .'-]+)\\s+${state}\\b`,'i'))?.[1]?.trim();
  const street =
    s.match(/^\s*\d{1,6}\s+[A-Za-z0-9 .,'-]+?(?:\b(Rd|Road|St|Street|Ave|Avenue|Blvd|Lane|Ln|Dr|Drive|Way|Route|Rte|Hwy|Highway|Ct|Court|Pl|Place)\b)\.?,?/i)?.[0]?.trim()
    || s.match(/^\s*\d{1,6}\s+[A-Za-z0-9 .,'-]+?(?=,|$)/)?.[0]?.trim();
  return { s, street, city, state, zip };
}

function buildCandidates(l: Loc): string[] {
  const st = normState(l.state);
  const pieces = extractPieces([l.address,l.city,l.state,l.zip].filter(Boolean).join(' '), st);
  const c: string[] = [];
  const structured = [l.address,l.city,st,l.zip].filter(Boolean).join(', ');
  if (structured) c.push(`${structured}, USA`);
  if (pieces.zip) c.push(`${pieces.zip}, USA`);
  if (pieces.city && (pieces.state||st)) {
    const S = pieces.state || st!;
    c.push(`${pieces.city}, ${S}`, `${pieces.city}, ${S}, USA`);
  }
  if (pieces.street && pieces.city && (pieces.state||st)) {
    const S = pieces.state || st!;
    c.push(`${pieces.street}, ${pieces.city}, ${S}`, `${pieces.street}, ${pieces.city}, ${S}, USA`);
  }
  if (l.name && (pieces.state||st)) {
    const S = pieces.state || st!;
    c.push(`${l.name}, ${S}`, `${l.name}, ${S}, USA`);
  }
  c.push(`${pieces.s}, USA`);
  const seen = new Set<string>();
  return c.map(x=>x.replace(/\s+/g,' ').trim()).filter(x=>x && !seen.has(x) && seen.add(x));
}

async function sleep(ms:number){ return new Promise(r=>setTimeout(r,ms)); }

(async ()=>{
  if (!existsSync('data/locations.json')) {
    console.error('data/locations.json not found. Run the full scrape first.');
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync('data/locations.json','utf-8'));
  const locs: Loc[] = raw.locations || [];
  const pending = locs.filter(l => l.lat==null || l.lng==null);
  console.log(`Quick mode: ${locs.length} total; ${pending.length} missing lat/lng`);

  let success=0, fail=0, i=0;
  for (const loc of pending) {
    i++;
    const candidates = buildCandidates(loc);
    let hit: {lat:number; lng:number} | null = null;
    for (const q of candidates) {
      hit = await geocodeAddress(q);
      if (hit) {
        loc.lat = hit.lat; loc.lng = hit.lng; success++;
        console.log(`✓ [${i}/${pending.length}] ${loc.name} -> (${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}) | ${q}`);
        break;
      } else {
        console.warn(`… retry with: ${q}`);
      }
      await sleep(850);
    }
    if (!hit) { fail++; console.warn(`× ${loc.name} (tried ${candidates.length})`); }
    if (i % 25 === 0) {
      // periodic save
      mkdirSync('data',{recursive:true});
      writeFileSync('data/locations.json', JSON.stringify({...raw, locations: locs}, null, 2));
      console.log(`Saved progress @ ${i}/${pending.length}`);
    }
  }
  // final save
  mkdirSync('data',{recursive:true});
  writeFileSync('data/locations.json', JSON.stringify({...raw, locations: locs}, null, 2));
  console.log(`Quick done. Geocoded: ${success}, failed: ${fail}`);
})();
