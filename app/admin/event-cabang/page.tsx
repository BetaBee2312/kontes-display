"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Select from "react-select";
import Swal from "sweetalert2";

type Branch = { kode_cabang: string | number; nama_cabang: string; singkatan?: string };
type EventItem = { id: number | string; kode_event: string; nama_event: string; aktif?: number | boolean };
type ExistingAssignment = { id_event: number | string; kode_cabang: string | number; aktif: number | boolean };
type Config = { id_event: string; aktif: boolean; mixed?: boolean; enabledCount?: number };
type ActiveEventGroup = { event: EventItem; branches: Branch[] };

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

  const activeEventGroups = useMemo<ActiveEventGroup[]>(() => {
    const groups = new Map<string, ActiveEventGroup>();
    for (const assignment of assignments) {
      if (!isOn(assignment.aktif)) continue;
      const event = events.find((item) => Number(item.id) === Number(assignment.id_event));
      const branch = branches.find((item) => String(item.kode_cabang) === String(assignment.kode_cabang));
      if (!event || !branch) continue;

      const eventKey = String(event.id);
      const group = groups.get(eventKey) || { event, branches: [] };
      if (!group.branches.some((item) => String(item.kode_cabang) === String(branch.kode_cabang))) {
        group.branches.push(branch);
      }
      groups.set(eventKey, group);
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        branches: group.branches.sort((a, b) => a.nama_cabang.localeCompare(b.nama_cabang, "id")),
      }))
      .sort((a, b) => a.event.nama_event.localeCompare(b.event.nama_event, "id"));
  }, [assignments, branches, events]);

  const configs = useMemo(() => {
    if (selectedBranches.length === 1) return configsByBranch[selectedBranches[0]] || [];
    if (selectedBranches.length === 0) return [];

    return events.map((event) => {
      const activeCount = selectedBranches.reduce((count, branchCode) => {
        const branchConfig = configsByBranch[branchCode]?.find((item) => item.id_event === String(event.id));
        return count + (branchConfig?.aktif ? 1 : 0);
      }, 0);
      return {
        id_event: String(event.id),
        aktif: activeCount === selectedBranches.length,
        mixed: activeCount > 0 && activeCount < selectedBranches.length,
        enabledCount: activeCount,
      };
    });
  }, [configsByBranch, selectedBranches, events]);

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
    setConfigsByBranch((current) => {
      const next = { ...current };
      for (const branchCode of selectedBranches) {
        next[branchCode] = (current[branchCode] || []).map((item) =>
          item.id_event === eventId ? { id_event: item.id_event, aktif: active } : item
        );
      }
      return next;
    });
  }

  async function save() {
    if (selectedBranches.length === 0) {
      await Swal.fire({ icon: "warning", title: "Pilih cabang", text: "Pilih minimal satu cabang terlebih dahulu." });
      return;
    }

    const targets = selectedBranches.map((kode_cabang) => ({
      kode_cabang,
      assignments: configsByBranch[kode_cabang] || events.map((event) => ({
        id_event: String(event.id),
        aktif: isOn(assignments.find((item) =>
          String(item.kode_cabang) === kode_cabang && Number(item.id_event) === Number(event.id)
        )?.aktif),
      })),
    }));

    if (targets.length > 1) {
      const confirmation = await Swal.fire({
        icon: "question",
        title: `Terapkan konfigurasi ke ${targets.length} cabang?`,
        text: "Event yang kamu ubah akan disamakan ke semua cabang terpilih. Event dengan status campuran yang tidak diubah tetap mempertahankan status masing-masing cabang.",
        showCancelButton: true,
        confirmButtonText: `Simpan ke ${targets.length} cabang`,
        cancelButtonText: "Batal",
        confirmButtonColor: "#2563eb",
      });
      if (!confirmation.isConfirmed) return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/event-cabang", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branches: targets }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Gagal menyimpan konfigurasi.");
      await Swal.fire({
        icon: "success",
        title: "Konfigurasi tersimpan",
        text: result.message || `Konfigurasi berhasil disimpan ke ${targets.length} cabang.`,
        timer: 1800,
        showConfirmButton: false,
      });
      await load();
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
              {selectedBranches.length > 1 && <p className="text-xs text-blue-700">Mode bulk aktif: perubahan event akan diterapkan ke semua cabang terpilih.</p>}
            </div>
          </section>

          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <h2 className="font-semibold text-slate-900">Cabang dengan Event Aktif</h2>
                <p className="mt-1 text-sm text-slate-500">Daftar hak akses event saat ini, dikelompokkan berdasarkan event yang berjalan di masing-masing cabang.</p>
              </div>
              <span className="text-xs font-medium text-slate-500">{activeEventGroups.length} event aktif</span>
            </div>
            {activeEventGroups.length === 0 ? (
              <div className="p-8 text-center">
                <p className="font-medium text-slate-700">Belum ada cabang yang memiliki event aktif</p>
                <p className="mt-1 text-sm text-slate-500">Aktifkan event di atas lalu simpan konfigurasi untuk melihat rekapnya di sini.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeEventGroups.map(({ event, branches: eventBranches }) => (
                  <details key={String(event.id)} className="group" open={activeEventGroups.length <= 3}>
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 transition hover:bg-slate-50 sm:px-5">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">EV</span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-900">{event.nama_event}</span>
                        <span className="mt-0.5 block font-mono text-xs text-slate-500">{event.kode_event}</span>
                      </span>
                      <span className="whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{eventBranches.length} cabang</span>
                      <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
                    </summary>
                    <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 sm:px-5">
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {eventBranches.map((branch) => (
                          <div key={String(branch.kode_cabang)} className="rounded-lg border border-slate-200 bg-white px-3.5 py-3">
                            <span className="block text-sm font-medium text-slate-800">{branch.nama_cabang}</span>
                            <span className="mt-1 block font-mono text-xs text-slate-500">{branch.kode_cabang}{branch.singkatan ? ` · ${branch.singkatan}` : ""}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>

          {selectedBranchInfos.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h2 className="font-semibold text-slate-800">Belum ada cabang dipilih</h2>
              <p className="mt-1 text-sm text-slate-500">Pilih satu atau beberapa cabang di dropdown untuk mengatur akses event.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                    {selectedBranches.length > 1 ? `Bulk konfigurasi · ${selectedBranches.length} cabang` : "Konfigurasi untuk"}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900">
                    {selectedBranches.length === 1 ? selectedBranchInfos[0].nama_cabang : `${selectedBranchInfos.length} cabang dipilih`}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {selectedBranches.length === 1
                      ? `Kode ${selectedBranches[0]}`
                      : selectedBranchInfos.slice(0, 4).map((item) => item.nama_cabang).join(", ") + (selectedBranchInfos.length > 4 ? `, dan ${selectedBranchInfos.length - 4} lainnya` : "")}
                  </p>
                </div>
                <button type="button" onClick={() => void save()} disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Menyimpan..." : selectedBranches.length > 1 ? `Simpan ke ${selectedBranches.length} Cabang` : "Simpan Konfigurasi"}
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">Akses Event {selectedBranches.length > 1 ? "untuk Semua Cabang Terpilih" : "untuk Cabang"}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {selectedBranches.length > 1
                        ? "Centang atau hapus centang event untuk menerapkan status yang sama ke seluruh cabang. Status campuran yang tidak disentuh tidak akan diubah."
                        : "Pilih event yang bisa digunakan cabang ini. Kolom foto ditetapkan di menu Data Event."}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {selectedBranches.length > 1
                      ? `${configs.filter((config) => config.aktif).length} event aktif di semua cabang · ${configs.filter((config) => config.mixed).length} status campuran`
                      : `${configs.filter((config) => config.aktif).length} dari ${configs.length} aktif`}
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {configs.map((config) => {
                    const event = events.find((item) => String(item.id) === config.id_event);
                    if (!event) return null;
                    const eventLabel = config.mixed
                      ? `Berbeda antar-cabang (${config.enabledCount}/${selectedBranches.length} aktif)`
                      : selectedBranches.length > 1
                        ? config.aktif ? "Diizinkan untuk semua" : "Tidak diizinkan untuk semua"
                        : config.aktif ? "Diizinkan" : "Tidak diizinkan";
                    return (
                      <label key={config.id_event} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${config.mixed ? "border-amber-200 bg-amber-50/60" : config.aktif ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                        <input
                          type="checkbox"
                          checked={config.aktif}
                          ref={(node) => { if (node) node.indeterminate = Boolean(config.mixed); }}
                          onChange={(event) => updateEvent(config.id_event, event.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-900">{event.nama_event}</span>
                          <span className="mt-1 block font-mono text-xs text-slate-500">{event.kode_event}</span>
                        </span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${config.mixed ? "bg-amber-100 text-amber-800" : config.aktif ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{eventLabel}</span>
                      </label>
                    );
                  })}
                </div>
                {configs.length === 0 && <p className="mt-4 text-sm text-slate-500">Belum ada event di master data.</p>}
              </div>
              <div className="flex justify-end">
                <button type="button" onClick={() => void save()} disabled={saving}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
                  {saving ? "Menyimpan..." : selectedBranches.length > 1 ? `Simpan ke ${selectedBranches.length} Cabang` : "Simpan Konfigurasi"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}
