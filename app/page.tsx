import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-6">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center">
        <div className="w-full py-10">

          {/* HEADER */}
          <div className="mb-10 text-center">
            <p className="mb-2 text-sm font-semibold tracking-wide text-blue-600">
              DOCUMENTATION SYSTEM
            </p>

            <h1 className="text-4xl font-bold text-slate-900 md:text-5xl">
              Dokumentasi Cabang
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-slate-500">
              Sistem pengelolaan dokumentasi cabang secara terpusat.
            </p>
          </div>

          {/* MENU */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

            {/* UPLOAD */}
            <Link
              href="/form"
              className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M12 12V3m0 0L8 7m4-4l4 4"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-semibold text-slate-900">
                Upload Dokumentasi
              </h2>

              <p className="mt-3 text-slate-500">
                Masukkan kode site cabang dan upload foto dokumentasi.
              </p>

              <div className="mt-6 font-medium text-blue-600 transition group-hover:translate-x-1">
                Mulai Upload →
              </div>
            </Link>

            {/* MASTER PANEL */}
            <Link
              href="/admin"
              className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-slate-400 hover:shadow-md"
            >
              <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-7 w-7 text-slate-700"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13h2v8H3v-8zm8-10h2v18h-2V3zm8 5h2v13h-2V8z"
                  />
                </svg>
              </div>

              <h2 className="text-2xl font-semibold text-slate-900">
                Master Panel
              </h2>

              <p className="mt-3 text-slate-500">
                Kelola cabang, lihat dokumentasi, dan monitor status upload.
              </p>

              <div className="mt-6 font-medium text-slate-700 transition group-hover:translate-x-1">
                Buka Master Panel →
              </div>
            </Link>
          </div>

          {/* FOOTER */}
          <div className="mt-10 text-center text-sm text-slate-400">
            Documentation System © 2026
          </div>

        </div>
      </div>
    </main>
  );
}