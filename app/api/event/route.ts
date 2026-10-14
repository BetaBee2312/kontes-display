import { NextResponse } from "next/server";
import db from "@/lib/db";

function createKodeEvent(
  namaEvent: string
) {
  return namaEvent
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/*
 * GET
 * Ambil semua event aktif
 */
export async function GET() {
  try {
    const [rows] =
      await db.execute(`
        SELECT
          id,
          nama_event,
          kode_event
        FROM tb_event
        WHERE aktif = 1
        ORDER BY nama_event ASC
      `);

    return NextResponse.json({
      success: true,
      data: rows,
    });

  } catch (error) {
    console.error(
      "GET /api/event:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Gagal mengambil daftar event.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * POST
 * Tambahkan event baru
 */
export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const namaEvent =
      String(
        body.nama_event ?? ""
      ).trim();

    /*
     * Validasi
     */
    if (!namaEvent) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nama event wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    if (namaEvent.length > 100) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nama event maksimal 100 karakter.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Buat kode event
     *
     * Giveaway
     * ↓
     * giveaway
     *
     * Serah Terima Konsumen
     * ↓
     * serah_terima_konsumen
     */
    const kodeEvent =
      createKodeEvent(
        namaEvent
      );

    if (!kodeEvent) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Nama event tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Cari event yang sudah ada
     */
    const [existingRows] =
      await db.execute(
        `
          SELECT
            id,
            nama_event,
            kode_event
          FROM tb_event
          WHERE kode_event = ?
          LIMIT 1
        `,
        [kodeEvent]
      );

    if (
      Array.isArray(existingRows) &&
      existingRows.length > 0
    ) {
      const existing =
        existingRows[0] as {
          id: number;
          nama_event: string;
          kode_event: string;
        };

      return NextResponse.json({
        success: true,
        exists: true,
        message:
          "Event sudah tersedia.",
        data: existing,
      });
    }

    /*
     * INSERT EVENT BARU
     */
    const [result] =
      await db.execute(
        `
          INSERT INTO tb_event
          (
            nama_event,
            kode_event,
            aktif
          )
          VALUES
          (?, ?, 1)
        `,
        [
          namaEvent,
          kodeEvent,
        ]
      );

    const insertId =
      Number(
        (
          result as {
            insertId: number;
          }
        ).insertId
      );

    const newEvent = {
      id: insertId,
      nama_event: namaEvent,
      kode_event: kodeEvent,
    };

    return NextResponse.json(
      {
        success: true,
        exists: false,
        message:
          "Event berhasil ditambahkan.",
        data: newEvent,
      },
      {
        status: 201,
      }
    );

  } catch (error) {
    console.error(
      "POST /api/event:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal menambahkan event.",
      },
      {
        status: 500,
      }
    );
  }
}