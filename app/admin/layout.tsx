"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import Swal from "sweetalert2";

type IconName = "dashboard" | "branches" | "events" | "reports" | "documents";

const navigation: {
  label: string;
  href: string;
  icon: IconName;
  description: string;
}[] = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: "dashboard",
    description: "Ringkasan operasional",
  },
  {
    label: "Manajemen Cabang",
    href: "/admin/cabang",
    icon: "branches",
    description: "Kelola data cabang",
  },
  {
    label: "Manajemen Event",
    href: "/admin/event",
    icon: "events",
    description: "Kelola event terdaftar",
  },
  {
    label: "Konfigurasi Event Cabang",
    href: "/admin/event-cabang",
    icon: "documents",
    description: "Atur event dan kolom foto per cabang",
  },
  {
    label: "Rekap Dokumentasi",
    href: "/admin/rekap",
    icon: "reports",
    description: "Filter dan export data",
  },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AdminIcon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const common = {
    "aria-hidden": true as const,
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="4" rx="1.5" />
          <rect x="13.5" y="10.5" width="7" height="10" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "branches":
      return (
        <svg {...common}>
          <path d="M4 20.5h16" />
          <path d="M6 20.5V5.5a1.5 1.5 0 0 1 1.5-1.5h9A1.5 1.5 0 0 1 18 5.5v15" />
          <path d="M9 8h1M14 8h1M9 12h1M14 12h1M10 20.5v-4h4v4" />
        </svg>
      );
    case "events":
      return (
        <svg {...common}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M7.5 3.5v3M16.5 3.5v3M3.5 9.5h17M8 13h2M14 13h2M8 16.5h2" />
        </svg>
      );
    case "reports":
      return (
        <svg {...common}>
          <path d="M4 20.5h16" />
          <rect x="5" y="12" width="3.5" height="6.5" rx=".7" />
          <rect x="10.25" y="8" width="3.5" height="10.5" rx=".7" />
          <rect x="15.5" y="4" width="3.5" height="14.5" rx=".7" />
        </svg>
      );
    case "documents":
      return (
        <svg {...common}>
          <path d="M14 2.75H6.5A1.75 1.75 0 0 0 4.75 4.5v14A1.75 1.75 0 0 0 6.5 20.25h11a1.75 1.75 0 0 0 1.75-1.75V8.25Z" />
          <path d="M14 2.75v5.5h5.25M8 12h8M8 15.5h8" />
        </svg>
      );
  }
}

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/admin/login";
  const [authChecked, setAuthChecked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    if (isLoginPage) {
      setAuthChecked(true);
      return () => { active = false; };
    }

    setAuthChecked(false);
    fetch("/api/admin/auth/me", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Sesi admin tidak ditemukan");
        return response.json();
      })
      .then((result) => {
        if (!result?.success || !result?.user) throw new Error("Sesi admin tidak valid");
        if (active) setAuthChecked(true);
      })
      .catch(() => {
        if (active) router.replace("/admin/login");
      });

    return () => { active = false; };
  }, [isLoginPage, pathname, router]);

  async function handleLogout() {
    const confirmation = await Swal.fire({
      icon: "question",
      title: "Keluar dari admin?",
      text: "Sesi admin akan diakhiri pada perangkat ini.",
      showCancelButton: true,
      confirmButtonText: "Keluar",
      cancelButtonText: "Batal",
      confirmButtonColor: "#dc2626",
      reverseButtons: true,
    });
    if (!confirmation.isConfirmed) return;

    setLoggingOut(true);
    try {
      const response = await fetch("/api/admin/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sesi tidak berhasil ditutup.");
      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Gagal keluar",
        text: error instanceof Error ? error.message : "Terjadi kesalahan saat keluar.",
      });
    } finally {
      setLoggingOut(false);
    }
  }

  if (isLoginPage) return <>{children}</>;

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-sm text-slate-500">
        Memeriksa sesi admin...
      </main>
    );
  }

  const currentPage =
    navigation.find((item) => isActivePath(pathname, item.href)) ??
    navigation[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen min-w-0">
        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Tutup navigasi"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
          />
        )}
        {/* SIDEBAR DESKTOP */}
        <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(84vw,300px)] shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5 shadow-xl transition-transform duration-200 lg:sticky lg:top-0 lg:z-10 lg:h-screen lg:w-64 lg:translate-x-0 lg:shadow-none ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="mb-2 flex items-center justify-between">
          <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="flex min-w-0 items-center gap-3 rounded-lg px-2 py-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
              <img src="/logo/logoyomart.png" alt="Yomart" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight text-slate-900">
                Documentation
              </p>
              <p className="mt-0.5 text-xs text-slate-500">Admin Console</p>
            </div>
          </Link>
          <button type="button" onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Tutup menu">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
          </div>

          <div className="mt-6 lg:mt-8">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Menu utama
            </p>
            <nav aria-label="Navigasi admin" className="mt-3 space-y-1">
              {navigation.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "border-blue-100 bg-blue-50 font-medium text-blue-700"
                        : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                      <AdminIcon name={item.icon} className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto border-t border-slate-200 px-3 pt-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <p className="text-xs font-medium text-slate-700">Pusat pengelolaan</p>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Kelola data cabang, event, dan rekap dokumentasi dari satu tempat.
            </p>
          </div>
        </aside>

        {/* AREA KONTEN */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 lg:hidden"
                  aria-label="Buka navigasi admin"
                  aria-expanded={mobileMenuOpen}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Documentation System</p>
                  <h1 className="truncate text-base font-semibold sm:text-lg">
                    {currentPage.label}
                  </h1>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 md:flex">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Admin Workspace
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
                  aria-label="Keluar dari admin"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></svg>
                  <span className="hidden sm:inline">{loggingOut ? "Keluar..." : "Keluar"}</span>
                </button>
              </div>
            </div>


          </header>

          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
