-- PostgreSQL initialization script
-- Runs only on first database creation (against the default POSTGRES_DB).

-- ---------------------------------------------------------------------------
-- Default (development) database setup
-- ---------------------------------------------------------------------------

-- Create sync_revision sequence for server-side monotonic revision tracking.
-- Used by TracksSyncRevision concern on all syncable entities.
CREATE SEQUENCE IF NOT EXISTS sync_revision_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Enable pg_trgm for trigram-based text search (notes full-text search).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ---------------------------------------------------------------------------
-- Test database setup
-- ---------------------------------------------------------------------------
-- Dedicated database used by phpunit.xml (DB_DATABASE=reminders_test) so that
-- the test suite (RefreshDatabase) never touches development data. Owned by the
-- same `reminders` role, so migrations run with full privileges.
-- CREATE DATABASE cannot run inside a transaction/DO block, so it is guarded by
-- gexec rather than IF NOT EXISTS.
SELECT 'CREATE DATABASE reminders_test OWNER reminders'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'reminders_test')\gexec

-- Provision the test database with the same extensions the app relies on.
\connect reminders_test
CREATE EXTENSION IF NOT EXISTS pg_trgm;
