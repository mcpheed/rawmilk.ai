"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

// Load Map client-only to avoid SSR hiccups
const Map = dynamic(() => import("@/components/Map"), { ssr: false });

type Result = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  verified: boolean;
  distanceKm: number;
  website?: string;
};

export default function Home() {
  const [center, setCenter] = useState<[number, number]>([42.36, -71.06]);
  const [items, setItems] = useState<Result[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  async function geocode(place: string) {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`,
      { headers: { "User-Agent": "rawmilk.ai demo" } }
    );
    const j = await r.json();
    if (!j?.length) throw new Error("location not found");
    return { lat: parseFloat(j[0].lat), lng: parseFloat(j[0].lon) };
  }

  async function search() {
    try {
      setBusy(true);
      const { lat, lng } = await geocode(q);
      setCenter([lat, lng]);
      const r = await fetch(`/api/locations?lat=${lat}&lng=${lng}&radiusKm=200`);
      const j = await r.json();
      setItems(j.results ?? []);
    } catch (e: any) {
      alert(e.message || "search failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">rawmilk.ai</h1>
        <p className="text-sm opacity-80">
          Find nearby raw milk sources. Always verify legality & safety in your area.
        </p>
      </header>

      <div className="flex gap-2">
        <input
          className="flex-1 border rounded-xl px-4 py-2"
          placeholder="City, ZIP, or address"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
        <button className="border rounded-xl px-4 py-2" disabled={busy} onClick={search}>
          {busy ? "Searching..." : "Search"}
        </button>
      </div>

      <Map center={center} items={items} />

      <footer className="text-xs opacity-60">
        Disclaimer: Information may be inaccurate or illegal in your jurisdiction. Use at your own risk.
      </footer>
    </main>
  );
}
