"use client";

import { useEffect, useRef } from "react";
import { cardinal } from "@/lib/sky";
import { useLanguage } from "@/lib/i18n";

export interface Readout {
  az: number;
  alt: number;
  fov: number;
}

interface Props {
  /**
   * ⚠️ 값이 아니라 ref로 받는다. state로 10Hz마다 넘기면 눈금이 100ms 계단으로
   *    움직여서 하늘은 부드러운데 나침반만 끊긴다 — 별자리 이름에서 겪은 것과
   *    같은 문제다. 눈금은 마운트만 React가 정하고, 위치는 매 프레임 DOM에 쓴다.
   */
  readoutRef: React.RefObject<Readout>;
  /** "true" | "magnetic" 이면 정상, "relative"면 북쪽을 모른다는 뜻이다. */
  reference: "true" | "magnetic" | "relative";
}

const TICK_STEP = 15;
/** 0°부터 15°마다 한 바퀴 = 24개. 전부 붙여 두고 보이는 것만 켠다. */
const TICKS = Array.from({ length: 360 / TICK_STEP }, (_, i) => i * TICK_STEP);

/**
 * 상단 나침반 테이프. 읽기 전용 — 손이 가리고 엄지가 닿지 않는 상단 20%엔
 * 표시만 둔다는 규칙(DESIGN.md 도달성 규칙)의 유일한 거주자다.
 */
export default function CompassStrip({ readoutRef, reference }: Props) {
  const { lang } = useLanguage();
  const uncal = reference === "relative";
  const nodes = useRef(new Map<number, HTMLDivElement | null>());

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const { az, fov } = readoutRef.current;

      // ⚠️ 수평 화각을 'fov × 1.6'으로 어림하면 안 된다. 종횡비에서 바로 나온다.
      //    그리고 원근 투영은 각도에 선형이 아니라 tan에 비례한다 — 선형으로
      //    두면 눈금이 하늘의 실제 방위와 어긋난 채 그럴듯하게 흐른다.
      const vw = window.innerWidth;
      const tanHalfV = Math.tan((fov * Math.PI) / 360);
      const tanHalfH = tanHalfV * (vw / Math.max(window.innerHeight, 1));

      for (const [deg, node] of nodes.current) {
        if (!node) continue;
        let rel = deg - az;
        if (rel > 180) rel -= 360;
        if (rel < -180) rel += 360;
        const r = (rel * Math.PI) / 180;
        if (Math.abs(r) > 1.4) {
          node.style.opacity = "0";
          continue;
        }
        const ndc = Math.tan(r) / tanHalfH; // -1..1, 양수가 오른쪽
        if (Math.abs(ndc) > 1) {
          node.style.opacity = "0";
          continue;
        }
        node.style.opacity = "1";
        node.style.transform = `translate3d(${(0.5 + ndc / 2) * vw}px, 0, 0) translateX(-50%)`;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [readoutRef]);

  return (
    <div
      className="scrim-top pointer-events-none absolute inset-x-0 top-0 h-16 overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)", opacity: uncal ? 0.4 : 1 }}
      aria-hidden
    >
      <div className="relative h-8">
        {TICKS.map((deg) => {
          const major = deg % 45 === 0;
          return (
            <div
              key={deg}
              ref={(el) => {
                if (el) nodes.current.set(deg, el);
                else nodes.current.delete(deg);
              }}
              className="absolute left-0 top-0 flex flex-col items-center will-change-transform"
              style={{ opacity: 0 }}
            >
              <div
                className="w-px bg-current"
                style={{ height: major ? 10 : 5, opacity: major ? 0.8 : 0.35 }}
              />
              {major && (
                <span className="type-eyebrow hud-shadow leading-none" style={{ fontSize: 11 }}>
                  {cardinal(deg, lang)}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {uncal && (
        <div className="type-eyebrow hud-shadow absolute inset-x-0 top-9 text-center leading-none">
          {lang === "ko" ? "미보정" : "UNCALIBRATED"}
        </div>
      )}
    </div>
  );
}
