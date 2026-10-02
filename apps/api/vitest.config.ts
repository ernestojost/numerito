import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration tests share one database; run files one after another.
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgres://numerito:numerito@localhost:5432/numerito",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-123",
      BETTER_AUTH_URL: "http://localhost:3000",
      WEB_ORIGIN: "http://localhost:3000",
    },
  },
});
