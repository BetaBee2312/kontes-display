import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import { readFile } from "fs/promises";
import path from "path";
import db from "@/lib/db";
import { getCabangTableName } from "@/lib/cabang-table";

interface FotoRow extends RowDataPacket {
  foto: string;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const kodeCabang = String(url.searchParams.get("kode_cabang") ?? "").trim();
    const ref = String(url.searchParams.get("ref") ?? "").trim().toLowerCase();

    if (!/^\\d+$/.test(kodeCabang) || !/^[a-f0-9]{64}$/.test(ref)) {
      return NextResponse.json({ success: false, message: "Referensi foto tidak valid." }, { status: 400 });
    }

    const [branchRows] = await db.execute(
      "SELECT kode_cabang FROM tb_cabang WHERE kode_cabang = ? LIMIT 1",
      [kodeCabang],
    );
    if (!Array.isArray(branchRows) || branchRows.length === 0) {
      return NextResponse.json({ success: false, message: "Cabang tidak ditemukan." }, { status: 404 });
    }

    const tableName = getCabangTableName(kodeCabang);
    const [rows] = await db.query<FotoRow[]>(
      "SELECT foto FROM `" + tableName + "` WHERE SHA2(foto, 256) = ? LIMIT 1",
      [ref],
    );
    if (!rows.length || !rows[0].foto) {
      return NextResponse.json({ success: false, message: "Foto tidak ditemukan." }, { status: 404 });
    }

    const fotoUrl = rows[0].foto;
    const expectedPrefix = `/uploads/dokumentasi/${kodeCabang}/`;
    if (!fotoUrl.startsWith(expectedPrefix)) {
      return NextResponse.json({ success: false, message: "Lokasi foto tidak valid." }, { status: 403 });
    }

    const relativePath = fotoUrl.startsWith("/") ? fotoUrl.slice(1) : fotoUrl;
    const filePath = path.resolve(process.cwd(), "public", relativePath);
    const allowedRoot = path.resolve(process.cwd(), "public", "uploads", "dokumentasi", kodeCabang);
    if (!filePath.startsWith(allowedRoot + path.sep)) {
      return NextResponse.json({ success: false, message: "Lokasi foto tidak valid." }, { status: 403 });
    }

    let file: Buffer;
    try {
      file = await readFile(filePath);
    } catch {
      return NextResponse.json({ success: false, message: "File foto tidak ditemukan." }, { status: 404 });
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentType = extension === ".png"
      ? "image/png"
      : extension === ".webp"
        ? "image/webp"
        : "image/jpeg";

    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET /api/dokumentasi/foto:", error);
    return NextResponse.json({ success: false, message: "Gagal memuat foto." }, { status: 500 });
  }
}
