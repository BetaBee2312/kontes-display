import type { Pool } from "mysql2/promise";

export function getCabangTableName(
  kodeCabang: string | number
) {
  const kode = String(kodeCabang).trim();

  if (!/^\d+$/.test(kode)) {
    throw new Error(
      "Kode cabang tidak valid."
    );
  }

  return `tb_${kode}`;
}

export async function ensureCabangTable(
  db: Pool,
  kodeCabang: string | number
) {
  const tableName =
    getCabangTableName(kodeCabang);

  await db.query(`
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      id VARCHAR(200) NOT NULL,
      event VARCHAR(100) NOT NULL,
      tanggal DATE NOT NULL,
      foto VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    )
  `);

  return tableName;
}