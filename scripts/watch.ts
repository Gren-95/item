#!/usr/bin/env bun
/**
 * File watcher script that watches the entire src directory
 * and restarts the server when any file changes
 */

import { watch } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "path";

const SRC_DIR = path.join(process.cwd(), "src");
let serverProcess: ReturnType<typeof spawn> | null = null;

function startServer() {
  if (serverProcess) {
    console.log("🔄 Restarting server...");
    serverProcess.kill();
    serverProcess = null;
  }

  console.log("🚀 Starting server...");
  serverProcess = spawn("bun", ["run", "src/server.ts"], {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  serverProcess.on("exit", (code) => {
    if (code !== null && code !== 0) {
      console.error(`Server exited with code ${code}`);
    }
  });
}

async function watchDirectory() {
  console.log(`👀 Watching ${SRC_DIR} for changes...`);
  
  try {
    const watcher = watch(SRC_DIR, { recursive: true });
    
    for await (const event of watcher) {
      // Filter out non-TypeScript files and node_modules
      if (
        event.filename &&
        (event.filename.endsWith(".ts") || event.filename.endsWith(".sql")) &&
        !event.filename.includes("node_modules")
      ) {
        console.log(`📝 File changed: ${event.filename}`);
        startServer();
      }
    }
  } catch (error) {
    console.error("Error watching directory:", error);
    process.exit(1);
  }
}

// Start the server initially
startServer();

// Start watching
watchDirectory().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

// Cleanup on exit
process.on("SIGINT", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  process.exit(0);
});
