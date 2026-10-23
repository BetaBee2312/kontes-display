"use client";



import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";



type Cabang = {

  kode_cabang: string | number;

  nama_cabang: string;

  singkatan: string;

  dc_support: string | null;

  cluster: string | null;

};



type CabangForm = {

  kode_cabang: string;

  nama_cabang: string;

  singkatan: string;

  dc_support: string;

  cluster: string;

};



const emptyForm: CabangForm = {

  kode_cabang: "",

  nama_cabang: "",

  singkatan: "",

  dc_support: "",

  cluster: "",

};



const inputClass =

  "w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100";



export default function CabangAdminPage() {

  const [cabangList, setCabangList] = useState<Cabang[]>([]);

  const [form, setForm] = useState<CabangForm>(emptyForm);

  const [search, setSearch] = useState("");

  const [editingKode, setEditingKode] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [deletingKode, setDeletingKode] = useState<string | null>(null);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkEditing, setBulkEditing] = useState(false);
  const [bulkEditDcEnabled, setBulkEditDcEnabled] = useState(false);
  const [bulkEditDc, setBulkEditDc] = useState("");
  const [bulkEditClusterEnabled, setBulkEditClusterEnabled] = useState(false);
  const [bulkEditCluster, setBulkEditCluster] = useState("");

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");



  const loadCabang = useCallback(async () => {

    setLoading(true);

    setError("");

    try {

      const response = await fetch("/api/admin/cabang", {

        cache: "no-store",

      });

      const result = await response.json();

      if (!response.ok) {

        throw new Error(result.message || "Gagal mengambil data cabang.");

      }

      setCabangList(Array.isArray(result.data) ? result.data : []);

    } catch (err) {

      await Swal.fire({ icon: "error", title: "Gagal memuat cabang", text: err instanceof Error ? err.message : "Gagal mengambil data cabang." });

    } finally {

      setLoading(false);

    }

  }, []);



  useEffect(() => {

    void loadCabang();

  }, [loadCabang]);



  const filteredCabang = useMemo(() => {

    const keyword = search.trim().toLowerCase();

    if (!keyword) return cabangList;

    return cabangList.filter((item) =>

      [item.kode_cabang, item.nama_cabang, item.singkatan, item.dc_support, item.cluster]

        .some((value) => String(value ?? "").toLowerCase().includes(keyword)),

    );

  }, [cabangList, search]);

  const allVisibleSelected =
    filteredCabang.length > 0 &&
    filteredCabang.every((item) =>
      selectedCodes.includes(String(item.kode_cabang)),
    );

  function toggleCabang(kode: string) {
    setSelectedCodes((current) =>
      current.includes(kode)
        ? current.filter((item) => item !== kode)
        : [...current, kode],
    );
  }

  function toggleAllVisible() {
    const visibleCodes = filteredCabang.map((item) => String(item.kode_cabang));
    if (allVisibleSelected) {
      setSelectedCodes((current) => current.filter((kode) => !visibleCodes.includes(kode)));
    } else {
      setSelectedCodes((current) => Array.from(new Set([...current, ...visibleCodes])));
    }
  }

  function openCreate() {

    setEditingKode(null);

    setForm(emptyForm);

    setError("");

    setSuccess("");

    setFormOpen(true);

  }



  function openEdit(item: Cabang) {

    setEditingKode(String(item.kode_cabang));

    setForm({

      kode_cabang: String(item.kode_cabang),

      nama_cabang: item.nama_cabang ?? "",

      singkatan: item.singkatan ?? "",

      dc_support: item.dc_support ?? "",

      cluster: item.cluster ?? "",

    });

    setError("");

    setSuccess("");

    setFormOpen(true);

  }



  function closeForm() {

    if (saving) return;

    setFormOpen(false);

    setEditingKode(null);

    setForm(emptyForm);

  }



  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {

    event.preventDefault();

    setError("");

    setSuccess("");



    if (!form.kode_cabang.trim() || !form.nama_cabang.trim() || !form.singkatan.trim()) {

      await Swal.fire({ icon: "warning", title: "Data belum lengkap", text: "Kode cabang, nama cabang, dan singkatan wajib diisi." });
      return;

    }



    setSaving(true);

    try {

      const response = await fetch("/api/admin/cabang", {

        method: editingKode === null ? "POST" : "PUT",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          original_kode_cabang: editingKode,

          kode_cabang: form.kode_cabang.trim(),

          nama_cabang: form.nama_cabang.trim(),

          singkatan: form.singkatan.trim().toUpperCase(),

          dc_support: form.dc_support.trim() || null,

          cluster: form.cluster.trim() || null,

        }),

      });

      const result = await response.json();

      if (!response.ok) {

        throw new Error(result.message || "Gagal menyimpan cabang.");

      }



      await Swal.fire({ icon: "success", title: "Cabang tersimpan", text: result.message || "Data cabang berhasil disimpan.", timer: 1600, showConfirmButton: false });

      setFormOpen(false);

      setEditingKode(null);

      setForm(emptyForm);

      await loadCabang();

    } catch (err) {

      await Swal.fire({ icon: "error", title: "Gagal menyimpan cabang", text: err instanceof Error ? err.message : "Gagal menyimpan cabang." });

    } finally {

      setSaving(false);

    }

  }



  async function handleDelete(item: Cabang) {

    const kode = String(item.kode_cabang);

    const confirmation = await Swal.fire({ icon: "warning", title: "Hapus cabang?", text: `Hapus cabang "${item.nama_cabang}" (${kode})? Pastikan cabang ini tidak masih digunakan oleh dokumentasi atau event.`, showCancelButton: true, confirmButtonText: "Ya, hapus", cancelButtonText: "Batal", confirmButtonColor: "#dc2626", reverseButtons: true });
    if (!confirmation.isConfirmed) return;



    setError("");

    setSuccess("");

    setDeletingKode(kode);

    try {

      const response = await fetch("/api/admin/cabang", {

        method: "DELETE",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ kode_cabang: kode }),

      });

      const result = await response.json();

      if (!response.ok) {

        throw new Error(result.message || "Gagal menghapus cabang.");

      }

      await Swal.fire({ icon: "success", title: "Cabang dihapus", text: result.message || "Cabang berhasil dihapus.", timer: 1600, showConfirmButton: false });

      await loadCabang();

    } catch (err) {

      await Swal.fire({ icon: "error", title: "Gagal menghapus cabang", text: err instanceof Error ? err.message : "Gagal menghapus cabang." });

    } finally {

      setDeletingKode(null);

    }

  }

  async function handleBulkDelete() {
    const selectedItems = cabangList.filter((item) =>
      selectedCodes.includes(String(item.kode_cabang)),
    );

    if (selectedItems.length === 0) return;

    const confirmation = await Swal.fire({ icon: "warning", title: `Hapus ${selectedItems.length} cabang?`, text: "Pastikan cabang tersebut tidak masih digunakan oleh dokumentasi atau event.", showCancelButton: true, confirmButtonText: "Ya, hapus semua", cancelButtonText: "Batal", confirmButtonColor: "#dc2626", reverseButtons: true });
    if (!confirmation.isConfirmed) return;

    setError("");
    setSuccess("");
    setBulkDeleting(true);

    let deletedCount = 0;
    const failedCodes: string[] = [];

    try {
      for (const item of selectedItems) {
        const kode = String(item.kode_cabang);
        try {
          const response = await fetch("/api/admin/cabang", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kode_cabang: kode }),
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.message || "Gagal menghapus cabang.");
          }
          deletedCount += 1;
        } catch {
          failedCodes.push(kode);
        }
      }

      setSelectedCodes([]);
      await loadCabang();
      if (failedCodes.length > 0) {
        await Swal.fire({ icon: "warning", title: "Hapus massal selesai sebagian", text: `${deletedCount} cabang dihapus. ${failedCodes.length} gagal dihapus (kode: ${failedCodes.slice(0, 5).join(", ")}${failedCodes.length > 5 ? ", ..." : ""}).` });
      } else {
        await Swal.fire({ icon: "success", title: "Cabang dihapus", text: `${deletedCount} cabang berhasil dihapus.`, timer: 1600, showConfirmButton: false });
      }
    } finally {
      setBulkDeleting(false);
    }
  }

  function openBulkEdit() {
    if (selectedCodes.length === 0) return;
    setBulkEditDcEnabled(false);
    setBulkEditDc("");
    setBulkEditClusterEnabled(false);
    setBulkEditCluster("");
    setError("");
    setSuccess("");
    setBulkEditOpen(true);
  }

  function closeBulkEdit() {
    if (bulkEditing) return;
    setBulkEditOpen(false);
  }

  async function handleBulkEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (selectedCodes.length === 0) {
      await Swal.fire({ icon: "warning", title: "Belum ada cabang", text: "Pilih minimal satu cabang terlebih dahulu." });
      return;
    }

    if (!bulkEditDcEnabled && !bulkEditClusterEnabled) {
      await Swal.fire({ icon: "warning", title: "Pilih data yang diedit", text: "Pilih setidaknya satu field yang ingin diperbarui." });
      return;
    }

    const changes: Record<string, string | null> = {};
    if (bulkEditDcEnabled) changes.dc_support = bulkEditDc.trim() || null;
    if (bulkEditClusterEnabled) changes.cluster = bulkEditCluster.trim() || null;

    const fields = [
      bulkEditDcEnabled ? "DC Support" : "",
      bulkEditClusterEnabled ? "Cluster" : "",
    ].filter(Boolean).join(" dan ");

    const selectedCount = selectedCodes.length;
    const confirmation = await Swal.fire({ icon: "question", title: "Terapkan perubahan massal?", text: `Terapkan perubahan ${fields} ke ${selectedCount} cabang? Nilai yang sama berlaku untuk semua pilihan. Field yang dicentang tetapi dikosongkan akan dikosongkan di database.`, showCancelButton: true, confirmButtonText: "Terapkan", cancelButtonText: "Batal" });
    if (!confirmation.isConfirmed) return;

    setBulkEditing(true);
    try {
      const response = await fetch("/api/admin/cabang", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kode_cabang: selectedCodes,
          ...changes,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Gagal memperbarui cabang terpilih.");
      }

      setBulkEditOpen(false);
      setSelectedCodes([]);
      await Swal.fire({ icon: "success", title: "Perubahan diterapkan", text: result.message || `${selectedCount} cabang berhasil diperbarui.`, timer: 1600, showConfirmButton: false });
      await loadCabang();
    } catch (err) {
      await Swal.fire({ icon: "error", title: "Gagal memperbarui cabang", text: err instanceof Error ? err.message : "Gagal memperbarui cabang terpilih." });
    } finally {
      setBulkEditing(false);
    }
  }

  return (

    <div className="mx-auto w-full max-w-7xl min-w-0 space-y-5 p-3 sm:p-6 lg:p-8">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">

        <div>

          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Data Cabang</h1>


        </div>

        <button

          type="button"

          onClick={openCreate}

          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-100"

        >

          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
          Tambah Cabang

        </button>

      </div>







      <div className="grid gap-4 sm:grid-cols-3">

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">

          <div className="flex items-center justify-between">

            <p className="text-sm font-medium text-slate-500">Total Cabang</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3.5" y="4" width="17" height="16" rx="2"/><path d="M8 4v16M16 4v16M3.5 9h17M3.5 15h17" /></svg>
            </span>

          </div>

          <p className="mt-3 text-3xl font-bold text-slate-900">{loading ? "—" : cabangList.length.toLocaleString("id-ID")}</p>

          

        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">

          <div className="flex items-center justify-between">

            <p className="text-sm font-medium text-slate-500">Express Terdaftar</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4.5 13h6l-1 9L19.5 10h-6L13 2Z" /></svg>
            </span>

          </div>

          <p className="mt-3 text-3xl font-bold text-slate-900">{loading ? "—" : cabangList.filter((item) => /(?:express|xpress)/i.test(item.nama_cabang)).length.toLocaleString("id-ID")}</p>

          

        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">

          <div className="flex items-center justify-between">

            <p className="text-sm font-medium text-slate-500">Jumlah Cluster</p>

            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 8 5v8l-8 5-8-5V8l8-5Z"/><path d="m4 8 8 5 8-5M12 13v8" /></svg>
            </span>

          </div>

          <p className="mt-3 text-3xl font-bold text-slate-900">

            {loading ? "—" : new Set(cabangList.map((item) => item.cluster?.trim()).filter(Boolean)).size.toLocaleString("id-ID")}

          </p>

          

        </div>

      </div>



      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">

        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">

          <div>

            <h2 className="font-semibold text-slate-900">Daftar Cabang</h2>



          </div>

          <div className="relative w-full sm:max-w-xs">

            <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">

              <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />

            </svg>

            <input

              value={search}

              onChange={(event) => setSearch(event.target.value)}

              placeholder="Cari cabang..."

              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"

            />

          </div>

        </div>



        {selectedCodes.length > 0 && (
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700">
              <span className="font-semibold">{selectedCodes.length} cabang dipilih</span>
              <span className="ml-2 text-slate-500">Edit DC Support/cluster atau hapus pilihan.</span>
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setSelectedCodes([])} disabled={bulkDeleting || bulkEditing} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50">Batal pilih</button>
              <button type="button" onClick={openBulkEdit} disabled={bulkDeleting || bulkEditing} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">Edit terpilih</button>
              <button type="button" onClick={() => void handleBulkDelete()} disabled={bulkDeleting || bulkEditing} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">{bulkDeleting ? "Menghapus..." : "Hapus terpilih"}</button>
            </div>
          </div>
        )}





        <div className="space-y-3 p-3 sm:hidden">
          {loading ? (
            <div className="rounded-xl border border-slate-200 p-5 text-center text-sm text-slate-500">Memuat data cabang...</div>
          ) : filteredCabang.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 px-5 py-10 text-center">
              <p className="font-semibold text-slate-700">{search ? "Cabang tidak ditemukan" : "Belum ada data cabang"}</p>
              <p className="mt-1 text-sm text-slate-500">{search ? "Coba kata kunci lain." : "Tambahkan cabang pertama untuk memulai."}</p>
            </div>
          ) : (
            <>
              <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleAllVisible} disabled={bulkDeleting || bulkEditing || filteredCabang.length === 0} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                Pilih semua ({filteredCabang.length})
              </label>
              {filteredCabang.map((item) => {
                const code = String(item.kode_cabang);
                const selected = selectedCodes.includes(code);
                return (
                  <article key={code} className={`rounded-xl border bg-white p-4 shadow-sm ${selected ? "border-blue-300 ring-2 ring-blue-50" : "border-slate-200"}`}>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" aria-label={`Pilih ${item.nama_cabang}`} checked={selected} onChange={() => toggleCabang(code)} disabled={bulkDeleting || bulkEditing} className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words font-semibold text-slate-900">{item.nama_cabang}</h3>
                        <p className="mt-1 font-mono text-xs text-slate-500">Kode {code}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{item.singkatan || "Tanpa singkatan"}</span>
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">DC: {item.dc_support || "—"}</span>
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600">Cluster: {item.cluster || "—"}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
                      <button type="button" onClick={() => openEdit(item)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Edit</button>
                      <button type="button" onClick={() => void handleDelete(item)} disabled={deletingKode === code} className="rounded-lg border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">{deletingKode === code ? "Menghapus..." : "Hapus"}</button>
                    </div>
                  </article>
                );
              })}
            </>
          )}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[900px] text-left text-sm">

            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

              <tr>

                <th className="w-12 px-4 py-4">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua cabang yang terlihat"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    disabled={loading || bulkDeleting || bulkEditing || filteredCabang.length === 0}
                    className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                  />
                </th>
                <th className="px-5 py-4 font-semibold">Kode Cabang</th>

                <th className="px-5 py-4 font-semibold">Nama Cabang</th>

                <th className="px-5 py-4 font-semibold">Singkatan</th>

                <th className="px-5 py-4 font-semibold">DC Support</th>

                <th className="px-5 py-4 font-semibold">Cluster</th>

                <th className="px-5 py-4 text-right font-semibold">Aksi</th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-100">

              {loading ? (

                <tr><td colSpan={7} className="px-5 py-14 text-center text-slate-500">Memuat data cabang...</td></tr>

              ) : filteredCabang.length === 0 ? (

                <tr>

                  <td colSpan={7} className="px-5 py-14 text-center">

                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5" /></svg>
                    </div>

                    <p className="mt-3 font-medium text-slate-700">{search ? "Cabang tidak ditemukan" : "Belum ada data cabang"}</p>

                    <p className="mt-1 text-sm text-slate-400">{search ? "Coba kata kunci lain." : "Tambahkan cabang pertama untuk memulai."}</p>

                  </td>

                </tr>

              ) : (

                filteredCabang.map((item) => (

                  <tr key={String(item.kode_cabang)} className={`transition hover:bg-slate-50/80 ${selectedCodes.includes(String(item.kode_cabang)) ? "bg-blue-50/50" : ""}`}>

                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        aria-label={`Pilih ${item.nama_cabang}`}
                        checked={selectedCodes.includes(String(item.kode_cabang))}
                        onChange={() => toggleCabang(String(item.kode_cabang))}
                        disabled={bulkDeleting || bulkEditing}
                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
                      />
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 font-mono text-xs font-semibold text-slate-600">{item.kode_cabang}</td>

                    <td className="px-5 py-4">

                      <p className="font-semibold text-slate-900">{item.nama_cabang}</p>

                    </td>

                    <td className="px-5 py-4">

                      <span className="inline-flex rounded-lg bg-blue-50 px-2.5 py-1 font-mono text-xs font-semibold text-blue-700">{item.singkatan}</span>

                    </td>

                    <td className="px-5 py-4 text-slate-600">{item.dc_support || <span className="text-slate-300">—</span>}</td>

                    <td className="px-5 py-4 text-slate-600">{item.cluster || <span className="text-slate-300">—</span>}</td>

                    <td className="px-5 py-4">

                      <div className="flex justify-end gap-2">

                        <button type="button" onClick={() => openEdit(item)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-100">Edit</button>

                        <button

                          type="button"

                          onClick={() => void handleDelete(item)}

                          disabled={deletingKode === String(item.kode_cabang)}

                          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"

                        >

                          {deletingKode === String(item.kode_cabang) ? "Menghapus..." : "Hapus"}

                        </button>

                      </div>

                    </td>

                  </tr>

                ))

              )}

            </tbody>

          </table>

        </div>

        <div className="flex flex-col gap-1 border-t border-slate-100 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">

          <span>Menampilkan {filteredCabang.length} dari {cabangList.length} cabang</span>

          <button type="button" onClick={() => void loadCabang()} className="self-start font-semibold text-blue-600 hover:text-blue-700 sm:self-auto">Muat ulang data</button>

        </div>

      </section>



      {formOpen && (

        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/35 p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeForm(); }}>

          <section role="dialog" aria-modal="true" aria-labelledby="cabang-form-title" className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl">

            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6 sm:py-5">

              <div>

                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Master Data</p>

                <h2 id="cabang-form-title" className="mt-1 text-xl font-bold text-slate-900">{editingKode === null ? "Tambah Cabang" : "Edit Cabang"}</h2>

                

              </div>

              <div className="flex shrink-0 items-start gap-3">
                <img src="/logo/logoyomart.png" alt="Yomart" className="mt-1 h-auto w-20 object-contain sm:w-24" />
                <button type="button" onClick={closeForm} disabled={saving} aria-label="Tutup form" className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button>
              </div>

            </div>



            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5 sm:px-6">



              <div className="grid gap-4 sm:grid-cols-2">

                <div>

                  <label htmlFor="kode_cabang" className="mb-1.5 block text-sm font-medium text-slate-700">Kode Cabang *</label>

                  <input id="kode_cabang" value={form.kode_cabang} onChange={(event) => setForm((current) => ({ ...current, kode_cabang: event.target.value }))} required className={inputClass} placeholder="Contoh: 23212" />

                </div>

                <div>

                  <label htmlFor="singkatan" className="mb-1.5 block text-sm font-medium text-slate-700">Singkatan *</label>

                  <input id="singkatan" value={form.singkatan} onChange={(event) => setForm((current) => ({ ...current, singkatan: event.target.value.toUpperCase() }))} required className={inputClass} placeholder="Contoh: MHO" />

                </div>

              </div>

              <div>

                <label htmlFor="nama_cabang" className="mb-1.5 block text-sm font-medium text-slate-700">Nama Cabang *</label>

                <input id="nama_cabang" value={form.nama_cabang} onChange={(event) => setForm((current) => ({ ...current, nama_cabang: event.target.value }))} required className={inputClass} placeholder="Nama lengkap cabang" />

              </div>

              <div className="grid gap-4 sm:grid-cols-2">

                <div>

                  <label htmlFor="dc_support" className="mb-1.5 block text-sm font-medium text-slate-700">DC Support</label>

                  <input id="dc_support" value={form.dc_support} onChange={(event) => setForm((current) => ({ ...current, dc_support: event.target.value }))} className={inputClass} placeholder="Opsional" />

                </div>

                <div>

                  <label htmlFor="cluster" className="mb-1.5 block text-sm font-medium text-slate-700">Cluster</label>

                  <input id="cluster" value={form.cluster} onChange={(event) => setForm((current) => ({ ...current, cluster: event.target.value }))} className={inputClass} placeholder="Opsional" />

                </div>

              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">

                <button type="button" onClick={closeForm} disabled={saving} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Batal</button>

                <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Menyimpan..." : editingKode === null ? "Simpan Cabang" : "Simpan Perubahan"}</button>

              </div>

            </form>

          </section>

        </div>

      )}

      {bulkEditOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/35 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeBulkEdit();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-edit-title"
            className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
              <div>
                <h2 id="bulk-edit-title" className="text-lg font-semibold text-slate-900">Edit {selectedCodes.length} cabang</h2>
                
              </div>
              <button type="button" onClick={closeBulkEdit} disabled={bulkEditing} aria-label="Tutup edit massal" className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50">×</button>
            </div>

            <form onSubmit={handleBulkEdit} className="space-y-5 px-5 py-5 sm:px-6">


              <div className="rounded-lg border border-slate-200 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={bulkEditDcEnabled}
                    onChange={(event) => setBulkEditDcEnabled(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-slate-800">Perbarui DC Support</span>
                    
                  </span>
                </label>
                {bulkEditDcEnabled && (
                  <input
                    value={bulkEditDc}
                    onChange={(event) => setBulkEditDc(event.target.value)}
                    className={`${inputClass} mt-3`}
                    placeholder="Contoh: D53; kosongkan untuk menghapus nilai"
                  />
                )}
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={bulkEditClusterEnabled}
                    onChange={(event) => setBulkEditClusterEnabled(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex-1">
                    <span className="block text-sm font-medium text-slate-800">Perbarui Cluster</span>
                    
                  </span>
                </label>
                {bulkEditClusterEnabled && (
                  <input
                    value={bulkEditCluster}
                    onChange={(event) => setBulkEditCluster(event.target.value)}
                    className={`${inputClass} mt-3`}
                    placeholder="Contoh: C10; kosongkan untuk menghapus nilai"
                  />
                )}
              </div>

              

              <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={closeBulkEdit} disabled={bulkEditing} className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">Batal</button>
                <button type="submit" disabled={bulkEditing || (!bulkEditDcEnabled && !bulkEditClusterEnabled)} className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{bulkEditing ? "Menyimpan..." : "Simpan Perubahan"}</button>
              </div>
            </form>
          </section>
        </div>
      )}

    </div>

  );

}
