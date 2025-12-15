import pool from "../db";
import { readFileSync } from "fs";
import { join } from "path";
import { logger } from "../utils/logger";

const MIGRATIONS_DIR = join(import.meta.dir, ".");

interface MigrationRecord {
  version: number;
  name: string;
  applied_at: Date;
}

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INT UNSIGNED NOT NULL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_migration_name (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getAppliedMigrations(): Promise<Set<number>> {
  const [rows] = await pool.query<MigrationRecord[]>(
    "SELECT version FROM schema_migrations ORDER BY version"
  );
  return new Set(rows.map((r) => r.version));
}

async function recordMigration(version: number, name: string): Promise<void> {
  await pool.query(
    "INSERT INTO schema_migrations (version, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = name",
    [version, name]
  );
}

async function runMigration(fileName: string): Promise<void> {
  const filePath = join(MIGRATIONS_DIR, fileName);
  const sql = readFileSync(filePath, "utf-8");
  
  // Split by semicolon and execute each statement
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const statement of statements) {
    if (statement.length > 0) {
      await pool.query(statement);
    }
  }
}

export async function runMigrations(): Promise<void> {
  const traceId = crypto.randomUUID();
  logger.info("Starting database migrations", { traceId });

  try {
    await ensureMigrationsTable();
    const applied = await getAppliedMigrations();

    // Get all migration files
    const files = readFileSync(join(MIGRATIONS_DIR, "migrations.list"), "utf-8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && line.endsWith(".sql"));

    for (const file of files) {
      const match = file.match(/^(\d+)_/);
      if (!match) {
        logger.warn("Skipping invalid migration file", { traceId, file });
        continue;
      }

      const version = parseInt(match[1], 10);
      if (applied.has(version)) {
        logger.info("Migration already applied", { traceId, version, file });
        continue;
      }

      logger.info("Applying migration", { traceId, version, file });
      await runMigration(file);
      await recordMigration(version, file);
      logger.info("Migration applied successfully", { traceId, version, file });
    }

    logger.info("All migrations completed", { traceId });
  } catch (err) {
    logger.error("Migration failed", err, { traceId });
    throw err;
  }
}
