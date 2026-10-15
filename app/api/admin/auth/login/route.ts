import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_SECONDS,
  createAdminSessionToken,
  verifyStoredPassword,
} from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? "").trim();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }
    if (email.length > 254 || password.length > 1024) {
      return NextResponse.json(
        { success: false, message: "Email atau password tidak valid." },
        { status: 400 }
      );
    }

    const [rows] = await db.execute(
      `SELECT id, username, email, password
       FROM tb_akun
       WHERE LOWER(email) = LOWER(?)
       LIMIT 1`,
      [email]
    );
    const account = Array.isArray(rows)
      ? (rows[0] as Record<string, unknown> | undefined)
      : undefined;

    // One generic response avoids disclosing whether an email exists.
    if (
      !account ||
      !(await verifyStoredPassword(password, String(account.password ?? "")))
    ) {
      return NextResponse.json(
        { success: false, message: "Email atau password salah." },
        { status: 401 }
      );
    }

    const token = createAdminSessionToken(String(account.email));
    const response = NextResponse.json({
      success: true,
      message: "Login berhasil.",
      user: {
        id: Number(account.id),
        username: String(account.username ?? ""),
        email: String(account.email ?? ""),
      },
    });

    response.cookies.set(ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ADMIN_SESSION_SECONDS,
    });
    return response;
  } catch (error) {
    console.error("POST /api/admin/auth/login:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Login gagal. Periksa struktur tb_akun dan koneksi database.",
      },
      { status: 500 }
    );
  }
}
