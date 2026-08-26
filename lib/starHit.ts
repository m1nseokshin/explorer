/**
 * 별을 '고른 것'으로 볼 범위.
 *
 * 의존성이 없는 순수 모듈로 둔다 — 브라우저 없이 검증 스크립트에서 그대로
 * 불러 쓸 수 있어야 하기 때문이다 (lib/stars.ts는 경로 별칭을 쓴다).
 */
// ─── 별 판정 크기 ──────────────────────────────────────────────────────
//
// ⚠️ 아래 두 상수와 starScreenRadiusPx()는 starShader.ts의 gl_PointSize 계산과
//    반드시 같은 식이어야 한다. 어긋나면 "보이는 별보다 판정이 크거나 작은"
//    상태가 되는데, 화면에는 아무 표시도 안 나서 눈으로는 절대 못 잡는다.

export const STAR_SIZE_MIN = 1.2;
export const STAR_SIZE_MAX = 4.6;

/** 화면에 그려지는 별의 반지름(px). 광휘까지 포함한 스프라이트 반지름이다. */
export function starScreenRadiusPx(mag: number, magLimit: number, zoom: number): number {
  const b = Math.min(1, Math.max(0, (magLimit - mag) / (magLimit + 1.46)));
  const disc = STAR_SIZE_MIN + (STAR_SIZE_MAX - STAR_SIZE_MIN) * Math.pow(b, 1.6);
  const halo = 1 + 2.6 * Math.pow(b, 2.2);
  return (disc * halo * Math.pow(Math.max(zoom, 1e-3), 0.25)) / 2;
}

/**
 * 별을 '고른 것'으로 볼 허용 오차 배수.
 *
 * 보이는 반지름의 3배 안에 들어와야 그 별을 고른 것으로 친다. 등급 8까지
 * 4만 개를 깔고 나면 화각의 4%(2°)를 뒤지는 예전 방식으로는 어디를 눌러도
 * 평균 13.6개가 걸려서 별자리를 여는 길이 사실상 막힌다.
 */
export const STAR_HIT_TOLERANCE = 3;
/**
 * 최소 반지름 바닥값(px).
 *
 * ⚠️ 0이 맞다. 바닥값을 2px만 줘도 허용 오차가 6px이 되는데, 화각 100°인
 *    모바일에서 6px은 0.74°라 그 안에 평균 1.7개가 들어온다 — 어디를 눌러도
 *    별이 이겨서 별자리가 안 열린다. 허용 오차는 '보이는 크기의 3배' 그
 *    자체여야 한다. 0.6px짜리 점은 1.8px 안에 찍어야 고른 것이다.
 */
export const STAR_HIT_MIN_PX = 0;

/** 이 별을 고르려면 몇 도 안에 들어와야 하는가. */
export function starHitToleranceDeg(
  mag: number,
  magLimit: number,
  zoom: number,
  fovDeg: number,
  viewportH: number,
): number {
  const px = Math.max(starScreenRadiusPx(mag, magLimit, zoom), STAR_HIT_MIN_PX);
  return (px * STAR_HIT_TOLERANCE * fovDeg) / Math.max(viewportH, 1);
}
