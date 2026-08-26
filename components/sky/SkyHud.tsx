"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { formatDeg } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { HandStatus } from "@/lib/useHandTracking";
import type { SkyLayers } from "./SkyCanvas";

interface Props {
  az: number;
  alt: number;
  zoom: number;
  layers: SkyLayers;
  onToggleLayer: (key: keyof SkyLayers) => void;
  nightMode: boolean;
  onToggleNight: () => void;
  handOn: boolean;
  handStatus: HandStatus;
  onToggleHand: () => void;
  locationLabel: string | null;
  onOpenLocation: () => void;
  onOpenSettings: () => void;
  settingsOpen: boolean;
  onRecenter: () => void;
  /** 설정 카드 바로 위에 쌓이는 추가 패널 (시간 컨트롤). */
  extraPanel?: ReactNode;
}

/**
 * 세로 컨트롤 버튼.
 *
 * 아이콘만 남긴 원형 버튼. 가로로 늘어놓았을 때는 이름들이 한 문장처럼
 * 읽혀서 각각이 버튼이라는 게 오히려 흐려졌다. 세로로 세우고 아이콘을 얹으면
 * 낱개의 조작으로 읽힌다.
 */
function Pill({
  active,
  onClick,
  icon,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      data-active={active ? "true" : "false"}
      whileTap={{ scale: 0.92 }}
      transition={{ type: "spring", stiffness: 600, damping: 30 }}
      // 글자를 빼고 원형으로. 넷뿐이고 아이콘이 뚜렷해서 라벨이 없어도 읽히며,
      // 하늘을 가리는 면적이 절반 이하로 준다. 이름은 aria-label로 남는다.
      title={label}
      className="hud-pill flex h-12 w-12 items-center justify-center rounded-full"
    >
      <svg
        viewBox="0 0 20 20"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {icon}
      </svg>
    </motion.button>
  );
}

const ICON = {
  hand: (
    <>
      <path d="M7 9V4.6a1.3 1.3 0 0 1 2.6 0V9" />
      <path d="M9.6 8.6V3.4a1.3 1.3 0 0 1 2.6 0v5.2" />
      <path d="M12.2 9V5.2a1.3 1.3 0 0 1 2.6 0V12" />
      <path d="M7 9V7.4a1.3 1.3 0 0 0-2.6 0v4.2c0 3 2.4 5.4 5.4 5.4h.8a4.2 4.2 0 0 0 4.2-4.2" />
    </>
  ),
  lines: (
    <>
      <path d="M4 6.5 8.5 11l3-2.5L16 13" />
      <circle cx="4" cy="6.5" r="1.1" />
      <circle cx="8.5" cy="11" r="1.1" />
      <circle cx="11.5" cy="8.5" r="1.1" />
      <circle cx="16" cy="13" r="1.1" />
    </>
  ),
  north: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 3.6v2M10 14.4v2M3.6 10h2M14.4 10h2" />
      <path d="M8 13V7l4 6V7" />
    </>
  ),
  settings: (
    <>
      {/* ⚠️ 테두리 원(림)이 없으면 톱니가 그냥 방사선이 되어 '해'로 읽힌다.
          허브 · 림 · 톱니 세 겹이 있어야 20px에서도 톱니바퀴로 보인다. */}
      <circle cx="10" cy="10" r="2.2" />
      <circle cx="10" cy="10" r="5.4" />
      <path d="M10 4.6V2.4M10 17.6v-2.2M15.4 10h2.2M2.4 10h2.2" />
      <path d="m13.82 6.18 1.56-1.56M4.62 15.38l1.56-1.56M13.82 13.82l1.56 1.56M4.62 4.62l1.56 1.56" />
    </>
  ),
};

/**
 * 하단 HUD. 모든 컨트롤은 뷰포트 하단 30% 안에 둔다 (DESIGN.md 도달성 규칙).
 * 상단은 나침반만 사는 읽기 전용 구역이다.
 *
 * 손 조작이 주 인터페이스이므로 여기 있는 버튼은 '손으로 하기 어려운 것'
 * — 설정, 위치, 손 인식 자체의 on/off — 만 담는다.
 */
export default function SkyHud({
  az,
  alt,
  zoom,
  layers,
  onToggleLayer,
  nightMode,
  onToggleNight,
  handOn,
  handStatus,
  onToggleHand,
  locationLabel,
  onOpenLocation,
  onOpenSettings,
  settingsOpen,
  onRecenter,
  extraPanel,
}: Props) {
  const { lang, toggleLang } = useLanguage();
  const t = (ko: string, en: string) => (lang === "ko" ? ko : en);
  const handBusy = handStatus === "pending" || handStatus === "loading";

  return (
    <>
      {/* 수치·위치는 읽기 전용이므로 왼쪽 아래에 눕힌다 */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-30"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        <div
          className="scrim-bottom pb-1 pt-10"
          style={{
            paddingLeft: "calc(env(safe-area-inset-left) + 16px)",
            paddingRight: "calc(env(safe-area-inset-right) + 16px)",
          }}
        >
          {/* 오른쪽 세로 레일(약 76px)과 겹치지 않게 비운다 */}
          <div className="mx-auto w-full max-w-md pr-[72px]">
            <AnimatePresence initial={false}>
              {settingsOpen && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 38, mass: 0.8 }}
                  className="pointer-events-auto max-h-[62dvh] space-y-3 overflow-y-auto overflow-x-hidden"
                >
                  <div className="space-y-3 pb-3">
                    {/* 어디서 보고 있는지 먼저. 설정을 여는 이유의 절반이 이것이고,
                        하단 칩은 작아서 '바꿀 수 있다'가 잘 드러나지 않는다. */}
                    <div className="rounded-2xl border border-hairline bg-surface/97 p-4 shadow-2xl">
                      <div className="flex items-center justify-between gap-3">
                        <p className="type-caption min-w-0 truncate">
                          <span className="text-muted">{t("현재 위치", "Location")}</span>
                          {" : "}
                          {locationLabel ?? t("정하지 않음", "Not set")}
                        </p>
                        <button
                          type="button"
                          onClick={onOpenLocation}
                          className="hud-pill type-button-cap shrink-0 px-3 py-2"
                        >
                          {t("변경하기", "Change")}
                        </button>
                      </div>
                      <div className="mt-3 border-t border-hairline pt-3">
                        <Link
                          href="/"
                          className="hud-pill type-button-cap inline-block px-3 py-2"
                        >
                          {t("나가기", "Leave")}
                        </Link>
                      </div>
                    </div>
                    {extraPanel}
                    <div className="rounded-2xl border border-hairline bg-surface/97 p-4 shadow-2xl">
                      <p className="type-eyebrow text-muted">{t("보이기", "Layers")}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(
                          [
                            ["milkyway", t("은하수", "Milky Way")],
                            ["lines", t("별자리선", "Lines")],
                            ["labels", t("이름", "Labels")],
                            ["boundaries", t("경계", "Borders")],
                            ["horizon", t("수평선", "Horizon")],
                            ["ecliptic", t("황도", "Ecliptic")],
                            ["meridian", t("자오선", "Meridian")],
                            ["bodies", t("행성", "Planets")],
                          ] as [keyof SkyLayers, string][]
                        ).map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => onToggleLayer(key)}
                            data-active={layers[key] ? "true" : "false"}
                            className="hud-pill type-button-cap px-3 py-2"
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <p className="type-eyebrow mt-4 text-muted">{t("화면", "Display")}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={onToggleNight}
                          data-active={nightMode ? "true" : "false"}
                          className="hud-pill type-button-cap px-3 py-2"
                        >
                          {t("야간 시야", "Night vision")}
                        </button>
                        <button
                          type="button"
                          onClick={toggleLang}
                          className="hud-pill type-button-cap px-3 py-2"
                        >
                          {lang === "ko" ? "EN" : "한국어"}
                        </button>
                      </div>

                      {!handOn && (
                        <p className="type-caption mt-4 text-muted">
                          {t(
                            "손 인식이 꺼져 있으면 드래그로 둘러보고 휠로 확대합니다.",
                            "With hand tracking off, drag to look around and scroll to zoom.",
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 관측 지점 → 수치. 위에서 아래로 '어디서 / 어디를 보는가' 순서다.
                오른쪽 아래에 두면 세로 아이콘 열 바로 밑이라 서로 붙어 보인다. */}
            <div className="pointer-events-none flex flex-col items-start gap-1">
              <button
                type="button"
                onClick={onOpenLocation}
                className="type-mono-hud hud-shadow pointer-events-auto underline underline-offset-4"
              >
                {locationLabel ?? t("관측 지점", "Set position")}
              </button>
              {/* 수치 표시 — 입력 없이 변하므로 .type-mono-hud */}
              <div className="type-mono-hud hud-shadow flex gap-4">
                <span>AZ {formatDeg(az, false).padStart(4)}</span>
                <span>ALT {formatDeg(alt, false)}</span>
                <span className="hidden sm:inline">×{zoom.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 조작은 오른쪽 세로 열로. 가로로 늘어놓으면 하늘 아래쪽을 가로로
          가려서 지평선 부근이 통째로 안 보인다. */}
      <div
        className="pointer-events-auto absolute right-0 z-30 flex flex-col items-center gap-2 px-3"
        style={{
          bottom: "calc(env(safe-area-inset-bottom) + 56px)",
          // ⚠️ 노치 기기는 가로 모드에서 오른쪽에도 인셋이 생긴다. px-3만으로는
          //    알약이 화면 밖으로 반쯤 나간다.
          paddingRight: "calc(env(safe-area-inset-right) + 10px)",
        }}
      >
        <Pill
          active={handOn}
          onClick={onToggleHand}
          icon={ICON.hand}
          label={handBusy ? t("준비 중", "Starting") : t("손 인식", "Hand")}
        />
        <Pill onClick={onRecenter} icon={ICON.north} label={t("북쪽 보기", "Face north")} />
        <Pill
          active={settingsOpen}
          onClick={onOpenSettings}
          icon={ICON.settings}
          label={t("설정", "Settings")}
        />
      </div>
    </>
  );
}
