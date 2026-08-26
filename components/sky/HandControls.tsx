"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { type HandState, zoomRateFromDepth } from "@/lib/gestures";
import { DEFAULT_H_FOV_DEG, visibleFovY } from "@/lib/orientation";

export interface HandAction {
  kind: HandState["kind"] | "idle";
  /** 손을 젓는 중이면 팬, 멈춰 있으면 깊이 줌으로 해석된다. */
  panning: boolean;
  zoom: number;
}

interface Props {
  handRef: React.RefObject<HandState | null>;
  quatRef: React.RefObject<THREE.Quaternion>;
  fovRef: React.RefObject<number>;
  zoomRef: React.RefObject<number>;
  enabled: boolean;
  /** 핀치가 '시작되는 순간' 1회. 화면 중앙 기준으로 별을 고른다. */
  onPinch: (ndcX: number, ndcY: number) => void;
  /** HUD 표시용. 10Hz로만 올라온다. */
  onAction: (a: HandAction) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;

// 매 프레임 새로 만들면 GC가 60Hz로 돌면서 그 자체가 끊김의 원인이 된다
const _euler = new THREE.Euler(0, 0, 0, "YXZ");

/** 손 속도(정규화 좌표/초)가 이 값을 넘으면 '젓는 중' = 팬으로 본다. */
const PAN_SPEED_ON = 0.35;
/** 이 아래로 떨어지면 정지 = 줌인. 히스테리시스로 경계에서 튀는 걸 막는다. */
const PAN_SPEED_OFF = 0.18;

const PAN_DEG_PER_UNIT = 150; // 손을 화면 폭만큼 움직였을 때 도는 각도
/** 손 크기의 저역통과 시정수(초). 인식 잡음이 그대로 배율에 실리는 걸 막는다. */
const SCALE_TAU = 0.14;
/** 주먹으로 배율 1까지 되돌아가는 시정수(초). */
const RESET_TAU = 0.45;

/**
 * 손 제스처 → 하늘 조작.
 *
 *   펼친 손, 젓기      → 상하좌우 팬
 *   펼친 손, 앞뒤      → 확대 / 축소
 *   주먹               → 처음 배율로
 *   핀치               → 별 선택 (누르는 순간 1회)
 *
 * ⚠️ 확대와 축소를 '서로 다른 손 모양'에 배정하지 않는다. 그러면 어느 쪽이
 *    어느 쪽인지 외워야 하고, 둘 사이를 오가려면 자세를 바꿔야 해서 미세
 *    조정이 불가능하다. 대신 하나의 축(카메라와의 거리)에 양방향으로 얹는다 —
 *    밀면 다가가고 당기면 물러난다. 배울 게 없고, 되돌리는 것도 같은 축이다.
 *
 * '펼침'과 '젓기'가 같은 손 모양이라 손의 '속도'로 구분한다. 저으면 팬,
 * 멈추면 깊이 줌 — 둘 다 펼친 손 하나로 3차원 이동이 된다.
 */
export default function HandControls({
  handRef,
  quatRef,
  fovRef,
  zoomRef,
  enabled,
  onPinch,
  onAction,
}: Props) {
  const azRef = useRef(0);
  const altRef = useRef(20);
  const prevRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const panningRef = useRef(false);
  const wasPinchRef = useRef(false);
  const reportRef = useRef(0);
  // 손 위치 자체가 떨리므로 속도는 저역통과를 한 번 거친다
  const velRef = useRef({ x: 0, y: 0, speed: 0 });
  // 깊이 줌: 저역통과된 현재 손 크기와, 그걸 재는 기준점
  const scaleRef = useRef(0);
  const neutralRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let last = performance.now();

    const applyOrientation = () => {
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

    const applyZoom = () => {
      const z = THREE.MathUtils.clamp(zoomRef.current, MIN_ZOOM, MAX_ZOOM);
      zoomRef.current = z;
      fovRef.current = visibleFovY(
        0,
        0,
        window.innerWidth,
        window.innerHeight,
        z,
        DEFAULT_H_FOV_DEG,
      );
    };

    applyOrientation();
    applyZoom();

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const hand = handRef.current;

      if (!hand) {
        prevRef.current = null;
        panningRef.current = false;
        wasPinchRef.current = false;
        velRef.current = { x: 0, y: 0, speed: 0 };
        // 손이 사라지면 기준점도 버린다. 남겨 두면 손을 다시 들었을 때
        // 예전 위치와의 차이만큼 배율이 확 튄다.
        scaleRef.current = 0;
        neutralRef.current = 0;
        report(now, { kind: "idle", panning: false, zoom: zoomRef.current });
        return;
      }

      // ── 속도 추정 ────────────────────────────────────────────────
      const prev = prevRef.current;
      if (prev && now > prev.t) {
        const inst = {
          x: (hand.cx - prev.x) / dt,
          y: (hand.cy - prev.y) / dt,
        };
        // 저역통과 (τ ≈ 0.08s). 원시 속도를 그대로 쓰면 팬이 덜덜 떨린다.
        const k = 1 - Math.exp(-dt / 0.08);
        velRef.current.x += (inst.x - velRef.current.x) * k;
        velRef.current.y += (inst.y - velRef.current.y) * k;
        velRef.current.speed = Math.hypot(velRef.current.x, velRef.current.y);
      }

      // ── 손 크기(= 카메라와의 거리) ───────────────────────────────
      if (scaleRef.current <= 0) {
        scaleRef.current = hand.scale;
        neutralRef.current = hand.scale;
      } else {
        const ks = 1 - Math.exp(-dt / SCALE_TAU);
        scaleRef.current += (hand.scale - scaleRef.current) * ks;
      }

      // ── 핀치: 누르는 '순간'만 발화 ───────────────────────────────
      const isPinch = hand.kind === "pinch";
      if (isPinch && !wasPinchRef.current) {
        // 화면 중앙(레티클) 기준으로 고른다. 손 위치로 커서를 만들면
        // 손을 움직이는 동안 조준이 흔들려서 훨씬 어렵다.
        onPinch(0, 0);
      }
      wasPinchRef.current = isPinch;

      // ── 팬 / 줌 ──────────────────────────────────────────────────
      const speed = velRef.current.speed;
      if (hand.kind === "open") {
        if (panningRef.current ? speed > PAN_SPEED_OFF : speed > PAN_SPEED_ON) {
          panningRef.current = true;
        } else if (speed < PAN_SPEED_OFF) {
          panningRef.current = false;
        }
      } else {
        panningRef.current = false;
      }

      // 펼친 손이 아니면 기준점을 지금 위치로 다시 잡는다. 저을 때도 마찬가지 —
      // 젓는 동안 손이 앞뒤로도 움직이는데 그걸 줌으로 읽으면 안 되고, 저은
      // 뒤에는 '지금 이 자리'가 새 기준이어야 자연스럽다.
      if (hand.kind !== "open" || panningRef.current) {
        neutralRef.current = scaleRef.current;
      }

      if (hand.kind === "open" && panningRef.current) {
        // 손을 오른쪽으로 → 하늘도 오른쪽으로 흐른다(= 지도를 손으로 미는 감각).
        //
        // ⚠️ 프레임 간 '위치 차이'가 아니라 '저역통과된 속도 × dt'를 적분한다.
        //    손 인식은 카메라 프레임레이트(보통 30fps)로 갱신되는데 렌더는 60fps다.
        //    위치 차이를 쓰면 절반의 프레임은 delta가 0, 절반은 두 배가 되어
        //    30Hz 계단으로 끊겨 보인다. 속도를 적분하면 샘플이 갱신되지 않은
        //    프레임에도 연속적인 증분이 나온다.
        const gain = (PAN_DEG_PER_UNIT * fovRef.current) / 45;
        azRef.current -= velRef.current.x * dt * gain;
        altRef.current -= velRef.current.y * dt * gain;
        applyOrientation();
      } else if (hand.kind === "open") {
        // 멈춘 펼친 손 → 깊이 줌. 기준점보다 가까우면 확대, 멀면 축소.
        const rate = zoomRateFromDepth(scaleRef.current / neutralRef.current);
        if (rate !== 0) {
          zoomRef.current *= 1 + rate * dt;
          applyZoom();
        }
      } else if (hand.kind === "fist") {
        // 주먹 → 처음 배율로. 끊고 튀는 것보다 잦아드는 쪽이 '되돌린다'로 읽힌다.
        const kr = 1 - Math.exp(-dt / RESET_TAU);
        zoomRef.current += (MIN_ZOOM - zoomRef.current) * kr;
        applyZoom();
      }

      prevRef.current = { x: hand.cx, y: hand.cy, t: now };
      report(now, {
        kind: hand.kind,
        panning: panningRef.current,
        zoom: zoomRef.current,
      });
    };

    const report = (now: number, a: HandAction) => {
      if (now - reportRef.current < 100) return;
      reportRef.current = now;
      onAction(a);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled, handRef, quatRef, fovRef, zoomRef, onPinch, onAction]);

  return null;
}
