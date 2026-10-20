export function formatSats(sats: number): string {
  return `₿ ${sats.toLocaleString('en-US')} sats`;
}

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
