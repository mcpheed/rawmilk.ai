ALTER TABLE sources ADD COLUMN IF NOT EXISTS promoted boolean DEFAULT false;
-- Optional but helpful to reduce dupes by exact site:
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'places_website_uq') THEN
    CREATE UNIQUE INDEX places_website_uq ON places(website);
  END IF;
END $$;
