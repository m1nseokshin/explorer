/** HUD 숫자 표기 — 모두 tabular-nums(.type-mono-hud)와 함께 쓸 것 */

/** 도 → "12° 34′" */
export function formatDeg(deg: number, withMinutes = true): string {
  const sign = deg < 0 ? "-" : "";
  const a = Math.abs(deg);
  const d = Math.floor(a);
  if (!withMinutes) return `${sign}${d}°`;
  const m = Math.round((a - d) * 60);
  return m === 60 ? `${sign}${d + 1}° 00′` : `${sign}${d}° ${String(m).padStart(2, "0")}′`;
}

/** RA(도) → "05h 14m 32s" */
export function formatRa(raDeg: number): string {
  const hours = (((raDeg % 360) + 360) % 360) / 15;
  const h = Math.floor(hours);
  const mF = (hours - h) * 60;
  const m = Math.floor(mF);
  const s = Math.round((mF - m) * 60);
  return `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

/** Dec(도) → "+38° 47′ 01″" */
export function formatDec(decDeg: number): string {
  const sign = decDeg < 0 ? "-" : "+";
  const a = Math.abs(decDeg);
  const d = Math.floor(a);
  const mF = (a - d) * 60;
  const m = Math.floor(mF);
  const s = Math.round((mF - m) * 60);
  return `${sign}${String(d).padStart(2, "0")}° ${String(m).padStart(2, "0")}′ ${String(s).padStart(2, "0")}″`;
}

/** 겉보기 등급 → "1.25" (부호 유지) */
export function formatMag(mag: number): string {
  return mag.toFixed(2);
}
