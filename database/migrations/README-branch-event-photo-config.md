# Database migration: event per cabang and event-level photo fields

Run `20261023_branch_event_photo_config.sql` once against the same MySQL database used by the app, after making a backup.

## Responsibilities

- `tb_jenis_dokumentasi`: master list of photo/documentation fields such as Hangmob, Voucher, and Floor Display. Create each type once.
- `tb_event_kolom`: event-level field configuration. In **Admin → Data Event**, choose which photo fields each event uses and whether they are required.
- `tb_event_cabang`: access control only. In **Admin → Konfigurasi Event Cabang**, assign events to each branch.
- Existing per-branch tables `tb_<kode_cabang>` remain in place so historical records are not moved.

## Initial setup

1. Back up the database.
2. Run `20261023_branch_event_photo_config.sql`.
3. Deploy this branch.
4. Add any master photo types in **Admin → Konfigurasi Event Cabang**. The master list is shared, and duplicates by code/name are rejected.
5. Open **Admin → Data Event** and set checkboxes for photo fields each event uses.
6. Open **Admin → Konfigurasi Event Cabang** and choose which events each branch can access.
7. Test a branch with one event and another branch with a different event set, then verify upload forms only show the fields configured for the selected event.

The migration creates `tb_event_kolom` and copies the prior field settings by event. A field is enabled for an event if it was active on at least one previous branch, preserving a practical starting point. The old `tb_event_cabang_kolom` table is intentionally retained during this transition; the new application paths read event-level mappings.

## Legacy table column

The `ensureCabangTable` helper adds `kode_kolom` to a branch documentation table at its first upload after deployment. To migrate an existing table manually, use the matching numeric table name, for example:

```sql
ALTER TABLE tb_23212
  ADD COLUMN kode_kolom VARCHAR(50) NOT NULL DEFAULT 'foto';
```

Repeat for other existing numbered branch tables only if you want to pre-migrate them. Do not run that ALTER twice on the same table.
