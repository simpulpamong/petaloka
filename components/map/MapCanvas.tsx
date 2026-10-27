'use client';

/**
 * MapCanvas — peta interaktif react-leaflet.
 *
 * - Choropleth kecamatan / desa berdasarkan skor kategori aktif (update style
 *   secara imperatif agar 307+ poligon tidak re-render suka-suka).
 * - Overlay batas kabupaten & kecamatan, label, tooltip hover, klik wilayah.
 * - moveend → menyimpan bounds/zoom yang dipakai renderer cetak.
 */

import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { CirclePlus, CircleMinus, Crosshair, Loader2, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { MapContainer, useMap, useMapEvents } from 'react-leaflet';

import { baseLayerOption } from '@/lib/defaults';
import {
  labelAnchorOfFeature,
  colorForScore,
  leafletBoundsOf,
} from '@/lib/geo';
import { useApp } from '@/lib/store';
import type { Bounds, RegionFeature } from '@/lib/types';

export default function MapCanvas() {
  const app = useApp();
  const { geo, view } = app;
  const mapRef = useRef<L.Map | null>(null);

  const kecamatanFeatures = useMemo(
    () => (geo.kecamatan ? (geo.kecamatan.features as RegionFeature[]) : []),
    [geo.kecamatan],
  );
  const kelurahanFeatures = useMemo(
    () => (geo.kelurahan ? (geo.kelurahan.features as RegionFeature[]) : []),
    [geo.kelurahan],
  );
  const kabupatenFeature = useMemo(
    () => (geo.kabupaten ? (geo.kabupaten.features[0] as RegionFeature) : null),
    [geo.kabupaten],
  );
  const focusedDistrict = view.mode === 'desa' ? view.selectedKecamatanCode : null;
  const visibleDistrictFeatures = useMemo(
    () => focusedDistrict
      ? kecamatanFeatures.filter((feature) => feature.properties.code === focusedDistrict)
      : kecamatanFeatures,
    [focusedDistrict, kecamatanFeatures],
  );
  const visibleVillageFeatures = useMemo(
    () => focusedDistrict
      ? kelurahanFeatures.filter((feature) => feature.properties.districtCode === focusedDistrict)
      : kelurahanFeatures,
    [focusedDistrict, kelurahanFeatures],
  );
  const visibleMapFeatures = view.mode === 'desa' ? visibleVillageFeatures : kecamatanFeatures;
  const selectedFeature = useMemo(
    () => [...visibleMapFeatures, ...visibleDistrictFeatures].find((feature) => feature.properties.id === app.selectedRegionId) ?? null,
    [app.selectedRegionId, visibleDistrictFeatures, visibleMapFeatures],
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[-7.867, 111.47]}
        zoom={10}
        minZoom={9}
        maxZoom={19}
        zoomControl={false}
        attributionControl
        ref={(map) => {
          mapRef.current = map ?? null;
        }}
        className="h-full w-full"
      >
        <TileLayerAutoplay />

        {kabupatenFeature && !focusedDistrict ? (
          <BoundaryGeoJSON feature={kabupatenFeature} />
        ) : null}

        <ChoroplethLayer
          features={visibleMapFeatures}
          strokeWeight={view.mode === 'desa' ? 0.45 : 0.8}
        />

        {view.mode === 'desa' && visibleDistrictFeatures.length ? (
          <DistrictOverlay features={visibleDistrictFeatures} />
        ) : null}

        {selectedFeature ? <SelectedRegionOutline feature={selectedFeature} /> : null}

        {view.labels ? <DistrictLabels features={visibleDistrictFeatures} /> : null}

        <ZoomWatcher />
        <FitController
          features={visibleMapFeatures}
          selectedKecamatanCode={view.mode === 'desa' ? view.selectedKecamatanCode : null}
          mode={view.mode}
          geoReady={geo.loading === false && kecamatanFeatures.length > 0}
        />
      </MapContainer>

      {/* Overlay kontrol kiri atas */}
      <TopLeftOverlay app={app} />

      {/* Kontrol zoom kanan atas */}
      <div className="absolute right-3 top-3 z-[500] flex flex-col gap-1.5">
        <MapButton
          onClick={() => mapRef.current?.zoomIn()}
          label="Perbesar"
          icon={<CirclePlus size={16} />}
        />
        <MapButton
          onClick={() => mapRef.current?.zoomOut()}
          label="Perkecil"
          icon={<CircleMinus size={16} />}
        />
        <MapButton
          onClick={() => {
            const features = view.mode === 'desa' ? kelurahanFeatures : kecamatanFeatures;
            const bounds = leafletBoundsOf(features);
            if (bounds && mapRef.current) mapRef.current.fitBounds(bounds, { padding: [24, 24] });
          }}
          label="Pas wilayah"
          icon={<Crosshair size={16} />}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-komponen internal                                                       */
/* -------------------------------------------------------------------------- */

function MapButton({
  onClick,
  label,
  icon,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={clsx(
        'flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white/95 text-slate-700 shadow-sm backdrop-blur transition',
        'hover:bg-slate-50 hover:text-slate-900',
      )}
    >
      {icon}
    </button>
  );
}

function TileLayerAutoplay() {
  const { view, toast } = useApp();
  const map = useMap();
  const option = baseLayerOption(view.baseLayer);
  useEffect(() => {
    let cancelled = false;
    let layer: L.TileLayer | null = null;
    let attribution = '';

    void (async () => {
      try {
        if (!option.url) throw new Error('URL tile basemap belum tersedia.');
        const source = { url: option.url, attribution: option.attribution };
        if (cancelled) return;
        attribution = source.attribution;
        layer = L.tileLayer(source.url, {
          attribution,
          maxZoom: option.maxZoom,
          maxNativeZoom: option.maxZoom,
          tileSize: 256,
          subdomains: option.subdomains ?? 'abc',
          crossOrigin: true,
        });
        layer.addTo(map);
        map.attributionControl?.addAttribution(attribution);
      } catch (error) {
        if (!cancelled) {
          toast({
            type: 'error',
            title: `Basemap ${option.label} tidak dapat dimuat`,
            description: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (layer) map.removeLayer(layer);
      if (attribution) map.attributionControl?.removeAttribution(attribution);
    };
  }, [map, option.id, option.attribution, option.maxZoom, toast]);

  return null;
}

/** Batas kabupaten: hitam solid dan paling tebal. */
function BoundaryGeoJSON({ feature }: { feature: RegionFeature }) {
  const map = useMap();
  useEffect(() => {
    const layer = L.geoJSON(feature as never, {
      style: () => ({
        color: '#111111',
        weight: 1.4,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
        fill: false,
        interactive: false,
      }),
    });
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [feature, map]);
  return null;
}

/** Garis kecamatan di atas batas desa, dengan bobot yang tetap halus. */
function DistrictOverlay({ features }: { features: RegionFeature[] }) {
  const map = useMap();
  const key = useMemo(() => features.map((f) => f.properties.id).join(','), [features]);

  useEffect(() => {
    const layer = L.geoJSON(
      { type: 'FeatureCollection', features } as never,
      {
        style: () => ({
          color: '#111111',
          weight: 0.95,
          opacity: 1,
          lineCap: 'round',
          lineJoin: 'round',
          fill: false,
          interactive: false,
        }),
      },
    );
    layer.addTo(map);
    return () => {
      layer.remove();
    };
  }, [key, features, map]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/** Outline seleksi dirender paling atas agar selalu jelas mengikuti geometri asli. */
function SelectedRegionOutline({ feature }: { feature: RegionFeature }) {
  const map = useMap();

  useEffect(() => {
    const outline = L.geoJSON(feature as never, {
      style: () => ({
        color: '#2563eb',
        weight: 3,
        opacity: 1,
        lineCap: 'round',
        lineJoin: 'round',
        fill: false,
        interactive: false,
      }),
      interactive: false,
    });
    outline.addTo(map);
    outline.bringToFront();
    return () => {
      outline.remove();
    };
  }, [feature, map]);

  return null;
}

/** Label kecamatan selalu berpusat di titik interior dan tetap tampak saat zoom-out. */
function DistrictLabels({ features }: { features: RegionFeature[] }) {
  const map = useMap();
  const key = useMemo(() => features.map((f) => f.properties.id).join('|'), [features]);

  useEffect(() => {
    const group = L.layerGroup();
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return;
    context.font = '600 11px Inter,system-ui,sans-serif';

    for (const feature of features) {
      const { coordinate } = labelAnchorOfFeature(feature);
      const [lon, lat] = coordinate;
      const width = Math.ceil(context.measureText(feature.properties.name).width + 4);
      const height = 18;
      group.addLayer(
        L.marker([lat, lon], {
          interactive: false,
          icon: L.divIcon({
            className: 'district-label-marker',
            html: `<span style="display:block;width:${width}px;height:${height}px;font:600 11px/18px Inter,system-ui,sans-serif;color:#0f172a;text-align:center;text-shadow:-1.5px -1.5px 0 #fff,1.5px -1.5px 0 #fff,-1.5px 1.5px 0 #fff,1.5px 1.5px 0 #fff,0 0 4px #fff;white-space:nowrap">${escapeHtml(
              feature.properties.name,
            )}</span>`,
            iconSize: [width, height],
            iconAnchor: [width / 2, height / 2],
          }),
        }),
      );
    }

    group.addTo(map);
    return () => {
      group.remove();
    };
  }, [key, features, map]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Choropleth utama — L.geoJSON imperatif, style di-update in-place setiap
 * skor/kategori berubah (tanpa rip penuh layer).
 */
function ChoroplethLayer({
  features,
  strokeWeight,
}: {
  features: RegionFeature[];
  strokeWeight: number;
}) {
  const app = useApp();
  const map = useMap();
  const layerRef = useRef<L.GeoJSON | null>(null);
  const styleStateRef = useRef({ activeCategory: app.activeCategory, scores: app.scores });
  styleStateRef.current = { activeCategory: app.activeCategory, scores: app.scores };
  const fc = useMemo(
    () => ({ type: 'FeatureCollection', features }) as never,
    [features],
  );
  const dataKey = useMemo(() => features.map((f) => f.properties.id).join(','), [features]);

  const featureStyle = (props: RegionFeature['properties'], hovered = false): L.PathOptions => {
    const { activeCategory, scores } = styleStateRef.current;
    const record = activeCategory ? scores[`${activeCategory.id}::${props.id}`] : undefined;
    return {
      fillColor: colorForScore(activeCategory, record?.score ?? null),
      fillOpacity: hovered
        ? Math.min(0.92, activeCategory ? 0.78 : 0.5)
        : activeCategory
          ? 0.62
          : 0.45,
      color: '#111111',
      weight: hovered ? Math.min(1.3, strokeWeight + 0.4) : strokeWeight,
      opacity: 1,
      lineCap: 'round',
      lineJoin: 'round',
    };
  };

  useEffect(() => {
    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }

    const highlight = (target: L.Path, on: boolean) => {
      const props = (target as unknown as { feature?: RegionFeature }).feature?.properties;
      if (props) target.setStyle(featureStyle(props, on));
      if (on) target.bringToFront();
    };

    const layer = L.geoJSON(fc, {
      style: (feature) => {
        const props = feature?.properties as RegionFeature['properties'];
        return featureStyle(props);
      },
      onEachFeature: (feature, target) => {
        const props = (feature as RegionFeature).properties;
        target.on('click', () => {
          app.selectRegion(props.id);
          if (props.type === 'kecamatan') {
            app.updateView({ selectedKecamatanCode: props.code });
          }
        });
        target.on('mouseover', () => highlight(target as L.Path, true));
        target.on('mouseout', () => highlight(target as L.Path, false));
        target.bindTooltip(
          `<b>${escapeHtml(props.name)}</b><br/><span style="color:#94a3b8">${
            props.type === 'kelurahan' ? `Kec. ${escapeHtml(props.districtName ?? '')}` : 'Kecamatan'
          }</span>`,
          { sticky: true, className: 'map-hover-tooltip', direction: 'top', offset: [0, -6] },
        );
      },
    });

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      layer.remove();
      layerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fc, dataKey]);

  /* Update style in-place ketika skor/kategori berubah */
  const styleVersion = useMemo(() => {
    const cat = app.activeCategory;
    if (!cat) return `${app.activeCategoryId}::`;
    return `${app.activeCategoryId}::${Object.entries(app.scores)
      .filter(([key]) => key.startsWith(`${cat.id}::`))
      .map(([key, value]) => `${key}=${value.score}`)
      .sort()
      .join(';')}`;
  }, [app.activeCategoryId, app.activeCategory, app.scores]);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.eachLayer((child) => {
      const feature = (child as L.GeoJSON as unknown as { feature?: RegionFeature }).feature;
      const props = feature?.properties;
      if (!props) return;
      (child as L.Path).setStyle(featureStyle(props));
    });
  }, [styleVersion, strokeWeight, app.activeCategory]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

/** Menyimpan bounds/zoom/center untuk renderer cetak. */
function ZoomWatcher() {
  const app = useApp();
  useMapEvents({
    moveend: (event) => {
      const map = event.target as L.Map;
      const bounds = map.getBounds();
      app.setMapInfo({
        bounds: [
          [bounds.getSouth(), bounds.getWest()],
          [bounds.getNorth(), bounds.getEast()],
        ] as Bounds,
        zoom: map.getZoom(),
        center: [map.getCenter().lat, map.getCenter().lng],
      });
    },
  });
  return null;
}

/** Fit bounds saat mode/kecamatan/ganti data. */
function FitController({
  features,
  selectedKecamatanCode,
  mode,
  geoReady,
}: {
  features: RegionFeature[];
  selectedKecamatanCode: string | null;
  mode: string;
  geoReady: boolean;
}) {
  const map = useMap();
  const firstFit = useRef(false);

  useEffect(() => {
    if (!geoReady) return;
    if (!firstFit.current) {
      firstFit.current = true;
      const bounds = leafletBoundsOf(features);
      if (bounds) map.fitBounds(bounds, { padding: [30, 30] });
      return;
    }
    const target = selectedKecamatanCode
      ? features.filter((f) => f.properties.districtCode === selectedKecamatanCode)
      : features;
    const bounds = leafletBoundsOf(target);
    if (bounds) map.fitBounds(bounds, { padding: [30, 30] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoReady, mode, selectedKecamatanCode]);

  return null;
}

/* -------------------------------------------------------------------------- */
/* Overlay kiri atas: status online, nama wilayah hall, indikator data         */
/* -------------------------------------------------------------------------- */

function TopLeftOverlay({ app }: { app: ReturnType<typeof useApp> }) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  return (
    <div className="absolute left-3 top-3 z-[500] flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-card backdrop-blur">
        {online ? (
          <Wifi size={14} className="text-emerald-500" />
        ) : (
          <WifiOff size={14} className="text-amber-500" />
        )}
        <span className="text-[11px] font-semibold text-slate-700">
          {online ? 'Daring' : 'Luring'}
        </span>
      </div>

      {app.geo.loading ? (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-card backdrop-blur">
          <Loader2 size={14} className="animate-spin text-brand-500" />
          <span className="text-[11px] font-medium text-slate-600">Memuat geometri wilayah…</span>
        </div>
      ) : null}
    </div>
  );
}
