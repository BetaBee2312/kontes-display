import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

type BranchRow = { kode_cabang: string | number; nama_cabang: string };
type EventRow = {
  id: number;
  kode_event: string;
  nama_event: string;
  kode_cabang: string;
};
type ColumnRow = {
  id: number;
  kode_kolom: string;
  nama_kolom: string;
  urutan: number;
  wajib: number;
};

export async function GET(request: NextRequest) {
  try {
    const kode = (request.nextUrl.searchParams.get("kode") || "").trim();
    if (!kode) {
      return NextResponse.json({ success: false, code: "MISSING_BRANCH_CODE", message: "Kode cabang wajib diisi." }, { status: 400 });
    }

    const [branchRows] = await db.execute(
      `SELECT kode_cabang, nama_cabang FROM tb_cabang WHERE kode_cabang = ? LIMIT 1`,
      [kode],
    );
    if (!Array.isArray(branchRows) || branchRows.length === 0) {
      return NextResponse.json({ success: false, code: "BRANCH_NOT_FOUND", message: "Cabang tidak terdaftar. Periksa kembali kode cabang." }, { status: 404 });
    }

    const branch = branchRows[0] as BranchRow;
    let [eventRows] = await db.execute(
      `SELECT e.id, e.kode_event, e.nama_event, ec.kode_cabang
       FROM tb_event_cabang ec
       INNER JOIN tb_event e ON e.id = ec.id_event
       WHERE ec.kode_cabang = ?
         AND ec.aktif = 1
         AND COALESCE(e.aktif, 1) = 1
       ORDER BY e.nama_event ASC`,
      [String(branch.kode_cabang)],
    );

    // Backward compatibility for installations whose tb_event predates its aktif column.
    // The explicit table mapping is required; events are never public/global by default.
    const events = eventRows as EventRow[];
    if (events.length === 0) {
      return NextResponse.json({
        success: true,
        code: "NO_EVENTS",
        message: "Cabang ini belum terdaftar di event manapun. Silakan hubungi administrator untuk mendapatkan akses event.",
        data: { ...branch, events: [] },
      });
    }

    const eventIds = events.map((event) => Number(event.id)).filter(Number.isFinite);
    const placeholders = eventIds.map(() => "?").join(",");
    const [fieldRows] = eventIds.length
      ? await db.execute(
          `SELECT ec.id_event, jc.id, jc.kode_kolom, jc.nama_kolom, ecc.urutan, ecc.wajib
           FROM tb_event_cabang_kolom ecc
           INNER JOIN tb_event_cabang ec
             ON ec.kode_cabang = ecc.kode_cabang AND ec.id_event = ecc.id_event
           INNER JOIN tb_jenis_dokumentasi jc ON jc.id = ecc.id_jenis_dokumentasi
           WHERE ecc.kode_cabang = ?
             AND ecc.aktif = 1
             AND ec.aktif = 1
             AND jc.aktif = 1
             AND ecc.id_event IN (${placeholders})
           ORDER BY ecc.id_event, ecc.urutan, jc.nama_kolom`,
          [String(branch.kode_cabang), ...eventIds],
        )
      : [[]];

    const fields = fieldRows as Array<ColumnRow & { id_event: number }>;
    const byEvent = new Map<number, ColumnRow[]>();
    for (const field of fields) {
      const eventId = Number(field.id_event);
      const current = byEvent.get(eventId) || [];
      current.push({
        id: field.id,
        kode_kolom: field.kode_kolom,
        nama_kolom: field.nama_kolom,
        urutan: field.urutan,
        wajib: Number(field.wajib),
      });
      byEvent.set(eventId, current);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...branch,
        events: events.map((event) => ({
          id: event.id,
          kode_event: event.kode_event,
          nama_event: event.nama_event,
          columns: byEvent.get(Number(event.id)) || [],
        })),
      },
    });
  } catch (error) {
    console.error("GET /api/cabang:", error);
    const missingConfigTable = error && typeof error === "object" && "code" in error &&
      String((error as { code?: unknown }).code).startsWith("ER_NO_SUCH_TABLE");

    return NextResponse.json({
      success: false,
      code: missingConfigTable ? "CONFIG_NOT_INSTALLED" : "BRANCH_LOOKUP_FAILED",
      message: missingConfigTable
        ? "Konfigurasi event cabang belum diaktifkan. Administrator perlu menjalankan migration database terlebih dahulu."
        : "Gagal memeriksa akses event cabang.",
    }, { status: missingConfigTable ? 503 : 500 });
  }
}
