import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const kode = (request.nextUrl.searchParams.get("kode") || "").trim();
    if (!kode) return NextResponse.json({ success: false, code: "MISSING_BRANCH_CODE", message: "Kode cabang wajib diisi." }, { status: 400 });

    const [rows] = await db.execute(
      `SELECT kode_cabang, nama_cabang FROM tb_cabang WHERE kode_cabang = ? LIMIT 1`,
      [kode],
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, code: "BRANCH_NOT_FOUND", message: "Cabang tidak terdaftar. Periksa kembali kode cabang." }, { status: 404 });
    }
    const branch = rows[0] as { kode_cabang: string | number; nama_cabang: string };
    const branchCode = String(branch.kode_cabang);

    const [tableCheck] = await db.execute(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tb_event_cabang' LIMIT 1`,
    );
    if (!Array.isArray(tableCheck) || tableCheck.length === 0) {
      return NextResponse.json({ success: false, code: "CONFIG_NOT_INSTALLED", message: "Konfigurasi event belum tersedia. Hubungi administrator." }, { status: 503 });
    }

    const [eventRows] = await db.execute(
      `SELECT e.id, e.kode_event, e.nama_event
       FROM tb_event_cabang ec
       INNER JOIN tb_event e ON e.id = ec.id_event
       WHERE ec.kode_cabang = ? AND ec.aktif = 1
       ORDER BY e.nama_event ASC`,
      [branchCode],
    );
    const events = eventRows as Array<{ id: number; kode_event: string; nama_event: string }>;
    if (events.length === 0) {
      return NextResponse.json({
        success: true,
        code: "NO_EVENTS",
        message: "Cabang ini belum terdaftar di event manapun. Silakan hubungi administrator untuk mendapatkan akses event.",
        data: { ...branch, events: [] },
      });
    }

    const ids = events.map((item) => Number(item.id)).filter(Number.isSafeInteger);
    const placeholders = ids.map(() => "?").join(",");
    const ids = events.map((item) => Number(item.id)).filter(Number.isSafeInteger);
    const placeholders = ids.map(() => "?").join(",");
    const [fieldRows] = await db.execute(
      `SELECT ek.id_event, jd.id, jd.kode_kolom, jd.nama_kolom, ek.urutan, ek.wajib
       FROM tb_event_kolom ek
       INNER JOIN tb_jenis_dokumentasi jd ON jd.id = ek.id_jenis_dokumentasi
       WHERE ek.aktif = 1 AND jd.aktif = 1
         AND ek.id_event IN (${placeholders})
       ORDER BY ek.id_event, ek.urutan, jd.nama_kolom`,
      ids,
    );
    const columnsByEvent = new Map<number, Array<{id:number;kode_kolom:string;nama_kolom:string;urutan:number;wajib:boolean}>>();
    for (const row of fieldRows as Array<{id_event:number;id:number;kode_kolom:string;nama_kolom:string;urutan:number;wajib:number}>) {
      const key = Number(row.id_event);
      const current = columnsByEvent.get(key) || [];
      current.push({ id: Number(row.id), kode_kolom: row.kode_kolom, nama_kolom: row.nama_kolom, urutan: Number(row.urutan), wajib: Number(row.wajib) === 1 });
      columnsByEvent.set(key, current);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...branch,
        events: events.map((event) => ({
          ...event,
          columns: columnsByEvent.get(Number(event.id)) || [],
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/cabang:", error);
    const code = error && typeof error === "object" && "code" in error ? String((error as {code?:unknown}).code) : "";
    return NextResponse.json({
      success: false,
      code: code === "ER_NO_SUCH_TABLE" ? "CONFIG_NOT_INSTALLED" : "BRANCH_LOOKUP_FAILED",
      message: code === "ER_NO_SUCH_TABLE" ? "Konfigurasi event cabang belum tersedia. Hubungi administrator." : "Gagal memeriksa cabang dan akses event.",
    }, { status: code === "ER_NO_SUCH_TABLE" ? 503 : 500 });
  }
}
