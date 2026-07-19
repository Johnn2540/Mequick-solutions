const session = require('express-session');
const { Pool } = require('pg');
const connectPgSimple = require('connect-pg-simple');

const isProduction = process.env.NODE_ENV === 'production';
const PgStore = connectPgSimple(session);

// Dedicated, minimal pool for the session store — kept separate from
// Prisma's own pool. max: 1 is enough since each request does a single
// simple query; every extra connection eats into a pooled Postgres
// endpoint's shared connection budget on Vercel.
const sessionPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
});

// REQUIRED: node-postgres crashes the entire process on an unhandled 'error'
// event from an idle pooled client (e.g. the backend closing a connection —
// which serverless Postgres providers like Neon do routinely on
// auto-suspend/connection recycling). Without this listener, a single
// dropped idle connection takes down the whole app, not just one request.
sessionPool.on('error', (err) => {
  console.error('Session pool idle client error (connection was recycled/dropped by the DB — this is recoverable, pool will reconnect on next query):', err.message);
});

const ONE_DAY_MS = 1000 * 60 * 60 * 24;
const DEFAULT_MAX_AGE = Number(process.env.SESSION_MAX_AGE_MS) || ONE_DAY_MS;
const REMEMBER_ME_MAX_AGE = Number(process.env.REMEMBER_ME_MAX_AGE_MS) || ONE_DAY_MS * 30;

// Mounted under /admin only (see routes/admin/index.js) — the public
// storefront stays fully stateless/session-free, which keeps it cheap on
// Vercel and avoids writing a session row for every anonymous visitor.
const sessionMiddleware = session({
  store: new PgStore({
    pool: sessionPool,
    tableName: 'session',
    // Table is created by a hand-written Prisma migration
    // (prisma/migrations/*_add_session_table), not at runtime — creating it
    // lazily on first request would mean every cold start re-checks for it.
    createTableIfMissing: false,
  }),
  name: 'qs.sid',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true, // sliding expiration: an active admin never gets logged out mid-session
  cookie: {
    httpOnly: true,
    // Vercel terminates TLS in front of the function; app.set('trust proxy', 1)
    // (see app.js) is what makes req.secure reflect the original request's scheme.
    secure: isProduction,
    sameSite: 'lax',
    maxAge: DEFAULT_MAX_AGE,
  },
});

module.exports = { sessionMiddleware, DEFAULT_MAX_AGE, REMEMBER_ME_MAX_AGE };
