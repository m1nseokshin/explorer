"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CITIES, type City } from "@/lib/cities";
import { useLanguage } from "@/lib/i18n";
import { loadLand, type LandRings } from "@/lib/land";
import WorldMap, { type WorldMapHandle } from "./WorldMap";

interface Props {
  open: boolean;
  lat: number;
  lon: number;
  label: string | null;
  gpsStatus: "idle" | "pending" | "granted" | "denied" | "unavailable";
  /** GPS로 확인된 실제 위치. 있으면 '내 위치'로 돌아갈 수 있다. */
  gpsFix: { lat: number; lon: number } | null;
  onPick: (lat: number, lon: number, label: string | null) => void;
  onUseGps: () => void;
  /** 확정. 최초 진입에서는 이게 유일한 출구다. */
  onConfirm: () => void;
  /** 최초 진입인지. 문구와 뒤로가기 동작이 달라진다. */
  firstRun: boolean;
  /** 뒤로가기. 최초 진입이면 홈으로, 아니면 닫기. */
  onBack: () => void;
}

/**
 * 축척 막대.
 *
 * 1·2·5 계열에서 화면 폭 1/4에 가장 가까운 '깔끔한 숫자'를 골라 그 길이만큼
 * 그린다. 지도에서 거리 감각을 주는 가장 확실한 방법이며, 배율(×n)만으로는
 * 그게 몇 km인지 알 수 없다.
 */
function ScaleBar({ kmPerPx, zoom }: { kmPerPx: number; zoom: number }) {
  if (!kmPerPx) return null;
  const targetPx = 88;
  const rawKm = kmPerPx * targetPx;
  const pow = Math.pow(10, Math.floor(Math.log10(rawKm)));
  const nice = [1, 2, 5, 10].reduce((best, m) =>
    Math.abs(m * pow - rawKm) < Math.abs(best * pow - rawKm) ? m : best,
  );
  const km = nice * pow;
  const px = km / kmPerPx;
  const label = km >= 1 ? `${km.toLocaleString()} km` : `${Math.round(km * 1000)} m`;

  return (
    <div className="pointer-events-none absolute bottom-2 left-2 flex items-end gap-2">
      <div>
        <div
          className="border-b border-l border-r border-current"
          style={{ width: px, height: 5, opacity: 0.75 }}
        />
        <span className="type-mono-hud mt-0.5 block leading-none opacity-75">{label}</span>
      </div>
      <span className="type-mono-hud leading-none opacity-45">×{zoom.toFixed(1)}</span>
    </div>
  );
}

/** 대원 거리(km). 근처 도시를 찾는 데 쓴다. */
function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371;
  const d = Math.PI / 180;
  const s =
    Math.sin(aLat * d) * Math.sin(bLat * d) +
    Math.cos(aLat * d) * Math.cos(bLat * d) * Math.cos((aLon - bLon) * d);
  return R * Math.acos(Math.min(1, Math.max(-1, s)));
}

/**
 * 관측 위치 선택.
 *
 * 하늘은 '어디서 보느냐'에 따라 통째로 달라진다 — 서울과 시드니는 같은 시각에
 * 완전히 다른 별을 본다. 그래서 위치는 설정 항목이 아니라 시작 단계다.
 *
 * 지도가 화면의 주인공이어야 한다. 위도·경도 숫자 두 개보다 지도 위의 점 하나가
 * '내가 어디서 하늘을 보는지'를 훨씬 정확히 전달하고, 작게 넣으면 그 이점이
 * 통째로 사라진다. 타일 서버는 쓰지 않는다 — API 키도, 외부 요청도 없다.
 */
export default function LocationPicker({
  open,
  lat,
  lon,
  label,
  gpsStatus,
  gpsFix,
  onPick,
  onUseGps,
  onConfirm,
  firstRun,
  onBack,
}: Props) {
  const { lang } = useLanguage();
  const t = (ko: string, en: string) => (lang === "ko" ? ko : en);
  const [q, setQ] = useState("");
  const [land, setLand] = useState<LandRings | null>(null);
  const mapRef = useRef<WorldMapHandle>(null);
  const [viewInfo, setViewInfo] = useState({ zoom: 1, kmPerPx: 0 });
  // 지도가 10Hz로 보고하므로 참조가 안정적이어야 이펙트가 헛돌지 않는다
  const onView = useCallback(
    (v: { zoom: number; kmPerPx: number }) =>
      setViewInfo((p) =>
        // ⚠️ zoom만 비교하면 초기값(zoom 1, kmPerPx 0)이 첫 보고(zoom 1, kmPerPx X)를
        //    같은 것으로 보고 버려서 축척 막대가 영영 안 뜬다.
        Math.abs(p.zoom - v.zoom) < 0.005 && Math.abs(p.kmPerPx - v.kmPerPx) < 0.01
          ? p
          : v,
      ),
    [],
  );

  useEffect(() => {
    if (!open || land) return;
    let alive = true;
    loadLand()
      .then((l) => alive && setLand(l))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open, land]);

  const name = (c: City) => (lang === "ko" ? c.ko : c.en);

  const searchResults = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [] as City[];
    return CITIES.filter(
      (c) => c.ko.includes(s) || c.en.toLowerCase().includes(s),
    ).slice(0, 8);
  }, [q]);

  /** 지금 찍은 지점에서 가까운 도시들. 지도를 대충 찍어도 정확한 곳으로 갈 수 있게. */
  const nearby = useMemo(
    () =>
      CITIES.map((c) => ({ c, d: distanceKm(lat, lon, c.lat, c.lon) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3),
    [lat, lon],
  );

  const gpsBusy = gpsStatus === "pending";

  /** GPS로 잡힌 자리에서 가장 가까운 도시. 좌표보다 이름이 훨씬 잘 읽힌다. */
  const gpsPlace = useMemo(() => {
    if (!gpsFix) return null;
    let best: City | null = null;
    let bestD = Infinity;
    for (const c of CITIES) {
      const d = distanceKm(gpsFix.lat, gpsFix.lon, c.lat, c.lon);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    // 400km 넘게 떨어져 있으면 그 도시 이름을 붙이는 건 거짓말에 가깝다
    return best && bestD < 400 ? (lang === "ko" ? best.ko : best.en) : null;
  }, [gpsFix, lang]);
  const showSearch = q.trim().length > 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 flex flex-col bg-background"
          style={{
            paddingTop: "calc(env(safe-area-inset-top) + 20px)",
            paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)",
          }}
        >
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden px-5 sm:px-8">
            {/* 헤더 — 뒤로가기는 왼쪽. 되돌아가는 동작이 왼쪽이라는 규약은
                모바일 전반에 걸쳐 있어서, 오른쪽에 두면 매번 찾게 된다. */}
            <div className="flex shrink-0 items-center gap-3">
              <motion.button
                type="button"
                onClick={onBack}
                aria-label={firstRun ? t("홈으로", "Back to home") : t("닫기", "Close")}
                whileTap={{ scale: 0.94 }}
                transition={{ type: "spring", stiffness: 600, damping: 30 }}
                className="tap-56 flex shrink-0 items-center justify-center rounded-full border border-hairline transition-colors hover:border-foreground"
              >
                <svg
                  viewBox="0 0 20 20"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {firstRun ? (
                    <path d="M12 4 6 10l6 6" />
                  ) : (
                    <path d="M5 5l10 10M15 5 5 15" />
                  )}
                </svg>
              </motion.button>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="min-w-0 flex-1 text-center"
              >
                <p className="type-eyebrow text-muted">
                  {t("관측 지점", "Your position")}
                </p>
                <h2 className="type-display-lg mt-1 truncate text-balance text-2xl sm:text-3xl">
                  {firstRun
                    ? t("지금 계신 곳을 찍으세요", "Mark where you are")
                    : (label ?? t("지도에서 고르세요", "Pick on the map"))}
                </h2>
              </motion.div>

              {/* 제목이 진짜 가운데 오도록 하는 균형추 */}
              <div className="tap-56 shrink-0" aria-hidden />
            </div>

            {/* 지도 — 화면의 주인공. 남는 세로 공간을 전부 가져간다. */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="mt-4 flex min-h-0 flex-1 items-center justify-center"
            >
              {/* 등장방형 투영이라 2:1을 지켜야 대륙 모양이 왜곡되지 않는다.
                  남는 공간에 들어가는 가장 큰 2:1 사각형으로 잡는다. */}
              {/* 모바일은 정사각 — 2:1이면 세로 여백만 남고 지도가 손톱만해진다.
                  투영이 종횡비를 반영하므로 어떤 비율이든 대륙은 안 늘어나고,
                  정사각에서는 극에서 극까지 다 보이는 대신 경도를 180°만 보여준다
                  (경도는 무한 스크롤이라 끌면 이어진다).
                  세로가 모자란 짧은 화면에서는 max-h가 잡아 눌러 가로로 긴
                  지도가 되는데, 이 역시 왜곡 없이 그려진다. */}
              <div className="relative aspect-square max-h-full w-full max-w-full sm:aspect-[2/1]">
                <WorldMap
                  ref={mapRef}
                  land={land}
                  lat={lat}
                  lon={lon}
                  cities={CITIES}
                  lang={lang}
                  onPick={(la, lo) => onPick(la, lo, null)}
                  onPickCity={(c) => {
                    onPick(c.lat, c.lon, name(c));
                    mapRef.current?.centerOn(c.lat, c.lon);
                  }}
                  onView={onView}
                />

                {/* 확대 버튼 — 휠이나 핀치를 모르는 사람도 쓸 수 있어야 한다 */}
                <div className="absolute right-2 top-2 flex flex-col gap-1.5">
                  {([
                    ["+", 1.7, t("확대", "Zoom in")],
                    ["−", 1 / 1.7, t("축소", "Zoom out")],
                  ] as const).map(([sym, f, aria]) => (
                    <motion.button
                      key={sym}
                      type="button"
                      aria-label={aria}
                      whileTap={{ scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 600, damping: 30 }}
                      onClick={() => mapRef.current?.zoomBy(f)}
                      className="hud-pill flex h-9 w-9 items-center justify-center text-base leading-none"
                    >
                      {sym}
                    </motion.button>
                  ))}
                </div>

                {/* 축척 막대 — 얼마나 확대했는지 숫자보다 길이가 빨리 읽힌다 */}
                <ScaleBar kmPerPx={viewInfo.kmPerPx} zoom={viewInfo.zoom} />
              </div>
            </motion.div>

            {/* 좌표 + 근처 도시 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="mt-3 shrink-0"
            >
              <div className="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1">
                <p className="type-mono-hud text-muted">
                  {lat >= 0 ? "N" : "S"} {Math.abs(lat).toFixed(2)}° ·{" "}
                  {lon >= 0 ? "E" : "W"} {Math.abs(lon).toFixed(2)}°
                </p>
                {label && <p className="type-caption">{label}</p>}
              </div>

              <p className="type-eyebrow mt-3 text-center text-muted">
                {showSearch ? t("검색 결과", "Results") : t("근처", "Nearby")}
              </p>

              {/*
                지도를 대충 찍어도 근처 도시가 바로 뜬다.

                ⚠️ 높이를 고정한다. 칩이 두 줄로 늘어나면 아래가 통째로 밀리고,
                   flex-1인 지도가 그만큼 줄어들어 화면이 덜컥 움직인다.
                   위로 붙이는 걸로는 안 된다 — 위치가 아니라 '높이가 변하는 것'이
                   원인이라서, 한 줄 높이로 못 박고 넘치면 가로로 흘린다.
              */}
              <div className="mt-1.5 h-12 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="mx-auto flex h-12 w-max items-center gap-2 px-1">
                <AnimatePresence mode="popLayout" initial={false}>
                  {(showSearch ? searchResults : nearby.map((n) => n.c)).map((c) => {
                    const isCurrent = label === name(c);
                    return (
                      <motion.button
                        key={c.en}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 500, damping: 34 }}
                        whileTap={{ scale: 0.94 }}
                        type="button"
                        onClick={() => {
                          onPick(c.lat, c.lon, name(c));
                          setQ("");
                        }}
                        data-active={isCurrent ? "true" : "false"}
                        className="hud-pill type-button-cap px-4 py-2"
                      >
                        {name(c)}
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* 액션 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="mt-3 shrink-0"
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("도시 이름으로 찾기", "Search by city")}
                className="type-body-lg w-full border-b border-hairline bg-transparent py-2.5 text-center outline-none transition-colors focus:border-foreground"
              />
              <div className="mt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    // 이미 잡혀 있으면 다시 물어볼 이유가 없다 — 그 자리로 돌아간다
                    if (gpsFix) onPick(gpsFix.lat, gpsFix.lon, gpsPlace);
                    else onUseGps();
                  }}
                  disabled={gpsBusy}
                  className="hud-pill type-button-cap tap-56 min-w-0 flex-1 truncate px-4 disabled:opacity-50"
                >
                  {/* '거부됨' 같은 상태 통보는 다음에 뭘 하라는 건지가 없다.
                      항상 행동으로 적고, 이미 알고 있으면 그 자리를 보여 준다. */}
                  {gpsBusy
                    ? t("찾는 중…", "Locating…")
                    : gpsFix
                      ? `${t("내 위치", "My location")} : ${gpsPlace ?? `${gpsFix.lat.toFixed(1)}, ${gpsFix.lon.toFixed(1)}`}`
                      : t("내 위치로 찾기", "Find me")}
                </button>
                <motion.button
                  type="button"
                  onClick={onConfirm}
                  whileTap={{ scale: 0.97 }}
                  className="btn-ghost tap-56 flex-1"
                >
                  {firstRun ? t("여기서 출항", "Depart from here") : t("적용", "Apply")}
                </motion.button>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
