/**
 * 탭 → 별 선택.
 *
 * Raycaster의 Points.threshold를 쓰지 않는 이유: threshold는 '월드 공간' 반지름인데
 * 사용자가 체감하는 표적 크기는 등급이 결정하는 '화면 공간' 점 크기다. 1등성과
 * 5.8등성 사이를 탭하면 기하학적으로 가까운 쪽이 잡혀서 고장난 것처럼 느껴진다.
 *
 * 대신 탭할 때만(매 프레임 아님) EQJ 프레임에서 화면공간 최근접 탐색을 한다.
 * 별 8,874개 내적 ≈ 0.05ms — k-d 트리는 명백한 조기 최적화다.
 */
import * as THREE from "three";
import { starHitToleranceDeg } from "./starHit";
import type { StarCatalog } from "./stars";

const _dir = new THREE.Vector3();
const _inv = new THREE.Matrix3();

export interface PickResult {
  index: number;
  /** 중심에서의 각거리(도) */
  sepDeg: number;
  /** 그 별의 허용 오차 대비 얼마나 빗나갔나. 0이면 정중앙, 1이면 경계. */
  ratio: number;
}

export interface PickOptions {
  /** 현재 수직 화각(도) */
  fovDeg: number;
  /** 뷰포트 높이(px). 각거리를 화면 거리로 바꾸는 데 쓴다. */
  viewportH: number;
  /** 현재 배율. 별 스프라이트 크기가 여기 따라 커진다. */
  zoom: number;
}

/**
 * 탭 → 별 선택.
 *
 * Raycaster의 Points.threshold를 쓰지 않는 이유: threshold는 '월드 공간' 반지름인데
 * 사용자가 체감하는 표적 크기는 등급이 결정하는 '화면 공간' 점 크기다.
 *
 * ⚠️ 판정 범위를 화각의 고정 비율로 잡으면 안 된다. 등급 8까지 4만 개를 깔면
 *    화각의 4%(2°) 원 안에 평균 13.6개가 들어와, 어디를 눌러도 늘 별이 이기고
 *    별자리를 여는 길이 사실상 막힌다.
 *    그래서 별마다 '보이는 반지름의 3배'를 허용 오차로 주고, 가장 가까운 별이
 *    아니라 **자기 허용 오차 대비 가장 정확히 맞은 별**을 고른다. 밝은 별은
 *    크게 보이니 넉넉하고, 어두운 별은 정확히 겨눠야 잡힌다.
 */
export function pickStar(
  ndcX: number,
  ndcY: number,
  camera: THREE.Camera,
  skyMat: THREE.Matrix4,
  catalog: StarCatalog,
  opts: PickOptions,
): PickResult | null {
  // 1) 탭 광선을 월드 방향으로 언프로젝트
  _dir.set(ndcX, ndcY, 0.5).unproject(camera).sub(camera.position).normalize();

  // 2) 하늘 회전의 역행렬로 EQJ 프레임으로 되돌린다 → 정적 카탈로그와 바로 비교
  _inv.setFromMatrix4(skyMat).invert();
  _dir.applyMatrix3(_inv).normalize();

  const p = catalog.positions;
  const mag = catalog.mag;
  const tol = (m: number) =>
    starHitToleranceDeg(m, catalog.magLimit, opts.zoom, opts.fovDeg, opts.viewportH);

  // 가장 밝은 별의 허용 오차가 곧 탐색 상한이다 (카탈로그는 등급순 정렬)
  const searchCos = Math.cos((tol(mag[0]) * Math.PI) / 180);

  let best = -1;
  let bestRatio = Infinity;
  let bestSep = 0;

  for (let i = 0; i < catalog.count; i++) {
    const d = _dir.x * p[i * 3] + _dir.y * p[i * 3 + 1] + _dir.z * p[i * 3 + 2];
    if (d < searchCos) continue;
    const sep = (Math.acos(THREE.MathUtils.clamp(d, -1, 1)) * 180) / Math.PI;
    const t = tol(mag[i]);
    if (sep > t) continue;
    const ratio = sep / t;
    if (ratio < bestRatio) {
      bestRatio = ratio;
      bestSep = sep;
      best = i;
    }
  }

  if (best < 0) return null;
  return { index: best, sepDeg: bestSep, ratio: bestRatio };
}

const _aim = new THREE.Vector3();

/**
 * 화면의 한 점(기본값은 중앙 = 조준선)이 가리키는 방향의 적경·적위(도).
 *
 * pickStar와 달리 별을 찾지 않는다 — 빈 하늘을 조준해도 방향 자체는 언제나
 * 존재하고, IAU 경계는 하늘 전체를 빈틈없이 덮으므로 이 각도만 있으면
 * '지금 어느 별자리 안에 있는가'가 정확히 결정된다. 라벨 앵커(중심점)와의
 * 거리로 고르면 큰 별자리 안에 있어도 중심이 멀어 놓치는 일이 생긴다.
 *
 * sinAlt를 함께 돌려준다. SkyRig가 카메라 자체를 회전시키므로 unproject 결과가
 * 곧 월드 방향이고, 월드 y가 천정(sky.ts의 x=동·y=천정·z=남)이라 그 값이
 * 그대로 sin(고도)다. 지평선 아래를 걸러내려고 이걸 따로 구하면 언프로젝트를
 * 두 번 하게 된다.
 */
export function aimRaDec(
  camera: THREE.Camera,
  skyMat: THREE.Matrix4,
  ndcX = 0,
  ndcY = 0,
): { ra: number; dec: number; sinAlt: number } {
  _aim.set(ndcX, ndcY, 0.5).unproject(camera).sub(camera.position).normalize();
  const sinAlt = _aim.y;
  _inv.setFromMatrix4(skyMat).invert();
  _aim.applyMatrix3(_inv).normalize();
  return {
    ra: ((Math.atan2(_aim.y, _aim.x) * 180) / Math.PI + 360) % 360,
    dec: (Math.asin(THREE.MathUtils.clamp(_aim.z, -1, 1)) * 180) / Math.PI,
    sinAlt,
  };
}
