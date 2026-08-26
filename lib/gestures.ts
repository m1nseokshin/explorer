/**
 * 손 랜드마크 → 제스처. 순수 함수만 둔다 (브라우저 없이 테스트 가능하게).
 *
 * MediaPipe HandLandmarker의 21개 랜드마크 인덱스:
 *   0 손목 | 1-4 엄지 | 5-8 검지 | 9-12 중지 | 13-16 약지 | 17-20 새끼
 *   각 손가락은 [MCP, PIP, DIP, TIP] 순서.
 * 좌표는 0..1 정규화 (x: 왼→오, y: 위→아래).
 */

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type GestureKind = "none" | "open" | "fist" | "pinch";

export interface HandState {
  kind: GestureKind;
  /** 손바닥 중심 (0..1 정규화, 화면 좌표계로 이미 미러링된 값) */
  cx: number;
  cy: number;
  /** 손 크기 (손목→중지 MCP 거리). 카메라와의 거리 보정에 쓴다. */
  scale: number;
  /** 0..1. 손가락이 얼마나 펴졌는지 — 줌 속도에 쓴다. */
  openness: number;
  /** 엄지-검지 거리를 손 크기로 정규화한 값. 핀치 판정용. */
  pinchDist: number;
}

const TIPS = [4, 8, 12, 16, 20];
const MCPS = [1, 5, 9, 13, 17];

const dist = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * 손 크기 기준 척도. 손목(0)→중지 MCP(9) 거리를 쓴다.
 * 손가락이 아니라 손바닥 뼈대라서 제스처와 무관하게 일정하다 — 이게 핵심이다.
 * 손가락 길이를 쓰면 주먹을 쥘 때 척도가 같이 줄어 판정이 무너진다.
 */
export function handScale(lm: Landmark[]): number {
  return Math.max(dist(lm[0], lm[9]), 1e-4);
}

/**
 * 펴짐 정도 0..1.
 *
 * 각 손가락 TIP이 '자기 MCP 관절'보다 손목에서 얼마나 더 멀리 나가 있는지를 본다.
 * 완전히 펴면 TIP은 MCP의 두 배 거리까지 나가고, 완전히 접으면 오히려 MCP보다
 * 손목에 가까워진다 — 전 구간에서 단조롭게 변하는 게 이 지표의 핵심이다.
 * (TIP과 PIP을 비교하면 손가락이 조금만 말려도 부호가 뒤집혀 0으로 포화된다.)
 *
 * 엄지는 굽히는 축이 달라 제외한다. 주먹을 쥐어도 옆으로 튀어나와 오판을 부른다.
 */
export function openness(lm: Landmark[]): number {
  let sum = 0;
  for (let i = 1; i < TIPS.length; i++) {
    const mcp = Math.max(dist(lm[0], lm[MCPS[i]]), 1e-4);
    const tip = dist(lm[0], lm[TIPS[i]]);
    // 완전히 펴짐 ≈ +1.1, 완전히 접힘 ≈ -0.35
    sum += clamp01((tip / mcp - 1 + 0.35) / 1.35);
  }
  return sum / (TIPS.length - 1);
}

/** 엄지 TIP ↔ 검지 TIP 거리 (손 크기로 정규화) */
export function pinchDistance(lm: Landmark[]): number {
  return dist(lm[4], lm[8]) / handScale(lm);
}

// openness 곡선(scripts/verify-gestures.mjs의 CURVE=1로 확인 가능)에 맞춘 값.
// 0.20~0.65 사이는 어느 쪽도 아닌 '데드밴드'다. 이 구간이 없으면 손이 어중간할 때
// 줌인과 줌아웃이 번갈아 튄다.
export const OPEN_THRESHOLD = 0.65;
export const FIST_THRESHOLD = 0.2;
export const PINCH_ON = 0.42; // 히스테리시스: 붙일 때
export const PINCH_OFF = 0.62; // 뗄 때 — 같은 값을 쓰면 경계에서 덜덜 떨린다

/**
 * 랜드마크 → HandState.
 *
 * @param mirrored 전면 카메라 영상은 좌우가 뒤집혀 있다. 손을 오른쪽으로 움직였을 때
 *   하늘도 오른쪽으로 가야 자연스러우므로 x를 반전한다.
 * @param wasPinching 직전 프레임의 핀치 여부. 히스테리시스에 필요하다.
 */
export function readHand(
  lm: Landmark[],
  wasPinching: boolean,
  mirrored = true,
): HandState {
  const open = openness(lm);
  const pinchDist = pinchDistance(lm);
  const pinching = wasPinching ? pinchDist < PINCH_OFF : pinchDist < PINCH_ON;

  // 손바닥 중심: 손목 + 4개 MCP의 평균. TIP을 넣으면 손가락을 움직일 때마다
  // 중심이 흔들려서 팬이 떨린다.
  const palm = [0, 5, 9, 13, 17];
  let cx = 0;
  let cy = 0;
  for (const i of palm) {
    cx += lm[i].x;
    cy += lm[i].y;
  }
  cx /= palm.length;
  cy /= palm.length;
  if (mirrored) cx = 1 - cx;

  let kind: GestureKind = "none";
  // 핀치가 최우선. 핀치 중에는 검지·엄지가 접혀 openness가 애매해지므로
  // 순서를 뒤집으면 '펼침'으로 잘못 읽힌다.
  if (pinching) kind = "pinch";
  else if (open >= OPEN_THRESHOLD) kind = "open";
  else if (open <= FIST_THRESHOLD) kind = "fist";

  return { kind, cx, cy, scale: handScale(lm), openness: open, pinchDist };
}

/**
 * 깊이 조이스틱의 불감대(로그 비율). 손을 가만히 둬도 인식된 크기는 ±5% 떤다.
 * 이걸 안 두면 손을 멈춰도 배율이 계속 스멀스멀 움직인다.
 */
export const DEPTH_DEADZONE = 0.06;
/** 불감대를 넘어선 로그 비율에 곱하는 이득(배율/초). */
export const DEPTH_GAIN = 6;
/**
 * 초당 배율 변화 상한.
 * 인식이 한 프레임 튀면 비율이 순간적으로 2배가 되기도 한다. 상한이 없으면
 * 그 한 프레임에 화면이 순간이동한다.
 */
export const DEPTH_MAX_RATE = 2.2;

/**
 * 손 크기 비율 → 초당 배율 변화율.
 *
 * 손이 카메라에 가까워지면 인식된 크기가 커진다(비율 > 1) → 확대.
 * '확대와 축소를 어떻게 구분하나'에 대한 답이 자세가 아니라 **방향**이 되도록
 * 하는 게 요점이다. 두 개의 다른 손 모양을 외우는 것보다, 밀면 다가가고
 * 당기면 물러난다는 쪽이 배울 게 없다.
 *
 * 절대 매핑(손 크기 → 배율)이 아니라 속도 매핑인 이유: 절대로 하면 팔 길이가
 * 곧 배율 범위의 상한이 된다. 기준점 대비 '얼마나 밀고 있나'를 속도로 읽으면
 * 밀고 있는 동안 계속 들어간다.
 */
export function zoomRateFromDepth(ratio: number): number {
  if (!(ratio > 0)) return 0;
  const d = Math.log(ratio);
  const mag = Math.abs(d) - DEPTH_DEADZONE;
  if (mag <= 0) return 0;
  return Math.sign(d) * Math.min(mag * DEPTH_GAIN, DEPTH_MAX_RATE);
}

/** MediaPipe 손 연결선 (스켈레톤 그리기용) */
export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
