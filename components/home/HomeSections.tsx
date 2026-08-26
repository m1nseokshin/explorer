"use client";

import Reveal from "@/components/ui/Reveal";
import { useLanguage } from "@/lib/i18n";

export default function HomeSections() {
  const { lang } = useLanguage();
  const t = (ko: string, en: string) => (lang === "ko" ? ko : en);

  return (
    <>
      <section className="px-6 py-28 sm:px-12 sm:py-36 md:px-16 lg:px-24">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal y={12}>
            <p className="type-eyebrow text-muted">{t("컨셉", "The idea")}</p>
          </Reveal>

          <Reveal delay={0.08}>
            <h2 className="type-display-lg mt-4 text-balance">
              {t(
                "옛날 항해사들은 별을 보고 길을 찾았습니다",
                "Sailors used to find their way by the stars",
              )}
            </h2>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="type-body-lg mt-8 text-pretty text-foreground-mute">
              {t(
                "육분의로 별의 높이를 재서 자기 위치를 알아냈죠. 그 방법을 거꾸로 뒤집어 봤습니다.",
                "They measured a star's height with a sextant to work out where they were. We flipped that around.",
              )}
            </p>
          </Reveal>

          <Reveal delay={0.24}>
            <p className="type-body-lg mt-5 text-pretty text-foreground-mute">
              {t(
                "어디 계신지만 알려주세요. 그 자리의 하늘을 그려 드립니다. 그림이 아니라, 지금 고개를 들면 거기 있는 별로.",
                "Just tell us where you are. We'll draw the sky over that spot — not a picture of it, but the stars that are actually up there right now.",
              )}
            </p>
          </Reveal>

          <Reveal delay={0.32}>
            <p className="type-body-lg mt-5 text-pretty text-foreground-mute">
              {t(
                "육분의 대신 손을 씁니다. 저으면 하늘이 돌고, 밀면 다가갑니다.",
                "And instead of a sextant, you use your hand. Sweep it and the sky turns; push it forward and you close in.",
              )}
            </p>
          </Reveal>

          <Reveal delay={0.4}>
            <p className="type-caption mt-12 text-muted">
              {t(
                "6.5등급까지 8,874개의 별 · IAU 88개 별자리 · 은하수 · 해와 달과 행성",
                "8,874 stars to magnitude 6.5 · all 88 IAU constellations · the Milky Way · Sun, Moon and planets",
              )}
            </p>
          </Reveal>
        </div>
      </section>

    </>
  );
}
