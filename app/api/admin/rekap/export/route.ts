import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import sharp from "sharp";
import { readFile } from "fs/promises";
import path from "path";
import {
  buildReportRows,
  getDocumentationRows,
  getDocumentationUnionSql,
  parseReportFilters,
} from "@/lib/admin-rekap";

const modeLabels: Record<string, string> = {
  month: "Rekap Per Bulan",
  day: "Rekap Per Hari",
  event: "Rekap Per Event",
  branch: "Rekap Per Cabang",
  branch_event: "Rekap Per Cabang dan Event",
};

function getRecapColumns(mode: string) {
  if (mode === "month") return [
    { header: "Bulan", key: "bulan", width: 18 },
    { header: "Total Dokumentasi", key: "total_dokumentasi", width: 22 },
    { header: "Cabang Aktif", key: "jumlah_cabang", width: 16 },
    { header: "Event Aktif", key: "jumlah_event", width: 16 },
  ];
  if (mode === "day") return [
    { header: "Tanggal", key: "tanggal", width: 18 },
    { header: "Total Dokumentasi", key: "total_dokumentasi", width: 22 },
    { header: "Cabang Aktif", key: "jumlah_cabang", width: 16 },
    { header: "Event Aktif", key: "jumlah_event", width: 16 },
  ];
  if (mode === "event") return [
    { header: "Event", key: "nama_event", width: 30 },
    { header: "Total Dokumentasi", key: "total_dokumentasi", width: 22 },
    { header: "Cabang", key: "jumlah_cabang", width: 16 },
    { header: "Hari Pengiriman", key: "jumlah_hari", width: 18 },
  ];
  if (mode === "branch") return [
    { header: "Kode Cabang", key: "kode_cabang", width: 16 },
    { header: "Nama Cabang", key: "nama_cabang", width: 32 },
    { header: "Total Dokumentasi", key: "total_dokumentasi", width: 22 },
    { header: "Jumlah Event", key: "jumlah_event", width: 16 },
    { header: "Hari Pengiriman", key: "jumlah_hari", width: 18 },
  ];
  return [
    { header: "Kode Cabang", key: "kode_cabang", width: 16 },
    { header: "Nama Cabang", key: "nama_cabang", width: 32 },
    { header: "Event", key: "nama_event", width: 30 },
    { header: "Total Dokumentasi", key: "total_dokumentasi", width: 22 },
    { header: "Hari Pengiriman", key: "jumlah_hari", width: 18 },
  ];
}

function safePhotoPath(photoUrl: string, branchCode: string) {
  const normalized = photoUrl.replace(/^\/+/, "");
  if (!normalized.startsWith("uploads/dokumentasi/")) return null;
  const filePath = path.resolve(process.cwd(), "public", normalized);
  const allowedRoot = path.resolve(process.cwd(), "public", "uploads", "dokumentasi");
  if (!filePath.startsWith(allowedRoot + path.sep)) return null;
  // Upload endpoint places each branch's files in a branch-specific folder.
  const expectedBranchFolder = path.join(allowedRoot, branchCode) + path.sep;
  if (!filePath.startsWith(expectedBranchFolder)) return null;
  return filePath;
}

export async function GET(request: NextRequest) {
  try {
    const filters = parseReportFilters(request.nextUrl.searchParams);
    const unionSql = await getDocumentationUnionSql();
    const docs = await getDocumentationRows(filters, unionSql);
    const recapRows = buildReportRows(docs, filters.mode);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Documentation System";
    workbook.created = new Date();
    workbook.modified = new Date();

    const recap = workbook.addWorksheet("Rekap");
    const recapColumns = getRecapColumns(filters.mode);
    recap.columns = recapColumns;
    recap.mergeCells(1, 1, 1, recapColumns.length);
    recap.getCell(1, 1).value = modeLabels[filters.mode] || "Rekap Dokumentasi";
    recap.getCell(1, 1).font = { bold: true, size: 15, color: { argb: "FF172033" } };
    recap.getCell(1, 1).alignment = { vertical: "middle" };
    recap.getRow(1).height = 28;
    recap.addRow([]);
    recap.addRow(recapColumns.map((column) => column.header));
    for (const reportRow of recapRows) {
      recap.addRow(recapColumns.map((column) => reportRow[column.key] ?? ""));
    }
    const header = recap.getRow(3);
    header.height = 24;
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.alignment = { vertical: "middle", horizontal: "center" };
    header.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFD8DEE8" } },
        bottom: { style: "thin", color: { argb: "FFD8DEE8" } },
        left: { style: "thin", color: { argb: "FFD8DEE8" } },
        right: { style: "thin", color: { argb: "FFD8DEE8" } },
      };
    });
    for (let r = 4; r <= recap.rowCount; r++) {
      recap.getRow(r).eachCell((cell) => {
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        };
      });
    }
    recap.views = [{ state: "frozen", ySplit: 3 }];
    if (recap.rowCount >= 3) recap.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: recapColumns.length } };

    const detail = workbook.addWorksheet("Detail Dokumentasi");
    detail.columns = [
      { header: "No", key: "no", width: 8 },
      { header: "ID Dokumentasi", key: "id", width: 34 },
      { header: "Kode Cabang", key: "kode_cabang", width: 16 },
      { header: "Nama Cabang", key: "nama_cabang", width: 30 },
      { header: "Event", key: "nama_event", width: 28 },
      { header: "Tanggal Dokumentasi", key: "tanggal", width: 18 },
      { header: "Waktu Upload", key: "waktu_upload", width: 23 },
      { header: "Foto", key: "foto", width: 16 },
    ];
    // Definisi kolom di atas sudah membuat header pada row 1.
    // Jangan addRow(header) lagi, karena akan menyisipkan satu baris header
    // tambahan dan membuat foto bergeser satu baris dari data yang benar.
    const detailHeader = detail.getRow(1);
    detailHeader.height = 24;
    detailHeader.font = { bold: true, color: { argb: "FFFFFFFF" } };
    detailHeader.alignment = { vertical: "middle", horizontal: "center" };
    detailHeader.eachCell((cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
      cell.border = { bottom: { style: "thin", color: { argb: "FFD8DEE8" } } };
    });

    for (let index = 0; index < docs.length; index++) {
      const doc = docs[index];
      const rowNumber = index + 2;
      const row = detail.addRow([
        index + 1,
        doc.id,
        doc.kode_cabang,
        doc.nama_cabang,
        doc.nama_event,
        doc.tanggal,
        doc.waktu_upload || doc.tanggal,
        "",
      ]);
      // Sisakan ruang yang konsisten agar thumbnail berada di tengah selnya.
      row.height = 72;
      row.alignment = { vertical: "middle", wrapText: true };
      row.eachCell((cell) => {
        cell.border = { bottom: { style: "thin", color: { argb: "FFE2E8F0" } } };
      });

      if (doc.foto) {
        const filePath = safePhotoPath(doc.foto, doc.kode_cabang);
        if (filePath) {
          try {
            const original = await readFile(filePath);
            const compressed = await sharp(original)
              .rotate()
              .resize(130, 130, { fit: "inside", withoutEnlargement: true })
              .jpeg({ quality: 65, mozjpeg: true })
              .toBuffer();
            // Encode as a data URL instead of passing Node Buffer directly.
            // This avoids incompatible Buffer typings across sharp, Node.js, and ExcelJS.
            const imageId = workbook.addImage({
              base64: `data:image/jpeg;base64,${compressed.toString("base64")}`,
              extension: "jpeg",
            });
            // Kolom Foto adalah H (index 7). Posisi menggunakan baris data
            // aktual (rowNumber - 1), bukan baris header yang duplikat.
            // Offset fractional membuat thumbnail rata tengah di sel H.
            detail.addImage(imageId, {
              tl: { col: 7.24, row: rowNumber - 1 + 0.18 },
              ext: { width: 60, height: 60 },
              editAs: "oneCell",
            });
          } catch (imageError) {
            console.warn("Foto dilewati saat export:", doc.foto, imageError);
            row.getCell(8).value = doc.foto;
          }
        } else {
          row.getCell(8).value = doc.foto;
        }
      }
    }
    detail.views = [{ state: "frozen", ySplit: 1 }];
    detail.autoFilter = { from: "A1", to: "H1" };

    // Open the workbook on actual branch submissions, not only the aggregate count sheet.
    workbook.views = [
      {
        x: 0,
        y: 0,
        width: 10000,
        height: 20000,
        firstSheet: 0,
        activeTab: 1,
        visibility: "visible",
      },
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const fileName = `rekap_dokumentasi_${filters.mode}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error("EXPORT /api/admin/rekap:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Gagal membuat Excel." },
      { status: 500 }
    );
  }
}
