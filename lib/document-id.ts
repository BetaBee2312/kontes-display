import type { Pool } from "mysql2/promise";

function escapeRegExp(value: string) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
}

export async function generateDocumentId(
  db: Pool,
  tableName: string,
  kodeCabang: string,
  tanggal: string,
  kodeEvent: string
) {
  const date = tanggal.replaceAll("-", "");

  const baseId =
    `${kodeCabang}_${date}_${kodeEvent}`;

  const [rows] = await db.query<
    { id: string }[]
  >(
    `
      SELECT id
      FROM \`${tableName}\`
      WHERE id = ?
         OR id LIKE ?
    `,
    [
      baseId,
      `${baseId}_%`,
    ]
  );

  if (rows.length === 0) {
    return baseId;
  }

  const regex = new RegExp(
    `^${escapeRegExp(baseId)}_(\\d+)$`
  );

  let maxSequence = 0;

  for (const row of rows) {
    const match = row.id.match(regex);

    if (!match) {
      continue;
    }

    const sequence =
      Number(match[1]);

    if (sequence > maxSequence) {
      maxSequence = sequence;
    }
  }

  return `${baseId}_${String(
    maxSequence + 1
  ).padStart(3, "0")}`;
}