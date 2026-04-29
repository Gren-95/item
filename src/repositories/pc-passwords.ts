import type { Pool, RowDataPacket } from "mysql2/promise";
import { logger } from "../utils/logger";
import { decryptPassword, encryptPassword, isEncrypted } from "../utils/crypto";

export interface PcPasswordRow {
  id: number;
  user: string;
  evocon: string | null;
  pw: string;
  status: number;
}

interface RawPcPasswordRow extends RowDataPacket {
  id: number;
  user: string;
  evocon: string | null;
  pw: string;
  status: number;
}

/**
 * List all PC passwords with the stored value decrypted. Legacy rows that
 * predate encryption are returned as-is by decryptPassword().
 */
export async function listPcPasswords(pool: Pool): Promise<PcPasswordRow[]> {
  const [rows] = await pool.query<RawPcPasswordRow[]>(
    "SELECT id, user, evocon, pw, status FROM it_pc_pw ORDER BY user"
  );
  return rows.map((row) => ({
    ...row,
    pw: decryptPassword(row.pw),
  }));
}

export async function addPcPassword(
  pool: Pool,
  data: { user: string; evocon: string | null; pw: string; status: number }
): Promise<void> {
  await pool.query(
    "INSERT INTO it_pc_pw (user, evocon, pw, status) VALUES (?, ?, ?, ?)",
    [data.user, data.evocon, encryptPassword(data.pw), data.status]
  );
}

export async function deletePcPassword(pool: Pool, id: number): Promise<void> {
  await pool.query("DELETE FROM it_pc_pw WHERE id = ?", [id]);
}

/**
 * Fetch one row's plaintext credentials for the print path. Returns null
 * when the id is unknown.
 */
export async function getPcPasswordForPrint(
  pool: Pool,
  id: number
): Promise<{ user: string; evocon: string | null; pw: string } | null> {
  const [rows] = await pool.query<RawPcPasswordRow[]>(
    "SELECT user, evocon, pw FROM it_pc_pw WHERE id = ? LIMIT 1",
    [id]
  );
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    user: row.user,
    evocon: row.evocon,
    pw: decryptPassword(row.pw),
  };
}

/**
 * One-shot encryption of any rows still stored as plaintext. Idempotent:
 * rows already prefixed with "enc:v1:" are skipped. Called once at server
 * startup so an upgrade transparently migrates the existing table.
 */
export async function encryptLegacyPcPasswords(pool: Pool): Promise<void> {
  const [rows] = await pool.query<RawPcPasswordRow[]>(
    "SELECT id, pw FROM it_pc_pw"
  );
  const legacy = rows.filter((r) => !isEncrypted(r.pw));
  if (legacy.length === 0) return;
  logger.info("Encrypting legacy PC passwords", { count: legacy.length });
  for (const row of legacy) {
    await pool.query("UPDATE it_pc_pw SET pw = ? WHERE id = ?", [
      encryptPassword(row.pw),
      row.id,
    ]);
  }
  logger.info("Legacy PC passwords encrypted", { count: legacy.length });
}
