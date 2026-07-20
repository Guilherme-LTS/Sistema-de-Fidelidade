import { defineConfig } from "vitest/config";
import dotenv from "dotenv";
import path from "path";

// 1. Load local developer .env first (if present)
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
// 2. Load .env.test for fallback defaults (does not overwrite keys present in .env)
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      NODE_ENV: "test",
    },
    // Runs once before all test suites — drops Supabase-internal auth.users FK
    // so the local dev database matches the clean CI Postgres container exactly.
    globalSetup: ["./tests/helpers/global-setup.ts"],
  },
});

