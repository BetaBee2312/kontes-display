# Database migration: event per cabang and dynamic photo fields

Run `20261023_branch_event_photo_config.sql` once against the same MySQL database used by the app, after making a backup.

## How the relationships work

- `tb_event` remains the master event table.
- `tb_event_cabang` grants an event to a branch (one row per branch/event).
- `tb_jenis_dokumentasi` is the master list of photo fields.
- `tb_event_cabang_kolom` enables/disables a field for a specific branch and event. It controls ordering and whether at least one photo is required for that field.
- Existing per-branch tables `tb_<kode_cabang>` remain in place so historical records are not moved.

## Initial setup

1. Back up the database.
2. Run `20261023_branch_event_photo_config.sql`.
3. Deploy this branch.
4. Open **Admin → Konfigurasi Event Cabang**.
5. Select each branch, enable only its assigned events, then select the photo fields for those events and save.
6. Test an unassigned branch (SweetAlert expected), an assigned branch with different fields, and a direct API request for an unassigned field (HTTP 403 expected).

Existing branches/events are **not automatically assigned**. Each branch must be granted access explicitly.

## Legacy table column

The `ensureCabangTable` helper adds `kode_kolom` to a branch documentation table at its first upload after deployment. To migrate an existing table manually, use the matching numeric table name, for example:

```sql
ALTER TABLE tb_23212
  ADD COLUMN kode_kolom VARCHAR(50) NOT NULL DEFAULT 'foto';
```

Repeat for other existing numbered branch tables only if you want to pre-migrate them. Do not run that ALTER twice on the same table.
