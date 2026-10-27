'use client';

/**
 * Sidebar kontrol: pilih kategori, mode peta, basemap, filter kecamatan,
 * statistik skor, table penilaian desa, dan tombol aksi utama (cetak HD).
 */

import {
  Flame,
  CloudRain,
  Mountain,
  Droplets,
  Car,
  Zap,
  TriangleAlert,
  Factory,
  Building2,
  Landmark,
  Map as MapIcon,
  ShieldAlert,
  Cog,
  Plus,
  Printer,
  Eraser,
  Sparkles,
  ChartColumnIncreasing,
  ClipboardList,
  Layers,
  Map as MapViewIcon,
  ChevronLeft,
  ChevronRight,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';

import { Button, Card, Dropdown, ScrollArea, Segmented, Switch, ThemeToggle } from '@/components/ui';
import { BASE_LAYERS } from '@/lib/defaults';
import { useApp } from '@/lib/store';
import { RISK_SCORES, type RiskCategory } from '@/lib/types';

const ICONS: Record<string, LucideIcon> = {
  Flame,
  CloudRain,
  Mountain,
  Droplets,
  Car,
  Zap,
  TriangleAlert,
  Factory,
  Building2,
  Landmark,
  Map: MapIcon,
  ShieldAlert,
};

type RailFlyout = 'categories' | 'map' | 'statistics' | 'assessment';

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  onOpenPrint,
  onOpenSettings,
  onOpenCategoryEditor,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenPrint: () => void;
  onOpenSettings: () => void;
  onOpenCategoryEditor: (categoryId: string | null) => void;
}) {
  const app = useApp();
  const activeCategory = app.activeCategory;
  const sidebarRef = useRef<HTMLElement>(null);
  const [activeFlyout, setActiveFlyout] = useState<RailFlyout | null>(null);
  const [flyoutTop, setFlyoutTop] = useState(16);
  const [assessmentMode, setAssessmentMode] = useState<'kecamatan' | 'desa'>('kecamatan');
  const [assessmentDistrictCode, setAssessmentDistrictCode] = useState(app.view.selectedKecamatanCode ?? '');

  useEffect(() => {
    if (!assessmentDistrictCode && app.kecamatanList.length) {
      setAssessmentDistrictCode(app.kecamatanList[0].properties.code);
    }
  }, [assessmentDistrictCode, app.kecamatanList]);

  const toggleFlyout = (id: RailFlyout, event: MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const panelHeight = Math.min(window.innerHeight * 0.78, 620);
    setFlyoutTop(Math.max(12, Math.min(rect.top - 8, window.innerHeight - panelHeight - 12)));
    setActiveFlyout((current) => current === id ? null : id);
  };

  useEffect(() => {
    if (!collapsed) {
      setActiveFlyout(null);
      return;
    }
    if (!activeFlyout) return;

    const dismiss = (event: PointerEvent) => {
      if (!sidebarRef.current?.contains(event.target as Node)) setActiveFlyout(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveFlyout(null);
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [activeFlyout, collapsed]);

  return (
    <>
      {!collapsed ? (
        <button
          type="button"
          aria-label="Tutup sidebar"
          onClick={onToggleCollapsed}
          className="fixed inset-0 z-[550] bg-slate-950/35 backdrop-blur-[1px] sm:hidden"
        />
      ) : null}
      <aside ref={sidebarRef} className={`relative z-[600] flex h-dvh shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 ${collapsed ? 'w-[68px]' : 'w-[min(340px,calc(100vw-52px))] sm:w-[340px]'} ${collapsed ? '' : 'max-sm:absolute max-sm:inset-y-0 max-sm:left-0 max-sm:shadow-2xl'}`}>
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
        title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
        className="absolute -right-3.5 top-[27px] z-[650] rounded-full border border-slate-300 bg-white p-1 text-slate-600 shadow-lg transition-all duration-200 hover:scale-110 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50"
      >
        {collapsed ? <ChevronRight size={16} strokeWidth={2.5} /> : <ChevronLeft size={16} strokeWidth={2.5} />}
      </button>
      {collapsed ? (
        <ScrollArea className="h-full w-full">
          <div className="flex min-h-full flex-col items-center gap-2 px-2 py-3">
            <div className="flex h-10 w-10 items-center justify-center">
              <img src="/icons/favicon-192.png" alt="PetaLoka" className="h-8 w-8 object-contain" />
            </div>
            <div className="my-1 h-px w-9 bg-slate-200" />
            <RailButton Icon={Layers} label="Kategori peta" active={activeFlyout === 'categories'} onClick={(event) => toggleFlyout('categories', event)} />
            <RailButton Icon={MapViewIcon} label="Tampilan peta" active={activeFlyout === 'map'} onClick={(event) => toggleFlyout('map', event)} />
            <RailButton Icon={ChartColumnIncreasing} label="Statistik" active={activeFlyout === 'statistics'} onClick={(event) => toggleFlyout('statistics', event)} />
            <RailButton Icon={ClipboardList} label="Penilaian wilayah" active={activeFlyout === 'assessment'} onClick={(event) => toggleFlyout('assessment', event)} />
            <div className="my-1 h-px w-9 bg-slate-200" />
            <div className="flex flex-col gap-1">
              {app.categories.map((category) => {
                const Icon = ICONS[category.icon] ?? MapIcon;
                const active = category.id === app.activeCategoryId;
                return (
                  <button
                    key={category.id}
                    type="button"
                    title={category.name}
                    aria-label={`Pilih kategori ${category.name}`}
                    aria-pressed={active}
                    onClick={() => app.setActiveCategory(category.id)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${active ? 'border-brand-400 bg-brand-50 shadow-sm' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: `linear-gradient(135deg, ${category.palette[3]}, ${category.palette[4]})` }}>
                      <Icon size={15} />
                    </span>
                  </button>
                );
              })}
            </div>
            <RailButton Icon={Plus} label="Tambah kategori" onClick={() => onOpenCategoryEditor(null)} />
            <div className="mt-auto flex flex-col items-center gap-2 pt-4">
              <div className="my-1 h-px w-9 bg-slate-200" />
              <RailButton Icon={Printer} label="Cetak peta HD" onClick={onOpenPrint} />
              <ThemeToggle compact />
              <RailButton Icon={Cog} label="Pengaturan & backup" onClick={onOpenSettings} />
            </div>
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="flex h-full w-full flex-col">
      {/* ------------------------------------------------------------ Brand */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4">
        <img src="/icons/sidebar-logo.png" alt="PetaLoka" className="h-10 w-10 shrink-0 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold tracking-tight text-slate-900">PetaLoka</p>
          <p className="truncate text-[11px] text-slate-500">Pemetaan Kerawanan Wilayah · Ponorogo</p>
        </div>
        <ThemeToggle compact />
      </div>

      <div className="flex flex-col gap-3 p-3">
        {/* --------------------------------------------------- Kategori peta */}
        <Card
          id="sidebar-categories"
          title="Kategori Peta"
          action={
            <button
              onClick={() => onOpenCategoryEditor(null)}
              className="flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-100"
            >
              <Plus size={12} /> Baru
            </button>
          }
        >
          <div className="flex flex-col gap-1.5">
            {app.categories.map((category) => (
              <CategoryRow
                key={category.id}
                category={category}
                active={category.id === app.activeCategoryId}
                onClick={() => app.setActiveCategory(category.id)}
                onEdit={() => onOpenCategoryEditor(category.id)}
              />
            ))}
            {!app.categories.length ? (
              <p className="py-3 text-center text-xs text-slate-400">
                Belum ada kategori. Tambahkan kategori peta pertama Anda.
              </p>
            ) : null}
          </div>
        </Card>

        {/* -------------------------------------------------- Tampilan peta */}
        <div id="sidebar-map"><MapSettings /></div>

        {/* ---------------------------------------------------- Penilaian */}
        <div id="sidebar-assessment">
          <AssessmentPanel
            mode={assessmentMode}
            onModeChange={setAssessmentMode}
            districtCode={assessmentDistrictCode}
            onDistrictChange={setAssessmentDistrictCode}
          />
        </div>

        {/* ------------------------------------------------------- Statistik */}
        <Card id="sidebar-statistics" title={`Statistik · ${activeCategory?.name ?? '—'}`}>
          <StatRows />
        </Card>

        {/* ------------------------------------------------------------ Aksi */}
        <Card title="Aksi Cepat" className="mb-1 p-2.5">
          <div className="flex flex-col gap-2">
            <Button size="sm" className="h-9 w-full" onClick={onOpenPrint}>
              <Printer size={14} /> Cetak Peta HD
            </Button>
            <div className="grid grid-cols-3 gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-11 w-full flex-col gap-0.5 border-slate-200 px-1 text-[10px] leading-tight"
              onClick={() => onOpenCategoryEditor(null)}
            >
              <Plus size={14} /> Kategori
            </Button>
            <Button
              variant="soft"
              size="sm"
              className="h-11 w-full flex-col gap-0.5 border border-brand-100 px-1 text-[10px] leading-tight"
              disabled={!activeCategory}
              onClick={() => activeCategory && app.seedDemoScores(activeCategory.id)}
            >
              <Sparkles size={14} /> <span className="text-center">Isi Contoh Skor</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-11 w-full flex-col gap-0.5 border-slate-200 px-1 text-[10px] leading-tight hover:border-red-200 hover:bg-red-50 hover:text-red-700"
              disabled={!activeCategory}
              onClick={() => activeCategory && app.clearScoresForCategory(activeCategory.id)}
            >
              <Eraser size={14} /> <span className="text-center">Bersihkan Skor</span>
            </Button>
            </div>
            <Button variant="outline" size="sm" onClick={onOpenSettings} className="h-8 w-full justify-center text-[11px]">
              <Cog size={13} /> Pengaturan & Backup
            </Button>
          </div>
        </Card>
      </div>
      </ScrollArea>
      )}
      {collapsed && activeFlyout ? (
        <div
          role="dialog"
          aria-label={activeFlyout === 'categories' ? 'Kategori peta' : activeFlyout === 'map' ? 'Tampilan peta' : activeFlyout === 'statistics' ? 'Statistik' : 'Penilaian wilayah'}
          className="fixed left-[76px] z-[700] flex w-[min(320px,calc(100vw-88px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-fade-rise"
          style={{ top: flyoutTop, maxHeight: 'min(78dvh, 620px)' }}
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <h2 className="truncate text-sm font-semibold text-slate-900">
              {activeFlyout === 'categories' ? 'Kategori Peta' : activeFlyout === 'map' ? 'Tampilan Peta' : activeFlyout === 'statistics' ? `Statistik · ${activeCategory?.name ?? '—'}` : 'Penilaian Wilayah'}
            </h2>
            <button type="button" onClick={() => setActiveFlyout(null)} aria-label="Tutup panel" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
              <X size={16} />
            </button>
          </header>
          <ScrollArea className="min-h-0 p-3">
            {activeFlyout === 'categories' ? (
              <Card title="Kategori Peta" action={<button onClick={() => onOpenCategoryEditor(null)} className="flex items-center gap-1 rounded-md bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700 transition hover:bg-brand-100"><Plus size={12} /> Baru</button>}>
                <div className="flex flex-col gap-1.5">
                  {app.categories.map((category) => <CategoryRow key={category.id} category={category} active={category.id === app.activeCategoryId} onClick={() => app.setActiveCategory(category.id)} onEdit={() => onOpenCategoryEditor(category.id)} />)}
                  {!app.categories.length ? <p className="py-3 text-center text-xs text-slate-400">Belum ada kategori.</p> : null}
                </div>
              </Card>
            ) : null}
            {activeFlyout === 'map' ? <MapSettings /> : null}
            {activeFlyout === 'statistics' ? <Card title="Ringkasan Penilaian"><StatRows /></Card> : null}
            {activeFlyout === 'assessment' ? (
              <AssessmentPanel
                mode={assessmentMode}
                onModeChange={setAssessmentMode}
                districtCode={assessmentDistrictCode}
                onDistrictChange={setAssessmentDistrictCode}
              />
            ) : null}
          </ScrollArea>
        </div>
      ) : null}
    </aside>
    </>
  );
}

function AssessmentPanel({
  mode,
  onModeChange,
  districtCode,
  onDistrictChange,
}: {
  mode: 'kecamatan' | 'desa';
  onModeChange: (mode: 'kecamatan' | 'desa') => void;
  districtCode: string;
  onDistrictChange: (code: string) => void;
}) {
  const app = useApp();
  const districts = app.kecamatanList;
  const villages = app.geo.kelurahan?.features.filter(
    (feature) => feature.properties.districtCode === districtCode,
  ) ?? [];
  const features = mode === 'kecamatan' ? districts : villages;

  return (
    <Card title="Penilaian Wilayah">
      <div className="flex flex-col gap-2.5">
        <Segmented
          value={mode}
          onChange={onModeChange}
          options={[
            { value: 'kecamatan', label: `Kecamatan (${districts.length || 21})` },
            { value: 'desa', label: 'Desa/Kelurahan' },
          ]}
          size="sm"
        />
        {mode === 'desa' ? (
          <Dropdown
            value={districtCode}
            ariaLabel="Pilih kecamatan untuk penilaian desa"
            onChange={onDistrictChange}
            options={[
              { value: '', label: 'Pilih kecamatan' },
              ...districts.map((district) => ({
                value: district.properties.code,
                label: `Kec. ${district.properties.name}`,
              })),
            ]}
          />
        ) : null}
        <div className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
          {features.map((feature) => (
            <VillageScoreRow key={feature.properties.id} feature={feature} />
          ))}
          {!features.length ? (
            <p className="py-3 text-center text-xs text-slate-400">
              {mode === 'desa' ? 'Pilih kecamatan untuk menilai desa/kelurahan.' : 'Data kecamatan sedang dimuat.'}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function RailButton({ Icon, label, onClick, active = false }: { Icon: LucideIcon; label: string; onClick: (event: MouseEvent<HTMLButtonElement>) => void; active?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      aria-expanded={active}
      className={`flex h-10 w-10 items-center justify-center rounded-xl border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 ${active ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-brand-700'}`}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

function MapSettings() {
  const app = useApp();
  return (
    <Card title="Tampilan Peta">
      <div className="flex flex-col gap-2.5">
        <Segmented
          value={app.view.mode}
          onChange={(mode) => app.updateView({ mode })}
          options={[
            { value: 'kecamatan', label: 'Kecamatan' },
            { value: 'desa', label: 'Desa / Kelurahan' },
          ]}
        />
        {app.view.mode === 'desa' ? (
          <>
            <Dropdown
              value={app.view.selectedKecamatanCode ?? ''}
              ariaLabel="Fokus wilayah kecamatan"
              onChange={(value) => app.updateView({ selectedKecamatanCode: value || null })}
              options={[
                { value: '', label: 'Seluruh kabupaten' },
                ...app.kecamatanList.map((kec) => ({
                  value: kec.properties.code,
                  label: `Kec. ${kec.properties.name}`,
                })),
              ]}
            />
            <p className="-mt-1 text-[10px] leading-relaxed text-slate-400">
              {app.view.selectedKecamatanCode
                ? 'Peta difokuskan ke kecamatan ini; wilayah lain disembunyikan.'
                : 'Pilih kecamatan untuk fokus, atau tampilkan seluruh kabupaten.'}
            </p>
          </>
        ) : null}
        <Dropdown
          value={app.view.baseLayer}
          ariaLabel="Basemap"
          onChange={(value) => app.updateView({ baseLayer: value as never })}
          options={BASE_LAYERS.map((layer) => ({ value: layer.id, label: layer.label }))}
        />
        <Switch
          label="Tampilkan nama kecamatan"
          checked={app.view.labels}
          onChange={(labels) => app.updateView({ labels })}
        />
      </div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

function CategoryRow({
  category,
  active,
  onClick,
  onEdit,
}: {
  category: RiskCategory;
  active: boolean;
  onClick: () => void;
  onEdit: () => void;
}) {
  const Icon = ICONS[category.icon] ?? MapIcon;
  return (
    <div
      className={clsxRow(active)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ background: `linear-gradient(135deg, ${category.palette[3]}, ${category.palette[4]})` }}
      >
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1 cursor-pointer">
        <p className="truncate text-[13px] font-semibold text-slate-800">{category.name}</p>
        <p className="truncate text-[11px] text-slate-500">{category.description || '—'}</p>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="rounded-md p-1 text-slate-300 transition hover:bg-white hover:text-slate-600"
        title="Edit kategori"
      >
        <Cog size={13} />
      </button>
    </div>
  );
}

function clsxRow(active: boolean): string {
  return [
    'flex cursor-pointer items-start gap-2.5 rounded-xl border px-2.5 py-2 transition',
    active
      ? 'border-brand-300 bg-brand-50/70 shadow-[inset_0_0_0_1px_rgba(39,80,229,0.18)]'
      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
  ].join(' ');
}

function StatRows() {
  const app = useApp();
  const activeCategory = app.activeCategory;
  const max = useMemo(
    () => Math.max(1, ...RISK_SCORES.map((score) => app.stats.counts[score])),
    [app.stats],
  );

  if (!activeCategory) return <p className="text-xs text-slate-400">Pilih kategori.</p>;

  return (
    <div className="flex flex-col gap-2">
      {RISK_SCORES.map((score) => {
        const count = app.stats.counts[score];
        return (
          <div key={score} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-[4px] border border-slate-300"
              style={{ background: activeCategory.palette[score - 1] }}
            />
            <span className="w-20 shrink-0 text-[11px] text-slate-600">
              {activeCategory.bands[score - 1]}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(count / max) * 100}%`, background: activeCategory.palette[score - 1] }}
              />
            </div>
            <span className="w-6 text-right text-[11px] font-semibold text-slate-700">{count}</span>
          </div>
        );
      })}
      <div className="mt-1 flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1.5 text-[11px]">
        <span className="h-3 w-3 rounded-[4px] border border-slate-300" style={{ background: activeCategory.noDataColor }} />
        <span className="text-slate-500">Belum ada data:</span>
        <span className="font-semibold text-slate-700">{app.stats.noData}</span>
        <span className="mx-1 h-3 w-px bg-slate-300" />
        <span className="text-slate-500">Rata-rata:</span>
        <span className="font-semibold text-slate-700">{app.stats.average ?? '—'}</span>
      </div>
      <div className="text-[11px] text-slate-400">
        Wilayah dinilai: <span className="font-semibold text-slate-600">{app.stats.scored}/{app.stats.total}</span>
      </div>
    </div>
  );
}

function VillageScoreRow({ feature }: { feature: import('@/lib/types').RegionFeature }) {
  const app = useApp();
  const activeCategory = app.activeCategory;
  const rec = activeCategory ? app.scores[`${activeCategory.id}::${feature.properties.id}`] : undefined;

  return (
    <div className="mb-1.5 flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-2 py-1.5">
      <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-slate-700">
        {feature.properties.name}
      </span>
      <div className="flex gap-1">
        {RISK_SCORES.map((score) => {
          const active = rec?.score === score;
          return (
            <button
              key={score}
              title={`Skor ${score}`}
              onClick={() =>
                app.setScore(
                  activeCategory?.id ?? '',
                  feature.properties.id,
                  active ? null : score,
                )
              }
              className={clsxRowMini(active)}
              style={{ background: active ? activeCategory?.palette[score - 1] : undefined }}
            />
          );
        })}
      </div>
    </div>
  );
}

function clsxRowMini(active: boolean): string {
  return active
    ? 'h-5 w-5 rounded-full border-2 border-white ring-2 ring-slate-900/20'
    : 'h-5 w-5 rounded-full border border-slate-300 bg-white transition hover:scale-110';
}
