import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import db from "@/lib/db";

export const ADMIN_COOKIE_NAME = "admin_session";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 8;

export type AdminUser = {
  id: number;
  username: string;
  email: string;
};

type SessionPayload = {
  email: string;
  exp: number;
};

function sessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET belum disetel atau kurang dari 32 karakter. Tambahkan ke .env.local."
    );
  }
  return secret;
}

function sign(encodedPayload: string) {
  return createHmac("sha256", sessionSecret())
    .update(encodedPayload)
    .digest("base64url");
}

function safeEqualText(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createAdminSessionToken(email: string) {
  const payload: SessionPayload = {
    email: email.trim().toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

function verifyAdminSessionToken(token: string): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [encoded, signature] = parts;

  let expectedSignature: string;
  try {
    expectedSignature = sign(encoded);
  } catch {
    return null;
  }
  if (!safeEqualText(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<SessionPayload>;
    if (
      typeof payload.email !== "string" ||
      !payload.email.includes("@") ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return { email: payload.email, exp: payload.exp };
  } catch {
    return null;
  }
}

/**
 * tb_akun in the current project has only id, username, email, and password.
 * There is no role/category column, so any valid account in this table can
 * access the admin area. Add a role column if different access levels are needed.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifyAdminSessionToken(token);
  if (!payload) return null;

  const [rows] = await db.execute(
    `SELECT id, username, email
     FROM tb_akun
     WHERE LOWER(email) = LOWER(?)
     LIMIT 1`,
    [payload.email]
  );

  const row = Array.isArray(rows) ? (rows[0] as Record<string, unknown> | undefined) : undefined;
  if (!row) return null;

  return {
    id: Number(row.id),
    username: String(row.username ?? ""),
    email: String(row.email ?? ""),
  };
}

export function unauthorizedAdminResponse() {
  return Response.json(
    { success: false, message: "Akses admin memerlukan login. Silakan masuk kembali." },
    { status: 401 }
  );
}

/** Supports PHP bcrypt hashes ($2y$) and legacy plaintext rows while the
 * existing account table is migrated. Prefer storing password_hash() values. */
export async function verifyStoredPassword(inputPassword: string, storedValue: string) {
  if (/^\$2[aby]\$/.test(storedValue)) {
    const bcrypt = await import("bcryptjs");
    const normalized = storedValue.startsWith("$2y$")
      ? `$2b$${storedValue.slice(4)}`
      : storedValue;
    return bcrypt.compare(inputPassword, normalized);
  }

  // Do not accept other unknown hash formats as raw passwords.
  if (/^\$(?:argon2|scrypt|pbkdf2)/i.test(storedValue)) return false;

  return safeEqualText(inputPassword, storedValue);
}
