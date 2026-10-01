"use client";

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useLanguage } from "@/lib/i18n";
import { useObserver } from "@/lib/observer";
import {
  angleBetween,
  project,
  radecToUnit,
  viewAt,
  viewBasis,
  viewScale,
  type ScreenPoint,
  type SkyView,
  type ViewBasis,
  type ViewKey,
} from "@/lib/skyProjection";
import { useAboutSky, type AboutSky } from "./skyData";

/**
 * 소개 페이지의 스크롤 필름.
 *
 * 영상 파일이 아니라 실제 별 데이터로 매 프레임 그리는 캔버스다. 스크롤이
 * 재생 헤드이고, 되감으면 그대로 되감긴다. 영상으로 구우면 해상도가 고정되고
 * 수 MB가 들며 무엇보다 '진짜 하늘'이라는 이 제품의 전제가 거짓이 된다 —
 * 여기 찍히는 별 하나하나는 탐색 화면과 같은 카탈로그의 같은 좌표다.
 *
 * 여섯 장면: 점 → 선 → 88 → 구역 → 축 → 거꾸로.
 *
 * three.js를 쓰지 않는다. 필요한 건 점·선·호뿐이고, 평사도법이면 일주운동
 * 궤적이 화면 중심을 도는 동심원이라 `arc()` 한 번으로 그려진다.
 *
 * ⚠️ 60fps 경로다. 진행도·시야·시간은 전부 ref/지역 변수로 돌고 React state를
 *    건드리지 않는다. 글자 판독값도 textContent로 직접 쓴다.
 */

// ─── 장면 ────────────────────────────────────────────────────────────

type ChapterId = "dots" | "join" | "all" | "regions" | "pole" | "invert";

const CHAPTERS: readonly { id: ChapterId; from: number; to: number; hold: number }[] = [
  { id: "dots", from: 0, to: 0.15, hold: 0 },
  { id: "join", from: 0.15, to: 0.33, hold: 0.26 },
  { id: "all", from: 0.33, to: 0.53, hold: 0.46 },
  { id: "regions", from: 0.53, to: 0.71, hold: 0.64 },
  { id: "pole", from: 0.71, to: 0.89, hold: 0.84 },
  { id: "invert", from: 0.89, to: 1, hold: 1 },
];
const POLE_CHAPTER = 4;

/**
 * 스크롤 길이(화면 수). 필름이 고정된 채 머무는 거리는 이보다 한 화면 짧다.
 * 장면 타이밍이 전부 진행도(0..1) 기준이라 이 값 하나로 필름 전체가 늘어난다.
 */
const FILM_SCREENS = 11;
/**
 * 스크롤 → 재생 헤드 스무딩(초). 손을 뗀 뒤에도 이만큼 미끄러지며 멈춘다.
 * 0.16에서는 휠을 멈추는 즉시 장면이 서서 '잔잔하다'기보다 '끊긴다'로 읽혔다.
 */
const SCROLL_TAU = 0.32;

/**
 * 별의 숨. 별마다 주기·위상이 다른 느린 사인 두 개를 겹친다.
 *
 * 홈 별밭은 '한 번에 하나'만 반짝인다 — 모든 별을 같은 사인으로 흔들면 화면
 * 전체가 한 덩어리로 일렁여 배경 영상처럼 보여서다. 여기서는 별마다 주기가
 * 달라(4–10초 + 2–5초) 같은 순간에 같은 방향으로 움직이는 무리가 생기지 않는다.
 * 그래서 전체 밝기는 거의 일정하고, 눈에 들어오는 건 몇몇 별이 천천히 차오르고
 * 잦아드는 것뿐이다.
 */
const BREATH_SLOW: [number, number] = [4, 10];
const BREATH_FAST: [number, number] = [2.2, 5];
const BREATH_AMP: [number, number] = [0.22, 0.55];

// 장면 안의 타이밍(스크롤 진행도 기준)
const ORION_TRACE: [number, number] = [0.17, 0.29];
const WAVE_FROM = 0.345;
const WAVE_SPAN = 0.125;
const WAVE_DUR = 0.035;
/** 일주운동 궤적: 스크롤로 이만큼 '노출'한다. 90° = 6시간. */
const TRAIL: [number, number] = [0.785, 0.885];
const TRAIL_DEG = 90;
/** 궤적을 긋는 별의 한계 등급 */
const TRAIL_MAG = 4.8;
/** 궤적이 완전히 사라진 '뒤에만' 시선을 극에서 뗀다. 극이 중심을 벗어나면
 *  궤적은 더 이상 화면 중심의 동심원이 아니다. */
const TRAIL_OUT: [number, number] = [0.89, 0.915];
const HORIZON_IN: [number, number] = [0.925, 0.965];

/** 극을 볼 때의 기준 적경. 여기에 궤적 회전이 더해진다. */
const POLE_RA = 184;

// ─── 별 그리기 ───────────────────────────────────────────────────────

/** 이보다 어두운 별은 아예 싣지 않는다. 화각이 가장 좁을 때의 한계보다 조금 아래. */
const STAR_LIMIT = 6.3;
const TINTS = 5;
const ALEVELS = 12;
const TAU = Math.PI * 2;
const D2R = Math.PI / 180;
const UI_FONT = `"Pretendard Variable", Pretendard, Arial, sans-serif`;
const MUTED = "154,154,162";

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ramp = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const smooth = (t: number) => t * t * (3 - 2 * t);
const sstep = (p: number, a: number, b: number) => smooth(ramp(p, a, b));

function tintOf(ci: number): number {
  return ci < -0.05 ? 0 : ci < 0.35 ? 1 : ci < 0.85 ? 2 : ci < 1.35 ? 3 : 4;
}

/** 버킷의 대표 B−V → 색. 채도 0.55 규칙(DESIGN.md)을 그대로 따른다. */
function tintRgb(k: number): [number, number, number] {
  const ci = [-0.2, 0.15, 0.6, 1.1, 1.65][k];
  const cool = [155, 176, 255];
  const warm = [255, 184, 107];
  const f = ci < 0.6 ? clamp01((0.6 - ci) / 0.9) : clamp01((ci - 0.6) / 1.2);
  const to = ci < 0.6 ? cool : warm;
  const s = 0.55;
  return [0, 1, 2].map((j) => Math.round(255 + (255 + (to[j] - 255) * f - 255) * s)) as [
    number,
    number,
    number,
  ];
}

/** 반짝임 봉투 — 홈 별밭과 같은 곡선. 짧게 두어 번 떨리고 잦아든다. */
function twinkleEnvelope(t: number, amp: number) {
  if (t <= 0 || t >= 1) return 1;
  return 1 + Math.sin(t * Math.PI * 5.5) * Math.pow(1 - t, 2) * amp;
}

// ─── 데이터 준비 ─────────────────────────────────────────────────────

interface PreparedCon {
  id: string;
  rank: number;
  nameKo: string;
  nameEn: string;
  area: number;
  segs: number[];
  label: [number, number, number];
}

interface StarLabel {
  v: [number, number, number];
  ko: string;
  en: string;
  /** 이 진행도에서 떠오른다 */
  at: number;
}

interface Prepared {
  n: number;
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  mag: Float32Array;
  tint: Uint8Array;
  /** 별의 숨: 각속도(rad/s)·위상·진폭 */
  bw1: Float32Array;
  bw2: Float32Array;
  bp1: Float32Array;
  bp2: Float32Array;
  bamp: Float32Array;
  /** 이 별을 그림에 쓰는 별자리 인덱스, 없으면 -1 */
  con: Int16Array;
  /** 카탈로그 전체의 위치·등급 — 별자리 선의 끝점은 필름에 싣지 않은 어두운 별일 수 있다 */
  pos: Float32Array;
  catMag: Float32Array;
  cons: PreparedCon[];
  orion: number;
  hydra: number;
  crux: number;
  uma: number;
  umi: number;
  orionCenter: { ra: number; dec: number };
  waveStart: Float32Array;
  boundVerts: Float32Array;
  boundStarts: Int32Array;
  betelgeuse: StarLabel | null;
  rigel: StarLabel | null;
  polaris: StarLabel | null;
  nakedEye: number;
  totalArea: number;
}

function vecOf(pos: Float32Array, i: number): [number, number, number] {
  return [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
}

function prepare(sky: AboutSky): Prepared {
  const { catalog, constellations, boundaries, meta } = sky;

  // 카탈로그는 밝은 순으로 정렬돼 있다(검증됨). 앞에서부터 자르면 된다.
  let n = 0;
  while (n < catalog.count && catalog.mag[n] < STAR_LIMIT) n++;
  let nakedEye = 0;
  while (nakedEye < catalog.count && catalog.mag[nakedEye] < 6) nakedEye++;

  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const z = new Float32Array(n);
  const mag = new Float32Array(n);
  const tint = new Uint8Array(n);
  const bw1 = new Float32Array(n);
  const bw2 = new Float32Array(n);
  const bp1 = new Float32Array(n);
  const bp2 = new Float32Array(n);
  const bamp = new Float32Array(n);
  const between = ([lo, hi]: [number, number]) => lo + Math.random() * (hi - lo);
  for (let i = 0; i < n; i++) {
    bw1[i] = TAU / between(BREATH_SLOW);
    bw2[i] = TAU / between(BREATH_FAST);
    bp1[i] = Math.random() * TAU;
    bp2[i] = Math.random() * TAU;
    bamp[i] = between(BREATH_AMP);
    x[i] = catalog.positions[i * 3];
    y[i] = catalog.positions[i * 3 + 1];
    z[i] = catalog.positions[i * 3 + 2];
    mag[i] = catalog.mag[i];
    tint[i] = tintOf(catalog.ci[i]);
  }

  const con = new Int16Array(n).fill(-1);
  const cons: PreparedCon[] = constellations.map((c, ci) => {
    for (const s of c.segments) if (s < n && con[s] < 0) con[s] = ci;
    return {
      id: c.id,
      rank: c.rank,
      nameKo: c.nameKo,
      nameEn: c.nameEn,
      area: c.areaSqDeg,
      segs: c.segments,
      label: radecToUnit(c.labelRa, c.labelDec),
    };
  });
  const find = (id: string) => constellations.findIndex((c) => c.id === id);
  const orion = find("Ori");
  const hydra = constellations.reduce(
    (best, c, i) => (c.areaSqDeg > constellations[best].areaSqDeg ? i : best),
    0,
  );
  const crux = constellations.reduce(
    (best, c, i) => (c.areaSqDeg < constellations[best].areaSqDeg ? i : best),
    0,
  );

  // 별자리 중심 = 그림을 이루는 별들의 평균 방향
  const centers = constellations.map((c) => {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (const s of new Set(c.segments)) {
      cx += catalog.positions[s * 3];
      cy += catalog.positions[s * 3 + 1];
      cz += catalog.positions[s * 3 + 2];
    }
    const l = Math.hypot(cx, cy, cz) || 1;
    return [cx / l, cy / l, cz / l] as [number, number, number];
  });
  const oc = centers[orion] ?? radecToUnit(84, 3);
  const orionCenter = {
    ra: ((Math.atan2(oc[1], oc[0]) / D2R) + 360) % 360,
    dec: Math.asin(oc[2]) / D2R,
  };

  // 88개가 오리온에서 멀어지는 순서로 번진다. 물결처럼 퍼지는 게 '사람들이
  // 하나씩 더해 갔다'를 가장 조용하게 말한다.
  const order = constellations
    .map((_, i) => i)
    .filter((i) => i !== orion)
    .sort((a, b) => angleBetween(centers[a], oc) - angleBetween(centers[b], oc));
  const waveStart = new Float32Array(constellations.length).fill(-1);
  order.forEach((ci, k) => {
    waveStart[ci] = WAVE_FROM + WAVE_SPAN * (k / Math.max(1, order.length - 1));
  });

  // 경계선: 긴 선분을 2° 이하로 잘라 대원을 따라 휘게 한다. 평사도법에서는
  // 직선이 대원이 아니므로, 30°짜리 선분을 곧게 그으면 경계가 별자리를
  // 가로질러 버린다. 탐색 화면(원근 투영에서 3D 직선 = 대원)과 같은 모양이 된다.
  const segCount = boundaries.length / 6;
  const verts: number[] = [];
  const starts = new Int32Array(segCount + 1);
  for (let s = 0; s < segCount; s++) {
    starts[s] = verts.length / 3;
    const a = [boundaries[s * 6], boundaries[s * 6 + 1], boundaries[s * 6 + 2]];
    const b = [boundaries[s * 6 + 3], boundaries[s * 6 + 4], boundaries[s * 6 + 5]];
    const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const th = Math.acos(d);
    const pieces = Math.max(1, Math.ceil(th / (2 * D2R)));
    const st = Math.sin(th);
    for (let k = 0; k <= pieces; k++) {
      const t = k / pieces;
      if (st < 1e-6) {
        verts.push(a[0], a[1], a[2]);
        continue;
      }
      const wa = Math.sin((1 - t) * th) / st;
      const wb = Math.sin(t * th) / st;
      verts.push(a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb);
    }
  }
  starts[segCount] = verts.length / 3;

  // 별 이름표. 고유명만으로 찾지 않는다 — 같은 이름이 다른 별자리에도 있다.
  const starIndex = (name: string, conId: string) => {
    for (const [k, m] of Object.entries(meta)) {
      if (m.name === name && m.con === conId) return Number(k);
    }
    return -1;
  };
  const oSegs = orion >= 0 ? constellations[orion].segments : [];
  const oCount = oSegs.length / 2;
  const labelFor = (name: string, conId: string, ko: string, at: number | null) => {
    const i = starIndex(name, conId);
    if (i < 0) return null;
    // 오리온의 별은 그 별에 닿는 선이 처음 그어질 때 이름이 뜬다
    let when = at ?? 0;
    if (at == null) {
      const k = oSegs.findIndex((s) => s === i);
      const segK = k < 0 ? oCount : Math.floor(k / 2);
      when = ORION_TRACE[0] + (ORION_TRACE[1] - ORION_TRACE[0]) * ((segK + 1) / Math.max(1, oCount));
    }
    return { v: vecOf(catalog.positions, i), ko, en: name, at: when };
  };

  return {
    n,
    x,
    y,
    z,
    mag,
    tint,
    bw1,
    bw2,
    bp1,
    bp2,
    bamp,
    con,
    pos: catalog.positions,
    catMag: catalog.mag,
    cons,
    orion,
    hydra,
    crux,
    uma: find("UMa"),
    umi: find("UMi"),
    orionCenter,
    waveStart,
    boundVerts: new Float32Array(verts),
    boundStarts: starts,
    betelgeuse: labelFor("Betelgeuse", "Ori", "베텔게우스", null),
    rigel: labelFor("Rigel", "Ori", "리겔", null),
    polaris: labelFor("Polaris", "UMi", "북극성", 0.76),
    nakedEye,
    totalArea: constellations.reduce((a, c) => a + c.areaSqDeg, 0),
  };
}

/** 시야 키프레임. 마지막 장면은 관측지 위도에 따라 지평선이 들어오게 내려간다. */
function buildKeys(P: Prepared, lat: number): ViewKey[] {
  const o = P.orionCenter;
  // 극과 '북점'(지평선에서 극 바로 아래)의 중간을 본다. 남반구면 극이 지평선
  // 아래라 내려갈 이유가 없다 — 그대로 넓힌다.
  const down = lat > 5 ? Math.min(lat, 70) * 0.5 : 0;
  return [
    { p: 0.0, ra: 66, dec: 14, fov: 120 },
    { p: 0.13, ra: 76, dec: 8, fov: 104 },
    { p: 0.205, ra: o.ra, dec: o.dec, fov: 44 },
    { p: 0.315, ra: o.ra, dec: o.dec, fov: 40 },
    { p: 0.4, ra: 112, dec: 6, fov: 128 },
    { p: 0.515, ra: 252, dec: -10, fov: 138 },
    // 바다뱀(가장 큼)과 남십자(가장 작음)가 한 화면에. 남십자가 자막 띠에
    // 걸리지 않도록 시선을 조금 남쪽으로 둔다.
    { p: 0.585, ra: 188, dec: -43, fov: 112 },
    { p: 0.7, ra: POLE_RA, dec: -45, fov: 108 },
    { p: 0.775, ra: POLE_RA, dec: 90, fov: 78 },
    { p: TRAIL_OUT[1], ra: POLE_RA, dec: 90, fov: 78 },
    { p: 0.975, ra: POLE_RA, dec: 90 - down, fov: down > 0 ? 96 : 104 },
  ];
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────

export default function AboutFilm() {
  const { lang } = useLanguage();
  const { lat } = useObserver();
  const sky = useAboutSky();
  const reduce = useReducedMotion() ?? false;

  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLParagraphElement>(null);

  // 그리기 루프가 읽는 값. 이펙트 의존성에 넣으면 언어를 바꿀 때마다 루프가
  // 새로 만들어지며 스무딩 상태가 날아간다.
  const langRef = useRef(lang);
  const latRef = useRef(lat);
  useEffect(() => {
    langRef.current = lang;
  }, [lang]);
  useEffect(() => {
    latRef.current = lat;
  }, [lat]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = stickyRef.current;
    if (!canvas || !host || !sky) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const P = prepare(sky);
    const N = P.cons.length;

    // 버킷별 채움색을 미리 만들어 둔다. 별마다 rgba 문자열을 만들면 프레임당
    // 수천 개의 문자열이 생긴다.
    const tints = Array.from({ length: TINTS }, (_, k) => tintRgb(k));
    const bucketStyle: string[] = [];
    for (let t = 0; t < TINTS; t++) {
      const [r, g, b] = tints[t];
      for (let a = 0; a < ALEVELS; a++) {
        bucketStyle.push(`rgba(${r},${g},${b},${((a + 1) / ALEVELS).toFixed(3)})`);
      }
    }
    const BUCKETS = TINTS * ALEVELS;
    const counts = new Int32Array(BUCKETS);
    const offsets = new Int32Array(BUCKETS + 1);
    const vx = new Float32Array(P.n);
    const vy = new Float32Array(P.n);
    const vr = new Float32Array(P.n);
    const vm = new Float32Array(P.n);
    const vb = new Int16Array(P.n);
    const order = new Int32Array(P.n);

    const lineQ = new Float32Array(N);
    const lineA = new Float32Array(N);
    const boost = new Float32Array(N);
    const labelA = new Float32Array(N);
    const hl = new Float32Array(N);

    const B: ViewBasis = { fx: 0, fy: 0, fz: 0, rx: 0, ry: 0, rz: 0, ux: 0, uy: 0, uz: 0 };
    const view: SkyView = { ra: 0, dec: 0, fov: 90 };
    const sp: ScreenPoint = { x: 0, y: 0 };
    const sq: ScreenPoint = { x: 0, y: 0 };

    let keys = buildKeys(P, latRef.current);
    let keysLat = latRef.current;

    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth;
      h = host.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    // 반짝임: 한 번에 별 하나. 홈 별밭과 같은 규칙이다.
    const tw = { idx: -1, at: 0, amp: 0, dur: 0, next: 0 };
    let lastReadout = "";

    const setReadout = (s: string) => {
      if (s === lastReadout) return;
      lastReadout = s;
      if (readoutRef.current) readoutRef.current.textContent = s;
    };

    const setLabelFont = () => {
      ctx.font = `400 12px ${UI_FONT}`;
      if ("letterSpacing" in ctx) (ctx as { letterSpacing: string }).letterSpacing = "0.96px";
    };

    const draw = (p: number, t: number, nowMs: number) => {
      if (latRef.current !== keysLat) {
        keysLat = latRef.current;
        keys = buildKeys(P, keysLat);
      }
      const ko = langRef.current === "ko";
      let chapter = 0;
      while (chapter < CHAPTERS.length - 1 && p >= CHAPTERS[chapter].to) chapter++;

      // ── 시야 ─────────────────────────────────────────────────────
      // 모션 줄이기: 장면 사이를 날아가지 않고 장면마다 고정된 구도로 끊는다.
      // 선이 그어지고 궤적이 자라는 건 그대로 둔다 — 시야가 움직이지 않으면
      // 전정 자극이 없다.
      const pc = reduce ? CHAPTERS[chapter].hold : p;
      viewAt(keys, pc, view);
      // 노출(궤적 길이)은 늘 스크롤을 따른다. 모션 줄이기에서는 하늘을 돌리지
      // 않고 최종 자세에 둔 채 궤적만 뒤로 자라게 한다.
      const exposure = TRAIL_DEG * sstep(p, TRAIL[0], TRAIL[1]);
      const rot = reduce ? (chapter >= POLE_CHAPTER ? TRAIL_DEG : 0) : exposure;
      view.ra += rot;
      if (!reduce) {
        // 첫 장면에서만 아주 느리게 흐른다. 스크롤하기 전에도 하늘이 살아 있게.
        const w0 = 1 - sstep(p, 0.06, 0.15);
        view.ra += Math.sin(t * 0.05) * 2.4 * w0;
        view.dec += Math.sin(t * 0.037 + 1) * 1.3 * w0;
      }
      viewBasis(view.ra, view.dec, B);
      const short = Math.min(w, h);
      const scale = viewScale(view.fov, short);
      const cx = w / 2;
      // 투영 중심을 조금 위로 — 아래 3분의 1은 자막 자리다
      const cy = h * 0.42;

      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = 1;
      if (reduce) {
        // 끊는 지점에서 잠깐 어두워져 컷이 부드럽게 넘어간다. 필름의 처음과
        // 끝은 컷이 아니므로 어두워지지 않는다.
        const c = CHAPTERS[chapter];
        const edgeIn = chapter === 0 ? 1 : p - c.from;
        const edgeOut = chapter === CHAPTERS.length - 1 ? 1 : c.to - p;
        ctx.globalAlpha = clamp01(Math.min(edgeIn, edgeOut) / 0.012);
      }

      // ── 타임라인 ─────────────────────────────────────────────────
      const orionOn = sstep(p, 0.15, 0.19);
      const orionOff = sstep(p, 0.36, 0.42);
      const regionDim = sstep(p, 0.545, 0.585);
      const hiOut = sstep(p, 0.685, 0.715);
      const hiH = sstep(p, 0.585, 0.61) * (1 - hiOut);
      const hiC = sstep(p, 0.62, 0.645) * (1 - hiOut);
      const linesOut = sstep(p, 0.71, 0.75);
      // 북두칠성과 작은곰 — 극을 찾던 길잡이라 극 장면에서 잠깐 남긴다
      const dipper = sstep(p, 0.735, 0.775) * (0.5 - 0.32 * sstep(p, 0.8, 0.86));
      let waveCount = 0;
      for (let i = 0; i < N; i++) {
        let q = 0;
        let a = 0;
        let bo = 0;
        let la = 0;
        if (i === P.orion) {
          q = ramp(p, ORION_TRACE[0], ORION_TRACE[1]);
          a = q > 0 ? 0.85 - 0.5 * orionOff : 0;
          bo = orionOn * (1 - orionOff);
          la = 0.7 * sstep(p, 0.2, 0.23) * (1 - orionOff);
        } else {
          const s = P.waveStart[i];
          q = ramp(p, s, s + WAVE_DUR);
          if (q > 0) {
            waveCount++;
            const glow = 1 - ramp(p, s + WAVE_DUR, s + WAVE_DUR + 0.05);
            a = 0.3 + 0.5 * glow;
            bo = 0.55 * glow;
            // 이름은 잘 알려진 22개만. 88개 이름이 다 뜨면 하늘보다 글자가 많다.
            la = P.cons[i].rank === 1 ? 0.2 + 0.6 * glow : 0;
          }
        }
        a *= 1 - 0.55 * regionDim;
        la *= 1 - regionDim;
        const hi = i === P.hydra ? hiH : i === P.crux ? hiC : 0;
        if (hi > 0) {
          q = 1;
          a = Math.max(a, 0.9 * hi);
          bo = Math.max(bo, hi);
          la = Math.max(la, hi);
        }
        a *= 1 - linesOut;
        if (i === P.uma || i === P.umi) {
          if (dipper > a) {
            a = dipper;
            q = 1;
          }
        }
        lineQ[i] = q;
        lineA[i] = a;
        boost[i] = bo;
        labelA[i] = la;
        hl[i] = hi;
      }
      const dimBg = clamp01(orionOn * (1 - orionOff) + 0.6 * Math.max(hiH, hiC));
      const boundA = 0.3 * sstep(p, 0.55, 0.59) * (1 - sstep(p, 0.7, 0.74));
      const trailA = sstep(p, TRAIL[0], TRAIL[0] + 0.015) * (1 - sstep(p, TRAIL_OUT[0], TRAIL_OUT[1]));
      const ncpA = 0.5 * sstep(p, 0.76, 0.79);
      const horizonA = sstep(p, HORIZON_IN[0], HORIZON_IN[1]);

      // 관측지 천정. 극 장면의 최종 회전에서 화면 '위'가 천정 쪽이 되게 잡는다
      // (극에서 화면 위 = 적경 ra+180 방향).
      const latNow = keysLat;
      const Z = radecToUnit(POLE_RA + TRAIL_DEG + 180, latNow);

      const inView = (x: number, y: number, m: number) =>
        x > -m && x < w + m && y > -m && y < h + m;

      // ── 1. 경계선 ────────────────────────────────────────────────
      if (boundA > 0.004) {
        ctx.strokeStyle = `rgba(255,255,255,${boundA.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 5]);
        ctx.beginPath();
        const V = P.boundVerts;
        const jump = short * 0.5;
        for (let s = 0; s + 1 < P.boundStarts.length; s++) {
          let prevOk = false;
          let px = 0;
          let py = 0;
          for (let k = P.boundStarts[s]; k < P.boundStarts[s + 1]; k++) {
            const ok = project(B, scale, cx, cy, V[k * 3], V[k * 3 + 1], V[k * 3 + 2], sp);
            if (ok && prevOk && Math.abs(sp.x - px) + Math.abs(sp.y - py) < jump) {
              ctx.lineTo(sp.x, sp.y);
            } else if (ok) {
              ctx.moveTo(sp.x, sp.y);
            }
            prevOk = ok;
            px = sp.x;
            py = sp.y;
          }
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 화각이 좁아지면 더 어두운 별이 드러난다 — 망원경이 하는 일이다.
      const lim = 5.1 + 1.1 * clamp01((120 - view.fov) / 80);
      const size = Math.max(0.9, Math.min(1.25, Math.pow(100 / view.fov, 0.25)));
      const starRadius = (m: number) => {
        const b = clamp01((lim - m) / (lim + 1.46));
        return (0.5 + 1.9 * Math.pow(b, 1.6)) * size;
      };

      // ── 2. 별자리 선 ─────────────────────────────────────────────
      // 선은 별에 닿기 직전에 멈춘다. 성도가 오래 써 온 방식이다 — 선이 별을
      // 관통하면 1px짜리 점이 1.5px 선에 묻혀, 그림은 보이는데 별이 안 보인다.
      ctx.lineCap = "round";
      let orionDrawn = 0;
      const orionTotal = P.orion >= 0 ? P.cons[P.orion].segs.length / 2 : 0;
      for (let i = 0; i < N; i++) {
        const a = lineA[i];
        const q = lineQ[i];
        if (a < 0.004 || q <= 0) continue;
        const segs = P.cons[i].segs;
        const count = segs.length / 2;
        const sequential = i === P.orion;
        const drawnF = q * count;
        if (sequential) orionDrawn = Math.min(count, Math.ceil(drawnF - 1e-6));
        ctx.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`;
        ctx.lineWidth = hl[i] > 0 || (sequential && a > 0.6) ? 1.5 : 1.1;
        ctx.beginPath();
        for (let k = 0; k < count; k++) {
          // 오리온은 한 획씩 순서대로, 나머지는 모든 획이 한꺼번에 자란다
          const f = sequential ? clamp01(drawnF - k) : q;
          if (f <= 0) break;
          const ia = segs[k * 2];
          const ib = segs[k * 2 + 1];
          if (!project(B, scale, cx, cy, P.pos[ia * 3], P.pos[ia * 3 + 1], P.pos[ia * 3 + 2], sp)) continue;
          if (!project(B, scale, cx, cy, P.pos[ib * 3], P.pos[ib * 3 + 1], P.pos[ib * 3 + 2], sq)) continue;
          if (!inView(sp.x, sp.y, 40) && !inView(sq.x, sq.y, 40)) continue;
          const dx = sq.x - sp.x;
          const dy = sq.y - sp.y;
          const len = Math.hypot(dx, dy);
          if (len > short) continue;
          const ga = starRadius(P.catMag[ia]) + 2;
          const gb = starRadius(P.catMag[ib]) + 2;
          const run = len - ga - gb;
          if (run < 1) continue;
          const ux = dx / len;
          const uy = dy / len;
          const x0 = sp.x + ux * ga;
          const y0 = sp.y + uy * ga;
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0 + ux * run * f, y0 + uy * run * f);
        }
        ctx.stroke();
      }

      // ── 3. 별 투영 + 버킷 ────────────────────────────────────────
      const ground = horizonA;

      if (!reduce && nowMs > tw.next) {
        tw.idx = (Math.random() * Math.min(300, P.n)) | 0;
        tw.at = nowMs;
        tw.amp = 0.35 + Math.random() * 0.45;
        tw.dur = 700 + Math.random() * 900;
        tw.next = nowMs + 420 + Math.random() * 1400;
      }
      const twP = tw.idx >= 0 ? (nowMs - tw.at) / tw.dur : 1;

      counts.fill(0);
      let vis = 0;
      for (let i = 0; i < P.n; i++) {
        const m = P.mag[i];
        if (m > lim) break; // 밝은 순 정렬
        const X = P.x[i];
        const Y = P.y[i];
        const Zc = P.z[i];
        if (!project(B, scale, cx, cy, X, Y, Zc, sp)) continue;
        if (!inView(sp.x, sp.y, 4)) continue;
        const b = clamp01((lim - m) / (lim + 1.46));
        let a = (0.22 + 0.78 * Math.pow(b, 0.75)) * clamp01((lim - m) / 0.5);
        const ci = P.con[i];
        if (ci >= 0 && boost[ci] > 0) a += (1 - a) * boost[ci] * 0.85;
        else a *= 1 - 0.5 * dimBg;
        if (ground > 0 && X * Z[0] + Y * Z[1] + Zc * Z[2] < 0) a *= 1 - 0.82 * ground;
        if (!reduce) {
          // 느린 숨(0.65) + 빠른 떨림(0.35). 합은 -1..1이라 밝기가 (1±진폭)배로 오간다.
          const s =
            0.65 * Math.sin(t * P.bw1[i] + P.bp1[i]) + 0.35 * Math.sin(t * P.bw2[i] + P.bp2[i]);
          a *= 1 + P.bamp[i] * s;
        }
        if (i === tw.idx && twP < 1) a = Math.min(1, a * twinkleEnvelope(twP, tw.amp));
        if (a < 0.03) continue;
        const level = Math.min(ALEVELS - 1, Math.floor(a * ALEVELS));
        const bucket = P.tint[i] * ALEVELS + level;
        vx[vis] = sp.x;
        vy[vis] = sp.y;
        vr[vis] = (0.5 + 1.9 * Math.pow(b, 1.6)) * size;
        vm[vis] = m;
        vb[vis] = bucket;
        counts[bucket]++;
        vis++;
      }
      offsets[0] = 0;
      for (let k = 0; k < BUCKETS; k++) offsets[k + 1] = offsets[k] + counts[k];
      counts.fill(0);
      for (let j = 0; j < vis; j++) {
        const k = vb[j];
        order[offsets[k] + counts[k]++] = j;
      }

      // ── 4. 일주운동 궤적 ─────────────────────────────────────────
      // 극이 화면 중심에 있으므로 모든 궤적은 (cx, cy)를 도는 동심원의 호다.
      // 하늘은 화면에서 반시계로 돈다 → 지나온 자리는 캔버스 각도가 '큰' 쪽.
      if (trailA > 0.004 && exposure > 0.2) {
        const span = exposure * D2R;
        ctx.lineWidth = 1;
        for (let k = 0; k < BUCKETS; k++) {
          const from = offsets[k];
          const to = offsets[k + 1];
          if (from === to) continue;
          const [r, g, bl] = tints[(k / ALEVELS) | 0];
          const aLevel = ((k % ALEVELS) + 1) / ALEVELS;
          ctx.strokeStyle = `rgba(${r},${g},${bl},${(aLevel * 0.42 * trailA).toFixed(3)})`;
          ctx.beginPath();
          for (let o = from; o < to; o++) {
            const j = order[o];
            // 궤적은 밝은 별만. 전부 그으면 사진처럼 빽빽해져 자막이 묻힌다.
            if (vm[j] > TRAIL_MAG) continue;
            const dx = vx[j] - cx;
            const dy = vy[j] - cy;
            const rr = Math.hypot(dx, dy);
            if (rr < 1.5) continue;
            const th = Math.atan2(dy, dx);
            ctx.moveTo(cx + rr * Math.cos(th), cy + rr * Math.sin(th));
            ctx.arc(cx, cy, rr, th, th + span);
          }
          ctx.stroke();
        }
      }

      // ── 5. 별 ────────────────────────────────────────────────────
      for (let k = 0; k < BUCKETS; k++) {
        const from = offsets[k];
        const to = offsets[k + 1];
        if (from === to) continue;
        ctx.fillStyle = bucketStyle[k];
        ctx.beginPath();
        for (let o = from; o < to; o++) {
          const j = order[o];
          const r = vr[j];
          if (r < 0.9) {
            ctx.rect(vx[j] - r, vy[j] - r, r * 2, r * 2);
          } else {
            ctx.moveTo(vx[j] + r, vy[j]);
            ctx.arc(vx[j], vy[j], r, 0, TAU);
          }
        }
        ctx.fill();
      }

      // ── 6. 천구 북극 · 지평선 · 고도 ─────────────────────────────
      if (ncpA > 0.004 && project(B, scale, cx, cy, 0, 0, 1, sp)) {
        ctx.strokeStyle = `rgba(255,255,255,${ncpA.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sp.x - 5, sp.y);
        ctx.lineTo(sp.x + 5, sp.y);
        ctx.moveTo(sp.x, sp.y - 5);
        ctx.lineTo(sp.x, sp.y + 5);
        ctx.stroke();
      }
      const pz = Z[2]; // 극·천정 내적 = sin(위도)
      if (horizonA > 0.004 && Math.abs(pz) < 0.999) {
        // 북점 H: 극을 지평면에 내린 방향. 극까지의 각이 곧 |위도|다.
        let hx = -pz * Z[0];
        let hy = -pz * Z[1];
        let hz = 1 - pz * Z[2];
        const hl2 = Math.hypot(hx, hy, hz);
        hx /= hl2;
        hy /= hl2;
        hz /= hl2;
        // e2 = Z × H
        const ex = Z[1] * hz - Z[2] * hy;
        const ey = Z[2] * hx - Z[0] * hz;
        const ez = Z[0] * hy - Z[1] * hx;

        ctx.strokeStyle = `rgba(255,255,255,${(0.35 * horizonA).toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        let prevOk = false;
        for (let k = 0; k <= 240; k++) {
          const a = (k / 240) * TAU;
          const c = Math.cos(a);
          const s = Math.sin(a);
          const ok = project(B, scale, cx, cy, hx * c + ex * s, hy * c + ey * s, hz * c + ez * s, sp);
          if (ok && prevOk) ctx.lineTo(sp.x, sp.y);
          else if (ok) ctx.moveTo(sp.x, sp.y);
          prevOk = ok;
        }
        ctx.stroke();

        // 지평선 → 극 고도 호
        const th = Math.acos(Math.max(-1, Math.min(1, hz)));
        const st = Math.sin(th) || 1;
        ctx.strokeStyle = `rgba(255,255,255,${(0.7 * horizonA).toFixed(3)})`;
        ctx.beginPath();
        let mid: ScreenPoint | null = null;
        for (let k = 0; k <= 32; k++) {
          const t2 = k / 32;
          const wa = Math.sin((1 - t2) * th) / st;
          const wb = Math.sin(t2 * th) / st;
          if (!project(B, scale, cx, cy, hx * wa, hy * wa, hz * wa + wb, sp)) continue;
          if (k === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
          if (k === 16) mid = { x: sp.x, y: sp.y };
        }
        ctx.stroke();

        setLabelFont();
        ctx.textBaseline = "middle";
        if (mid) {
          ctx.textAlign = "left";
          ctx.fillStyle = `rgba(255,255,255,${(0.85 * horizonA).toFixed(3)})`;
          ctx.fillText(`${Math.abs(latNow).toFixed(1)}°`, mid.x + 10, mid.y);
        }
        if (project(B, scale, cx, cy, hx, hy, hz, sp)) {
          ctx.textAlign = "center";
          ctx.fillStyle = `rgba(${MUTED},${horizonA.toFixed(3)})`;
          ctx.fillText(ko ? "북" : "N", sp.x, sp.y + 16);
        }
      }

      // ── 7. 이름표 ────────────────────────────────────────────────
      setLabelFont();
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      for (let i = 0; i < N; i++) {
        const a = labelA[i];
        if (a < 0.01) continue;
        const c = P.cons[i];
        if (!project(B, scale, cx, cy, c.label[0], c.label[1], c.label[2], sp)) continue;
        if (!inView(sp.x, sp.y, 0)) continue;
        const name = ko ? c.nameKo : c.nameEn.toUpperCase();
        if (hl[i] > 0) {
          // 강조된 이름은 그림 위로 비켜 적는다 — 남십자는 작아서 이름이 그림을 덮는다
          ctx.fillStyle = `rgba(255,255,255,${(0.9 * a).toFixed(3)})`;
          ctx.fillText(`${name} · ${c.area.toLocaleString("en-US")} deg²`, sp.x, sp.y - 30);
        } else {
          ctx.fillStyle = `rgba(${MUTED},${a.toFixed(3)})`;
          ctx.fillText(name, sp.x, sp.y);
        }
      }
      ctx.textAlign = "left";
      const out = 1 - orionOff;
      for (const [L, fade] of [
        [P.betelgeuse, out],
        [P.rigel, out],
        [P.polaris, 1],
      ] as const) {
        if (!L) continue;
        const a = sstep(p, L.at, L.at + 0.02) * fade;
        if (a < 0.01) continue;
        if (!project(B, scale, cx, cy, L.v[0], L.v[1], L.v[2], sp)) continue;
        ctx.fillStyle = `rgba(${MUTED},${a.toFixed(3)})`;
        ctx.fillText(ko ? L.ko : L.en.toUpperCase(), sp.x + 9, sp.y + 1);
      }

      // ── 8. 자막 자리 비우기 ──────────────────────────────────────
      // 아래쪽은 자막이 읽혀야 한다. 88개가 다 그어진 장면에서 선이 글자를
      // 가로질러 읽히지 않았다. 스크림(HUD 전용)을 덮지 않고, 그려 둔 하늘을
      // 그 띠에서만 옅게 지운다 — 검정 위의 검정이라 평면 규칙이 그대로다.
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "destination-out";
      const band = ctx.createLinearGradient(0, h * 0.55, 0, h * 0.9);
      band.addColorStop(0, "rgba(0,0,0,0)");
      band.addColorStop(1, "rgba(0,0,0,0.72)");
      ctx.fillStyle = band;
      ctx.fillRect(0, h * 0.55, w, h * 0.45);
      ctx.globalCompositeOperation = "source-over";

      // ── 8. 판독값 ────────────────────────────────────────────────
      const pad = (v: number) => String(v).padStart(2, "0");
      const id = CHAPTERS[chapter].id;
      if (id === "dots") setReadout(`${P.nakedEye.toLocaleString("en-US")} STARS · MAG < 6.0`);
      else if (id === "join") setReadout(`ORI · ${pad(orionDrawn)}/${orionTotal} LINES`);
      else if (id === "all") setReadout(`${pad(1 + waveCount)}/${N} CONSTELLATIONS`);
      else if (id === "regions")
        setReadout(`${P.totalArea.toLocaleString("en-US")} DEG² · ${N} REGIONS`);
      else if (id === "pole") {
        const minutes = Math.round((exposure / 15) * 60);
        setReadout(`EXPOSURE ${pad(Math.floor(minutes / 60))}h ${pad(minutes % 60)}m`);
      } else {
        const l = latNow.toFixed(1);
        setReadout(`LAT ${l}° · NCP ALT ${l}°`);
      }
    };

    // ── 루프 ───────────────────────────────────────────────────────
    // 화면에 있을 때만 돈다. 다시 들어올 때는 스무딩을 건너뛰고 현재 위치로
    // 바로 맞춘다 — 아래에서 거슬러 올라왔는데 필름이 처음부터 다시 흘러가면 곤란하다.
    let raf = 0;
    let running = false;
    let last = 0;
    let ps = -1;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const target = scrollYProgress.get();
      if (ps < 0 || reduce) ps = target;
      // 스크롤 휠의 계단을 매끈하게 펴고, 손을 뗀 뒤에도 잠시 미끄러지다 선다.
      else ps += (target - ps) * (1 - Math.exp(-dt / SCROLL_TAU));
      draw(ps, now / 1000, now);
    };
    const start = () => {
      if (running) return;
      running = true;
      ps = -1;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? start() : stop()),
      { rootMargin: "80px 0px" },
    );
    io.observe(host);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
    };
  }, [sky, reduce, scrollYProgress]);

  const t = (koText: string, enText: string) => (lang === "ko" ? koText : enText);

  // 숫자는 데이터에서 계산한다. 로드 전에는 숫자 없는 문장으로 둔다.
  const stats = useMemo(() => {
    if (!sky) return null;
    const cs = sky.constellations;
    const big = cs.reduce((a, c) => (c.areaSqDeg > a.areaSqDeg ? c : a), cs[0]);
    const small = cs.reduce((a, c) => (c.areaSqDeg < a.areaSqDeg ? c : a), cs[0]);
    return {
      total: cs.reduce((a, c) => a + c.areaSqDeg, 0),
      count: cs.length,
      big,
      small,
      ratio: Math.round(big.areaSqDeg / small.areaSqDeg),
    };
  }, [sky]);

  const latAbs = Math.abs(lat).toFixed(1);
  const north = lat >= 0;

  const captions: { label: string; title: string; body: string }[] = [
    {
      label: t("점", "Points"),
      title: t("선 없는 하늘", "A sky without lines"),
      body: t(
        "보이는 건 점뿐입니다. 맨눈으로 셀 수 있는 별은 하늘 전체를 통틀어 수천 개입니다. 그 사이의 선은 사람이 그었습니다.",
        "All there is, is points: a few thousand the naked eye can count across the whole sky. People drew the lines between them.",
      ),
    },
    {
      label: t("선", "Lines"),
      title: t("점을 이어 만든 사냥꾼", "A hunter, joined point to point"),
      body: t(
        "밝은 별 몇 개가 사냥꾼이 됐습니다. 어깨의 베텔게우스는 붉고 발치의 리겔은 푸릅니다. 두 별의 온도가 다르기 때문인데 맨눈으로도 구별됩니다.",
        "A handful of bright stars became a hunter. Betelgeuse at the shoulder is red, Rigel at the foot is blue. They burn at different temperatures, and you can tell without a telescope.",
      ),
    },
    {
      label: "88",
      title: t("88개가 되기까지", "Until there were 88"),
      body: t(
        "천칠백 년 넘게 여러 사람이 선을 더했습니다. 1922년 국제천문연맹이 그 목록을 88개로 정했고 지금까지 그대로입니다.",
        "For more than seventeen centuries, many hands added lines. In 1922 the International Astronomical Union fixed the list at 88, and it has not changed since.",
      ),
    },
    {
      label: t("구역", "Regions"),
      title: t("경계로 나눈 하늘", "A sky divided by borders"),
      body: stats
        ? t(
            `1928년에 하늘 전체 ${stats.total.toLocaleString("ko-KR")}제곱도를 ${stats.count}조각으로 빈틈없이 나눴습니다. 그래서 하늘의 어느 점이든 정확히 한 별자리에 속합니다. 가장 큰 ${stats.big.nameKo}는 가장 작은 ${stats.small.nameKo}의 ${stats.ratio}배입니다.`,
            `In 1928 the whole sky, all ${stats.total.toLocaleString("en-US")} square degrees, was cut into ${stats.count} pieces with no gaps, so every point in the sky belongs to exactly one constellation. The largest, ${stats.big.nameEn}, is ${stats.ratio} times the smallest, ${stats.small.nameEn}.`,
          )
        : t(
            "1928년에 하늘 전체를 88조각으로 빈틈없이 나눴습니다. 그래서 하늘의 어느 점이든 정확히 한 별자리에 속합니다.",
            "In 1928 the whole sky was cut into 88 pieces with no gaps, so every point in the sky belongs to exactly one constellation.",
          ),
    },
    {
      label: t("축", "Axis"),
      title: t("움직이지 않는 별 하나", "The one star that holds still"),
      body: t(
        "하늘 전체가 천구 북극을 축으로 돕니다. 북극성은 그 축에서 1도도 떨어져 있지 않아 밤새 거의 제자리입니다. 그 높이가 곧 위도였고 항해사는 이 사실 하나로 대양을 건넜습니다.",
        "The whole sky turns about the celestial pole. Polaris sits less than a degree from it, so it barely moves all night. Its height was your latitude, and navigators crossed oceans on that one fact.",
      ),
    },
    {
      label: t("거꾸로", "Inverse"),
      title: t("거꾸로 돌린 계산", "The same sum, run backwards"),
      body: north
        ? t(
            `항해사는 별을 재서 위치를 얻었습니다. 이 도구는 위치를 받아 하늘을 그립니다. 위도 ${latAbs}°라면 천구 북극도 지평선에서 ${latAbs}° 위에 있습니다.`,
            `Navigators measured stars to find where they were. This takes where you are and draws the sky. At latitude ${latAbs}°, the celestial pole stands ${latAbs}° above the horizon.`,
          )
        : t(
            `항해사는 별을 재서 위치를 얻었습니다. 이 도구는 위치를 받아 하늘을 그립니다. 남위 ${latAbs}°에서는 천구 북극이 지평선 아래 ${latAbs}°에 있어 북극성이 뜨지 않습니다.`,
            `Navigators measured stars to find where they were. This takes where you are and draws the sky. At ${latAbs}° south, the celestial pole lies ${latAbs}° below the horizon, and Polaris never rises.`,
          ),
    },
  ];

  return (
    <section
      ref={sectionRef}
      className="relative"
      // svh: 모바일 주소창이 접혔다 펴질 때 전체 높이가 바뀌면 스크롤 위치가 튄다
      style={{ height: `${FILM_SCREENS * 100}svh` }}
    >
      <div ref={stickyRef} className="sticky top-0 h-dvh overflow-hidden">
        <canvas
          ref={canvasRef}
          aria-hidden
          className={`absolute inset-0 h-full w-full transition-opacity duration-1000 ${
            sky ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* 판독값 — 계기처럼 숫자만. 헤더 아래 첫 줄. */}
        <p
          ref={readoutRef}
          aria-hidden
          className={`type-mono-hud absolute left-6 top-24 text-muted transition-opacity duration-700 sm:left-12 md:left-16 lg:left-24 ${
            sky ? "opacity-100" : "opacity-0"
          }`}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-full">
          {captions.map((c, i) => (
            <Caption
              key={i}
              progress={scrollYProgress}
              index={i}
              reduce={reduce}
            >
              <p className="type-eyebrow text-muted">
                {String(i + 1).padStart(2, "0")} · {c.label}
              </p>
              {i === 0 ? (
                <h1 className="type-display-xl mt-3 text-balance">{c.title}</h1>
              ) : (
                <h2 className="type-display-lg mt-3 text-balance">{c.title}</h2>
              )}
              <p className="type-body-lg mx-auto mt-5 max-w-xl text-pretty text-foreground-mute">
                {c.body}
              </p>
            </Caption>
          ))}
        </div>

        <ScrollHint progress={scrollYProgress} label={t("아래로", "Scroll")} />
      </div>
    </section>
  );
}

// ─── 자막 ────────────────────────────────────────────────────────────

const CAPTION_FADE = 0.03;

/**
 * 자막 키프레임.
 *
 * ⚠️ 범위는 반드시 0에서 1까지 전부 덮는다. Motion은 스크롤에 묶인 opacity를
 *    브라우저의 ScrollTimeline으로 넘기는데, 키프레임이 1 앞에서 끝나면 비어 있는
 *    끝 구간이 '원래 값'(opacity 1)으로 채워진다. 첫 자막이 0.15에서 꺼진 뒤
 *    스크롤을 내릴수록 도로 떠올라, 마지막 장면에서는 새 자막과 겹쳐 보였다.
 */
function captionKeys(index: number, from: number, to: number, lift: number) {
  const inA = from;
  const inB = from + CAPTION_FADE;
  const outA = to - CAPTION_FADE;
  if (index === 0) {
    return { range: [0, outA, to, 1], opacityOut: [1, 1, 0, 0], yOut: [0, 0, -lift, -lift] };
  }
  if (index === CHAPTERS.length - 1) {
    return { range: [0, inA, inB, 1], opacityOut: [0, 0, 1, 1], yOut: [lift, lift, 0, 0] };
  }
  return {
    range: [0, inA, inB, outA, to, 1],
    opacityOut: [0, 0, 1, 1, 0, 0],
    yOut: [lift, lift, 0, 0, -lift, -lift],
  };
}

/**
 * 장면 자막. 진행도에 직접 묶인 MotionValue라 리렌더 없이 움직인다.
 *
 * 들어오는 자막과 나가는 자막이 겹치지 않는다 — 나가는 쪽이 장면 경계에서
 * 정확히 0이 되고, 들어오는 쪽은 거기서부터 오른다. 두 문장이 겹쳐 보이는
 * 순간이 없어야 읽힌다.
 *
 * 투명도만 바꾸고 숨기지는 않는다(visibility). 스크린리더는 여섯 장면의
 * 글을 순서대로 모두 읽을 수 있어야 한다 — 캔버스는 장식이고 글이 본문이다.
 */
function Caption({
  progress,
  index,
  reduce,
  children,
}: {
  progress: MotionValue<number>;
  index: number;
  reduce: boolean;
  children: ReactNode;
}) {
  const { from, to } = CHAPTERS[index];
  const lift = reduce ? 0 : 24;
  const { range, opacityOut, yOut } = captionKeys(index, from, to, lift);
  const opacity = useTransform(progress, range, opacityOut);
  const y = useTransform(progress, range, yOut);
  return (
    <motion.div
      style={{ opacity, y }}
      className="hud-shadow absolute inset-x-0 bottom-0 px-6 pb-16 text-center sm:px-12 sm:pb-20 md:px-16 lg:px-24"
    >
      <div className="mx-auto max-w-2xl">{children}</div>
    </motion.div>
  );
}

/**
 * 첫 화면의 '아래로'. 깜빡임(.scroll-hint)은 안쪽 요소에 둔다 — CSS 애니메이션은
 * 인라인 style보다 우선이라, 같은 요소에 두면 스크롤로 꺼 둔 투명도를 깜빡임이
 * 도로 덮어써 끝까지 남는다.
 */
function ScrollHint({ progress, label }: { progress: MotionValue<number>; label: string }) {
  const opacity = useTransform(progress, [0, 0.03, 1], [1, 0, 0]);
  return (
    <motion.div
      style={{ opacity }}
      aria-hidden
      className="pointer-events-none absolute inset-x-0 bottom-5 text-center"
    >
      <p className="type-eyebrow scroll-hint text-muted">{label}</p>
    </motion.div>
  );
}
