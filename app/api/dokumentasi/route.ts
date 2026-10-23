import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2";
import db from "@/lib/db";
import { ensureCabangTable, getCabangTableName } from "@/lib/cabang-table";
import { generateDocumentId } from "@/lib/document-id";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

interface DokumentasiFotoRow extends RowDataPacket {
    id: string;
    foto: string;
}

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
export async function POST(request: Request) {
  let savedFilePath: string | null = null;
  try {
    const formData = await request.formData();
    const kodeCabangInput = String(formData.get("kode_cabang") ?? "").trim();
    const kodeEvent = String(formData.get("kode_event") ?? "").trim();
    const kodeKolom = String(formData.get("kode_kolom") ?? "").trim();
    const tanggal = String(formData.get("tanggal") ?? "").trim();
    const foto = formData.get("foto");

    if (!/^\d+$/.test(kodeCabangInput)) {
      return NextResponse.json({ success: false, code: "INVALID_BRANCH", message: "Kode cabang tidak valid." }, { status: 400 });
    }
    if (!kodeEvent || !/^[a-z0-9_]+$/.test(kodeEvent)) {
      return NextResponse.json({ success: false, code: "INVALID_EVENT", message: "Event tidak valid." }, { status: 400 });
    }
    if (!/^[a-z0-9_]+$/.test(kodeKolom)) {
      return NextResponse.json({ success: false, code: "INVALID_FIELD", message: "Jenis dokumentasi tidak valid." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || Number.isNaN(Date.parse(`${tanggal}T00:00:00Z`))) {
      return NextResponse.json({ success: false, code: "INVALID_DATE", message: "Tanggal dokumentasi tidak valid." }, { status: 400 });
    }
    if (!(foto instanceof File)) {
      return NextResponse.json({ success: false, code: "PHOTO_REQUIRED", message: "Foto wajib diupload." }, { status: 400 });
    }
    if (!foto.type.startsWith("image/") || foto.size > 2 * 1024 * 1024) {
      return NextResponse.json({ success: false, code: "INVALID_PHOTO", message: "Foto harus berupa gambar dengan ukuran maksimal 2 MB." }, { status: 400 });
    }
    const extension = path.extname(foto.name).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(extension)) {
      return NextResponse.json({ success: false, code: "INVALID_PHOTO_FORMAT", message: "Format foto harus JPG, JPEG, PNG, atau WEBP." }, { status: 400 });
    }

    const [branchRows] = await db.execute(
      `SELECT kode_cabang, nama_cabang FROM tb_cabang WHERE kode_cabang = ? LIMIT 1`,
      [kodeCabangInput],
    );
    if (!Array.isArray(branchRows) || branchRows.length === 0) {
      return NextResponse.json({ success: false, code: "BRANCH_NOT_FOUND", message: "Cabang tidak ditemukan." }, { status: 404 });
    }
    const branch = branchRows[0] as { kode_cabang: string | number; nama_cabang: string };
    const kodeCabang = String(branch.kode_cabang);

    const [assignmentRows] = await db.execute(
      `SELECT e.id, e.kode_event, e.nama_event
       FROM tb_event_cabang ec
       INNER JOIN tb_event e ON e.id = ec.id_event
       WHERE ec.kode_cabang = ? AND ec.aktif = 1 AND e.kode_event = ?
       LIMIT 1`,
      [kodeCabang, kodeEvent],
    );
    if (!Array.isArray(assignmentRows) || assignmentRows.length === 0) {
      return NextResponse.json({ success: false, code: "EVENT_NOT_ASSIGNED", message: "Event ini tidak terdaftar untuk cabang tersebut." }, { status: 403 });
    }
    const event = assignmentRows[0] as { id: number; kode_event: string; nama_event: string };

    const [fieldRows] = await db.execute(
      `SELECT jd.id, jd.kode_kolom, jd.nama_kolom, ecc.wajib
       FROM tb_event_cabang_kolom ecc
       INNER JOIN tb_jenis_dokumentasi jd ON jd.id = ecc.id_jenis_dokumentasi
       WHERE ecc.kode_cabang = ? AND ecc.id_event = ?
         AND ecc.aktif = 1 AND jd.aktif = 1 AND jd.kode_kolom = ?
       LIMIT 1`,
      [kodeCabang, Number(event.id), kodeKolom],
    );
    if (!Array.isArray(fieldRows) || fieldRows.length === 0) {
      return NextResponse.json({ success: false, code: "FIELD_NOT_ASSIGNED", message: "Jenis foto ini tidak diizinkan untuk event dan cabang tersebut." }, { status: 403 });
    }
    const field = fieldRows[0] as { id: number; kode_kolom: string; nama_kolom: string; wajib: number };

    const tableName = await ensureCabangTable(db, kodeCabang);
    const documentId = await generateDocumentId(db, tableName, kodeCabang, tanggal, kodeEvent, kodeKolom);
    const uploadDir = path.join(process.cwd(), "public", "uploads", "dokumentasi", kodeCabang);
    await mkdir(uploadDir, { recursive: true });
    const fileName = `${documentId}_${crypto.randomUUID()}${extension}`;
    savedFilePath = path.join(uploadDir, fileName);
    await writeFile(savedFilePath, Buffer.from(await foto.arrayBuffer()));
    const fotoUrl = `/uploads/dokumentasi/${kodeCabang}/${fileName}`;

    await db.execute(
      `INSERT INTO \`${tableName}\` (id, event, tanggal, foto, kode_kolom)
       VALUES (?, ?, ?, ?, ?)`,
      [documentId, String(event.nama_event).trim(), tanggal, fotoUrl, kodeKolom],
    );

    return NextResponse.json({
      success: true,
      message: "Dokumentasi berhasil disimpan.",
      data: {
        id: documentId,
        kode_cabang: kodeCabang,
        nama_cabang: String(branch.nama_cabang),
        event: String(event.nama_event),
        kode_event: String(event.kode_event),
        kode_kolom: field.kode_kolom,
        nama_kolom: field.nama_kolom,
        tanggal,
        foto: fotoUrl,
        table: tableName,
      },
    });
  } catch (error) {
    if (savedFilePath) await unlink(savedFilePath).catch(() => undefined);
    console.error("POST /api/dokumentasi:", error);
    const code = error && typeof error === "object" && "code" in error ? String((error as {code?:unknown}).code) : "";
    if (code === "ER_NO_SUCH_TABLE") {
      return NextResponse.json({ success: false, code: "CONFIG_NOT_INSTALLED", message: "Konfigurasi event belum dipasang. Jalankan migration database terlebih dahulu." }, { status: 503 });
    }
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Gagal menyimpan dokumentasi." }, { status: 500 });
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
export async function DELETE(request: Request) {
    try {
        console.log("=================================");
        console.log("DELETE /api/dokumentasi");
        console.log("=================================");
        const body = await request.json();
        /*
         * ==========================================
         * 1. DATA
         * ==========================================
         */
        const kodeCabang = String(body.kode_cabang ?? "").trim();
        const ids = Array.isArray(body.ids)
            ? body.ids
                .map((id: unknown) => String(id).trim())
                .filter(Boolean)
            : [];
        /*
         * ==========================================
         * 2. VALIDASI
         * ==========================================
         */
        if (!kodeCabang) {
            return NextResponse.json({
                success: false,
                message: "Kode cabang wajib diisi.",
            }, {
                status: 400,
            });
        }
        if (!/^\d+$/.test(kodeCabang)) {
            return NextResponse.json({
                success: false,
                message: "Kode cabang tidak valid.",
            }, {
                status: 400,
            });
        }
        if (ids.length === 0) {
            return NextResponse.json({
                success: false,
                message: "Tidak ada dokumentasi yang dipilih.",
            }, {
                status: 400,
            });
        }
        /*
         * ==========================================
         * 3. TABLE
         * ==========================================
         */
        const tableName = getCabangTableName(kodeCabang);
        /*
         * ==========================================
         * 4. CEK CABANG
         * ==========================================
         *
         * Supaya URL / request tidak bisa
         * sembarang menunjuk ke table lain.
         */
        const [cabangRows] = await db.execute(`
          SELECT
            kode_cabang
          FROM tb_cabang
          WHERE kode_cabang = ?
          LIMIT 1
        `, [kodeCabang]);
        if (!Array.isArray(cabangRows) ||
            cabangRows.length === 0) {
            return NextResponse.json({
                success: false,
                message: "Cabang tidak ditemukan.",
            }, {
                status: 404,
            });
        }
        /*
         * ==========================================
         * 5. PLACEHOLDER
         * ==========================================
         */
        const placeholders = ids
            .map(() => "?")
            .join(", ");
        /*
         * ==========================================
         * 6. AMBIL FILE
         * ==========================================
         */
        const [rows] = await db.query<DokumentasiFotoRow[]>(`
          SELECT
            id,
            foto
          FROM \`${tableName}\`
          WHERE id IN (${placeholders})
        `, ids);
        if (rows.length === 0) {
            return NextResponse.json({
                success: false,
                message: "Data dokumentasi tidak ditemukan.",
            }, {
                status: 404,
            });
        }
        console.log("DATA AKAN DIHAPUS:", rows.map((row) => row.id));
        /*
         * ==========================================
         * 7. HAPUS DATABASE
         * ==========================================
         */
        await db.query(`
        DELETE FROM \`${tableName}\`
        WHERE id IN (${placeholders})
      `, ids);
        /*
         * ==========================================
         * 8. HAPUS FILE FISIK
         * ==========================================
         */
        let deletedFiles = 0;
        for (const row of rows) {
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
            const relativePath = row.foto.startsWith("/")
                ? row.foto.slice(1)
                : row.foto;
            const filePath = path.join(process.cwd(), "public", relativePath);
            /*
             * Pastikan file hanya berada
             * di folder uploads/dokumentasi.
             */
            const allowedRoot = path.join(process.cwd(), "public", "uploads", "dokumentasi");
            const normalizedFile = path.resolve(filePath);
            const normalizedRoot = path.resolve(allowedRoot);
            if (!normalizedFile.startsWith(normalizedRoot +
                path.sep)) {
                console.warn("Path file tidak diizinkan:", filePath);
                continue;
            }
            try {
                await unlink(normalizedFile);
                deletedFiles++;
            }
            catch (fileError) {
                /*
                 * Record database tetap sudah
                 * berhasil dihapus.
                 *
                 * Kalau file memang sudah hilang,
                 * tidak perlu membuat delete request
                 * gagal total.
                 */
                console.warn("File tidak ditemukan atau gagal dihapus:", normalizedFile, fileError);
            }
        }
        /*
         * ==========================================
         * 9. RESPONSE
         * ==========================================
         */
        return NextResponse.json({
            success: true,
            message: "Dokumentasi berhasil dihapus.",
            deletedCount: rows.length,
            deletedFiles,
        });
    }
    catch (error) {
        console.error("==========================================");
        console.error("ERROR DELETE /api/dokumentasi");
        console.error(error);
        console.error("==========================================");
        return NextResponse.json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Gagal menghapus dokumentasi.",
        }, {
            status: 500,
        });
    }
}
