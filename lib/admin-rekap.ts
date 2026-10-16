import db from "@/lib/db";

type TableRow = { TABLE_NAME: string };
type ColumnRow = { TABLE_NAME: string; COLUMN_NAME: string };

type BranchRow = {
  kode_cabang: string | number;
  nama_cabang: string;
  singkatan?: string | null;
  cluster?: string | null;
};

type EventRow = { nama_event: string };

export type ReportMode = "month" | "day" | "event" | "branch" | "branch_event";

export type ReportFilters = {
  mode: ReportMode;
  year: string;
  dateFrom: string;
  dateTo: string;
  kodeCabang: string;
  event: string;
};

export type DocumentationRow = {
  kode_cabang: string;
  nama_cabang: string;
  singkatan: string | null;
  id: string;
  nama_event: string;
  tanggal: string;
  foto: string | null;
};

export const REPORT_MODES: ReportMode[] = [
  "month",
  "day",
  "event",
  "branch",
  "branch_event",
];

export function parseReportFilters(params: URLSearchParams): ReportFilters {
  const requestedMode = params.get("mode") || "month";
  const mode = REPORT_MODES.includes(requestedMode as ReportMode)
    ? (requestedMode as ReportMode)
    : "month";

  const yearInput = (params.get("year") || "").trim();
  const year = /^20\d{2}$/.test(yearInput) ? yearInput : "";
  const dateFromInput = (params.get("from") || "").trim();
  const dateToInput = (params.get("to") || "").trim();

  return {
    mode,
    year,
    dateFrom: /^\d{4}-\d{2}-\d{2}$/.test(dateFromInput) ? dateFromInput : "",
    dateTo: /^\d{4}-\d{2}-\d{2}$/.test(dateToInput) ? dateToInput : "",
    kodeCabang: /^\d+$/.test((params.get("kode_cabang") || "").trim())
      ? (params.get("kode_cabang") || "").trim()
      : "",
    event: (params.get("event") || "").trim().slice(0, 150),
  };
}

/**
 * Documentation is stored in one table per branch: tb_{kode_cabang}.
 * Only tables with the expected documentation columns are included.
 */
export async function getDocumentationUnionSql(): Promise<string | null> {
  const [tableResult] = await db.execute(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME REGEXP '^tb_[0-9]+$'
  `);
  const tableRows = tableResult as TableRow[];
  if (tableRows.length === 0) return null;

  const [columnResult] = await db.execute(`
    SELECT TABLE_NAME, COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME REGEXP '^tb_[0-9]+$'
  `);
  const columnRows = columnResult as ColumnRow[];
  const columnsByTable = new Map<string, Set<string>>();

  for (const item of columnRows) {
    const current = columnsByTable.get(item.TABLE_NAME) || new Set<string>();
    current.add(item.COLUMN_NAME.toLowerCase());
    columnsByTable.set(item.TABLE_NAME, current);
  }

  const tableNames = tableRows
    .map((row) => row.TABLE_NAME)
    .filter((tableName) => {
      const cols = columnsByTable.get(tableName);
      return /^tb_\d+$/.test(tableName) &&
        !!cols && ["id", "event", "tanggal", "foto"].every((name) => cols.has(name));
    });

  if (tableNames.length === 0) return null;

  return tableNames.map((tableName) => {
    const kode = tableName.slice(3);
    // Standardize every text column to the same charset and collation before UNION.
    // Cabang tables may have been created at different times with different collations.
    // Both the identifier and table name were validated from INFORMATION_SCHEMA.
    return `SELECT
      CAST('${kode}' AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS kode_cabang,
      CAST(id AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS id,
      CAST(event AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS nama_event,
      CAST(DATE_FORMAT(tanggal, '%Y-%m-%d') AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS tanggal,
      CAST(foto AS CHAR CHARACTER SET utf8mb4) COLLATE utf8mb4_unicode_ci AS foto
      FROM \`${tableName}\``;
  }).join(" UNION ALL ");
}

export async function getCabangOptions() {
  const [rows] = await db.query(`
    SELECT kode_cabang, nama_cabang, singkatan, cluster
    FROM tb_cabang
    ORDER BY nama_cabang ASC
  `);
  return rows as BranchRow[];
}

export async function getEventOptions(unionSql: string | null): Promise<string[]> {
  const names = new Set<string>();

  try {
    const [masterRows] = await db.query(`
      SELECT nama_event
      FROM tb_event
      WHERE aktif = 1
      ORDER BY nama_event ASC
    `);
    for (const row of masterRows as EventRow[]) {
      const name = String(row.nama_event || "").trim();
      if (name) names.add(name);
    }
  } catch (error) {
    // The docs table may still be useful if the event master hasn't been migrated.
    console.warn("Gagal membaca tb_event untuk opsi rekap:", error);
  }

  if (unionSql) {
    const [docEvents] = await db.query(`
      SELECT DISTINCT nama_event
      FROM (${unionSql}) docs
      WHERE TRIM(COALESCE(nama_event, '')) <> ''
      ORDER BY nama_event ASC
    `);
    for (const row of docEvents as EventRow[]) {
      const name = String(row.nama_event || "").trim();
      if (name) names.add(name);
    }
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b, "id"));
}

function buildWhere(filters: ReportFilters) {
  const conditions: string[] = [];
  const values: Array<string | number> = [];

  if (filters.year) {
    conditions.push("YEAR(d.tanggal) = ?");
    values.push(Number(filters.year));
  }
  if (filters.dateFrom) {
    conditions.push("DATE(d.tanggal) >= ?");
    values.push(filters.dateFrom);
  }
  if (filters.dateTo) {
    conditions.push("DATE(d.tanggal) <= ?");
    values.push(filters.dateTo);
  }
  if (filters.kodeCabang) {
    conditions.push("d.kode_cabang = ?");
    values.push(filters.kodeCabang);
  }
  if (filters.event) {
    conditions.push("LOWER(d.nama_event) = LOWER(?)");
    values.push(filters.event);
  }

  return {
    sql: conditions.length ? `WHERE ${conditions.join(" AND ")}` : "",
    values,
  };
}

export async function getReportAggregateRows(
  filters: ReportFilters,
  unionSql: string | null
): Promise<ReportAggregate[]> {
  if (!unionSql) return [];
  const { sql: whereSql, values } = buildWhere(filters);
  let query = "";

  if (filters.mode === "month") {
    query = `
      SELECT SUBSTRING(d.tanggal, 1, 7) AS bulan,
        COUNT(*) AS total_dokumentasi,
        COUNT(DISTINCT d.kode_cabang) AS jumlah_cabang,
        COUNT(DISTINCT d.nama_event) AS jumlah_event
      FROM (${unionSql}) d ${whereSql}
      GROUP BY SUBSTRING(d.tanggal, 1, 7)
      ORDER BY bulan ASC
    `;
  } else if (filters.mode === "day") {
    query = `
      SELECT d.tanggal AS tanggal,
        COUNT(*) AS total_dokumentasi,
        COUNT(DISTINCT d.kode_cabang) AS jumlah_cabang,
        COUNT(DISTINCT d.nama_event) AS jumlah_event
      FROM (${unionSql}) d ${whereSql}
      GROUP BY d.tanggal
      ORDER BY d.tanggal ASC
    `;
  } else if (filters.mode === "event") {
    query = `
      SELECT d.nama_event AS nama_event,
        COUNT(*) AS total_dokumentasi,
        COUNT(DISTINCT d.kode_cabang) AS jumlah_cabang,
        COUNT(DISTINCT d.tanggal) AS jumlah_hari
      FROM (${unionSql}) d ${whereSql}
      GROUP BY d.nama_event
      ORDER BY total_dokumentasi DESC, nama_event ASC
    `;
  } else if (filters.mode === "branch") {
    query = `
      SELECT d.kode_cabang AS kode_cabang,
        COALESCE(c.nama_cabang, d.kode_cabang) AS nama_cabang,
        COUNT(*) AS total_dokumentasi,
        COUNT(DISTINCT d.nama_event) AS jumlah_event,
        COUNT(DISTINCT d.tanggal) AS jumlah_hari
      FROM (${unionSql}) d
      LEFT JOIN tb_cabang c ON CAST(c.kode_cabang AS CHAR) = d.kode_cabang
      ${whereSql}
      GROUP BY d.kode_cabang, c.nama_cabang
      ORDER BY nama_cabang ASC
    `;
  } else {
    query = `
      SELECT d.kode_cabang AS kode_cabang,
        COALESCE(c.nama_cabang, d.kode_cabang) AS nama_cabang,
        d.nama_event AS nama_event,
        COUNT(*) AS total_dokumentasi,
        COUNT(DISTINCT d.tanggal) AS jumlah_hari
      FROM (${unionSql}) d
      LEFT JOIN tb_cabang c ON CAST(c.kode_cabang AS CHAR) = d.kode_cabang
      ${whereSql}
      GROUP BY d.kode_cabang, c.nama_cabang, d.nama_event
      ORDER BY nama_cabang ASC, nama_event ASC
    `;
  }

  const [rows] = await db.query(query, values);
  return rows as ReportAggregate[];
}

export async function getReportStats(
  filters: ReportFilters,
  unionSql: string | null
) {
  if (!unionSql) {
    return { total_dokumentasi: 0, cabang_aktif: 0, event_aktif: 0, tanggal_aktif: 0 };
  }
  const { sql: whereSql, values } = buildWhere(filters);
  const [rows] = await db.query(`
    SELECT
      COUNT(*) AS total_dokumentasi,
      COUNT(DISTINCT d.kode_cabang) AS cabang_aktif,
      COUNT(DISTINCT d.nama_event) AS event_aktif,
      COUNT(DISTINCT d.tanggal) AS tanggal_aktif
    FROM (${unionSql}) d
    ${whereSql}
  `, values);
  const row = (rows as Array<Record<string, number | string>>)[0] || {};
  return {
    total_dokumentasi: Number(row.total_dokumentasi || 0),
    cabang_aktif: Number(row.cabang_aktif || 0),
    event_aktif: Number(row.event_aktif || 0),
    tanggal_aktif: Number(row.tanggal_aktif || 0),
  };
}

export async function getDocumentationRows(
  filters: ReportFilters,
  unionSql: string | null
): Promise<DocumentationRow[]> {
  if (!unionSql) return [];

  const { sql: whereSql, values } = buildWhere(filters);
  const [rows] = await db.query(`
    SELECT
      d.kode_cabang,
      COALESCE(c.nama_cabang, d.kode_cabang) AS nama_cabang,
      c.singkatan,
      d.id,
      d.nama_event,
      d.tanggal,
      d.foto
    FROM (${unionSql}) d
    LEFT JOIN tb_cabang c
      ON CAST(c.kode_cabang AS CHAR) = d.kode_cabang
    ${whereSql}
    ORDER BY d.tanggal DESC, d.kode_cabang ASC, d.id DESC
  `, values);

  return (rows as DocumentationRow[]).map((row) => ({
    ...row,
    kode_cabang: String(row.kode_cabang),
    nama_cabang: String(row.nama_cabang || row.kode_cabang),
    singkatan: row.singkatan ? String(row.singkatan) : null,
    id: String(row.id),
    nama_event: String(row.nama_event || "(Tanpa nama event)"),
    tanggal: String(row.tanggal).slice(0, 10),
    foto: row.foto ? String(row.foto) : null,
  }));
}

export type ReportAggregate = Record<string, string | number>;

export function buildReportRows(
  docs: DocumentationRow[],
  mode: ReportMode
): ReportAggregate[] {
  const groups = new Map<string, DocumentationRow[]>();

  for (const doc of docs) {
    let key = "";
    if (mode === "month") key = doc.tanggal.slice(0, 7);
    else if (mode === "day") key = doc.tanggal;
    else if (mode === "event") key = doc.nama_event;
    else if (mode === "branch") key = doc.kode_cabang;
    else key = `${doc.kode_cabang}|||${doc.nama_event}`;

    const group = groups.get(key) || [];
    group.push(doc);
    groups.set(key, group);
  }

  const result: ReportAggregate[] = [];
  for (const [key, rows] of groups) {
    const distinctBranches = new Set(rows.map((row) => row.kode_cabang));
    const distinctEvents = new Set(rows.map((row) => row.nama_event));
    const distinctDays = new Set(rows.map((row) => row.tanggal));

    if (mode === "month") {
      result.push({
        bulan: key,
        total_dokumentasi: rows.length,
        jumlah_cabang: distinctBranches.size,
        jumlah_event: distinctEvents.size,
      });
    } else if (mode === "day") {
      result.push({
        tanggal: key,
        total_dokumentasi: rows.length,
        jumlah_cabang: distinctBranches.size,
        jumlah_event: distinctEvents.size,
      });
    } else if (mode === "event") {
      result.push({
        nama_event: key,
        total_dokumentasi: rows.length,
        jumlah_cabang: distinctBranches.size,
        jumlah_hari: distinctDays.size,
      });
    } else if (mode === "branch") {
      result.push({
        kode_cabang: rows[0].kode_cabang,
        nama_cabang: rows[0].nama_cabang,
        total_dokumentasi: rows.length,
        jumlah_event: distinctEvents.size,
        jumlah_hari: distinctDays.size,
      });
    } else {
      result.push({
        kode_cabang: rows[0].kode_cabang,
        nama_cabang: rows[0].nama_cabang,
        nama_event: rows[0].nama_event,
        total_dokumentasi: rows.length,
        jumlah_hari: distinctDays.size,
      });
    }
  }

  if (mode === "month") return result.sort((a, b) => String(a.bulan).localeCompare(String(b.bulan)));
  if (mode === "day") return result.sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));
  if (mode === "event") return result.sort((a, b) => String(a.nama_event).localeCompare(String(b.nama_event), "id"));
  if (mode === "branch") return result.sort((a, b) => String(a.nama_cabang).localeCompare(String(b.nama_cabang), "id"));
  return result.sort((a, b) => {
    const branchCompare = String(a.nama_cabang).localeCompare(String(b.nama_cabang), "id");
    return branchCompare || String(a.nama_event).localeCompare(String(b.nama_event), "id");
  });
}

export function buildReportStats(docs: DocumentationRow[]) {
  return {
    total_dokumentasi: docs.length,
    cabang_aktif: new Set(docs.map((doc) => doc.kode_cabang)).size,
    event_aktif: new Set(docs.map((doc) => doc.nama_event)).size,
    tanggal_aktif: new Set(docs.map((doc) => doc.tanggal)).size,
  };
}
