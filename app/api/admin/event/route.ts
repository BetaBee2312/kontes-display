import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getAdminUser, unauthorizedAdminResponse } from "@/lib/admin-auth";

function normalizeCode(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function publicEvent(row: Record<string, unknown>, index: number) {
  const kode = String(row.kode_event ?? "");
  const nama = String(row.nama_event ?? "");
  const rawId = row.id ?? row.id_event ?? row.event_id ?? kode ?? index + 1;
  return {
    id: typeof rawId === "string" || typeof rawId === "number" ? rawId : String(rawId),
    kode_event: kode,
    nama_event: nama,
  };
}

export async function GET() {
  try {
    if (!(await getAdminUser())) return unauthorizedAdminResponse();
    const [rows] = await db.query("SELECT * FROM tb_event ORDER BY nama_event ASC");
    const data = (rows as Record<string, unknown>[]).map(publicEvent);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/admin/event:", error);
    return NextResponse.json(
      { success: false, message: "Gagal mengambil data tb_event. Pastikan tabel dan kolom nama_event serta kode_event tersedia." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await getAdminUser())) return unauthorizedAdminResponse();
    const body = await request.json();
    const namaEvent = String(body.nama_event ?? "").trim();
    const kodeEvent = normalizeCode(String(body.kode_event ?? namaEvent));

    if (!namaEvent || !kodeEvent) {
      return NextResponse.json({ success: false, message: "Nama event dan kode event wajib diisi." }, { status: 400 });
    }

    const [existing] = await db.execute(
      "SELECT kode_event FROM tb_event WHERE kode_event = ? LIMIT 1",
      [kodeEvent]
    );
    if (Array.isArray(existing) && existing.length > 0) {
      return NextResponse.json({ success: false, message: `Kode event "${kodeEvent}" sudah digunakan.` }, { status: 409 });
    }

    await db.execute(
      "INSERT INTO tb_event (kode_event, nama_event) VALUES (?, ?)",
      [kodeEvent, namaEvent]
    );

    return NextResponse.json({ success: true, message: "Event berhasil ditambahkan." }, { status: 201 });
  } catch (error) {
    console.error("POST /api/admin/event:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Gagal menambahkan event." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!(await getAdminUser())) return unauthorizedAdminResponse();
    const body = await request.json();
    const originalKode = normalizeCode(String(body.original_kode_event ?? ""));
    const namaEvent = String(body.nama_event ?? "").trim();
    const kodeEvent = normalizeCode(String(body.kode_event ?? ""));

    if (!originalKode || !namaEvent || !kodeEvent) {
      return NextResponse.json({ success: false, message: "Kode event lama, nama event, dan kode event baru wajib diisi." }, { status: 400 });
    }

    const [existing] = await db.execute(
      "SELECT kode_event FROM tb_event WHERE kode_event = ? LIMIT 1",
      [originalKode]
    );
    if (!Array.isArray(existing) || existing.length === 0) {
      return NextResponse.json({ success: false, message: "Event yang akan diedit tidak ditemukan." }, { status: 404 });
    }

    if (kodeEvent !== originalKode) {
      const [duplicate] = await db.execute(
        "SELECT kode_event FROM tb_event WHERE kode_event = ? LIMIT 1",
        [kodeEvent]
      );
      if (Array.isArray(duplicate) && duplicate.length > 0) {
        return NextResponse.json({ success: false, message: `Kode event "${kodeEvent}" sudah digunakan.` }, { status: 409 });
      }
    }

    await db.execute(
      "UPDATE tb_event SET kode_event = ?, nama_event = ? WHERE kode_event = ?",
      [kodeEvent, namaEvent, originalKode]
    );

    return NextResponse.json({ success: true, message: "Event berhasil diperbarui." });
  } catch (error) {
    console.error("PUT /api/admin/event:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Gagal memperbarui event." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!(await getAdminUser())) return unauthorizedAdminResponse();
    const body = await request.json();
    const kodeEvent = normalizeCode(String(body.kode_event ?? ""));

    if (!kodeEvent) {
      return NextResponse.json({ success: false, message: "Kode event wajib diisi." }, { status: 400 });
    }

    const [result] = await db.execute(
      "DELETE FROM tb_event WHERE kode_event = ?",
      [kodeEvent]
    );

    const affectedRows = Number((result as { affectedRows?: number }).affectedRows ?? 0);
    if (affectedRows === 0) {
      return NextResponse.json({ success: false, message: "Event tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Event berhasil dihapus." });
  } catch (error) {
    console.error("DELETE /api/admin/event:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Gagal menghapus event. Periksa apakah event masih digunakan oleh dokumentasi." },
      { status: 500 }
    );
  }
}
