-- Run once after backing up the database, before deploying this branch.
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

INSERT IGNORE INTO tb_jenis_dokumentasi (kode_kolom, nama_kolom, aktif)
VALUES ('voucher','Voucher',1),('hangmob','Hangmob',1),('display','Display',1),('foto','Foto Dokumentasi',1);

-- Run once for each existing numbered branch table that predates this feature:
-- ALTER TABLE tb_23212 ADD COLUMN kode_kolom VARCHAR(50) NOT NULL DEFAULT 'foto';
-- The ensureCabangTable helper adds the column lazily for a branch on its next upload.
