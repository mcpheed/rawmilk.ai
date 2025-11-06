CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- places: canonical, deduped entities
CREATE TABLE IF NOT EXISTS places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('farm','market','co-op','retail','other')),
  phone TEXT,
  email TEXT,
  website TEXT,
  addr_original TEXT,
  addr_norm JSONB,
  country TEXT,
  state TEXT,
  city TEXT,
  postcode TEXT,
  geom GEOGRAPHY(POINT,4326),
  confidence REAL NOT NULL DEFAULT 0,
  features JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sources: raw observations from serp/crawlers/osm/state
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id UUID REFERENCES places(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL,
  source_name TEXT,
  url TEXT,
  title TEXT,
  snippet TEXT,
  phone TEXT,
  website TEXT,
  addr TEXT,
  addr_norm JSONB,
  city TEXT, state TEXT, postcode TEXT, country TEXT,
  geom GEOGRAPHY(POINT,4326),
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw JSONB
);

CREATE INDEX IF NOT EXISTS idx_places_geom ON places USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_places_name_trgm ON places USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sources_geom ON sources USING GIST (geom);
