import { randomUUID } from "node:crypto";
import request from "supertest";
import type { Express } from "express";

export const ORIGIN = "http://localhost:3000";

export type Agent = ReturnType<typeof request.agent>;

/** Signs up a fresh user and returns an agent carrying its session cookie. */
export async function signUp(app: Express, name = "Julio") {
  const agent = request.agent(app);
  const email = `test-${randomUUID()}@ejemplo.com`;
  const res = await agent.post("/api/auth/sign-up/email").set("Origin", ORIGIN).send({ name, email, password: "contraseña-segura" });
  if (res.status !== 200) throw new Error(`sign up failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, userId: res.body.user.id as string };
}

export const uniqueSlug = () => `barberia-${randomUUID().slice(0, 8)}`;

export async function createBusiness(agent: Agent, name = "Barbería Don Julio") {
  const slug = uniqueSlug();
  const res = await agent.post("/api/v1/businesses").set("Origin", ORIGIN).send({ name, slug });
  if (res.status !== 201) throw new Error(`create business failed: ${res.status}`);
  return { id: res.body.id as string, slug };
}
