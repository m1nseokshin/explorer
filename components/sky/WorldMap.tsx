"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { City } from "@/lib/cities";
import type { LandRings } from "@/lib/land";

export interface WorldMapHandle {
  zoomBy: (factor: number) => void;
  /** 특정 지점으로 부드럽게 이동 (선택 시 따라가기) */
  centerOn: (lat: number, lon: number) => void;
}

interface Props {
  ref?: React.Ref<WorldMapHandle>;
  land: LandRings | null;
  lat: number;
  lon: number;
  cities: City[];
  lang: "ko" | "en";
  onPick: (lat: number, lon: number) => void;
  onPickCity: (city: City) => void;
  /** 축척·배율 표시를 위해 부모에게 알린다 (10Hz 남짓) */
  onView?: (v: { zoom: number; kmPerPx: number }) => void;
}

/** 절대 하한. 실제 하한은 캔버스 종횡비가 정한다 — minZoomOf() 참조. */
const MIN_ZOOM = 1;
const MAX_ZOOM = 24;
/** 이 픽셀 안이면 도시를 집은 것으로 본다 */
const CITY_HIT_PX = 11;
/** 핀을 집었다고 볼 반경. 도시보다 넉넉해야 손가락으로도 잡힌다. */
const PIN_HIT_PX = 22;
/** 이보다 움직이면 '선택'이 아니라 '이동'이다 */
const DRAG_SLOP = 5;

/**
 * 위치 선택용 세계 지도.
 *
 * 타일 서버를 쓰지 않는다 — API 키도, 외부 요청도, 오프라인 실패도 없다.
 * 대륙 윤곽 126개 링(41KB)을 등장방형으로 직접 그린다.
 *
 * 확대·이동은 목표값을 두고 매 프레임 지수 보간으로 따라간다. 값을 즉시
 * 바꾸면 휠 한 칸마다 화면이 순간이동해서 어디를 보고 있었는지 잃어버린다.
 */
export default function WorldMap({
  ref,
  land,
  lat,
  lon,
  cities,
  lang,
  onPick,
  onPickCity,
  onView,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<City | null>(null);
  /** 핀을 직접 끌고 있는가. 이때는 지도를 밀지 않는다. */
  const [pinGrab, setPinGrab] = useState(false);

  // 현재 뷰와 목표 뷰. 렌더 루프가 current → target으로 수렴한다.
  const view = useRef({ lon: 0, lat: 0, zoom: 1 });
  const target = useRef({ lon: 0, lat: 0, zoom: 1 });
  /**
   * 도시별 라벨 투명도.
   *
   * 겹침 판정은 프레임마다 결과가 달라질 수 있어서, 켜고 끄기를 즉시 하면
   * 지도를 끌 때 지명이 깜빡깜빡한다. 목표값(보임 1 / 숨김 0)을 두고
   * 지수 보간으로 따라가면 드나드는 게 미끄러진다.
   */
  const labelAlpha = useRef(new Map<string, number>());
  const sizeRef = useRef({ w: 0, h: 0 });
  /** 첫 측정에서 한 번만 선택 위치로 중심을 잡는다. 이후 리사이즈는 건드리지 않는다. */
  const didCenter = useRef(false);
  const reportRef = useRef(0);

  /**
   * 매 렌더마다 바뀌는 props를 ref로 옮긴다.
   *
   * ⚠️ 이걸 이펙트 의존성에 그대로 두면 지도가 배율을 10Hz로 보고할 때마다
   *    부모가 리렌더되고, 그 결과 포인터 리스너가 초당 10번 재생성된다.
   *    리스너가 다시 만들어지면 드래그 중이던 pointers Map이 비워져서
   *    다음 pointermove가 '이전 위치 없음'으로 처리되고 이동량이 통째로
   *    버려진다 — 잡고 끌어도 조금씩만 움직이는 증상의 원인이다.
   */
  const p = useRef({ land, lat, lon, cities, lang, hover, pinGrab, onPick, onPickCity, onView });
  // 렌더 중이 아니라 커밋 직후에 갱신한다. 그리기는 rAF에서 일어나므로
  // 페인트 전에만 최신이면 충분하다.
  useLayoutEffect(() => {
    p.current = { land, lat, lon, cities, lang, hover, pinGrab, onPick, onPickCity, onView };
  });

  /**
   * 위도만 가둔다. 경도는 가두지 않는다 — 지구는 동서로 이어져 있으므로
   * 좌우로 계속 밀면 계속 이어져야 한다. 경도는 자유롭게 흐르게 두고,
   * 그리는 쪽에서 ±360°를 더해 화면 안으로 감아 넣는다.
   */
  /**
   * 종횡비를 반영한 위도 범위.
   *
   * ⚠️ 경도와 위도의 '픽셀당 도'가 같아야 대륙이 안 늘어난다. 예전처럼
   *    180/zoom으로 못 박으면 캔버스가 정사각일 때 세로로 2배 늘어난 지구가
   *    나오는데, 화면은 그럴듯해 보이고 대륙 모양만 조용히 틀린다.
   *    2:1 캔버스에서는 이 식이 정확히 180/zoom이 되어 기존 동작과 같다.
   */
  const latSpanOf = useCallback((zoom: number) => {
    const { w, h } = sizeRef.current;
    if (w <= 0 || h <= 0) return 180 / zoom;
    return (360 / zoom) * (h / w);
  }, []);

  /**
   * 위도 범위가 180°를 넘지 않는 최소 배율.
   *
   * 넘어가면 극 너머의 '없는 위도'가 화면에 들어와 위아래로 빈 띠가 생긴다.
   * 2:1이면 1, 정사각이면 2다 — 정사각에서는 위도를 극에서 극까지 다 보여주고
   * 경도는 180°만 보여준다는 뜻이며, 경도는 무한 스크롤이라 끌면 이어진다.
   */
  const minZoomOf = useCallback(() => {
    const { w, h } = sizeRef.current;
    if (w <= 0 || h <= 0) return MIN_ZOOM;
    return Math.max(MIN_ZOOM, (2 * h) / w);
  }, []);

  const clampCenter = useCallback(() => {
    const t = target.current;
    t.zoom = Math.min(MAX_ZOOM, Math.max(minZoomOf(), t.zoom));
    const latHalf = latSpanOf(t.zoom) / 2;
    t.lat = latHalf >= 90 ? 0 : Math.min(90 - latHalf, Math.max(-90 + latHalf, t.lat));
  }, [latSpanOf, minZoomOf]);

  useImperativeHandle(ref, () => ({
    zoomBy: (factor) => {
      target.current.zoom *= factor;
      clampCenter();
    },
    centerOn: (la, lo) => {
      target.current.lat = la;
      target.current.lon = lo;
      clampCenter();
    },
  }));

  /**
   * 현재 뷰 기준 투영.
   *
   * px()는 경도를 '중심에서 가장 가까운 표현'으로 감아서 계산한다. 예컨대
   * 중심이 170°인데 대상이 -175°라면 실제로는 오른쪽으로 15° 떨어져 있으므로
   * +185°로 취급해야 한다. 이 한 줄이 무한 스크롤의 전부다.
   */
  const proj = useCallback(() => {
    const { w, h } = sizeRef.current;
    const v = view.current;
    const lonSpan = 360 / v.zoom;
    const latSpan = latSpanOf(v.zoom);
    const wrap = (lo: number) => lo + 360 * Math.round((v.lon - lo) / 360);
    return {
      wrap,
      px: (lo: number) => ((wrap(lo) - v.lon) / lonSpan) * w + w / 2,
      /** 감지 않은 원본 경도로 계산 — 대륙 링을 여러 번 그릴 때 쓴다 */
      pxRaw: (lo: number) => ((lo - v.lon) / lonSpan) * w + w / 2,
      py: (la: number) => h / 2 - ((la - v.lat) / latSpan) * h,
      unpx: (x: number) => ((x - w / 2) / w) * lonSpan + v.lon,
      unpy: (y: number) => v.lat - ((y - h / 2) / h) * latSpan,
    };
  }, [latSpanOf]);

  /** 이 지점이 현재 위치 핀 위인가 */
  const onPin = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      const r = canvas.getBoundingClientRect();
      const pr = proj();
      return (
        Math.hypot(
          clientX - (r.left + pr.px(p.current.lon)),
          clientY - (r.top + pr.py(p.current.lat)),
        ) < PIN_HIT_PX
      );
    },
    [proj],
  );

  const cityAt = useCallback(
    (clientX: number, clientY: number): City | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const r = canvas.getBoundingClientRect();
      const pr = proj();
      let best: City | null = null;
      let bestD = CITY_HIT_PX;
      for (const c of p.current.cities) {
        const d = Math.hypot(
          clientX - (r.left + pr.px(c.lon)),
          clientY - (r.top + pr.py(c.lat)),
        );
        if (d < bestD) {
          bestD = d;
          best = c;
        }
      }
      return best;
    },
    [proj],
  );

  // ── 렌더 루프 ────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      sizeRef.current = { w, h };
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 하한 배율은 종횡비가 정한다. 크기를 처음 재는 지금이 그걸 알 수 있는
      // 첫 시점이므로, 목표와 현재 뷰를 함께 올린다. 목표만 올리면 열자마자
      // 지도가 스르륵 확대되는 게 보인다.
      const mz = minZoomOf();
      if (target.current.zoom < mz) target.current.zoom = mz;
      if (view.current.zoom < mz) view.current.zoom = mz;

      // ⚠️ 선택된 위치로 중심을 잡는다. 예전에는 전 세계가 한 화면에 들어와서
      //    경도 0에서 시작해도 아무 문제가 없었지만, 정사각 지도는 경도를
      //    180°만 보여주므로 그대로 두면 서울이 아예 화면 밖에서 시작한다.
      //    목표뿐 아니라 현재 뷰도 함께 옮긴다 — 목표만 옮기면 열자마자
      //    지도가 지구 반 바퀴를 미끄러져 간다.
      if (!didCenter.current && w > 0 && h > 0) {
        didCenter.current = true;
        target.current.lon = p.current.lon;
        target.current.lat = p.current.lat;
        clampCenter();
        view.current.lon = target.current.lon;
        view.current.lat = target.current.lat;
      } else {
        clampCenter();
      }
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const fadeK = 1 - Math.exp(-dt / 0.12);

      // 목표를 향해 지수 보간. τ가 작을수록 즉각적이지만 튄다.
      const k = 1 - Math.exp(-dt / 0.09);
      const v = view.current;
      const t = target.current;
      // 확대는 로그 공간에서 보간해야 2배씩 커질 때 속도가 일정하게 느껴진다
      v.zoom = Math.exp(Math.log(v.zoom) + (Math.log(t.zoom) - Math.log(v.zoom)) * k);
      v.lon += (t.lon - v.lon) * k;
      v.lat += (t.lat - v.lat) * k;

      // 무한 스크롤이라 경도가 무한정 커진다. 그대로 두면 부동소수 정밀도가
      // 떨어지고, 대륙 사본을 몇 바퀴까지 그려야 하는지도 알 수 없다.
      // 현재 뷰와 목표를 '같은 양'만큼 되감아 차이를 보존한다.
      const turns = Math.round(v.lon / 360);
      if (turns !== 0) {
        v.lon -= turns * 360;
        t.lon -= turns * 360;
      }

      const { w, h } = sizeRef.current;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);

      const pr = proj();
      const { land, cities, lang, hover, lat, lon, onView } = p.current;
      const styles = getComputedStyle(document.documentElement);
      const hairline = styles.getPropertyValue("--hairline-on-dark").trim() || "#3a3a3f";
      const fg = styles.getPropertyValue("--on-primary").trim() || "#ffffff";
      const accent = styles.getPropertyValue("--accent-reticle").trim() || "#ffb95e";

      // 격자 — 확대할수록 촘촘해진다
      const step = v.zoom < 2 ? 30 : v.zoom < 5 ? 10 : v.zoom < 12 ? 5 : 1;
      ctx.strokeStyle = hairline;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      const lonSpan = 360 / v.zoom;
      const latSpan = latSpanOf(v.zoom);
      for (
        let lo = Math.ceil((v.lon - lonSpan / 2) / step) * step;
        lo <= v.lon + lonSpan / 2;
        lo += step
      ) {
        // 감지 않은 좌표로 그린다 — 이미 화면 범위 안의 값이다
        ctx.moveTo(pr.pxRaw(lo), 0);
        ctx.lineTo(pr.pxRaw(lo), h);
      }
      for (
        let la = Math.ceil((v.lat - latSpan / 2) / step) * step;
        la <= v.lat + latSpan / 2;
        la += step
      ) {
        ctx.moveTo(0, pr.py(la));
        ctx.lineTo(w, pr.py(la));
      }
      ctx.stroke();

      // 적도
      ctx.strokeStyle = fg;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(0, pr.py(0));
      ctx.lineTo(w, pr.py(0));
      ctx.stroke();
      ctx.globalAlpha = 1;

      // 대륙 윤곽. 무한 스크롤을 위해 세계를 ±360°씩 옆에 복제해 그린다.
      // 화면에 걸치는 사본만 그리므로 비용은 사실상 늘지 않는다.
      if (land) {
        // 중심이 항상 [-180,180) 안에 있으므로 좌우 한 바퀴씩이면 충분하다.
        // 화면에 걸치는 사본만 그리므로 비용은 사실상 늘지 않는다.
        const offsets: number[] = [];
        for (let k = -1; k <= 1; k++) {
          const off = k * 360;
          if (off - 180 < v.lon + lonSpan / 2 && off + 180 > v.lon - lonSpan / 2) {
            offsets.push(off);
          }
        }
        ctx.strokeStyle = fg;
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 0.75;
        ctx.lineJoin = "round";
        ctx.beginPath();
        for (const off of offsets) {
          for (const ring of land) {
            let started = false;
            for (let i = 0; i < ring.length; i += 2) {
              const x = pr.pxRaw(ring[i] + off);
              const y = pr.py(ring[i + 1]);
              if (!started) {
                ctx.moveTo(x, y);
                started = true;
              } else ctx.lineTo(x, y);
            }
            ctx.closePath();
          }
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // ── 도시 + 지명 ─────────────────────────────────────────────
      // 확대할수록 자리가 생기므로 라벨이 늘어난다. 겹치면 중요도가 높은
      // 쪽만 남긴다 — 두 이름이 포개지면 둘 다 못 읽는다.
      ctx.font = `11px ${styles.getPropertyValue("--font-ui").trim() || "sans-serif"}`;
      ctx.textBaseline = "middle";
      const placed: { x: number; y: number; w: number }[] = [];
      const visible = cities
        .map((c) => ({ c, x: pr.px(c.lon), y: pr.py(c.lat) }))
        .filter((o) => o.x > -40 && o.x < w + 40 && o.y > -20 && o.y < h + 20)
        // rank가 낮을수록(=중요할수록) 먼저 자리를 잡는다
        .sort((a, b) => a.c.rank - b.c.rank);

      // 이번 프레임에 '보여야 하는' 라벨을 먼저 정하고, 실제 그리기는
      // 보간된 투명도로 한다 — 판정이 바뀌어도 튀지 않는다.
      const wantOn = new Set<string>();
      for (const o of visible) {
        const isHover = hover?.en === o.c.en;
        const rankOk = o.c.rank === 1 || (o.c.rank === 2 && v.zoom >= 1.6) || v.zoom >= 3.5;
        if (!rankOk && !isHover) continue;
        const nameStr = lang === "ko" ? o.c.ko : o.c.en;
        const tw = ctx.measureText(nameStr).width;
        const flip = o.x + 7 + tw > w - 3;
        const lx = flip ? o.x - 7 - tw : o.x + 7;
        const clash = placed.some(
          (q) => Math.abs(q.y - o.y) < 13 && lx < q.x + q.w + 4 && lx + tw + 4 > q.x,
        );
        if (clash && !isHover) continue;
        placed.push({ x: lx, y: o.y, w: tw });
        wantOn.add(o.c.en);
      }

      for (const o of visible) {
        const isHover = hover?.en === o.c.en;

        // 점은 항상 그린다. 점까지 페이드하면 어디를 고를 수 있는지가 흐려진다.
        ctx.fillStyle = fg;
        ctx.globalAlpha = isHover ? 1 : 0.45;
        ctx.beginPath();
        ctx.arc(o.x, o.y, isHover ? 3.2 : 1.7, 0, Math.PI * 2);
        ctx.fill();

        const prevA = labelAlpha.current.get(o.c.en) ?? 0;
        const a = prevA + ((wantOn.has(o.c.en) ? 1 : 0) - prevA) * fadeK;
        labelAlpha.current.set(o.c.en, a);
        if (a < 0.02) {
          ctx.globalAlpha = 1;
          continue;
        }

        const nameStr = lang === "ko" ? o.c.ko : o.c.en;
        const tw = ctx.measureText(nameStr).width;
        const flip = o.x + 7 + tw > w - 3;
        ctx.globalAlpha = a * (isHover ? 0.95 : 0.62);
        ctx.fillStyle = fg;
        ctx.fillText(nameStr, flip ? o.x - 7 - tw : o.x + 7, o.y);
        ctx.globalAlpha = 1;
      }

      // 현재 위치 핀
      const cx = pr.px(lon);
      const cy = pr.py(lat);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // 잡고 있으면 고리가 커진다 — 지금 이게 손에 붙어 있다는 신호
      const grabbed = p.current.pinGrab;
      ctx.lineWidth = grabbed ? 1.4 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, grabbed ? 9 : 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(cx, cy, grabbed ? 2.6 : 2, 0, Math.PI * 2);
      ctx.fill();

      // 부모에게 배율·축척 보고 (10Hz)
      if (onView && now - reportRef.current > 100) {
        reportRef.current = now;
        // 화면 중앙 위도에서의 경도 1도당 km
        const kmPerDeg = 111.32 * Math.cos((v.lat * Math.PI) / 180);
        // 배율은 '더 못 줄이는 지점' 기준으로 알린다. 정사각 캔버스의 하한은
        // 2인데 그걸 그대로 ×2.0이라고 띄우면 열자마자 확대돼 있는 것처럼 보인다.
        onView({ zoom: v.zoom / minZoomOf(), kmPerPx: (kmPerDeg * (360 / v.zoom)) / w });
      }
    };

    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
    // 마운트 시 한 번만. 그리기에 필요한 값은 전부 ref에서 읽으므로
    // props가 바뀌어도 루프를 다시 만들 이유가 없다.
  }, [proj, latSpanOf, minZoomOf, clampCenter]);

  // ── 입력 ─────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let downAt = { x: 0, y: 0 };
    let moved = 0;
    let lastPinch = 0;
    /** 핀을 직접 끄는 중. 이 동안 지도는 고정된다. */
    let draggingPin = false;

    const zoomAt = (clientX: number, clientY: number, factor: number) => {
      const r = canvas.getBoundingClientRect();
      const pr = proj();
      // 커서 아래 지점이 제자리에 남도록 중심을 옮긴다.
      // 이게 없으면 확대할 때마다 보던 곳을 놓친다.
      const lo = pr.unpx(clientX - r.left);
      const la = pr.unpy(clientY - r.top);
      const t = target.current;
      const before = t.zoom;
      t.zoom = Math.min(MAX_ZOOM, Math.max(minZoomOf(), t.zoom * factor));
      const applied = t.zoom / before;
      t.lon = lo - (lo - t.lon) / applied;
      t.lat = la - (la - t.lat) / applied;
      clampCenter();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.18 : 1 / 1.18);
    };

    const onDown = (e: PointerEvent) => {
      // 포인터 캡처는 실패할 수 있다(합성 이벤트, 이미 해제된 포인터 등).
      // 여기서 던지면 pointerdown 핸들러 전체가 죽어 지도가 먹통이 된다.
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {
        /* 캡처 없이도 pointermove는 캔버스 위에서 계속 들어온다 */
      }
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        downAt = { x: e.clientX, y: e.clientY };
        moved = 0;
        // 핀을 집었으면 지도를 미는 게 아니라 핀을 옮긴다
        draggingPin = onPin(e.clientX, e.clientY);
        if (draggingPin) setPinGrab(true);
      }
    };

    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev) {
        // 누르지 않은 상태의 이동 → 호버 판정만
        const c = cityAt(e.clientX, e.clientY);
        setHover((h) => (h?.en === c?.en ? h : c));
        return;
      }
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (draggingPin && pointers.size === 1) {
        moved += Math.hypot(dx, dy);
        const r = canvas.getBoundingClientRect();
        const pr = proj();
        p.current.onPick(pr.unpy(e.clientY - r.top), pr.unpx(e.clientX - r.left));
        return;
      }

      if (pointers.size === 1) {
        moved += Math.hypot(dx, dy);
        if (moved > DRAG_SLOP) {
          const { w, h } = sizeRef.current;
          const t = target.current;
          const v = view.current;
          // ⚠️ 드래그는 목표와 현재 뷰를 '같은 양'만큼 함께 옮긴다.
          //    목표만 옮기고 보간에 맡기면 손가락과 지도 사이에 지연이 생기고,
          //    포인터 이벤트가 뭉쳐 들어올 때마다 그 지연이 들쭉날쭉해져
          //    스크롤이 끊기는 것처럼 느껴진다. 잡고 끄는 동작에 관성은 필요 없다.
          const dLon = (dx / w) * (360 / v.zoom);
          const dLat = (dy / h) * latSpanOf(v.zoom);
          t.lon -= dLon;
          v.lon -= dLon;
          t.lat += dLat;
          v.lat += dLat;
          clampCenter();
          // 위도는 가둬지므로 현재 뷰도 함께 맞춰 준다
          const half = latSpanOf(v.zoom) / 2;
          v.lat = half >= 90 ? 0 : Math.min(90 - half, Math.max(-90 + half, v.lat));
        }
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastPinch > 0) {
          zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, dist / lastPinch);
          moved += 20; // 핀치는 선택으로 치지 않는다
        }
        lastPinch = dist;
      }
    };

    const onUp = (e: PointerEvent) => {
      const wasSingle = pointers.size === 1;
      const wasPin = draggingPin;
      pointers.delete(e.pointerId);
      if (pointers.size < 2) lastPinch = 0;
      if (wasPin) {
        draggingPin = false;
        setPinGrab(false);
        return;
      }
      if (!wasSingle || moved > DRAG_SLOP) return;

      // 움직이지 않았으면 선택이다
      const city = cityAt(downAt.x, downAt.y);
      if (city) {
        p.current.onPickCity(city);
        return;
      }
      const r = canvas.getBoundingClientRect();
      const pr = proj();
      p.current.onPick(pr.unpy(downAt.y - r.top), pr.unpx(downAt.x - r.left));
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", () => setHover(null));
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
    };
    // 콜백은 ref로 읽으므로 의존성에 넣지 않는다 — 넣으면 부모가 리렌더될
    // 때마다 리스너가 다시 붙고, 드래그 중이면 그 순간 이동량을 잃는다.
    // latSpanOf·minZoomOf는 useCallback([])이라 안정적이다 — 여기 들어가도
    // 리스너가 다시 만들어지지 않는다 (위쪽 ⚠️ 참조).
  }, [cityAt, onPin, proj, clampCenter, latSpanOf, minZoomOf]);

  return (
    <canvas
      ref={canvasRef}
      className="h-full w-full touch-none rounded-xl border border-hairline"
      style={{ cursor: pinGrab ? "grabbing" : hover ? "pointer" : "grab" }}
    />
  );
}
