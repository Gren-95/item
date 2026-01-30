import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DB_HOST || process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || process.env.DATABASE_PORT || "3306"),
  user: process.env.DB_USER || process.env.DATABASE_USER || "root",
  password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || process.env.MYSQL_ROOT_PASSWORD || "",
  database: process.env.DB_NAME || process.env.DATABASE_NAME || "it",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
