/** The deposit the client pays for a service: its own, else the business rule. */
export function effectiveDeposit(
  priceCents: number,
  serviceDeposit: number | null,
  type: "none" | "fixed" | "percent",
  value: number,
) {
  if (serviceDeposit !== null) return Math.min(serviceDeposit, priceCents);
  if (type === "none") return 0;
  if (type === "percent") return Math.round((priceCents * value) / 100);
  return Math.min(value, priceCents);
}
