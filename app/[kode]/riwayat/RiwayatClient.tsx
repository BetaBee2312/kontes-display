"use client";

import {
  useMemo,
  useState,
} from "react";
import Swal from "sweetalert2";

type Riwayat = {
  event: string;
  kategori?: string;
  tanggal: string;
  foto_ref: string;
};

type Props = {
  initialRows: Riwayat[];
  kodeCabang: string;
};

export default function RiwayatClient({
  initialRows,
  kodeCabang,
}: Props) {
  const [rows, setRows] =
    useState<Riwayat[]>(
      initialRows
    );

  const [selectedPhotoRefs, setSelectedPhotoRefs] =
    useState<string[]>([]);

  const [deleting, setDeleting] =
    useState(false);


  /*
   * ==========================================
   * SEMUA DIPILIH
   * ==========================================
   */

  const allSelected =
    rows.length > 0 &&
    selectedPhotoRefs.length ===
      rows.length;

  const selectedCount =
    selectedPhotoRefs.length;

  /*
   * ==========================================
   * SELECT ALL
   * ==========================================
   */

  function toggleSelectAll() {

    if (allSelected) {
      setSelectedPhotoRefs([]);
      return;
    }

    setSelectedPhotoRefs(
      rows.map((item) => item.foto_ref)
    );
  }

  /*
   * ==========================================
   * SELECT SATU
   * ==========================================
   */

  function toggleSelect(photoRef: string) {

    setSelectedPhotoRefs((current) => {
      if (current.includes(photoRef)) {
        return current.filter(
          (item) => item !== photoRef
        );
      }

      return [
        ...current,
        photoRef,
      ];
    });
  }

  /*
   * ==========================================
   * DELETE
   * ==========================================
   */

  async function handleDelete() {
    if (
      selectedPhotoRefs.length === 0 ||
      deleting
    ) {
      return;
    }

    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Hapus dokumentasi?",
      text: `Hapus ${selectedPhotoRefs.length} dokumentasi terpilih? Foto dan data tersebut akan dihapus permanen.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
    });
    if (!confirmation.isConfirmed) return;

    setDeleting(true);

    try {
      const response =
        await fetch(
          "/api/dokumentasi",
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              kode_cabang:
                kodeCabang,

              foto_refs:
                selectedPhotoRefs,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            `Gagal menghapus. HTTP ${response.status}`
        );
      }

      if (!result.success) {
        throw new Error(
          result.message ||
            "Gagal menghapus dokumentasi."
        );
      }

      /*
       * Hilangkan dari tampilan
       */
      setRows((current) =>
        current.filter(
          (item) =>
            !selectedPhotoRefs.includes(
              item.foto_ref
            )
        )
      );

      setSelectedPhotoRefs([]);

      await Swal.fire({
        icon: "success",
        title: "Dokumentasi dihapus",
        text: `${result.deletedCount} dokumentasi berhasil dihapus.`,
        timer: 1700,
        showConfirmButton: false,
      });

    } catch (error) {
      console.error(
        "DELETE ERROR:",
        error
      );

      await Swal.fire({
        icon: "error",
        title: "Gagal menghapus dokumentasi",
        text: error instanceof Error ? error.message : "Gagal menghapus dokumentasi.",
      });
    } finally {
      setDeleting(false);
    }
  }

  /*
   * ==========================================
   * STATUS TEXT
   * ==========================================
   */

  const totalText =
    useMemo(() => {
      return `${rows.length} dokumentasi`;
    }, [rows.length]);

  /*
   * ==========================================
   * EMPTY
   * ==========================================
   */

  if (rows.length === 0) {
    return (
      <div className="mt-8">


        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <svg aria-hidden="true" className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5Z" /><path d="M3.5 10h17" /></svg>
          </div>

          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Belum Ada Dokumentasi
          </h2>

        </div>
      </div>
    );
  }

  /*
   * ==========================================
   * PAGE
   * ==========================================
   */

  return (
    <div className="mt-8">

      {/* MESSAGE */}




      {/* TOOLBAR */}
      <div className="sticky top-4 z-20 mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-center gap-3">

          {/* CHECK ALL */}
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={
                toggleSelectAll
              }
              className="h-5 w-5 cursor-pointer rounded border-slate-300 text-blue-600 accent-blue-600"
            />

            <span className="text-sm font-semibold text-slate-700">
              Pilih semua
            </span>
          </label>

          <span className="text-sm text-slate-400">
            {totalText}
          </span>
        </div>

        {/* DELETE */}
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-30"
                    cx="12"
                    cy="12"
                    r="9"
                    stroke="currentColor"
                    strokeWidth="3"
                  />

                  <path
                    d="M21 12a9 9 0 0 0-9-9"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>

                Menghapus...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 6h18"
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 6V4h8v2"
                  />

                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 6l-1 14H6L5 6"
                  />
                </svg>

                Hapus {selectedCount} Terpilih
              </>
            )}
          </button>
        )}
      </div>

      {/* GRID */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">

        {rows.map((item) => {
          const checked =
            selectedPhotoRefs.includes(
              item.foto_ref
            );

          return (
            <div
              key={item.foto_ref}
              className={[
                "group overflow-hidden rounded-2xl border bg-white shadow-sm transition",
                checked
                  ? "border-red-300 ring-2 ring-red-100"
                  : "border-slate-200 hover:-translate-y-1 hover:shadow-lg",
              ].join(" ")}
            >
              {/* FOTO */}
              <div className="relative aspect-video overflow-hidden bg-slate-100">

                <img
                  src={`/api/dokumentasi/foto?kode_cabang=${encodeURIComponent(kodeCabang)}&ref=${item.foto_ref}`}
                  alt={`Dokumentasi ${item.event}`}
                  className={[
                    "h-full w-full object-cover transition duration-300",
                    checked
                      ? "brightness-90"
                      : "group-hover:scale-105",
                  ].join(" ")}
                />

                {/* CHECKBOX */}
                <label className="absolute left-3 top-3 cursor-pointer">
                  <span
                    className={[
                      "flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm backdrop-blur",
                      checked
                        ? "border-red-600 bg-red-600"
                        : "border-white/80 bg-white/95",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        toggleSelect(
                          item.foto_ref
                        )
                      }
                      className="sr-only"
                    />

                    {checked && (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </span>
                </label>

                {/* TANGGAL */}
                <div className="absolute right-3 top-3">
                  <span className="rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
                    {item.tanggal}
                  </span>
                </div>
              </div>

              {/* INFO */}
              <div className="p-5">

                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  DOKUMENTASI
                </p>

                <h2 className="mt-1 break-words text-lg font-bold leading-6 text-slate-900">
                  {item.event} - {item.kategori || "Dokumentasi"}
                </h2>
              </div>
            </div>
          );
        })}
      </div>

      {/* MOBILE DELETE BAR */}
      {selectedCount > 0 && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 rounded-2xl border border-red-100 bg-white p-3 shadow-2xl sm:hidden">
          <button
            type="button"
            onClick={
              handleDelete
            }
            disabled={deleting}
            className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {deleting
              ? "Menghapus..."
              : `Hapus ${selectedCount} Dokumentasi`}
          </button>
        </div>
      )}
    </div>
  );
}