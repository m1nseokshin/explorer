"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { loadConstellations, type Constellation } from "@/lib/constellations";
import { useLanguage } from "@/lib/i18n";
import { useObserver } from "@/lib/observer";
import { DEFAULT_H_FOV_DEG, visibleFovY } from "@/lib/orientation";
import { radecToVec3, worldToAltAz } from "@/lib/sky";
import { loadMilkyWay, loadStarCatalog, type MilkyWay, type StarCatalog } from "@/lib/stars";
import {
  DEFAULT_SPEED_INDEX,
  SPEED_STOPS,
  formatHours,
  localMeanSolarTime,
  localSiderealHours,
  nextNightfall,
  skyPhase,
  skyWash,
  sunAltitude,
} from "@/lib/timelapse";
import { useWakeLock } from "@/lib/useWakeLock";
import CompassStrip from "./CompassStrip";
import ConstellationLabels from "./ConstellationLabels";
import LocationPicker from "./LocationPicker";
import PermissionCard from "./PermissionCard";
import SkyCanvas, { type SkyLayers } from "./SkyCanvas";
import VirtualControls, { RECENTER_TAU, type ViewCommand } from "./VirtualControls";

/**
 * 타임랩스 — 손 인식 화면과 완전히 다른 경험.
 *
 * 카메라도 제스처도 없다. 지역을 고르면 그곳의 밤하늘이 실제 계산대로 흘러가고,
 * 사람은 속도만 정한다. 하늘을 '조작'하는 도구가 아니라 '지켜보는' 창이다.
 *
 * 계산은 /explore와 같다 — 매 프레임 Rotation_EQJ_HOR(세차·장동·항성시)을 풀고
 * 보간하지 않는다(SkyCanvas의 `timelapse`). 해·달·행성은 20Hz로 다시 푼다.
 * 태양 고도로 낮 하늘이 별을 덮는 정도를 정하므로, 속도를 올리면 박명과 낮이
 * 실제 그 지역의 시각대로 지나간다.
 *
 * ⚠️ 시뮬레이션 시각은 여기 로컬 ref다. 공용 observer.simTimeRef를 쓰면 /explore로
 *    넘어갔을 때 시간이 돌아간 채 남는다('지금 보이는 게 진짜 하늘인가' 문제).
 * ⚠️ 60fps 경로(시각 적분·판독값·낮 덮개)는 전부 ref + textContent로 돈다.
 */

type Stage = "loading" | "location" | "sky";

const LAYERS: SkyLayers = {
  milkyway: true,
  lines: true,
  labels: true,
  boundaries: false,
  horizon: true,
  ecliptic: false,
  meridian: false,
  bodies: true,
};

/** 속도를 바꿀 때 실제 배속이 따라가는 시정수(초). 계단처럼 튀면 하늘이 덜컥 선다. */
const RATE_TAU = 0.45;
/** 가장 넓은 배율. 1보다 낮춰 하늘을 넓게 담는다 — 일주운동은 넓게 봐야 보인다. */
const MIN_ZOOM = 0.62;
/** 낮 하늘 색. 색조 없는 회청색 — 액센트 예산을 쓰지 않는다(DESIGN.md). */
const DAY_RGB = "34,37,46";

/**
 * 처음 바라볼 방향. 북반구는 북쪽, 남반구는 남쪽 — 천구의 극을 향해야
 * 별이 극을 도는 모습이 한눈에 들어온다. 고도는 극 높이(=위도)보다 조금 낮게
 * 잡아 지평선과 극이 함께 보이게 한다.
 */
function poleView(lat: number) {
  return {
    az: lat >= 0 ? 0 : 180,
    alt: THREE.MathUtils.clamp(Math.abs(lat) * 0.7, 14, 42),
    zoom: MIN_ZOOM,
  };
}

function quatOf(v: { az: number; alt: number }) {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(THREE.MathUtils.degToRad(v.alt), THREE.MathUtils.degToRad(-v.az), 0, "YXZ"),
  );
}

/**
 * 밤의 시작 시각.
 *
 * `fromMs`가 이미 밤이면 그대로 쓴다. 다만 `skipTonight`이면('다음 밤으로')
 * 지금 밤을 건너뛰고 그다음 밤으로 간다. 해가 지지 않는 곳(백야)은 그대로 둔다 —
 * 화면이 그 사실을 알린다.
 *
 * ⚠️ 기준은 시뮬레이션 시각이다. 실제 시각에서 찾으면 며칠을 돌려 둔 뒤 누른
 *    '다음 밤으로'가 오늘 밤으로 되감긴다.
 */
function nightFrom(fromMs: number, lat: number, lon: number, skipTonight: boolean): number {
  const from = new Date(fromMs);
  if (!skipTonight && sunAltitude(from, lat, lon) < -12) return fromMs;
  // 밤 한가운데서 누르면 다음 교차는 '오늘 새벽'이 아니라 '내일 저녁'이어야 한다.
  // 내려가는 교차만 찾으므로 여기서 그대로 찾으면 된다.
  return nextNightfall(from, lat, lon)?.at.getTime() ?? fromMs;
}

export default function TimelapseExperience() {
  const { lang } = useLanguage();
  const t = useCallback((ko: string, en: string) => (lang === "ko" ? ko : en), [lang]);
  const observer = useObserver();
  const router = useRouter();

  const [catalog, setCatalog] = useState<StarCatalog | null>(null);
  const [constellations, setConstellations] = useState<Constellation[]>([]);
  const [milkyway, setMilkyway] = useState<MilkyWay | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [stage, setStage] = useState<Stage>("loading");
  const [locationOpen, setLocationOpen] = useState(false);

  const [speedIndex, setSpeedIndex] = useState(DEFAULT_SPEED_INDEX);
  const [playing, setPlaying] = useState(true);
  /** 해가 지지 않는 곳에 있는가. 드물게 바뀌므로 state여도 된다. */
  const [noNight, setNoNight] = useState(false);

  // ── ref ────────────────────────────────────────────────────────────
  const rootRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const washRef = useRef<HTMLDivElement>(null);
  const labelsWrapRef = useRef<HTMLDivElement>(null);
  const clockDateRef = useRef<HTMLSpanElement>(null);
  const clockTimeRef = useRef<HTMLSpanElement>(null);
  const phaseRef = useRef<HTMLSpanElement>(null);
  const lstRef = useRef<HTMLSpanElement>(null);
  const viewCmdRef = useRef<ViewCommand | null>(null);
  const followTauRef = useRef(0.045);
  const [initialQuat] = useState(() => quatOf(poleView(observer.lat)));
  const quatRef = useRef(initialQuat);
  const [initialFov] = useState(() =>
    typeof window === "undefined"
      ? 60
      : visibleFovY(0, 0, window.innerWidth, window.innerHeight, MIN_ZOOM, DEFAULT_H_FOV_DEG),
  );
  const fovRef = useRef(initialFov);
  const zoomRef = useRef(MIN_ZOOM);
  const skyMatRef = useRef(new THREE.Matrix4());
  const cameraRef = useRef<THREE.Camera | null>(null);
  const readoutRef = useRef({ az: 0, alt: 20, fov: initialFov });

  /** 시뮬레이션 시각(ms). */
  const timeRef = useRef(0);
  /** 목표 배속 · 지금 배속. 지금 배속이 목표를 부드럽게 따라간다. */
  const targetRateRef = useRef(SPEED_STOPS[DEFAULT_SPEED_INDEX].rate);
  const rateRef = useRef(SPEED_STOPS[DEFAULT_SPEED_INDEX].rate);
  const latRef = useRef(observer.lat);
  const lonRef = useRef(observer.lon);
  const langRef = useRef(lang);
  useEffect(() => {
    latRef.current = observer.lat;
    lonRef.current = observer.lon;
  }, [observer.lat, observer.lon]);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);
  useEffect(() => {
    targetRateRef.current = playing ? SPEED_STOPS[speedIndex].rate : 0;
  }, [playing, speedIndex]);

  useWakeLock(stage === "sky");

  // ── 데이터 ─────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    Promise.all([loadStarCatalog(), loadConstellations(), loadMilkyWay().catch(() => null)])
      .then(([c, cons, mw]) => {
        if (!alive) return;
        setCatalog(c);
        setConstellations(cons);
        setMilkyway(mw);
        setStage("location");
      })
      .catch(() => alive && setLoadError(true));
    return () => {
      alive = false;
    };
  }, []);

  /** 이 지역의 밤으로 시계를 맞추고 시선을 극으로 돌린다. */
  const goToNight = useCallback((lat: number, lon: number, turn: boolean, from: "now" | "sim") => {
    timeRef.current =
      from === "now" ? nightFrom(Date.now(), lat, lon, false) : nightFrom(timeRef.current, lat, lon, true);
    setNoNight(sunAltitude(new Date(timeRef.current), lat, lon) > -0.833);
    if (turn) viewCmdRef.current?.set(poleView(lat), RECENTER_TAU);
  }, []);

  // ── 시계 · 판독값 · 낮 덮개 (60fps, 리렌더 없음) ───────────────────
  useEffect(() => {
    if (stage !== "sky") return;
    let raf = 0;
    let last = performance.now();
    let lastText = 0;
    let wash = -1;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      // 배속은 로그 공간에서 따라간다. 1초에 하루(86,400배)에서 멈출 때 선형으로
      // 줄이면 '멈춤'을 누르고도 몇 초 동안 몇 시간씩 흘러간다. 로그로 줄이면
      // 0.5초 안에 눈에 띄는 움직임이 멎고, 올릴 때도 단계마다 같은 느낌으로 붙는다.
      const L = Math.log1p(rateRef.current);
      const LT = Math.log1p(targetRateRef.current);
      const nextL = L + (LT - L) * (1 - Math.exp(-dt / RATE_TAU));
      rateRef.current = targetRateRef.current === 0 && nextL < 0.02 ? 0 : Math.expm1(nextL);
      timeRef.current += dt * rateRef.current * 1000;

      const date = new Date(timeRef.current);
      const lat = latRef.current;
      const lon = lonRef.current;
      const sun = sunAltitude(date, lat, lon);

      // 낮 덮개: 하늘(캔버스) 위에 회청색을 태양 고도만큼 덮는다. 별이 사라지는
      // 순서가 실제와 같다 — 밝은 별이 가장 늦게까지 남는다.
      const target = skyWash(sun);
      wash = wash < 0 ? target : wash + (target - wash) * (1 - Math.exp(-dt / 0.12));
      if (washRef.current) washRef.current.style.opacity = (wash * 0.9).toFixed(3);
      if (labelsWrapRef.current) labelsWrapRef.current.style.opacity = (1 - wash * 0.85).toFixed(3);

      if (now - lastText > 100) {
        lastText = now;
        const ko = langRef.current === "ko";
        const lmst = localMeanSolarTime(date, lon);
        if (clockDateRef.current) clockDateRef.current.textContent = lmst.date;
        if (clockTimeRef.current) clockTimeRef.current.textContent = lmst.time;
        const ph = skyPhase(sun);
        if (phaseRef.current) {
          phaseRef.current.textContent =
            ph === "night" ? (ko ? "밤" : "Night") : ph === "twilight" ? (ko ? "박명" : "Twilight") : ko ? "낮" : "Day";
        }
        if (lstRef.current) {
          lstRef.current.textContent = `LST ${formatHours(localSiderealHours(date, lon))} · ${ko ? "태양" : "SUN"} ${sun.toFixed(1)}°`;
        }
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stage]);

  // ── 키보드: 스페이스 재생/정지, ←/→ 속도 ─────────────────────────
  useEffect(() => {
    if (stage !== "sky" || locationOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "BUTTON" || tag === "TEXTAREA") return;
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (e.key === "ArrowRight") {
        setSpeedIndex((i) => Math.min(SPEED_STOPS.length - 1, i + 1));
      } else if (e.key === "ArrowLeft") {
        setSpeedIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, locationOpen]);

  const _dir = useRef(new THREE.Vector3());
  const onOrient = useCallback((q: THREE.Quaternion, fov: number) => {
    _dir.current.set(0, 0, -1).applyQuaternion(q);
    const { az, alt } = worldToAltAz(_dir.current);
    readoutRef.current.az = az;
    readoutRef.current.alt = alt;
    readoutRef.current.fov = fov;
  }, []);

  const anchors = useMemo(
    () =>
      constellations.map((c) => ({
        id: c.id,
        name: lang === "ko" ? c.nameKo : c.nameEn,
        rank: c.rank,
        vec: radecToVec3(c.labelRa, c.labelDec, 1),
      })),
    [constellations, lang],
  );

  const placeLabel =
    observer.label ??
    `${Math.abs(observer.lat).toFixed(1)}°${observer.lat >= 0 ? "N" : "S"} ${Math.abs(observer.lon).toFixed(1)}°${observer.lon >= 0 ? "E" : "W"}`;

  // ── 렌더 ───────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <PermissionCard
        title={t("성표를 불러오지 못했습니다", "The catalogue didn't load")}
        body={t("연결 상태를 확인하고 다시 시도하세요.", "Check your connection and try again.")}
        ctaLabel={t("다시 시도", "Retry")}
        onCta={() => window.location.reload()}
      />
    );
  }

  if (stage === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <motion.p
          className="type-eyebrow text-muted"
          animate={{ opacity: [1, 0.35, 1] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          {t("성표를 읽는 중", "Reading the catalogue")}
        </motion.p>
      </div>
    );
  }

  if (stage === "location") {
    return (
      <LocationPicker
        open
        firstRun
        lat={observer.lat}
        lon={observer.lon}
        label={observer.label}
        gpsStatus={observer.gpsStatus}
        gpsFix={observer.gpsFix}
        onPick={(la, lo, name) => observer.setLocation(la, lo, "manual", name ?? undefined)}
        onUseGps={() => void observer.requestGps()}
        onConfirm={() => {
          // 확정한 위치의 밤으로 시계를 맞추고, 처음 시선도 그 극으로 둔다
          goToNight(observer.lat, observer.lon, false, "now");
          quatRef.current.copy(quatOf(poleView(observer.lat)));
          setStage("sky");
        }}
        onBack={() => router.push("/")}
      />
    );
  }

  const speed = SPEED_STOPS[speedIndex];

  return (
    <motion.div
      ref={rootRef}
      className="immersive-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {catalog && (
        <SkyCanvas
          catalog={catalog}
          constellations={constellations}
          boundaries={null}
          milkyway={milkyway}
          lat={observer.lat}
          lon={observer.lon}
          timeRef={timeRef}
          quatRef={quatRef}
          fovRef={fovRef}
          followTauRef={followTauRef}
          skyMatRef={skyMatRef}
          cameraRef={cameraRef}
          initialFov={initialFov}
          transparent={false}
          saturation={0.55}
          nightMode={false}
          layers={LAYERS}
          activeConstellation={null}
          aimedConstellation={null}
          selectedStar={null}
          onOrient={onOrient}
          timelapse
        />
      )}

      {/* 낮 덮개. 캔버스 바로 위, 포인터는 통과 */}
      <div
        ref={washRef}
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: `rgb(${DAY_RGB})`, opacity: 0 }}
      />

      {/* 드래그로 둘러보기 · 휠로 확대. z-0 — 라벨(z-10) 아래여야 한다 */}
      <div ref={overlayRef} className="absolute inset-0 z-0" style={{ touchAction: "none" }} />
      <VirtualControls
        commandRef={viewCmdRef}
        followTauRef={followTauRef}
        targetRef={overlayRef}
        quatRef={quatRef}
        fovRef={fovRef}
        zoomRef={zoomRef}
        enabled
        minZoom={MIN_ZOOM}
      />

      <div ref={labelsWrapRef} className="pointer-events-none absolute inset-0 z-10">
        <ConstellationLabels
          anchors={anchors}
          skyMatRef={skyMatRef}
          cameraRef={cameraRef}
          containerRef={rootRef}
          nightMode={false}
          activeId={null}
          aimedId={null}
        />
      </div>

      <CompassStrip readoutRef={readoutRef} reference="true" />

      {/* 상단 판독값 — 읽기 전용이라 위에 둔다(도달성 규칙) */}
      <div
        className="hud-shadow pointer-events-none absolute inset-x-0 z-30 flex items-start justify-between px-5 sm:px-8"
        style={{ top: "calc(env(safe-area-inset-top) + 44px)" }}
      >
        <div>
          <p className="type-eyebrow text-muted">{t("타임랩스", "Timelapse")}</p>
          <p className="type-caption mt-0.5 text-foreground">{placeLabel}</p>
        </div>
        <p className="type-mono-hud text-right text-muted">
          <span ref={lstRef} />
        </p>
      </div>

      {noNight && (
        <p
          className="type-caption hud-shadow pointer-events-none absolute inset-x-0 z-30 px-6 text-center text-foreground-mute"
          style={{ top: "calc(env(safe-area-inset-top) + 96px)" }}
        >
          {t(
            "지금 이곳은 해가 지지 않는 시기입니다. 밤을 보려면 다른 지역을 고르세요.",
            "The sun doesn't set here at this time of year. Pick another place to see a night sky.",
          )}
        </p>
      )}

      {/* 하단 조작판 — 엄지 닿는 아래 30% */}
      <div
        className="absolute inset-x-0 bottom-0 z-40 flex justify-center px-3 sm:px-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
      >
        {/* ⚠️ .hud-pill의 border-radius(9999px)는 레이어 밖이라 rounded-* 유틸리티를
            이긴다. 판은 알약이 아니라 카드여야 하므로 인라인으로 덮는다. */}
        <div className="hud-pill w-full max-w-xl px-4 pb-3 pt-3 sm:px-5" style={{ borderRadius: 24 }}>
          {/* 시각 */}
          <div className="flex items-baseline justify-between gap-3">
            <p className="type-mono-hud text-muted">
              <span ref={clockDateRef} />
              <span className="mx-2 opacity-50">·</span>
              <span ref={phaseRef} />
            </p>
            <p className="type-caption text-muted">{t("현지 태양시", "Local solar time")}</p>
          </div>
          {/* .type-mono-hud도 레이어 밖이라 text-3xl이 먹지 않는다 — 크기를 인라인으로 */}
          <p
            className="type-mono-hud mt-1 text-foreground"
            style={{ fontSize: "clamp(28px, 6vw, 36px)", lineHeight: 1 }}
          >
            <span ref={clockTimeRef}>--:--</span>
          </p>

          {/* 속도 */}
          <div className="mt-3 flex items-center gap-3">
            <motion.button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              aria-label={playing ? t("멈추기", "Pause") : t("재생", "Play")}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 600, damping: 30 }}
              className="hud-pill flex h-12 w-12 shrink-0 items-center justify-center"
            >
              <svg viewBox="0 0 20 20" width="18" height="18" fill="currentColor" aria-hidden>
                {playing ? (
                  <>
                    <rect x="5.5" y="4.5" width="3" height="11" rx="0.8" />
                    <rect x="11.5" y="4.5" width="3" height="11" rx="0.8" />
                  </>
                ) : (
                  <path d="M6.5 4.3v11.4a.6.6 0 0 0 .9.5l9-5.7a.6.6 0 0 0 0-1l-9-5.7a.6.6 0 0 0-.9.5Z" />
                )}
              </svg>
            </motion.button>
            <label className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-baseline justify-between">
                <span className="type-eyebrow text-muted">{t("속도", "Speed")}</span>
                <span className="type-mono-hud text-foreground">
                  {playing ? t(speed.ko, speed.en) : t("멈춤", "Paused")}
                </span>
              </span>
              <input
                type="range"
                min={0}
                max={SPEED_STOPS.length - 1}
                step={1}
                value={speedIndex}
                onChange={(e) => {
                  setSpeedIndex(Number(e.target.value));
                  setPlaying(true);
                }}
                aria-valuetext={t(speed.ko, speed.en)}
                className="tl-range"
              />
            </label>
          </div>

          {/* 이동 */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => goToNight(observer.lat, observer.lon, false, "sim")}
              className="hud-pill type-button-cap px-3.5 py-2.5"
            >
              {t("다음 밤으로", "Next night")}
            </button>
            <button
              type="button"
              onClick={() => {
                timeRef.current = Date.now();
                setNoNight(false);
              }}
              className="hud-pill type-button-cap px-3.5 py-2.5"
            >
              {t("지금", "Now")}
            </button>
            <button
              type="button"
              onClick={() => viewCmdRef.current?.set(poleView(observer.lat), RECENTER_TAU)}
              className="hud-pill type-button-cap px-3.5 py-2.5"
            >
              {observer.lat >= 0 ? t("북극 보기", "Face the pole") : t("남극 보기", "Face the pole")}
            </button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => setLocationOpen(true)}
              className="hud-pill type-button-cap px-3.5 py-2.5"
            >
              {t("지역 바꾸기", "Change place")}
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              aria-label={t("나가기", "Leave")}
              className="hud-pill flex h-10 w-10 items-center justify-center"
            >
              <svg viewBox="0 0 20 20" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
                <path d="M5 5l10 10M15 5 5 15" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {locationOpen && (
          <LocationPicker
            open
            firstRun={false}
            lat={observer.lat}
            lon={observer.lon}
            label={observer.label}
            gpsStatus={observer.gpsStatus}
            gpsFix={observer.gpsFix}
            onPick={(la, lo, name) => observer.setLocation(la, lo, "manual", name ?? undefined)}
            onUseGps={() => void observer.requestGps()}
            onConfirm={() => {
              setLocationOpen(false);
              goToNight(observer.lat, observer.lon, true, "now");
            }}
            onBack={() => setLocationOpen(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
