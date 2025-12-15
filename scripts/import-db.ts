import mysql from "mysql2/promise";
import { readFile, readdir, stat } from "fs/promises";
import path from "path";
import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";

const DB_HOST = process.env.DATABASE_HOST || "localhost";
const DB_PORT = parseInt(process.env.DATABASE_PORT || "3306");
const DB_USER = process.env.DATABASE_USER || "ims_user";
const DB_PASSWORD = process.env.DATABASE_PASSWORD || "ims_password";
const DB_NAME = process.env.DATABASE_NAME || "it";
const EXPORT_DIR = process.env.DB_EXPORT_DIR || "/tmp/db-exports";

type DumpFile = {
  name: string;
  fullPath: string;
  mtime: Date;
  size: number;
};

async function chooseDump(): Promise<DumpFile | null> {
  let files: string[];
  try {
    files = await readdir(EXPORT_DIR);
  } catch (error) {
    console.error(`❌ Could not read export directory '${EXPORT_DIR}':`, error);
    return null;
  }

  const dumps: DumpFile[] = [];
  for (const file of files) {
    if (!file.endsWith(".sql")) continue;
    const fullPath = path.join(EXPORT_DIR, file);
    const fileStats = await stat(fullPath);
    if (!fileStats.isFile()) continue;
    dumps.push({
      name: file,
      fullPath,
      mtime: fileStats.mtime,
      size: fileStats.size,
    });
  }

  if (dumps.length === 0) {
    console.log(`ℹ️  No SQL dumps found in '${EXPORT_DIR}'.`);
    return null;
  }

  dumps.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

  console.log("Available dumps (latest first):");
  dumps.forEach((dump, index) => {
    const sizeKb = (dump.size / 1024).toFixed(1);
    console.log(` ${index + 1}) ${dump.name}  [${dump.mtime.toISOString()} | ${sizeKb} KB]`);
  });

  const rl = createInterface({ input, output });
  const answer = await rl.question(
    `Select dump to import [1-${dumps.length}, default 1]: `
  );
  await rl.close();

  let choice = parseInt(answer.trim(), 10);
  if (Number.isNaN(choice) || choice < 1 || choice > dumps.length) {
    choice = 1;
  }

  return dumps[choice - 1];
}

async function importDatabase() {
  let connection: mysql.Connection | null = null;

  try {
    const dump = await chooseDump();
    if (!dump) {
      console.log("⚠️  No dump selected. Aborting import.");
      return;
    }

    console.log("🔌 Connecting to MySQL server...");
    connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASSWORD,
      multipleStatements: true,
    });

    console.log(`🗑️  Dropping database '${DB_NAME}' if it exists...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${DB_NAME}\``);

    console.log(`📦 Creating database '${DB_NAME}'...`);
    await connection.query(
      `CREATE DATABASE \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );

    console.log(`📄 Reading dump file '${dump.name}'...`);
    let sqlContent = await readFile(dump.fullPath, "utf-8");

    // Normalize delimiters so multipleStatements can execute the file content
    sqlContent = sqlContent.replace(/DELIMITER \$\$/g, "");
    sqlContent = sqlContent.replace(/DELIMITER ;/g, "");
    sqlContent = sqlContent.replace(/\$\$/g, ";");

    // Remove any USE statements to avoid switching away from the target DB
    sqlContent = sqlContent.replace(/USE\s+\w+\s*;/gi, "");

    // Clean up invalid SQL statements
    // Remove standalone "null;" statements (invalid SQL)
    sqlContent = sqlContent.replace(/^null\s*;?\s*$/gim, "");
    
    // Remove empty lines that might cause issues
    sqlContent = sqlContent.replace(/^\s*;\s*$/gm, "");
    
    // Remove malformed stored procedure definitions (DROP PROCEDURE followed by null or empty)
    sqlContent = sqlContent.replace(/DROP PROCEDURE IF EXISTS[^;]+;\s*null\s*;?\s*/gi, "");
    
    // Clean up multiple consecutive newlines
    sqlContent = sqlContent.replace(/\n{3,}/g, "\n\n");

    await connection.query(`USE \`${DB_NAME}\``);

    console.log(`🚀 Importing dump into '${DB_NAME}'...`);
    await connection.query(sqlContent);

    console.log(`✅ Database '${DB_NAME}' imported successfully from '${dump.name}'.`);
  } catch (error) {
    console.error("❌ Error importing database:", error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 Database connection closed");
    }
  }
}

importDatabase()
  .then(() => {
    console.log("✨ Import complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
