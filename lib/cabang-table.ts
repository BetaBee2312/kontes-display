import type { Pool } from "mysql2/promise";

export function getCabangTableName(kodeCabang: string | number) {
  const kode = String(kodeCabang).trim();
  if (!/^\d+$/.test(kode)) throw new Error("Kode cabang tidak valid.");
  return `tb_${kode}`;
}

export async function ensureCabangTable(db: Pool, kodeCabang: string | number) {
  const tableName = getCabangTableName(kodeCabang);
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      id VARCHAR(200) NOT NULL,
      event VARCHAR(100) NOT NULL,
      tanggal DATE NOT NULL,
      foto VARCHAR(255) NOT NULL,
      kode_kolom VARCHAR(50) NOT NULL DEFAULT 'foto',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);

  // CREATE TABLE does not add new columns to existing branch tables.
  // Upgrade only the known, application-owned table name, once per request until migrated.
  const [columnRows] = await db.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = 'kode_kolom'
     LIMIT 1`,
    [tableName],
  );
  if (!Array.isArray(columnRows) || columnRows.length === 0) {
    await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN kode_kolom VARCHAR(50) NOT NULL DEFAULT 'foto'`);
  }

  return tableName;
}
