import { NextRequest, NextResponse } from "next/server";
import { getAdminUser, unauthorizedAdminResponse } from "@/lib/admin-auth";
import { getAdminDashboardData, type DashboardDateRange } from "@/lib/admin-dashboard";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDateOr(value: string | null, fallback: string) {
  return value && DATE_RE.test(value) ? value : fallback;
}

function defaultDateRange(yearParam: string | null, fromParam: string | null, toParam: string | null,
  monthFromParam: string | null, monthToParam: string | null): DashboardDateRange {
  const now = new Date();
  const year = /^20\d{2}$/.test(yearParam || "") ? Number(yearParam) : now.getFullYear();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const fallbackFromDate = new Date(now);
  fallbackFromDate.setDate(fallbackFromDate.getDate() - 13);
  const fallbackFrom = `${fallbackFromDate.getFullYear()}-${String(fallbackFromDate.getMonth() + 1).padStart(2, "0")}-${String(fallbackFromDate.getDate()).padStart(2, "0")}`;
  const fallbackMonthFrom = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
  const fallbackMonthTo = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return {
    year,
    from: validDateOr(fromParam, fallbackFrom),
    to: validDateOr(toParam, today),
    monthFrom: validDateOr(monthFromParam, fallbackMonthFrom),
    monthTo: validDateOr(monthToParam, fallbackMonthTo),
  };
}

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminUser();
    if (!admin) return unauthorizedAdminResponse();

    const params = request.nextUrl.searchParams;
    const range = defaultDateRange(
      params.get("year"),
      params.get("from"),
      params.get("to"),
      params.get("monthFrom"),
      params.get("monthTo"),
    );
    const data = await getAdminDashboardData(range);
    return NextResponse.json({ success: true, ...data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/admin/dashboard:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Gagal memuat insight dashboard.",
    }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
