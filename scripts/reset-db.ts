import mysql from "mysql2/promise";
import { readFile } from "fs/promises";
import path from "path";

const DB_HOST = process.env.DATABASE_HOST || "localhost";
const DB_PORT = parseInt(process.env.DATABASE_PORT || "3306");
const DB_USER = process.env.DATABASE_USER || "root";
const DB_PASSWORD = process.env.DATABASE_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || "";
const DB_NAME = process.env.DATABASE_NAME || "it"; // Default to "it" to match db.sql

async function resetDatabase() {
  let connection: mysql.Connection | null = null;

  try {
    console.log("🔌 Connecting to MySQL server...");
    // Connect without specifying a database
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true, // Allow multiple SQL statements
    });

    console.log(`🗑️  Dropping database '${DB_NAME}' if it exists...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);
    console.log(`✅ Database '${DB_NAME}' dropped (if it existed)`);

    console.log(`📦 Creating database '${DB_NAME}'...`);
    await connection.query(`CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✅ Database '${DB_NAME}' created`);

    console.log(`📄 Reading db.sql file...`);
    const sqlFile = path.join(process.cwd(), "db.sql");
    let sqlContent = await readFile(sqlFile, "utf-8");

    // Remove DELIMITER statements (only needed for mysql CLI, not programmatic execution)
    sqlContent = sqlContent.replace(/DELIMITER \$\$/g, "");
    sqlContent = sqlContent.replace(/DELIMITER ;/g, "");

    // Replace procedure delimiter $$ with semicolon
    sqlContent = sqlContent.replace(/\$\$/g, ";");

    // Remove USE statements since we'll switch to the database explicitly
    sqlContent = sqlContent.replace(/USE\s+\w+\s*;/gi, "");

    // Switch to the database
    await connection.query(`USE \`${DB_NAME}\``);

    console.log(`🚀 Executing SQL schema...`);
    // Execute the entire SQL file at once
    // multipleStatements: true allows this
    await connection.query(sqlContent);

    console.log(`✅ Database '${DB_NAME}' reset and schema applied successfully!`);
  } catch (error) {
    console.error("❌ Error resetting database:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 Database connection closed");
    }
  }
}

// Run the script
resetDatabase()
  .then(() => {
    console.log("✨ Database reset complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
