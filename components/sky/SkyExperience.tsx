"use client";

import { Constellation as iauConstellation } from "astronomy-engine";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { loadConstellations, type Constellation } from "@/lib/constellations";
import { loreOf } from "@/lib/constellationLore";
import { formatDec, formatMag, formatRa } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { useObserver } from "@/lib/observer";
import { DEFAULT_H_FOV_DEG, visibleFovY } from "@/lib/orientation";
import { buildFigure } from "@/lib/figure";
import { aimRaDec, pickStar } from "@/lib/picking";
import {
  isNavigationStar,
  loreForStar,
  starFallbackDescription,
} from "@/lib/starLore";
import { radecToVec3, worldToAltAz } from "@/lib/sky";
import {
  loadBoundaries,
  loadMilkyWay,
  loadStarCatalog,
  loadStarMeta,
  starDisplayName,
  type MilkyWay,
  type StarCatalog,
  type StarMeta,
} from "@/lib/stars";
import { useHandTracking } from "@/lib/useHandTracking";
import { useWakeLock } from "@/lib/useWakeLock";
import AltitudeLadder from "./AltitudeLadder";
import CompassStrip from "./CompassStrip";
import ConstellationLabels from "./ConstellationLabels";
import GestureGuide from "./GestureGuide";
import HandControls, { type HandAction } from "./HandControls";
import HandOverlay from "./HandOverlay";
import LocationPicker from "./LocationPicker";
import ObjectPanel, { type SkyObject } from "./ObjectPanel";
import PermissionCard from "./PermissionCard";
import Reticle from "./Reticle";
import SkyCanvas, { type SkyLayers } from "./SkyCanvas";
import SkyHud from "./SkyHud";
import TimeControls from "./TimeControls";
import VirtualControls, { RECENTER_TAU, type ViewCommand } from "./VirtualControls";

type Stage = "loading" | "location" | "intro" | "hand-failed" | "sky";

const NIGHT_KEY = "explorer_night";

/**
 * localStorage에서 초기값을 '지연 초기화'로 읽는다.
 *
 * 이펙트에서 복원하면 안 된다 — 값을 저장하는 이펙트가 먼저 돌면서 기본값으로
 * 덮어쓰고, 그러면 설정이 조용히 유실된다. 이 컴포넌트는 ssr:false로 동적
 * 임포트되므로 렌더 시점에 localStorage를 읽어도 안전하다.
 */
function readStored<T>(key: string, parse: (raw: string) => T, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : parse(raw);
  } catch {
    return fallback; // 사파리 프라이빗 모드 등
  }
}

const DEFAULT_LAYERS: SkyLayers = {
  milkyway: true,
  lines: true,
  labels: true,
  boundaries: false,
  horizon: true,
  ecliptic: false,
  meridian: false,
  bodies: true,
};

const IDLE_ACTION: HandAction = { kind: "idle", panning: false, zoom: 1 };

export default function SkyExperience({ timelapse = false }: { timelapse?: boolean }) {
  const { lang } = useLanguage();
  const t = useCallback(
    (ko: string, en: string) => (lang === "ko" ? ko : en),
    [lang],
  );
  const observer = useObserver();
  const router = useRouter();

  // ── 데이터 ──────────────────────────────────────────────────────────
  const [catalog, setCatalog] = useState<StarCatalog | null>(null);
  const [constellations, setConstellations] = useState<Constellation[]>([]);
  const [starMeta, setStarMeta] = useState<Record<number, StarMeta>>({});
  const [boundaries, setBoundaries] = useState<Float32Array | null>(null);
  const [milkyway, setMilkyway] = useState<MilkyWay | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // ── 스테이지 ────────────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>("loading");
  /** 사용자가 손 인식을 '원하는지'. 실제로 살아 있는지는 hand.status가 말한다. */
  const [handWanted, setHandWanted] = useState(false);

  // ── UI 상태 ─────────────────────────────────────────────────────────
  const [layers, setLayers] = useState<SkyLayers>(DEFAULT_LAYERS);
  const [nightMode, setNightMode] = useState(() =>
    readStored(NIGHT_KEY, (v) => v === "1", false),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  /** 최초 진입에서 위치를 아직 확정하지 않았는가 */
  const [locationConfirmed, setLocationConfirmed] = useState(false);
  const [selected, setSelected] = useState<SkyObject | null>(null);
  const [activeConstellation, setActiveConstellation] = useState<string | null>(null);
  // 선택된 별의 카탈로그 인덱스. StarField가 이걸로 크기·밝기를 올린다.
  const [selectedStar, setSelectedStar] = useState<number | null>(null);
  const [snapped, setSnapped] = useState<string | null>(null);
  // 조준선이 들어와 있는 별자리. 선택(activeConstellation)과 다른 층이다 —
  // 이건 손을 움직이면 저절로 바뀌고, 선택은 핀치해야 바뀐다.
  const [aimed, setAimed] = useState<{
    id: string;
    name: string;
    /** 미리보기용 한 줄. 유래의 첫 문장. */
    teaser: string | null;
  } | null>(null);
  const [readout, setReadout] = useState({ az: 0, alt: 0, fov: 45 });
  /** 나침반·고도자가 매 프레임 읽는 값. state는 숫자 표시(10Hz)에만 쓴다. */
  const readoutRef = useRef({ az: 0, alt: 0, fov: 45 });
  /**
   * 조준선이 '이름표 위'에 올라온 별자리. IAU 경계 기준의 aimed와 다르다 —
   * 경계는 하늘을 빈틈없이 덮어서 늘 무언가에 들어와 있고, 그걸로 안내를 켜면
   * 상시 켜진 것과 같아진다. 이름을 겨눴을 때만 켠다.
   */
  const [aimedLabel, setAimedLabel] = useState<string | null>(null);
  /**
   * 지금 입력 방식으로 '연다'는 동작의 이름.
   * 손을 쓰면 핀치, 손가락이면 터치, 마우스면 클릭이다 — 화면이 알려주는
   * 방법과 실제로 해야 하는 동작이 어긋나면 안내가 아니라 방해가 된다.
   */
  const [coarsePointer, setCoarsePointer] = useState(true);
  const [action, setAction] = useState<HandAction>(IDLE_ACTION);

  // ── ref (60fps 리렌더 방지) ─────────────────────────────────────────
  const rootRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const viewCmdRef = useRef<ViewCommand | null>(null);
  /** SkyRig 추종 시정수. 드래그는 즉각, 자동 이동은 느리게 — VirtualControls가 바꾼다. */
  const followTauRef = useRef(0.045);
  /** 별자리를 열기 직전의 시야. 닫으면 여기로 돌아온다. */
  const viewBeforeRef = useRef<{ az: number; alt: number; zoom: number } | null>(null);
  const quatRef = useRef(new THREE.Quaternion());
  // 초기 FOV도 가정 화각에서 유도한다. 상수로 시작하면 조작이 붙는 순간 화각이 튄다.
  const [initialFov] = useState(() =>
    typeof window === "undefined"
      ? 45
      : visibleFovY(0, 0, window.innerWidth, window.innerHeight, 1, DEFAULT_H_FOV_DEG),
  );
  const fovRef = useRef(initialFov);
  const zoomRef = useRef(1);
  const skyMatRef = useRef(new THREE.Matrix4());
  const cameraRef = useRef<THREE.Camera | null>(null);

  const hand = useHandTracking(stage === "sky");
  useWakeLock(stage === "sky");

  // 파생 상태. 이펙트로 동기화하면 한 프레임 늦고, 손 인식이 중간에 죽었을 때
  // '켜져 있다고 표시되지만 아무것도 안 되는' 상태가 생긴다.
  const handOn = handWanted && hand.status === "running";

  // ── 데이터 로드 ─────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // 은하수는 375KB로 가장 크지만 기본으로 켜져 있으므로 함께 기다린다.
        // 별만 먼저 뜨고 은하수가 나중에 켜지면 하늘이 두 번 바뀌는 게 눈에 띈다.
        const [c, cons, meta, mw] = await Promise.all([
          loadStarCatalog(),
          loadConstellations(),
          loadStarMeta(),
          loadMilkyWay().catch(() => null),
        ]);
        if (!alive) return;
        setCatalog(c);
        setConstellations(cons);
        setStarMeta(meta);
        setMilkyway(mw);
        // 하늘은 '어디서 보느냐'에 따라 통째로 달라지므로 위치가 첫 단계다
        setStage("location");
        // 경계선은 기본 꺼짐이라 첫 페인트 뒤에 느긋하게
        loadBoundaries()
          .then((b) => alive && setBoundaries(b))
          .catch(() => {});
      } catch (e) {
        if (alive) setLoadError(String(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.vision = nightMode ? "night" : "day";
    try {
      localStorage.setItem(NIGHT_KEY, nightMode ? "1" : "0");
    } catch {
      /* 사파리 프라이빗 모드 등 */
    }
  }, [nightMode]);

  // ── 시뮬레이션 시계 ─────────────────────────────────────────────────
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = (now - last) / 1000;
      last = now;
      if (observer.timeScale !== 1) {
        observer.timeOffsetRef.current += dt * (observer.timeScale - 1) * 1000;
      }
      observer.simTimeRef.current = Date.now() + observer.timeOffsetRef.current;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [observer]);

  // ── 입장 ────────────────────────────────────────────────────────────
  const enter = useCallback(async () => {
    const s = await hand.start();
    if (s === "running") {
      setHandWanted(true);
      setStage("sky");
    } else {
      setStage("hand-failed");
    }
  }, [hand]);

  const enterWithoutHand = useCallback(() => {
    setHandWanted(false);
    setStage("sky");
  }, []);

  // /explore는 실시간 하늘이다. 이전 세션에서 시간을 돌려 둔 상태로 들어와
  // '하늘이 이상하다'가 되는 걸 막으려면 들어올 때 실시간으로 되돌려야 한다.
  const resetTime = observer.resetTime;
  useEffect(() => {
    if (!timelapse) resetTime();
  }, [timelapse, resetTime]);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const sync = () => setCoarsePointer(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const openHint = useMemo(() => {
    if (handOn) return t("핀치해서 자세히 보기", "Pinch to open");
    if (coarsePointer) return t("터치해서 자세히 보기", "Tap to open");
    return t("클릭해서 자세히 보기", "Click to open");
  }, [handOn, coarsePointer, t]);

  // ── 방향 리드아웃 (10Hz) ────────────────────────────────────────────
  // ⚠️ VirtualControls의 이펙트 의존성에 들어가므로 반드시 안정적인 참조여야 한다.
  //    인라인 화살표로 넘기면 매 렌더마다 새 함수 → 이펙트 재실행 → setState →
  //    다시 렌더로 무한 루프가 돈다.
  const handleZoomChange = useCallback((z: number) => {
    setAction((a) => (a.zoom === z ? a : { ...a, zoom: z }));
  }, []);

  const orientAcc = useRef(0);
  // 매 프레임 호출되므로 벡터를 재사용한다. 새로 만들면 60Hz로 GC가 돈다.
  const _dir = useRef(new THREE.Vector3());
  const onOrient = useCallback((q: THREE.Quaternion, fov: number) => {
    const now = performance.now();
    if (now - orientAcc.current < 100) return;
    orientAcc.current = now;
    _dir.current.set(0, 0, -1).applyQuaternion(q);
    const { az, alt } = worldToAltAz(_dir.current);
    // ⚠️ ref는 스로틀 '전에' 쓴다. 여기가 매 프레임 갱신되는 유일한 경로이고,
    //    나침반 눈금이 부드럽게 흐르는 것도 이 한 줄에 달려 있다.
    readoutRef.current.az = az;
    readoutRef.current.alt = alt;
    readoutRef.current.fov = fov;
    // 값이 실제로 달라졌을 때만 setState. 정지 상태에서 10Hz로 리렌더를
    // 유발할 이유가 없다.
    setReadout((prev) =>
      Math.abs(prev.az - az) < 0.05 &&
      Math.abs(prev.alt - alt) < 0.05 &&
      Math.abs(prev.fov - fov) < 0.05
        ? prev
        : { az, alt, fov },
    );
  }, []);

  // ── 별 → SkyObject 변환 ─────────────────────────────────────────────
  const starToObject = useCallback(
    (index: number): SkyObject | null => {
      if (!catalog) return null;
      const m = starMeta[index];
      const x = catalog.positions[index * 3];
      const y = catalog.positions[index * 3 + 1];
      const z = catalog.positions[index * 3 + 2];
      const ra = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
      const dec = (Math.asin(THREE.MathUtils.clamp(z, -1, 1)) * 180) / Math.PI;

      // 별자리 소속은 메타 필드(누락분이 있다)에 기대지 않고 IAU 경계에서 직접
      // 계산한다. 항상 값이 있고, 경계 정의와 정확히 일치한다.
      // ⚠️ Constellation()은 RA를 '시간' 단위로 받는다.
      let conId: string | null = null;
      try {
        conId = iauConstellation(ra / 15, dec).symbol;
      } catch {
        conId = m?.con ?? null;
      }
      const con = conId ? constellations.find((c) => c.id === conId) : undefined;
      const conName = con ? (lang === "ko" ? con.nameKo : con.nameEn) : null;

      const designation =
        m?.bayer || m?.flam
          ? `${m.bayer ?? m.flam}${con ? ` ${con.nameGen}` : ""}`
          : (m?.desig ?? null);

      const title =
        starDisplayName(m, con?.nameGen ?? null) ?? t("이름 없는 별", "Unnamed star");
      // 제목과 부제가 같은 값으로 중복되지 않게 한다
      const eyebrowParts = [conName, designation !== title ? designation : null].filter(
        Boolean,
      );

      const bv = catalog.ci[index];
      const cls =
        bv < -0.1 ? "O–B" : bv < 0.3 ? "A" : bv < 0.6 ? "F" : bv < 0.9 ? "G" : bv < 1.4 ? "K" : "M";

      // 유래를 먼저, 수치는 그다음. 숫자표만 있는 화면은 '무엇인지'는 알려주지만
      // '왜 이 별인지'는 알려주지 않는다.
      const lore = loreForStar(m?.name, conId, lang);
      const description =
        lore ??
        starFallbackDescription(lang, {
          constellation: conName,
          bayer: m?.bayer ?? null,
          flamsteed: m?.flam ?? null,
          mag: catalog.mag[index],
          bv,
        });

      const isNav = isNavigationStar(m?.name, conId);

      return {
        kind: "star",
        eyebrow: eyebrowParts.length ? eyebrowParts.join(" · ") : t("항성", "Star"),
        title,
        description,
        facts: [
          ...(isNav
            ? [
                {
                  labelKo: "천측 항법 별",
                  labelEn: "Navigational star",
                  value: t("항해력 57성", "In the almanac 57"),
                },
              ]
            : []),
          { labelKo: "겉보기 등급", labelEn: "Apparent magnitude", value: formatMag(catalog.mag[index]) },
          { labelKo: "적경 (J2000)", labelEn: "Right ascension", value: formatRa(ra) },
          { labelKo: "적위 (J2000)", labelEn: "Declination", value: formatDec(dec) },
          { labelKo: "색지수 B−V", labelEn: "Colour index B−V", value: bv.toFixed(2) },
          { labelKo: "분광형 (대략)", labelEn: "Approx. spectral class", value: cls },
          ...(m?.hip ? [{ labelKo: "히파르코스 번호", labelEn: "Hipparcos", value: `HIP ${m.hip}` }] : []),
        ],
      };
    },
    [catalog, starMeta, constellations, lang, t],
  );

  /**
   * 별자리를 열면 그쪽으로 돌아보며 확대하고, 닫으면 원래 자리로 돌아온다.
   *
   * ⚠️ 지평선 아래 별자리에는 적용하지 않는다. 라벨을 눌러 여는 경우가 있는데,
   *    그때 발밑으로 카메라를 돌리면 바다만 보이고 사용자는 길을 잃는다.
   */
  const frameConstellation = useCallback(
    (id: string) => {
      const cmd = viewCmdRef.current;
      const c = constellations.find((x) => x.id === id);
      if (!cmd || !c) return;

      const v = radecToVec3(c.labelRa, c.labelDec, 1).applyMatrix4(skyMatRef.current);
      const { az, alt } = worldToAltAz(v);
      if (alt < 6) return;

      // 특성 각크기 ≈ √면적. 여백을 15%만 남기고 최대 배율까지 열어 둔다 —
      // 작은 별자리는 거의 최대치(×8)까지 들어가고, 허큘리스처럼 큰 것은
      // 화면을 넘지 않는 선에서 멈춘다.
      const sizeDeg = Math.sqrt(c.areaSqDeg);
      const zoom = THREE.MathUtils.clamp(65 / (sizeDeg * 1.15), 1, 8);

      // 되돌아올 자리는 '처음 연 시점'만 기억한다. 별자리를 연달아 열 때
      // 매번 덮어쓰면 확대된 상태가 원점이 돼 영영 못 돌아온다.
      if (!viewBeforeRef.current) viewBeforeRef.current = cmd.get();
      cmd.set({ az, alt, zoom });
      // 보는 동안 하늘이 흘러가 버리지 않게 붙들어 둔다. 끌면 조금 딸려 오다
      // 놓으면 돌아온다 — 닫기(✕)를 눌러야 풀린다.
      cmd.lock({ az, alt });
    },
    [constellations],
  );

  const restoreView = useCallback(() => {
    const cmd = viewCmdRef.current;
    const before = viewBeforeRef.current;
    viewBeforeRef.current = null;
    if (!cmd) return;
    cmd.unlock();
    if (before) cmd.set(before);
  }, []);

  const constellationToObject = useCallback(
    (id: string): SkyObject | null => {
      const c = constellations.find((x) => x.id === id);
      if (!c || !catalog) return null;

      const indices = [...new Set(c.segments)];
      // 별자리 선을 이루는 별들. 밝은 순으로 정렬해 위에서부터 읽히게 한다.
      const members = indices
        .map((i) => {
          const m = starMeta[i];
          const desig = m?.bayer ?? m?.flam ?? m?.desig ?? null;
          return {
            name: m?.name ?? (desig ? `${desig} ${c.nameGen}` : `HIP ${m?.hip ?? "—"}`),
            desig: m?.name && desig ? `${desig} ${c.nameGen}` : null,
            mag: catalog.mag[i],
          };
        })
        .sort((a, b) => a.mag - b.mag)
        .slice(0, 12);

      const brightest = c.brightest >= 0 ? starMeta[c.brightest] : undefined;
      const monthName =
        c.bestMonth == null
          ? null
          : lang === "ko"
            ? `${c.bestMonth}월`
            : new Date(2026, c.bestMonth - 1, 1).toLocaleString("en-US", { month: "long" });

      return {
        kind: "constellation",
        eyebrow: `${c.nameLat} · ${c.id}`,
        title: lang === "ko" ? c.nameKo : c.nameEn,
        description: loreOf(c.id, lang) ?? undefined,
        figure: buildFigure(c.segments, catalog.positions, catalog.mag) ?? undefined,
        members,
        facts: [
          { labelKo: "라틴어 이름", labelEn: "Latin name", value: c.nameLat },
          { labelKo: "소유격", labelEn: "Genitive", value: c.nameGen },
          { labelKo: "약어", labelEn: "Abbreviation", value: c.id },
          {
            labelKo: "면적",
            labelEn: "Area",
            value: `${c.areaSqDeg.toLocaleString()} deg² · ${c.areaRank}/88`,
          },
          { labelKo: "그림을 이루는 별", labelEn: "Stars in figure", value: `${indices.length}` },
          ...(c.brightest >= 0
            ? [
                {
                  labelKo: "가장 밝은 별",
                  labelEn: "Brightest star",
                  value: `${brightest?.name ?? brightest?.desig ?? "—"} (${formatMag(catalog.mag[c.brightest])})`,
                },
              ]
            : []),
          ...(monthName
            ? [{ labelKo: "보기 좋은 때", labelEn: "Best seen", value: monthName }]
            : []),
        ],
      };
    },
    [constellations, catalog, starMeta, lang],
  );

  // ── 선택 ────────────────────────────────────────────────────────────
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

  const selectAt = useCallback(
    (ndcX: number, ndcY: number) => {
      const camera = cameraRef.current;
      if (!camera || !catalog) return;
      const hit = pickStar(ndcX, ndcY, camera, skyMatRef.current, catalog, {
        fovDeg: fovRef.current,
        viewportH: rootRef.current?.clientHeight || window.innerHeight,
        zoom: zoomRef.current,
      });
      if (hit) {
        const obj = starToObject(hit.index);
        if (obj) {
          setSelected(obj);
          setSelectedStar(hit.index);
          // 선택한 별이 속한 별자리 선을 함께 강조한다
          const p = catalog.positions;
          const ra =
            ((Math.atan2(p[hit.index * 3 + 1], p[hit.index * 3]) * 180) / Math.PI + 360) % 360;
          const dec =
            (Math.asin(THREE.MathUtils.clamp(p[hit.index * 3 + 2], -1, 1)) * 180) / Math.PI;
          try {
            setActiveConstellation(iauConstellation(ra / 15, dec).symbol);
          } catch {
            setActiveConstellation(starMeta[hit.index]?.con ?? null);
          }
          return;
        }
      }
      // 별이 안 잡히면 별자리로 폴백 — 오리온 별 사이 빈 하늘을 조준해도
      // 오리온이 열려야 한다.
      setSelectedStar(null);

      // ⚠️ 라벨 앵커에서 가장 가까운 것을 찾으면 안 된다. 앵커는 별자리의
      //    '중심점'이라, 큰 별자리 안을 눌러도 중심이 멀면 아무것도 안 열린다.
      //    IAU 경계는 하늘을 빈틈없이 덮으므로 방향만 알면 정확히 하나가 나온다.
      const { ra, dec, sinAlt } = aimRaDec(camera, skyMatRef.current, ndcX, ndcY);
      let cid: string | null = null;
      // 바다를 누른 것이라면 열 것이 없다
      if (sinAlt > -0.03) {
        try {
          cid = iauConstellation(ra / 15, dec).symbol;
        } catch {
          cid = null;
        }
      }
      if (cid) {
        setActiveConstellation(cid);
        setSelected(constellationToObject(cid));
        frameConstellation(cid);
      } else {
        setSelected(null);
        setActiveConstellation(null);
        restoreView();
      }
    },
    [
      catalog,
      starToObject,
      starMeta,
      constellationToObject,
      frameConstellation,
      restoreView,
    ],
  );

  // ── 조준선 (150ms) ──────────────────────────────────────────────────
  // 별 스냅과 별자리 조준을 한 루프에서 본다. 둘 다 '화면 중앙에 뭐가 있나'라는
  // 같은 질문이고, 타이머를 둘로 나누면 두 표시가 서로 어긋난 프레임에 바뀐다.
  useEffect(() => {
    if (stage !== "sky" || !catalog) return;
    const id = setInterval(() => {
      const camera = cameraRef.current;
      if (!camera) return;

      // 레티클도 같은 규칙을 쓴다 — 커지는 조건과 눌렀을 때 열리는 조건이
      // 다르면 '커졌는데 안 열린다'가 된다.
      const hit = pickStar(0, 0, camera, skyMatRef.current, catalog, {
        fovDeg: fovRef.current,
        viewportH: rootRef.current?.clientHeight || window.innerHeight,
        zoom: zoomRef.current,
      });
      if (hit) {
        const m = starMeta[hit.index];
        const con = m?.con ? constellations.find((c) => c.id === m.con) : undefined;
        setSnapped(starDisplayName(m, con?.nameGen ?? null));
      } else {
        setSnapped(null);
      }

      const { ra, dec, sinAlt } = aimRaDec(camera, skyMatRef.current);

      // 지평선 아래를 보고 있으면 조준할 게 없다. 발밑의 별자리를 밝히는 건
      // 항법으로 아무 의미가 없고, 어차피 지평선 아래는 라벨도 안 뜬다.
      if (sinAlt < -0.03) {
        setAimed(null);
        return;
      }

      let cid: string | null = null;
      try {
        cid = iauConstellation(ra / 15, dec).symbol;
      } catch {
        cid = null;
      }
      setAimed((prev) => {
        if (prev?.id === cid) return prev;
        if (!cid) return null;
        const c = constellations.find((x) => x.id === cid);
        if (!c) return null;
        // 미리보기는 첫 문장까지만. 전체 설명은 열었을 때 읽는 것이고,
        // 여기서 길어지면 조준선을 옮길 때마다 화면이 시끄러워진다.
        const lore = loreOf(cid, lang);
        const teaser = lore ? (lore.split(/(?<=[.。])\s/)[0] ?? null) : null;
        return { id: cid, name: lang === "ko" ? c.nameKo : c.nameEn, teaser };
      });
    }, 150);
    return () => clearInterval(id);
  }, [stage, catalog, starMeta, constellations, lang]);

  // ── 렌더 ────────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <PermissionCard
        title={t("성표를 불러오지 못했습니다", "The catalogue didn't load")}
        body={t(
          "연결 상태를 확인하고 다시 시도하세요.",
          "Check your connection and try again.",
        )}
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
        firstRun={!locationConfirmed}
        lat={observer.lat}
        lon={observer.lon}
        label={observer.label}
        gpsStatus={observer.gpsStatus}
        gpsFix={observer.gpsFix}
        onPick={(la, lo, name) =>
          observer.setLocation(la, lo, "manual", name ?? undefined)
        }
        onUseGps={() => void observer.requestGps()}
        onConfirm={() => {
          setLocationConfirmed(true);
          setStage("intro");
        }}
        // 전체 리로드가 아니라 클라이언트 라우팅. 성표·모델을 다시 받을 이유가 없다.
        onBack={() => router.push("/")}
      />
    );
  }

  if (stage === "intro") {
    const busy = hand.status === "pending" || hand.status === "loading";
    return (
      <AnimatePresence mode="wait">
      <PermissionCard
        key="intro"
        eyebrow={t("천측 항법 · 손으로 항해", "Celestial navigation · Sailed by hand")}
        title={t("손으로 하늘을 항해합니다", "You sail the sky by hand")}
        body={t(
          "손바닥을 펴고 좌우로 저으면 하늘이 그쪽으로 돌아갑니다. 그 손을 카메라 쪽으로 밀면 다가가고, 뒤로 당기면 물러납니다. 주먹을 쥐면 처음 배율로 돌아오고, 엄지와 검지를 붙이면 조준선 안의 별이 열립니다.",
          "Sweep an open palm and the sky turns with it. Push that hand toward the camera to close in, pull it back to retreat. Make a fist to return to the start, pinch to open whatever sits in the crosshair.",
        )}
        rationale={t(
          "카메라는 손을 읽는 데만 씁니다. 영상은 화면에 띄우지 않고, 기기 밖으로 나가지 않습니다.",
          "The camera is used only to read your hand. The video is never shown and never leaves your device.",
        )}
        ctaLabel={
          busy ? t("준비 중…", "Getting ready…") : t("항해 시작", "Set sail")
        }
        onCta={() => {
          if (!busy) void enter();
        }}
        secondaryLabel={t("손 없이 항해하기", "Sail without hand tracking")}
        onSecondary={enterWithoutHand}
      />
      </AnimatePresence>
    );
  }

  if (stage === "hand-failed") {
    const s = hand.status;
    const title =
      s === "insecure"
        ? t("보안 연결이 필요합니다", "This needs a secure connection")
        : s === "denied"
          ? t("카메라를 열지 못했습니다", "The camera didn't open")
          : s === "busy"
            ? t("카메라가 사용 중입니다", "The camera is in use")
            : s === "failed"
              ? t("손 인식 모델을 불러오지 못했습니다", "The hand model didn't load")
              : t("이 기기에서는 손 인식이 안 됩니다", "Hand tracking won't run here");
    const body =
      s === "insecure"
        ? t(
            "브라우저는 보안 연결에서만 카메라를 엽니다. localhost이거나 https로 접속하면 손 인식이 켜집니다.",
            "Browsers only open the camera over a secure connection. Load this page on localhost or over https.",
          )
        : s === "busy"
          ? t(
              "카메라를 쓰는 다른 앱을 닫고 다시 시도하세요.",
              "Close whatever else is using the camera, then try again.",
            )
          : t(
              "손 인식 없이도 드래그와 휠로 하늘을 둘러볼 수 있습니다.",
              "You can still sail the sky by dragging and scrolling.",
            );

    return (
      <AnimatePresence mode="wait">
      <PermissionCard
        key="hand-failed"
        eyebrow={t("손 인식", "Hand tracking")}
        title={title}
        body={body}
        ctaLabel={t("손 없이 항해하기", "Sail without hand tracking")}
        onCta={enterWithoutHand}
        secondaryLabel={t("다시 시도", "Try again")}
        onSecondary={() => void enter()}
      />
      </AnimatePresence>
    );
  }

  return (
    <motion.div
      ref={rootRef}
      className="immersive-root"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {/*
        인식 입력 전용 <video>. 화면에는 절대 보이지 않지만 DOM에는 있어야
        프레임이 디코딩된다. display:none으로 두면 일부 브라우저가 디코딩을
        멈춰 인식이 통째로 죽는다 — 그래서 1px 투명으로 숨긴다.
      */}
      <video
        ref={hand.videoRef}
        playsInline
        muted
        autoPlay
        disablePictureInPicture
        aria-hidden
        className="pointer-events-none absolute h-px w-px opacity-0"
        style={{ top: 0, left: 0 }}
      />

      {catalog && (
        <SkyCanvas
          catalog={catalog}
          constellations={constellations}
          boundaries={boundaries}
          milkyway={milkyway}
          lat={observer.lat}
          lon={observer.lon}
          timeRef={observer.simTimeRef}
          quatRef={quatRef}
          fovRef={fovRef}
          skyMatRef={skyMatRef}
          cameraRef={cameraRef}
          initialFov={initialFov}
          transparent={false}
          saturation={nightMode ? 0 : 0.55}
          nightMode={nightMode}
          layers={layers}
          activeConstellation={activeConstellation}
        followTauRef={followTauRef}
        aimedConstellation={aimed?.id ?? null}
        selectedStar={selectedStar}
          onOrient={onOrient}
        />
      )}

      {/* 제스처/탭 오버레이. 손 인식이 꺼졌을 때만 포인터를 받는다.
          z-0으로 캔버스 바로 위에만 있어야 한다 — 이보다 높으면 별자리 라벨
          버튼을 덮어서 클릭이 통째로 먹히지 않는다. */}
      <div
        ref={overlayRef}
        className="absolute inset-0 z-0"
        style={{ touchAction: "none", pointerEvents: handOn ? "none" : "auto" }}
      />

      <HandControls
        handRef={hand.handRef}
        quatRef={quatRef}
        fovRef={fovRef}
        zoomRef={zoomRef}
        enabled={handOn}
        onPinch={selectAt}
        onAction={setAction}
      />

      <VirtualControls
        commandRef={viewCmdRef}
        followTauRef={followTauRef}
        targetRef={overlayRef}
        quatRef={quatRef}
        fovRef={fovRef}
        zoomRef={zoomRef}
        enabled={!handOn}
        // 손 인식이 꺼져 있으면 HandControls가 안 돌아 배율 표시가 1.0에 멈춘다.
        // 폴백 모드에서도 휠 줌이 HUD에 반영되어야 한다.
        onZoomChange={handleZoomChange}
        onTap={selectAt}
      />

      <HandOverlay
        landmarksRef={hand.landmarksRef}
        handRef={hand.handRef}
        active={handOn}
        nightMode={nightMode}
      />

      {layers.labels && (
        <ConstellationLabels
          anchors={anchors}
          skyMatRef={skyMatRef}
          cameraRef={cameraRef}
          containerRef={rootRef}
          nightMode={nightMode}
          activeId={activeConstellation}
          aimedId={aimed?.id ?? null}
          onAimLabel={setAimedLabel}
          onSelect={(id) => {
            setActiveConstellation(id);
            setSelectedStar(null);
            setSelected(constellationToObject(id));
            frameConstellation(id);
          }}
        />
      )}

      <CompassStrip readoutRef={readoutRef} reference="true" />
      <AltitudeLadder readoutRef={readoutRef} />

      {/* 실제 상태를 그대로 넘긴다 — 실패를 '꺼짐'으로 뭉개면 원인이 안 보인다. */}
      <GestureGuide action={action} handStatus={handWanted ? hand.status : "idle"} />

      {/* 이름은 화면에 한 번만. 라벨 레이어가 켜져 있으면 조준한 별자리 이름은
          이미 제자리에 떠 있고(그때 함께 밝아진다), 레티클에 또 적으면 같은
          단어가 두 번 보인다. 라벨을 끈 사람에게만 여기서 알려준다. */}
      <Reticle
        snapped={!!snapped}
        // 이름표를 겨눠야 안내가 뜨므로, 이름은 이미 그 자리에 있다.
        name={null}
        // 패널이 열려 있으면 이미 열려 있는 것이라 안내가 소음이다.
        hint={aimedLabel && !selected ? openHint : null}
      />


      <SkyHud
        az={readout.az}
        alt={readout.alt}
        zoom={action.zoom}
        layers={layers}
        onToggleLayer={(k) => setLayers((l) => ({ ...l, [k]: !l[k] }))}
        nightMode={nightMode}
        onToggleNight={() => setNightMode((v) => !v)}
        handOn={handOn}
        handStatus={hand.status}
        onToggleHand={() => {
          if (handOn) {
            setHandWanted(false);
            hand.stop();
          } else {
            setHandWanted(true);
            void hand.start();
          }
        }}
        // 도시명이 없으면(지도에서 직접 찍은 경우) 좌표를 보여준다.
        // '위치 설정'이라고만 뜨면 방금 고른 위치가 반영됐는지 알 수 없다.
        locationLabel={
          observer.label ??
          `${Math.abs(observer.lat).toFixed(1)}°${observer.lat >= 0 ? "N" : "S"} ${Math.abs(observer.lon).toFixed(1)}°${observer.lon >= 0 ? "E" : "W"}`
        }
        onOpenLocation={() => setLocationOpen(true)}
        onOpenSettings={() => setSettingsOpen((v) => !v)}
        settingsOpen={settingsOpen}
        onRecenter={() => {
          // ⚠️ quatRef만 바꾸면 안 된다. 방위·고도의 진짜 상태는 VirtualControls
          //    안에 있어서, 다음 드래그에 옛 값으로 되돌아가 화면이 튄다.
          viewCmdRef.current?.unlock();
          viewBeforeRef.current = null;
          viewCmdRef.current?.set({ az: 0, alt: 20, zoom: 1 }, RECENTER_TAU);
        }}
        extraPanel={
          timelapse ? (
            <TimeControls
              timeRef={observer.simTimeRef}
              timeScale={observer.timeScale}
              onScale={observer.setTimeScale}
              onReset={observer.resetTime}
              open
            />
          ) : null
        }
      />

      <ObjectPanel
        object={selected}
        onClose={() => {
          setSelected(null);
          setSelectedStar(null);
          setActiveConstellation(null);
          restoreView();
        }}
      />

      <LocationPicker
        open={locationOpen}
        firstRun={false}
        lat={observer.lat}
        lon={observer.lon}
        label={observer.label}
        gpsStatus={observer.gpsStatus}
        gpsFix={observer.gpsFix}
        onPick={(la, lo, name) =>
          observer.setLocation(la, lo, "manual", name ?? undefined)
        }
        onUseGps={() => void observer.requestGps()}
        onConfirm={() => setLocationOpen(false)}
        onBack={() => setLocationOpen(false)}
      />
    </motion.div>
  );
}
