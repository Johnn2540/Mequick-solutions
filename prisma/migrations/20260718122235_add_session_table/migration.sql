-- Session table for connect-pg-simple (express-session store).
-- Not modeled in schema.prisma / queried via Prisma Client — connect-pg-simple
-- owns this table directly through its own `pg` Pool. DDL matches
-- node_modules/connect-pg-simple/table.sql exactly so the store's queries
-- (which assume this exact shape) work without surprises.
CREATE TABLE "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
WITH (OIDS = FALSE);

ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;

CREATE INDEX "IDX_session_expire" ON "session" ("expire");
