"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import {
  createGrasp,
  graspArmed,
  stepGrasp,
  zoomStep,
  MAX_ZOOM,
  MIN_ZOOM,
  PINCH_ENGAGE_S,
  type GestureKind,
  type HandState,
} from "@/lib/gestures";
import { DEFAULT_H_FOV_DEG, visibleFovY } from "@/lib/orientation";
import {
  DRAG_TAU,
  EASE_TAU,
  LOCK_DRAG_GAIN,
  LOCK_MAX_PULL,
  SPRING_TAU,
  readAzAlt,
  type ViewCommand,
} from "./VirtualControls";

export interface HandAction {
  kind: GestureKind | "idle";
  /** 펼친 손으로 하늘을 끄는 중. */
  panning: boolean;
  /** 핀치로 배율을 움직이는 중. */
  zooming: boolean;
  /** 주먹을 충분히 쥐었다 — 지금 펴면 열리거나 닫힌다. */
  armed: boolean;
  zoom: number;
}

/** HandOverlay가 매 프레임 읽는 조작 상태. React를 거치지 않는다. */
export interface HandFeedback {
  panning: boolean;
  zooming: boolean;
  armed: boolean;
}

interface Props {
  handRef: React.RefObject<HandState | null>;
  quatRef: React.RefObject<THREE.Quaternion>;
  fovRef: React.RefObject<number>;
  zoomRef: React.RefObject<number>;
  followTauRef: React.RefObject<number>;
  /** 밖에서 시야를 읽고 옮기기 위한 핸들. VirtualControls와 같은 모양이다. */
  commandRef?: React.RefObject<ViewCommand | null>;
  feedbackRef: React.RefObject<HandFeedback>;
  enabled: boolean;
  /** 주먹 쥐었다 펴기. 열려 있으면 닫고, 닫혀 있으면 조준선 자리를 연다. */
  onGrasp: () => void;
  /** HUD 표시용. 값이 바뀌었을 때만, 최대 10Hz로 올라온다. */
  onAction: (a: HandAction) => void;
}

// 매 프레임 새로 만들면 GC가 60Hz로 돌면서 그 자체가 끊김의 원인이 된다
const _euler = new THREE.Euler(0, 0, 0, "YXZ");

/**
 * 카메라 화면 폭을 한 번 가로지를 때 하늘이 끌리는 양(화면 폭 단위).
 * 1이면 손이 움직인 만큼 별이 따라온다. 손은 카메라 화면 끝까지 편하게
 * 닿지 않으므로 조금 더 준다.
 */
const PAN_GAIN = 1.2;
/** 손바닥 위치의 저역통과 시정수(초). 인식 떨림이 하늘에 실리는 걸 막는다. */
const PALM_TAU = 0.05;
/**
 * 카메라 화면 좌우 끝의 '계속 밀기' 구간(0..0.5).
 * 팔 길이는 정해져 있어서 끌기만으로는 한 바퀴를 못 돈다. 끝에 닿은 채로
 * 있으면 그 방향으로 계속 흐른다 — 끌던 방향 그대로라 배울 게 없다.
 */
const EDGE_ZONE = 0.14;
/** 끝까지 밀었을 때 초당 흐르는 양(화면 폭 단위). */
const EDGE_SCREENS_PER_SEC = 0.6;
/** 벌림의 저역통과 시정수(초). 인식 잡음이 그대로 배율에 실리는 걸 막는다. */
const APERTURE_TAU = 0.1;
/**
 * 핀치로 배율을 움직인 직후 이 시간(초) 안의 주먹은 주먹으로 치지 않는다.
 * 끝까지 좁혀 축소하다 보면 손이 주먹처럼 읽히는 순간이 있는데, 그게
 * '쥐었다 펴기'를 무장시키면 이어서 손을 펼 때 창이 열린다.
 */
const PINCH_RECENT_S = 0.3;

/** 고무줄. 끌수록 덜 따라오고 결국 LOCK_MAX_PULL에서 멎는다. */
const band = (v: number) => LOCK_MAX_PULL * Math.tanh(v / LOCK_MAX_PULL);

/** 카메라 화면 끝 구간에 얼마나 들어가 있는지. 왼쪽 끝 -1 … 오른쪽 끝 +1. */
function edgePush(x: number): number {
  if (x > 1 - EDGE_ZONE) return Math.min((x - (1 - EDGE_ZONE)) / EDGE_ZONE, 1);
  if (x < EDGE_ZONE) return -Math.min((EDGE_ZONE - x) / EDGE_ZONE, 1);
  return 0;
}

/**
 * 손 제스처 → 하늘 조작.
 *
 *   손바닥 펴고 움직이기         → 하늘을 끈다 (끝에 대고 있으면 계속 흐른다)
 *   엄지·검지 벌리기 / 좁히기    → 확대 / 축소
 *   주먹 쥐었다 펴기             → 조준선 자리 자세히 보기 · 한 번 더 하면 닫기
 *
 * 끌기 방향은 마우스 드래그와 같다 — 손을 오른쪽으로 옮기면 별도 오른쪽으로
 * 따라온다. 손이 하늘을 쥐고 있는 것처럼 보여야 스켈레톤과 별이 함께 읽힌다.
 */
export default function HandControls({
  handRef,
  quatRef,
  fovRef,
  zoomRef,
  followTauRef,
  commandRef,
  feedbackRef,
  enabled,
  onGrasp,
  onAction,
}: Props) {
  const azRef = useRef(0);
  const altRef = useRef(20);
  /** 별자리를 보는 동안 시야를 붙들어 두는 자리. null이면 자유롭다. */
  const lockRef = useRef<{ az: number; alt: number } | null>(null);
  const pullRef = useRef({ az: 0, alt: 0 });

  // ⚠️ 콜백은 ref로 받는다. 이펙트 의존성에 두면 부모가 리렌더될 때마다 루프가
  //    다시 만들어지고, 그 순간 끌기·핀치 기준점과 주먹 무장이 전부 초기화된다.
  const onGraspRef = useRef(onGrasp);
  const onActionRef = useRef(onAction);
  useEffect(() => {
    onGraspRef.current = onGrasp;
    onActionRef.current = onAction;
  }, [onGrasp, onAction]);

  // 방위·고도·배율을 쿼터니언·FOV로 옮겨 적는다. 이펙트 밖에서도(명령 핸들) 부른다.
  const writeOrientation = () => {
    altRef.current = THREE.MathUtils.clamp(altRef.current, -89, 89);
    azRef.current = ((azRef.current % 360) + 360) % 360;
    _euler.set(
      THREE.MathUtils.degToRad(altRef.current),
      THREE.MathUtils.degToRad(-azRef.current),
      0,
      "YXZ",
    );
    quatRef.current.setFromEuler(_euler);
  };
  const writeZoom = (z: number) => {
    zoomRef.current = THREE.MathUtils.clamp(z, MIN_ZOOM, MAX_ZOOM);
    fovRef.current = visibleFovY(
      0,
      0,
      window.innerWidth,
      window.innerHeight,
      zoomRef.current,
      DEFAULT_H_FOV_DEG,
    );
  };
  const writeRef = useRef({ writeOrientation, writeZoom });
  useEffect(() => {
    writeRef.current = { writeOrientation, writeZoom };
  });

  useImperativeHandle(commandRef, () => ({
    get: () => ({ az: azRef.current, alt: altRef.current, zoom: zoomRef.current }),
    set: (v, ease) => {
      followTauRef.current = ease ?? EASE_TAU;
      azRef.current = v.az;
      altRef.current = v.alt;
      writeRef.current.writeOrientation();
      writeRef.current.writeZoom(v.zoom);
    },
    lock: (v) => {
      lockRef.current = v;
      pullRef.current = { az: 0, alt: 0 };
    },
    unlock: () => {
      lockRef.current = null;
      pullRef.current = { az: 0, alt: 0 };
      followTauRef.current = DRAG_TAU;
    },
  }));

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let last = performance.now();
    const { writeOrientation: orient, writeZoom: zoomTo } = writeRef.current;
    const fb = feedbackRef.current;

    // 드래그 모드가 옮겨 둔 자리에서 이어간다. 옛 값으로 시작하면 하늘이 튄다.
    const cur = readAzAlt(quatRef.current);
    azRef.current = cur.az;
    altRef.current = cur.alt;
    orient();
    zoomTo(zoomRef.current);

    const grasp = createGrasp();
    /** 저역통과된 손바닥 위치. null이면 지금 끄는 중이 아니다. */
    let palm: { x: number; y: number } | null = null;
    /** 핀치 자세가 시작된 시각. */
    let pinchSince: number | null = null;
    /** 저역통과된 벌림. null이면 아직 기준이 없다. */
    let aperture: number | null = null;
    let lastZoomAt = -Infinity;
    let lastReport = 0;
    let reported: HandAction | null = null;

    /** 끌기를 놓는다. 고정 중이었으면 고무줄이 제자리로 되돌린다. */
    const releasePan = () => {
      if (!palm) return;
      palm = null;
      const lock = lockRef.current;
      if (lock) {
        pullRef.current = { az: 0, alt: 0 };
        followTauRef.current = SPRING_TAU;
        azRef.current = lock.az;
        altRef.current = lock.alt;
        orient();
      }
    };

    const report = (now: number, a: HandAction) => {
      fb.panning = a.panning;
      fb.zooming = a.zooming;
      fb.armed = a.armed;

      // 값이 같으면 올리지 않는다. 정지한 손에 10Hz로 리렌더할 이유가 없다.
      const r = reported;
      if (
        r &&
        r.kind === a.kind &&
        r.panning === a.panning &&
        r.zooming === a.zooming &&
        r.armed === a.armed &&
        Math.abs(r.zoom - a.zoom) < 1e-3
      ) {
        return;
      }
      if (now - lastReport < 100) return;
      lastReport = now;
      reported = a;
      onActionRef.current(a);
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const t = now / 1000;

      const hand = handRef.current;
      if (!hand) {
        // 인식이 한두 프레임 끊겨도 주먹 무장은 유지한다 — 손을 빠르게 펴면
        // 그 사이가 흐려서 놓치기 쉽다. 끌기·핀치의 기준점만 버린다.
        stepGrasp(grasp, null, t);
        releasePan();
        pinchSince = null;
        aperture = null;
        report(now, {
          kind: "idle",
          panning: false,
          zooming: false,
          armed: graspArmed(grasp, t),
          zoom: zoomRef.current,
        });
        return;
      }

      const kind = hand.kind;

      // ── 주먹 쥐었다 펴기: 열기 / 닫기 ──────────────────────────
      const graspKind: GestureKind =
        kind === "fist" && t - lastZoomAt < PINCH_RECENT_S ? "none" : kind;
      if (stepGrasp(grasp, graspKind, t)) onGraspRef.current();
      const armed = graspArmed(grasp, t);

      // ── 손바닥 펴고 움직이기: 끌기 ─────────────────────────────
      let panning = false;
      if (kind === "open") {
        panning = true;
        if (!palm) {
          // 잡는 순간이 기준점이다 — 여기서 튀면 '잡았다'가 아니라 '밀쳤다'가 된다
          palm = { x: hand.cx, y: hand.cy };
          followTauRef.current = DRAG_TAU;
        } else {
          const k = 1 - Math.exp(-dt / PALM_TAU);
          const nx = palm.x + (hand.cx - palm.x) * k;
          const ny = palm.y + (hand.cy - palm.y) * k;
          const dx = nx - palm.x;
          const dy = ny - palm.y;
          palm.x = nx;
          palm.y = ny;

          // 카메라 화면 → 각도. 화각에 비례해야 확대한 상태에서 과하게 돌지 않는다.
          const vFov = fovRef.current;
          const aspect = window.innerWidth / Math.max(1, window.innerHeight);
          const hFov =
            (2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(vFov) / 2) * aspect) * 180) /
            Math.PI;
          let dAz = -dx * hFov * PAN_GAIN;
          const dAlt = dy * vFov * PAN_GAIN;

          const lock = lockRef.current;
          if (lock) {
            // 별자리를 보는 중에는 무겁게 딸려 오다 멎는다. 손을 쥐면 돌아온다.
            pullRef.current.az += dAz * LOCK_DRAG_GAIN;
            pullRef.current.alt += dAlt * LOCK_DRAG_GAIN;
            azRef.current = lock.az + band(pullRef.current.az);
            altRef.current = lock.alt + band(pullRef.current.alt);
            orient();
          } else {
            dAz -= edgePush(palm.x) * hFov * EDGE_SCREENS_PER_SEC * dt;
            if (dAz !== 0 || dAlt !== 0) {
              azRef.current += dAz;
              altRef.current += dAlt;
              orient();
            }
          }
        }
      } else {
        releasePan();
      }

      // ── 엄지·검지 벌리기 / 좁히기: 확대 / 축소 ──────────────────
      let zooming = false;
      if (kind === "pinch") {
        if (pinchSince === null) pinchSince = t;
        if (t - pinchSince >= PINCH_ENGAGE_S) {
          zooming = true;
          lastZoomAt = t;
          if (aperture === null) {
            // 들어오는 순간의 벌림이 기준이다. 변화량만 보므로 어디서 시작하든 튀지 않는다.
            aperture = hand.aperture;
          } else {
            const prev = aperture;
            aperture += (hand.aperture - prev) * (1 - Math.exp(-dt / APERTURE_TAU));
            const z = zoomStep(zoomRef.current, aperture - prev);
            if (Math.abs(z - zoomRef.current) > 1e-5) zoomTo(z);
          }
        }
      } else {
        pinchSince = null;
        aperture = null;
      }

      report(now, { kind, panning, zooming, armed, zoom: zoomRef.current });
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      fb.panning = false;
      fb.zooming = false;
      fb.armed = false;
    };
  }, [enabled, handRef, quatRef, fovRef, zoomRef, followTauRef, feedbackRef]);

  return null;
}
