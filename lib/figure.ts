/**
 * 별자리 그림을 평면으로 떼어낸다.
 *
 * 설명 페이지에서 별자리 하나만 따로 보여주려면 하늘에서 잘라내야 하는데,
 * 천구는 곡면이라 그냥 적경·적위를 x·y로 쓰면 극 근처 별자리가 옆으로 늘어진다.
 * 그래서 별자리 중심에 접평면을 세우고 거기에 투영한다(그노몬 투영). 별자리
 * 하나는 대개 20° 안쪽이라 이 범위에서는 왜곡이 눈에 띄지 않는다.
 */

export interface FigurePoint {
  /** 0..100 정규화 좌표 (SVG viewBox와 같은 단위) */
  x: number;
  y: number;
  mag: number;
}

export interface Figure {
  points: FigurePoint[];
  /** points 배열의 인덱스 쌍 */
  lines: [number, number][];
}

/** SVG 안쪽 여백(정규화 단위). 별의 반지름과 광휘가 잘리지 않을 만큼. */
const PAD = 9;

export function buildFigure(
  segments: number[],
  positions: Float32Array,
  mags: Float32Array,
): Figure | null {
  const unique = [...new Set(segments)];
  if (unique.length < 2) return null;

  const at = (i: number): [number, number, number] => [
    positions[i * 3],
    positions[i * 3 + 1],
    positions[i * 3 + 2],
  ];

  // 중심 방향 = 구성별들의 평균. 정규화해야 접평면의 법선이 된다.
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (const i of unique) {
    const [x, y, z] = at(i);
    cx += x;
    cy += y;
    cz += z;
  }
  let len = Math.hypot(cx, cy, cz);
  if (!(len > 1e-9)) return null;
  cx /= len;
  cy /= len;
  cz /= len;

  // 접평면 기저. up은 천구 북극(+z)이며, 별자리가 극에 아주 가까우면
  // 외적이 0에 가까워지므로 그때만 다른 축으로 갈아탄다.
  let ux = 0;
  let uy = 0;
  let uz = 1;
  if (Math.abs(cz) > 0.999) {
    ux = 1;
    uz = 0;
  }
  // east = up × center
  let ex = uy * cz - uz * cy;
  let ey = uz * cx - ux * cz;
  let ez = ux * cy - uy * cx;
  len = Math.hypot(ex, ey, ez);
  if (!(len > 1e-9)) return null;
  ex /= len;
  ey /= len;
  ez /= len;
  // north = center × east
  const nx = cy * ez - cz * ey;
  const ny = cz * ex - cx * ez;
  const nz = cx * ey - cy * ex;

  const idxOf = new Map<number, number>();
  const raw: { x: number; y: number; mag: number }[] = [];
  for (const i of unique) {
    const [x, y, z] = at(i);
    const d = x * cx + y * cy + z * cz;
    if (d <= 0.05) return null; // 반구를 넘기면 접평면 투영이 발산한다
    // ⚠️ 동쪽을 왼쪽에 둔다. 하늘은 구 '안쪽'에서 보는 것이라, 북쪽을 위로
    //    두면 적경이 커지는 방향이 왼쪽이다. 부호를 빼먹으면 별자리가
    //    좌우로 뒤집힌 채 그럴듯해 보인다.
    idxOf.set(i, raw.length);
    raw.push({
      x: -(x * ex + y * ey + z * ez) / d,
      y: (x * nx + y * ny + z * nz) / d,
      mag: mags[i],
    });
  }

  // 종횡비를 지킨 채 정규화한다. 축마다 따로 늘이면 별자리 모양이 바뀐다.
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of raw) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const span = Math.max(maxX - minX, maxY - minY, 1e-6);
  const scale = (100 - PAD * 2) / span;
  const offX = PAD + ((span - (maxX - minX)) * scale) / 2;
  const offY = PAD + ((span - (maxY - minY)) * scale) / 2;

  const points: FigurePoint[] = raw.map((p) => ({
    x: offX + (p.x - minX) * scale,
    // SVG는 y가 아래로 커진다. 북쪽이 위로 가려면 뒤집어야 한다.
    y: 100 - (offY + (p.y - minY) * scale),
    mag: p.mag,
  }));

  const lines: [number, number][] = [];
  for (let k = 0; k + 1 < segments.length; k += 2) {
    const a = idxOf.get(segments[k]);
    const b = idxOf.get(segments[k + 1]);
    if (a != null && b != null && a !== b) lines.push([a, b]);
  }

  return { points, lines };
}
