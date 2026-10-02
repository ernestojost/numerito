const formatter = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 });

/** 600000 → "$ 6.000". Amounts are stored in cents. */
export function formatMoney(cents: number) {
  return `$ ${formatter.format(Math.round(cents / 100))}`;
}

/** "6.000" or "6000" → 600000. Returns null when the text isn't a whole amount. */
export function parseMoney(text: string): number | null {
  const digits = text.replace(/[\s.$]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  return Number(digits) * 100;
}
