"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Select from "react-select";
import Swal from "sweetalert2";

type Branch = { kode_cabang: string | number; nama_cabang: string; singkatan?: string };
type EventItem = { id: number | string; kode_event: string; nama_event: string; aktif?: number | boolean };
type ExistingAssignment = { id_event: number | string; kode_cabang: string | number; aktif: number | boolean };
type Config = { id_event: string; aktif: boolean };

function isOn(value: number | boolean | string | undefined) {
  return value === true || Number(value) === 1;
}

export default function BranchEventConfigPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [assignments, setAssignments] = useState<ExistingAssignment[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [configsByBranch, setConfigsByBranch] = useState<Record<string, Config[]>>({});
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


  const branchOptions = useMemo(() => branches.map((item) => ({
    value: String(item.kode_cabang),
    label: `${item.nama_cabang} · ${item.kode_cabang}${item.singkatan ? ` · ${item.singkatan}` : ""}`,
    branch: item,
  })), [branches]);

  const selectedBranchInfos = useMemo(
    () => selectedBranches.map((code) => branches.find((item) => String(item.kode_cabang) === code)).filter((item): item is Branch => Boolean(item)),
    [branches, selectedBranches]
  );

  const configs = useMemo(() => {
    if (selectedBranches.length === 1) return configsByBranch[selectedBranches[0]] || [];
    return [];
  }, [configsByBranch, selectedBranches]);

  useEffect(() => {
    if (selectedBranches.length === 0) {
      setConfigsByBranch({});
      return;
    }

    setConfigsByBranch((current) => {
      const next: Record<string, Config[]> = {};
      for (const branchCode of selectedBranches) {
        next[branchCode] = current[branchCode] || events.map((event) => {
          const assignment = assignments.find((item) =>
            String(item.kode_cabang) === branchCode && Number(item.id_event) === Number(event.id)
          );
          return { id_event: String(event.id), aktif: isOn(assignment?.aktif) };
        });
      }
      return next;
    });
  }, [selectedBranches, events, assignments]);

  function updateEvent(eventId: string, active: boolean) {
    if (selectedBranches.length !== 1) return;
    const branchCode = selectedBranches[0];
    setConfigsByBranch((current) => ({
      ...current,
      [branchCode]: (current[branchCode] || []).map((item) =>
        item.id_event === eventId ? { ...item, aktif: active } : item
      ),
    }));
  }

  async function save() {
    if (selectedBranches.length === 0) {
      await Swal.fire({ icon: "warning", title: "Pilih cabang", text: "Pilih minimal satu cabang terlebih dahulu." });
      return;
    }
    if (selectedBranches.length > 1) {
      await Swal.fire({
        icon: "info",
        title: "Pilih satu cabang untuk diedit",
        text: "Mode multi-select digunakan untuk memilih cabang dengan cepat. Pengeditan dan penyimpanan dilakukan per cabang agar konfigurasi tidak tertukar.",
      });
      return;
    }

    setSaving(true);
    const branchCode = selectedBranches[0];
    try {
      const response = await fetch("/api/admin/event-cabang", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode_cabang: branchCode, assignments: configsByBranch[branchCode] || [] }),
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
            Tentukan event yang boleh digunakan setiap cabang. Jenis kolom dokumentasi dan checklist kolom per event dikelola terpusat di menu Data Event.
          </p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || saving}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Muat ulang</button>
      </header>



      {loading ? <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Memuat data cabang dan event...</div> : (
        <div className="space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="branch-multiselect" className="mb-1.5 block text-sm font-semibold text-slate-800">Pilih Cabang</label>
                <p className="mb-2 text-xs text-slate-500">{branches.length} cabang terdaftar. Cari berdasarkan kode, nama, atau singkatan.</p>
                <Select
                  inputId="branch-multiselect"
                  isMulti
                  isSearchable
                  closeMenuOnSelect={false}
                  hideSelectedOptions={false}
                  options={branchOptions}
                  value={branchOptions.filter((option) => selectedBranches.includes(option.value))}
                  onChange={(selected) => setSelectedBranches((selected || []).map((option) => option.value))}
                  placeholder="Cari dan pilih satu atau beberapa cabang..."
                  noOptionsMessage={() => "Cabang tidak ditemukan"}
                  className="text-sm"
                  classNamePrefix="branch-select"
                  styles={{
                    control: (base, state) => ({ ...base, minHeight: 48, borderRadius: 10, borderColor: state.isFocused ? "#3b82f6" : "#cbd5e1", boxShadow: state.isFocused ? "0 0 0 3px rgba(59,130,246,.12)" : "none", ":hover": { borderColor: "#93c5fd" } }),
                    valueContainer: (base) => ({ ...base, padding: "5px 10px", gap: 4 }),
                    multiValue: (base) => ({ ...base, borderRadius: 7, backgroundColor: "#eff6ff" }),
                    multiValueLabel: (base) => ({ ...base, color: "#1d4ed8", padding: "3px 5px", fontSize: 13 }),
                    multiValueRemove: (base) => ({ ...base, color: "#1d4ed8", borderRadius: 6, ":hover": { backgroundColor: "#dbeafe", color: "#1e40af" } }),
                    menu: (base) => ({ ...base, zIndex: 30 }),
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setSelectedBranches([])} disabled={selectedBranches.length === 0 || saving}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Kosongkan</button>
                <button type="button" onClick={() => void load()} disabled={loading || saving}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Muat ulang</button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">{selectedBranches.length}</span> cabang dipilih</p>
              {selectedBranches.length > 1 && <p className="text-xs text-amber-700">Pilih satu cabang untuk mengubah dan menyimpan akses eventnya.</p>}
            </div>
          </section>

          {selectedBranchInfos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h2 className="font-semibold text-slate-800">Belum ada cabang dipilih</h2>
              <p className="mt-1 text-sm text-slate-500">Pilih cabang melalui dropdown di atas untuk melihat konfigurasi event.</p>
            </div>
          ) : selectedBranchInfos.length > 1 ? (
            <section className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900">Cabang yang dipilih</h2>
                  <p className="mt-1 text-sm text-slate-500">Pilih satu nama untuk mengedit akses event. Multi-select memudahkan pemilihan banyak cabang tanpa daftar panjang.</p>
                </div>
                <span className="text-xs font-medium text-slate-500">{selectedBranchInfos.length} cabang</span>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {selectedBranchInfos.map((branch) => (
                  <button key={String(branch.kode_cabang)} type="button" onClick={() => setSelectedBranches([String(branch.kode_cabang)])}
                    className="rounded-lg border border-slate-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50">
                    <span className="block text-sm font-semibold text-slate-900">{branch.nama_cabang}</span>
                    <span className="mt-1 block font-mono text-xs text-slate-500">{branch.kode_cabang}{branch.singkatan ? ` · ${branch.singkatan}` : ""}</span>
                    <span className="mt-2 block text-xs font-semibold text-blue-600">Klik untuk mengatur event →</span>
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <>
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Konfigurasi untuk</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">{selectedBranchInfos[0].nama_cabang}</h2>
                  <p className="mt-1 font-mono text-xs text-slate-500">Kode {selectedBranches[0]}</p>
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
        </div>
      )}
    </main>
  );
}
