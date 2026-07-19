// Hand-apply script — see README's "Known Issues" for why `prisma migrate
// dev`/`deploy` are not used against this database. Runs migration.sql in
// one transaction via `pg`, then records it in `_prisma_migrations`.
//
// Usage: node prisma/migrations/20260720090000_audit_log_module_status/apply.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

const MIGRATION_NAME = '20260720090000_audit_log_module_status';
const SQL_PATH = path.join(__dirname, 'migration.sql');

async function main() {
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  const checksum = crypto.createHash('sha256').update(sql).digest('hex');

  const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL).replace('-pooler', '');
  const client = new Client({ connectionString });
  await client.connect();

  try {
    const alreadyApplied = await client.query(
      'SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1',
      [MIGRATION_NAME]
    );
    if (alreadyApplied.rowCount > 0) {
      console.log(`Migration ${MIGRATION_NAME} is already recorded as applied. Nothing to do.`);
      return;
    }

    console.log(`Applying ${MIGRATION_NAME}...`);
    const startedAt = new Date();
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query(
        `INSERT INTO "_prisma_migrations"
           (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
         VALUES ($1, $2, $3, $4, NULL, NULL, $5, 1)`,
        [crypto.randomUUID(), checksum, new Date(), MIGRATION_NAME, startedAt]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }

    console.log(`Applied ${MIGRATION_NAME} and recorded it in _prisma_migrations.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
