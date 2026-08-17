// Trunca, nunca arredonda — evita exibir um saldo maior do que o real
// (ex.: 34.7092266 nunca deve virar "34.71", só "34.70").
export function truncateDecimalString(raw: string, decimals = 2): string {
  const [integerPart, decimalPart = ""] = raw.split(".");
  if (decimals <= 0) return integerPart;
  const paddedDecimals = decimalPart.padEnd(decimals, "0").slice(0, decimals);
  return `${integerPart}.${paddedDecimals}`;
}
