import { NextResponse } from "next/server";
import { z } from "zod";
import { SEED } from "@/data/locations";
import { distanceKm } from "@/lib/geo";

const Query = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  radiusKm: z.coerce.number().default(100),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = Query.safeParse({
    lat: url.searchParams.get("lat"),
    lng: url.searchParams.get("lng"),
    radiusKm: url.searchParams.get("radiusKm") ?? "100",
  });
  if (!parsed.success) return NextResponse.json({ error: "bad params" }, { status: 400 });

  const { lat, lng, radiusKm } = parsed.data;
  const here = { lat, lng };

  const results = SEED
    .map(l => ({ ...l, distanceKm: distanceKm(here, { lat: l.lat, lng: l.lng }) }))
    .filter(l => l.distanceKm <= radiusKm)
    .sort((a,b)=>a.distanceKm-b.distanceKm);

  return NextResponse.json({ results });
}
