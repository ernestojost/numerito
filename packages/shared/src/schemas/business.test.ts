import { describe, expect, it } from "vitest";
import { CreateBusinessSchema, slugify } from "./business.js";

describe("slugify", () => {
  it("strips accents and punctuation", () => {
    expect(slugify("Barbería Don Julio")).toBe("barberia-don-julio");
    expect(slugify("  Peluquería ¡La Ñata!  ")).toBe("peluqueria-la-nata");
  });
});

describe("CreateBusinessSchema", () => {
  it("applies defaults", () => {
    const parsed = CreateBusinessSchema.parse({ name: "Don Julio", slug: "don-julio" });
    expect(parsed).toMatchObject({ timezone: "America/Argentina/Buenos_Aires", category: "barberia" });
  });

  it("rejects bad slugs and time zones", () => {
    expect(CreateBusinessSchema.safeParse({ name: "Don Julio", slug: "Don Julio" }).success).toBe(false);
    expect(CreateBusinessSchema.safeParse({ name: "Don Julio", slug: "don-julio", timezone: "Mars/Base" }).success).toBe(false);
  });
});
