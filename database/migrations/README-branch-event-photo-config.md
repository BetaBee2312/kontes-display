# Database migration: event per cabang and dynamic photo fields

Run this script against the same database used by the application before deploying this feature.

```sql
-- Dynamic branch/event/photo-column configuration for Kontes Display.
-- Run once on the same MySQL database used by the application.
-- Existing per-branch documentation tables are intentionally preserved.

CREATE TABLE IF NOT EXISTS tb_event_cabang (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kode_cabang VARCHAR(30) NOT NULL,
  id_event BIGINT UNSIGNED NOT NULL,
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_cabang (kode_cabang, id_event),
  KEY idx_event_cabang_kode_aktif (kode_cabang, aktif),
  KEY idx_event_cabang_event (id_event)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tb_jenis_dokumentasi (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kode_kolom VARCHAR(50) NOT NULL,
  nama_kolom VARCHAR(100) NOT NULL,
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_jenis_dokumentasi_kode (kode_kolom),
  KEY idx_jenis_dokumentasi_aktif (aktif)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tb_event_cabang_kolom (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  kode_cabang VARCHAR(30) NOT NULL,
  id_event BIGINT UNSIGNED NOT NULL,
  id_jenis_dokumentasi BIGINT UNSIGNED NOT NULL,
  urutan INT NOT NULL DEFAULT 0,
  wajib TINYINT(1) NOT NULL DEFAULT 1,
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_cabang_kolom (kode_cabang, id_event, id_jenis_dokumentasi),
  KEY idx_event_cabang_kolom_lookup (kode_cabang, id_event, aktif),
  KEY idx_event_cabang_kolom_jenis (id_jenis_dokumentasi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed common fields. These are suggestions, not assignments to any branch.
INSERT IGNORE INTO tb_jenis_dokumentasi (kode_kolom, nama_kolom, aktif)
VALUES
  ('voucher', 'Voucher', 1),
  ('hangmob', 'Hangmob', 1),
  ('display', 'Display', 1),
  ('foto', 'Foto Dokumentasi', 1);

```

## How the relationships work

- `tb_event` remains the master event table.
- `tb_event_cabang` grants an event to a branch (one row per branch/event).
- `tb_jenis_dokumentasi` is the master list of configurable photo fields.
- `tb_event_cabang_kolom` enables/disables a photo field for a specific branch and event. It also controls the order and whether at least one photo is required for that field.
- Per-branch legacy tables `tb_<kode_cabang>` are retained to avoid a disruptive migration. Their existing rows remain readable.

## Initial setup

After running the schema, open **Admin → Konfigurasi Event Cabang**. Assign active events to each branch and enable the fields required by that branch/event. Branches without an active assignment cannot upload documentation. Existing branches and events are intentionally **not automatically assigned**: an admin must make the decision explicitly.

## Important

Back up the database first. The script uses `CREATE TABLE IF NOT EXISTS` and `INSERT IGNORE`, and does not delete or rewrite legacy records.
