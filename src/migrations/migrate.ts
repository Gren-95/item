import pool from "../db";
import { readFileSync } from "fs";
import { join } from "path";
import { logger } from "../utils/logger";
import type { RowDataPacket } from "mysql2";

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

  // Ensure it_user_permissions exists in the IT database (plant-based, user_id keyed)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS it_user_permissions (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      plant_id INT UNSIGNED NOT NULL,
      permission VARCHAR(100) NOT NULL,
      role ENUM('user','admin') NOT NULL,
      comment VARCHAR(255) NOT NULL DEFAULT '',
      created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uk_user_access (user_id, plant_id, permission, role),
      KEY idx_plant (plant_id),
      KEY idx_user (user_id),
      KEY idx_permission (permission)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Ensure plant_id column exists (older tables may lack it)
  try {
    await pool.query(`
      ALTER TABLE it_user_permissions
      ADD COLUMN plant_id INT UNSIGNED NOT NULL DEFAULT 0 AFTER user_id
    `);
  } catch (err: any) {
    const msg = err?.message || "";
    const code = err?.code;
    if (code !== "ER_DUP_FIELDNAME" && !msg.includes("Duplicate column name")) {
      throw err;
    }
  }

  // Rename/ensure permission & role columns; drop legacy columns
  try {
    await pool.query(`ALTER TABLE it_user_permissions CHANGE COLUMN access_key permission VARCHAR(100) NOT NULL`);
  } catch (err: any) {
    const msg = err?.message || "";
    if (!msg.includes("Unknown column 'access_key'")) {
      throw err;
    }
  }
  try {
    await pool.query(`ALTER TABLE it_user_permissions CHANGE COLUMN value role ENUM('user','admin') NOT NULL`);
  } catch (err: any) {
    const msg = err?.message || "";
    if (!msg.includes("Unknown column 'value'")) {
      throw err;
    }
  }
  try {
    await pool.query(`ALTER TABLE it_user_permissions DROP COLUMN start_date`);
  } catch (err: any) {
    const msg = err?.message || "";
    if (
      !msg.includes("Unknown column 'start_date'") &&
      !msg.includes("Can't DROP 'start_date'") &&
      !msg.includes("Check that column/key exists")
    ) {
      throw err;
    }
  }
  try {
    await pool.query(`ALTER TABLE it_user_permissions DROP COLUMN end_date`);
  } catch (err: any) {
    const msg = err?.message || "";
    if (
      !msg.includes("Unknown column 'end_date'") &&
      !msg.includes("Can't DROP 'end_date'") &&
      !msg.includes("Check that column/key exists")
    ) {
      throw err;
    }
  }

  // Recreate unique key on new columns
  try {
    await pool.query(`ALTER TABLE it_user_permissions DROP INDEX uk_user_access`);
  } catch (err: any) {
    const msg = err?.message || "";
    if (!msg.includes("check that column/key exists") && !msg.includes("can't DROP")) {
      // ignore missing
    }
  }
  try {
    await pool.query(`ALTER TABLE it_user_permissions ADD UNIQUE KEY uk_user_access (user_id, plant_id, permission, role)`);
  } catch (err: any) {
    const msg = err?.message || "";
    if (!msg.includes("Duplicate key name") && !msg.includes("already exists")) {
      throw err;
    }
  }

  // Backfill existing rows without plant_id to global (0)
  await pool.query(`UPDATE it_user_permissions SET plant_id = 0 WHERE plant_id IS NULL`);

  // Ensure expiry_date column exists
  try {
    await pool.query(`
      ALTER TABLE it_user_permissions
      ADD COLUMN expiry_date DATE NULL AFTER comment
    `);
  } catch (err: any) {
    const msg = err?.message || "";
    const code = err?.code;
    if (code !== "ER_DUP_FIELDNAME" && !msg.includes("Duplicate column name")) {
      throw err;
    }
  }

  // Ensure added_by_user_id column exists
  try {
    await pool.query(`
      ALTER TABLE it_user_permissions
      ADD COLUMN added_by_user_id VARCHAR(50) NULL AFTER expiry_date
    `);
  } catch (err: any) {
    const msg = err?.message || "";
    const code = err?.code;
    if (code !== "ER_DUP_FIELDNAME" && !msg.includes("Duplicate column name")) {
      throw err;
    }
  }

  // Ensure indexes exist
  try {
    await pool.query(`ALTER TABLE it_user_permissions ADD INDEX idx_expiry_date (expiry_date)`);
  } catch (err: any) {
    const msg = err?.message || "";
    if (!msg.includes("Duplicate key name") && !msg.includes("already exists")) {
      // ignore missing
    }
  }
  try {
    await pool.query(`ALTER TABLE it_user_permissions ADD INDEX idx_added_by_user (added_by_user_id)`);
  } catch (err: any) {
    const msg = err?.message || "";
    if (!msg.includes("Duplicate key name") && !msg.includes("already exists")) {
      // ignore missing
    }
  }
}

async function getAppliedMigrations(): Promise<Set<number>> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT version FROM schema_migrations ORDER BY version"
  );
  return new Set((rows as MigrationRecord[]).map((r) => r.version));
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
  
  logger.info("Raw SQL file read", { 
    fileName, 
    fileLength: sql.length,
    firstChars: sql.substring(0, 200),
    hasCreateDatabase: sql.includes("CREATE DATABASE")
  });
  
  // Remove USE statements, DELIMITER statements, and comments
  // Split by semicolon, but handle stored procedures carefully
  let processedSql = sql
    .replace(/USE\s+\w+\s*;/gi, "") // Remove USE statements
    .replace(/DELIMITER\s+\$\$[\s\S]*?DELIMITER\s*;/gi, "") // Remove DELIMITER blocks (stored procedures)
    .replace(/DELIMITER\s+[^\s]+/gi, "") // Remove any remaining DELIMITER statements
    .replace(/^--.*$/gm, ""); // Remove comment lines (lines starting with --)
  
  logger.info("After processing", { 
    fileName,
    processedLength: processedSql.length,
    firstChars: processedSql.substring(0, 200)
  });
  
  const statements = processedSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--") && s.toUpperCase() !== "END");

  logger.info("Processing migration statements", { 
    fileName, 
    statementCount: statements.length,
    firstStatement: statements[0]?.substring(0, 100),
    allStatements: statements.map(s => s.substring(0, 50))
  });
  
  // Check if we need root user for core database operations
  const needsRootUser = processedSql.includes("`core`") || processedSql.includes("core.");
  let rootConnection: any = null;
  
  if (needsRootUser) {
    const rootUser = process.env.MYSQL_ROOT_USER || "root";
    const rootPassword = process.env.MYSQL_ROOT_PASSWORD;
    if (rootPassword) {
      const mysql = await import("mysql2/promise");
      rootConnection = await mysql.createConnection({
        host: process.env.DATABASE_HOST || "localhost",
        port: parseInt(process.env.DATABASE_PORT || "3306"),
        user: rootUser,
        password: rootPassword,
      });
    }
  }
  
  try {
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length > 0) {
        try {
          // Handle CREATE DATABASE statements specially - they need to be executed without a database context
          const trimmedStatement = statement.trim();
          const upperStatement = trimmedStatement.toUpperCase();
          const isCreateDatabase = upperStatement.startsWith("CREATE DATABASE");
          
          // Check if statement targets core database
          const targetsCore = trimmedStatement.includes("`core`") || trimmedStatement.includes("core.");

          // Skip any statement that targets the legacy core database
          if (targetsCore) {
            logger.info("Skipping statement targeting core database", {
              statementIndex: i,
              statement: trimmedStatement.substring(0, 150),
            });
            continue;
          }
          
          if (isCreateDatabase) {
            logger.info("Executing CREATE DATABASE statement", { 
              statementIndex: i,
              statement: trimmedStatement.substring(0, 150),
              firstChars: trimmedStatement.substring(0, 20)
            });
            // Create a connection without specifying a database for CREATE DATABASE
            const mysql = await import("mysql2/promise");
            const connection = await mysql.createConnection({
              host: process.env.DATABASE_HOST || "localhost",
              port: parseInt(process.env.DATABASE_PORT || "3306"),
              user: process.env.DATABASE_USER || "root",
              password: process.env.DATABASE_PASSWORD || "item_password",
            });
            try {
              await connection.query(trimmedStatement);
              logger.info("Database created successfully", { statement: trimmedStatement.substring(0, 100) });
            } catch (dbErr: unknown) {
              const dbErrorMessage = dbErr instanceof Error ? dbErr.message : String(dbErr);
              const dbErrorCode = (dbErr as any)?.code;
              // For CREATE DATABASE IF NOT EXISTS, "already exists" is expected and should be logged as info
              if (
                dbErrorMessage.includes("Database") && 
                (dbErrorMessage.includes("already exists") || dbErrorCode === "ER_DB_CREATE_EXISTS")
              ) {
                logger.info("Database already exists, skipping creation", { statement: trimmedStatement.substring(0, 100) });
              } else if (
                dbErrorMessage.includes("Access denied") && 
                (dbErrorMessage.includes("database") || dbErrorCode === "ER_DBACCESS_DENIED_ERROR")
              ) {
                // User doesn't have CREATE DATABASE privilege - try with root user if available
                logger.warn("User lacks CREATE DATABASE privilege, attempting with root user", { 
                user: process.env.DATABASE_USER || "root",
                error: dbErrorMessage
              });
                
                // Try with root user if credentials are available
                const rootUser = process.env.MYSQL_ROOT_USER || "root";
                const rootPassword = process.env.MYSQL_ROOT_PASSWORD;
                
                if (rootPassword) {
                  try {
                    const rootConn = await mysql.createConnection({
                      host: process.env.DATABASE_HOST || "localhost",
                      port: parseInt(process.env.DATABASE_PORT || "3306"),
                      user: rootUser,
                      password: rootPassword,
                    });
                    try {
                      await rootConn.query(trimmedStatement);
                      logger.info("Database created successfully using root user", { statement: trimmedStatement.substring(0, 100) });
                    } finally {
                      await rootConn.end();
                    }
                  } catch (rootErr) {
                    logger.error("Failed to create database even with root user", rootErr);
                    throw new Error(`Cannot create database 'core'. User '${process.env.DATABASE_USER || "root"}' lacks CREATE DATABASE privilege. Please create the database manually or grant privileges. Original error: ${dbErrorMessage}`);
                  }
                } else {
                  throw new Error(`Cannot create database 'core'. User '${process.env.DATABASE_USER || "root"}' lacks CREATE DATABASE privilege and MYSQL_ROOT_PASSWORD is not set. Please create the database manually: ${trimmedStatement}`);
                }
              } else {
                throw dbErr;
              }
            } finally {
              await connection.end();
            }
          } else if (targetsCore && rootConnection) {
            // Use root connection for core database operations
            await rootConnection.query(trimmedStatement);
          } else {
            await pool.query(statement);
          }
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
          sqlState === "HY000" ||
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
  } finally {
    // Close root connection if it was opened
    if (rootConnection) {
      await rootConnection.end();
    }
  }
}

export async function runMigrations(force: boolean = false): Promise<void> {
  const traceId = crypto.randomUUID();
  logger.info("Starting database migrations", { traceId, force });

  try {
    await ensureMigrationsTable();
    
    // If force is true, clear the migration tracking
    if (force) {
      logger.info("Force mode: clearing migration tracking", { traceId });
      await pool.query("DELETE FROM schema_migrations");
    }
    
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
      if (applied.has(version) && !force) {
        logger.info("Migration already applied", { traceId, version, file });
        continue;
      }

      if (force && applied.has(version)) {
        logger.info("Reapplying migration (force mode)", { traceId, version, file });
      } else {
        logger.info("Applying migration", { traceId, version, file });
      }
      
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

export async function resetMigrations(): Promise<void> {
  const traceId = crypto.randomUUID();
  logger.info("Resetting migration tracking", { traceId });

  try {
    await ensureMigrationsTable();
    await pool.query("DELETE FROM schema_migrations");
    logger.info("Migration tracking reset", { traceId });
  } catch (err) {
    logger.error("Failed to reset migrations", err, { traceId });
    throw err;
  }
}

// Run migrations if this file is executed directly
if (import.meta.main) {
  const args = process.argv.slice(2);
  const force = args.includes("--force") || args.includes("-f");
  const reset = args.includes("--reset");

  if (reset) {
    resetMigrations()
      .then(() => {
        console.log("✅ Migration tracking reset");
        process.exit(0);
      })
      .catch((err) => {
        console.error("❌ Reset failed:", err);
        process.exit(1);
      });
  } else {
    runMigrations(force)
      .then(() => {
        console.log("✅ Migrations completed successfully");
        process.exit(0);
      })
      .catch((err) => {
        console.error("❌ Migration failed:", err);
        process.exit(1);
      });
  }
}
