/**
 * 2D 캔버스용 천구 투영 — three.js 없이.
 *
 * 소개 페이지의 스크롤 필름이 쓴다. `lib/sky.ts`는 three를 끌고 들어오므로
 * 마케팅 페이지에서 import하면 3D 런타임이 통째로 번들에 실린다. 여기서는
 * 행렬 대신 기저벡터 세 개만 들고 별마다 내적 세 번으로 끝낸다.
 *
 * 투영은 평사도법(stereographic)이다.
 *   - 등각이라 넓은 화각(140°)에서도 별자리 모양이 찌그러지지 않는다.
 *     원근(gnomonic) 투영은 90°만 넘어도 가장자리가 무한히 늘어난다.
 *   - 구 위의 원은 화면에서도 원이다. 천구 북극을 가운데 두면 일주운동의
 *     궤적이 정확히 화면 중심을 도는 동심원이 된다 — 별 궤적을 호(arc) 하나로
 *     그릴 수 있는 이유다.
 *
 * 좌표는 EQJ 단위벡터(x=춘분점, z=천구 북극)이며 `radecToVec3`와 같은 공식이다.
 */

const D2R = Math.PI / 180;

export interface SkyView {
  /** 화면 중심의 적경·적위(도) */
  ra: number;
  dec: number;
  /** 화면 '짧은 변'이 담는 각지름(도) */
  fov: number;
}

/** 화면 기저. f=화면 안쪽(시선), r=화면 오른쪽, u=화면 위쪽. 모두 EQJ 성분. */
export interface ViewBasis {
  fx: number;
  fy: number;
  fz: number;
  rx: number;
  ry: number;
  rz: number;
  ux: number;
  uy: number;
  uz: number;
}

export function radecToUnit(raDeg: number, decDeg: number): [number, number, number] {
  const ra = raDeg * D2R;
  const dec = decDeg * D2R;
  const cd = Math.cos(dec);
  return [cd * Math.cos(ra), cd * Math.sin(ra), Math.sin(dec)];
}

/**
 * 북쪽을 위로 둔 기저.
 *
 * ⚠️ 동쪽이 '왼쪽'이다. 하늘은 구 안쪽에서 올려다보는 것이라 북쪽을 위에 두면
 *    적경이 커지는 방향이 왼쪽이 된다(`lib/figure.ts`와 같은 규약). 오른쪽을
 *    동쪽으로 두면 모든 별자리가 좌우로 뒤집힌 채 그럴듯해 보인다.
 *
 * 천구 북극(dec=90)에서도 퇴화하지 않는다 — 동쪽 벡터를 외적이 아니라 적경으로
 * 직접 만들기 때문이다. 극에서는 `ra`가 화면이 극을 중심으로 얼마나 돌았는지를
 * 뜻하게 되고, `ra`를 늘리면 하늘이 반시계로 돈다(북쪽을 보고 선 관측자가 보는
 * 일주운동 방향과 같다).
 */
export function viewBasis(raDeg: number, decDeg: number, out: ViewBasis): ViewBasis {
  const ra = raDeg * D2R;
  const dec = decDeg * D2R;
  const ca = Math.cos(ra);
  const sa = Math.sin(ra);
  const cd = Math.cos(dec);
  const sd = Math.sin(dec);
  out.fx = cd * ca;
  out.fy = cd * sa;
  out.fz = sd;
  // 동쪽 e = (-sa, ca, 0) → 화면 오른쪽은 -e
  out.rx = sa;
  out.ry = -ca;
  out.rz = 0;
  // 북쪽
  out.ux = -sd * ca;
  out.uy = -sd * sa;
  out.uz = cd;
  return out;
}

/**
 * 화각 → 화면 배율(px). 시선에서 fov/2 떨어진 점이 짧은 변의 절반에 온다.
 * 평사도법에서 각거리 θ의 화면 반지름은 2·tan(θ/2)다.
 */
export function viewScale(fovDeg: number, shortSidePx: number): number {
  return shortSidePx / 2 / (2 * Math.tan((fovDeg * D2R) / 4));
}

/**
 * 시선 뒤쪽 컷오프. 평사도법은 시선 반대편(z→-1)에서 발산한다. 가장 넓은
 * 화각(≈140°)의 화면 모서리가 시선에서 100°쯤이라 cos(110°)면 여유가 있다.
 */
export const BEHIND = -0.34;

export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * 단위벡터 → 화면 좌표(px, y는 아래로). 시선 뒤라서 그릴 수 없으면 false.
 * 매 프레임 수천 번 불리므로 결과를 `out`에 써서 할당을 피한다.
 */
export function project(
  b: ViewBasis,
  scale: number,
  cx: number,
  cy: number,
  x: number,
  y: number,
  z: number,
  out: ScreenPoint,
): boolean {
  const f = x * b.fx + y * b.fy + z * b.fz;
  if (f < BEHIND) return false;
  const k = (2 / (1 + f)) * scale;
  out.x = cx + k * (x * b.rx + y * b.ry + z * b.rz);
  out.y = cy - k * (x * b.ux + y * b.uy + z * b.uz);
  return true;
}

/** 두 단위벡터 사이 각(도) */
export function angleBetween(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
): number {
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return Math.acos(Math.max(-1, Math.min(1, d))) / D2R;
}

export interface ViewKey extends SkyView {
  /** 스크롤 진행도 0..1 */
  p: number;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * 키프레임 사이 보간.
 *
 * 적경은 짧은 쪽으로 돌고, 화각은 로그 공간에서 보간한다 — 선형으로 두면
 * 좁은 화각 쪽에서 확대가 몰아쳐 '툭' 당겨지는 느낌이 난다.
 */
export function viewAt(keys: readonly ViewKey[], p: number, out: SkyView): SkyView {
  if (p <= keys[0].p) {
    out.ra = keys[0].ra;
    out.dec = keys[0].dec;
    out.fov = keys[0].fov;
    return out;
  }
  for (let i = 0; i + 1 < keys.length; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (p > b.p) continue;
    const t = smooth((p - a.p) / Math.max(1e-6, b.p - a.p));
    let dra = b.ra - a.ra;
    dra = ((((dra + 180) % 360) + 360) % 360) - 180;
    out.ra = a.ra + dra * t;
    out.dec = a.dec + (b.dec - a.dec) * t;
    out.fov = Math.exp(Math.log(a.fov) + (Math.log(b.fov) - Math.log(a.fov)) * t);
    return out;
  }
  const last = keys[keys.length - 1];
  out.ra = last.ra;
  out.dec = last.dec;
  out.fov = last.fov;
  return out;
}
