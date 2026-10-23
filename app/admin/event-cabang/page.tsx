"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

type Branch = { kode_cabang: string | number; nama_cabang: string; singkatan?: string };
type EventItem = { id: number | string; kode_event: string; nama_event: string; aktif?: number | boolean };
type ExistingAssignment = { id_event: number | string; kode_cabang: string | number; aktif: number | boolean };
type Config = { id_event: string; aktif: boolean; columns: [] };

function isOn(value: number | boolean | string | undefined) {
  return value === true || Number(value) === 1;
}

export default function BranchEventConfigPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [assignments, setAssignments] = useState<ExistingAssignment[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [configs, setConfigs] = useState<Config[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/event-cabang", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Gagal memuat konfigurasi.");
      setBranches(result.data.cabang || []);
      setEvents(result.data.events || []);
      setAssignments(result.data.assignments || []);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Gagal memuat konfigurasi.";
      await Swal.fire({ icon: "error", title: "Gagal memuat konfigurasi", text: message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!selectedBranch) { setConfigs([]); return; }
    const branch = String(selectedBranch);
    setConfigs(events.map((event) => {
      const assignment = assignments.find((item) =>
        String(item.kode_cabang) === branch && Number(item.id_event) === Number(event.id)
      );
      return { id_event: String(event.id), aktif: isOn(assignment?.aktif), columns: [] };
    }));
  }, [selectedBranch, events, assignments]);

  const selectedBranchInfo = branches.find((item) => String(item.kode_cabang) === selectedBranch);
  const visibleBranches = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return branches.filter((item) => !keyword ||
      [item.kode_cabang, item.nama_cabang, item.singkatan].some((v) => String(v ?? "").toLowerCase().includes(keyword)));
  }, [branches, search]);

  function updateEvent(eventId: string, active: boolean) {
    setConfigs((current) => current.map((item) => item.id_event === eventId ? { ...item, aktif: active } : item));
  }


  async function save() {
    if (!selectedBranch) { await Swal.fire({ icon: "warning", title: "Pilih cabang", text: "Pilih cabang terlebih dahulu." }); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/event-cabang", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode_cabang: selectedBranch, assignments: configs }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Gagal menyimpan konfigurasi.");
      await Swal.fire({ icon: "success", title: "Konfigurasi tersimpan", text: result.message || "Konfigurasi berhasil disimpan.", timer: 1700, showConfirmButton: false });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Gagal menyimpan konfigurasi.";
      await Swal.fire({ icon: "error", title: "Gagal menyimpan konfigurasi", text: message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 space-y-5 p-3 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Access control</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Konfigurasi Event Cabang</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Tentukan event yang bisa diakses setiap cabang dan kolom foto yang ditampilkan. Kolom Voucher Cabang A tidak akan muncul pada Cabang B kecuali diaktifkan di sini.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || saving}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Muat ulang</button>
      </header>



      {loading ? <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Memuat data cabang dan event...</div> : (
        <div className="grid min-w-0 gap-4 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:gap-6">
          <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900">Pilih Cabang</h2>
              <p className="mt-1 text-xs text-slate-500">{branches.length} cabang terdaftar</p>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari kode/nama cabang..."
                className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="max-h-[38vh] overflow-y-auto p-2 sm:max-h-[50vh] xl:max-h-[calc(100vh-18rem)]">
              {visibleBranches.map((item) => (
                <button key={String(item.kode_cabang)} type="button" onClick={() => { setSelectedBranch(String(item.kode_cabang)); }}
                  className={`mb-1 w-full rounded-lg p-3 text-left transition ${selectedBranch === String(item.kode_cabang) ? "bg-blue-50 ring-1 ring-blue-200" : "hover:bg-slate-50"}`}>
                  <span className="block text-sm font-semibold text-slate-900">{item.nama_cabang}</span>
                  <span className="mt-1 block font-mono text-xs text-slate-500">{item.kode_cabang} {item.singkatan ? `· ${item.singkatan}` : ""}</span>
                </button>
              ))}
              {visibleBranches.length === 0 && <p className="p-4 text-sm text-slate-500">Cabang tidak ditemukan.</p>}
            </div>
          </aside>

          <section className="min-w-0 space-y-4">
            {!selectedBranchInfo ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <h2 className="font-semibold text-slate-800">Belum ada cabang dipilih</h2>
                <p className="mt-1 text-sm text-slate-500">Pilih cabang untuk mengatur event dan jenis dokumentasinya.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Konfigurasi untuk</p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900">{selectedBranchInfo.nama_cabang}</h2>
                    <p className="mt-1 font-mono text-xs text-slate-500">Kode {selectedBranch}</p>
                  </div>
                  <button type="button" onClick={() => void save()} disabled={saving}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
                  </button>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">Akses Event untuk Cabang</h3>
                      <p className="mt-1 text-sm text-slate-500">Pilih event yang bisa digunakan cabang ini. Kolom foto ditetapkan di menu Data Event.</p>
                    </div>
                    <span className="text-xs font-medium text-slate-500">{configs.filter((config) => config.aktif).length} dari {configs.length} aktif</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {configs.map((config) => {
                      const event = events.find((item) => String(item.id) === config.id_event);
                      if (!event) return null;
                      return (
                        <label key={config.id_event} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${config.aktif ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                          <input type="checkbox" checked={config.aktif} onChange={(event) => updateEvent(config.id_event, event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-slate-900">{event.nama_event}</span>
                            <span className="mt-1 block font-mono text-xs text-slate-500">{event.kode_event}</span>
                          </span>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${config.aktif ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{config.aktif ? "Diizinkan" : "Tidak diizinkan"}</span>
                        </label>
                      );
                    })}
                  </div>
                  {configs.length === 0 && <p className="mt-4 text-sm text-slate-500">Belum ada event di master data.</p>}
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => void save()} disabled={saving}
                    className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                    {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
