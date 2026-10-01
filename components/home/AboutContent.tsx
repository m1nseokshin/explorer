"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import AboutFilm from "@/components/about/AboutFilm";
import ConstellationAtlas from "@/components/about/ConstellationAtlas";
import Reveal from "@/components/ui/Reveal";
import { site } from "@/lib/content";
import { useLanguage } from "@/lib/i18n";

/** 본문 문단 — 같은 클래스를 여덟 번 적지 않으려고 */
function Para({ delay, children }: { delay: number; children: ReactNode }) {
  return (
    <Reveal delay={delay}>
      <p className="type-body-lg mx-auto mt-6 max-w-xl text-pretty text-foreground-mute">
        {children}
      </p>
    </Reveal>
  );
}

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

  // 순서: 필름(보여 준다) → 왜 만들었나(말한다) → 성도(직접 만져 본다) →
  // 정확성·만든 사람(확인한다). 필름이 h1을 갖는다 — 첫 화면의 첫 문장이다.
  return (
    <>
      <AboutFilm />

      <div className="px-6 pb-28 pt-28 sm:px-12 sm:pb-36 sm:pt-36 md:px-16 lg:px-24">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal y={12}>
            <p className="type-eyebrow text-muted">{t("만든 이유", "Why it exists")}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="type-display-xl mt-4 text-balance">
              {t("펼쳐 보는 도감 대신 겨누는 계기", "An instrument to aim, not a guide to browse")}
            </h2>
          </Reveal>

          {/* ── 계기 ───────────────────────────────────────────────── */}
          <section className="mt-20">
            <Reveal>
              <h3 className="type-display-lg text-balance">
                {t("바다 위의 유일한 지도", "The only map at sea")}
              </h3>
            </Reveal>
            <Para delay={0.1}>
              {t(
                "별자리는 원래 감상거리가 아니었습니다. 육지가 보이지 않는 바다에서 자기 위치를 알아낼 수 있는 유일한 수단이었고 사람들은 그걸 읽는 법을 목숨 걸고 배웠습니다. 북극성의 고도가 곧 위도라는 사실 하나로 수백 년 동안 배가 대양을 건넜습니다.",
                "Constellations were not scenery. Out of sight of land they were the only way to know where you were, and people learned to read them because their lives depended on it. Ships crossed oceans for centuries on a single fact: the altitude of Polaris is your latitude.",
              )}
            </Para>
            <Para delay={0.18}>
              {t(
                "지금 별자리 앱은 대부분 도감처럼 생겼습니다. 정확하지만 도구처럼 느껴지지는 않습니다. 화면을 넘겨 보는 도감 말고 하늘을 직접 겨누고 항해하는 도구의 감각을 되돌려 놓고 싶었습니다.",
                "Most star apps today look like field guides. Accurate, but they don't feel like instruments. I wanted that feeling back: less like flipping through pages, more like aiming something at the sky and steering it.",
              )}
            </Para>
          </section>

          {/* ── 실험 ───────────────────────────────────────────────── */}
          <section className="mt-20">
            <Reveal>
              <h3 className="type-display-lg text-balance">
                {t("두 가지 질문", "Two questions")}
              </h3>
            </Reveal>
            <Para delay={0.1}>
              {t(
                "첫째, 손동작만으로 도구를 다룰 수 있을까. 버튼이 없으면 어포던스도 없습니다. 무엇을 할 수 있는지 화면이 먼저 말해 주고 지금 손이 잡히고 있다는 걸 계속 증명해야 합니다. 그래서 제스처 목록을 도움말 창에 숨기지 않고 화면에 늘 띄워 두었고, 인식된 손은 스켈레톤으로 되비칩니다.",
                "First: can a gesture alone drive an instrument? Without buttons there are no affordances. The screen has to say what is possible, and keep proving that it can see you. So the gesture list stays on screen instead of hiding in a help panel, and the tracked hand is mirrored back as a skeleton.",
              )}
            </Para>
            <Para delay={0.18}>
              {t(
                "둘째, 진짜 계산을 넣으면 감각이 달라지는가. 그림을 붙이는 대신 세차·장동·지방항성시를 실제로 풀었습니다. 북극성의 고도가 정확히 관측지의 위도로 나오는 걸 화면에서 확인할 수 있습니다. 그걸 한 번 확인하고 나면 화면이 그림보다 계기처럼 읽히기 시작합니다.",
                "Second: does real computation change how it feels? Instead of placing artwork, it actually solves precession, nutation and local sidereal time. You can check on screen that Polaris sits at exactly your latitude, and once you have, the screen starts to read less like a picture and more like a gauge.",
              )}
            </Para>
          </section>
        </div>
      </div>

      {/* ── 88개 성도 ─────────────────────────────────────────────── */}
      <ConstellationAtlas />

      <div className="px-6 pb-36 pt-28 sm:px-12 sm:pt-36 md:px-16 lg:px-24">
        <div className="mx-auto max-w-3xl text-center">
          {/* ── 정확성 ─────────────────────────────────────────────── */}
          <section>
            <Reveal>
              <h2 className="type-display-lg text-balance">
                {t("정확도와 한계", "Accuracy and its limits")}
              </h2>
            </Reveal>
            <Para delay={0.1}>
              {t(
                "별 위치는 0.01° 안쪽으로 맞습니다. 달의 지평시차(최대 1°)까지 넣었습니다. 이걸 빼면 화면 속 달이 실제 달에서 달 지름 두 개만큼 빗나갑니다. 대기굴절은 넣지 않았습니다. 하늘 전체를 강체로 돌리는 구조라 고도마다 다른 굴절을 줄 수 없어서, 지평선의 별이 약 0.5° 낮게 그려집니다. 화면에서 6픽셀쯤입니다.",
                "Star positions are good to better than 0.01°. The Moon's topocentric parallax, up to a degree, is included; leave it out and the rendered Moon sits two Moon-widths off the real one. Atmospheric refraction is not. The whole sky turns as one rigid shell, so there is no way to bend it by a different amount at each altitude, and a star on the horizon is drawn about 0.5° low. That is roughly six pixels.",
              )}
            </Para>
            <Para delay={0.18}>
              {t(
                "손 인식은 조명에 약합니다. 역광이거나 아주 어두우면 관절 추정이 끊기는데, 스켈레톤이 사라지니 바로 알 수 있습니다. 그때도 드래그와 휠로 똑같이 항해할 수 있습니다. 어떻게 실패하든 막다른 길이 되지 않게 만들었습니다.",
                "Hand tracking is fragile in bad light. Backlight or near-darkness breaks the joint estimate, and you can see it happen because the skeleton disappears. Dragging and scrolling then get you to exactly the same place: no failure path is a dead end.",
              )}
            </Para>
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
    </>
  );
}
