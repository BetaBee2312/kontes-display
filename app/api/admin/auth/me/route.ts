import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";

export async function GET() {
  try {
    const user = await getAdminUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: "Sesi admin tidak ditemukan atau sudah berakhir." },
        { status: 401 }
      );
    }
    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error("GET /api/admin/auth/me:", error);
    return NextResponse.json(
      { success: false, message: "Gagal memeriksa sesi admin." },
      { status: 500 }
    );
  }
}
