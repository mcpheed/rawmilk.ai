export type RawLocation = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  website?: string;
  verified: boolean;
  source?: "community" | "import";
};

export const SEED: RawLocation[] = [
  { id: "1", name: "Happy Valley Dairy", address: "123 Farm Rd, Boston MA", lat: 42.3601, lng: -71.0589, verified: true, source: "import", website: "https://example.com" },
  { id: "2", name: "Green Pastures Co-Op", address: "456 Country Ln, Cambridge MA", lat: 42.3736, lng: -71.1097, verified: false, source: "community" }
];
