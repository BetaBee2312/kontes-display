"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

type EventItem = {
  id: string | number;
  kode_event: string;
  nama_event: string;
};

type EventForm = {
  kode_event: string;
  nama_event: string;
};
type PhotoField = { id: number | string; kode_kolom: string; nama_kolom: string; aktif: number | boolean };
type EventPhotoField = { id_jenis_dokumentasi: string; aktif: boolean; wajib: boolean; urutan: number };



const emptyForm: EventForm = {
  kode_event: "",
  nama_event: "",
};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function readResponse(response: Response) {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(
      `Server mengembalikan respons yang tidak valid (HTTP ${response.status}). Periksa terminal Next.js.`
    );
  }
}

export default function EventAdminPage() {
  const [eventList, setEventList] = useState<EventItem[]>([]);
  const [photoFields, setPhotoFields] = useState<PhotoField[]>([]);
  const [eventFields, setEventFields] = useState<Record<string, EventPhotoField[]>>({});
  const [fieldSearch, setFieldSearch] = useState("");

  const [form, setForm] = useState<EventForm>(emptyForm);
  const [search, setSearch] = useState("");
  const [editingKode, setEditingKode] = useState<string | null>(null);
  const [codeTouched, setCodeTouched] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingKode, setDeletingKode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/event", { cache: "no-store" });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.message || "Gagal mengambil data event.");
      setEventList(Array.isArray(result.data) ? result.data : []);
      await loadPhotoFields();
    } catch (err) {
      await Swal.fire({ icon: "error", title: "Gagal memuat event", text: err instanceof Error ? err.message : "Gagal mengambil data event." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);
  async function loadPhotoFields() {
    const response = await fetch("/api/admin/event-cabang", { cache: "no-store" });
    const result = await readResponse(response);
    if (!response.ok || !result.success) throw new Error(result.message || "Gagal mengambil jenis dokumentasi.");
    const fields = (result.data.fields || []) as PhotoField[];
    const mappings = (result.data.eventFields || []) as Array<{
      id_event: number | string; id_jenis_dokumentasi: number | string; aktif: number | boolean; wajib: number | boolean; urutan: number;
    }>;
    setPhotoFields(fields);
    const map: Record<string, EventPhotoField[]> = {};
    for (const event of eventList) {
      map[String(event.id)] = fields.map((field, index) => {
        const existing = mappings.find((item) => Number(item.id_event) === Number(event.id) && Number(item.id_jenis_dokumentasi) === Number(field.id));
        return {
          id_jenis_dokumentasi: String(field.id),
          aktif: existing ? Number(existing.aktif) === 1 || existing.aktif === true : false,
          wajib: existing ? Number(existing.wajib) === 1 || existing.wajib === true : true,
          urutan: existing ? Number(existing.urutan) : index,
        };
      });
    }
    setEventFields(map);
  }

  function toggleEventField(eventId: string, fieldId: string, checked: boolean) {
    setEventFields((current) => ({
      ...current,
      [eventId]: (current[eventId] || photoFields.map((field, index) => ({
        id_jenis_dokumentasi: String(field.id), aktif: false, wajib: true, urutan: index,
      }))).map((item) => item.id_jenis_dokumentasi === fieldId ? { ...item, aktif: checked } : item),
    }));
  }

  function toggleFieldRequired(eventId: string, fieldId: string, checked: boolean) {
    setEventFields((current) => ({
      ...current,
      [eventId]: (current[eventId] || []).map((item) => item.id_jenis_dokumentasi === fieldId ? { ...item, wajib: checked } : item),
    }));
  }

  async function saveEventFields(item: EventItem) {
    const fields = eventFields[String(item.id)] || [];
    setSaving(true);
    try {
      const response = await fetch("/api/admin/event-cabang", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_event: item.id,
          columns: fields.map((field) => ({ ...field, id_jenis_dokumentasi: Number(field.id_jenis_dokumentasi) })),
        }),
      });
      const result = await readResponse(response);
      if (!response.ok || !result.success) throw new Error(result.message || "Gagal menyimpan kolom event.");
      await loadPhotoFields();
      await Swal.fire({ icon: "success", title: "Kolom event tersimpan", text: `Kolom dokumentasi untuk "${item.nama_event}" berhasil diperbarui.`, timer: 1500, showConfirmButton: false });
    } catch (err) {
      await Swal.fire({ icon: "error", title: "Gagal menyimpan kolom event", text: err instanceof Error ? err.message : "Gagal menyimpan konfigurasi kolom event." });
    } finally {
      setSaving(false);
    }
  }



  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return eventList;
    return eventList.filter((item) =>
      [item.kode_event, item.nama_event].some((value) =>
        String(value ?? "").toLowerCase().includes(keyword)
      )
    );
  }, [eventList, search]);

  function openCreate() {
    setEditingKode(null);
    setForm(emptyForm);
    setCodeTouched(false);
    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  function openEdit(item: EventItem) {
    setEditingKode(item.kode_event);
    setForm({ kode_event: item.kode_event, nama_event: item.nama_event });
    setCodeTouched(true);
    setError("");
    setSuccess("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving) return;
    setFormOpen(false);
    setEditingKode(null);
    setForm(emptyForm);
    setCodeTouched(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const nama = form.nama_event.trim();
    const kode = slugify(form.kode_event);
    if (!nama || !kode) {
      await Swal.fire({ icon: "warning", title: "Data belum lengkap", text: "Nama event dan kode event wajib diisi." });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/event", {
        method: editingKode === null ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_kode_event: editingKode,
          kode_event: kode,
          nama_event: nama,
        }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.message || "Gagal menyimpan event.");
      await Swal.fire({ icon: "success", title: "Event tersimpan", text: result.message || "Event berhasil disimpan.", timer: 1600, showConfirmButton: false });
      setFormOpen(false);
      setEditingKode(null);
      setForm(emptyForm);
      setCodeTouched(false);
      await loadEvents();
    } catch (err) {
      await Swal.fire({ icon: "error", title: "Gagal menyimpan event", text: err instanceof Error ? err.message : "Gagal menyimpan event." });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: EventItem) {
    const confirmation = await Swal.fire({ icon: "warning", title: "Hapus event?", text: `Hapus event "${item.nama_event}" (${item.kode_event})? Pastikan tidak ada dokumentasi yang masih membutuhkannya.`, showCancelButton: true, confirmButtonText: "Ya, hapus", cancelButtonText: "Batal", confirmButtonColor: "#dc2626", reverseButtons: true });
    if (!confirmation.isConfirmed) return;

    setError("");
    setSuccess("");
    setDeletingKode(item.kode_event);
    try {
      const response = await fetch("/api/admin/event", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kode_event: item.kode_event }),
      });
      const result = await readResponse(response);
      if (!response.ok) throw new Error(result.message || "Gagal menghapus event.");
      await Swal.fire({ icon: "success", title: "Event dihapus", text: result.message || "Event berhasil dihapus.", timer: 1600, showConfirmButton: false });
      await loadEvents();
    } catch (err) {
      await Swal.fire({ icon: "error", title: "Gagal menghapus event", text: err instanceof Error ? err.message : "Gagal menghapus event." });
    } finally {
      setDeletingKode(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-5 p-3 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Data Event</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Kelola master event dan tentukan jenis kolom dokumentasi yang tersedia untuk setiap event. Cabang hanya mengatur akses ke event.</p>
        </div>
        <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100">
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Tambah Event
        </button>
      </div>



      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total Event</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{loading ? "—" : eventList.length.toLocaleString("id-ID")}</p>
          <p className="mt-1 text-xs text-slate-400">Data dari tb_event</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Hasil Pencarian</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{loading ? "—" : filteredEvents.length.toLocaleString("id-ID")}</p>
          <p className="mt-1 text-xs text-slate-400">Event sesuai kata kunci</p>
        </div>
      </div>

      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h2 className="font-semibold text-slate-900">Daftar Event</h2>
            <p className="mt-1 text-sm text-slate-500">Cari berdasarkan nama atau kode event.</p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <svg aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari event..." className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
          </div>
        </div>



        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Kode Event</th>
                <th className="px-5 py-4 font-semibold">Nama Event</th>
                <th className="px-5 py-4 text-right font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={3} className="px-5 py-14 text-center text-slate-500">Memuat data event...</td></tr>
              ) : filteredEvents.length === 0 ? (
                <tr><td colSpan={3} className="px-5 py-14 text-center">
                  <p className="font-medium text-slate-700">{search ? "Event tidak ditemukan" : "Belum ada data event"}</p>
                  <p className="mt-1 text-sm text-slate-400">{search ? "Coba kata kunci lain." : "Tambahkan event pertama untuk memulai."}</p>
                </td></tr>
              ) : filteredEvents.map((item) => (
                <tr key={String(item.id ?? item.kode_event)} className="transition hover:bg-slate-50/80">
                  <td className="whitespace-nowrap px-5 py-4"><span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 font-mono text-xs font-semibold text-slate-700">{item.kode_event}</span></td>
                  <td className="px-5 py-4 font-medium text-slate-900">{item.nama_event}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEdit(item)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100">Edit</button>
                      <button type="button" onClick={() => void handleDelete(item)} disabled={deletingKode === item.kode_event} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50">{deletingKode === item.kode_event ? "Menghapus..." : "Hapus"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-1 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>Menampilkan {filteredEvents.length} dari {eventList.length} event</span>
          <button type="button" onClick={() => void loadEvents()} className="self-start font-semibold text-blue-600 hover:text-blue-700 sm:self-auto">Muat ulang data</button>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600">Konfigurasi dokumentasi</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">Kolom Foto per Event</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">Checklist ini berlaku untuk semua cabang. Di menu Konfigurasi Event Cabang, administrator cukup menentukan cabang mana yang mendapat akses ke event.</p>
          </div>
          <input value={fieldSearch} onChange={(event) => setFieldSearch(event.target.value)} placeholder="Cari jenis kolom..." className={`${inputClass} sm:max-w-xs`} />
        </div>
        {photoFields.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Belum ada master jenis dokumentasi. Tambahkan Hangmob, Voucher, Floor Display, dan lainnya dari menu Konfigurasi Event Cabang.</div>
        ) : eventList.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">Buat event terlebih dahulu, lalu tentukan kolom fotonya di sini.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredEvents.map((item) => {
              const rows = (eventFields[String(item.id)] || photoFields.map((field, index) => ({
                id_jenis_dokumentasi: String(field.id), aktif: false, wajib: true, urutan: index,
              }))).filter((row) => {
                const field = photoFields.find((fieldItem) => String(fieldItem.id) === row.id_jenis_dokumentasi);
                const keyword = fieldSearch.trim().toLowerCase();
                return !keyword || [field?.nama_kolom, field?.kode_kolom].some((value) => String(value || "").toLowerCase().includes(keyword));
              });
              const enabledCount = (eventFields[String(item.id)] || []).filter((row) => row.aktif).length;
              return (
                <article key={String(item.id)} className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900">{item.nama_event}</h3>
                      <p className="mt-1 font-mono text-xs text-slate-500">{item.kode_event} · {enabledCount} kolom aktif</p>
                    </div>
                    <button type="button" onClick={() => void saveEventFields(item)} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan kolom event"}</button>
                  </div>
                  <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {rows.map((row) => {
                      const field = photoFields.find((fieldItem) => String(fieldItem.id) === row.id_jenis_dokumentasi);
                      if (!field) return null;
                      return (
                        <div key={row.id_jenis_dokumentasi} className={`rounded-xl border p-3 transition ${row.aktif ? "border-blue-300 bg-blue-50/60" : "border-slate-200 bg-white"}`}>
                          <label className="flex cursor-pointer items-start gap-3">
                            <input type="checkbox" checked={row.aktif} onChange={(event) => toggleEventField(String(item.id), row.id_jenis_dokumentasi, event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-slate-900">{field.nama_kolom}</span>
                              <span className="mt-1 block font-mono text-xs text-slate-500">{field.kode_kolom}</span>
                            </span>
                          </label>
                          {row.aktif && <label className="mt-3 flex items-center gap-2 pl-7 text-xs text-slate-600"><input type="checkbox" checked={row.wajib} onChange={(event) => toggleFieldRequired(String(item.id), row.id_jenis_dokumentasi, event.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600" />Wajib diupload</label>}
                        </div>
                      );
                    })}
                    {rows.length === 0 && <p className="col-span-full text-sm text-slate-500">Tidak ada jenis kolom yang cocok dengan pencarian.</p>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/35 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="event-form-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Master Data</p>
                <h2 id="event-form-title" className="mt-1 text-xl font-semibold text-slate-900">{editingKode === null ? "Tambah Event" : "Edit Event"}</h2>
                <p className="mt-1 text-sm text-slate-500">Kode event digunakan sebagai identitas event di sistem.</p>
              </div>
              <button type="button" onClick={closeForm} disabled={saving} aria-label="Tutup form" className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5 sm:px-6">

              <div>
                <label htmlFor="nama_event" className="mb-1.5 block text-sm font-medium text-slate-700">Nama Event *</label>
                <input id="nama_event" value={form.nama_event} onChange={(event) => setForm((current) => ({ ...current, nama_event: event.target.value, kode_event: codeTouched ? current.kode_event : slugify(event.target.value) }))} required className={inputClass} placeholder="Contoh: Milkypedia" />
              </div>
              <div>
                <label htmlFor="kode_event" className="mb-1.5 block text-sm font-medium text-slate-700">Kode Event *</label>
                <input id="kode_event" value={form.kode_event} onChange={(event) => { setCodeTouched(true); setForm((current) => ({ ...current, kode_event: slugify(event.target.value) })); }} required className={inputClass} placeholder="Contoh: milkypedia" />
                <p className="mt-1.5 text-xs text-slate-400">Gunakan huruf kecil, angka, dan garis bawah. Kode otomatis mengikuti nama event sampai diedit manual.</p>
              </div>
              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeForm} disabled={saving} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Batal</button>
                <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Menyimpan..." : editingKode === null ? "Simpan Event" : "Simpan Perubahan"}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
