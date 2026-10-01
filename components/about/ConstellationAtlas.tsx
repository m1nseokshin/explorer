"use client";

import { motion, useReducedMotion } from "motion/react";
import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Constellation } from "@/lib/constellations";
import { loreOf } from "@/lib/constellationLore";
import { ERAS, eraIndex, eraOf, type Era } from "@/lib/constellationOrigins";
import { buildFigure, type Figure } from "@/lib/figure";
import { formatMag } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { starDisplayName } from "@/lib/stars";
import Reveal from "@/components/ui/Reveal";
import { useAboutSky, type AboutSky } from "./skyData";

/**
 * 88개 별자리 성도.
 *
 * 88칸을 북쪽(위)에서 남쪽(아래) 순으로 늘어놓고, 스크롤이 시대를 지날 때마다
 * 그 시대에 생긴 별자리에 불이 켜진다. 배열 순서 자체가 이야기를 한다 —
 * 프톨레마이오스 시대에는 아래쪽(남천) 칸이 비어 있고, 대항해시대와 라카유가
 * 그 빈칸을 채운다. 설명을 읽기 전에 그림이 먼저 말한다.
 *
 * 칸 하나하나는 버튼이다. 누르면 그 별자리의 그림·유래·면적이 열린다.
 *
 * 성능: 88칸 × 선 수십 개라 SVG 요소가 2천 개 가까이 된다. 호버 강조는 React
 * state가 아니라 CSS 변수(`--hv`)로만 한다 — 칸을 지나갈 때마다 88칸을 다시
 * 그리면 마우스를 움직이는 내내 버벅인다. 칸은 memo로 감싸 시대가 바뀔 때만
 * 다시 그린다.
 */

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  len: number;
}

interface Item {
  c: Constellation;
  fig: Figure;
  lines: Line[];
  era: number;
  /** 같은 시대 안에서의 순서 — 불이 번지는 지연에 쓴다 */
  eraOrder: number;
}

/** 칸 상태 → CSS 변수. 선 불투명도(lo)·그려짐(drawn)·별 불투명도(so). */
type CellState = "future" | "current" | "past" | "all";
const STATE_VARS: Record<CellState, { drawn: number; lo: number; so: number }> = {
  future: { drawn: 0, lo: 0, so: 0.2 },
  current: { drawn: 1, lo: 0.9, so: 1 },
  past: { drawn: 1, lo: 0.38, so: 0.7 },
  all: { drawn: 1, lo: 0.6, so: 0.9 },
};

const starR = (mag: number) => 1.4 + 3.2 * Math.max(0, Math.min(1, (5.5 - mag) / 6.5));

function buildItems(sky: AboutSky): Item[] {
  const { catalog, constellations } = sky;
  const perEra = new Map<number, number>();
  return constellations
    .map((c) => {
      const fig = buildFigure(c.segments, catalog.positions, catalog.mag);
      const id = eraOf(c.id);
      if (!fig || !id) return null;
      const lines = fig.lines.map(([a, b]) => {
        const p = fig.points[a];
        const q = fig.points[b];
        // 둥근 끝이 있으므로 조금 길게 잡아야 다 그렸을 때 틈이 안 남는다
        return { x1: p.x, y1: p.y, x2: q.x, y2: q.y, len: Math.hypot(q.x - p.x, q.y - p.y) + 1 };
      });
      return { c, fig, lines, era: eraIndex(id), eraOrder: 0 };
    })
    .filter((v): v is Item => v !== null)
    .sort((a, b) => b.c.labelDec - a.c.labelDec)
    .map((it) => {
      const k = perEra.get(it.era) ?? 0;
      perEra.set(it.era, k + 1);
      return { ...it, eraOrder: k };
    });
}

export default function ConstellationAtlas() {
  const { lang } = useLanguage();
  const t = (ko: string, en: string) => (lang === "ko" ? ko : en);
  const sky = useAboutSky();
  const items = useMemo(() => (sky ? buildItems(sky) : []), [sky]);

  /** -1 = 아직 아무 시대도 아님, 0..3 = ERAS, 4 = 1922년(모두) */
  const [active, setActive] = useState(-1);
  const [hover, setHover] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const stepRefs = useRef<(HTMLElement | null)[]>([]);
  const FINAL = ERAS.length;

  // 지금 읽고 있는 단계 = 윗변이 기준선을 넘은 마지막 단계. 모바일에서는 성도가
  // 위에 붙어 있어 글이 화면 아래쪽에서 읽히므로 기준선도 아래로 내린다.
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const vh = window.innerHeight;
      const line = window.matchMedia("(min-width: 1024px)").matches ? vh * 0.55 : vh * 0.82;
      let next = -1;
      stepRefs.current.forEach((el, i) => {
        if (el && el.getBoundingClientRect().top < line) next = i;
      });
      setActive((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    raf = requestAnimationFrame(measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const stateOf = (era: number): CellState =>
    active >= FINAL ? "all" : era < active ? "past" : era === active ? "current" : "future";

  const lit = active < 0 ? 0 : items.filter((it) => it.era <= active).length;
  const hovered = hover ? items.find((it) => it.c.id === hover) : undefined;

  const steps: { when: string; title: string; body: string; count: number | null }[] = [
    ...ERAS.map((e) => ({
      when: t(e.whenKo, e.whenEn),
      title: t(e.titleKo, e.titleEn),
      body: t(e.bodyKo, e.bodyEn),
      count: e.members.length,
    })),
    {
      when: "1922 · 1928",
      title: t("88개로 정해진 하늘", "The sky, settled at 88"),
      body: t(
        "1922년 국제천문연맹이 이 88개를 공식 목록으로 정했습니다. 1928년에는 벨기에 천문학자 델포르트가 그은 경계를 채택해 하늘 전체를 빈틈없이 나눴고, 그 뒤로 새 별자리는 생기지 않았습니다. 궁금한 칸을 눌러 보세요.",
        "In 1922 the International Astronomical Union made these 88 the official list, and in 1928 it adopted the boundaries drawn by the Belgian astronomer Delporte, dividing the whole sky with no gaps. No constellation has been added since. Tap any square to look closer.",
      ),
      count: null,
    },
  ];

  return (
    <section className="px-6 sm:px-12 md:px-16 lg:px-24">
      <div className="mx-auto max-w-2xl text-center">
        <Reveal y={12}>
          <p className="type-eyebrow text-muted">{t("88개 별자리", "All 88")}</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h2 className="type-display-lg mt-3 text-balance">
            {t("하늘에 선을 그은 사람들", "The people who drew the lines")}
          </h2>
        </Reveal>
        <Reveal delay={0.16}>
          <p className="type-body-lg mt-6 text-pretty text-foreground-mute">
            {t(
              "별자리는 한꺼번에 생기지 않았습니다. 천칠백 년 동안 사람들이 저마다 자기 자리에서 보이는 만큼 하늘에 선을 그었습니다. 스크롤을 내리면 생긴 순서대로 불이 켜집니다.",
              "The constellations did not arrive all at once. Over seventeen centuries, people drew lines across whatever part of the sky they could see from where they stood. Scroll, and they light up in the order they were made.",
            )}
          </p>
        </Reveal>
      </div>

      <div className="mx-auto mt-16 max-w-6xl lg:mt-8 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        {/* 성도 — 모바일에서는 위에 붙고 글이 그 아래로 지나간다 */}
        {/* 헤더(84px)는 내려갈 때 숨으므로 윗여백은 그보다 조금 작게 둔다 */}
        <div className="sticky top-0 z-10 -mx-6 bg-background px-6 pb-3 pt-20 sm:-mx-12 sm:px-12 md:-mx-16 md:px-16 lg:order-2 lg:mx-0 lg:flex lg:h-dvh lg:flex-col lg:justify-center lg:self-start lg:px-0 lg:pb-0 lg:pt-0">
          <div className="mx-auto w-full max-w-[min(100%,calc(52svh*8/11))] sm:max-w-[min(100%,calc(56svh*11/8))] lg:max-w-none">
            <div className="flex items-baseline justify-between pb-2">
              <span className="type-eyebrow text-muted">↑ {t("북쪽 하늘", "North")}</span>
              <span className="type-mono-hud text-muted" aria-hidden>
                {String(lit).padStart(2, "0")}/88
              </span>
            </div>

            <ul
              className="grid grid-cols-8 sm:grid-cols-11"
              aria-label={t("88개 별자리, 북쪽에서 남쪽 순", "All 88 constellations, north to south")}
            >
              {sky
                ? items.map((it) => (
                    <Cell
                      key={it.c.id}
                      item={it}
                      state={stateOf(it.era)}
                      name={lang === "ko" ? it.c.nameKo : it.c.nameEn}
                      eraTitle={t(ERAS[it.era].titleKo, ERAS[it.era].titleEn)}
                      onHover={setHover}
                      onOpen={setOpenId}
                    />
                  ))
                : Array.from({ length: 88 }, (_, i) => (
                    <li key={i} className="aspect-square" aria-hidden />
                  ))}
            </ul>

            <div className="flex items-baseline justify-between gap-4 pt-2">
              <span className="type-eyebrow shrink-0 text-muted">↓ {t("남쪽 하늘", "South")}</span>
              <span className="type-mono-hud min-w-0 truncate text-right text-foreground-mute" aria-hidden>
                {hovered
                  ? `${lang === "ko" ? hovered.c.nameKo : hovered.c.nameEn.toUpperCase()} · ${hovered.c.areaSqDeg.toLocaleString("en-US")} deg²`
                  : "\u00a0"}
              </span>
            </div>
          </div>
        </div>

        {/* 시대 */}
        <ol className="relative lg:order-1">
          {steps.map((s, i) => (
            <li
              key={i}
              ref={(el) => {
                stepRefs.current[i] = el;
              }}
              className={`flex min-h-[64svh] flex-col justify-start pt-10 transition-opacity duration-500 lg:min-h-[82svh] lg:justify-center lg:pt-0 ${
                i === steps.length - 1 ? "pb-[24svh] lg:pb-0" : ""
              }`}
              style={{ opacity: active === i ? 1 : 0.42 }}
            >
              <p className="type-eyebrow text-muted">
                <span className="type-mono-hud">{String(i + 1).padStart(2, "0")}</span>
                {` · ${s.when}`}
                {s.count != null && ` · ${t(`${s.count}개`, `${s.count} figures`)}`}
              </p>
              <h3 className="type-display-lg mt-3 text-2xl text-balance sm:text-3xl">{s.title}</h3>
              <p className="type-body-lg mt-5 max-w-md text-pretty text-[15px] text-foreground-mute sm:text-base">
                {s.body}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {sky && (
        <Detail
          sky={sky}
          items={items}
          openId={openId}
          onChange={setOpenId}
        />
      )}
    </section>
  );
}

// ─── 칸 ──────────────────────────────────────────────────────────────

const Cell = memo(function Cell({
  item,
  state,
  name,
  eraTitle,
  onHover,
  onOpen,
}: {
  item: Item;
  state: CellState;
  name: string;
  eraTitle: string;
  onHover: (id: string | null) => void;
  onOpen: (id: string) => void;
}) {
  const v = STATE_VARS[state];
  // 같은 시대 안에서 북→남으로 번진다. 50칸이 한꺼번에 켜지면 '켜졌다'만 남고
  // '채워졌다'가 안 남는다.
  const style = {
    "--drawn": v.drawn,
    "--lo": v.lo,
    "--so": v.so,
    "--cd": `${Math.min(1400, item.eraOrder * 28)}ms`,
  } as CSSProperties;
  const id = item.c.id;
  return (
    <li className="aspect-square">
      <button
        type="button"
        className="atlas-cell block h-full w-full rounded-lg"
        style={style}
        aria-label={`${name} — ${eraTitle}`}
        onPointerEnter={() => onHover(id)}
        onPointerLeave={() => onHover(null)}
        onFocus={() => onHover(id)}
        onBlur={() => onHover(null)}
        onClick={() => onOpen(id)}
      >
        <svg viewBox="0 0 100 100" className="block h-full w-full" aria-hidden>
          {item.lines.map((l, k) => (
            <line
              key={k}
              x1={l.x1}
              y1={l.y1}
              x2={l.x2}
              y2={l.y2}
              stroke="currentColor"
              strokeWidth={1.8}
              strokeLinecap="round"
              style={{ "--len": l.len, "--ld": `${Math.min(k, 14) * 70}ms` } as CSSProperties}
            />
          ))}
          {item.fig.points.map((p, k) => (
            <circle key={k} cx={p.x} cy={p.y} r={starR(p.mag)} fill="currentColor" />
          ))}
        </svg>
      </button>
    </li>
  );
});

// ─── 자세히 ──────────────────────────────────────────────────────────

/**
 * 별자리 한 장. 네이티브 <dialog>를 쓴다 — 포커스 가두기, Esc 닫기, 닫은 뒤
 * 원래 칸으로 포커스 되돌리기를 브라우저가 해 준다. 직접 만들면 셋 중 하나는
 * 반드시 빠진다.
 */
function Detail({
  sky,
  items,
  openId,
  onChange,
}: {
  sky: AboutSky;
  items: Item[];
  openId: string | null;
  onChange: (id: string | null) => void;
}) {
  const { lang } = useLanguage();
  const t = (ko: string, en: string) => (lang === "ko" ? ko : en);
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  const idx = openId ? items.findIndex((it) => it.c.id === openId) : -1;
  const item = idx >= 0 ? items[idx] : null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (openId && !d.open) {
      d.showModal();
      // showModal()이 고르는 첫 포커스 대상은 스크롤 영역(크롬은 스크롤 영역도
      // 포커스를 받는다)이라 패널 안쪽에 파란 링이 그어졌다. 닫기 버튼으로 옮긴다.
      closeRef.current?.focus({ preventScroll: true });
    } else if (!openId && d.open) d.close();
  }, [openId]);

  // 뒤 페이지가 같이 스크롤되지 않게. 헤더가 body를 만지므로 html에 건다.
  useEffect(() => {
    if (!openId) return;
    const el = document.documentElement;
    const prev = el.style.overflow;
    el.style.overflow = "hidden";
    return () => {
      el.style.overflow = prev;
    };
  }, [openId]);

  const go = (delta: number) => {
    if (idx < 0) return;
    const next = items[(idx + delta + items.length) % items.length];
    onChange(next.c.id);
  };

  const c = item?.c;
  const era: Era | null = item ? ERAS[item.era] : null;
  const brightest = c && c.brightest >= 0 ? sky.meta[c.brightest] : undefined;
  const monthName =
    c?.bestMonth == null
      ? null
      : lang === "ko"
        ? `${c.bestMonth}월`
        : new Date(2026, c.bestMonth - 1, 1).toLocaleString("en-US", { month: "long" });

  // 숫자만 mono. 시대 이름 같은 한글 문장을 고정폭으로 쓰면 자간이 벌어져 읽기 어렵다.
  const facts: { label: string; value: string; mono: boolean }[] =
    c && era
      ? [
          {
            label: t("시대", "Origin"),
            value: `${t(era.titleKo, era.titleEn)} · ${t(era.whenKo, era.whenEn)}`,
            mono: false,
          },
          {
            label: t("면적", "Area"),
            value: `${c.areaSqDeg.toLocaleString("en-US")} deg² · ${c.areaRank}/88`,
            mono: true,
          },
          ...(c.brightest >= 0
            ? [
                {
                  label: t("가장 밝은 별", "Brightest star"),
                  value: `${starDisplayName(brightest, c.nameGen) ?? "—"} (${formatMag(sky.catalog.mag[c.brightest])})`,
                  mono: true,
                },
              ]
            : []),
          {
            label: t("그림을 이루는 별", "Stars in figure"),
            value: `${new Set(c.segments).size}`,
            mono: true,
          },
          ...(monthName
            ? [{ label: t("보기 좋은 때", "Best seen"), value: monthName, mono: false }]
            : []),
        ]
      : [];

  return (
    <dialog
      ref={ref}
      aria-labelledby="atlas-detail-title"
      onClose={() => onChange(null)}
      // 패널 바깥(::backdrop)을 누르면 닫는다. 안쪽은 전부 내부 div가 받으므로
      // 대상이 dialog 자신인 경우는 바깥뿐이다.
      onClick={(e) => {
        if (e.target === ref.current) ref.current?.close();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        else if (e.key === "ArrowLeft") go(-1);
      }}
      // showModal()은 dialog 자신에 포커스를 준다(스크린리더가 제목을 읽는다).
      // 그 포커스 링이 패널 테두리를 파랗게 덮으므로 끈다 — 안쪽 버튼은 제 링이 있다.
      className="m-auto w-[min(34rem,calc(100%-2rem))] overflow-hidden rounded-2xl border border-hairline bg-background p-0 text-foreground outline-none backdrop:bg-black/80"
    >
      {item && c && (
        <div
          // 안쪽 스크롤을 Lenis가 가로채면 뒤 페이지가 대신 움직인다
          data-lenis-prevent
          className="max-h-[88dvh] overflow-y-auto px-6 pb-6 pt-5 outline-none sm:px-8 sm:pb-8">
          <div className="flex items-center justify-between">
            <p className="type-eyebrow text-muted">
              {c.nameLat} · {c.id}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={() => ref.current?.close()}
              aria-label={t("닫기", "Close")}
              className="-mr-3 flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-300 hover:bg-white/10"
            >
              <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          </div>

          <motion.div
            key={c.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* 그림이 먼저다. 별자리는 '어떤 모양인가'가 첫 질문이다. */}
            <div className="mt-2 rounded-xl border border-hairline p-3">
              <svg viewBox="0 0 100 100" className="block w-full" style={{ aspectRatio: "1 / 1" }} aria-hidden>
                {item.lines.map((l, k) => (
                  <motion.line
                    key={k}
                    x1={l.x1}
                    y1={l.y1}
                    x2={l.x2}
                    y2={l.y2}
                    stroke="currentColor"
                    strokeWidth={0.5}
                    strokeOpacity={0.5}
                    strokeLinecap="round"
                    initial={{ pathLength: reduce ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: reduce ? 0 : 0.9,
                      delay: reduce ? 0 : 0.2 + Math.min(k, 20) * 0.09,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  />
                ))}
                {item.fig.points.map((p, k) => (
                  <circle
                    key={k}
                    cx={p.x}
                    cy={p.y}
                    r={0.9 + 2.1 * Math.max(0, Math.min(1, (5.5 - p.mag) / 6.5))}
                    fill="currentColor"
                  />
                ))}
              </svg>
            </div>

            <h3 id="atlas-detail-title" className="type-display-lg mt-6 text-3xl">
              {lang === "ko" ? c.nameKo : c.nameEn}
            </h3>
            {loreOf(c.id, lang) && (
              <p className="type-body-lg mt-4 text-pretty text-foreground-mute">{loreOf(c.id, lang)}</p>
            )}

            <dl className="mt-6 border-t border-hairline">
              {facts.map((f) => (
                <div key={f.label} className="flex items-start justify-between gap-6 border-b border-hairline py-3.5">
                  <dt className="type-caption shrink-0 text-muted">{f.label}</dt>
                  <dd className={`${f.mono ? "type-mono-hud" : "type-caption"} text-right`}>{f.value}</dd>
                </div>
              ))}
            </dl>
          </motion.div>

          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              onClick={() => go(-1)}
              className="type-button-cap -ml-3 flex h-11 items-center gap-2 rounded-full px-3 text-muted transition-colors duration-300 hover:text-foreground"
            >
              <span aria-hidden>←</span>
              {t("이전", "Prev")}
            </button>
            <span className="type-mono-hud text-muted" aria-hidden>
              {String(idx + 1).padStart(2, "0")}/{items.length}
            </span>
            <button
              type="button"
              onClick={() => go(1)}
              className="type-button-cap -mr-3 flex h-11 items-center gap-2 rounded-full px-3 text-muted transition-colors duration-300 hover:text-foreground"
            >
              {t("다음", "Next")}
              <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
