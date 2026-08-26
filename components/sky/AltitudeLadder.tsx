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

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const { alt, fov } = readoutRef.current;
      const half = Math.min(70, fov / 2);
      for (const [deg, node] of nodes.current) {
        if (!node) continue;
        const rel = deg - alt;
        if (Math.abs(rel) > half) {
          node.style.opacity = "0";
          continue;
        }
        node.style.opacity = "1";
        // 위쪽이 고도가 높으므로 부호 반전
        node.style.top = `${50 - (rel / (half * 2)) * 100}%`;
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
