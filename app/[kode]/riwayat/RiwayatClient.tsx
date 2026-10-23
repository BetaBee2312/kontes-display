"use client";

import {
  useMemo,
  useState,
} from "react";
import Swal from "sweetalert2";

type Riwayat = {
  id: string;
  event: string;
  tanggal: string;
  foto: string;
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

  const [selectedIds, setSelectedIds] =
    useState<string[]>([]);

  const [deleting, setDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  /*
   * ==========================================
   * SEMUA DIPILIH
   * ==========================================
   */

  const allSelected =
    rows.length > 0 &&
    selectedIds.length ===
      rows.length;

  const selectedCount =
    selectedIds.length;

  /*
   * ==========================================
   * SELECT ALL
   * ==========================================
   */

  function toggleSelectAll() {
    setError("");
    setMessage("");

    if (allSelected) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds(
      rows.map((item) => item.id)
    );
  }

  /*
   * ==========================================
   * SELECT SATU
   * ==========================================
   */

  function toggleSelect(id: string) {
    setError("");
    setMessage("");

    setSelectedIds((current) => {
      if (current.includes(id)) {
        return current.filter(
          (item) => item !== id
        );
      }

      return [
        ...current,
        id,
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
      selectedIds.length === 0 ||
      deleting
    ) {
      return;
    }

    const confirmation = await Swal.fire({
      icon: "warning",
      title: "Hapus dokumentasi?",
      text: `Hapus ${selectedIds.length} dokumentasi terpilih? Foto dan data tersebut akan dihapus permanen.`,
      showCancelButton: true,
      confirmButtonText: "Ya, hapus",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
    });
    if (!confirmation.isConfirmed) return;

    setDeleting(true);
    setError("");
    setMessage("");

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

              ids:
                selectedIds,
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
            !selectedIds.includes(
              item.id
            )
        )
      );

      setSelectedIds([]);

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
          <div className="text-4xl">
            📂
          </div>

          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Belum Ada Dokumentasi
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Semua dokumentasi pada cabang
            ini sudah dihapus atau memang
            belum tersedia.
          </p>
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
            selectedIds.includes(
              item.id
            );

          return (
            <div
              key={item.id}
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
                  src={item.foto}
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
                          item.id
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
                  EVENT
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {item.event}
                </h2>

                <div className="mt-4 rounded-xl bg-slate-50 p-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    ID Dokumentasi
                  </p>

                  <p className="mt-1 break-all font-mono text-xs leading-5 text-slate-600">
                    {item.id}
                  </p>
                </div>
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