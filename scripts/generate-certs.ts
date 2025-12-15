import { mkdir, rename, rm } from "fs/promises";
import path from "path";

type RunResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

async function runCommand(cmd: string, args: string[]): Promise<RunResult> {
  const process = Bun.spawn({
    cmd: [cmd, ...args],
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);

  return {
    exitCode: process.exitCode ?? 1,
    stdout,
    stderr,
  };
}

const CERT_DIR = path.join(process.cwd(), "certs");
const FINAL_CERT = path.join(CERT_DIR, "ssl.pem");
const FINAL_KEY = path.join(CERT_DIR, "ssl-key.pem");
const TMP_CERT = path.join(CERT_DIR, "_mkcert-cert.pem");
const TMP_KEY = path.join(CERT_DIR, "_mkcert-key.pem");

async function cleanPaths(paths: string[]) {
  await Promise.all(
    paths.map((filePath) =>
      rm(filePath, { force: true }).catch(() => {
        // ignore missing files
      })
    )
  );
}

async function generateWithMkcert() {
  const check = await runCommand("which", ["mkcert"]);
  if (check.exitCode !== 0) {
    throw new Error("mkcert not installed");
  }

  console.log("🔧 Installing mkcert root CA (if needed)...");
  await runCommand("mkcert", ["-install"]);

  await cleanPaths([TMP_CERT, TMP_KEY, FINAL_CERT, FINAL_KEY]);

  console.log("🔒 Generating local TLS certs with mkcert...");
  const result = await runCommand("mkcert", [
    "-cert-file",
    TMP_CERT,
    "-key-file",
    TMP_KEY,
    "localhost",
    "127.0.0.1",
    "::1",
  ]);

  if (result.exitCode !== 0) {
    const message = result.stderr.trim() || result.stdout.trim() || "mkcert failed";
    throw new Error(message);
  }

  await rename(TMP_CERT, FINAL_CERT);
  await rename(TMP_KEY, FINAL_KEY);

  console.log(`✅ mkcert certificates written to ${CERT_DIR}`);
}

async function generateSelfSigned() {
  await cleanPaths([FINAL_CERT, FINAL_KEY]);

  console.log("🔐 Falling back to self-signed certificates with OpenSSL...");
  const subject =
    "/C=US/ST=Local/L=Local/O=EquipmentAudit/OU=Dev/CN=localhost";
  const san = "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:::1";

  const result = await runCommand("openssl", [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-sha256",
    "-days",
    "365",
    "-nodes",
    "-keyout",
    FINAL_KEY,
    "-out",
    FINAL_CERT,
    "-subj",
    subject,
    "-addext",
    san,
  ]);

  if (result.exitCode !== 0) {
    const message = result.stderr.trim() || result.stdout.trim() || "openssl failed";
    throw new Error(message);
  }

  console.log(`✅ Self-signed certificates written to ${CERT_DIR}`);
}

async function main() {
  await mkdir(CERT_DIR, { recursive: true });

  try {
    await generateWithMkcert();
    return;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.warn(`⚠️ mkcert generation failed: ${reason}`);
  }

  try {
    await generateSelfSigned();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unknown error";
    console.error(`❌ Failed to generate certificates: ${reason}`);
    process.exit(1);
  }
}

await main();
