-- PostgreSQL initialization script
-- Runs only on first database creation

-- Create sync_revision sequence for server-side monotonic revision tracking
-- Used by TracksSyncRevision concern on all syncable entities
CREATE SEQUENCE IF NOT EXISTS sync_revision_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Enable pg_trgm for trigram-based text search (notes full-text search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
