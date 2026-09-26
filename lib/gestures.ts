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

/**
 * none  — 어느 쪽도 아닌 중간 자세. 아무것도 하지 않는다
 * open  — 네 손가락을 다 폈다. 손을 움직이면 하늘을 끈다
 * pinch — 중지·약지·새끼를 접고 엄지·검지만 쓴다. 벌리면 확대, 좁히면 축소
 * fist  — 다 접었다. 이것만으로는 아무 일도 없고, '쥐었다 펴기'의 앞 절반이다
 */
export type GestureKind = "none" | "open" | "pinch" | "fist";

export interface HandState {
  kind: GestureKind;
  /** 손바닥 중심 (0..1 정규화, 화면 좌표계로 이미 미러링된 값) */
  cx: number;
  cy: number;
  /** 손 크기 (손목→중지 MCP 거리). 카메라와의 거리 보정에 쓴다. */
  scale: number;
  /** 0..1. 네 손가락(엄지 제외)이 평균적으로 얼마나 펴졌는지. */
  openness: number;
  /**
   * 엄지-검지 벌림. 손 크기로 나눈 비율이라 **카메라와의 거리에 영향을 안 받는다** —
   * 확대·축소를 손의 겉보기 크기로 재던 방식의 약점(기울이면 짧아지고, 변화 폭이
   * 좁다)을 이 값이 대신한다. 0(완전히 붙임) ~ 1.4(활짝).
   */
  aperture: number;
  /** 검지가 얼마나 펴졌는지. */
  indexOpen: number;
  /**
   * 중지·약지·새끼의 평균 펴짐. 펼침과 핀치를 가르는 값이다 — 엄지·검지는
   * 핀치 중에 움직이는 손가락이라 판정에 쓰면 벌릴 때마다 모드가 바뀐다.
   */
  othersOpen: number;
  /** 검지 끝 (0..1, cx/cy와 같은 화면 좌표계). */
  ix: number;
  iy: number;
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
// 펼침과 주먹이 번갈아 튄다.
export const OPEN_THRESHOLD = 0.65;
/** 검지가 이만큼 펴져 있어야 '펼침'이다. */
export const POINT_THRESHOLD = 0.55;
export const FIST_THRESHOLD = 0.2;
/**
 * 중지·약지·새끼가 이 아래로 접혀 있어야 핀치 자세다.
 * 펼침 문턱(0.65)과 붙이지 않는다 — 손을 펴는 도중이 핀치로 읽히면 안 된다.
 */
export const PINCH_OTHERS_MAX = 0.45;
/**
 * 핀치 중 검지의 최소 펴짐. 끝을 맞붙이면 검지가 굽어 0.5 안팎까지 내려온다.
 * ⚠️ 주먹 문턱(0.2)에 붙이면 안 된다 — 손을 반쯤 접으면 다섯 손가락이 함께
 *    0.26쯤에 머무는데, 그게 핀치로 읽혀 주먹을 풀 때마다 배율이 흔들린다.
 *    핀치는 '검지만 살아 있는' 자세라 검지가 나머지보다 확실히 펴져 있다.
 */
export const PINCH_INDEX_MIN = 0.4;
/**
 * 핀치로 판정된 뒤 이만큼 유지돼야 배율을 움직인다(초).
 * 주먹을 풀 때 검지가 먼저 펴지면 몇 프레임 동안 핀치 자세와 똑같아진다.
 */
export const PINCH_ENGAGE_S = 0.15;

/** 예전 절대 매핑이 쓰던 벌림 범위. 속도의 기준값으로만 남겨 둔다. */
export const APERTURE_MIN = 0.3;
export const APERTURE_MAX = 1.25;
/** 배율 범위 — HandControls·VirtualControls와 같다. */
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;
/**
 * 핀치 감도. 1이면 예전 절대 매핑과 같은 속도(벌림 0.3→1.25에 ×1→×8)다.
 * 그 속도가 조금 빨라서 미세 조정이 어려웠다 — 0.8배로 늦춘다.
 */
export const PINCH_SENSITIVITY = 0.8;
/** 벌림 1(손 크기 단위)당 ln(배율) 변화량. */
export const PINCH_ZOOM_RATE =
  (Math.log(MAX_ZOOM / MIN_ZOOM) / (APERTURE_MAX - APERTURE_MIN)) * PINCH_SENSITIVITY;

/**
 * 엄지-검지 벌림의 '변화량' → 다음 배율 (상대 매핑).
 *
 * ⚠️ 절대 매핑(벌린 간격 = 배율)으로 되돌리지 말 것. 핀치 자세로 들어오는 순간의
 *    벌림이 제각각이라 들어오자마자 배율이 튄다. 특히 손을 편 채로 벌림을 읽으면
 *    곧장 최대 배율이 된다. 변화량만 보면 어디서 시작하든 그 자리에서 이어진다 —
 *    터치스크린의 핀치와 같은 규칙이다.
 *
 * 배율은 곱셈 축이라 지수로 올린다. 이래야 ×1에서도 ×6에서도 같은 손짓이
 * 같은 '느낌'만큼 확대된다.
 */
export function zoomStep(zoom: number, dAperture: number): number {
  const next = zoom * Math.exp(PINCH_ZOOM_RATE * dAperture);
  return next < MIN_ZOOM ? MIN_ZOOM : next > MAX_ZOOM ? MAX_ZOOM : next;
}

/** 손가락 하나의 펴짐. TIP과 그 손가락 자신의 MCP를 견준다. */
export function fingerOpenness(lm: Landmark[], finger: number): number {
  const s = handScale(lm);
  if (s <= 0) return 0;
  const tip = dist(lm[0], lm[TIPS[finger]]) / s;
  const mcp = dist(lm[0], lm[MCPS[finger]]) / s;
  if (mcp <= 0) return 0;
  return clamp01((tip / mcp - 1 + 0.35) / 1.35);
}

/**
 * 랜드마크 → HandState.
 *
 * @param mirrored 전면 카메라 영상은 좌우가 뒤집혀 있다. 손을 오른쪽으로 움직였을 때
 *   하늘도 오른쪽으로 가야 자연스러우므로 x를 반전한다.
 */
export function readHand(
  lm: Landmark[],
  mirrored = true,
): HandState {
  const open = openness(lm);
  const pinchDist = pinchDistance(lm);

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

  // ⚠️ 중지·약지·새끼로 가른다. 핀치는 엄지·검지를 움직이는 동작이라, 그 둘로
  //    판정하면 벌릴 때마다 판정이 흔들린다. 나머지 셋은 핀치 내내 가만히 있다.
  //    - 셋 다 폈다 → 펼침 (검지도 펴져 있어야 한다)
  //    - 셋 다 접었다 + 검지도 접었다 → 주먹
  //    - 셋 다 접었다 + 검지는 살아 있다 → 핀치
  const indexOpen = fingerOpenness(lm, 1);
  const othersOpen =
    (fingerOpenness(lm, 2) + fingerOpenness(lm, 3) + fingerOpenness(lm, 4)) / 3;
  let kind: GestureKind = "none";
  if (othersOpen >= OPEN_THRESHOLD && indexOpen >= POINT_THRESHOLD) kind = "open";
  else if (othersOpen <= FIST_THRESHOLD && indexOpen <= FIST_THRESHOLD) kind = "fist";
  else if (othersOpen <= PINCH_OTHERS_MAX && indexOpen >= PINCH_INDEX_MIN) kind = "pinch";

  const tip = lm[8];
  return {
    kind,
    cx,
    cy,
    ix: mirrored ? 1 - tip.x : tip.x,
    iy: tip.y,
    scale: handScale(lm),
    openness: open,
    indexOpen,
    othersOpen,
    aperture: pinchDist,
  };
}

// ─── 주먹 쥐었다 펴기 ────────────────────────────────────────────────

/** 주먹을 이만큼은 쥐고 있어야 한다(초). 펴는 도중 스치는 한두 프레임을 거른다. */
export const GRASP_HOLD_S = 0.12;
/** 주먹을 푼 뒤 이 안에 손을 다 펴야 한다(초). 넘기면 없던 일이 된다. */
export const GRASP_WINDOW_S = 0.9;
/** 한 번 발화한 뒤 다시 발화하지 않는 시간(초). 판정이 떨려 두 번 열고 닫는 걸 막는다. */
export const GRASP_COOLDOWN_S = 0.5;

export interface GraspState {
  /** 이번 주먹이 시작된 시각. 주먹이 아니면 null. */
  fistSince: number | null;
  /** 이 시각까지 손을 펴면 발화한다. 0이면 무장되지 않은 상태. */
  armedUntil: number;
  cooldownUntil: number;
}

export function createGrasp(): GraspState {
  return { fistSince: null, armedUntil: 0, cooldownUntil: 0 };
}

/** 주먹을 충분히 쥐었다 — 지금 펴면 발화한다. 화면 피드백용. */
export function graspArmed(s: GraspState, t: number): boolean {
  return s.armedUntil > 0 && t <= s.armedUntil;
}

/**
 * '주먹 쥐었다 펴기' 판정. 발화한 프레임에만 true.
 *
 * ⚠️ 한 프레임의 손 모양이 아니라 **순서**로 판정한다. 주먹만으로 발화하면
 *    손을 접었다 펴는 평범한 동작마다 창이 열리고 닫힌다. 쥐었다 → 폈다가 한
 *    묶음일 때만 '의도'다.
 * ⚠️ 주먹과 펼침 사이에 끼는 중간 프레임(none·pinch)이나 인식이 한두 프레임
 *    끊기는 것은 무장을 풀지 않는다. 손을 빠르게 펴면 그 사이가 늘 흐리다.
 *
 * @param kind 이번 프레임의 판정. 손이 안 보이면 null.
 * @param t    초 단위 시각.
 */
export function stepGrasp(s: GraspState, kind: GestureKind | null, t: number): boolean {
  if (kind === "fist") {
    if (s.fistSince === null) s.fistSince = t;
    if (t - s.fistSince >= GRASP_HOLD_S) s.armedUntil = t + GRASP_WINDOW_S;
    return false;
  }
  s.fistSince = null;
  if (s.armedUntil > 0 && t > s.armedUntil) s.armedUntil = 0;
  if (kind === "open" && graspArmed(s, t) && t >= s.cooldownUntil) {
    s.armedUntil = 0;
    s.cooldownUntil = t + GRASP_COOLDOWN_S;
    return true;
  }
  return false;
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
