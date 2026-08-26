/** land.bin 로더 — 위치 선택 지도의 대륙 윤곽. */
import { asset } from "./asset";

/** 각 링은 [lon, lat, lon, lat, …] 평탄 배열 */
export type LandRings = Float32Array[];

export async function loadLand(): Promise<LandRings> {
  const res = await fetch(asset("/data/land.bin"));
  if (!res.ok) throw new Error(`land.bin ${res.status}`);
  const ab = await res.arrayBuffer();
  const dv = new DataView(ab);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== "LND1") throw new Error(`land.bin 매직 불일치: ${magic}`);

  const ringCount = dv.getUint32(8, true);
  const f32 = new Float32Array(ab, 12);
  const rings: LandRings = [];
  let o = 0;
  for (let r = 0; r < ringCount; r++) {
    const len = f32[o++];
    rings.push(f32.subarray(o, o + len * 2));
    o += len * 2;
  }
  return rings;
}
