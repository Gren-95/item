/**
 * Test setup file
 * This ensures zod is available before tests run
 */

// Verify zod is available
try {
  await import("zod");
  console.log("✓ zod package is available");
} catch (error) {
  console.error("✗ zod package not found. Run: bun install");
  throw error;
}
