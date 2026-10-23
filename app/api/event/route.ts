import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const kodeCabang = (request.nextUrl.searchParams.get("kode_cabang") || "").trim();
    if (!/^\d+$/.test(kodeCabang)) {
      return NextResponse.json({ success: false, code: "INVALID_BRANCH", message: "Kode cabang wajib diisi dengan benar." }, { status: 400 });
    }

    const [branchRows] = await db.execute(
      `SELECT kode_cabang FROM tb_cabang WHERE kode_cabang = ? LIMIT 1`,
      [kodeCabang],
    );
    if (!Array.isArray(branchRows) || branchRows.length === 0) {
      return NextResponse.json({ success: false, code: "BRANCH_NOT_FOUND", message: "Cabang tidak ditemukan." }, { status: 404 });
    }
    const [rows] = await db.execute(
      `SELECT e.id, e.kode_event, e.nama_event
       FROM tb_event_cabang ec
       INNER JOIN tb_event e ON e.id = ec.id_event
       WHERE ec.kode_cabang = ? AND ec.aktif = 1
       ORDER BY e.nama_event ASC`,
      [kodeCabang],
    );
    const events = rows as Array<{id:number; kode_event:string; nama_event:string}>;
    if (!events.length) return NextResponse.json({
      success: true,
      code: "NO_EVENTS",
      message: "Cabang ini belum terdaftar di event manapun.",
      data: [],
    });

    const ids = events.map((event) => Number(event.id)).filter(Number.isSafeInteger);
    const [fieldRows] = await db.execute(
      `SELECT ecc.id_event, jd.id, jd.kode_kolom, jd.nama_kolom, ecc.urutan, ecc.wajib
       FROM tb_event_cabang_kolom ecc
       INNER JOIN tb_jenis_dokumentasi jd ON jd.id = ecc.id_jenis_dokumentasi
       WHERE ecc.kode_cabang = ? AND ecc.aktif = 1 AND jd.aktif = 1
         AND ecc.id_event IN (${ids.map(() => "?").join(",")})
       ORDER BY ecc.id_event, ecc.urutan, jd.nama_kolom`,
      [kodeCabang, ...ids],
    );
    const byEvent = new Map<number, unknown[]>();
    for (const row of fieldRows as Array<Record<string, unknown>>) {
      const id = Number(row.id_event);
      byEvent.set(id, [...(byEvent.get(id) || []), {
        id: Number(row.id),
        kode_kolom: String(row.kode_kolom),
        nama_kolom: String(row.nama_kolom),
        urutan: Number(row.urutan),
        wajib: Number(row.wajib) === 1,
      }]);
    }

    return NextResponse.json({
      success: true,
      data: events.map((event) => ({
        ...event,
        columns: byEvent.get(Number(event.id)) || [],
      })),
    });
  } catch (error) {
    console.error("GET /api/event:", error);
    const code = error && typeof error === "object" && "code" in error ? String((error as {code?:unknown}).code) : "";
    return NextResponse.json({
      success: false,
      message: code === "ER_NO_SUCH_TABLE" ? "Konfigurasi event cabang belum tersedia. Hubungi administrator." : "Gagal mengambil event yang tersedia untuk cabang.",
    }, { status: code === "ER_NO_SUCH_TABLE" ? 503 : 500 });
  }
}
