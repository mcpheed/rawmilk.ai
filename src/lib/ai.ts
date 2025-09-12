import dotenv from 'dotenv';
dotenv.config();

import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY || '';
let client: OpenAI | null = null;
if (apiKey) client = new OpenAI({ apiKey });

export type ExtractedLoc = {
  address?: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
};

/**
 * Try to extract a location from free-text using OpenAI.
 * Returns null if no key or if extraction fails.
 */
export async function extractLocationFromText(text: string): Promise<ExtractedLoc | null> {
  if (!client) return null;

  const sys = `You extract a user's intended search location from free text.
Return STRICT JSON with this shape:
{"address": string|null, "city": string|null, "state": string|null, "lat": number|null, "lng": number|null}

Rules:
- If the text includes a coordinate pair, set lat/lng and leave address null.
- If it's a US place, include city and 2-letter state if obvious.
- If it's a ZIP, include state if obvious, address=null, city=null.
- If you are unsure, produce the most helpful partial (e.g., just "city" or just "state").
- NO prose. JSON only.
`;

  const user = `text: ${text}`;

  try {
    const resp = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user }
      ]
    });

    const raw = resp.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(raw);

    const out: ExtractedLoc = {};
    if (typeof parsed.address === 'string' && parsed.address.trim()) out.address = parsed.address.trim();
    if (typeof parsed.city === 'string' && parsed.city.trim()) out.city = parsed.city.trim();
    if (typeof parsed.state === 'string' && parsed.state.trim()) out.state = parsed.state.trim().toUpperCase();
    if (typeof parsed.lat === 'number') out.lat = parsed.lat;
    if (typeof parsed.lng === 'number') out.lng = parsed.lng;

    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}
