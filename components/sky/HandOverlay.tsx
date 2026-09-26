"use client";

import { useEffect, useRef } from "react";
import { HAND_CONNECTIONS, type HandState, type Landmark } from "@/lib/gestures";
import type { HandFeedback } from "./HandControls";

interface Props {
  landmarksRef: React.RefObject<Landmark[] | null>;
  handRef: React.RefObject<HandState | null>;
  /** HandControls가 매 프레임 써 넣는 조작 상태(끄는 중·확대 중·무장). */
  feedbackRef: React.RefObject<HandFeedback>;
  active: boolean;
  nightMode: boolean;
}

/**
 * 인식된 손을 스켈레톤 선으로만 그린다. 카메라 영상은 화면에 띄우지 않는다 —
 * 밤하늘이 주인공이고, 사용자에게 필요한 건 '내 손이 잡히고 있다'는 확인뿐이다.
 *
 * 2D 캔버스로 그린다. DOM 노드 21개 + 연결선 21개를 매 프레임 옮기면 레이아웃이
 * 갈리고, 반대로 WebGL 씬에 넣으면 하늘 좌표계와 뒤섞인다. 손은 '화면 좌표계'에
 * 사는 UI라서 별도 캔버스가 맞다.
 */
export default function HandOverlay({
  landmarksRef,
  handRef,
  feedbackRef,
  active,
  nightMode,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  // 손이 사라져도 즉시 지우지 않고 서서히 흐려진다. 인식이 한두 프레임 끊길 때마다
  // 스켈레톤이 깜빡이면 고장난 것처럼 보인다.
  const fadeRef = useRef(0);
  /** 무장 표시의 페이드. 켜고 끌 때 깜빡이지 않게. */
  const armRef = useRef(0);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      rafRef.current = requestAnimationFrame(draw);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);

      const lm = landmarksRef.current;
      const hand = handRef.current;

      // 0.18s 시정수로 페이드 인/아웃
      const target = lm ? 1 : 0;
      fadeRef.current += (target - fadeRef.current) * (1 - Math.exp(-dt / 0.18));
      if (fadeRef.current < 0.01 || !lm) {
        if (!lm && fadeRef.current < 0.01) return;
      }
      if (!lm) return;

      const alpha = fadeRef.current;
      // 전면 카메라는 좌우가 뒤집혀 있다. 손을 오른쪽으로 옮기면 스켈레톤도
      // 오른쪽으로 가야 하므로 x를 반전한다 (lib/gestures의 미러링과 동일 규약).
      const px = (p: Landmark) => (1 - p.x) * w;
      const py = (p: Landmark) => p.y * h;

      const base = nightMode ? "255, 106, 82" : "255, 255, 255";
      // 액센트는 '지금 조작이 걸려 있다'를 알릴 때만 쓴다. 레티클과 같은 색이며,
      // DESIGN.md의 액센트 예산 안에 있다 — 하늘이 아니라 계기를 표시한다.
      const fb = feedbackRef.current;
      const ACC = "255, 185, 94";

      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // 연결선
      ctx.strokeStyle = `rgba(${base}, ${0.34 * alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (const [a, b] of HAND_CONNECTIONS) {
        ctx.moveTo(px(lm[a]), py(lm[a]));
        ctx.lineTo(px(lm[b]), py(lm[b]));
      }
      ctx.stroke();

      // ⚠️ 관절 점은 그리지 않는다. 하늘 위에 점 21개가 얹히면 별과 뒤섞여
      //    어느 것이 별인지 알 수 없게 된다. 선만으로도 '내 손이 잡히고 있다'는
      //    확인에는 충분하다. (좌측 하단 카메라 창에는 점까지 그린다 —
      //    거기서는 인식 정확도를 봐야 하기 때문이다.)

      if (!hand) return;
      // hand.cx는 이미 미러링된 값이므로 그대로 쓴다
      const cx = hand.cx * w;
      const cy = hand.cy * h;

      // ── 끄는 중: 손바닥 링 ─────────────────────────────────────
      // 하늘을 '쥐고' 있다는 표시. 손이 움직이면 링도 같이 가고, 별도 따라온다.
      if (fb.panning) {
        ctx.strokeStyle = `rgba(${ACC}, ${0.55 * alpha})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, 30, 0, Math.PI * 2);
        ctx.stroke();
      }

      // ── 확대 중: 엄지-검지 선 ──────────────────────────────────
      // 이 간격을 벌리고 좁히는 것이 곧 조작이다. 걸려 있을 때만 밝힌다 —
      // 핀치 자세로 막 들어온 순간(PINCH_ENGAGE_S)은 옅게 둬서 '아직'임을 보인다.
      if (hand.kind === "pinch") {
        const on = fb.zooming;
        ctx.strokeStyle = `rgba(${ACC}, ${(on ? 0.9 : 0.3) * alpha})`;
        ctx.lineWidth = on ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(px(lm[4]), py(lm[4]));
        ctx.lineTo(px(lm[8]), py(lm[8]));
        ctx.stroke();
        for (const i of [4, 8]) {
          ctx.fillStyle = `rgba(${ACC}, ${(on ? 0.95 : 0.4) * alpha})`;
          ctx.beginPath();
          ctx.arc(px(lm[i]), py(lm[i]), on ? 3 : 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── 주먹: 조여드는 링, 무장되면 꽉 찬 점 ────────────────────
      // '이제 펴면 된다'를 손을 보지 않고도 알 수 있어야 한다. 무장 전에는
      // 가는 링만, 무장되면 링이 밝아지고 가운데가 찬다.
      armRef.current += ((fb.armed ? 1 : 0) - armRef.current) * (1 - Math.exp(-dt / 0.08));
      const arm = armRef.current;
      if (hand.kind === "fist" || arm > 0.02) {
        const R = 16 - arm * 4;
        ctx.strokeStyle = `rgba(${ACC}, ${(0.35 + 0.6 * arm) * alpha})`;
        ctx.lineWidth = 1 + arm * 1.2;
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.stroke();
        if (arm > 0.02) {
          ctx.fillStyle = `rgba(${ACC}, ${0.85 * arm * alpha})`;
          ctx.beginPath();
          ctx.arc(cx, cy, 4 * arm, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [active, landmarksRef, handRef, feedbackRef, nightMode]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      aria-hidden
    />
  );
}
