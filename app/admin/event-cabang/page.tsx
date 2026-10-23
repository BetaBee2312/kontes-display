"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

type Branch = { kode_cabang: string | number; nama_cabang: string; singkatan?: string };
type EventItem = { id: number | string; kode_event: string; nama_event: string; aktif?: number | boolean };
type Field = { id: number | string; kode_kolom: string; nama_kolom: string; aktif: number | boolean };
type ExistingAssignment = { id_event: number | string; kode_cabang: string | number; aktif: number | boolean };
type ExistingField = {
  id_event: number | string; kode_cabang: string | number; id_jenis_dokumentasi: number | string;
  aktif: number | boolean; wajib: number | boolean; urutan: number;
};
type Config = { id_event: string; aktif: boolean; columns: [] };

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
  const [fieldNameDraft, setFieldNameDraft] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
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


  async function refreshConfig() {
    const response = await fetch("/api/admin/event-cabang", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "Gagal memuat ulang data.");
    setBranches(result.data.cabang || []);
    setEvents(result.data.events || []);
    setFields(result.data.fields || []);
    setAssignments(result.data.assignments || []);
    setFieldAssignments(result.data.fieldAssignments || []);
  }

  function makeFieldCode(value: string) {
    return value.toLowerCase().trim().normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50);
  }

  const normalizedFieldName = fieldNameDraft.trim().toLowerCase();
  const draftCode = makeFieldCode(fieldNameDraft);
  const duplicateField = fields.find((field) =>
    field.kode_kolom.toLowerCase() === draftCode ||
    field.nama_kolom.trim().toLowerCase() === normalizedFieldName
  );

  async function addField() {
    const name = fieldNameDraft.trim();
    const code = makeFieldCode(name);
    if (!name || !code) {
      await Swal.fire({ icon: "warning", title: "Nama kolom tidak valid", text: "Masukkan nama yang terdiri dari huruf atau angka." });
      return;
    }
    const duplicate = fields.find((field) =>
      field.kode_kolom.toLowerCase() === code ||
      field.nama_kolom.trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      await Swal.fire({
        icon: "warning",
        title: "Kolom sudah tersedia",
        text: `"${duplicate.nama_kolom}" sudah terdaftar dengan kode "${duplicate.kode_kolom}". Gunakan nama lain atau kelola kolom yang sudah ada.`,
      });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/admin/event-cabang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-field", kode_kolom: code, nama_kolom: name }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Gagal menambah kolom foto.");
      setFieldNameDraft("");
      await refreshConfig();
      await Swal.fire({ icon: "success", title: "Kolom foto ditambahkan", text: result.message || "Kolom foto berhasil ditambahkan.", timer: 1500, showConfirmButton: false });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Gagal menambah kolom foto.";
      await Swal.fire({ icon: "error", title: "Gagal menambah kolom", text: message });
    } finally {
      setSaving(false);
    }
  }

  async function deleteField(field: Field) {
    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Hapus jenis kolom foto?",
      html: `Jenis <strong>${field.nama_kolom}</strong> (<code>${field.kode_kolom}</code>) akan dihapus hanya jika belum dipakai konfigurasi cabang/event.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
    });
    if (!confirmation.isConfirmed) return;
    setSaving(true);
    try {
      const response = await fetch("/api/admin/event-cabang", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_jenis_dokumentasi: field.id }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Gagal menghapus kolom foto.");
      await refreshConfig();
      await Swal.fire({ icon: "success", title: "Kolom foto dihapus", text: result.message || "Kolom foto berhasil dihapus.", timer: 1500, showConfirmButton: false });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Gagal menghapus kolom foto.";
      await Swal.fire({ icon: "error", title: "Tidak dapat menghapus kolom", text: message });
    } finally {
      setSaving(false);
    }
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

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Jenis Kolom Foto</h3>
                  <p className="mt-1 text-xs text-slate-500">Tambahkan jenis dokumentasi baru. Setelah dibuat, aktifkan pada event cabang yang membutuhkannya.</p>
                  <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void addField(); }}>
                    <div className="min-w-0 flex-1">
                      <label htmlFor="new-photo-field" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Nama jenis dokumentasi</label>
                      <input id="new-photo-field" value={fieldNameDraft} onChange={(event) => setFieldNameDraft(event.target.value)} maxLength={100} placeholder="Contoh: Foto Rak Promo" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                      <p className="mt-1.5 text-xs text-slate-500">Kode otomatis: <span className="font-mono">{draftCode || "nama_kolom"}</span></p>
                      {duplicateField && <p className="mt-1 text-xs font-medium text-amber-700">Nama/kode sudah ada: {duplicateField.nama_kolom} ({duplicateField.kode_kolom})</p>}
                    </div>
                    <button type="submit" disabled={saving || !fieldNameDraft.trim() || !draftCode || Boolean(duplicateField)} className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 sm:self-end">
                      {saving ? "Memproses..." : "Tambah kolom"}
                    </button>
                  </form>
                  <div className="mt-5 border-t border-slate-100 pt-4">
                    <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <h4 className="text-sm font-semibold text-slate-800">Master kolom foto</h4>
                      <span className="text-xs text-slate-500">{fields.length} jenis terdaftar</span>
                    </div>
                    {fields.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">Belum ada jenis dokumentasi.</p>
                    ) : (
                      <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {fields.map((field) => {
                          const usageCount = fieldAssignments.filter((item) => Number(item.id_jenis_dokumentasi) === Number(field.id)).length;
                          return (
                            <div key={String(field.id)} className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
                              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">
                                {field.nama_kolom.trim().slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-900">{field.nama_kolom}</p>
                                <p className="mt-1 truncate font-mono text-xs text-slate-500">{field.kode_kolom}</p>
                                <p className="mt-1 text-[11px] text-slate-400">{usageCount ? `Terkait ${usageCount} konfigurasi` : "Belum digunakan"}</p>
                              </div>
                              <button type="button" onClick={() => void deleteField(field)} disabled={saving || usageCount > 0} title={usageCount > 0 ? "Nonaktifkan dari konfigurasi event terlebih dahulu" : "Hapus jenis dokumentasi"} aria-label={`Hapus ${field.nama_kolom}`} className="shrink-0 rounded-lg border border-red-200 px-2.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-30">Hapus</button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
                {events.length === 0 && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Belum ada event di master data. Tambahkan event terlebih dahulu.</div>}

                <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-900">Akses Event untuk Cabang</h3>
                      <p className="mt-1 text-sm text-slate-500">Pilih event yang bisa digunakan cabang ini. Kolom dokumentasi diatur terpusat dari menu Data Event.</p>
                    </div>
                    <span className="text-xs font-medium text-slate-500">{configs.filter((config) => config.aktif).length} dari {configs.length} event aktif</span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {configs.map((config) => {
                      const event = events.find((item) => String(item.id) === config.id_event);
                      if (!event) return null;
                      return (
                        <label key={config.id_event} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${config.aktif ? "border-blue-200 bg-blue-50/60" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                          <input type="checkbox" checked={config.aktif} onChange={(event) => updateEvent(config.id_event, event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
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
