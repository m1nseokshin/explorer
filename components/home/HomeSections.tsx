"use client";

import Link from "next/link";
import Reveal from "@/components/ui/Reveal";
import { useLanguage } from "@/lib/i18n";

export default function HomeSections() {
  const { lang } = useLanguage();
  const t = (ko: string, en: string) => (lang === "ko" ? ko : en);

  const gestures = [
    {
      glyph: "✋",
      id: "open",
      nameKo: "손바닥 펴고 움직이기",
      nameEn: "Move Open Palm",
      actionKo: "하늘 끌기",
      actionEn: "Drag the sky",
      descKo: "손바닥을 펴고 움직이면 밤하늘이 손을 따라옵니다. 카메라 화면 끝에 손을 대고 있으면 하늘이 그쪽으로 계속 흘러 한 바퀴를 돌 수 있습니다.",
      descEn: "Open your palm and move it, and the sky follows your hand. Hold it at the edge of the camera frame and the sky keeps drifting that way, all the way round.",
    },
    {
      glyph: "🤏",
      id: "pinch",
      nameKo: "엄지·검지 벌리기·좁히기",
      nameEn: "Spread & Narrow",
      actionKo: "확대 · 축소",
      actionEn: "Zoom in / out",
      descKo: "나머지 세 손가락을 접고 엄지와 검지를 벌리면 확대, 좁히면 축소됩니다. 벌어진 폭이 아니라 움직인 양만큼 바뀌므로 어느 자세에서 시작해도 화면이 튀지 않습니다.",
      descEn: "Fold the other three fingers, then spread thumb and index to zoom in or narrow them to zoom out. It follows how far you move, not how wide the gap is, so it never jumps when you start.",
    },
    {
      glyph: "✊",
      id: "grasp",
      nameKo: "주먹 쥐었다 펴기",
      nameEn: "Close, Then Open",
      actionKo: "자세히 보기 · 닫기",
      actionEn: "Inspect · Close",
      descKo: "조준선에 별을 맞추고 주먹을 쥐었다 펴면 그 별과 별자리의 유래·밝기·좌표가 열립니다. 설명은 읽는 속도에 맞춰 조금씩 내려가고 한 번 더 쥐었다 펴면 닫힙니다.",
      descEn: "Aim the reticle, then close and open your hand to read the story, brightness and position of what's there. The text scrolls at reading pace; do it again to close.",
    },
  ];

  const stats = [
    {
      num: "8,874",
      labelKo: "실시간 항성",
      labelEn: "STARS IN SKY",
      detailKo: "히파르코스 카탈로그에서 가져온 6.5등급까지의 실제 별",
      detailEn: "Real Hipparcos stars down to magnitude 6.5, each coloured by its B−V index",
    },
    {
      num: "88",
      labelKo: "IAU 공식 별자리",
      labelEn: "CONSTELLATIONS",
      detailKo: "하늘 전체 88개 별자리의 경계선과 별자리선, 그리고 유래",
      detailEn: "All 88 IAU boundaries, the figures that join their stars, and where each came from",
    },
    {
      num: "57",
      labelKo: "천측 항법 별",
      labelEn: "NAVIGATIONAL STARS",
      detailKo: "항해사가 육분의로 고도를 재던 항해력의 항법별 57개",
      detailEn: "The 57 stars of the Nautical Almanac that navigators measured with a sextant",
    },
    {
      num: "0.01°",
      labelKo: "계산 정밀도",
      labelEn: "PRECISION",
      detailKo: "세차·장동·지방항성시(LST)를 실시간으로 풀고 달의 지평시차(1°)까지 보정",
      detailEn: "Precession, nutation and local sidereal time solved live, plus the Moon's 1° parallax",
    },
  ];

  return (
    <div className="relative z-10 flex flex-col gap-28 pb-32 sm:gap-36 sm:pb-44">
      {/* ── 1. 항해의 원리: 거꾸로 돌린 계산 ───────────────────────────── */}
      <section className="px-6 sm:px-12 md:px-16 lg:px-24">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal y={12}>
              <p className="type-eyebrow text-muted">{t("천측 항법의 원리", "Celestial Navigation")}</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="type-display-lg mt-3 text-balance">
                {t("별을 재던 사람, 별을 그리는 도구", "From sighting stars to charting the sky")}
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="type-body-lg mt-6 text-pretty text-foreground-mute">
                {t(
                  "수천 년 동안 뱃사람은 바다 위에서 별의 높이를 재어 자기 위치를 알아냈습니다. 이 제품은 그 계산을 거꾸로 돌립니다. 지금 서 있는 자리를 받아 그곳의 하늘을 그립니다.",
                  "For thousands of years sailors measured the height of stars to work out where they were. This runs that calculation backwards: it takes where you are standing and draws the sky above it.",
                )}
              </p>
            </Reveal>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <Reveal delay={0.24}>
              <div className="relative flex h-full flex-col justify-between rounded-2xl border border-hairline bg-surface/50 p-8 backdrop-blur-md">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="type-eyebrow text-muted">{t("과거의 항해사", "The Navigator")}</span>
                    <span className="type-mono-hud text-xs text-muted">{t("기원전 ~ 20세기", "Antiquity – 20th c.")}</span>
                  </div>
                  <h3 className="type-display-lg mt-4 text-xl sm:text-2xl">
                    {t("별의 고도 → 지구 위 위치", "Star Altitude → Geographic Position")}
                  </h3>
                  <p className="type-body-lg mt-5 text-sm leading-relaxed text-foreground-mute">
                    {t(
                      "육분의로 북극성의 각도를 재면 위도가 나왔고 크로노미터와 별의 남중 시각으로 경도를 풀었습니다. 바다 위에서 별은 풍경이 아니었습니다. 목숨이 걸린 단 하나의 계기판이었습니다.",
                      "Measure the angle of Polaris with a sextant and you had your latitude; a chronometer and the moment a star crossed the meridian gave longitude. At sea the stars were not scenery. They were the one instrument lives depended on.",
                    )}
                  </p>
                </div>
                <div className="mt-8 border-t border-hairline/60 pt-4">
                  <p className="type-caption text-xs text-muted">
                    {t("도구: 육분의 · 항해력 57성 · 크로노미터", "Instruments: sextant · Nautical Almanac · chronometer")}
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.32}>
              <div className="relative flex h-full flex-col justify-between rounded-2xl border border-hairline bg-surface/50 p-8 backdrop-blur-md">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="type-eyebrow" style={{ color: "var(--accent-reticle)" }}>
                      {t("지금의 익스플로러", "Explorer today")}
                    </span>
                    <span className="type-mono-hud text-xs" style={{ color: "var(--accent-reticle)" }}>
                      {t("실시간 계산", "Computed live")}
                    </span>
                  </div>
                  <h3 className="type-display-lg mt-4 text-xl sm:text-2xl">
                    {t("내 위치 (GPS) → 실시간 밤하늘", "My Location → Real-time Sky")}
                  </h3>
                  <p className="type-body-lg mt-5 text-sm leading-relaxed text-foreground-mute">
                    {t(
                      "지금 계신 곳의 위도와 경도를 넣으면 세차·장동·지방항성시를 풀어 이 순간의 하늘을 그립니다. 창밖으로 고개를 들면 보일 바로 그 자리의 별들입니다.",
                      "Enter your latitude and longitude and it solves precession, nutation and local sidereal time to draw the sky as it is right now: the same stars you would see if you looked out of the window.",
                    )}
                  </p>
                </div>
                <div className="mt-8 border-t border-hairline/60 pt-4">
                  <p className="type-caption text-xs text-muted">
                    {t("계산: Astronomy Engine · 0.01° 정밀도 · 달 지평시차 보정", "Engine: Astronomy Engine · 0.01° · lunar parallax")}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 2. 손 인터페이스: 3가지 조작 어휘 ───────────────────────── */}
      <section className="px-6 sm:px-12 md:px-16 lg:px-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal y={12}>
              <p className="type-eyebrow text-muted">{t("손 인터페이스", "Gesture Interface")}</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="type-display-lg mt-3 text-balance">
                {t("버튼 대신 손짓으로 하늘을 젓다", "No buttons. You sail it by hand")}
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="type-body-lg mt-6 text-pretty text-foreground-mute">
                {t(
                  "손동작 인터페이스에는 버튼이 없습니다. 그래서 무엇을 할 수 있는지 화면이 먼저 말해 주고 내 손이 잡히고 있다는 걸 계속 보여 줘야 합니다. 제스처는 세 가지뿐입니다.",
                  "A gesture interface has no buttons, so the screen has to tell you what is possible and keep showing that it can see your hand. There are only three gestures.",
                )}
              </p>
            </Reveal>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-3">
            {gestures.map((g, i) => (
              <Reveal key={g.id} delay={0.1 + i * 0.08}>
                <div className="group relative flex h-full flex-col justify-between rounded-2xl border border-hairline bg-surface/40 p-6 transition-colors duration-300 hover:border-foreground/60 hover:bg-surface/70">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-surface text-lg leading-none transition-transform duration-300 group-hover:scale-110 group-hover:border-foreground">
                        {g.glyph}
                      </span>
                      <span className="type-eyebrow text-xs" style={{ color: "var(--accent-reticle)" }}>
                        {t(g.actionKo, g.actionEn)}
                      </span>
                    </div>
                    <h3 className="type-button-cap mt-6 text-sm text-foreground">
                      {t(g.nameKo, g.nameEn)}
                    </h3>
                    <p className="type-caption mt-3 text-xs leading-relaxed text-foreground-mute">
                      {t(g.descKo, g.descEn)}
                    </p>
                  </div>
                  <div className="mt-6 border-t border-hairline/40 pt-3">
                    <span className="type-mono-hud text-[11px] text-muted">
                      0{i + 1} / GESTURE
                    </span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.42}>
            <div className="mt-8 rounded-xl border border-hairline/60 bg-surface/30 px-6 py-4 text-center">
              <p className="type-caption text-xs text-muted">
                {t(
                  "카메라 영상은 브라우저 안에서 손 관절 21개의 좌표를 계산하는 데만 씁니다. 영상은 저장하지 않고 기기 밖으로 보내지도 않습니다.",
                  "The camera feed is used only to find 21 hand landmarks, inside your browser. The video is never stored, shown or sent anywhere.",
                )}
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── 3. 천문 데이터와 스펙 수치 ──────────────────────────────── */}
      <section className="px-6 sm:px-12 md:px-16 lg:px-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal y={12}>
              <p className="type-eyebrow text-muted">{t("데이터 무결성", "Catalogue & Precision")}</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="type-display-lg mt-3 text-balance">
                {t("모르는 숫자는 적지 않습니다", "No number we can't back up")}
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="type-body-lg mt-6 text-pretty text-foreground-mute">
                {t(
                  "별의 좌표·겉보기 등급·색지수(B−V)·고유명은 국제천문연맹(IAU) 자료와 대조했습니다. 코드를 고칠 때마다 자동 검사 359개가 계산을 처음부터 다시 확인합니다.",
                  "Positions, magnitudes, B−V colour indices and proper names are checked against IAU data, and 359 automated checks rerun the calculations every time the code changes.",
                )}
              </p>
            </Reveal>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-5 lg:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.labelEn} delay={0.1 + i * 0.08}>
                <div className="flex h-full flex-col justify-between rounded-2xl border border-hairline bg-surface/40 p-6">
                  <div>
                    <span className="type-eyebrow block text-xs text-muted">{t(s.labelKo, s.labelEn)}</span>
                    <p className="type-display-lg mt-3 text-3xl sm:text-4xl text-foreground">
                      {s.num}
                    </p>
                    <p className="type-caption mt-4 text-xs leading-relaxed text-foreground-mute">
                      {t(s.detailKo, s.detailEn)}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. 두 가지 항해 모드 ────────────────────────────────────── */}
      <section className="px-6 sm:px-12 md:px-16 lg:px-24">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal y={12}>
              <p className="type-eyebrow text-muted">{t("항해 모드", "Voyage Modes")}</p>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="type-display-lg mt-3 text-balance">
                {t("지금의 하늘, 또는 시간의 바다", "The sky now, or the sea of time")}
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="type-body-lg mt-6 text-pretty text-foreground-mute">
                {t(
                  "밤하늘을 항해하는 방법은 두 가지입니다.",
                  "There are two ways to sail the sky.",
                )}
              </p>
            </Reveal>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2">
            <Reveal delay={0.24}>
              <div className="group flex h-full flex-col justify-between rounded-2xl border border-hairline bg-surface/50 p-8 transition-colors duration-300 hover:border-foreground/70">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="type-mono-hud text-xs text-muted">ROUTE 01</span>
                    <span className="rounded-full border border-hairline px-3 py-1 text-[11px] uppercase tracking-wider text-foreground">
                      LIVE SKY
                    </span>
                  </div>
                  <h3 className="type-display-lg mt-6 text-2xl sm:text-3xl">
                    {t("실시간 밤하늘 탐색", "Real-time Sky")}
                  </h3>
                  <p className="type-body-lg mt-4 text-sm leading-relaxed text-foreground-mute">
                    {t(
                      "지금 서 계신 곳의 실제 시각과 하늘을 보여 줍니다. 시간은 건드릴 수 없어서, 화면에 뜬 천체가 곧 지금 고개를 들면 머리 위에 있는 천체입니다.",
                      "The real sky above where you are, at the real time. You can't change the clock here, so what is on screen is what is overhead if you step outside.",
                    )}
                  </p>
                </div>
                <div className="mt-8 pt-4">
                  <Link
                    href="/explore/"
                    className="type-button-cap inline-flex items-center gap-2 text-foreground transition-opacity hover:opacity-75"
                  >
                    <span>{t("실시간 하늘 열기", "Enter live sky")}</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.32}>
              <div className="group flex h-full flex-col justify-between rounded-2xl border border-hairline bg-surface/50 p-8 transition-colors duration-300 hover:border-foreground/70">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="type-mono-hud text-xs text-muted">ROUTE 02</span>
                    <span className="rounded-full border border-hairline px-3 py-1 text-[11px] uppercase tracking-wider" style={{ color: "var(--accent-reticle)", borderColor: "var(--accent-reticle)" }}>
                      TIMELAPSE
                    </span>
                  </div>
                  <h3 className="type-display-lg mt-6 text-2xl sm:text-3xl">
                    {t("시간여행 타임랩스", "Timelapse Voyage")}
                  </h3>
                  <p className="type-body-lg mt-4 text-sm leading-relaxed text-foreground-mute">
                    {t(
                      "같은 하늘에 시간 조절만 더했습니다. 실시간부터 1초에 1주씩 흐르는 속도까지 올려 가며 별자리가 하룻밤 도는 모습과 계절 따라 바뀌는 하늘을 볼 수 있습니다.",
                      "The same sky with a clock you can run. Speed it up from real time to a week per second and watch the stars wheel overnight, the planets wander and the seasons turn.",
                    )}
                  </p>
                </div>
                <div className="mt-8 pt-4">
                  <Link
                    href="/timelapse/"
                    className="type-button-cap inline-flex items-center gap-2 text-foreground transition-opacity hover:opacity-75"
                  >
                    <span>{t("타임랩스 관측하기", "Start timelapse")}</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── 5. 출항 준비 (Final CTA) ─────────────────────────────────── */}
      <section className="px-6 py-12 text-center sm:px-12 md:px-16 lg:px-24">
        <div className="mx-auto max-w-2xl">
          <Reveal y={12}>
            <p className="type-eyebrow text-muted">{t("준비 완료", "Ready to sail")}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="type-display-xl mt-4 text-balance">
              {t("지금 고개를 들면, 거기 별이 있습니다", "Look up, and the stars are there")}
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="type-body-lg mt-6 text-pretty text-foreground-mute">
              {t(
                "별을 읽던 오래된 도구를 손에 쥐고 지금 서 있는 곳의 하늘을 항해해 보세요.",
                "Take the old instrument in hand and sail the sky above where you stand.",
              )}
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link href="/explore/" className="btn-ghost inline-block">
                {t("항해 시작", "Set sail")}
              </Link>
              <Link
                href="/about/"
                className="type-button-cap inline-flex items-center gap-2 rounded-full border border-hairline px-6 py-4 text-muted transition-colors duration-300 hover:border-foreground hover:text-foreground"
              >
                {t("만든 이야기", "About")}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
