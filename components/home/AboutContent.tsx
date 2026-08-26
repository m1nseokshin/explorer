"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import Reveal from "@/components/ui/Reveal";
import { site } from "@/lib/content";
import { useLanguage } from "@/lib/i18n";

export default function AboutContent() {
  const { lang } = useLanguage();
  const t = (ko: string, en: string) => (lang === "ko" ? ko : en);

  const profile: { labelKo: string; labelEn: string; value: string }[] = [
    {
      labelKo: "만든 사람",
      labelEn: "Made by",
      value: lang === "ko" ? site.author.ko : site.author.en,
    },
    {
      labelKo: "소속",
      labelEn: "Studying",
      value: t(
        "부산대학교 예술대학 디자인학과 디자인앤테크놀로지전공",
        "Design & Technology, Department of Design, Pusan National University",
      ),
    },
    {
      labelKo: "관심 분야",
      labelEn: "Focus",
      value: t("HCI · 웹 개발", "HCI · Web development"),
    },
    {
      labelKo: "활동",
      labelEn: "Programme",
      value: t("Korea Design Membership Plus 7기", "Korea Design Membership Plus, 7th"),
    },
  ];

  // 아이콘 + 이름만. 주소를 그대로 늘어놓으면 읽을 일도 없는 문자열이
  // 화면을 차지하고, 눌러야 한다는 사실도 오히려 흐려진다.
  const links: { label: string; href: string; icon: ReactNode }[] = [
    {
      label: "Email",
      href: `mailto:${site.email}`,
      icon: (
        <>
          <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
          <path d="M3 6l7 5 7-5" />
        </>
      ),
    },
    {
      label: "GitHub",
      href: site.github,
      // GitHub 마크는 원래 채움 도형이라 선으로 그리면 윤곽만 남아 뭉개진다
      icon: (
        <path
          fill="currentColor"
          stroke="none"
          d="M10 2.2a7.8 7.8 0 0 0-2.47 15.2c.39.07.53-.17.53-.38v-1.33c-2.17.47-2.63-1.05-2.63-1.05-.35-.9-.87-1.14-.87-1.14-.71-.49.05-.48.05-.48.79.06 1.2.81 1.2.81.7 1.2 1.84.85 2.29.65.07-.51.27-.85.5-1.05-1.73-.2-3.55-.87-3.55-3.86 0-.85.3-1.55.8-2.1-.08-.2-.35-.99.08-2.06 0 0 .65-.21 2.14.8a7.4 7.4 0 0 1 3.9 0c1.49-1.01 2.14-.8 2.14-.8.43 1.07.16 1.86.08 2.06.5.55.8 1.25.8 2.1 0 3-1.83 3.66-3.57 3.85.28.24.53.72.53 1.46v2.16c0 .21.14.46.54.38A7.8 7.8 0 0 0 10 2.2Z"
        />
      ),
    },
    {
      label: "Instagram",
      href: site.instagram,
      icon: (
        <>
          <rect x="3" y="3" width="14" height="14" rx="4" />
          <circle cx="10" cy="10" r="3.4" />
          <circle cx="14.2" cy="5.8" r="0.9" />
        </>
      ),
    },
    {
      label: t("포트폴리오", "Portfolio"),
      href: site.portfolio,
      icon: (
        <>
          <circle cx="10" cy="10" r="7.2" />
          <path d="M2.9 10h14.2M10 2.8c1.9 2 2.9 4.5 2.9 7.2s-1 5.2-2.9 7.2c-1.9-2-2.9-4.5-2.9-7.2s1-5.2 2.9-7.2Z" />
        </>
      ),
    },
  ];

  return (
    <div className="px-6 pb-36 pt-36 sm:px-12 md:px-16 lg:px-24">
      <div className="mx-auto max-w-3xl text-center">
        <Reveal y={12}>
          <p className="type-eyebrow text-muted">{t("소개", "About")}</p>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="type-display-xl mt-4 text-balance">
            {t("왜 이걸 만들었나", "Why I made this")}
          </h1>
        </Reveal>

        {/* ── 계기 ───────────────────────────────────────────────── */}
        <section className="mt-20">
          <Reveal>
            <h2 className="type-display-lg text-balance">
              {t("도구였던 하늘", "The sky was an instrument")}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="type-body-lg mx-auto mt-6 max-w-xl text-pretty text-foreground-mute">
              {t(
                "별자리는 원래 감상거리가 아니었습니다. 육지가 보이지 않는 바다에서 자기 위치를 알아낼 수 있는 유일한 수단이었고, 사람들은 그걸 읽는 법을 목숨 걸고 배웠습니다. 북극성의 고도가 곧 위도라는 사실 하나로 수백 년 동안 배가 대양을 건넜습니다.",
                "Constellations were not scenery. Out of sight of land they were the only way to know where you were, and people learned to read them because their lives depended on it. Ships crossed oceans for centuries on a single fact: the altitude of Polaris is your latitude.",
              )}
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <p className="type-body-lg mx-auto mt-6 max-w-xl text-pretty text-foreground-mute">
              {t(
                "지금 별자리 앱은 대부분 도감처럼 생겼습니다. 정확하지만 도구처럼 느껴지지는 않습니다. 그 감각을 되돌려 놓고 싶었습니다 — 화면을 넘기는 게 아니라, 하늘을 직접 겨누고 항해하는 것에 가깝게.",
                "Most star apps today look like field guides. Accurate, but they don't feel like instruments. I wanted that feeling back — less like flipping through pages, more like aiming something at the sky and steering it.",
              )}
            </p>
          </Reveal>
        </section>

        {/* ── 실험 ───────────────────────────────────────────────── */}
        <section className="mt-20">
          <Reveal>
            <h2 className="type-display-lg text-balance">
              {t("두 가지를 실험했습니다", "Two things I wanted to test")}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="type-body-lg mx-auto mt-6 max-w-xl text-pretty text-foreground-mute">
              {t(
                "첫째, 손동작만으로 도구를 다룰 수 있을까. 버튼이 없으면 어포던스도 없습니다. 무엇을 할 수 있는지 화면이 먼저 말해 주고, 지금 손이 잡히고 있다는 걸 계속 증명해야 합니다. 그래서 제스처 목록은 도움말이 아니라 인터페이스 그 자체이고, 인식된 손은 스켈레톤으로 되비칩니다.",
                "First: can a gesture alone drive an instrument? Without buttons there are no affordances. The screen has to say what is possible, and keep proving that it can see you. So the gesture list is not a help panel — it is the interface — and the tracked hand is mirrored back as a skeleton.",
              )}
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <p className="type-body-lg mx-auto mt-6 max-w-xl text-pretty text-foreground-mute">
              {t(
                "둘째, 진짜 계산을 넣으면 감각이 달라지는가. 그림을 붙이는 대신 세차·장동·지방항성시를 실제로 풀었습니다. 북극성의 고도가 정확히 관측지의 위도로 나오는 걸 화면에서 확인할 수 있고, 그게 확인되는 순간부터 화면이 그림이 아니라 계기로 읽힙니다.",
                "Second: does real computation change how it feels? Instead of placing artwork, it actually solves precession, nutation and local sidereal time. You can check on screen that Polaris sits at exactly your latitude — and once you have checked, the screen stops reading as a picture and starts reading as a gauge.",
              )}
            </p>
          </Reveal>
        </section>

        {/* ── 정확성 ─────────────────────────────────────────────── */}
        <section className="mt-20">
          <Reveal>
            <h2 className="type-display-lg text-balance">
              {t("어디까지 맞는가", "How far the accuracy goes")}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="type-body-lg mx-auto mt-6 max-w-xl text-pretty text-foreground-mute">
              {t(
                "별 위치는 0.01° 안쪽으로 맞습니다. 달의 지평시차(최대 1°)까지 넣었는데, 이걸 빼먹으면 화면 속 달이 실제 달에서 달 지름 두 개만큼 빗나가기 때문입니다. 반대로 대기굴절은 넣지 않았습니다 — 하늘 전체를 강체로 회전시키는 구조라 고도에 따라 달라지는 굴절을 적용할 수 없고, 그 대가로 지평선의 별이 약 0.5° 낮게 그려집니다. 화면상 6픽셀입니다.",
                "Star positions are good to better than 0.01°. The Moon's topocentric parallax is included — up to a degree, and leaving it out puts the rendered Moon two Moon-widths off the real one. Atmospheric refraction is not: the whole sky is rotated as one rigid shell, so an altitude-dependent correction cannot be applied. The cost is that a star on the horizon renders about 0.5° low — roughly six pixels.",
              )}
            </p>
          </Reveal>
          <Reveal delay={0.18}>
            <p className="type-body-lg mx-auto mt-6 max-w-xl text-pretty text-foreground-mute">
              {t(
                "손 인식은 조명에 약합니다. 역광이거나 아주 어두우면 관절 추정이 끊기고, 스켈레톤이 사라지는 것으로 바로 알 수 있습니다. 그때는 드래그와 휠로 똑같이 항해할 수 있습니다 — 어떤 실패 경로에서도 막다른 길이 되지 않게 만들었습니다.",
                "Hand tracking is fragile in bad light. Backlight or near-darkness breaks the joint estimate, and you can see it happen because the skeleton disappears. Dragging and scrolling then get you to exactly the same place: no failure path is a dead end.",
              )}
            </p>
          </Reveal>
        </section>

        {/* ── 만든 사람 ──────────────────────────────────────────── */}
        <section className="mt-20 border-t border-hairline pt-14">
          <Reveal>
            <h2 className="type-display-lg text-balance">{t("만든 사람", "Who made it")}</h2>
          </Reveal>

          <dl className="mx-auto mt-8 max-w-xl border-t border-hairline text-left">
            {profile.map((f, i) => (
              <motion.div
                key={f.labelEn}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start justify-between gap-6 border-b border-hairline py-3.5"
              >
                <dt className="type-caption shrink-0 text-muted">
                  {lang === "ko" ? f.labelKo : f.labelEn}
                </dt>
                <dd className="type-caption text-right">{f.value}</dd>
              </motion.div>
            ))}
          </dl>

          <Reveal delay={0.18}>
            <p className="type-eyebrow mt-12 text-muted">{t("연락처", "Contact")}</p>
          </Reveal>
          <Reveal delay={0.24}>
            <ul className="mx-auto mt-4 flex max-w-xl flex-wrap items-center justify-center gap-2">
              {links.map((l) => (
                <li key={l.label}>
                  <motion.a
                    href={l.href}
                    target={l.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel="noreferrer noopener"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="type-button-cap tap-56 flex items-center gap-2 rounded-full border border-hairline px-4 py-3 transition-colors duration-300 hover:border-foreground"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      width="15"
                      height="15"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                      className="shrink-0"
                    >
                      {l.icon}
                    </svg>
                    {l.label}
                  </motion.a>
                </li>
              ))}
            </ul>
          </Reveal>
        </section>
      </div>
    </div>
  );
}
