import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../app.js";
import { sql } from "../../db/client.js";

const app = createApp({ checkDb: async () => true });
const ORIGIN = "http://localhost:3000";

async function signUp() {
  const agent = request.agent(app);
  const email = `test-${randomUUID()}@ejemplo.com`;
  const res = await agent
    .post("/api/auth/sign-up/email")
    .set("Origin", ORIGIN)
    .send({ name: "Julio", email, password: "contraseña-segura" });
  expect(res.status).toBe(200);
  return agent;
}

const uniqueSlug = () => `barberia-${randomUUID().slice(0, 8)}`;

beforeAll(async () => {
  await sql`select 1`;
});

afterAll(async () => {
  await sql.end();
});

describe("businesses", () => {
  it("requires a session", async () => {
    const res = await request(app).get("/api/v1/me/businesses");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHENTICATED");
  });

  it("creates a business owned by the user and lists it", async () => {
    const agent = await signUp();
    const slug = uniqueSlug();

    const created = await agent
      .post("/api/v1/businesses")
      .set("Origin", ORIGIN)
      .send({ name: "Barbería Don Julio", slug });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ slug, role: "owner", timezone: "America/Argentina/Buenos_Aires" });

    const list = await agent.get("/api/v1/me/businesses");
    expect(list.status).toBe(200);
    expect(list.body).toEqual([expect.objectContaining({ id: created.body.id, slug })]);
  });

  it("rejects a slug that is already taken", async () => {
    const slug = uniqueSlug();
    const first = await signUp();
    const second = await signUp();

    await first.post("/api/v1/businesses").set("Origin", ORIGIN).send({ name: "Primera", slug }).expect(201);
    const res = await second.post("/api/v1/businesses").set("Origin", ORIGIN).send({ name: "Segunda", slug });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("SLUG_TAKEN");

    const available = await second.get(`/api/v1/businesses/slug-available?slug=${slug}`);
    expect(available.body).toEqual({ slug, available: false });
  });

  it("validates the payload", async () => {
    const agent = await signUp();
    const res = await agent.post("/api/v1/businesses").set("Origin", ORIGIN).send({ name: "X", slug: "Con Espacios" });
    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty("slug");
  });
});
