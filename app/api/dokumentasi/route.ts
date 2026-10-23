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
      `SELECT jd.id, jd.kode_kolom, jd.nama_kolom, ek.wajib
       FROM tb_event_kolom ek
       INNER JOIN tb_jenis_dokumentasi jd ON jd.id = ek.id_jenis_dokumentasi
       WHERE ek.id_event = ? AND ek.aktif = 1 AND jd.aktif = 1 AND jd.kode_kolom = ?
       LIMIT 1`,
      [Number(event.id), kodeKolom],
    );
    if (!Array.isArray(fieldRows) || fieldRows.length === 0) {
      return NextResponse.json({ success: false, code: "FIELD_NOT_ASSIGNED", message: "Jenis foto ini tidak diizinkan untuk event dan cabang tersebut." }, { status: 403 });
    }
    const field = fieldRows[0] as { id: number; kode_kolom: string; nama_kolom: string; wajib: number };

    const tableName = await ensureCabangTable(db, kodeCabang);
    const documentId = await generateDocumentId(db, tableName, kodeCabang, tanggal, kodeEvent, kodeKolom);
    const uploadDir = path.join(process.cwd(), "public", "uploads", "dokumentasi", kodeCabang);
    await mkdir(uploadDir, { recursive: true });
    const fileName = `${crypto.randomUUID()}${extension}`;
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
        const body = await request.json();
        const kodeCabang = String(body.kode_cabang ?? "").trim();
        const ids = Array.isArray(body.ids)
            ? body.ids.map((id: unknown) => String(id).trim()).filter(Boolean)
            : [];
        const fotoRefs = Array.isArray(body.foto_refs)
            ? body.foto_refs.map((ref: unknown) => String(ref).trim()).filter(Boolean)
            : [];
        const usePhotoRefs = fotoRefs.length > 0;

        if (!/^\\d+$/.test(kodeCabang)) {
            return NextResponse.json({ success: false, message: "Kode cabang tidak valid." }, { status: 400 });
        }
        if (usePhotoRefs && fotoRefs.some((ref: string) => !/^[a-f0-9]{64}$/i.test(ref))) {
            return NextResponse.json({ success: false, message: "Referensi foto tidak valid." }, { status: 400 });
        }
        if (!usePhotoRefs && ids.length === 0) {
            return NextResponse.json({ success: false, message: "Tidak ada dokumentasi yang dipilih." }, { status: 400 });
        }

        const tableName = getCabangTableName(kodeCabang);
        const [cabangRows] = await db.execute(
            "SELECT kode_cabang FROM tb_cabang WHERE kode_cabang = ? LIMIT 1",
            [kodeCabang],
        );
        if (!Array.isArray(cabangRows) || cabangRows.length === 0) {
            return NextResponse.json({ success: false, message: "Cabang tidak ditemukan." }, { status: 404 });
        }

        const targets = usePhotoRefs ? fotoRefs : ids;
        const placeholders = targets.map(() => "?").join(", ");
        const query = usePhotoRefs
            ? `SELECT id, foto FROM \`${tableName}\` WHERE SHA2(foto, 256) IN (${placeholders})`
            : `SELECT id, foto FROM \`${tableName}\` WHERE id IN (${placeholders})`;
        const [rows] = await db.query<DokumentasiFotoRow[]>(query, targets);
        if (rows.length === 0) {
            return NextResponse.json({ success: false, message: "Data dokumentasi tidak ditemukan." }, { status: 404 });
        }

        const rowIds = rows.map((row) => row.id);
        const deletePlaceholders = rowIds.map(() => "?").join(", ");
        await db.query(
            `DELETE FROM \`${tableName}\` WHERE id IN (${deletePlaceholders})`,
            rowIds,
        );

        let deletedFiles = 0;
        const allowedRoot = path.resolve(process.cwd(), "public", "uploads", "dokumentasi");
        for (const row of rows) {
            if (!row.foto) continue;
            const relativePath = row.foto.startsWith("/") ? row.foto.slice(1) : row.foto;
            const filePath = path.resolve(process.cwd(), "public", relativePath);
            if (!filePath.startsWith(allowedRoot + path.sep)) {
                console.warn("Path file tidak diizinkan:", filePath);
                continue;
            }
            try {
                await unlink(filePath);
                deletedFiles++;
            } catch (fileError) {
                console.warn("File tidak ditemukan atau gagal dihapus:", filePath, fileError);
            }
        }

        return NextResponse.json({
            success: true,
            message: "Dokumentasi berhasil dihapus.",
            deletedCount: rows.length,
            deletedFiles,
        });
    } catch (error) {
        console.error("DELETE /api/dokumentasi:", error);
        return NextResponse.json({
            success: false,
            message: error instanceof Error ? error.message : "Gagal menghapus dokumentasi.",
        }, { status: 500 });
    }
}
