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
      descKo: "손바닥을 펴고 움직이면 밤하늘이 손을 따라옵니다. 카메라 화면 끝에 손을 대고 있으면 그 방향으로 계속 흘러 한 바퀴를 돌 수 있습니다.",
      descEn: "Open your palm and move it — the night sky follows your hand. Hold it at the edge of the camera frame and the sky keeps drifting that way, all the way around.",
    },
    {
      glyph: "🤏",
      id: "pinch",
      nameKo: "엄지·검지 벌리기·좁히기",
      nameEn: "Spread & Narrow",
      actionKo: "확대 · 축소",
      actionEn: "Zoom in / out",
      descKo: "나머지 세 손가락을 접고 엄지와 검지를 벌리면 확대, 좁히면 축소됩니다. 벌린 만큼이 아니라 움직인 만큼 바뀌어서 어디서 시작해도 튀지 않습니다.",
      descEn: "Fold the other three fingers, then spread thumb and index to zoom in or narrow them to zoom out. It follows the change, not the gap — so it never jumps when you start.",
    },
    {
      glyph: "✊",
      id: "grasp",
      nameKo: "주먹 쥐었다 펴기",
      nameEn: "Close, Then Open",
      actionKo: "자세히 보기 · 닫기",
      actionEn: "Inspect · Close",
      descKo: "조준선에 별을 맞추고 주먹을 쥐었다 펴면 그 별과 별자리의 유래·밝기·좌표가 열립니다. 설명은 읽는 속도로 조금씩 내려가고, 한 번 더 쥐었다 펴면 닫힙니다.",
      descEn: "Aim the reticle, then close and open your hand to reveal the lore, brightness and position of what's there. The text scrolls at reading pace; do it again to close.",
    },
  ];

  const stats = [
    {
      num: "8,874",
      labelKo: "실시간 항성",
      labelEn: "STARS IN SKY",
      detailKo: "6.5등급 한계 등급까지의 히파르코스 카탈로그 기반 실제 항성",
      detailEn: "Real catalogue stars down to magnitude 6.5 with precise B-V color temperature",
    },
    {
      num: "88",
      labelKo: "IAU 공식 별자리",
      labelEn: "CONSTELLATIONS",
      detailKo: "전천 88개 별자리의 경계선, 대표 성도 연결선 및 천문 유래",
      detailEn: "All 88 IAU constellation boundaries, classical figures, and ancient lore",
    },
    {
      num: "57",
      labelKo: "천측 항법 별",
      labelEn: "NAVIGATIONAL STARS",
      detailKo: "망망대해의 항해사들이 육분의로 길을 찾던 공식 항법 57성 수록",
      detailEn: "The 57 selected astronomical bodies historically sailed by marine almanacs",
    },
    {
      num: "0.01°",
      labelKo: "계산 정밀도",
      labelEn: "PRECISION",
      detailKo: "달의 지평시차(1°) 보정, 세차 및 장동, 지방항성시(LST) 실시간 해석",
      detailEn: "Accurate to 0.01° with lunar topocentric parallax, nutation, and local sidereal time",
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
                  "수천 년 동안 뱃사람은 바다 위에서 별의 높이를 재어 자기 위치를 얻었습니다. 이 제품은 그 계산을 거꾸로 돌렸습니다. 당신이 서 있는 자리의 위치를 받아, 지금 그곳의 하늘을 그립니다.",
                  "For centuries sailors measured star altitudes to discover where they stood on Earth. We inverted that geometry. Give us your coordinates, and we reconstruct the exact celestial dome above your head.",
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
                    <span className="type-mono-hud text-xs text-muted">기원전 ~ 20세기</span>
                  </div>
                  <h3 className="type-display-lg mt-4 text-xl sm:text-2xl">
                    {t("별의 고도 → 지구 위 위치", "Star Altitude → Geographic Position")}
                  </h3>
                  <p className="type-body-lg mt-5 text-sm leading-relaxed text-foreground-mute">
                    {t(
                      "육분의로 북극성의 각도를 재면 위도가 나왔고, 크로노미터와 별의 남중 시각으로 경도를 풀었습니다. 별은 단순한 풍경이 아니라 바다 위 사람의 목숨이 달린 유일한 계기판이었습니다.",
                      "The altitude of Polaris directly yielded latitude; the precise transit of known stars gave longitude. The stars were not scenic decoration — they were the sailor's primary navigational instruments.",
                    )}
                  </p>
                </div>
                <div className="mt-8 border-t border-hairline/60 pt-4">
                  <p className="type-caption text-xs text-muted">
                    {t("도구: 육분의 · 천측력 57성 · 크로노미터", "Instruments: Sextant · Nautical Almanac · Chronometer")}
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.32}>
              <div className="relative flex h-full flex-col justify-between rounded-2xl border border-hairline bg-surface/50 p-8 backdrop-blur-md">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="type-eyebrow" style={{ color: "var(--accent-reticle)" }}>
                      {t("현대의 익스플로러", "Explorer Today")}
                    </span>
                    <span className="type-mono-hud text-xs" style={{ color: "var(--accent-reticle)" }}>
                      실시간 천체역학
                    </span>
                  </div>
                  <h3 className="type-display-lg mt-4 text-xl sm:text-2xl">
                    {t("내 위치 (GPS) → 실시간 밤하늘", "My Location → Real-time Sky")}
                  </h3>
                  <p className="type-body-lg mt-5 text-sm leading-relaxed text-foreground-mute">
                    {t(
                      "지금 계신 곳의 위도와 경도를 입력하면, 세차·장동·지방항성시를 풀어 실시간 천구를 그립니다. 도감의 평면 그림이 아니라, 지금 창밖 고개를 들었을 때 그 자리에 있는 실제 별입니다.",
                      "Input your coordinates, and we compute axial precession, nutation, and local sidereal time. Not a static illustration, but the precise celestial bodies hanging overhead right this second.",
                    )}
                  </p>
                </div>
                <div className="mt-8 border-t border-hairline/60 pt-4">
                  <p className="type-caption text-xs text-muted">
                    {t("계산: 천문 엔진 0.01° 정밀도 · 달 지평시차 보정", "Engine: Astronomy Engine 0.01° · Topocentric Parallax")}
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
                {t("버튼 대신, 손짓으로 하늘을 젓다", "No buttons — sailed by your hand")}
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="type-body-lg mt-6 text-pretty text-foreground-mute">
                {t(
                  "손동작 인터페이스에는 버튼이 없습니다. 무엇을 할 수 있는지 화면이 먼저 말해 주고, 내 손이 잡히고 있다는 걸 되비쳐 주어야 합니다. 세 가지 제스처로 하늘을 항해합니다.",
                  "A gesture interface has no buttons. The interface must teach you its language and mirror back what it sees. Three gestures drive the entire voyage.",
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
                  "카메라는 사용자의 손 관절 좌표(21개 랜드마크)를 브라우저 로컬에서 계산하는 데만 쓰입니다. 영상은 어디에도 저장되거나 외부로 전송되지 않습니다.",
                  "The camera computes 21 hand landmarks entirely in your local browser sandbox. Video frames are never stored, transmitted, or displayed.",
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
                {t("모르는 숫자는 적지 않습니다", "Exact numbers, zero speculation")}
              </h2>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="type-body-lg mt-6 text-pretty text-foreground-mute">
                {t(
                  "모든 별의 좌표, 겉보기 등급, 색지수(B−V), 고유 명칭은 국제천문연맹(IAU) 공인 데이터베이스와 대조 검증을 거쳤습니다. 342개의 자동 테스트가 매 빌드마다 하늘의 물리 법칙을 검증합니다.",
                  "Coordinates, apparent magnitudes, B-V color indices, and proper names are rigorously verified against IAU catalogues. 342 automated checks lock every celestial equation.",
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
                  "목적에 따라 두 가지 방식으로 밤하늘을 항해할 수 있습니다.",
                  "Explore the sky in two distinct navigational modes tailored to your curiosity.",
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
                      "지금 당신이 서 있는 관측지의 실제 시각과 밤하늘을 보여줍니다. 시간 왜곡 없이, 지금 고개를 들었을 때 머리 위에 떠 있는 천체를 그대로 확인하는 실시간 관측입니다.",
                      "Displays the true celestial vault above your current coordinates right now. Free from temporal distortion, mirroring exactly what lies beyond your ceiling.",
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
                      "시간 제어기를 얹어 과거나 미래의 밤하늘로 떠납니다. 1배속부터 최대 10,000배속까지 가속하며 별자리의 일주 운동과 계절에 따른 천체의 궤적 변화를 한눈에 관측합니다.",
                      "Unlock the temporal scrubber to sail into past or future epochs. Accelerate up to 10,000× to witness diurnal rotation, planetary wandering, and seasonal shifts.",
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
                "별을 보던 오래된 도구를 손에 쥐고, 당신의 위치에서 하늘을 항해해 보세요.",
                "Take this ancient instrument into your hands, and sail the sky above your position.",
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
