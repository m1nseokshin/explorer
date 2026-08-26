/**
 * 해·달·행성 위치. 별과 '같은 EQJ 구'에 올려 하나의 변환을 공유한다.
 *
 * ⚠️ Equator()는 RA를 '시간' 단위로 돌려준다. ×15를 빠뜨리면 하늘이 15배
 *    회전하는 고전적 버그가 된다.
 * ⚠️ observer를 넘겨 지심이 아니라 관측지 좌표를 얻어야 한다. 달의 지평시차는
 *    최대 1°에 달해, 빼먹으면 렌더된 달이 실제 달에서 '달 지름 두 개'만큼
 *    빗나간다 — 사용자가 가장 먼저 알아채는 오류다.
 */
import { Body, Equator, Illumination, Observer } from "astronomy-engine";

export interface SolarBody {
  id: string;
  nameKo: string;
  nameEn: string;
  /** J2000 적경(도) */
  ra: number;
  /** J2000 적위(도) */
  dec: number;
  mag: number;
  /** 화면상 각지름(도). 해·달만 유의미하다. */
  angularDiameter: number;
  /** 0=삭, 1=망. 달만. */
  phase?: number;
  color: string;
}

const AU_KM = 149_597_870.7;

const DEFS: {
  body: Body;
  id: string;
  ko: string;
  en: string;
  color: string;
  /** 천체 반지름(km). 각지름 계산용. 행성은 점으로 그리므로 생략. */
  radiusKm?: number;
}[] = [
  { body: Body.Sun, id: "sun", ko: "태양", en: "Sun", color: "#fff3d6", radiusKm: 696000 },
  { body: Body.Moon, id: "moon", ko: "달", en: "Moon", color: "#e8e6df", radiusKm: 1737.4 },
  { body: Body.Mercury, id: "mercury", ko: "수성", en: "Mercury", color: "#8a8a8a" },
  { body: Body.Venus, id: "venus", ko: "금성", en: "Venus", color: "#c9a06c" },
  { body: Body.Mars, id: "mars", ko: "화성", en: "Mars", color: "#b0603f" },
  { body: Body.Jupiter, id: "jupiter", ko: "목성", en: "Jupiter", color: "#c8a97e" },
  { body: Body.Saturn, id: "saturn", ko: "토성", en: "Saturn", color: "#d6c08e" },
  { body: Body.Uranus, id: "uranus", ko: "천왕성", en: "Uranus", color: "#9fd4d9" },
  { body: Body.Neptune, id: "neptune", ko: "해왕성", en: "Neptune", color: "#4666c8" },
];

export function computeSolarBodies(date: Date, lat: number, lon: number): SolarBody[] {
  const obs = new Observer(lat, lon, 0);
  const out: SolarBody[] = [];

  for (const d of DEFS) {
    try {
      // ofdate:false → J2000(EQJ) 좌표. 별과 같은 구에 그대로 올라간다.
      const eq = Equator(d.body, date, obs, false, true);
      const illum = Illumination(d.body, date);
      out.push({
        id: d.id,
        nameKo: d.ko,
        nameEn: d.en,
        ra: eq.ra * 15,
        dec: eq.dec,
        mag: illum.mag,
        // 각지름 = 2·atan(R/d). 해·달 외엔 점으로 그리므로 0.
        angularDiameter: d.radiusKm
          ? (2 * Math.atan(d.radiusKm / (eq.dist * AU_KM)) * 180) / Math.PI
          : 0,
        phase: d.id === "moon" ? illum.phase_fraction : undefined,
        color: d.color,
      });
    } catch {
      // 특정 시각에 계산이 실패해도 하늘 전체를 죽이지 않는다
    }
  }
  return out;
}
