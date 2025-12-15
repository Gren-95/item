# Database Migrations

This directory contains versioned database migration scripts.

## Migration System

Migrations are numbered sequentially and applied in order. Each migration file follows the pattern:
- `001_<description>.sql`
- `002_<description>.sql`
- etc.

## Current Migration

The initial database schema is in `001_initial_schema.sql`, which was converted from `db.sql`.

## Running Migrations

Migrations should be run manually or via a migration runner script. The migration system tracks applied migrations in the `schema_migrations` table.

## Adding New Migrations

1. Create a new numbered SQL file in this directory
2. Include both `UP` (forward) and `DOWN` (rollback) migrations if needed
3. Test the migration on a development database first
4. Document any breaking changes
