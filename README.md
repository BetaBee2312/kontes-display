# Kontes Display

Sistem dokumentasi cabang untuk mengumpulkan foto aktivitas/event, mengelola data cabang dan event, serta melihat rekap dokumentasi melalui panel admin. Dibangun menggunakan Next.js App Router dan menyimpan metadata dokumentasi di MySQL.

## Fitur utama

### Form dokumentasi
- Memvalidasi kode cabang terhadap data cabang di database.
- Memuat daftar event aktif setelah cabang ditemukan.
- Mendukung event terdaftar dan event khusus yang dipakai untuk pengiriman dokumentasi.
- Memilih beberapa foto sekaligus, menampilkan preview, menghapus foto dari daftar, dan mengompres foto di browser.
- Mengirim setiap foto melalui endpoint dokumentasi dengan batas ukuran 2 MB per file.

### Panel admin
- Autentikasi sesi admin.
- Manajemen data cabang dan event.
- Dashboard ringkasan operasional.
- Rekap dokumentasi dengan filter tanggal/periode, cabang, dan event.
- Ekspor laporan Excel dan peninjauan foto/dokumen yang cocok dengan filter.

### Penyimpanan
- Metadata disimpan ke MySQL.
- Foto disimpan pada `public/uploads/dokumentasi/<kode-cabang>/`.
- Helper membentuk nama tabel cabang dan ID dokumentasi berdasarkan cabang, tanggal, dan kode event.

## Teknologi

- Next.js App Router 16
- React 19 dan TypeScript
- Tailwind CSS v4
- MySQL melalui `mysql2/promise`
- ExcelJS untuk ekspor laporan
- `browser-image-compression` untuk kompresi gambar di browser
- `sharp` untuk kebutuhan pemrosesan gambar
- `bcryptjs` untuk verifikasi hash password admin

## Struktur proyek

```text
app/
  page.tsx                       # Halaman utama
  form/page.tsx                  # Form upload dokumentasi
  [kode]/riwayat/                # Riwayat dokumentasi berdasarkan kode
  admin/                         # Dashboard dan halaman admin
    cabang/                      # Manajemen cabang
    event/                       # Manajemen event
    rekap/                       # Rekap dan ekspor dokumentasi
    login/                       # Login admin
  api/
    cabang/                      # Lookup cabang
    event/                       # Daftar/manajemen event
    dokumentasi/                 # Simpan dan hapus dokumentasi
    admin/                       # API admin, dashboard, rekap, dan ekspor
lib/
  db.ts                          # Pool MySQL
  admin-auth.ts                  # Autentikasi admin
  admin-dashboard.ts             # Query dashboard
  admin-rekap.ts                 # Query/filter rekap
  cabang-table.ts                # Helper tabel per cabang
  document-id.ts                 # Generator ID dokumentasi
public/uploads/dokumentasi/       # Unggahan foto
```

## Persyaratan

- Node.js yang kompatibel dengan versi Next.js di `package.json` (gunakan Node.js 20.9+).
- npm.
- MySQL/MariaDB yang dapat diakses dari server aplikasi.
- Database dengan tabel master `tb_cabang` dan `tb_event`, plus tabel dokumentasi per cabang sesuai helper proyek.

## Menjalankan secara lokal

1. Clone repositori dan pasang dependensi:

   ```bash
   git clone https://github.com/BetaBee2312/kontes-display.git
   cd kontes-display
   npm install
   ```

2. Buat file `.env.local` di root proyek:

   ```dotenv
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=nama_database
   ```

   Sesuaikan semua nilai dengan MySQL lokal. `DB_NAME` wajib diisi karena pool koneksi membacanya dari environment.

3. Pastikan schema/tabel yang dibutuhkan telah tersedia. Repo tidak menyertakan dump database lengkap untuk seluruh data cabang dan event; jangan mengasumsikan database produksi dapat dibuat hanya dari `npm install`.

4. Jalankan aplikasi:

   ```bash
   npm run dev
   ```

5. Buka [http://localhost:3000](http://localhost:3000).

## Perintah npm

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan server pengembangan |
| `npm run build` | Membuat build produksi dengan Webpack |
| `npm run start` | Menjalankan build produksi |

Build produksi dibuat dengan `npm run build`, lalu dijalankan menggunakan `npm run start`.

## Endpoint penting

| Method | Endpoint | Kegunaan |
| --- | --- | --- |
| GET | `/api/cabang?kode=<kode>` | Memeriksa cabang |
| GET | `/api/event` | Membaca daftar event aktif |
| POST | `/api/event` | Menambahkan event master |
| POST | `/api/dokumentasi` | Mengunggah satu foto dokumentasi |
| DELETE | `/api/dokumentasi` | Menghapus dokumentasi terpilih |
| GET | `/api/admin/rekap` | Membaca data rekap (memerlukan sesi admin) |
| GET | `/api/admin/rekap/export` | Mengekspor laporan rekap (memerlukan sesi admin) |

Lihat implementasi masing-masing Route Handler untuk parameter, bentuk payload, dan validasi terkini.

## Database dan file upload

Kode membentuk atau mengambil tabel dokumentasi per cabang melalui helper di `lib/cabang-table.ts`. Karena nama/skema tabel bersifat dinamis, pastikan backup dan hak akses database sudah benar sebelum mencoba fitur tulis/hapus.

Gambar yang diunggah disimpan di filesystem aplikasi di bawah `public/uploads/dokumentasi/`. Folder tersebut harus dapat ditulis oleh proses Node.js dan disertakan dalam backup. Untuk deployment dengan filesystem ephemeral atau beberapa instance, gunakan storage persisten yang sesuai dan sesuaikan implementasi URL/file.

## Keamanan sebelum deployment

- Lindungi kredensial MySQL melalui environment variables; jangan commit `.env.local`.
- Gunakan akun database dengan hak minimum yang dibutuhkan, bukan akun root, untuk deployment.
- Pastikan panel admin dan endpoint ekspor hanya tersedia untuk sesi admin yang valid.
- Batasi ukuran/format unggahan dan pertimbangkan pemeriksaan konten file, bukan hanya ekstensi/MIME dari browser.
- Konfigurasikan backup rutin untuk database serta foto.
- Gunakan HTTPS bila diakses melalui jaringan publik dan jangan unggah data dokumentasi internal ke repo publik.

## Troubleshooting

**Error koneksi database**
Periksa apakah MySQL aktif dan cocokkan `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, serta `DB_NAME`.

**Cabang tidak ditemukan**
Pastikan kode cabang ada di `tb_cabang` dan format kode sama dengan yang dikirim form.

**Event tidak muncul**
Endpoint daftar event mengambil data aktif dari `tb_event` dengan `aktif = 1`. Periksa data master dan nama kolom.

**Upload gagal**
Pastikan foto valid, ukurannya tidak lebih dari 2 MB setelah kompresi, filesystem dapat ditulis, serta server memiliki izin membuat folder cabang.

**Admin selalu kembali ke login**
Periksa cookie/sesi admin, konfigurasi secret yang digunakan `lib/admin-auth.ts`, dan respons endpoint `/api/admin/auth/me`.

## AI-assisted development

Proyek ini dikembangkan dengan bantuan ChatGPT (OpenAI) untuk peninjauan kode, debugging, implementasi, serta dokumentasi. Commit di Git tetap diatribusikan ke akun yang menerbitkannya.
