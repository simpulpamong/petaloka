/**
 * prepare-geojson.mts — Pipeline data GeoJSON ke folder public/data.
 *
 * Sumber  : public/data/kecamatan.geojson / public/data/kelurahan.geojson / public/data/ponorogo.geojson
 * Keluaran: public/data/regions-kecamatan.geojson (ringan)
 *           public/data/regions-kelurahan.geojson (disederhanakan, siap peta & cetak)
 *           public/data/regions-kabupaten.geojson (batas luar kabupaten)
 *
 * Properti dinormalisasi agar komponen tidak tergantung nama kolom mentah:
 *   { id, code, name, type, districtCode, districtName }
 *
 * Jalankan: npm run prep:geojson [-- --full]   (--full = geometri tanpa simplifikasi)
 */

import fs from 'node:fs';
import path from 'node:path';
import type { Feature, FeatureCollection, Geometry, Position } from 'geojson';

type SourceProperties = Record<string, unknown>;
type RegionProperties = {
  id: string;
  code: string;
  name: string;
  type: 'kabupaten' | 'kecamatan' | 'kelurahan';
  districtCode: string | null;
  districtName: string | null;
};
type SourceCollection = FeatureCollection<Geometry, SourceProperties>;
type RegionCollection = FeatureCollection<Geometry, RegionProperties>;

const ROOT = path.resolve(import.meta.dirname, '..');
const SRC_DIR = path.join(ROOT, 'public', 'data');
const OUT_DIR = SRC_DIR;

/* ------------------------------------------------------------------------ */
/* Douglas–Peucker untuk ring (array [lon, lat])                             */
/* ------------------------------------------------------------------------ */

/** Jarak titik ke segmen (proyeksi) dalam derajat. */
function pointSegmentDistance(p: Position, a: Position, b: Position): number {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx === 0 && dy === 0) {
    const ddx = px - ax;
    const ddy = py - ay;
    return Math.sqrt(ddx * ddx + ddy * ddy);
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const cpx = ax + t * dx;
  const cpy = ay + t * dy;
  const ddx = px - cpx;
  const ddy = py - cpy;
  return Math.sqrt(ddx * ddx + ddy * ddy);
}

function douglasPeucker(
  points: Position[],
  tolerance: number,
  start = 0,
  end = points.length - 1,
  keep = new Set<number>(),
): Set<number> {
  if (end <= start + 1) return keep;
  keep.add(start);
  keep.add(end);
  let maxDist = -1;
  let index = -1;
  for (let i = start + 1; i < end; i++) {
    const dist = pointSegmentDistance(points[i], points[start], points[end]);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }
  if (maxDist > tolerance && index > 0) {
    douglasPeucker(points, tolerance, start, index, keep);
    douglasPeucker(points, tolerance, index, end, keep);
  }
  return keep;
}

function simplifyRing(ring: Position[], tolerance: number): Position[] {
  if (ring.length < 4 || tolerance <= 0) return ring;
  const keep = douglasPeucker(ring, tolerance);
  const out = [...keep].sort((a, b) => a - b).map((i) => ring[i]);
  // pastikan ring tetap tertutup
  if (out.length < 4) return ring;
  const first = out[0];
  const last = out[out.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) out.push([first[0], first[1]]);
  return out;
}

function simplifyGeometry(geom: Geometry, tolerance: number): Geometry {
  if (geom.type === 'Polygon') {
    return { ...geom, coordinates: geom.coordinates.map((ring) => simplifyRing(ring, tolerance)) };
  }
  if (geom.type === 'MultiPolygon') {
    return {
      ...geom,
      coordinates: geom.coordinates.map((poly) => poly.map((ring) => simplifyRing(ring, tolerance))),
    };
  }
  return geom;
}

/* ------------------------------------------------------------------------ */
/* Perataan & ukuran                                                         */
/* ------------------------------------------------------------------------ */

function compact(collection: FeatureCollection<Geometry, RegionProperties>): RegionCollection {
  return {
    type: 'FeatureCollection',
    features: collection.features.map((f) => ({
      type: 'Feature',
      properties: {
        id: f.properties.id,
        code: f.properties.code,
        name: f.properties.name,
        type: f.properties.type,
        districtCode: f.properties.districtCode ?? null,
        districtName: f.properties.districtName ?? null,
      },
      geometry: f.geometry,
    })),
  };
}

function writeOut<P extends object>(name: string, data: FeatureCollection<Geometry, P>): void {
  const target = path.join(OUT_DIR, name);
  fs.writeFileSync(target, JSON.stringify(data));
  const kb = (fs.statSync(target).size / 1024).toFixed(0);
  console.log(`✔ ${name} — ${(data.features || []).length} fitur, ${kb} KB`);
}

/* ------------------------------------------------------------------------ */
/* Eksekusi                                                                  */
/* ------------------------------------------------------------------------ */

fs.mkdirSync(OUT_DIR, { recursive: true });

/* --- Kabupaten (batas luar) --- */
const rawKabupaten = JSON.parse(
  fs.readFileSync(path.join(SRC_DIR, 'ponorogo.geojson'), 'utf8'),
) as SourceCollection;
const kabupaten = compact({
  ...rawKabupaten,
  features: rawKabupaten.features.map((f) => ({
    ...f,
    properties: {
      id: 'kabupaten:35.02',
      code: '35.02',
      name: String(f.properties?.nm_dati2 || 'Kabupaten Ponorogo'),
      type: 'kabupaten',
      districtCode: null,
      districtName: null,
    },
  })),
});
writeOut('regions-kabupaten.geojson', simplifyCollection(kabupaten, 0.0009));

/* --- Kecamatan --- */
const rawKec = JSON.parse(
  fs.readFileSync(path.join(SRC_DIR, 'kecamatan.geojson'), 'utf8'),
) as SourceCollection;
const kecamatan = {
  ...rawKec,
  features: rawKec.features.map((f) => {
    const p = f.properties || {};
    return {
      ...f,
      properties: {
        id: `kecamatan:${String(p.kd_kecamatan)}`,
        code: String(p.kd_kecamatan),
        name: String(p.nm_kecamatan ?? ''),
        type: 'kecamatan',
        districtCode: null,
        districtName: null,
      },
    };
  }),
};
writeOut('regions-kecamatan.geojson', simplifyCollection(kecamatan, 0.0002));
writeOut('regions-kecamatan-full.geojson', kecamatan);

/* --- Kelurahan / Desa --- */
const rawDesa = JSON.parse(
  fs.readFileSync(path.join(SRC_DIR, 'kelurahan.geojson'), 'utf8'),
) as SourceCollection;
const kelurahan: RegionCollection = {
  ...rawDesa,
  features: rawDesa.features.map((f) => {
    const p = f.properties || {};
    const kecCode = String(p.kd_kecamatan);
    return {
      ...f,
      properties: {
        id: `kelurahan:${kecCode}-${p.kd_kelurahan}`,
        code: String(p.kd_kelurahan),
        name: String(p.nm_kelurahan ?? ''),
        type: 'kelurahan',
        districtCode: kecCode,
        districtName: null, // diisi ulang di bawah dari daftar kecamatan
      },
    };
  }),
};
const kecNameByCode = new Map(kecamatan.features.map((f) => [f.properties.code, f.properties.name]));
for (const f of kelurahan.features) {
  const p = f.properties;
  p.districtName = kecNameByCode.get(p.districtCode ?? '') || p.districtCode;
}
writeOut('regions-kelurahan.geojson', simplifyCollection(kelurahan, 0.00022));
writeOut('regions-kelurahan-full.geojson', kelurahan);

function simplifyCollection<P extends object>(
  collection: FeatureCollection<Geometry, P>,
  tolerance: number,
): FeatureCollection<Geometry, P> {
  return {
    ...collection,
    features: collection.features
      .filter((f): f is Feature<Geometry, P> & { geometry: Geometry } => f.geometry !== null)
      .map((f) => ({ ...f, geometry: simplifyGeometry(f.geometry, tolerance) })),
  };
}

