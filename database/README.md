# MySQL database

`schema.sql` creates the `aarogyamcareai` database and its tables without dropping existing data.

Run from the project root after adding `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` to `.env`:

```powershell
npm.cmd run db:init
```

Or run `schema.sql` in MySQL Workbench using an account allowed to create databases and tables.

The runtime connection pool lives in `database/mysql.ts`. It uses `mysql2/promise`, a bounded pool, and parameterized `execute()` calls for all user-provided values.
