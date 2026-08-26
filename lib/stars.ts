/** stars.bin 로더 — 헤더 + 연속 블록 3개를 BufferAttribute로 무복사 매핑한다. */
import { asset } from "./asset";

export interface StarCatalog {
  count: number;
  magLimit: number;
  /** EQJ 단위벡터 ×3 (반지름 1). 렌더 시 SKY_RADIUS를 곱해 쓴다. */
  positions: Float32Array;
  mag: Float32Array;
  ci: Float32Array;
}

export interface StarMeta {
  hip: number;
  name?: string;
  bayer?: string;
  flam?: string;
  con?: string;
  desig?: string;
  notable?: 1;
}

const HEADER_BYTES = 16;

export async function loadStarCatalog(): Promise<StarCatalog> {
  // ⚠️ fetch 경로도 반드시 asset()을 통과해야 GitHub Pages basePath에서 동작한다.
  const res = await fetch(asset("/data/stars.bin"));
  if (!res.ok) throw new Error(`stars.bin ${res.status}`);
  const ab = await res.arrayBuffer();
  const dv = new DataView(ab);

  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== "SKY1") throw new Error(`stars.bin 매직 불일치: ${magic}`);

  const count = dv.getUint32(8, true);
  const magLimit = dv.getFloat32(12, true);

  let o = HEADER_BYTES;
  const positions = new Float32Array(ab, o, count * 3);
  o += count * 12;
  const mag = new Float32Array(ab, o, count);
  o += count * 4;
  const ci = new Float32Array(ab, o, count);

  return { count, magLimit, positions, mag, ci };
}

export async function loadStarMeta(): Promise<Record<number, StarMeta>> {
  const res = await fetch(asset("/data/stars.meta.json"));
  if (!res.ok) throw new Error(`stars.meta.json ${res.status}`);
  return res.json();
}

export interface MilkyWay {
  count: number;
  /** EQJ 단위벡터 ×3 */
  positions: Float32Array;
  /** 0..1 — 등고선 단계에서 온 상대 밝기 */
  intensity: Float32Array;
}

/**
 * 은하수 점구름. int16/uint8로 양자화돼 있어 로드 시 한 번만 펼친다.
 * 단위벡터에 int16(≈0.002° 해상도)이면 차고 넘친다.
 */
export async function loadMilkyWay(): Promise<MilkyWay> {
  const res = await fetch(asset("/data/milkyway.bin"));
  if (!res.ok) throw new Error(`milkyway.bin ${res.status}`);
  const ab = await res.arrayBuffer();
  const dv = new DataView(ab);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== "MWY2") throw new Error(`milkyway.bin 매직 불일치: ${magic}`);

  const count = dv.getUint32(8, true);
  const q = new Int16Array(ab, 16, count * 3);
  const qi = new Uint8Array(ab, 16 + count * 6, count);

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) positions[i] = q[i] / 32767;
  const intensity = new Float32Array(count);
  for (let i = 0; i < count; i++) intensity[i] = qi[i] / 255;

  return { count, positions, intensity };
}

export async function loadBoundaries(): Promise<Float32Array> {
  const res = await fetch(asset("/data/boundaries.bin"));
  if (!res.ok) throw new Error(`boundaries.bin ${res.status}`);
  return new Float32Array(await res.arrayBuffer());
}

/**
 * 별의 표시 이름.
 *
 * 고유명 > 바이어/플램스티드 부호 + 별자리 소유격 > 카탈로그 부호 > HIP 번호.
 * 소유격을 붙이지 않으면 플램스티드 별이 그냥 "50"으로 나와 아무 의미가 없다.
 * 패널과 레티클이 같은 이름을 보여야 하므로 규칙을 여기 한 곳에만 둔다.
 */
export function starDisplayName(
  meta: StarMeta | undefined,
  genitive: string | null,
): string | null {
  if (!meta) return null;
  if (meta.name) return meta.name;
  const sym = meta.bayer ?? meta.flam;
  if (sym) return genitive ? `${sym} ${genitive}` : sym;
  if (meta.desig) return meta.desig;
  return meta.hip ? `HIP ${meta.hip}` : null;
}
