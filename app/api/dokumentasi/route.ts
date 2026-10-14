import { NextResponse } from "next/server";
import db from "@/lib/db";

import {
  ensureCabangTable,
} from "@/lib/cabang-table";

import {
  getCabangTableName,
} from "@/lib/cabang-table";

import {
  generateDocumentId,
} from "@/lib/document-id";

import {
  mkdir,
  writeFile,
  unlink,
} from "fs/promises";

import path from "path";
import crypto from "crypto";

/*
|--------------------------------------------------------------------------
| POST
|--------------------------------------------------------------------------
| Upload dokumentasi
|
| Event bisa:
| 1. berasal dari tb_event
| 2. event custom yang langsung diketik cabang
|
| Event custom TIDAK wajib ada di tb_event.
|--------------------------------------------------------------------------
*/

export async function POST(
  request: Request
) {
  try {
    console.log(
      "================================="
    );
    console.log(
      "POST /api/dokumentasi"
    );
    console.log(
      "================================="
    );

    const formData =
      await request.formData();

    /*
     * ==========================================
     * 1. AMBIL DATA
     * ==========================================
     */

    const kodeCabangInput =
      String(
        formData.get(
          "kode_cabang"
        ) ?? ""
      ).trim();

    const kodeEvent =
      String(
        formData.get(
          "kode_event"
        ) ?? ""
      ).trim();

    const namaEventInput =
      String(
        formData.get(
          "nama_event"
        ) ?? ""
      ).trim();

    const tanggal =
      String(
        formData.get(
          "tanggal"
        ) ?? ""
      ).trim();

    const foto =
      formData.get("foto");

    console.log(
      "DATA FORM:",
      {
        kodeCabangInput,
        kodeEvent,
        namaEventInput,
        tanggal,
        foto:
          foto instanceof File
            ? foto.name
            : null,
      }
    );

    /*
     * ==========================================
     * 2. VALIDASI
     * ==========================================
     */

    if (!kodeCabangInput) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Kode cabang wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    if (!kodeEvent) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Kode event wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    if (!tanggal) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tanggal wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !(foto instanceof File)
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Foto wajib diupload.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * 3. VALIDASI FILE
     * ==========================================
     */

    if (
      !foto.type.startsWith(
        "image/"
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "File harus berupa gambar.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      foto.size >
      2 * 1024 * 1024
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Ukuran foto maksimal 2 MB.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * 4. CARI CABANG
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
        [kodeCabangInput]
      );

    if (
      !Array.isArray(
        cabangRows
      ) ||
      cabangRows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cabang tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    const cabang =
      cabangRows[0] as {
        kode_cabang:
          | string
          | number;

        nama_cabang: string;
      };

    const kodeCabang =
      String(
        cabang.kode_cabang
      ).trim();

    const namaCabang =
      String(
        cabang.nama_cabang
      ).trim();

    console.log(
      "CABANG:",
      {
        kodeCabang,
        namaCabang,
      }
    );

    /*
     * ==========================================
     * 5. TENTUKAN NAMA EVENT
     * ==========================================
     *
     * Prioritas:
     *
     * nama_event dari form
     *        ↓
     * kalau kosong, cari di tb_event
     *
     * Dengan begitu:
     *
     * Promina
     * → bisa dari master
     *
     * Giveaway
     * → bisa event custom
     */

    let namaEvent =
      namaEventInput;

    if (!namaEvent) {
      const [
        eventRows,
      ] = await db.execute(
        `
          SELECT
            nama_event
          FROM tb_event
          WHERE kode_event = ?
            AND aktif = 1
          LIMIT 1
        `,
        [kodeEvent]
      );

      if (
        Array.isArray(
          eventRows
        ) &&
        eventRows.length > 0
      ) {
        const event =
          eventRows[0] as {
            nama_event: string;
          };

        namaEvent =
          String(
            event.nama_event
          ).trim();
      }
    }

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

    console.log(
      "EVENT:",
      {
        namaEvent,
        kodeEvent,
      }
    );

    /*
     * ==========================================
     * 6. BUAT / PASTIKAN TABEL CABANG
     * ==========================================
     *
     * 23212
     * ↓
     * tb_23212
     */

    const tableName =
      await ensureCabangTable(
        db,
        kodeCabang
      );

    console.log(
      "TABLE:",
      tableName
    );

    /*
     * ==========================================
     * 7. GENERATE ID
     * ==========================================
     *
     * 23212_20261008_promina
     *
     * atau:
     *
     * 23212_20261008_giveaway
     */

    const documentId =
      await generateDocumentId(
        db,
        tableName,
        kodeCabang,
        tanggal,
        kodeEvent
      );

    console.log(
      "DOCUMENT ID:",
      documentId
    );

    /*
     * ==========================================
     * 8. EXTENSION
     * ==========================================
     */

    const extension =
      path
        .extname(
          foto.name
        )
        .toLowerCase();

    const allowedExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".webp",
    ];

    if (
      !allowedExtensions.includes(
        extension
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Format foto harus JPG, JPEG, PNG, atau WEBP.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * 9. FOLDER UPLOAD
     * ==========================================
     */

    const uploadDir =
      path.join(
        process.cwd(),
        "public",
        "uploads",
        "dokumentasi",
        kodeCabang
      );

    await mkdir(
      uploadDir,
      {
        recursive: true,
      }
    );

    /*
     * ==========================================
     * 10. NAMA FILE
     * ==========================================
     */

    const fileName =
      `${documentId}_${crypto.randomUUID()}${extension}`;

    const filePath =
      path.join(
        uploadDir,
        fileName
      );

    /*
     * ==========================================
     * 11. SIMPAN FILE
     * ==========================================
     */

    const buffer =
      Buffer.from(
        await foto.arrayBuffer()
      );

    await writeFile(
      filePath,
      buffer
    );

    console.log(
      "FILE BERHASIL DISIMPAN:",
      filePath
    );

    /*
     * ==========================================
     * 12. URL FOTO
     * ==========================================
     */

    const fotoUrl =
      `/uploads/dokumentasi/${kodeCabang}/${fileName}`;

    /*
     * ==========================================
     * 13. INSERT DATABASE
     * ==========================================
     */

    await db.execute(
      `
        INSERT INTO \`${tableName}\`
        (
          id,
          event,
          tanggal,
          foto
        )
        VALUES (?, ?, ?, ?)
      `,
      [
        documentId,
        namaEvent,
        tanggal,
        fotoUrl,
      ]
    );

    console.log(
      "DATABASE BERHASIL DIINSERT"
    );

    /*
     * ==========================================
     * 14. RESPONSE
     * ==========================================
     */

    return NextResponse.json({
      success: true,

      message:
        "Dokumentasi berhasil disimpan.",

      data: {
        id: documentId,

        kode_cabang:
          kodeCabang,

        nama_cabang:
          namaCabang,

        event:
          namaEvent,

        kode_event:
          kodeEvent,

        tanggal,

        foto:
          fotoUrl,

        table:
          tableName,
      },
    });

  } catch (error) {
    console.error(
      "=========================================="
    );

    console.error(
      "ERROR POST /api/dokumentasi"
    );

    console.error(error);

    console.error(
      "=========================================="
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Internal server error.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? String(error)
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}


/*
|--------------------------------------------------------------------------
| DELETE
|--------------------------------------------------------------------------
| Hapus satu atau beberapa dokumentasi.
|
| Body:
|
| {
|   kode_cabang: "23212",
|   ids: [
|     "23212_20261008_promina",
|     "23212_20261008_giveaway"
|   ]
| }
|--------------------------------------------------------------------------
*/

export async function DELETE(
  request: Request
) {
  try {
    console.log(
      "================================="
    );

    console.log(
      "DELETE /api/dokumentasi"
    );

    console.log(
      "================================="
    );

    const body =
      await request.json();

    /*
     * ==========================================
     * 1. DATA
     * ==========================================
     */

    const kodeCabang =
      String(
        body.kode_cabang ?? ""
      ).trim();

    const ids =
      Array.isArray(
        body.ids
      )
        ? body.ids
            .map(
              (id: unknown) =>
                String(id).trim()
            )
            .filter(Boolean)
        : [];

    /*
     * ==========================================
     * 2. VALIDASI
     * ==========================================
     */

    if (!kodeCabang) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Kode cabang wajib diisi.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !/^\d+$/.test(
        kodeCabang
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Kode cabang tidak valid.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      ids.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tidak ada dokumentasi yang dipilih.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * 3. TABLE
     * ==========================================
     */

    const tableName =
      getCabangTableName(
        kodeCabang
      );

    /*
     * ==========================================
     * 4. CEK CABANG
     * ==========================================
     *
     * Supaya URL / request tidak bisa
     * sembarang menunjuk ke table lain.
     */

    const [cabangRows] =
      await db.execute(
        `
          SELECT
            kode_cabang
          FROM tb_cabang
          WHERE kode_cabang = ?
          LIMIT 1
        `,
        [kodeCabang]
      );

    if (
      !Array.isArray(
        cabangRows
      ) ||
      cabangRows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cabang tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ==========================================
     * 5. PLACEHOLDER
     * ==========================================
     */

    const placeholders =
      ids
        .map(() => "?")
        .join(", ");

    /*
     * ==========================================
     * 6. AMBIL FILE
     * ==========================================
     */

    const [rows] =
      await db.query<
        {
          id: string;
          foto: string;
        }[]
      >(
        `
          SELECT
            id,
            foto
          FROM \`${tableName}\`
          WHERE id IN (${placeholders})
        `,
        ids
      );

    if (
      rows.length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Data dokumentasi tidak ditemukan.",
        },
        {
          status: 404,
        }
      );
    }

    console.log(
      "DATA AKAN DIHAPUS:",
      rows.map(
        (row) => row.id
      )
    );

    /*
     * ==========================================
     * 7. HAPUS DATABASE
     * ==========================================
     */

    await db.query(
      `
        DELETE FROM \`${tableName}\`
        WHERE id IN (${placeholders})
      `,
      ids
    );

    /*
     * ==========================================
     * 8. HAPUS FILE FISIK
     * ==========================================
     */

    let deletedFiles = 0;

    for (
      const row of rows
    ) {
      if (!row.foto) {
        continue;
      }

      /*
       * Contoh:
       *
       * /uploads/dokumentasi/23212/file.jpg
       *
       * menjadi:
       *
       * public/uploads/dokumentasi/23212/file.jpg
       */

      const relativePath =
        row.foto.startsWith("/")
          ? row.foto.slice(1)
          : row.foto;

      const filePath =
        path.join(
          process.cwd(),
          "public",
          relativePath
        );

      /*
       * Pastikan file hanya berada
       * di folder uploads/dokumentasi.
       */

      const allowedRoot =
        path.join(
          process.cwd(),
          "public",
          "uploads",
          "dokumentasi"
        );

      const normalizedFile =
        path.resolve(
          filePath
        );

      const normalizedRoot =
        path.resolve(
          allowedRoot
        );

      if (
        !normalizedFile.startsWith(
          normalizedRoot +
            path.sep
        )
      ) {
        console.warn(
          "Path file tidak diizinkan:",
          filePath
        );

        continue;
      }

      try {
        await unlink(
          normalizedFile
        );

        deletedFiles++;

      } catch (fileError) {
        /*
         * Record database tetap sudah
         * berhasil dihapus.
         *
         * Kalau file memang sudah hilang,
         * tidak perlu membuat delete request
         * gagal total.
         */

        console.warn(
          "File tidak ditemukan atau gagal dihapus:",
          normalizedFile,
          fileError
        );
      }
    }

    /*
     * ==========================================
     * 9. RESPONSE
     * ==========================================
     */

    return NextResponse.json({
      success: true,

      message:
        "Dokumentasi berhasil dihapus.",

      deletedCount:
        rows.length,

      deletedFiles,
    });

  } catch (error) {
    console.error(
      "=========================================="
    );

    console.error(
      "ERROR DELETE /api/dokumentasi"
    );

    console.error(error);

    console.error(
      "=========================================="
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error instanceof Error
            ? error.message
            : "Gagal menghapus dokumentasi.",
      },
      {
        status: 500,
      }
    );
  }
}