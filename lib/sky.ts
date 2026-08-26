/**
 * 천구 좌표 변환의 단일 진실 공급원.
 *
 * 핵심 결정: 별 8,874개를 매 프레임 개별 변환하지 않는다. J2000 적도좌표(EQJ)
 * 단위벡터로 '한 번' 배치한 뒤, 그룹 행렬 하나만 갱신한다. 프레임당 3×3 행렬 1개
 * vs 별 9천 개 삼각함수 — 비교 대상이 아니다.
 */
import { MakeTime, Observer, Rotation_EQJ_HOR } from "astronomy-engine";
import * as THREE from "three";

/** 천구 셸 반지름. 기하는 없고 화가 알고리즘 셸이므로 값 자체엔 의미가 없다. */
export const SKY_RADIUS = 100;

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

/**
 * EQJ(J2000 적도좌표) → 월드좌표(x=동, y=천정, z=남) 회전 행렬.
 *
 * 세차·장동·지방항성시를 astronomy-engine이 전부 처리한다. LST를 직접 계산하지 말 것.
 *
 * ⚠️ astronomy-engine의 RotateVector는 out[j] = Σᵢ rot[i][j]·v[i] 로 계산한다.
 *    즉 rot[i]는 "i번째 EQJ 기저벡터의 HOR 성분" = 수학적 행렬의 i번째 '열'이다.
 *    행으로 착각하면 하늘이 통째로 전치돼 뒤집힌다 — 이 프로젝트에서 가장 조용히
 *    틀리기 쉬운 지점이다. verify-sky.mjs의 Polaris 검사가 이걸 잡는다.
 *
 * HOR은 (n, w, u) = (북, 서, 천정). 월드는 (동, 천정, 남).
 *   동 = -서, 천정 = 천정, 남 = -북  →  world = (-w, u, -n)
 * 행렬식 +1(우수계 보존)이며, 방위각 0°(북)가 월드 (0,0,-1)에 대응한다.
 * 이는 변환 없는 three.js PerspectiveCamera가 바라보는 방향과 정확히 같아서,
 * 기본 자세 = '정북 수평선을 봄'이 공짜로 얻어진다.
 */
export function skyMatrix(
  date: Date,
  latDeg: number,
  lonDeg: number,
  heightM = 0,
): THREE.Matrix4 {
  const { rot } = Rotation_EQJ_HOR(
    MakeTime(date),
    new Observer(latDeg, lonDeg, heightM),
  );

  const col = (i: number): [number, number, number] => {
    const [n, w, u] = rot[i] as [number, number, number];
    return [-w, u, -n];
  };
  const a0 = col(0);
  const a1 = col(1);
  const a2 = col(2);

  // Matrix4.set은 행 우선 인자를 받는다. a0/a1/a2는 '열'이므로 전치해서 넣는다.
  return new THREE.Matrix4().set(
    a0[0], a1[0], a2[0], 0,
    a0[1], a1[1], a2[1], 0,
    a0[2], a1[2], a2[2], 0,
    0,     0,     0,     1,
  );
}

/**
 * RA(도), Dec(도) → EQJ 벡터.
 * ⚠️ scripts/build-star-data.mjs:radecToUnit과 반드시 동일한 공식을 유지할 것.
 *    어긋나면 별자리선이 별에서 미세하게 떨어져 나간다.
 */
export function radecToVec3(
  raDeg: number,
  decDeg: number,
  r = SKY_RADIUS,
  target = new THREE.Vector3(),
): THREE.Vector3 {
  const ra = raDeg * D2R;
  const dec = decDeg * D2R;
  const cd = Math.cos(dec);
  return target.set(r * cd * Math.cos(ra), r * cd * Math.sin(ra), r * Math.sin(dec));
}

/**
 * 월드 방향벡터 → { az, alt } (도). HUD 표시 및 검증용.
 * 매 프레임 호출되므로 입력을 복제하지 않는다 — 정규화는 나눗셈으로 처리한다.
 */
export function worldToAltAz(v: THREE.Vector3): { az: number; alt: number } {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  const alt = Math.asin(THREE.MathUtils.clamp(v.y / len, -1, 1)) * R2D;
  // 북 = -z, 동 = +x  →  az = atan2(동, 북) = atan2(x, -z)
  let az = Math.atan2(v.x, -v.z) * R2D;
  if (az < 0) az += 360;
  return { az, alt };
}

/** { az, alt }(도) → 월드 단위벡터. 나침반·보정 UI에서 역방향으로 필요하다. */
export function altAzToWorld(
  azDeg: number,
  altDeg: number,
  target = new THREE.Vector3(),
): THREE.Vector3 {
  const az = azDeg * D2R;
  const alt = altDeg * D2R;
  const ca = Math.cos(alt);
  return target.set(ca * Math.sin(az), Math.sin(alt), -ca * Math.cos(az));
}

/** 방위각(도) → 8방위 한/영 표기 */
export function cardinal(azDeg: number, lang: "ko" | "en" = "en"): string {
  const ko = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"];
  const en = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const i = Math.round((((azDeg % 360) + 360) % 360) / 45) % 8;
  return (lang === "ko" ? ko : en)[i];
}
