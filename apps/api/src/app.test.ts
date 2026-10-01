import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.js";

describe("GET /health", () => {
  it("returns 200 when the database is reachable", async () => {
    const app = createApp({ checkDb: async () => true });
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "ok", db: "ok" });
  });

  it("returns 503 when the database is down", async () => {
    const app = createApp({ checkDb: async () => { throw new Error("boom"); } });
    const res = await request(app).get("/health");
    expect(res.status).toBe(503);
    expect(res.body.db).toBe("down");
  });
});

describe("unknown routes", () => {
  it("returns a JSON 404", async () => {
    const res = await request(createApp({ checkDb: async () => true })).get("/nope");
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});
