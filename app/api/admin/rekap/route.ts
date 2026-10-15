import { NextRequest, NextResponse } from "next/server";
import {
  getReportAggregateRows,
  getReportStats,
  getCabangOptions,
  getDocumentationUnionSql,
  getDocumentationRows,
  getEventOptions,
  parseReportFilters,
} from "@/lib/admin-rekap";
import { getAdminUser, unauthorizedAdminResponse } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  try {
    if (!(await getAdminUser())) return unauthorizedAdminResponse();
    const filters = parseReportFilters(request.nextUrl.searchParams);
    const unionSql = await getDocumentationUnionSql();

    const [data, stats, branches, events, details] = await Promise.all([
      getReportAggregateRows(filters, unionSql),
      getReportStats(filters, unionSql),
      getCabangOptions(),
      getEventOptions(unionSql),
      // The UI shows real submissions/photos as well as the aggregate summary.
      // Limit the preview for large datasets; Excel export still exports every matched row.
      getDocumentationRows(filters, unionSql, 200),
    ]);

    return NextResponse.json({
      success: true,
      mode: filters.mode,
      filters,
      data,
      stats,
      details,
      detailsShown: details.length,
      options: {
        branches: branches.map((item) => ({
          kode_cabang: String(item.kode_cabang),
          nama_cabang: item.nama_cabang,
          singkatan: item.singkatan || "",
          cluster: item.cluster || "",
        })),
        events,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/rekap:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Gagal mengambil rekap dokumentasi.",
      },
      { status: 500 }
    );
  }
}
