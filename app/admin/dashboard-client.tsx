"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import type { ReactNode } from "react";

type Overview = {
  totalCabang: number;
  totalEvent: number;
  totalDokumentasi: number;
  cabangMengirim: number;
  cabangMengirimBulanIni: number;
};
type DailyRow = { tanggal: string; total_dokumentasi: number; jumlah_cabang: number; jumlah_event: number };
type MonthlyRow = { bulan: string; total_dokumentasi: number; jumlah_cabang: number; jumlah_event: number };
type YearlyRow = { tahun: string; total_dokumentasi: number; jumlah_cabang: number; jumlah_event: number };
type EventRow = { nama_event: string; total_dokumentasi: number; jumlah_cabang: number };
type LatestRow = { id: string; kode_cabang: string; nama_cabang: string; nama_event: string; tanggal: string; foto: string | null };
type CoverageRow = { kode_cabang: string; nama_cabang: string; cluster: string; total_bulan_ini: number };
type Period = { year: number; from: string; to: string; monthFrom: string; monthTo: string };
type DashboardData = {
  success: boolean;
  message?: string;
  overview: Overview;
  period: Period;
  daily: DailyRow[];
  monthly: MonthlyRow[];
  yearly: YearlyRow[];
  events: EventRow[];
  latest: LatestRow[];
  coverage: CoverageRow[];
};
type ChartItem = { key: string; label: string; value: number; title?: string };

const numberFormat = new Intl.NumberFormat("id-ID");
const formatNumber = (value: number) => numberFormat.format(value || 0);

function localIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function displayDate(value: string, options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short", year: "numeric" }) {
  if (!value) return "-";
  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("id-ID", options);
}

function makeQueryRange() {
  const today = new Date();
  const year = today.getFullYear();
  const fromDate = new Date(today);
  fromDate.setDate(fromDate.getDate() - 13);
  const monthFrom = new Date(year, today.getMonth(), 1);
  const monthTo = new Date(year, today.getMonth() + 1, 0);
  return {
    year,
    from: localIsoDate(fromDate),
    to: localIsoDate(today),
    monthFrom: localIsoDate(monthFrom),
    monthTo: localIsoDate(monthTo),
  };
}

function Icon({ name }: { name: "branch" | "event" | "file" | "users" | "refresh" | "chart" | "calendar" | "arrow" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" {...common}>
      {name === "branch" && <><path d="M5 20V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14" /><path d="M3 20h18M9 8h1m4 0h1M9 12h1m4 0h1M10 20v-4h4v4" /></>}
      {name === "event" && <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18M8 14h3m-3 3h6" /></>}
      {name === "file" && <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8m-8 4h8" /></>}
      {name === "users" && <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>}
      {name === "refresh" && <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9A7 7 0 0 1 17 5l3 2M4 17l3 2a7 7 0 0 0 11.4-4" /></>}
      {name === "chart" && <><path d="M3 3v18h18" /><path d="m7 14 4-4 3 3 6-7" /></>}
      {name === "calendar" && <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>}
      {name === "arrow" && <><path d="M5 12h14M13 6l6 6-6 6" /></>}
    </svg>
  );
}

function StatCard({ title, value, description, tone, icon }: {
  title: string; value: number | null; description: string; tone: "blue" | "violet" | "green" | "amber"; icon: "branch" | "event" | "file" | "users";
}) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    green: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{value === null ? "—" : formatNumber(value)}</p>
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${tones[tone]}`}><Icon name={icon} /></div>
      </div>
      
    </div>
  );
}

function ChartCard({ title, subtitle, badge, children }: { title: string; subtitle: string; badge: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/30 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><h3 className="text-base font-bold text-slate-900 sm:text-lg">{title}</h3><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>
        <span className="w-fit rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">{badge}</span>
      </div>
      {children}
    </section>
  );
}

function LineChart({ items }: { items: ChartItem[] }) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));
  const coords = items.map((item, index) => ({
    ...item,
    x: items.length <= 1 ? 360 : 38 + (index / (items.length - 1)) * 644,
    y: 174 - (item.value / maxValue) * 132,
  }));
  const points = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = coords.length ? `38,174 ${points} ${coords[coords.length - 1].x},174` : "";
  const hasUploads = items.some((item) => item.value > 0);
  return (
    <div className="mt-5">
      <div className="relative rounded-xl bg-slate-50/80 px-2 pt-3">
        <svg viewBox="0 0 720 224" role="img" aria-label="Grafik tren dokumentasi harian" className="h-64 w-full sm:h-72" preserveAspectRatio="none">
          {[42, 86, 130, 174].map((y) => <line key={y} x1="34" x2="690" y1={y} y2={y} stroke="#E2E8F0" strokeDasharray="4 5" />)}
          <line x1="34" x2="690" y1="174" y2="174" stroke="#CBD5E1" />
          {hasUploads && <polygon points={areaPoints} fill="#93C5FD" fillOpacity="0.22" />}
          {hasUploads && <polyline points={points} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
          {coords.map((point) => <g key={point.key}><circle cx={point.x} cy={point.y} r={point.value > 0 ? 4 : 2.5} fill={point.value > 0 ? "#2563EB" : "#CBD5E1"}><title>{`${point.label}: ${formatNumber(point.value)} dokumentasi`}</title></circle></g>)}
          {coords.filter((_, index) => index === 0 || index === coords.length - 1 || index % 2 === 0).map((point) => <text key={`${point.key}-label`} x={point.x} y="205" textAnchor="middle" fill="#64748B" fontSize="11">{point.label}</text>)}
        </svg>
        {!hasUploads && <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4"><div className="rounded-xl border border-slate-200 bg-white/95 px-4 py-3 text-center shadow-sm"><p className="text-sm font-semibold text-slate-700">Belum ada pengiriman di periode ini</p><p className="mt-1 text-xs text-slate-500">Grafik otomatis terisi saat dokumentasi harian masuk.</p></div></div>}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" />Jumlah dokumentasi per hari</span><span>{formatNumber(items.reduce((sum, item) => sum + item.value, 0))} dokumentasi dalam rentang ini</span></div>
    </div>
  );
}

function BarChart({ items, color, emptyMessage }: { items: ChartItem[]; color: string; emptyMessage: string }) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));
  const slot = 652 / Math.max(items.length, 1);
  const barWidth = Math.min(36, slot * 0.58);
  const anyValue = items.some((item) => item.value > 0);
  return (
    <div className="mt-5">
      <div className="rounded-xl bg-slate-50/80 px-2 pt-3">
        <svg viewBox="0 0 720 224" role="img" aria-label="Grafik batang jumlah dokumentasi" className="h-64 w-full sm:h-72" preserveAspectRatio="none">
          {[42, 86, 130, 174].map((y) => <line key={y} x1="34" x2="690" y1={y} y2={y} stroke="#E2E8F0" strokeDasharray="4 5" />)}
          <line x1="34" x2="690" y1="174" y2="174" stroke="#CBD5E1" />
          {items.map((item, index) => {
            const x = 38 + index * slot + (slot - barWidth) / 2;
            const height = (item.value / maxValue) * 132;
            const y = 174 - height;
            return <g key={item.key}><rect x={x} y={item.value > 0 ? y : 171} width={barWidth} height={Math.max(item.value > 0 ? height : 0, item.value > 0 ? 3 : 0)} rx="4" fill={color} fillOpacity={item.value > 0 ? 0.92 : 0.24}><title>{`${item.label}: ${formatNumber(item.value)} dokumentasi`}</title></rect>{item.value > 0 && <text x={x + barWidth / 2} y={Math.max(19, y - 7)} textAnchor="middle" fill="#475569" fontSize={items.length > 8 ? "9" : "11"}>{formatNumber(item.value)}</text>}<text x={x + barWidth / 2} y="205" textAnchor="middle" fill="#64748B" fontSize={items.length > 8 ? "10" : "11"}>{item.label}</text></g>;
          })}
        </svg>
      </div>
      {!anyValue && <p className="mt-3 rounded-lg border border-dashed border-slate-200 px-4 py-3 text-center text-xs text-slate-500">{emptyMessage}</p>}
      {anyValue && <p className="mt-3 text-xs text-slate-500">Total periode pada grafik: <span className="font-semibold text-slate-700">{formatNumber(items.reduce((sum, item) => sum + item.value, 0))} dokumentasi</span></p>}
    </div>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="px-5 py-12 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><Icon name="file" /></div><p className="mt-3 text-sm font-medium text-slate-700">Belum ada data</p><p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">{children}</p></div>;
}

export default function AdminPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const range = makeQueryRange();
    const params = new URLSearchParams({
      year: String(range.year), from: range.from, to: range.to,
      monthFrom: range.monthFrom, monthTo: range.monthTo,
    });
    setLoading(true);
    setError("");
    fetch(`/api/admin/dashboard?${params.toString()}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        // Read as text first so HTML 404/error/login pages don't become the
        // confusing "Unexpected token '<'" JSON parse error.
        const body = await response.text();
        let result: unknown;
        try {
          result = JSON.parse(body);
        } catch {
          const contentType = response.headers.get("content-type") || "";
          const isHtml = contentType.includes("text/html") || body.trimStart().startsWith("<!DOCTYPE") || body.trimStart().startsWith("<html");
          if (isHtml) {
            throw new Error(
              `API dashboard mengembalikan halaman HTML (HTTP ${response.status}), bukan JSON. Pastikan file app/api/admin/dashboard/route.ts dan lib/admin-dashboard.ts berada di root project. Periksa juga agar middleware/proxy tidak mengalihkan request API ke halaman login.`
            );
          }
          throw new Error(`Respons API dashboard bukan JSON yang valid (HTTP ${response.status}). Periksa terminal Next.js.`);
        }
        const payload = result as Partial<DashboardData>;
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || `Insight dashboard gagal dimuat (HTTP ${response.status}).`);
        }
        return payload as DashboardData;
      })
      .then((result) => { if (active) setData(result); })
      .catch((reason: unknown) => {
        if (!active || (reason instanceof Error && reason.name === "AbortError")) return;
        const message = reason instanceof Error ? reason.message : "Terjadi kesalahan saat memuat dashboard.";
      setError(message);
      void Swal.fire({ icon: "error", title: "Gagal memuat dashboard", text: message });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; controller.abort(); };
  }, [refreshKey]);

  const dailySeries = useMemo<ChartItem[]>(() => {
    if (!data) return [];
    const byDate = new Map(data.daily.map((row) => [row.tanggal.slice(0, 10), row.total_dokumentasi]));
    const start = new Date(`${data.period.from}T12:00:00`);
    const end = new Date(`${data.period.to}T12:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
    const items: ChartItem[] = [];
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const key = localIsoDate(cursor);
      items.push({ key, label: displayDate(key, { day: "2-digit", month: "short" }), value: byDate.get(key) || 0, title: key });
    }
    return items;
  }, [data]);

  const monthlySeries = useMemo<ChartItem[]>(() => {
    if (!data) return [];
    const byMonth = new Map(data.monthly.map((row) => [row.bulan.slice(0, 7), row.total_dokumentasi]));
    return Array.from({ length: 12 }, (_, index) => {
      const month = String(index + 1).padStart(2, "0");
      const key = `${data.period.year}-${month}`;
      const label = new Date(data.period.year, index, 1).toLocaleDateString("id-ID", { month: "short" });
      return { key, label, value: byMonth.get(key) || 0 };
    });
  }, [data]);

  const yearlySeries = useMemo<ChartItem[]>(() => {
    if (!data) return [];
    const byYear = new Map(data.yearly.map((row) => [String(row.tahun), row.total_dokumentasi]));
    const availableYears = Array.from(byYear.keys()).sort((a, b) => Number(a) - Number(b));
    const years = availableYears.length ? availableYears.slice(-6) : Array.from({ length: 6 }, (_, index) => String(new Date().getFullYear() - 5 + index));
    return years.map((year) => ({ key: year, label: year, value: byYear.get(year) || 0 }));
  }, [data]);

  const monthLabel = data ? displayDate(`${data.period.monthFrom.slice(0, 7)}-01`, { month: "long", year: "numeric" }) : "bulan ini";
  const yearLabel = data ? String(data.period.year) : String(new Date().getFullYear());
  const highestEvent = Math.max(1, ...(data?.events || []).map((event) => event.total_dokumentasi));

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">Business insights</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Ringkasan operasional</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"><Icon name="refresh" />{loading ? "Memuat..." : "Perbarui data"}</button>
          <Link href="/admin/rekap" className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"><Icon name="file" />Rekap & Export Excel</Link>
        </div>
      </section>

      

      <section aria-label="Ringkasan statistik" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Cabang" value={data?.overview.totalCabang ?? null} description="Jumlah cabang yang tercatat di master data." tone="blue" icon="branch" />
        <StatCard title="Event Terdaftar" value={data?.overview.totalEvent ?? null} description="Jumlah event pada master data." tone="violet" icon="event" />
        <StatCard title="Dokumentasi Masuk" value={data?.overview.totalDokumentasi ?? null} description="Akumulasi seluruh dokumentasi dari tabel cabang." tone="green" icon="file" />
        <StatCard title="Cabang Mengirim" value={data?.overview.cabangMengirim ?? null} description="Cabang yang pernah mengirim dokumentasi." tone="amber" icon="users" />
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon name="chart" /></div><div><h2 className="text-lg font-bold text-slate-900">Insight dokumentasi</h2></div></div>
        <ChartCard title="1. Rekap harian" subtitle="Volume dokumentasi setiap hari, termasuk tanggal tanpa kiriman." badge="14 hari terakhir">
          {loading && !data ? <div className="mt-5 h-64 animate-pulse rounded-xl bg-slate-100" /> : <LineChart items={dailySeries} />}
        </ChartCard>
        <ChartCard title="2. Rekap bulanan" subtitle="Perbandingan jumlah dokumentasi dari Januari sampai Desember." badge={`Tahun ${yearLabel}`}>
          {loading && !data ? <div className="mt-5 h-64 animate-pulse rounded-xl bg-slate-100" /> : <BarChart items={monthlySeries} color="#7C3AED" emptyMessage={`Belum ada dokumentasi untuk tahun ${yearLabel}.`} />}
        </ChartCard>
        <ChartCard title="3. Rekap tahunan" subtitle="Perkembangan jumlah dokumentasi per tahun untuk melihat tren jangka panjang." badge="Hingga 6 tahun data">
          {loading && !data ? <div className="mt-5 h-64 animate-pulse rounded-xl bg-slate-100" /> : <BarChart items={yearlySeries} color="#059669" emptyMessage="Belum ada data dokumentasi tahunan." />}
        </ChartCard>
      </section>

      <section className="grid gap-6 2xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6"><h2 className="text-base font-bold text-slate-900 sm:text-lg">Dokumentasi per event</h2></div>
          {loading && !data ? <div className="space-y-4 p-6">{[1, 2, 3, 4].map((row) => <div key={row} className="h-8 animate-pulse rounded-lg bg-slate-100" />)}</div> : data?.events.length ? <div className="space-y-5 p-5 sm:p-6">{data.events.map((event, index) => <div key={event.nama_event}><div className="mb-2 flex items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-xs font-bold text-violet-700">{index + 1}</span><div className="min-w-0"><p className="break-words text-sm font-semibold text-slate-800">{event.nama_event}</p><p className="mt-0.5 text-xs text-slate-500">{formatNumber(event.jumlah_cabang)} cabang berpartisipasi</p></div></div><span className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{formatNumber(event.total_dokumentasi)}</span></div><div className="ml-10 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-violet-500" style={{ width: `${Math.max(2, (event.total_dokumentasi / highestEvent) * 100)}%` }} /></div></div>)}</div> : <EmptyState>Jumlah dokumentasi per event akan muncul setelah data pada tabel cabang tersedia.</EmptyState>}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-base font-bold text-slate-900 sm:text-lg">Cakupan cabang</h2><p className="mt-1 text-sm text-slate-500">Cabang yang belum atau masih sedikit mengirim pada {monthLabel}.</p></div><span className="w-fit rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">{formatNumber(data?.overview.cabangMengirimBulanIni || 0)} cabang aktif bulan ini</span></div></div>
          {loading && !data ? <div className="space-y-4 p-6">{[1, 2, 3, 4].map((row) => <div key={row} className="h-9 animate-pulse rounded-lg bg-slate-100" />)}</div> : data?.coverage.length ? <div className="overflow-x-auto"><table className="w-full min-w-[470px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50"><tr><th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Cabang</th><th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Cluster</th><th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Kiriman bulan ini</th></tr></thead><tbody className="divide-y divide-slate-100">{data.coverage.map((branch) => <tr key={branch.kode_cabang} className="hover:bg-slate-50/70"><td className="px-5 py-3.5"><p className="font-semibold text-slate-800">{branch.nama_cabang}</p><p className="mt-0.5 text-xs text-slate-500">{branch.kode_cabang}</p></td><td className="px-5 py-3.5 text-slate-600">{branch.cluster || "-"}</td><td className="px-5 py-3.5 text-right"><span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${branch.total_bulan_ini > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{branch.total_bulan_ini > 0 ? formatNumber(branch.total_bulan_ini) : "Belum ada"}</span></td></tr>)}</tbody></table><div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">Menampilkan hingga 10 cabang dengan jumlah kiriman bulan ini paling sedikit.</div></div> : <EmptyState>Data cabang belum tersedia pada master data.</EmptyState>}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/30">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><h2 className="text-base font-bold text-slate-900 sm:text-lg">Dokumentasi terbaru</h2></div><Link href="/admin/rekap" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800">Buka rekap lengkap <Icon name="arrow" /></Link></div>
        {loading && !data ? <div className="space-y-3 p-6">{[1, 2, 3, 4].map((row) => <div key={row} className="h-10 animate-pulse rounded-lg bg-slate-100" />)}</div> : data?.latest.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50"><tr><th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">ID</th><th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Cabang</th><th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Event</th><th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Tanggal</th><th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide text-slate-500">Dokumen</th></tr></thead><tbody className="divide-y divide-slate-100">{data.latest.map((item, index) => <tr key={`${item.kode_cabang}-${item.id}-${index}`} className="hover:bg-slate-50/70"><td className="px-5 py-3.5 font-medium text-slate-700">{item.id}</td><td className="px-5 py-3.5"><p className="font-semibold text-slate-800">{item.nama_cabang}</p><p className="mt-0.5 text-xs text-slate-500">{item.kode_cabang}</p></td><td className="px-5 py-3.5 text-slate-700">{item.nama_event}</td><td className="whitespace-nowrap px-5 py-3.5 text-slate-600">{displayDate(item.tanggal)}</td><td className="px-5 py-3.5"><span className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${item.foto ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{item.foto ? "Foto tercatat" : "Tanpa foto"}</span></td></tr>)}</tbody></table></div> : <EmptyState>Belum ada dokumentasi yang bisa ditampilkan. Pastikan tabel dokumentasi cabang menggunakan kolom id, event, tanggal, dan foto.</EmptyState>}
      </section>

      <footer className="flex flex-col gap-1 border-t border-slate-200 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between"><span>Documentation System · Admin Panel</span><span>{loading ? "Memuat data dari database..." : `Sumber: master cabang, master event, dan tabel dokumentasi per cabang · ${yearLabel}`}</span></footer>
    </div>
  );
}
