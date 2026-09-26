"use client";

import { useEffect, useRef } from "react";
import { HAND_CONNECTIONS, type Landmark } from "@/lib/gestures";
import { useLanguage } from "@/lib/i18n";
import type { HandStatus } from "@/lib/useHandTracking";

export interface HandStats {
  infers: number;
  hits: number;
  errors: number;
  lastError: string;
}

interface Props {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  landmarksRef: React.RefObject<Landmark[] | null>;
  statsRef: React.RefObject<HandStats>;
  status: HandStatus;
}

const W = 148;
const H = 111; // 4:3

/**
 * 좌측 하단 카메라 미리보기.
 *
 * 평소 이 앱은 카메라 영상을 절대 띄우지 않는다 — 밤하늘이 주인공이고,
 * 필요한 건 '내 손이 잡히고 있다'는 확인뿐이라 스켈레톤만 그린다.
 * 그런데 그 스켈레톤이 안 나올 때, 카메라가 죽은 건지 인식이 안 되는 건지
 * 구분할 방법이 화면에 하나도 없다. 이 창이 그 둘을 갈라 준다.
 *
 *   영상이 안 나온다        → 카메라 문제 (권한·점유·기기)
 *   영상은 나오는데 선이 없다 → 인식 문제 (조명·손 위치·모델)
 *
 * ⚠️ 좌우를 뒤집어 그린다. 전면 카메라 원본은 좌우가 반대라 그대로 두면
 *    손을 왼쪽으로 옮겼는데 화면에서는 오른쪽으로 간다. 랜드마크도 같은
 *    규칙으로 뒤집어야(1 - x) 영상 위에 정확히 얹힌다.
 */
export default function CameraPreview({ videoRef, landmarksRef, statsRef, status }: Props) {
  const { lang } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statLineRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);

      // ⚠️ <video>를 이 창 안으로 옮기지 않는다. 미디어 요소를 DOM에서 떼었다
      //    붙이면 브라우저가 로드 알고리즘을 다시 돌려 재생이 초기화될 수 있다.
      //    프레임만 캔버스에 옮겨 그린다 — 요소는 있던 자리에 그대로 둔다.
      const v = videoRef.current;
      if (v && v.readyState >= 2) {
        ctx.save();
        // 전면 카메라 원본은 좌우가 반대다
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
        const vr = v.videoWidth / Math.max(v.videoHeight, 1);
        const cr = W / H;
        // object-cover: 넘치는 쪽을 잘라 채운다
        const dw = vr > cr ? H * vr : W;
        const dh = vr > cr ? H : W / vr;
        ctx.drawImage(v, (W - dw) / 2, (H - dh) / 2, dw, dh);
        ctx.restore();
      }

      const lm = landmarksRef.current;
      if (!lm) return;

      const px = (p: Landmark) => [(1 - p.x) * W, p.y * H] as const;

      ctx.strokeStyle = "var(--accent-reticle)";
      ctx.strokeStyle = "#ffb35c";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (const [a, b] of HAND_CONNECTIONS) {
        const [x1, y1] = px(lm[a]);
        const [x2, y2] = px(lm[b]);
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
      }
      ctx.stroke();

      ctx.fillStyle = "#fff";
      for (const p of lm) {
        const [x, y] = px(p);
        ctx.beginPath();
        ctx.arc(x, y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [landmarksRef, videoRef]);

  // 진단 한 줄. 추론이 도는지 / 손을 찾는지 / 던지는지를 가른다.
  useEffect(() => {
    let raf = 0;
    let prevInfer = 0;
    let prevAt = performance.now();
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = statLineRef.current;
      const v = videoRef.current;
      if (!el) return;
      const now = performance.now();
      if (now - prevAt < 500) return;
      const st = statsRef.current;
      const rate = Math.round(((st.infers - prevInfer) * 1000) / (now - prevAt));
      prevInfer = st.infers;
      prevAt = now;
      const dim = v ? `${v.videoWidth}×${v.videoHeight}` : "—";
      el.textContent = st.errors
        ? `ERR ${st.errors} · ${st.lastError}`
        : `${dim} · ready ${v?.readyState ?? "—"} · 추론 ${rate}/s · 손 ${st.hits}`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [statsRef, videoRef]);

  const live = status === "running";

  return (
    <div
      className="pointer-events-none absolute z-30"
      style={{
        left: "calc(env(safe-area-inset-left) + 10px)",
        bottom: "calc(env(safe-area-inset-bottom) + 72px)",
      }}
    >
      <div
        className="relative overflow-hidden rounded-xl border border-hairline bg-black/70"
        style={{ width: W, height: H }}
      >
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        {!live && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="type-eyebrow text-center leading-tight text-muted">
              {status === "pending"
                ? lang === "ko"
                  ? "카메라 여는 중"
                  : "OPENING"
                : status === "loading"
                  ? lang === "ko"
                    ? "모델 불러오는 중"
                    : "LOADING"
                  : lang === "ko"
                    ? "카메라 꺼짐"
                    : "CAMERA OFF"}
            </span>
          </div>
        )}
      </div>
      <p
        ref={statLineRef}
        className="type-mono-hud mt-1 max-w-[148px] break-words text-[9px] leading-tight text-muted"
      />
    </div>
  );
}
