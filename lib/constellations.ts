import { asset } from "./asset";

export interface Constellation {
  id: string;
  nameLat: string;
  nameGen: string;
  nameEn: string;
  nameKo: string;
  /** 1=대형/유명, 3=소형. 라벨 우선순위에 쓴다. */
  rank: number;
  labelRa: number;
  labelDec: number;
  /** 가장 밝은 구성별의 stars.bin 인덱스 */
  brightest: number;
  /** stars.bin 인덱스 쌍의 평탄 배열. 좌표가 아니라 인덱스라서 선이 별과 '증명 가능하게' 일치한다. */
  segments: number[];
  /** 스냅 실패 구간의 생좌표 (ra,dec,ra,dec). 현재 데이터셋에선 비어 있다. */
  fallback?: number[];
  /** 구면 폴리곤에서 직접 계산한 면적(제곱도). 88개 합이 41,253과 맞는다. */
  areaSqDeg: number;
  /** 면적 순위 1..88 */
  areaRank: number;
  /** 저녁 9시에 남중하는 달 = 보기 가장 좋은 때 (1..12) */
  bestMonth: number | null;
}

export async function loadConstellations(): Promise<Constellation[]> {
  const res = await fetch(asset("/data/constellations.json"));
  if (!res.ok) throw new Error(`constellations.json ${res.status}`);
  return res.json();
}

export function constellationName(c: Constellation, lang: "ko" | "en"): string {
  return lang === "ko" ? c.nameKo : c.nameEn;
}
