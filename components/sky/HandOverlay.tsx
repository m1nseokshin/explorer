"use client";

import { useEffect, useRef } from "react";
import { HAND_CONNECTIONS, type HandState, type Landmark } from "@/lib/gestures";

interface Props {
  landmarksRef: React.RefObject<Landmark[] | null>;
  handRef: React.RefObject<HandState | null>;
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
export default function HandOverlay({ landmarksRef, handRef, active, nightMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  // 손이 사라져도 즉시 지우지 않고 서서히 흐려진다. 인식이 한두 프레임 끊길 때마다
  // 스켈레톤이 깜빡이면 고장난 것처럼 보인다.
  const fadeRef = useRef(0);

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
      // 활성 제스처일 때만 액센트를 쓴다. 레티클과 같은 색이며, DESIGN.md의
      // 액센트 예산 안에 있다 — '지금 인식된 조작'을 알리는 계기 표시다.
      const isActing = hand && hand.kind !== "none";

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

      // 관절
      ctx.fillStyle = `rgba(${base}, ${0.55 * alpha})`;
      for (let i = 0; i < lm.length; i++) {
        const r = i === 0 ? 3.5 : 2.2;
        ctx.beginPath();
        ctx.arc(px(lm[i]), py(lm[i]), r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 핀치 표시: 엄지(4)와 검지(8)를 잇는 선. 붙을수록 진해진다.
      if (hand) {
        const t = Math.max(0, 1 - hand.pinchDist / 0.8);
        if (t > 0.05) {
          ctx.strokeStyle = `rgba(255, 185, 94, ${t * alpha})`;
          ctx.lineWidth = 1 + t * 1.5;
          ctx.beginPath();
          ctx.moveTo(px(lm[4]), py(lm[4]));
          ctx.lineTo(px(lm[8]), py(lm[8]));
          ctx.stroke();
        }
      }

      // 활성 제스처일 때 손바닥 중심에 얇은 링
      if (isActing && hand) {
        // hand.cx는 이미 미러링된 값이므로 그대로 쓴다
        const cx = hand.cx * w;
        const cy = hand.cy * h;
        ctx.strokeStyle = `rgba(255, 185, 94, ${0.45 * alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, hand.kind === "fist" ? 14 : 26, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [active, landmarksRef, handRef, nightMode]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
      aria-hidden
    />
  );
}
