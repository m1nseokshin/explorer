"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import { DEFAULT_H_FOV_DEG } from "@/lib/orientation";

/** 고정 중 손가락을 따라가는 비율. 낮을수록 '무겁게' 끌린다. */
const LOCK_DRAG_GAIN = 0.3;
/** 고정 지점에서 벗어날 수 있는 최대 각도(도). 아무리 끌어도 여기서 멈춘다. */
const LOCK_MAX_PULL = 7;
/** 자동으로 시야를 옮길 때의 추종 시정수(초). 눈이 따라갈 만큼 느려야 한다. */
const EASE_TAU = 0.55;
/**
 * '북쪽 보기'의 시정수(초).
 * 하늘을 반 바퀴 돌릴 수도 있는 동작이라, 일반 자동 이동보다 더 느긋해야
 * 어디로 가는지가 보인다. 순간이동하면 방향 감각이 통째로 끊긴다.
 */
export const RECENTER_TAU = 1.1;
/** 고무줄이 되돌아올 때. 놓자마자 튀어 돌아오면 '끊어진' 느낌이 든다. */
const SPRING_TAU = 0.3;
/** 손가락을 따라갈 때. 지연이 느껴지면 안 된다. */
const DRAG_TAU = 0.045;

export interface ViewCommand {
  /** 현재 시야(방위·고도·배율). 되돌아올 자리를 기억할 때 쓴다. */
  get(): { az: number; alt: number; zoom: number };
  /**
   * 시야를 옮긴다. SkyRig가 부드럽게 따라가므로 여기서는 목표만 정한다.
   * ease를 주면 그만큼 천천히 간다(초).
   */
  set(v: { az: number; alt: number; zoom: number }, ease?: number): void;
  /**
   * 시야를 그 자리에 붙들어 둔다. 끌면 조금 딸려 오다가 놓으면 돌아온다.
   * 별자리를 보는 동안 화면이 흘러가 버리는 걸 막는다.
   */
  lock(v: { az: number; alt: number }): void;
  unlock(): void;
}

interface Props {
  /** 밖에서 시야를 읽고 옮기기 위한 핸들. */
  commandRef?: React.RefObject<ViewCommand | null>;
  /** SkyRig의 추종 시정수. 상황에 따라 갈아 끼운다. */
  followTauRef: React.RefObject<number>;
  /** 이벤트를 받을 DOM 요소. 캔버스가 아니라 그 위의 오버레이여야 HUD 터치와 안 싸운다. */
  targetRef: React.RefObject<HTMLElement | null>;
  quatRef: React.RefObject<THREE.Quaternion>;
  fovRef: React.RefObject<number>;
  zoomRef: React.RefObject<number>;
  enabled: boolean;
  onZoomChange?: (zoom: number) => void;
  /** 탭(드래그가 아닌) 시 NDC 좌표를 넘긴다. */
  onTap?: (ndcX: number, ndcY: number) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 8;
const TAP_SLOP_PX = 8;
const TAP_MAX_MS = 350;

// 포인터 이벤트마다 새로 만들지 않는다
const _euler = new THREE.Euler(0, 0, 0, "YXZ");

/**
 * 자이로가 없을 때(데스크톱·권한 거부)의 드래그 팬 + 핀치/휠 줌.
 *
 * 방위/고도를 직접 들고 요·피치 오일러로 쿼터니언을 만든다. 롤은 0으로 고정 —
 * 마우스로 하늘을 기울일 이유가 없고, 롤이 들어가면 나침반 테이프가 무의미해진다.
 */
export default function VirtualControls({
  commandRef,
  followTauRef,
  targetRef,
  quatRef,
  fovRef,
  zoomRef,
  enabled,
  onZoomChange,
  onTap,
}: Props) {
  const azRef = useRef(0); // 도, 북=0
  const altRef = useRef(20);
  // 이펙트 안에서 만들어지는 setZoom/apply를 밖에서도 부를 수 있게 담아 둔다.
  const cmdRef = useRef<ViewCommand | null>(null);

  useImperativeHandle(commandRef, () => ({
    get: () => cmdRef.current?.get() ?? { az: 0, alt: 20, zoom: 1 },
    set: (v, ease) => cmdRef.current?.set(v, ease),
    lock: (v) => cmdRef.current?.lock(v),
    unlock: () => cmdRef.current?.unlock(),
  }));

  useEffect(() => {
    const el = targetRef.current;
    if (!el || !enabled) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let lastPinchDist = 0;
    let downAt = 0;
    let downPos = { x: 0, y: 0 };
    let moved = 0;

    const apply = () => {
      altRef.current = THREE.MathUtils.clamp(altRef.current, -89, 89);
      const az = ((azRef.current % 360) + 360) % 360;
      azRef.current = az;
      // YXZ: 요(방위) → 피치(고도). 월드 -Z가 북이므로 방위 부호가 반전된다.
      _euler.set(
        THREE.MathUtils.degToRad(altRef.current),
        THREE.MathUtils.degToRad(-az),
        0,
        "YXZ",
      );
      quatRef.current.setFromEuler(_euler);
    };
    apply();

    const setZoom = (z: number) => {
      const next = THREE.MathUtils.clamp(z, MIN_ZOOM, MAX_ZOOM);
      zoomRef.current = next;
      // 가상 모드에도 같은 FOV 공식을 쓴다 — AR 모드로 전환해도 화각이 튀지 않는다.
      const tanH = Math.tan((DEFAULT_H_FOV_DEG * Math.PI) / 360);
      const aScreen = el.clientWidth / Math.max(1, el.clientHeight);
      const tanV = tanH / Math.max(aScreen, 1e-3);
      fovRef.current = THREE.MathUtils.clamp(
        (2 * Math.atan(tanV / next) * 180) / Math.PI,
        6,
        100,
      );
      onZoomChange?.(next);
    };
    setZoom(zoomRef.current);

    // ⚠️ az/alt는 이 이펙트 안의 ref가 진짜 상태다. 밖에서 quatRef만 바꾸면
    //    다음 드래그에서 옛 az/alt로 되돌아가 화면이 튄다. 그래서 명령을
    //    여기로 들여보낸다.
    // 고정 상태. null이면 평소대로 자유롭게 돈다.
    let lock: { az: number; alt: number } | null = null;
    let pullAz = 0;
    let pullAlt = 0;

    /** 고무줄. 끌수록 덜 따라오고 결국 LOCK_MAX_PULL에서 멎는다. */
    const band = (v: number) => LOCK_MAX_PULL * Math.tanh(v / LOCK_MAX_PULL);

    const applyPull = () => {
      if (!lock) return;
      azRef.current = lock.az + band(pullAz);
      altRef.current = lock.alt + band(pullAlt);
      apply();
    };

    const releasePull = () => {
      if (!lock) return;
      pullAz = 0;
      pullAlt = 0;
      followTauRef.current = SPRING_TAU;
      azRef.current = lock.az;
      altRef.current = lock.alt;
      apply();
    };

    cmdRef.current = {
      get: () => ({ az: azRef.current, alt: altRef.current, zoom: zoomRef.current }),
      set: (v, ease) => {
        followTauRef.current = ease ?? EASE_TAU;
        azRef.current = v.az;
        altRef.current = v.alt;
        apply();
        setZoom(v.zoom);
      },
      lock: (v) => {
        lock = v;
        pullAz = 0;
        pullAlt = 0;
      },
      unlock: () => {
        lock = null;
        pullAz = 0;
        pullAlt = 0;
        followTauRef.current = DRAG_TAU;
      },
    };

    const onDown = (e: PointerEvent) => {
      // 손가락을 잡는 순간에는 즉시 반응해야 한다 — 자동 이동용 느린 시정수가
      // 남아 있으면 드래그가 통째로 늘어진다.
      followTauRef.current = DRAG_TAU;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        downAt = performance.now();
        downPos = { x: e.clientX, y: e.clientY };
        moved = 0;
      }
      // ⚠️ 포인터 캡처는 '상태를 기록한 뒤에' 잡는다. 먼저 부르면 이게 던질 때
      //    downAt·downPos가 통째로 유실돼서 탭이 영영 발화하지 않는다.
      //    (합성 이벤트나 이미 놓인 포인터에서 NotFoundError가 난다.)
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        // 캡처는 편의일 뿐이다. 실패해도 드래그·탭은 그대로 동작해야 한다.
      }
    };

    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pointers.size === 1) {
        moved += Math.hypot(dx, dy);
        // 화면 픽셀 → 각도. FOV에 비례해야 줌인 상태에서 과하게 돌지 않는다.
        const degPerPx = fovRef.current / Math.max(1, el.clientHeight);
        if (lock) {
          // 고정 중에는 감도를 낮추고 고무줄로 묶는다. 조금 딸려 오다가 멎는다.
          pullAz -= dx * degPerPx * LOCK_DRAG_GAIN;
          pullAlt += dy * degPerPx * LOCK_DRAG_GAIN;
          applyPull();
        } else {
          azRef.current -= dx * degPerPx;
          altRef.current += dy * degPerPx;
          apply();
        }
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastPinchDist > 0) setZoom(zoomRef.current * (dist / lastPinchDist));
        lastPinchDist = dist;
      }
    };

    const onUp = (e: PointerEvent) => {
      const wasSingle = pointers.size === 1;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) lastPinchDist = 0;
      if (
        wasSingle &&
        onTap &&
        moved < TAP_SLOP_PX &&
        performance.now() - downAt < TAP_MAX_MS
      ) {
        const r = el.getBoundingClientRect();
        onTap(
          ((downPos.x - r.left) / r.width) * 2 - 1,
          -(((downPos.y - r.top) / r.height) * 2 - 1),
        );
      }

      // 손을 떼면 고무줄이 원래 자리로 되돌린다
      if (pointers.size === 0) releasePull();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(zoomRef.current * (e.deltaY < 0 ? 1.12 : 1 / 1.12));
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      cmdRef.current = null;
    };
  }, [targetRef, enabled, quatRef, fovRef, zoomRef, followTauRef, onZoomChange, onTap]);

  return null;
}
