"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";

interface Props {
  /** 조작 레이어가 매 프레임 써 넣는 목표 자세. */
  targetQuat: React.RefObject<THREE.Quaternion>;
  /** 목표 수직 FOV(도). */
  fovRef: React.RefObject<number>;
  /** 추종 시정수(초). 없으면 기본값. 자동 이동일 때만 크게 잡는다. */
  followTauRef?: React.RefObject<number>;
  /** 프레임마다 현재 시선 방향을 알려준다 (나침반·고도자·리드아웃용). */
  onOrient?: (q: THREE.Quaternion, fov: number) => void;
}

/**
 * 목표를 따라잡는 시정수(초).
 *
 * 아주 짧게 잡는다. 조작 레이어(HandControls/VirtualControls)가 이미 속도를
 * 저역통과하므로 여기서 길게 잡으면 손을 멈춰도 하늘이 계속 밀리는 '고무줄'이
 * 된다. 0.045s는 포인터 이벤트가 뭉쳐 들어올 때의 계단만 지우고 지연은
 * 체감되지 않는 지점이다.
 */
/**
 * 기본 추종 시정수(초). 손가락을 따라가는 값이라 짧아야 한다.
 * 자동 프레이밍이나 고무줄 복귀처럼 '시스템이 옮기는' 이동은 이보다 훨씬
 * 느려야 눈이 따라갈 수 있으므로, 그때는 followTauRef로 갈아 끼운다.
 */
const FOLLOW_TAU = 0.045;
/** 이보다 가까우면 그냥 스냅한다 — 영원히 수렴만 하는 잔떨림을 없앤다. */
const SNAP_RAD = 1e-4;

/**
 * 카메라 자세·FOV 구동.
 *
 * 방향은 절대 React state에 두지 않는다 — 초당 60회 리렌더가 나서 트리 전체가
 * 죽는다. 벤치마크 프로젝트의 simDateRef/groupsRef 규약을 그대로 따른다.
 */
export default function SkyRig({ targetQuat, fovRef, followTauRef, onOrient }: Props) {
  const { camera } = useThree();

  useEffect(() => {
    camera.quaternion.copy(targetQuat.current);
    (camera as THREE.PerspectiveCamera).fov = fovRef.current;
    (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  }, [camera, targetQuat, fovRef]);

  useFrame((_, delta) => {
    const cam = camera as THREE.PerspectiveCamera;
    const dt = Math.min(delta, 0.1); // 탭 복귀 시 delta가 튀는 걸 막는다
    const k = 1 - Math.exp(-dt / (followTauRef?.current ?? FOLLOW_TAU)); // 프레임레이트 독립

    const target = targetQuat.current;
    if (cam.quaternion.angleTo(target) < SNAP_RAD) {
      cam.quaternion.copy(target);
    } else {
      cam.quaternion.slerp(target, k);
    }

    // 화각도 같은 방식으로 따라간다. 손 제스처 줌은 프레임마다 배율이 바뀌므로
    // 스냅하면 확대가 계단처럼 보인다.
    const wantFov = fovRef.current;
    const dFov = wantFov - cam.fov;
    if (Math.abs(dFov) > 1e-3) {
      cam.fov += dFov * k;
      if (Math.abs(wantFov - cam.fov) < 1e-3) cam.fov = wantFov;
      cam.updateProjectionMatrix();
    }

    onOrient?.(cam.quaternion, cam.fov);
  });

  return null;
}
