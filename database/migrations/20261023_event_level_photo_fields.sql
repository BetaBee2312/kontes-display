-- Run after 20261023_branch_event_photo_config.sql.
-- Creates a single event-level mapping for documentation fields.
CREATE TABLE IF NOT EXISTS tb_event_kolom (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  id_event BIGINT UNSIGNED NOT NULL,
  id_jenis_dokumentasi BIGINT UNSIGNED NOT NULL,
  urutan INT NOT NULL DEFAULT 0,
  wajib TINYINT(1) NOT NULL DEFAULT 1,
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_kolom (id_event, id_jenis_dokumentasi),
  KEY idx_event_kolom_event_aktif (id_event, aktif),
  KEY idx_event_kolom_jenis (id_jenis_dokumentasi)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Preserve the existing behavior by enabling an event/field pair if at least one
-- branch previously had that field enabled. Run safely more than once.
INSERT INTO tb_event_kolom (id_event, id_jenis_dokumentasi, urutan, wajib, aktif)
SELECT old.id_event, old.id_jenis_dokumentasi, MIN(old.urutan), MAX(old.wajib), MAX(old.aktif)
FROM tb_event_cabang_kolom old
GROUP BY old.id_event, old.id_jenis_dokumentasi
HAVING MAX(old.aktif) = 1
ON DUPLICATE KEY UPDATE
  urutan = VALUES(urutan),
  wajib = VALUES(wajib),
  aktif = VALUES(aktif);
