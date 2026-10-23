import Link from "next/link";
import { Suspense } from "react";
import type { RowDataPacket } from "mysql2";

import db from "@/lib/db";
import { getCabangTableName } from "@/lib/cabang-table";

import RiwayatClient from "./RiwayatClient";

type Cabang = {
  kode_cabang: string | number;
  nama_cabang: string;
};

interface Riwayat extends RowDataPacket {
  id: string;
  event: string;
  kategori: string;
  tanggal: string;
  foto: string;
}

export default function RiwayatPage(
  props: {
    params: Promise<{
      kode: string;
    }>;
  }
) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-6xl">
        <Suspense fallback={<RiwayatLoading />}>
          <RiwayatContent
            params={props.params}
          />
        </Suspense>
      </div>
    </main>
  );
}

function RiwayatLoading() {
  return (
    <div>
      <Link
        href="/form"
        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /><path d="M9 12h12" /></svg>
        Kembali ke Form
      </Link>

      <div className="mt-6">
        <div className="h-4 w-44 animate-pulse rounded bg-slate-200" />

        <div className="mt-3 h-9 w-72 animate-pulse rounded bg-slate-200" />

        <div className="mt-3 h-4 w-48 animate-pulse rounded bg-slate-200" />
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div
            key={item}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="aspect-video animate-pulse bg-slate-200" />

            <div className="space-y-3 p-5">
              <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
              <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
              <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function RiwayatContent({
  params,
}: {
  params: Promise<{
    kode: string;
  }>;
}) {
  const resolvedParams = await params;

  const kodeCabang = String(
    resolvedParams.kode
  ).trim();

  /*
   * ==========================================
   * CARI CABANG
   * ==========================================
   */

  const [cabangRows] =
    await db.execute(
      `
        SELECT
          kode_cabang,
          nama_cabang
        FROM tb_cabang
        WHERE kode_cabang = ?
        LIMIT 1
      `,
      [kodeCabang]
    );

  if (
    !Array.isArray(cabangRows) ||
    cabangRows.length === 0
  ) {
    return (
      <div>
        <Link
          href="/form"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /><path d="M9 12h12" /></svg>
        Kembali ke Form
        </Link>

        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          Cabang dengan kode{" "}
          <strong>{kodeCabang}</strong>{" "}
          tidak ditemukan.
        </div>
      </div>
    );
  }

  const cabang =
    cabangRows[0] as Cabang;

  const kode = String(
    cabang.kode_cabang
  ).trim();

  /*
   * ==========================================
   * TABLE CABANG
   * ==========================================
   *
   * 23212 -> tb_23212
   */

  const tableName =
    getCabangTableName(kode);

  /*
   * ==========================================
   * CEK TABLE
   * ==========================================
   */

  const [tableRows] =
    await db.execute(
      `
        SELECT
          TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = ?
        LIMIT 1
      `,
      [tableName]
    );

  /*
   * ==========================================
   * BELUM ADA TABLE
   * ==========================================
   */

  if (
    !Array.isArray(tableRows) ||
    tableRows.length === 0
  ) {
    return (
      <div>
        <Link
          href="/form"
          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /><path d="M9 12h12" /></svg>
        Kembali ke Form
        </Link>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-3xl">
            <svg aria-hidden="true" className="h-8 w-8 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H10l2 2h6.5A2.5 2.5 0 0 1 21 9.5v8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5Z" /><path d="M3.5 10h17" /></svg>
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-900">
            Belum Ada Riwayat
          </h1>


          <Link
            href="/form"
            className="mt-6 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Upload Dokumentasi
          </Link>
        </div>
      </div>
    );
  }

  /*
   * ==========================================
   * AMBIL DATA
   * ==========================================
   */

  const [columnRows] = await db.execute(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS " +
    "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'kode_kolom' LIMIT 1",
    [tableName],
  );
  const hasCategoryCode = Array.isArray(columnRows) && columnRows.length > 0;
  const categorySelect = hasCategoryCode
    ? "COALESCE(NULLIF(TRIM(jd.nama_kolom), ''), NULLIF(TRIM(t.kode_kolom), ''), 'Dokumentasi') AS kategori"
    : "'Dokumentasi' AS kategori";
  const categoryJoin = hasCategoryCode
    ? "LEFT JOIN tb_jenis_dokumentasi jd ON jd.kode_kolom = t.kode_kolom"
    : "";

  const [rows] = await db.query<Riwayat[]>(
    "SELECT t.id, t.event, " + categorySelect + ", " +
    "DATE_FORMAT(t.tanggal, '%d/%m/%Y') AS tanggal, t.foto " +
    "FROM `" + tableName + "` t " + categoryJoin + " " +
    "ORDER BY t.tanggal DESC, t.created_at DESC",
  );

  return (
    <div>
      <Link
        href="/form"
        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition hover:text-blue-700"
      >
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /><path d="M9 12h12" /></svg>
        Kembali ke Form
      </Link>

      <div className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
          RIWAYAT DOKUMENTASI
        </p>

        <div className="mt-2 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {cabang.nama_cabang}
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Kode Site:{" "}
              <span className="font-semibold text-slate-700">
                {kode}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200" />

      <RiwayatClient
        initialRows={rows}
        kodeCabang={kode}
      />
    </div>
  );
}