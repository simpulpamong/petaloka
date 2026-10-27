'use client';

/**
 * Pemanggil dynamic import peta — WAJIB `ssr: false` karena Leaflet memakai
 * `window` pada tingkat modul (aman untuk Next App Router).
 */

import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui';

const MapCanvas = dynamic(() => import('./MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <Spinner className="h-6 w-6" />
        <p className="text-xs font-medium">Memuat peta…</p>
      </div>
    </div>
  ),
});

export function MapClient() {
  return <MapCanvas />;
}
