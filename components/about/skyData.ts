"use client";

import { useEffect, useState } from "react";
import { loadConstellations, type Constellation } from "@/lib/constellations";
import {
  loadBoundaries,
  loadStarCatalog,
  loadStarMeta,
  type StarCatalog,
  type StarMeta,
} from "@/lib/stars";

export interface AboutSky {
  catalog: StarCatalog;
  constellations: Constellation[];
  boundaries: Float32Array;
  meta: Record<number, StarMeta>;
}

/**
 * 필름과 성도가 같은 데이터를 쓴다. 각자 fetch하면 stars.bin(800KB)을 두 번
 * 받으므로 모듈 수준에서 약속 하나를 나눠 갖는다. 실패하면 비워 둬서 다음
 * 마운트에서 다시 시도할 수 있게 한다.
 */
let pending: Promise<AboutSky> | null = null;

export function loadAboutSky(): Promise<AboutSky> {
  if (!pending) {
    pending = Promise.all([
      loadStarCatalog(),
      loadConstellations(),
      loadBoundaries(),
      loadStarMeta(),
    ])
      .then(([catalog, constellations, boundaries, meta]) => ({
        catalog,
        constellations,
        boundaries,
        meta,
      }))
      .catch((e) => {
        pending = null;
        throw e;
      });
  }
  return pending;
}

/** 로드 전이나 실패 시 null. 화면의 글은 데이터 없이도 읽혀야 한다. */
export function useAboutSky(): AboutSky | null {
  const [sky, setSky] = useState<AboutSky | null>(null);
  useEffect(() => {
    let alive = true;
    loadAboutSky()
      .then((s) => {
        if (alive) setSky(s);
      })
      .catch(() => {
        /* 캔버스와 성도만 비고 본문은 그대로 읽힌다 */
      });
    return () => {
      alive = false;
    };
  }, []);
  return sky;
}
