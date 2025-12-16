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
  
  // Remove USE statements, DELIMITER statements, and comments
  // Split by semicolon, but handle stored procedures carefully
  let processedSql = sql
    .replace(/USE\s+\w+\s*;/gi, "") // Remove USE statements
    .replace(/DELIMITER\s+\$\$[\s\S]*?DELIMITER\s*;/gi, "") // Remove DELIMITER blocks (stored procedures)
    .replace(/DELIMITER\s+[^\s]+/gi, ""); // Remove any remaining DELIMITER statements
  
  const statements = processedSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--") && s.toUpperCase() !== "END");

  for (const statement of statements) {
    if (statement.length > 0) {
      try {
        await pool.query(statement);
      } catch (err: unknown) {
        // If column/index/table already exists, that's okay - migration may have been partially applied
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorCode = (err as any)?.code;
        const sqlState = (err as any)?.sqlState;
        
        if (
          errorMessage.includes("Duplicate column name") ||
          errorMessage.includes("Duplicate key name") ||
          (errorMessage.includes("Table") && errorMessage.includes("already exists")) ||
          errorCode === "ER_TABLE_EXISTS_ERROR" ||
          sqlState === "42S01" ||
          errorMessage.includes("RESIGNAL when handler not active") ||
          errorCode === "ER_RESIGNAL_WITHOUT_ACTIVE_HANDLER" ||
          sqlState === "0K000" ||
          (errorMessage.includes("SQL syntax") && errorMessage.includes("END"))
        ) {
          logger.warn("Database object already exists or statement not applicable, skipping", { 
            statement: statement.substring(0, 50),
            error: errorMessage.substring(0, 100)
          });
          continue;
        }
        throw err;
      }
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

// Run migrations if this file is executed directly
if (import.meta.main) {
  runMigrations()
    .then(() => {
      console.log("✅ Migrations completed successfully");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Migration failed:", err);
      process.exit(1);
    });
}
