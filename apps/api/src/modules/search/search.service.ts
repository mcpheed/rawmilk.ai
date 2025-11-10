import { Injectable } from '@nestjs/common';
import { pool } from '../../common/db';
import { SearchQueryDto } from './search.dto';

@Injectable()
export class SearchService {
  async searchNearby(q: SearchQueryDto) {
    const { lat, lng, radius_km = 75, min_conf = 0.55, limit = 20, offset = 0 } = q;

    const client = await pool.connect();
    try {
      const sql = `
        SELECT id, name, kind, phone, website, city, state, postcode, confidence,
               ST_X(ST_AsText(geom::geometry)) AS lng,
               ST_Y(ST_AsText(geom::geometry)) AS lat,
               ST_Distance(geom, ST_MakePoint($1, $2)::geography) AS meters
        FROM places
        WHERE confidence >= $3
          AND ($4 <= 0 OR ST_DWithin(geom, ST_MakePoint($1, $2)::geography, $4*1000))
        ORDER BY geom <-> ST_MakePoint($1, $2)::geography, confidence DESC
        LIMIT $5 OFFSET $6;
      `;
      const params = [lng, lat, min_conf, radius_km, limit, offset];
      const { rows } = await client.query(sql, params);

      return {
        query: { lat, lng, radius_km, min_conf, limit, offset },
        count: rows.length,
        results: rows.map(r => ({
          id: r.id,
          name: r.name,
          kind: r.kind,
          phone: r.phone,
          website: r.website,
          address: [r.city, r.state, r.postcode].filter(Boolean).join(', '),
          location: { lat: Number(r.lat), lng: Number(r.lng) },
          distance_m: Math.round(Number(r.meters)),
          confidence: Number(r.confidence)
        })),
      };
    } finally {
      client.release();
    }
  }
}
