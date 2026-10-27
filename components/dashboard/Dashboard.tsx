'use client';

/**
 * Dashboard — kerangka utama: sidebar kontrol + peta + dialog-dialog.
 */

import { useEffect, useState } from 'react';

import { CategoryDialog } from './CategoryDialog';
import { PrintDialog } from './PrintDialog';
import { RegionInspector } from './RegionInspector';
import { SettingsDialog } from './SettingsDialog';
import { Sidebar } from './Sidebar';
import { MapClient } from '@/components/map/MapClient';
import { useApp } from '@/lib/store';

export function Dashboard() {
  const app = useApp();
  const [printOpen, setPrintOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [categoryEditingId, setCategoryEditingId] = useState<string | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('petaloka-sidebar-collapsed');
      setSidebarCollapsed(saved === null ? !window.matchMedia('(min-width: 640px)').matches : saved === 'true');
    } catch {
      setSidebarCollapsed(!window.matchMedia('(min-width: 640px)').matches);
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem('petaloka-sidebar-collapsed', String(next));
      } catch {
        // Status sidebar tetap berubah meski penyimpanan browser diblokir.
      }
      return next;
    });
  };

  if (!app.ready) return <SplashScreen />;

  return (
    <div className="relative flex h-dvh overflow-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
        onOpenPrint={() => setPrintOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenCategoryEditor={(id) => {
          setCategoryEditingId(id);
          setCategoryOpen(true);
        }}
      />

      <main className="relative min-w-0 flex-1">
        <MapClient />
        <RegionInspector />
      </main>

      <PrintDialog open={printOpen} onClose={() => setPrintOpen(false)} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <CategoryDialog
        open={categoryOpen}
        onClose={() => setCategoryOpen(false)}
        editingId={categoryEditingId}
      />
    </div>
  );
}

function SplashScreen() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex h-screen w-full flex-col items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-50 to-slate-100"
    >
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div aria-hidden="true" className="absolute inset-0 animate-spin rounded-full border-[3px] border-slate-200 border-t-brand-600" />
        <div aria-hidden="true" className="absolute inset-[7px] rounded-full border border-slate-200/70 bg-white/80" />
        <img src="/icons/favicon-192.png" alt="" className="relative h-12 w-12 object-contain" />
      </div>
      <div className="mt-5 text-center">
        <p className="text-xl font-bold tracking-tight text-slate-900">PetaLoka</p>
        <p className="mt-1 text-xs font-medium text-slate-500">Pemetaan Kerawanan Wilayah · Ponorogo</p>
        <p className="mt-3 text-[11px] text-slate-400">Memuat peta dan data wilayah…</p>
      </div>
    </div>
  );
}
