import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(
  request: NextRequest
) {
  try {
    const kode =
      request.nextUrl.searchParams
        .get("kode")
        ?.trim();

    if (!kode) {
      return NextResponse.json(
        {
          success: false,
          message: "Kode cabang wajib diisi",
        },
        { status: 400 }
      );
    }

    const [rows] = await db.execute(
      `
        SELECT
          kode_cabang,
          nama_cabang
        FROM tb_cabang
        WHERE kode_cabang = ?
        LIMIT 1
      `,
      [kode]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Cabang tidak ditemukan",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal mencari cabang",
      },
      { status: 500 }
    );
  }
}