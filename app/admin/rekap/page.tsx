"use client";

import { useEffect, useState } from "react";

type Mode = "month" | "day" | "event" | "branch" | "branch_event";

type BranchOption = {
  kode_cabang: string;
  nama_cabang: string;
  singkatan: string;
  cluster: string;
};

type AggregateRow = {
  bulan?: string;
  tanggal?: string;
  nama_event?: string;
  kode_cabang?: string;
  nama_cabang?: string;
  total_dokumentasi: number;
  jumlah_cabang?: number;
  jumlah_event?: number;
  jumlah_hari?: number;
};

type DocumentationDetail = {
  kode_cabang: string;
  nama_cabang: string;
  singkatan: string | null;
  id: string;
  nama_event: string;
  tanggal: string;
  waktu_upload: string | null;
  foto: string | null;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  data: AggregateRow[];
  details?: DocumentationDetail[];
  detailsShown?: number;
  stats: {
    total_dokumentasi: number;
    cabang_aktif: number;
    event_aktif: number;
    tanggal_aktif: number;
  };
  options: {
    branches: BranchOption[];
    events: string[];
  };
};

const modes: { value: Mode; label: string }[] = [
  { value: "month", label: "Per Bulan" },
  { value: "day", label: "Per Hari" },
  { value: "event", label: "Per Event" },
  { value: "branch", label: "Per Cabang" },
  { value: "branch_event", label: "Cabang per Event" },
];

const numberFormat = new Intl.NumberFormat("id-ID");

function formatMonth(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(date);
}

function formatDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function cardClass() {
  return "rounded-xl border border-slate-200 bg-white p-5";
}

export default function RekapAdminPage() {
  const [mode, setMode] = useState<Mode>("month");
  const [year, setYear] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [kodeCabang, setKodeCabang] = useState("");
  const [eventName, setEventName] = useState("");

  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [rows, setRows] = useState<AggregateRow[]>([]);
  const [details, setDetails] = useState<DocumentationDetail[]>([]);
  const [detailsShown, setDetailsShown] = useState(0);
  const [stats, setStats] = useState<ApiResponse["stats"]>({
    total_dokumentasi: 0,
    cabang_aktif: 0,
    event_aktif: 0,
    tanggal_aktif: 0,
  });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [lastLoaded, setLastLoaded] = useState("");
  const [currentYear, setCurrentYear] = useState<number | null>(null);

  useEffect(() => {
    // Baca tahun saat komponen sudah berjalan di browser, bukan saat prerender.
    setCurrentYear(new Date().getFullYear());

    let cancelled = false;

    async function loadInitial() {
      setLoading(true);
      try {
        const response = await fetch("/api/admin/rekap?mode=month", {
          cache: "no-store",
        });
        const result = (await response.json()) as ApiResponse;
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Gagal memuat rekap.");
        }
        if (cancelled) return;
        setRows(result.data || []);
        setDetails(result.details || []);
        setDetailsShown(result.detailsShown || 0);
        setStats(result.stats);
        setBranches(result.options?.branches || []);
        setEvents(result.options?.events || []);
        setLastLoaded(new Date().toLocaleString("id-ID"));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Gagal memuat rekap.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  function makeQuery() {
    const params = new URLSearchParams();
    params.set("mode", mode);
    if (year) params.set("year", year);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (kodeCabang) params.set("kode_cabang", kodeCabang);
    if (eventName) params.set("event", eventName);
    return params;
  }

  async function handleApply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError("Tanggal mulai tidak boleh melewati tanggal akhir.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/rekap?${makeQuery().toString()}`, {
        cache: "no-store",
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Gagal mengambil rekap.");
      }
      setRows(result.data || []);
      setDetails(result.details || []);
      setDetailsShown(result.detailsShown || 0);
      setStats(result.stats);
      setBranches(result.options?.branches || []);
      setEvents(result.options?.events || []);
      setLastLoaded(new Date().toLocaleString("id-ID"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil rekap.");
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    setExporting(true);
    window.location.href = `/api/admin/rekap/export?${makeQuery().toString()}`;
    window.setTimeout(() => setExporting(false), 1500);
  }

  const headers = mode === "month"
    ? ["Bulan", "Total Dokumentasi", "Cabang Aktif", "Event Aktif"]
    : mode === "day"
      ? ["Tanggal", "Total Dokumentasi", "Cabang Aktif", "Event Aktif"]
      : mode === "event"
        ? ["Event", "Total Dokumentasi", "Cabang", "Hari Pengiriman"]
        : mode === "branch"
          ? ["Kode Cabang", "Nama Cabang", "Total Dokumentasi", "Jumlah Event", "Hari Pengiriman"]
          : ["Kode Cabang", "Nama Cabang", "Event", "Total Dokumentasi", "Hari Pengiriman"];

  function renderCells(row: AggregateRow) {
    if (mode === "month") return <>
      <td className="px-4 py-3.5 font-medium text-slate-900 sm:px-5">{formatMonth(row.bulan || "")}</td>
      <td className="px-4 py-3.5 text-right tabular-nums text-slate-800 sm:px-5">{numberFormat.format(row.total_dokumentasi)}</td>
      <td className="px-4 py-3.5 text-right tabular-nums text-slate-600 sm:px-5">{numberFormat.format(row.jumlah_cabang || 0)}</td>
      <td className="px-4 py-3.5 text-right tabular-nums text-slate-600 sm:px-5">{numberFormat.format(row.jumlah_event || 0)}</td>
    </>;
    if (mode === "day") return <>
      <td className="px-4 py-3.5 font-medium text-slate-900 sm:px-5">{formatDate(row.tanggal || "")}</td>
      <td className="px-4 py-3.5 text-right tabular-nums text-slate-800 sm:px-5">{numberFormat.format(row.total_dokumentasi)}</td>
      <td className="px-4 py-3.5 text-right tabular-nums text-slate-600 sm:px-5">{numberFormat.format(row.jumlah_cabang || 0)}</td>
      <td className="px-4 py-3.5 text-right tabular-nums text-slate-600 sm:px-5">{numberFormat.format(row.jumlah_event || 0)}</td>
    </>;
    if (mode === "event") return <>
      <td className="px-4 py-3.5 font-medium text-slate-900 sm:px-5">{row.nama_event}</td>
      <td className="px-4 py-3.5 text-right tabular-nums text-slate-800 sm:px-5">{numberFormat.format(row.total_dokumentasi)}</td>
      <td className="px-4 py-3.5 text-right tabular-nums text-slate-600 sm:px-5">{numberFormat.format(row.jumlah_cabang || 0)}</td>
      <td className="px-4 py-3.5 text-right tabular-nums text-slate-600 sm:px-5">{numberFormat.format(row.jumlah_hari || 0)}</td>
    </>;
    if (mode === "branch") return <>
      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-600 sm:px-5">{row.kode_cabang}</td>
      <td className="px-4 py-3.5 font-medium text-slate-900 sm:px-5">{row.nama_cabang}</td>
      <td className="px-4 py-3.5 text-right tabular-nums text-slate-800 sm:px-5">{numberFormat.format(row.total_dokumentasi)}</td>
      <td className="px-4 py-3.5 text-right tabular-nums text-slate-600 sm:px-5">{numberFormat.format(row.jumlah_event || 0)}</td>
      <td className="px-4 py-3.5 text-right tabular-nums text-slate-600 sm:px-5">{numberFormat.format(row.jumlah_hari || 0)}</td>
    </>;
    return <>
      <td className="whitespace-nowrap px-4 py-3.5 font-mono text-xs text-slate-600 sm:px-5">{row.kode_cabang}</td>
      <td className="px-4 py-3.5 font-medium text-slate-900 sm:px-5">{row.nama_cabang}</td>
      <td className="px-4 py-3.5 text-slate-700 sm:px-5">{row.nama_event}</td>
      <td className="px-4 py-3.5 text-right tabular-nums text-slate-800 sm:px-5">{numberFormat.format(row.total_dokumentasi)}</td>
      <td className="px-4 py-3.5 text-right tabular-nums text-slate-600 sm:px-5">{numberFormat.format(row.jumlah_hari || 0)}</td>
    </>;
  }

  const years = currentYear === null
    ? []
    : Array.from({ length: 8 }, (_, index) => currentYear - index);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Laporan</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Rekap Dokumentasi</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Ringkasan jumlah dan daftar pengiriman asli cabang, termasuk foto serta waktu upload.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting || loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 17v3h16v-3" />
          </svg>
          {exporting ? "Menyiapkan Excel..." : "Export Excel"}
        </button>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <form onSubmit={handleApply} className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor="mode" className="mb-1.5 block text-sm font-medium text-slate-700">Jenis Rekap</label>
            <select id="mode" value={mode} onChange={(event) => setMode(event.target.value as Mode)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              {modes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="year" className="mb-1.5 block text-sm font-medium text-slate-700">Tahun</label>
            <select id="year" value={year} onChange={(event) => setYear(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="">Semua tahun</option>
              {years.map((item) => <option key={item} value={String(item)}>{item}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="from" className="mb-1.5 block text-sm font-medium text-slate-700">Tanggal Mulai</label>
            <input id="from" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label htmlFor="to" className="mb-1.5 block text-sm font-medium text-slate-700">Tanggal Akhir</label>
            <input id="to" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <div>
            <label htmlFor="kode_cabang" className="mb-1.5 block text-sm font-medium text-slate-700">Cabang</label>
            <select id="kode_cabang" value={kodeCabang} onChange={(event) => setKodeCabang(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="">Semua cabang</option>
              {branches.map((item) => <option key={item.kode_cabang} value={item.kode_cabang}>{item.nama_cabang} ({item.kode_cabang})</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="event" className="mb-1.5 block text-sm font-medium text-slate-700">Event</label>
            <select id="event" value={eventName} onChange={(event) => setEventName(event.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="">Semua event</option>
              {events.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2 sm:col-span-2 xl:col-span-2 xl:justify-end">
            <button type="button" onClick={() => { setMode("month"); setYear(""); setDateFrom(""); setDateTo(""); setKodeCabang(""); setEventName(""); }} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Reset Filter</button>
            <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Memuat..." : "Tampilkan Rekap"}</button>
          </div>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={cardClass()}>
          <p className="text-sm text-slate-500">Total Dokumentasi</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">{loading ? "—" : numberFormat.format(stats.total_dokumentasi)}</p>
          <p className="mt-1 text-xs text-slate-400">Sesuai filter aktif</p>
        </div>
        <div className={cardClass()}>
          <p className="text-sm text-slate-500">Cabang Mengirim</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">{loading ? "—" : numberFormat.format(stats.cabang_aktif)}</p>
          <p className="mt-1 text-xs text-slate-400">Cabang dengan dokumentasi</p>
        </div>
        <div className={cardClass()}>
          <p className="text-sm text-slate-500">Event Terkirim</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">{loading ? "—" : numberFormat.format(stats.event_aktif)}</p>
          <p className="mt-1 text-xs text-slate-400">Event dengan dokumentasi</p>
        </div>
        <div className={cardClass()}>
          <p className="text-sm text-slate-500">Hari Aktif</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900">{loading ? "—" : numberFormat.format(stats.tanggal_aktif)}</p>
          <p className="mt-1 text-xs text-slate-400">Tanggal dengan kiriman</p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-semibold text-slate-900">Data dokumentasi yang dikirim cabang</h2>
          </div>
          <span className="text-xs text-slate-500">Menampilkan {numberFormat.format(detailsShown)} dari {numberFormat.format(stats.total_dokumentasi)} data yang cocok</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {["Foto", "Cabang", "Event", "Tanggal", "Waktu Upload"].map((heading) => <th key={heading} className="px-4 py-3.5 font-semibold">{heading}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">Memuat detail dokumentasi...</td></tr>
              ) : details.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-500">Tidak ada dokumentasi yang cocok dengan filter.</td></tr>
              ) : details.map((item) => (
                <tr key={`${item.kode_cabang}-${item.id}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {item.foto ? <a href={item.foto} target="_blank" rel="noreferrer" title="Buka foto asli"><img src={item.foto} alt={`Dokumentasi ${item.id}`} loading="lazy" className="h-14 w-20 rounded border border-slate-200 object-cover" /></a> : <span className="text-slate-400">Tidak ada foto</span>}
                  </td>
                  <td className="px-4 py-3"><div className="font-medium text-slate-800">{item.nama_cabang}</div><div className="text-xs text-slate-500">{item.kode_cabang}</div></td>
                  <td className="px-4 py-3 text-slate-700">{item.nama_event}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(item.tanggal)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{(item.waktu_upload || item.tanggal).replace("T", " ").slice(0, 19)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {detailsShown >= 200 && <p className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">Pratinjau dibatasi 200 data agar halaman tetap responsif. Export Excel mengikutkan semua data sesuai filter.</p>}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="font-semibold text-slate-900">Ringkasan — {modes.find((item) => item.value === mode)?.label || "Rekap"}</h2>
            <p className="mt-1 text-sm text-slate-500">{numberFormat.format(rows.length)} baris ringkasan{lastLoaded ? ` · diperbarui ${lastLoaded}` : ""}</p>
          </div>
          <span className="text-xs text-slate-400">Geser tabel ke samping untuk melihat kolom lainnya</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>{headers.map((header) => <th key={header} className="px-4 py-3.5 font-semibold sm:px-5">{header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={headers.length} className="px-5 py-14 text-center text-slate-500">Memuat data rekap...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={headers.length} className="px-5 py-14 text-center">
                  <p className="font-medium text-slate-700">Belum ada data untuk filter ini</p>
                  <p className="mt-1 text-sm text-slate-400">Ubah filter atau periksa apakah dokumentasi sudah masuk ke database.</p>
                </td></tr>
              ) : rows.map((row, index) => <tr key={`${mode}-${index}`} className="transition hover:bg-slate-50">{renderCells(row)}</tr>)}
            </tbody>
          </table>
        </div>
      </section>

      <p className="text-xs leading-5 text-slate-400">Excel berisi sheet Ringkasan dan Detail Dokumentasi lengkap. Detail menyertakan ID, cabang, event, tanggal dokumentasi, waktu upload dari kolom timestamp yang tersedia, path foto, dan foto terkompres.</p>
    </div>
  );
}
