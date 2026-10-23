import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAdminUser, unauthorizedAdminResponse } from "@/lib/admin-auth";

function clean(value: unknown) {
  return String(value ?? "").trim();
}

function missingTable(error: unknown) {
  return !!error && typeof error === "object" && "code" in error &&
    String((error as { code?: unknown }).code ?? "") === "ER_NO_SUCH_TABLE";
}

function databaseError(error: unknown, message: string) {
  console.error(message, error);
  return NextResponse.json({
    success: false,
    message: missingTable(error)
      ? "Tabel konfigurasi belum tersedia. Jalankan database migration terlebih dahulu."
      : message,
  }, { status: missingTable(error) ? 503 : 500 });
}

export async function GET() {
  try {
    if (!(await getAdminUser())) return unauthorizedAdminResponse();
    const [branches] = await db.query(
      `SELECT kode_cabang, nama_cabang, singkatan FROM tb_cabang ORDER BY nama_cabang ASC`,
    );
    const [events] = await db.query(
      `SELECT id, kode_event, nama_event FROM tb_event ORDER BY nama_event ASC`,
    );
    const [assignments] = await db.query(
      `SELECT id, kode_cabang, id_event, aktif FROM tb_event_cabang ORDER BY kode_cabang, id_event`,
    );
    const [fields] = await db.query(
      `SELECT id, kode_kolom, nama_kolom, aktif FROM tb_jenis_dokumentasi ORDER BY nama_kolom ASC`,
    );
    const [fieldAssignments] = await db.query(
      `SELECT id, kode_cabang, id_event, id_jenis_dokumentasi, urutan, wajib, aktif
       FROM tb_event_cabang_kolom
       ORDER BY kode_cabang, id_event, urutan, id`,
    );
    return NextResponse.json({
      success: true,
      data: { cabang: branches, events, assignments, fields, fieldAssignments },
    });
  } catch (error) {
    return databaseError(error, "Gagal mengambil konfigurasi event cabang.");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminUser())) return unauthorizedAdminResponse();
    const body = await request.json() as { action?: unknown; kode_kolom?: unknown; nama_kolom?: unknown };
    if (body.action !== "create-field") {
      return NextResponse.json({ success: false, message: "Aksi tidak dikenal." }, { status: 400 });
    }
    const kode = clean(body.kode_kolom).toLowerCase();
    const nama = clean(body.nama_kolom);
    if (!/^[a-z0-9_]{1,50}$/.test(kode) || !nama || nama.length > 100) {
      return NextResponse.json({ success: false, message: "Kode kolom harus berupa huruf kecil, angka, atau garis bawah; nama maksimal 100 karakter." }, { status: 400 });
    }
    const [existing] = await db.execute(
      `SELECT id FROM tb_jenis_dokumentasi WHERE kode_kolom = ? LIMIT 1`,
      [kode],
    );
    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({ success: false, message: "Kode kolom tersebut sudah digunakan. Gunakan nama yang berbeda." }, { status: 409 });
    }
    await db.execute(
      `INSERT INTO tb_jenis_dokumentasi (kode_kolom, nama_kolom, aktif) VALUES (?, ?, 1)`,
      [kode, nama],
    );
    return NextResponse.json({ success: true, message: `Kolom foto "${nama}" berhasil ditambahkan. Aktifkan untuk cabang/event yang membutuhkan.` }, { status: 201 });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
    if (code === "ER_DUP_ENTRY") return NextResponse.json({ success: false, message: "Kode kolom tersebut sudah digunakan." }, { status: 409 });
    return databaseError(error, "Gagal menambahkan jenis kolom foto.");
  }
}
export async function PUT(request: NextRequest) {
  let connection: Awaited<ReturnType<typeof db.getConnection>> | undefined;
  try {
    if (!(await getAdminUser())) return unauthorizedAdminResponse();
    const body = await request.json() as {
      kode_cabang?: unknown;
      assignments?: Array<{
        id_event?: unknown;
        aktif?: unknown;
        columns?: Array<{ id_jenis_dokumentasi?: unknown; aktif?: unknown; wajib?: unknown; urutan?: unknown }>;
      }>;
    };
    const kodeCabang = clean(body.kode_cabang);
    const assignments = Array.isArray(body.assignments) ? body.assignments : [];
    if (!/^\d+$/.test(kodeCabang)) {
      return NextResponse.json({ success: false, message: "Kode cabang tidak valid." }, { status: 400 });
    }
    const eventIds = assignments.map((item) => Number(item.id_event));
    if (eventIds.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(eventIds).size !== eventIds.length) {
      return NextResponse.json({ success: false, message: "Daftar event tidak valid atau duplikat." }, { status: 400 });
    }
    for (const assignment of assignments) {
      const ids = (Array.isArray(assignment.columns) ? assignment.columns : []).map((item) => Number(item.id_jenis_dokumentasi));
      if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
        return NextResponse.json({ success: false, message: "Daftar kolom foto tidak valid atau duplikat." }, { status: 400 });
      }
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [branchRows] = await connection.execute(
      `SELECT kode_cabang FROM tb_cabang WHERE kode_cabang = ? LIMIT 1 FOR UPDATE`,
      [kodeCabang],
    );
    if (!Array.isArray(branchRows) || branchRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: "Cabang tidak ditemukan." }, { status: 404 });
    }

    const [knownEvents] = await connection.query(`SELECT id FROM tb_event`);
    const knownEventIds = new Set((knownEvents as Array<{ id: number | string }>).map((item) => Number(item.id)));
    if (eventIds.some((id) => !knownEventIds.has(id))) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: "Terdapat event yang tidak terdaftar." }, { status: 400 });
    }

    const fieldIds = assignments.flatMap((assignment) =>
      (Array.isArray(assignment.columns) ? assignment.columns : []).map((field) => Number(field.id_jenis_dokumentasi))
    );
    const [knownFields] = await connection.query(`SELECT id FROM tb_jenis_dokumentasi`);
    const knownFieldIds = new Set((knownFields as Array<{ id: number | string }>).map((item) => Number(item.id)));
    if (fieldIds.some((id) => !knownFieldIds.has(id))) {
      await connection.rollback();
      return NextResponse.json({ success: false, message: "Terdapat jenis dokumentasi yang tidak aktif atau tidak dikenal." }, { status: 400 });
    }

    const submittedEventIds = new Set(eventIds);
    const [existingAssignments] = await connection.execute(
      `SELECT id_event FROM tb_event_cabang WHERE kode_cabang = ?`,
      [kodeCabang],
    );
    for (const row of existingAssignments as Array<{ id_event: number | string }>) {
      if (!submittedEventIds.has(Number(row.id_event))) {
        await connection.execute(
          `UPDATE tb_event_cabang SET aktif = 0 WHERE kode_cabang = ? AND id_event = ?`,
          [kodeCabang, Number(row.id_event)],
        );
        await connection.execute(
          `UPDATE tb_event_cabang_kolom SET aktif = 0 WHERE kode_cabang = ? AND id_event = ?`,
          [kodeCabang, Number(row.id_event)],
        );
      }
    }

    for (const assignment of assignments) {
      const idEvent = Number(assignment.id_event);
      const active = assignment.aktif === true || Number(assignment.aktif) === 1;
      await connection.execute(
        `INSERT INTO tb_event_cabang (kode_cabang, id_event, aktif)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE aktif = VALUES(aktif)`,
        [kodeCabang, idEvent, active ? 1 : 0],
      );
      await connection.execute(
        `UPDATE tb_event_cabang_kolom SET aktif = 0 WHERE kode_cabang = ? AND id_event = ?`,
        [kodeCabang, idEvent],
      );

      const columns = Array.isArray(assignment.columns) ? assignment.columns : [];
      for (const [index, field] of columns.entries()) {
        const idJenis = Number(field.id_jenis_dokumentasi);
        const columnActive = active && (field.aktif === true || Number(field.aktif) === 1);
        const required = field.wajib === true || Number(field.wajib) === 1;
        const order = Number.isInteger(Number(field.urutan)) ? Number(field.urutan) : index;
        await connection.execute(
          `INSERT INTO tb_event_cabang_kolom
            (kode_cabang, id_event, id_jenis_dokumentasi, urutan, wajib, aktif)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             urutan = VALUES(urutan), wajib = VALUES(wajib), aktif = VALUES(aktif)`,
          [kodeCabang, idEvent, idJenis, order, required ? 1 : 0, columnActive ? 1 : 0],
        );
      }
    }

    await connection.commit();
    return NextResponse.json({ success: true, message: "Konfigurasi event dan kolom dokumentasi berhasil disimpan." });
  } catch (error) {
    if (connection) await connection.rollback().catch(() => undefined);
    return databaseError(error, "Gagal menyimpan konfigurasi event cabang.");
  } finally {
    connection?.release();
  }
}
