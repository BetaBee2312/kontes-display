"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Branch = { kode_cabang: string | number; nama_cabang: string; singkatan?: string };
type EventItem = { id: number | string; kode_event: string; nama_event: string; aktif?: number | boolean };
type Field = { id: number | string; kode_kolom: string; nama_kolom: string; aktif: number | boolean };
type ExistingAssignment = { id_event: number | string; kode_cabang: string | number; aktif: number | boolean };
type ExistingField = {
  id_event: number | string; kode_cabang: string | number; id_jenis_dokumentasi: number | string;
  aktif: number | boolean; wajib: number | boolean; urutan: number;
};
type Config = {
  id_event: string;
  aktif: boolean;
  columns: Array<{ id_jenis_dokumentasi: string; aktif: boolean; wajib: boolean; urutan: number }>;
};

function isOn(value: number | boolean | string | undefined) {
  return value === true || Number(value) === 1;
}

export default function BranchEventConfigPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [assignments, setAssignments] = useState<ExistingAssignment[]>([]);
  const [fieldAssignments, setFieldAssignments] = useState<ExistingField[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [configs, setConfigs] = useState<Config[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/event-cabang", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Gagal memuat konfigurasi.");
      setBranches(result.data.cabang || []);
      setEvents(result.data.events || []);
      setFields(result.data.fields || []);
      setAssignments(result.data.assignments || []);
      setFieldAssignments(result.data.fieldAssignments || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat konfigurasi.");
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
      const columns = fields.map((field, index) => {
        const existing = fieldAssignments.find((item) =>
          String(item.kode_cabang) === branch &&
          Number(item.id_event) === Number(event.id) &&
          Number(item.id_jenis_dokumentasi) === Number(field.id)
        );
        return {
          id_jenis_dokumentasi: String(field.id),
          aktif: isOn(existing?.aktif),
          wajib: existing ? isOn(existing.wajib) : true,
          urutan: existing ? Number(existing.urutan) : index,
        };
      });
      return { id_event: String(event.id), aktif: isOn(assignment?.aktif), columns };
    }));
  }, [selectedBranch, events, fields, assignments, fieldAssignments]);

  const selectedBranchInfo = branches.find((item) => String(item.kode_cabang) === selectedBranch);
  const visibleBranches = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return branches.filter((item) => !keyword ||
      [item.kode_cabang, item.nama_cabang, item.singkatan].some((v) => String(v ?? "").toLowerCase().includes(keyword)));
  }, [branches, search]);

  function updateEvent(eventId: string, active: boolean) {
    setConfigs((current) => current.map((item) => item.id_event === eventId
      ? { ...item, aktif: active, columns: item.columns.map((col) => ({ ...col, aktif: active ? col.aktif : false })) }
      : item));
  }

  function updateColumn(eventId: string, fieldId: string, changes: Partial<Config["columns"][number]>) {
    setConfigs((current) => current.map((item) => item.id_event !== eventId ? item : {
      ...item,
      columns: item.columns.map((col) => col.id_jenis_dokumentasi === fieldId ? { ...col, ...changes } : col),
    }));
  }

  async function save() {
    if (!selectedBranch) { setError("Pilih cabang terlebih dahulu."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/event-cabang", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode_cabang: selectedBranch, assignments: configs }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Gagal menyimpan konfigurasi.");
      setMessage(result.message || "Konfigurasi berhasil disimpan.");
      await load();
      // Keep the currently selected branch visible after refresh.
      setSelectedBranch((current) => current);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan konfigurasi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
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

      {(error || message) && <div role="status" className={`rounded-xl border px-4 py-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || message}</div>}

      {loading ? <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Memuat data cabang dan event...</div> : (
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <h2 className="font-semibold text-slate-900">Pilih Cabang</h2>
              <p className="mt-1 text-xs text-slate-500">{branches.length} cabang terdaftar</p>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari kode/nama cabang..."
                className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-2">
              {visibleBranches.map((item) => (
                <button key={String(item.kode_cabang)} type="button" onClick={() => { setSelectedBranch(String(item.kode_cabang)); setError(""); setMessage(""); }}
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

                {events.length === 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Belum ada event di master data. Tambahkan event terlebih dahulu.</div>}

                {configs.map((config) => {
                  const event = events.find((item) => String(item.id) === config.id_event);
                  if (!event) return null;
                  return (
                    <article key={config.id_event} className={`overflow-hidden rounded-xl border bg-white ${config.aktif ? "border-blue-200" : "border-slate-200"}`}>
                      <div className="flex items-start gap-3 border-b border-slate-200 p-4 sm:p-5">
                        <input type="checkbox" checked={config.aktif} onChange={(e) => updateEvent(config.id_event, e.target.checked)}
                          aria-label={`Aktifkan event ${event.nama_event}`} className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600" />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-slate-900">{event.nama_event}</h3>
                          <p className="mt-1 text-xs text-slate-500">{event.kode_event} · {config.aktif ? "Event diberikan ke cabang ini" : "Event tidak dapat diakses cabang ini"}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${config.aktif ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{config.aktif ? "Aktif" : "Nonaktif"}</span>
                      </div>
                      <div className="p-4 sm:p-5">
                        <p className="mb-3 text-sm font-semibold text-slate-800">Kolom foto yang ditampilkan</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {config.columns.map((col) => {
                            const field = fields.find((item) => String(item.id) === col.id_jenis_dokumentasi);
                            if (!field) return null;
                            return (
                              <div key={col.id_jenis_dokumentasi} className={`rounded-lg border p-3 ${col.aktif && config.aktif ? "border-blue-200 bg-blue-50/40" : "border-slate-200"}`}>
                                <label className="flex cursor-pointer items-start gap-2.5">
                                  <input type="checkbox" checked={col.aktif} disabled={!config.aktif || !isOn(field.aktif)}
                                    onChange={(e) => updateColumn(config.id_event, col.id_jenis_dokumentasi, { aktif: e.target.checked })}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600" />
                                  <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-semibold text-slate-800">{field.nama_kolom}</span>
                                    <span className="mt-1 block font-mono text-xs text-slate-500">{field.kode_kolom}</span>
                                  </span>
                                </label>
                                {col.aktif && config.aktif && <label className="mt-3 flex items-center gap-2 pl-6 text-xs text-slate-600">
                                  <input type="checkbox" checked={col.wajib} onChange={(e) => updateColumn(config.id_event, col.id_jenis_dokumentasi, { wajib: e.target.checked })}
                                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600" />
                                  Wajib diupload
                                </label>}
                              </div>
                            );
                          })}
                        </div>
                        {config.aktif && !config.columns.some((col) => col.aktif) && <p className="mt-3 text-xs text-amber-700">Event aktif tanpa kolom foto. Cabang tetap perlu minimal satu kolom agar dapat mengirim dokumentasi.</p>}
                      </div>
                    </article>
                  );
                })}
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
