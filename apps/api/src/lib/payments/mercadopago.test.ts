import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeStatus, verifyMercadoPagoSignature } from "./mercadopago.js";

const secret = "webhook-secret";
const now = 1_790_000_000_000;

function sign(dataId: string, requestId: string, ts: number, key = secret) {
  const v1 = createHmac("sha256", key).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

describe("verifyMercadoPagoSignature", () => {
  it("accepts a correctly signed notification", () => {
    expect(
      verifyMercadoPagoSignature({ secret, signature: sign("123456", "req-1", now), requestId: "req-1", dataId: "123456", now }),
    ).toBe(true);
  });

  it("rejects a signature made with another secret or for another payment", () => {
    expect(
      verifyMercadoPagoSignature({ secret, signature: sign("123456", "req-1", now, "other"), requestId: "req-1", dataId: "123456", now }),
    ).toBe(false);
    expect(
      verifyMercadoPagoSignature({ secret, signature: sign("123456", "req-1", now), requestId: "req-1", dataId: "999999", now }),
    ).toBe(false);
  });

  it("rejects replays of an old notification", () => {
    const old = now - 10 * 60_000;
    expect(verifyMercadoPagoSignature({ secret, signature: sign("1", "r", old), requestId: "r", dataId: "1", now })).toBe(false);
  });

  it("signs alphanumeric ids in lowercase", () => {
    expect(verifyMercadoPagoSignature({ secret, signature: sign("abc123", "r", now), requestId: "r", dataId: "ABC123", now })).toBe(
      true,
    );
  });

  it("rejects missing or malformed headers", () => {
    expect(verifyMercadoPagoSignature({ secret, signature: undefined, requestId: "r", dataId: "1", now })).toBe(false);
    expect(verifyMercadoPagoSignature({ secret, signature: "garbage", requestId: "r", dataId: "1", now })).toBe(false);
  });
});

describe("normalizeStatus", () => {
  it("maps Mercado Pago statuses", () => {
    expect(normalizeStatus("approved")).toBe("approved");
    expect(normalizeStatus("in_process")).toBe("pending");
    expect(normalizeStatus("rejected")).toBe("rejected");
    expect(normalizeStatus("cancelled")).toBe("rejected");
    expect(normalizeStatus("refunded")).toBe("refunded");
  });
});
