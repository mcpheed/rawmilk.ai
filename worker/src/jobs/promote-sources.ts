import "../common/env";
import { pool } from "../common/db";
import { parse } from "node:url";

function titleToName(title?: string|null) {
  if (!title) return null;
  // Simple cleanup: strip separators/site-name tails
  return title.replace(/\s*[\|\-–—]\s*.*$/, "").trim();
}

function urlHost(url: string) {
  try { return parse(url).host ?? null; } catch { return null; }
}

(async () => {
  const client = await pool.connect();
  try {
    // 1) Take recent SERP rows that aren’t yet promoted
    const { rows: srcs } = await client.query(`
      WITH latest AS (
        SELECT s.*
        FROM sources s
        WHERE s.source_type = 'serp'
          AND s.source_name = 'google'
          AND s.promoted IS DISTINCT FROM true
        ORDER BY s.fetched_at DESC
        LIMIT 500
      )
      SELECT * FROM latest;
    `);

    let inserted = 0, skipped = 0, updated = 0;

    for (const r of srcs) {
      const nameGuess = titleToName(r.title) ?? urlHost(r.url) ?? 'Unknown';
      // Insert or bump an existing place that shares same website (normalized)
      // Minimal fields for MVP; enrich later
      const q = `
        INSERT INTO places (name, kind, phone, website, addr_original, city, state, postcode,
                            geom, features, confidence, source_count)
        VALUES ($1, 'unknown', NULL, $2, NULL, NULL, NULL, NULL,
                COALESCE($3, ST_SetSRID(ST_MakePoint(-71.06,42.36),4326)::geography),
                jsonb_build_object('seed','serp','domain',$4),
                0.58, 1)
        ON CONFLICT (website) DO UPDATE
        SET source_count = places.source_count + 1,
            confidence   = GREATEST(places.confidence, 0.60),
            features     = places.features || jsonb_build_object('touch', now())
        RETURNING (xmax = 0) AS inserted_flag;
      `;
      const host = urlHost(r.url);
      const res = await client.query(q, [nameGuess, r.url, r.geom ?? null, host]);
      if (res.rows[0]?.inserted_flag) inserted++; else updated++;

      // mark promoted
      await client.query(`UPDATE sources SET promoted = true WHERE id = $1`, [r.id]);
    }

    console.log(`Promote done: inserted=${inserted} updated=${updated} skipped=${skipped}`);
  } finally {
    client.release();
    await pool.end();
  }
})();
