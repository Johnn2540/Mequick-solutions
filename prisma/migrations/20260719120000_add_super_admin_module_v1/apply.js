// Hand-apply script for this migration — see README's "Known Issues" section
// for why `prisma migrate dev`/`deploy` are not used against this database.
// Runs the DDL in migration.sql directly via `pg`, then inserts the matching
// row into `_prisma_migrations` so Prisma's own ledger stays consistent with
// what `prisma migrate status` reports.
//
// Usage: node prisma/migrations/20260719120000_add_super_admin_module_v1/apply.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

const MIGRATION_NAME = '20260719120000_add_super_admin_module_v1';
const SQL_PATH = path.join(__dirname, 'migration.sql');

async function main() {
  const sql = fs.readFileSync(SQL_PATH, 'utf8');
  const checksum = crypto.createHash('sha256').update(sql).digest('hex');

  // directUrl, not the pooled url — DDL needs a session-level connection.
  const connectionString = (process.env.DIRECT_URL || process.env.DATABASE_URL).replace('-pooler', '');
  const client = new Client({ connectionString });
  await client.connect();

  try {
    // Safety guard: the QuoteStatus enum recreation in migration.sql is only
    // safe with zero existing quote_requests rows (see migration.sql's header
    // comment). Re-check right before running, in case a real quote request
    // came in on the live site since this migration was written.
    const { rows } = await client.query('SELECT COUNT(*)::int AS count FROM "quote_requests"');
    if (rows[0].count > 0) {
      throw new Error(
        `Aborting: quote_requests now has ${rows[0].count} row(s). ` +
          'The QuoteStatus enum recreation in migration.sql will fail or silently ' +
          'corrupt data for any row whose old status has no matching new value. ' +
          'Back up/migrate that data by hand before re-running this script.'
      );
    }

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

    // Run the whole file as ONE call, not split into individual statements.
    // node-postgres sends a plain string (no $-params) via Postgres's simple
    // query protocol, which executes a semicolon-separated batch as a single
    // implicit transaction — all statements commit together, or none do.
    // (An earlier version of this script manually split on `;\n` and
    // filtered out chunks starting with `--`; a dry run against this exact
    // file showed that regex silently swallowed 9 of the CREATE TABLE
    // statements because they were merged with a preceding `-- CreateTable`
    // comment line and then filtered out as "comment-only". Sending the raw
    // file as one query sidesteps that class of bug entirely.)
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
