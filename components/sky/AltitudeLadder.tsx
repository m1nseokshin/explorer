"use client";

import { useEffect, useRef } from "react";
import { useLanguage } from "@/lib/i18n";
import type { Readout } from "./CompassStrip";

interface Props {
  /** ⚠️ 나침반과 같은 이유로 ref다 — CompassStrip 주석 참조. */
  readoutRef: React.RefObject<Readout>;
}

const TICKS = [-30, -15, 0, 15, 30, 45, 60, 75, 90];

/** 우측 고도자. 나침반과 마찬가지로 읽기 전용. */
export default function AltitudeLadder({ readoutRef }: Props) {
  const { lang } = useLanguage();
  const nodes = useRef(new Map<number, HTMLDivElement | null>());
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const box = boxRef.current;
      if (!box) return;
      const { alt, fov } = readoutRef.current;

      // ⚠️ 눈금은 '박스'가 아니라 '화면' 기준으로 놓아야 한다. 이 박스는
      //    위아래로 비워 둔 만큼 화면 중앙에 걸쳐 있지 않아서, top:50%로
      //    수평을 그리면 실제 수평선과 133px까지 어긋난다.
      const rect = box.getBoundingClientRect();
      const vh = window.innerHeight;
      // ⚠️ 원근 투영은 각도에 선형이 아니다. 화면 위치는 tan에 비례한다.
      const tanHalf = Math.tan((fov * Math.PI) / 360);

      for (const [deg, node] of nodes.current) {
        if (!node) continue;
        const rel = ((deg - alt) * Math.PI) / 180;
        // 90°를 넘으면 카메라 뒤쪽이라 tan이 뒤집힌다
        if (Math.abs(rel) > 1.4) {
          node.style.opacity = "0";
          continue;
        }
        const ndc = Math.tan(rel) / tanHalf; // -1..1, 양수가 위
        if (Math.abs(ndc) > 1) {
          node.style.opacity = "0";
          continue;
        }
        const yView = (0.5 - ndc / 2) * vh;
        if (yView < rect.top || yView > rect.bottom) {
          node.style.opacity = "0";
          continue;
        }
        node.style.opacity = "1";
        node.style.top = `${yView - rect.top}px`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [readoutRef]);

  return (
    <div
      // 위로는 나침반 테이프, 아래로는 우측 세로 컨트롤과 겹치지 않게 비워 둔다.
      // 가로가 좁거나(360px) 세로가 짧으면(640px) 숨긴다 — DESIGN.md 붕괴 전략.
      className="pointer-events-none absolute right-0 top-16 hidden w-20 min-[360px]:block [@media(max-height:640px)]:!hidden"
      style={{
        bottom: "calc(env(safe-area-inset-bottom) + 330px)",
        paddingRight: "calc(env(safe-area-inset-right) + 6px)",
      }}
      aria-hidden
      ref={boxRef}
    >
      <div className="relative h-full">
        {TICKS.map((deg) => (
          <div
            key={deg}
            ref={(el) => {
              if (el) nodes.current.set(deg, el);
              else nodes.current.delete(deg);
            }}
            className="absolute right-2 flex -translate-y-1/2 items-center gap-1.5"
            style={{ opacity: 0 }}
          >
            <span className="type-mono-hud hud-shadow leading-none opacity-70">
              {deg === 90
                ? lang === "ko"
                  ? "천정"
                  : "ZENITH"
                : deg === 0
                  ? lang === "ko"
                    ? "수평"
                    : "HORIZON"
                  : `${deg > 0 ? "+" : ""}${deg}°`}
            </span>
            <div
              className="h-px bg-current"
              style={{ width: deg % 45 === 0 ? 10 : 5, opacity: deg % 45 === 0 ? 0.8 : 0.35 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
