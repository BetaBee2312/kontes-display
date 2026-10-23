"use client";

import { useState, type FormEvent } from "react";
import Swal from "sweetalert2";

function MailIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
    </svg>
  );
}

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      await Swal.fire({ icon: "warning", title: "Data login belum lengkap", text: "Email dan password wajib diisi." });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        cache: "no-store",
      });

      const raw = await response.text();
      let result: { success?: boolean; message?: string } = {};
      try {
        result = JSON.parse(raw);
      } catch {
        throw new Error("Server mengembalikan respons yang tidak valid.");
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Login gagal.");
      }

      window.location.replace("/admin");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal menghubungi server.";
      setError(message);
      await Swal.fire({ icon: "error", title: "Login gagal", text: message });
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-900">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-6 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-6 w-6">
                <path d="M14 2.75H6.5A1.75 1.75 0 0 0 4.75 4.5v15A1.75 1.75 0 0 0 6.5 21.25h11A1.75 1.75 0 0 0 19.25 19.5V8Z" />
                <path d="M14 2.75V8h5.25M8 12h8M8 15.5h8" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold">Documentation System</p>
              <p className="mt-0.5 text-xs text-slate-500">Admin Console</p>
            </div>
          </div>
          <h1 className="mt-7 text-2xl font-semibold tracking-tight">Masuk ke admin</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6 sm:px-8">
          <div>
            <label htmlFor="admin-email" className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400"><MailIcon /></span>
              <input
                id="admin-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nama@perusahaan.com"
                className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-3.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="admin-password" className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400"><LockIcon /></span>
              <input
                id="admin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan password"
                className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-20 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
              <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-500 hover:text-slate-800">
                {showPassword ? "Sembunyikan" : "Lihat"}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Memeriksa akun..." : "Masuk"}
            {!loading && <span aria-hidden="true">→</span>}
          </button>
        </form>
      </section>
    </main>
  );
}
