"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import type { HandAction } from "./HandControls";

interface Props {
  action: HandAction;
  handStatus: "running" | "off";
}

/** 왼쪽 가장자리에서 이 거리 안에서 시작한 스와이프만 서랍을 연다(px). */
const EDGE_ZONE = 22;
/** 서랍이 열리는 최소 스와이프 거리(px). */
const OPEN_SLOP = 52;
/**
 * 가로가 세로보다 이 배수 이상이어야 서랍으로 친다.
 * ⚠️ 왼쪽 끝에서 하늘을 끄는 동작과 겹친다 — 방향까지 보지 않으면
 *    하늘을 둘러보려 할 때마다 도움말이 튀어나온다.
 */
const OPEN_RATIO = 2.2;

type Row = { id: HandAction["kind"] | "pan"; ko: string; en: string; glyph: string };

const ROWS: Row[] = [
  { id: "pan", ko: "펼침 · 젓기", en: "Open · sweep", glyph: "↔" },
  { id: "open", ko: "펼침 · 앞뒤", en: "Open · push · pull", glyph: "✋" },
  { id: "fist", ko: "주먹", en: "Fist", glyph: "✊" },
  { id: "pinch", ko: "핀치", en: "Pinch", glyph: "🤏" },
];

const EFFECT: Record<string, { ko: string; en: string }> = {
  pan: { ko: "둘러보기", en: "Look around" },
  // 한 축에 양방향이라 한 줄로 적는다. '확대'와 '축소'를 따로 적으면
  // 서로 다른 자세인 것처럼 읽힌다.
  open: { ko: "다가가기 · 물러나기", en: "Closer · farther" },
  fist: { ko: "처음 배율로", en: "Reset zoom" },
  pinch: { ko: "별 선택", en: "Select" },
};

/**
 * 제스처 사전 겸 실시간 인식 표시.
 *
 * 손동작 인터페이스에는 어포던스가 없다 — 버튼이 없으니 무엇을 할 수 있는지
 * 화면이 알려주지 않으면 사용자는 손을 어떻게 움직여야 할지 알 수 없다.
 * 그래서 이 목록은 장식이 아니라 인터페이스 그 자체이며, 지금 인식된 제스처를
 * 되비쳐 주는 것으로 '내 손이 잡히고 있다'는 확인까지 겸한다.
 */
export default function GestureGuide({ action, handStatus }: Props) {
  const { lang } = useLanguage();
  const t = (ko: string, en: string) => (lang === "ko" ? ko : en);
  const [open, setOpen] = useState(false);

  // 팬 중이면 'open'이 아니라 'pan'이 활성이다
  const activeId: string =
    action.kind === "open" ? (action.panning ? "pan" : "open") : action.kind;

  // 손 인식을 켜는 순간에만 잠깐 펼친다 — 그때가 조작법이 필요한 유일한 순간이고,
  // 계속 띄워 두면 하늘의 왼쪽 위를 영구히 가린다.
  const wasRunning = useRef(handStatus === "running");
  useEffect(() => {
    if (handStatus === "running" && !wasRunning.current) {
      setOpen(true);
      const id = setTimeout(() => setOpen(false), 4200);
      wasRunning.current = true;
      return () => clearTimeout(id);
    }
    wasRunning.current = handStatus === "running";
  }, [handStatus]);

  // 왼쪽 가장자리에서 오른쪽으로 스윽 밀면 열린다.
  useEffect(() => {
    let start: { x: number; y: number } | null = null;
    const down = (e: PointerEvent) => {
      start = e.clientX <= EDGE_ZONE ? { x: e.clientX, y: e.clientY } : null;
    };
    const move = (e: PointerEvent) => {
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = Math.abs(e.clientY - start.y);
      // 아래로 새는 동작이면 하늘을 끄는 것이다 — 손을 뗄 때까지 포기한다.
      if (dy > 24 && dy * OPEN_RATIO > Math.abs(dx)) {
        start = null;
        return;
      }
      if (dx > OPEN_SLOP && dx > dy * OPEN_RATIO) {
        setOpen(true);
        start = null;
      }
    };
    const up = () => {
      start = null;
    };
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const activeRow = ROWS.find((r) => r.id === activeId);

  return (
    <div
      className="pointer-events-none absolute left-0 top-16 z-30 flex items-start gap-2"
      style={{ paddingLeft: "calc(env(safe-area-inset-left) + 10px)" }}
    >
      {/* 접혔을 때의 손잡이. 인식된 제스처를 여기서도 되비쳐 주므로,
          펼치지 않아도 '내 손이 잡히고 있다'는 확인은 계속 된다. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("조작법", "Controls")}
        className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface/70 text-base leading-none backdrop-blur-md transition-colors hover:border-foreground"
        style={{
          borderColor:
            handStatus === "running" && activeRow
              ? "var(--accent-reticle)"
              : undefined,
        }}
      >
        {handStatus === "running" && activeRow ? activeRow.glyph : "?"}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="guide"
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            // 시스템이 여닫는 게 아니라 손가락이 끌어낸 것에 가깝지만, 스프링을
            // 쓰면 목록이 출렁여 읽기 힘들다. 짧은 duration으로 민다.
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => setOpen(false)}
          >
      {/* 임의의 하늘 위에 놓이므로 글래스 패널이 필요하다 — 별자리 이름과
          겹쳤을 때 둘 다 못 읽게 되는 걸 막는 유일한 방법이다. */}
      <div className="pointer-events-auto rounded-2xl border border-hairline bg-surface/80 p-3 backdrop-blur-md">
      <ul className="flex flex-col gap-1.5">
        {ROWS.map((r) => {
          const on = handStatus === "running" && activeId === r.id;
          return (
            <motion.li
              key={r.id}
              className="flex items-center gap-2"
              animate={{ opacity: on ? 1 : 0.34 }}
              transition={{ duration: 0.2 }}
            >
              {/* 인식되는 순간 살짝 커진다 — 제스처가 '먹었다'는 즉각적인 확인이며,
                  손동작 인터페이스에서 이 피드백은 장식이 아니라 기능이다. */}
              <motion.span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] leading-none"
                animate={{
                  scale: on ? 1.12 : 1,
                  borderColor: on ? "var(--accent-reticle)" : "var(--hairline-on-dark)",
                }}
                transition={{ type: "spring", stiffness: 500, damping: 22 }}
                aria-hidden
              >
                {r.glyph}
              </motion.span>
              <span className="type-eyebrow whitespace-nowrap leading-none">
                {t(r.ko, r.en)}
              </span>
              <span
                className="type-eyebrow ml-auto whitespace-nowrap leading-none"
                style={{ color: on ? "var(--accent-reticle)" : "var(--color-muted)" }}
              >
                {t(EFFECT[r.id].ko, EFFECT[r.id].en)}
              </span>
            </motion.li>
          );
        })}
      </ul>

      {handStatus === "off" && (
        <p className="type-caption mt-2.5 max-w-44 border-t border-hairline pt-2.5 text-muted">
          {t(
            "손 인식이 꺼져 있습니다. 드래그와 휠로 둘러볼 수 있어요.",
            "Hand tracking is off — drag and scroll instead.",
          )}
        </p>
      )}
      </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
