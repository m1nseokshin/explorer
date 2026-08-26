"use client";

import { AnimatePresence, motion, useMotionValue, type PanInfo } from "motion/react";
import { useEffect, useState } from "react";
import type { Figure } from "@/lib/figure";
import { useLanguage } from "@/lib/i18n";

export interface SkyObject {
  kind: "star" | "constellation" | "body";
  /** 부제 (예: "오리온자리 · α Orionis") */
  eyebrow: string;
  title: string;
  description?: string;
  facts: { labelKo: string; labelEn: string; value: string }[];
  /** 별자리를 이루는 주요 별. 밝은 순. */
  members?: { name: string; desig: string | null; mag: number }[];
  /** 별자리 그림만 떼어낸 평면 도형. */
  figure?: Figure;
}

interface Props {
  object: SkyObject | null;
  onClose: () => void;
}

const PEEK_HEIGHT = 120; // 미니 상태 높이 (px)

/**
 * 별자리 그림.
 *
 * 하늘에서 그 별자리만 떼어 내 보여준다. 별 크기는 화면의 하늘과 같은 규칙
 * (등급이 낮을수록 크게)을 따라야 '같은 것'으로 읽힌다.
 *
 * 선이 먼저 그려지고 별이 그 위에 얹힌다 — 순서를 뒤집으면 선이 별 한가운데를
 * 가로질러 별이 반으로 갈라져 보인다.
 */
function FigureChart({ figure }: { figure: Figure }) {
  const r = (mag: number) => 0.9 + 2.1 * Math.max(0, Math.min(1, (5.5 - mag) / 6.5));
  return (
    <div className="mt-5 rounded-xl border border-hairline bg-background/60 p-3 sm:mt-8">
      <svg
        viewBox="0 0 100 100"
        className="block w-full"
        style={{ aspectRatio: "1 / 1" }}
        aria-hidden
      >
        {figure.lines.map(([a, b], i) => (
          <line
            key={i}
            x1={figure.points[a].x}
            y1={figure.points[a].y}
            x2={figure.points[b].x}
            y2={figure.points[b].y}
            stroke="currentColor"
            strokeWidth={0.45}
            strokeOpacity={0.42}
            strokeLinecap="round"
          />
        ))}
        {figure.points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={r(p.mag)} fill="currentColor" />
        ))}
      </svg>
    </div>
  );
}

/** 스프링 프리셋. 시트가 손가락을 따라오다 멈추는 감각을 만든다. */
const SHEET_SPRING = { type: "spring" as const, stiffness: 420, damping: 40, mass: 0.9 };
/** 속도가 이 값을 넘으면 거리와 무관하게 그 방향으로 확정한다 (px/s). */
const FLING_VELOCITY = 550;

/**
 * 선택한 천체 패널.
 *
 * 모바일에서는 바텀시트, ≥sm에서는 우측 드로어. 벤치마크 프로젝트의 InfoPanel
 * 패턴을 이식하되 드래그를 Motion에 맡겼다 — 손으로 짠 버전은 '얼마나 내렸나'만
 * 볼 수 있었고 '얼마나 빠르게 내렸나'는 못 봤다. 짧게 톡 튕겨서 닫는 동작이
 * 안 되면 네이티브 시트처럼 느껴지지 않는다.
 */
export default function ObjectPanel({ object, onClose }: Props) {
  const { lang } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const dragY = useMotionValue(0);

  useEffect(() => {
    if (object) setExpanded(false);
  }, [object]);

  useEffect(() => {
    const sync = () => setIsNarrow(window.innerWidth < 640);
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const height = expanded ? "75dvh" : `${PEEK_HEIGHT}px`;

  /**
   * 드래그를 놓았을 때의 판정.
   * 속도를 먼저 본다 — 사용자가 의도를 이미 표현했는데 거리로 뒤집으면 답답하다.
   */
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;

    if (velocity.y > FLING_VELOCITY) {
      // 아래로 튕김: 펼쳐져 있으면 접고, 접혀 있으면 닫는다
      if (expanded) setExpanded(false);
      else onClose();
      return;
    }
    if (velocity.y < -FLING_VELOCITY) {
      setExpanded(true);
      return;
    }

    // 속도가 애매하면 거리로 판정
    if (expanded) {
      if (offset.y > 140) setExpanded(false);
    } else {
      if (offset.y > 60) onClose();
      else if (offset.y < -40) setExpanded(true);
    }
  };

  return (
    <AnimatePresence>
      {object && (
        <motion.aside
          key="object-panel"
          // 세로(모바일) / 가로(데스크톱) 진입 방향이 다르다
          initial={isNarrow ? { y: "100%" } : { x: "100%" }}
          animate={isNarrow ? { y: 0 } : { x: 0 }}
          exit={isNarrow ? { y: "100%" } : { x: "100%" }}
          transition={SHEET_SPRING}
          style={{
            height: isNarrow ? height : undefined,
            y: isNarrow ? dragY : undefined,
          }}
          // 시트를 위로 끌어 펼치고 아래로 끌어 닫는다. 위쪽 여유를 조금만 주어
          // 스프링이 되튕기는 느낌을 남긴다.
          drag={isNarrow ? "y" : false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.12, bottom: 0.55 }}
          dragMomentum={false}
          onDragEnd={handleDragEnd}
          className="fixed z-40 flex flex-col bg-surface/97
            inset-x-0 bottom-0 rounded-t-2xl border-t border-hairline shadow-2xl
            sm:inset-x-auto sm:bottom-auto sm:right-0 sm:top-0 sm:h-full sm:w-full sm:max-w-md sm:rounded-none sm:border-l sm:border-t-0"
        >
          <motion.div
            layout
            transition={SHEET_SPRING}
            className="relative flex h-full w-full flex-col"
          >
            {/* 모바일 드래그 핸들 겸 미니 헤더 */}
            <div
              onClick={() => setExpanded((v) => !v)}
              className="flex cursor-grab select-none flex-col items-center justify-center pb-2 pt-3 active:cursor-grabbing sm:hidden"
            >
              <div className="mb-2 h-1.5 w-12 rounded-full bg-muted/60" />
              <AnimatePresence initial={false}>
                {!expanded && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="w-full px-6"
                  >
                    <p className="type-eyebrow mb-0.5 text-xs leading-relaxed text-muted">
                      {object.eyebrow}
                    </p>
                    <h3 className="type-display-lg text-3xl text-foreground">
                      {object.title}
                    </h3>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={lang === "ko" ? "패널 닫기" : "Close panel"}
              className="type-button-cap absolute right-5 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-hairline transition-colors hover:border-foreground sm:right-6 sm:top-20 sm:h-10 sm:w-10"
            >
              ✕
            </button>

            <div
              onScroll={() => {
                if (!expanded) setExpanded(true);
              }}
              className="flex-1 overflow-y-auto px-6 pb-12 pt-2 sm:px-8 sm:pt-24"
            >
              <div className={!expanded ? "hidden sm:block" : "block"}>
                <p className="type-eyebrow mb-1 text-sm leading-loose text-muted sm:text-base">
                  {object.eyebrow}
                </p>
                <h2 className="type-display-lg text-4xl sm:text-5xl">{object.title}</h2>
              </div>

              {/* 그림이 먼저다. 별자리는 '어떤 모양인가'가 첫 질문이고,
                  이름과 숫자는 그 모양을 확인한 뒤에야 의미가 붙는다. */}
              {object.figure && <FigureChart figure={object.figure} />}

              {object.description && (
                <p className="type-body-lg mt-4 text-foreground-mute sm:mt-8">
                  {object.description}
                </p>
              )}

              {object.members && object.members.length > 0 && (
                <section className="mt-8 sm:mt-10">
                  <p className="type-eyebrow text-muted">
                    {lang === "ko" ? "이 별자리를 이루는 별" : "Stars in this figure"}
                  </p>
                  <ul className="mt-2 border-t border-hairline">
                    {object.members.map((m, i) => (
                      <motion.li
                        key={`${m.name}-${i}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.25, delay: 0.04 + i * 0.025 }}
                        className="flex items-baseline justify-between gap-4 border-b border-hairline py-2.5"
                      >
                        <span className="type-caption">
                          {m.name}
                          {m.desig && m.desig !== m.name && (
                            // 바이어 부호는 그리스 '소문자'가 정식 표기다.
                            // .type-eyebrow의 uppercase가 γ를 Γ로 바꿔버리므로 끈다.
                            <span className="type-eyebrow ml-2 text-xs normal-case text-muted">
                              {m.desig}
                            </span>
                          )}
                        </span>
                        {/* 등급 막대 — 숫자만 보면 밝기 차이가 감으로 안 온다.
                            낮은 숫자가 밝다는 규약도 여기서 시각적으로 해소된다. */}
                        <span className="flex shrink-0 items-center gap-2">
                          <span
                            className="h-px bg-current"
                            style={{
                              width: 44,
                              // 카탈로그 한계등급이 8이다. 6.5로 두면 7등성부터
                              // 막대가 음수가 되어 전부 최저값으로 붙어 버린다.
                              opacity: Math.max(0.12, Math.min(1, (8 - m.mag) / 9)),
                            }}
                            aria-hidden
                          />
                          <span className="type-mono-hud w-10 text-right">
                            {m.mag.toFixed(2)}
                          </span>
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </section>
              )}

              <dl className="mt-8 border-t border-hairline sm:mt-10">
                {object.facts.map((fact, i) => (
                  <motion.div
                    key={fact.labelEn}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    // 값이 위에서부터 차례로 들어온다. 하늘의 모션과 싸우지 않게
                    // opacity만 쓴다 (DESIGN.md: HUD 등장은 transform 금지).
                    transition={{ duration: 0.25, delay: 0.04 + i * 0.03 }}
                    className="flex items-center justify-between gap-6 border-b border-hairline py-3.5"
                  >
                    <dt>
                      <span className="type-caption block font-medium">
                        {lang === "ko" ? fact.labelKo : fact.labelEn}
                      </span>
                      <span className="type-eyebrow mt-0.5 block text-xs text-muted">
                        {lang === "ko" ? fact.labelEn : fact.labelKo}
                      </span>
                    </dt>
                    <dd className="type-mono-hud text-right">{fact.value}</dd>
                  </motion.div>
                ))}
              </dl>
            </div>
          </motion.div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
