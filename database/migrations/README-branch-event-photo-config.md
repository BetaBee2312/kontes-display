# Database migration: event access and event-level photo fields

Back up the active MySQL database before running migrations.

## Responsibilities

- `tb_jenis_dokumentasi`: master list of photo types, such as Hangmob, Voucher, and Floor Display. Each type is created once from **Admin → Data Event**.
- `tb_event_kolom`: maps photo types to events. On **Admin → Data Event**, check the photo fields each event should display and whether they are required.
- `tb_event_cabang`: access control only. On **Admin → Konfigurasi Event Cabang**, choose which events each branch can access.
- Existing per-branch tables `tb_<kode_cabang>` remain in place, so historical records are not moved.

## Installation / upgrade

1. Back up the database.
2. If the original configuration migration has not been run, run `20261023_branch_event_photo_config.sql`.
3. Run `20261023_event_level_photo_fields.sql`. This creates `tb_event_kolom` and copies prior branch/event field settings. A field is enabled for an event if it was active on at least one branch.
4. Deploy the application.
5. In **Admin → Data Event**, create the master photo types and configure the checkboxes for each event.
6. In **Admin → Konfigurasi Event Cabang**, assign events to each branch.
7. Test branches with different event assignments and verify the form only shows fields mapped to the selected event.

The event-level migration is safe to run more than once. The old `tb_event_cabang_kolom` table is retained for transition/history, but current event and upload APIs read `tb_event_kolom`.

## Legacy table column

The `ensureCabangTable` helper adds `kode_kolom` to a branch documentation table at its first upload after deployment. To pre-migrate a numbered branch table, use its matching table name, for example:

```sql
ALTER TABLE tb_23212
  ADD COLUMN kode_kolom VARCHAR(50) NOT NULL DEFAULT 'foto';
```

Repeat only for tables that lack the column. Do not run the same `ALTER TABLE` twice on one table.
