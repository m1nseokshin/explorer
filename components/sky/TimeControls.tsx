"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";

interface Props {
  timeRef: React.RefObject<number>;
  timeScale: number;
  onScale: (v: number) => void;
  onReset: () => void;
  open: boolean;
}

const SPEEDS: { label: string; value: number }[] = [
  { label: "1×", value: 1 },
  { label: "1시간/초", value: 3600 },
  { label: "1일/초", value: 86400 },
  { label: "1주/초", value: 604800 },
];

/**
 * 시간여행. 벤치마크의 TimeControls를 이식했다.
 * 날짜 표시는 리렌더를 피해 200ms 폴링으로 ref에서 읽는다.
 */
export default function TimeControls({ timeRef, timeScale, onScale, onReset, open }: Props) {
  const { lang } = useLanguage();
  const [display, setDisplay] = useState("");

  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date(timeRef.current || Date.now());
      setDisplay(
        d.toLocaleString(lang === "ko" ? "ko-KR" : "en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }, 200);
    return () => clearInterval(id);
  }, [timeRef, lang]);

  if (!open) return null;

  return (
    <div className="pointer-events-auto rounded-2xl border border-hairline bg-surface/97 p-4 shadow-2xl">
      <p className="type-eyebrow text-muted">{lang === "ko" ? "시각" : "Time"}</p>
      <p className="type-mono-hud mt-1 text-base">{display}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SPEEDS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => onScale(s.value)}
            data-active={timeScale === s.value ? "true" : "false"}
            className="hud-pill type-button-cap px-3 py-2"
          >
            {s.value === 1 ? (lang === "ko" ? "실시간" : "LIVE") : s.label}
          </button>
        ))}
        <button
          type="button"
          onClick={onReset}
          className="hud-pill type-button-cap px-3 py-2"
        >
          {lang === "ko" ? "지금" : "NOW"}
        </button>
      </div>
    </div>
  );
}
