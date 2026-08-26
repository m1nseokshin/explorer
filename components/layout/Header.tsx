"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";
import { nav, site } from "@/lib/content";

export default function Header() {
  const { lang, setLang, toggleLang } = useLanguage();
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - last;
      last = y;
      if (y < 80) setHidden(false);
      else if (delta > 4) setHidden(true);
      else if (delta < -4) setHidden(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-[10000] transition-transform duration-300 ${
          hidden && !open ? "-translate-y-full" : "translate-y-0"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 sm:px-12 md:px-16 lg:px-24">
          {/* 모바일에서는 로고가 헤더 폭의 절반 가까이를 먹어 메뉴와 부딪힌다.
              디스플레이 서체 + 넓은 자간이라 같은 px여도 체감 크기가 크다. */}
          <Link href="/" className="type-display-lg text-base leading-none sm:text-lg md:text-xl">
            {site.name}
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {nav.map((n) => {
              const active = pathname === n.href;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className="type-eyebrow relative transition-opacity duration-300 hover:opacity-100"
                  style={{ opacity: active ? 1 : 0.62 }}
                >
                  {lang === "ko" ? n.ko : n.en}
                  {/* 현재 위치 밑줄이 항목 사이를 미끄러진다 — layoutId 하나로
                      두 요소가 같은 것으로 취급돼 자연스럽게 이어진다. */}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-0.5 left-0 right-0 h-px bg-current"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    />
                  )}
                </Link>
              );
            })}
            <motion.button
              type="button"
              onClick={toggleLang}
              whileTap={{ scale: 0.94 }}
              transition={{ type: "spring", stiffness: 600, damping: 30 }}
              className="type-eyebrow rounded-full border border-hairline px-3 py-1 transition-colors duration-300 hover:border-foreground"
            >
              {lang === "ko" ? "EN" : "한국어"}
            </motion.button>
          </nav>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={open}
            className="flex h-11 w-11 flex-col items-center justify-center gap-[5px] md:hidden"
          >
            {/* 3줄 → X. 가운데 줄은 사라지고 위아래 줄이 가운데로 모여 교차한다. */}
            <span
              className={`block h-px w-6 bg-current transition-transform duration-300 ease-in-out ${
                open ? "translate-y-[6px] rotate-45" : ""
              }`}
            />
            <span
              className={`block h-px w-6 bg-current transition-opacity duration-200 ease-in-out ${
                open ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`block h-px w-6 bg-current transition-transform duration-300 ease-in-out ${
                open ? "-translate-y-[6px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[9999] transition-opacity duration-400 md:hidden ${
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ background: "rgba(0,0,0,0.98)", transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)" }}
      >
        <div
          className="flex h-full flex-col px-6"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 88px)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)",
          }}
        >
          <nav className="flex flex-1 flex-col justify-center divide-y divide-white/10">
            {nav.map((n, i) => (
              <motion.div
                key={n.href}
                initial={false}
                animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                transition={{
                  duration: 0.4,
                  delay: open ? 0.08 + i * 0.06 : 0,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="type-display-lg flex items-center justify-between py-6 text-3xl"
                >
                  {lang === "ko" ? n.ko : n.en}
                  <span className="type-mono-hud text-muted">0{i + 1}</span>
                </Link>
              </motion.div>
            ))}
          </nav>

          {/*
            언어는 이동 수단이 아니라 환경 설정이다. 홈·항해·소개와 같은 크기로
            나열하면 "네 번째 페이지"처럼 읽힌다. 하단으로 내리고 스위치 형태로
            바꿔 위계를 분명히 한다.
          */}
          <motion.div
            initial={false}
            animate={open ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
            transition={{
              duration: 0.4,
              delay: open ? 0.08 + nav.length * 0.06 : 0,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="flex items-center justify-between border-t border-white/10 pt-6"
          >
            <span className="type-eyebrow text-muted">
              {lang === "ko" ? "언어" : "Language"}
            </span>
            <div
              role="group"
              aria-label={lang === "ko" ? "언어 선택" : "Language"}
              className="flex items-center rounded-full border border-hairline p-0.5"
            >
              {(["ko", "en"] as const).map((code) => {
                const active = lang === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setLang(code)}
                    aria-pressed={active}
                    className="type-button-cap relative rounded-full px-4 py-2"
                  >
                    {active && (
                      <motion.span
                        layoutId="lang-pill"
                        className="absolute inset-0 rounded-full bg-foreground"
                        transition={{ type: "spring", stiffness: 480, damping: 36 }}
                      />
                    )}
                    <span
                      className="relative z-10 transition-colors duration-200"
                      style={{ color: active ? "#000" : "var(--color-muted)" }}
                    >
                      {code === "ko" ? "한국어" : "EN"}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </>
  );
}
