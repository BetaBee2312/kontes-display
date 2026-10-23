import type { RowDataPacket } from "mysql2";
import type { Pool } from "mysql2/promise";

interface DocumentIdRow extends RowDataPacket { id: string }

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeToken(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/**
 * New ID format: <branch>_<YYYYMMDD>_<event>_<photo-field>[_001].
 * Historic IDs are never rewritten. The field code appears exactly once.
 */
export async function generateDocumentId(
  db: Pool,
  tableName: string,
  kodeCabang: string,
  tanggal: string,
  kodeEvent: string,
  kodeKolom = "",
) {
  const date = tanggal.replaceAll("-", "");
  const branch = sanitizeToken(kodeCabang);
  const event = sanitizeToken(kodeEvent);
  const field = sanitizeToken(kodeKolom);
  if (!/^\d{8}$/.test(date) || !branch || !event) throw new Error("Komponen ID dokumentasi tidak valid.");
  const baseId = [branch, date, event, field].filter(Boolean).join("_");
  const [rows] = await db.query<DocumentIdRow[]>(
    `SELECT id FROM \`${tableName}\` WHERE id = ? OR id LIKE ?`,
    [baseId, `${baseId}_%`],
  );
  let maxSequence = 0;
  const exactSequence = new RegExp(`^${escapeRegExp(baseId)}_(\\d+)$`);
  for (const row of rows) {
    const match = row.id.match(exactSequence);
    if (!match) continue;
    const sequence = Number(match[1]);
    if (Number.isSafeInteger(sequence) && sequence > maxSequence) maxSequence = sequence;
  }
  return rows.length === 0 ? baseId : `${baseId}_${String(maxSequence + 1).padStart(3, "0")}`;
}
