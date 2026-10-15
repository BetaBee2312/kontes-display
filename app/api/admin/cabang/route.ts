import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAdminUser, unauthorizedAdminResponse } from "@/lib/admin-auth";

type CabangPayload = {
  original_kode_cabang?: string | number | null;
  kode_cabang?: string | number;
  nama_cabang?: string;
  singkatan?: string;
  dc_support?: string | null;
  cluster?: string | null;
};

function cleanString(value: unknown): string {
  return String(value ?? "").trim();
}

function dbErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code?: unknown }).code ?? "");
  }
  return undefined;
}

function responseDbError(error: unknown, defaultMessage: string) {
  const code = dbErrorCode(error);
  if (code === "ER_DUP_ENTRY") {
    return NextResponse.json(
      { success: false, message: "Kode cabang tersebut sudah digunakan." },
      { status: 409 },
    );
  }
  if (code === "ER_ROW_IS_REFERENCED_2" || code === "ER_ROW_IS_REFERENCED") {
    return NextResponse.json(
      { success: false, message: "Cabang tidak bisa dihapus karena masih digunakan oleh data lain." },
      { status: 409 },
    );
  }
  console.error(defaultMessage, error);
  return NextResponse.json(
    { success: false, message: defaultMessage },
    { status: 500 },
  );
}

export async function GET() {
  try {
    if (!(await getAdminUser())) return unauthorizedAdminResponse();
    const [rows] = await db.query(`
      SELECT
        kode_cabang,
        nama_cabang,
        singkatan,
        dc_support,
        cluster
      FROM tb_cabang
      ORDER BY nama_cabang ASC
    `);

    return NextResponse.json({ success: true, data: rows });
  } catch (error) {
    return responseDbError(error, "Gagal mengambil data cabang.");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminUser())) return unauthorizedAdminResponse();
    const body = (await request.json()) as CabangPayload;
    const kodeCabang = cleanString(body.kode_cabang);
    const namaCabang = cleanString(body.nama_cabang);
    const singkatan = cleanString(body.singkatan).toUpperCase();
    const dcSupport = cleanString(body.dc_support) || null;
    const cluster = cleanString(body.cluster) || null;

    if (!kodeCabang || !namaCabang || !singkatan) {
      return NextResponse.json(
        { success: false, message: "Kode cabang, nama cabang, dan singkatan wajib diisi." },
        { status: 400 },
      );
    }

    await db.execute(
      `INSERT INTO tb_cabang (kode_cabang, nama_cabang, singkatan, dc_support, cluster)
       VALUES (?, ?, ?, ?, ?)`,
      [kodeCabang, namaCabang, singkatan, dcSupport, cluster],
    );

    return NextResponse.json(
      { success: true, message: "Cabang berhasil ditambahkan." },
      { status: 201 },
    );
  } catch (error) {
    return responseDbError(error, "Gagal menambahkan cabang. Periksa struktur tb_cabang dan koneksi database.");
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await getAdminUser())) return unauthorizedAdminResponse();
    const body = (await request.json()) as CabangPayload;
    const originalKode = cleanString(body.original_kode_cabang);
    const kodeCabang = cleanString(body.kode_cabang);
    const namaCabang = cleanString(body.nama_cabang);
    const singkatan = cleanString(body.singkatan).toUpperCase();
    const dcSupport = cleanString(body.dc_support) || null;
    const cluster = cleanString(body.cluster) || null;

    if (!originalKode || !kodeCabang || !namaCabang || !singkatan) {
      return NextResponse.json(
        { success: false, message: "Kode cabang awal, kode cabang, nama cabang, dan singkatan wajib diisi." },
        { status: 400 },
      );
    }

    const [result] = await db.execute(
      `UPDATE tb_cabang
       SET kode_cabang = ?, nama_cabang = ?, singkatan = ?, dc_support = ?, cluster = ?
       WHERE kode_cabang = ?`,
      [kodeCabang, namaCabang, singkatan, dcSupport, cluster, originalKode],
    );

    const affectedRows = Number((result as { affectedRows?: number }).affectedRows ?? 0);
    if (affectedRows === 0) {
      const [existing] = await db.execute(
        `SELECT kode_cabang FROM tb_cabang WHERE kode_cabang = ? LIMIT 1`,
        [kodeCabang],
      );
      if (!Array.isArray(existing) || existing.length === 0) {
        return NextResponse.json(
          { success: false, message: "Cabang tidak ditemukan atau tidak ada perubahan." },
          { status: 404 },
        );
      }
    }

    return NextResponse.json({ success: true, message: "Data cabang berhasil diperbarui." });
  } catch (error) {
    return responseDbError(error, "Gagal memperbarui cabang. Periksa struktur tb_cabang dan koneksi database.");
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await getAdminUser())) return unauthorizedAdminResponse();
    const body = (await request.json()) as CabangPayload;
    const kodeCabang = cleanString(body.kode_cabang);

    if (!kodeCabang) {
      return NextResponse.json(
        { success: false, message: "Kode cabang wajib diisi." },
        { status: 400 },
      );
    }

    const [result] = await db.execute(
      `DELETE FROM tb_cabang WHERE kode_cabang = ?`,
      [kodeCabang],
    );

    const affectedRows = Number((result as { affectedRows?: number }).affectedRows ?? 0);
    if (affectedRows === 0) {
      return NextResponse.json(
        { success: false, message: "Cabang tidak ditemukan." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, message: "Cabang berhasil dihapus." });
  } catch (error) {
    return responseDbError(error, "Gagal menghapus cabang.");
  }
}
