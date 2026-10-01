/**
 * 타임랩스의 계산. 전부 순수 함수라 verify-sky.mjs(H15)가 브라우저 없이 검사한다.
 *
 * 하늘 자체의 회전은 lib/sky.ts의 skyMatrix가 맡는다(세차·장동·항성시 포함).
 * 여기엔 그 옆에서 필요한 것만 둔다 — 속도 단계, 태양 고도, 현지 시각, 다음 밤.
 */
import {
  Body,
  Equator,
  Horizon,
  MakeTime,
  Observer,
  SearchAltitude,
  SiderealTime,
} from "astronomy-engine";

export interface SpeedStop {
  /** 실제 1초에 흐르는 시뮬레이션 초 */
  rate: number;
  ko: string;
  en: string;
}

/**
 * 속도 단계. 가장 빠른 것이 1초에 하루다.
 *
 * 그보다 빠르면 한 프레임(60Hz) 사이에 하늘이 6° 넘게 돌아, 화면에서 별이
 * 이어진 움직임이 아니라 제자리에서 떨리는 점으로 보인다(수레바퀴 착시).
 * 계절이 바뀌는 모습은 날짜를 건너뛰어 보는 편이 정직하다.
 */
export const SPEED_STOPS: readonly SpeedStop[] = [
  { rate: 1, ko: "실시간", en: "Real time" },
  { rate: 10, ko: "10배", en: "10×" },
  { rate: 60, ko: "1초에 1분", en: "1 min / s" },
  { rate: 300, ko: "1초에 5분", en: "5 min / s" },
  { rate: 900, ko: "1초에 15분", en: "15 min / s" },
  { rate: 1800, ko: "1초에 30분", en: "30 min / s" },
  { rate: 3600, ko: "1초에 1시간", en: "1 hr / s" },
  { rate: 10800, ko: "1초에 3시간", en: "3 hr / s" },
  { rate: 21600, ko: "1초에 6시간", en: "6 hr / s" },
  { rate: 86400, ko: "1초에 하루", en: "1 day / s" },
];

/** 처음 들어왔을 때. 하룻밤(약 10시간)이 20초에 지나가 별이 도는 게 바로 보인다. */
export const DEFAULT_SPEED_INDEX = 5;

/** 태양 고도(도). 관측지 기준이고 대기굴절은 넣지 않는다(하늘 렌더와 같은 규약). */
export function sunAltitude(date: Date, lat: number, lon: number): number {
  const obs = new Observer(lat, lon, 0);
  const eq = Equator(Body.Sun, date, obs, true, true);
  return Horizon(date, obs, eq.ra, eq.dec).altitude;
}

/**
 * 태양 고도 → 낮 하늘이 별을 덮는 정도(0..1).
 *
 * 천문박명(−18°)보다 어두우면 0, 해가 뜨기 직전(−4°)이면 거의 다 덮인다.
 * 그 사이는 부드럽게 잇는다 — 박명을 계단으로 끊으면 해 질 녘에 하늘이
 * 한 번에 '툭' 켜진다.
 */
export function skyWash(sunAltDeg: number): number {
  const t = Math.min(1, Math.max(0, (sunAltDeg + 18) / 14));
  return t * t * (3 - 2 * t);
}

/** 하늘 상태 이름 — 판독값 옆에 붙인다. */
export function skyPhase(sunAltDeg: number): "day" | "twilight" | "night" {
  if (sunAltDeg > -0.833) return "day";
  if (sunAltDeg > -18) return "twilight";
  return "night";
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * 현지 평균 태양시 — UTC에 경도/15시간을 더한 값.
 *
 * 그 지역의 법정 시간대는 알 수 없다(시간대 데이터를 싣지 않는다). 대신
 * 경도에서 바로 나오는 시각을 쓰고 화면에도 '태양시'라고 밝힌다. 서울(127°E)
 * 이면 표준시(135°E 기준)보다 약 32분 늦다.
 */
export function localMeanSolarTime(date: Date, lon: number): { date: string; time: string } {
  const d = new Date(date.getTime() + (lon / 15) * 3600_000);
  return {
    date: `${d.getUTCFullYear()}.${pad2(d.getUTCMonth() + 1)}.${pad2(d.getUTCDate())}`,
    time: `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`,
  };
}

/** 지방항성시(시간, 0..24). 그 순간 자오선에 걸린 적경과 같다. */
export function localSiderealHours(date: Date, lon: number): number {
  const gast = SiderealTime(MakeTime(date));
  return (((gast + lon / 15) % 24) + 24) % 24;
}

export function formatHours(h: number): string {
  const total = Math.round(h * 60);
  return `${pad2(Math.floor(total / 60) % 24)}h ${pad2(total % 60)}m`;
}

/**
 * 주어진 시각 이후 처음으로 '밤이 되는' 때.
 *
 * 천문박명이 끝나는 때(태양 −18°, 내려가는 쪽)를 찾는다. 백야처럼 그만큼
 * 어두워지지 않는 날은 항해박명(−12°), 시민박명(−6°), 일몰 순으로 물러선다.
 * 해가 아예 지지 않으면 null — 화면은 그걸 숨기지 않고 알려야 한다.
 */
export function nextNightfall(
  date: Date,
  lat: number,
  lon: number,
): { at: Date; depth: -18 | -12 | -6 | -0.833 } | null {
  const obs = new Observer(lat, lon, 0);
  for (const depth of [-18, -12, -6, -0.833] as const) {
    // 지금 이미 그보다 어두우면 '다음' 밤을 찾아야 하므로 약간 뒤에서 시작하지 않고
    // 그대로 찾는다 — SearchAltitude는 다음 '교차'를 주므로 내일 저녁이 나온다.
    const t = SearchAltitude(Body.Sun, obs, -1, MakeTime(date), 2, depth);
    if (t) return { at: t.date, depth };
  }
  return null;
}
