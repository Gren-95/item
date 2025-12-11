import mysql from "mysql2/promise";

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "3306"),
  user: process.env.DATABASE_USER || "ims_user",
  password: process.env.DATABASE_PASSWORD || "ims_password",
  database: process.env.DATABASE_NAME || "ims",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
