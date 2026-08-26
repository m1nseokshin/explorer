"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRef } from "react";
import { useLanguage } from "@/lib/i18n";
import HomeStarfield from "./HomeStarfield";

export default function HomeHero() {
  const { lang } = useLanguage();
  const t = (ko: string, en: string) => (lang === "ko" ? ko : en);
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();

  // 스크롤에 따라 히어로가 서서히 물러난다. 다음 섹션이 위로 올라오는 게 아니라
  // 히어로가 뒤로 빠지는 느낌이라, 페이지가 한 덩어리로 이어져 보인다.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 90]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, reduce ? 1 : 0]);

  const rise = (delay: number) => ({
    initial: reduce ? { opacity: 1 } : { opacity: 0, y: 18 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: reduce ? 0 : 0.8,
      delay: reduce ? 0 : delay,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  });

  return (
    <section
      ref={ref}
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 pb-32 pt-32 text-center sm:px-12 md:px-16 lg:px-24"
    >
      {/* 순수 검정 캔버스 — 여기선 벤치마크의 규칙이 수정 없이 적용된다.
          별밭은 그 위에 그려지지만 배경이지 콘텐츠가 아니므로 z-0에 둔다. */}
      <HomeStarfield />

      <motion.div
        style={{ y, opacity }}
        // 텍스트가 포인터를 삼키면 그 위에서는 별이 안 생긴다. 컨테이너는
        // 포인터를 통과시키고, 실제로 눌러야 하는 것(CTA)만 되살린다.
        className="pointer-events-none relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center"
      >
        <motion.p {...rise(0)} className="type-eyebrow text-muted">
          {t("천측 항법 · 손으로 항해", "Celestial navigation · Sailed by hand")}
        </motion.p>
        <motion.h1 {...rise(0.1)} className="type-display-xxl mt-5 text-balance">
          {t("별로 길을 찾다", "Find your way by the stars")}
        </motion.h1>
        <motion.p
          {...rise(0.2)}
          className="type-body-lg mt-8 max-w-xl text-pretty text-foreground-mute"
        >
          {t(
            "수천 년 동안 뱃사람은 별을 보고 자기 위치를 알아냈습니다. 북극성의 고도가 곧 위도였습니다. 그 오래된 도구를, 지금 당신이 서 있는 자리의 하늘로 되돌려 놓았습니다. 항해는 손으로 합니다.",
            "For thousands of years sailors fixed their position by the stars — the altitude of Polaris simply was your latitude. This puts that old instrument back in your hands, aimed at the sky above wherever you happen to be standing. You sail it with your hand.",
          )}
        </motion.p>
        <motion.div {...rise(0.32)} className="pointer-events-auto mt-14">
          <Link href="/explore/" className="btn-ghost inline-block">
            {t("항해 시작", "Set sail")}
          </Link>
        </motion.div>
      </motion.div>

      <motion.p
        {...rise(0.5)}
        style={{ opacity }}
        className="type-eyebrow scroll-hint pointer-events-none absolute inset-x-0 bottom-8 z-10 text-center text-muted"
      >
        {t("아래로", "Scroll")}
      </motion.p>
    </section>
  );
}
