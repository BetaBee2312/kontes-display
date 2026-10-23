import type { RowDataPacket } from "mysql2";
import type { Pool } from "mysql2/promise";

interface DocumentIdRow extends RowDataPacket { id: string }

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function generateDocumentId(
  db: Pool,
  tableName: string,
  kodeCabang: string,
  tanggal: string,
  kodeEvent: string,
  kodeKolom = "",
) {
  const date = tanggal.replaceAll("-", "");
  // Include the field code in the namespace so several photos in the same event
  // and branch get unique primary keys while remaining recognizable in legacy reports.
  const baseId = [kodeCabang, date, kodeEvent, kodeKolom].filter(Boolean).join("_");
  const [rows] = await db.query<DocumentIdRow[]>(
    `SELECT id FROM \`${tableName}\` WHERE id = ? OR id LIKE ?`,
    [baseId, `${baseId}_%`],
  );
  if (rows.length === 0) return baseId;
  const regex = new RegExp(`^${escapeRegExp(baseId)}_(\\d+)$`);
  let maxSequence = 0;
  for (const row of rows) {
    const match = row.id.match(regex);
    if (!match) continue;
    const sequence = Number(match[1]);
    if (sequence > maxSequence) maxSequence = sequence;
  }
  return `${baseId}_${String(maxSequence + 1).padStart(3, "0")}`;
}
