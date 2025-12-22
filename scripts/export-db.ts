import mysql from "mysql2/promise";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Helper function to escape SQL values
function escapeSqlValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "1" : "0";
  if (value instanceof Date) {
    return `'${value.toISOString().slice(0, 19).replace("T", " ")}'`;
  }
  if (Buffer.isBuffer(value)) {
    return `0x${value.toString("hex")}`;
  }
  if (typeof value === "string") {
    // Escape single quotes and backslashes
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "''")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
      .replace(/\0/g, "\\0");
    return `'${escaped}'`;
  }
  // Fallback: convert to string and escape
  return escapeSqlValue(String(value));
}

const DB_HOST = process.env.DATABASE_HOST || "localhost";
const DB_PORT = parseInt(process.env.DATABASE_PORT || "3306");
const DB_USER = process.env.DATABASE_USER || "root";
const DB_PASSWORD = process.env.DATABASE_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || "";
const DB_NAME = process.env.DATABASE_NAME || "it";

// Export directory - mounted to /tmp/db-exports in container
const EXPORT_DIR = process.env.DB_EXPORT_DIR || "/tmp/db-exports";

async function exportDatabase() {
  let connection: mysql.Connection | null = null;

  try {
    console.log("🔌 Connecting to MySQL server...");
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
    });

    // Ensure export directory exists
    try {
      await mkdir(EXPORT_DIR, { recursive: true });
      console.log(`📁 Export directory ready: ${EXPORT_DIR}`);
    } catch (error) {
      console.warn(`⚠️  Could not create export directory: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, -5);
    const filename = `${DB_NAME}_export_${timestamp}.sql`;
    const filepath = path.join(EXPORT_DIR, filename);

    console.log(`📤 Exporting database '${DB_NAME}'...`);

    // Get all tables (use alias to avoid case-sensitivity issues)
    const [tables] = await connection.query<mysql.RowDataPacket[]>(
      `
        SELECT table_name AS tableName
        FROM information_schema.tables
        WHERE table_schema = ?
        ORDER BY table_name
      `,
      [DB_NAME]
    );

    if (tables.length === 0) {
      console.log("⚠️  No tables found in database");
      return;
    }

    console.log(`📊 Found ${tables.length} tables`);

    // Build SQL export
    let sqlExport = `-- Database Export: ${DB_NAME}\n`;
    sqlExport += `-- Export Date: ${new Date().toISOString()}\n`;
    sqlExport += `-- Tables: ${tables.length}\n\n`;
    sqlExport += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    // Export each table
    for (const table of tables) {
      const tableName = table.tableName as string | undefined;
      if (!tableName) {
        console.warn("⚠️  Skipping table with missing name", table);
        continue;
      }
      console.log(`  📋 Exporting table: ${tableName}`);

      // Get table structure
      const [createTable] = await connection.query<mysql.RowDataPacket[]>(
        `SHOW CREATE TABLE \`${tableName}\``
      );
      sqlExport += `-- Table: ${tableName}\n`;
      sqlExport += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
      sqlExport += `${createTable[0]["Create Table"]};\n\n`;

      // Get table data
      const [rows] = await connection.query<mysql.RowDataPacket[]>(
        `SELECT * FROM \`${tableName}\``
      );

      if (rows.length > 0) {
        sqlExport += `-- Data for table: ${tableName}\n`;
        sqlExport += `LOCK TABLES \`${tableName}\` WRITE;\n`;

        // Get column names
        const [columns] = await connection.query<mysql.RowDataPacket[]>(
          `SHOW COLUMNS FROM \`${tableName}\``
        );
        const columnNames = columns.map((col) => `\`${col.Field}\``).join(", ");

        // Insert data
        for (const row of rows) {
          const values = columns.map((col) => escapeSqlValue(row[col.Field]));
          sqlExport += `INSERT INTO \`${tableName}\` (${columnNames}) VALUES (${values.join(", ")});\n`;
        }

        sqlExport += `UNLOCK TABLES;\n\n`;
        console.log(`    ✅ Exported ${rows.length} rows`);
      } else {
        sqlExport += `-- No data in table: ${tableName}\n\n`;
        console.log(`    ℹ️  Table is empty`);
      }
    }

    // Export stored procedures
    console.log(`📦 Exporting stored procedures...`);
    const [procedures] = await connection.query<mysql.RowDataPacket[]>(
      `
        SELECT routine_name AS procedureName
        FROM information_schema.routines
        WHERE routine_schema = ? AND routine_type = 'PROCEDURE'
        ORDER BY routine_name
      `,
      [DB_NAME]
    );

    if (procedures.length > 0) {
      sqlExport += `-- Stored Procedures\n\n`;
      for (const proc of procedures) {
        const procedureName = proc.procedureName as string | undefined;
        if (!procedureName) {
          console.warn("⚠️  Skipping procedure with missing name", proc);
          continue;
        }
        const [procDef] = await connection.query<mysql.RowDataPacket[]>(
          `SHOW CREATE PROCEDURE \`${procedureName}\``
        );
        const procDefinition = procDef[0]?.["Create Procedure"];
        if (!procDefinition) {
          console.warn(`  ⚠️  Could not get definition for procedure: ${procedureName}, skipping`);
          continue;
        }
        sqlExport += `DROP PROCEDURE IF EXISTS \`${procedureName}\`;\n`;
        sqlExport += `DELIMITER $$\n`;
        sqlExport += `${procDefinition}$$\n`;
        sqlExport += `DELIMITER ;\n\n`;
        console.log(`  ✅ Exported procedure: ${procedureName}`);
      }
    }

    sqlExport += `SET FOREIGN_KEY_CHECKS = 1;\n`;

    // Write to file
    await writeFile(filepath, sqlExport, "utf-8");
    console.log(`\n✅ Database exported successfully!`);
    console.log(`📄 File: ${filepath}`);
    console.log(`📊 Size: ${(sqlExport.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error("❌ Error exporting database:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 Database connection closed");
    }
  }
}

// Run the script
exportDatabase()
  .then(() => {
    console.log("✨ Export complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
