import db from "@/lib/db";

type TableRow = { TABLE_NAME: string };
type ColumnRow = { TABLE_NAME: string; COLUMN_NAME: string };
type CountRow = { total: number | string };
type OverviewDocsRow = {
  total_dokumentasi: number | string;
  cabang_mengirim: number | string;
};
type DailyRow = {
  tanggal: string;
  total_dokumentasi: number | string;
  jumlah_cabang: number | string;
  jumlah_event: number | string;
};
type MonthlyRow = {
  bulan: string;
  total_dokumentasi: number | string;
  jumlah_cabang: number | string;
  jumlah_event: number | string;
};
type YearlyRow = {
  tahun: string | number;
  total_dokumentasi: number | string;
  jumlah_cabang: number | string;
  jumlah_event: number | string;
};
type EventSummaryRow = {
  nama_event: string;
  total_dokumentasi: number | string;
  jumlah_cabang: number | string;
};
type LatestRow = {
  id: string | number;
  kode_cabang: string;
  nama_cabang: string;
  nama_event: string | null;
  tanggal: string | null;
  foto: string | null;
};
type CoverageRow = {
  kode_cabang: string | number;
  nama_cabang: string;
  cluster: string | null;
  total_bulan_ini: number | string;
};

export type DashboardDateRange = {
  year: number;
  from: string;
  to: string;
  monthFrom: string;
  monthTo: string;
};

const numberValue = (value: unknown) => Number(value ?? 0) || 0;

/**
 * Dokumentasi tersimpan di tabel per cabang, misalnya tb_2312.
 * Hanya nama tabel numerik dan tabel yang memiliki kolom yang dibutuhkan
 * yang diikutkan agar identifier SQL berasal dari metadata database, bukan input.
 */
async function getDocumentationUnionSql(): Promise<string | null> {
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
  for (const row of columnRows) {
    const cols = columnsByTable.get(row.TABLE_NAME) || new Set<string>();
    cols.add(String(row.COLUMN_NAME).toLowerCase());
    columnsByTable.set(row.TABLE_NAME, cols);
  }

  const validTables = tableRows
    .map((row) => String(row.TABLE_NAME))
    .filter((name) => {
      const cols = columnsByTable.get(name);
      return /^tb_\d+$/.test(name) && !!cols &&
        ["id", "event", "tanggal", "foto"].every((col) => cols.has(col));
    });

  if (!validTables.length) return null;

  return validTables.map((tableName) => {
    const kodeCabang = tableName.slice(3);
    return `SELECT '${kodeCabang}' AS kode_cabang,
      CAST(id AS CHAR) AS id,
      CAST(event AS CHAR) AS nama_event,
      DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal,
      CAST(foto AS CHAR) AS foto
      FROM \`${tableName}\``;
  }).join(" UNION ALL ");
}

function validateRange(range: DashboardDateRange): DashboardDateRange {
  const isDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
  const year = Number(range.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Parameter tahun tidak valid.");
  }
  if (![range.from, range.to, range.monthFrom, range.monthTo].every(isDate)) {
    throw new Error("Rentang tanggal dashboard tidak valid.");
  }
  if (range.from > range.to || range.monthFrom > range.monthTo) {
    throw new Error("Rentang tanggal dashboard terbalik.");
  }
  return { ...range, year };
}

export async function getAdminDashboardData(input: DashboardDateRange) {
  const range = validateRange(input);
  const unionSql = await getDocumentationUnionSql();

  const [branchCountRows] = await db.query("SELECT COUNT(*) AS total FROM tb_cabang");
  const [eventCountRows] = await db.query("SELECT COUNT(*) AS total FROM tb_event");
  const totalCabang = numberValue((branchCountRows as CountRow[])[0]?.total);
  const totalEvent = numberValue((eventCountRows as CountRow[])[0]?.total);

  if (!unionSql) {
    const [coverageRows] = await db.query(`
      SELECT kode_cabang, nama_cabang, cluster, 0 AS total_bulan_ini
      FROM tb_cabang
      ORDER BY nama_cabang ASC
      LIMIT 10
    `);
    return {
      overview: {
        totalCabang,
        totalEvent,
        totalDokumentasi: 0,
        cabangMengirim: 0,
        cabangMengirimBulanIni: 0,
      },
      period: range,
      daily: [],
      monthly: [],
      yearly: [],
      events: [],
      latest: [],
      coverage: (coverageRows as CoverageRow[]).map((row) => ({
        kode_cabang: String(row.kode_cabang),
        nama_cabang: String(row.nama_cabang || row.kode_cabang),
        cluster: row.cluster ? String(row.cluster) : "",
        total_bulan_ini: 0,
      })),
    };
  }

  const [overviewRows, dailyRows, monthlyRows, yearlyRows, eventRows, latestRows, coverageRows] =
    await Promise.all([
      db.query(`
        SELECT COUNT(*) AS total_dokumentasi,
          COUNT(DISTINCT kode_cabang) AS cabang_mengirim
        FROM (${unionSql}) d
      `).then(([rows]) => rows as OverviewDocsRow[]),
      db.query(`
        SELECT d.tanggal,
          COUNT(*) AS total_dokumentasi,
          COUNT(DISTINCT d.kode_cabang) AS jumlah_cabang,
          COUNT(DISTINCT d.nama_event) AS jumlah_event
        FROM (${unionSql}) d
        WHERE d.tanggal BETWEEN ? AND ?
        GROUP BY d.tanggal
        ORDER BY d.tanggal ASC
      `, [range.from, range.to]).then(([rows]) => rows as DailyRow[]),
      db.query(`
        SELECT SUBSTRING(d.tanggal, 1, 7) AS bulan,
          COUNT(*) AS total_dokumentasi,
          COUNT(DISTINCT d.kode_cabang) AS jumlah_cabang,
          COUNT(DISTINCT d.nama_event) AS jumlah_event
        FROM (${unionSql}) d
        WHERE YEAR(d.tanggal) = ?
        GROUP BY SUBSTRING(d.tanggal, 1, 7)
        ORDER BY bulan ASC
      `, [range.year]).then(([rows]) => rows as MonthlyRow[]),
      db.query(`
        SELECT YEAR(d.tanggal) AS tahun,
          COUNT(*) AS total_dokumentasi,
          COUNT(DISTINCT d.kode_cabang) AS jumlah_cabang,
          COUNT(DISTINCT d.nama_event) AS jumlah_event
        FROM (${unionSql}) d
        WHERE d.tanggal IS NOT NULL
        GROUP BY YEAR(d.tanggal)
        ORDER BY tahun ASC
      `).then(([rows]) => rows as YearlyRow[]),
      db.query(`
        SELECT COALESCE(NULLIF(TRIM(d.nama_event), ''), '(Tanpa nama event)') AS nama_event,
          COUNT(*) AS total_dokumentasi,
          COUNT(DISTINCT d.kode_cabang) AS jumlah_cabang
        FROM (${unionSql}) d
        GROUP BY COALESCE(NULLIF(TRIM(d.nama_event), ''), '(Tanpa nama event)')
        ORDER BY total_dokumentasi DESC, nama_event ASC
        LIMIT 8
      `).then(([rows]) => rows as EventSummaryRow[]),
      db.query(`
        SELECT d.id, d.kode_cabang,
          COALESCE(c.nama_cabang, d.kode_cabang) AS nama_cabang,
          NULLIF(TRIM(d.nama_event), '') AS nama_event,
          d.tanggal, d.foto
        FROM (${unionSql}) d
        LEFT JOIN tb_cabang c ON CAST(c.kode_cabang AS CHAR) = d.kode_cabang
        ORDER BY d.tanggal DESC, d.id DESC
        LIMIT 10
      `).then(([rows]) => rows as LatestRow[]),
      db.query(`
        SELECT c.kode_cabang, c.nama_cabang, c.cluster,
          COALESCE(x.total_bulan_ini, 0) AS total_bulan_ini
        FROM tb_cabang c
        LEFT JOIN (
          SELECT d.kode_cabang, COUNT(*) AS total_bulan_ini
          FROM (${unionSql}) d
          WHERE d.tanggal BETWEEN ? AND ?
          GROUP BY d.kode_cabang
        ) x ON CAST(c.kode_cabang AS CHAR) = x.kode_cabang
        ORDER BY COALESCE(x.total_bulan_ini, 0) ASC, c.nama_cabang ASC
        LIMIT 10
      `, [range.monthFrom, range.monthTo]).then(([rows]) => rows as CoverageRow[]),
    ]);

  const overview = overviewRows[0] || { total_dokumentasi: 0, cabang_mengirim: 0 };
  const [monthBranchRows] = await db.query(`
    SELECT COUNT(DISTINCT d.kode_cabang) AS total
    FROM (${unionSql}) d
    WHERE d.tanggal BETWEEN ? AND ?
  `, [range.monthFrom, range.monthTo]);

  return {
    overview: {
      totalCabang,
      totalEvent,
      totalDokumentasi: numberValue(overview.total_dokumentasi),
      cabangMengirim: numberValue(overview.cabang_mengirim),
      cabangMengirimBulanIni: numberValue((monthBranchRows as CountRow[])[0]?.total),
    },
    period: range,
    daily: dailyRows.map((row) => ({
      tanggal: String(row.tanggal).slice(0, 10),
      total_dokumentasi: numberValue(row.total_dokumentasi),
      jumlah_cabang: numberValue(row.jumlah_cabang),
      jumlah_event: numberValue(row.jumlah_event),
    })),
    monthly: monthlyRows.map((row) => ({
      bulan: String(row.bulan).slice(0, 7),
      total_dokumentasi: numberValue(row.total_dokumentasi),
      jumlah_cabang: numberValue(row.jumlah_cabang),
      jumlah_event: numberValue(row.jumlah_event),
    })),
    yearly: yearlyRows.map((row) => ({
      tahun: String(row.tahun),
      total_dokumentasi: numberValue(row.total_dokumentasi),
      jumlah_cabang: numberValue(row.jumlah_cabang),
      jumlah_event: numberValue(row.jumlah_event),
    })),
    events: eventRows.map((row) => ({
      nama_event: String(row.nama_event || "(Tanpa nama event)"),
      total_dokumentasi: numberValue(row.total_dokumentasi),
      jumlah_cabang: numberValue(row.jumlah_cabang),
    })),
    latest: latestRows.map((row) => ({
      id: String(row.id ?? "-"),
      kode_cabang: String(row.kode_cabang ?? ""),
      nama_cabang: String(row.nama_cabang || row.kode_cabang || "-"),
      nama_event: String(row.nama_event || "(Tanpa nama event)"),
      tanggal: row.tanggal ? String(row.tanggal).slice(0, 10) : "",
      foto: row.foto ? String(row.foto) : null,
    })),
    coverage: coverageRows.map((row) => ({
      kode_cabang: String(row.kode_cabang),
      nama_cabang: String(row.nama_cabang || row.kode_cabang),
      cluster: row.cluster ? String(row.cluster) : "",
      total_bulan_ini: numberValue(row.total_bulan_ini),
    })),
  };
}
