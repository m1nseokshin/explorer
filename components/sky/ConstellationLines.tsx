"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Constellation } from "@/lib/constellations";
import { radecToVec3, SKY_RADIUS } from "@/lib/sky";
import type { StarCatalog } from "@/lib/stars";

interface Props {
  constellations: Constellation[];
  catalog: StarCatalog;
  activeId: string | null;
  /** 조준선이 지금 들어와 있는 별자리. 선택(activeId)과 달리 저절로 바뀐다. */
  aimedId: string | null;
  /** 야간모드 리맵 색. 기본 흰색. */
  tint: string;
}

/** 인덱스 쌍 → LineSegments 지오메트리. 좌표가 아니라 인덱스라서 선이 별과 정확히 일치한다. */
function buildGeometry(
  list: Constellation[],
  catalog: StarCatalog,
): THREE.BufferGeometry {
  const pts: number[] = [];
  const v = new THREE.Vector3();
  for (const c of list) {
    for (const i of c.segments) {
      pts.push(
        catalog.positions[i * 3] * SKY_RADIUS,
        catalog.positions[i * 3 + 1] * SKY_RADIUS,
        catalog.positions[i * 3 + 2] * SKY_RADIUS,
      );
    }
    // 스냅 실패 구간의 생좌표 폴백 (현재 데이터셋에선 비어 있다)
    if (c.fallback) {
      for (let k = 0; k + 3 < c.fallback.length; k += 4) {
        radecToVec3(c.fallback[k], c.fallback[k + 1], SKY_RADIUS, v);
        pts.push(v.x, v.y, v.z);
        radecToVec3(c.fallback[k + 2], c.fallback[k + 3], SKY_RADIUS, v);
        pts.push(v.x, v.y, v.z);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

/** 조준 글로우의 최대 불투명도. 기본 0.28과 선택 0.85 사이에 앉힌다 —
 *  세 단계가 구분돼야 '들어왔다 / 골랐다'가 서로 다른 말이 된다. */
const AIM_OPACITY = 0.6;
/** 페이드 시정수(초). 즉시 켜면 조준선을 스칠 때마다 하늘이 깜빡인다. */
const AIM_TAU = 0.2;
/** 아주 얕은 숨. 이게 없으면 '켜졌다'로 끝나고 '빛난다'로는 안 읽힌다. */
const BREATH_PERIOD = 3.6;
const BREATH_AMOUNT = 0.12;

/** 한 별자리의 지오메트리. id가 바뀌면 이전 것은 확실히 dispose한다. */
function useOneGeometry(
  id: string | null,
  list: Constellation[],
  catalog: StarCatalog,
): THREE.BufferGeometry | null {
  const geo = useMemo(() => {
    if (!id) return null;
    const c = list.find((x) => x.id === id);
    return c ? buildGeometry([c], catalog) : null;
  }, [id, list, catalog]);
  useLayoutEffect(() => () => geo?.dispose(), [geo]);
  return geo;
}

/**
 * 조준 중인 별자리를 은은하게 밝힌다.
 *
 * ⚠️ 슬롯을 둘 두고 번갈아 쓴다. 하나로 하면 조준이 옮겨가는 순간 지오메트리가
 *    통째로 바뀌면서 이전 별자리가 '툭' 꺼지고 새 것이 '툭' 켜진다. 두 슬롯이면
 *    이전 것은 제자리에서 잦아들고 새 것이 겹쳐 올라와, 하늘을 훑을 때
 *    빛이 옮겨가는 것처럼 보인다.
 *
 * ⚠️ 불투명도는 useFrame에서 머티리얼에 직접 쓴다. Motion이나 state로 하면
 *    초당 60회 리렌더가 3D 트리 전체를 재조정한다 (AGENTS.md 성능 규약).
 */
function AimGlow({
  constellations,
  catalog,
  aimedId,
  tint,
}: {
  constellations: Constellation[];
  catalog: StarCatalog;
  aimedId: string | null;
  tint: string;
}) {
  const [slots, setSlots] = useState<{ ids: [string | null, string | null]; live: 0 | 1 }>({
    ids: [null, null],
    live: 0,
  });

  useEffect(() => {
    setSlots((s) => {
      if (s.ids[s.live] === aimedId) return s;
      const live = (1 - s.live) as 0 | 1;
      const ids: [string | null, string | null] = [s.ids[0], s.ids[1]];
      ids[live] = aimedId;
      return { ids, live };
    });
  }, [aimedId]);

  const geoA = useOneGeometry(slots.ids[0], constellations, catalog);
  const geoB = useOneGeometry(slots.ids[1], constellations, catalog);
  const clock = useRef(0);

  /**
   * ⚠️ 머티리얼을 JSX로 만들면 크로스페이드가 동작하지 않는다.
   *    r3f는 리렌더마다 JSX에 적힌 prop을 되돌리는데, 이 컴포넌트는 조준이
   *    바뀔 때마다(=페이드가 시작될 때마다) 리렌더된다. 그러면 물러나야 할
   *    슬롯의 opacity가 그 순간 0으로 튕겨서, 없애려던 '툭 꺼짐'이 그대로 난다.
   *    직접 만들어 넘기면 r3f가 손대지 않는다.
   */
  const mats = useMemo(
    () =>
      [0, 1].map(
        () =>
          new THREE.LineBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false,
            depthTest: false,
          }),
      ),
    [],
  );

  useLayoutEffect(() => {
    for (const m of mats) m.color.set(tint);
  }, [mats, tint]);

  useLayoutEffect(() => {
    const list = mats;
    return () => {
      for (const m of list) m.dispose();
    };
  }, [mats]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    clock.current += dt;
    const breath = 1 + BREATH_AMOUNT * Math.sin((clock.current * Math.PI * 2) / BREATH_PERIOD);
    const k = 1 - Math.exp(-dt / AIM_TAU);
    for (let i = 0; i < 2; i++) {
      const m = mats[i];
      const lit = i === slots.live && slots.ids[i] !== null;
      const target = lit ? AIM_OPACITY * breath : 0;
      m.opacity += (target - m.opacity) * k;
      m.visible = m.opacity > 0.004;
    }
  });

  return (
    <>
      {[geoA, geoB].map((g, i) =>
        g ? (
          <lineSegments
            key={i}
            geometry={g}
            material={mats[i]}
            frustumCulled={false}
            renderOrder={2.5}
          />
        ) : null,
      )}
    </>
  );
}

export default function ConstellationLines({
  constellations,
  catalog,
  activeId,
  aimedId,
  tint,
}: Props) {
  const baseGeo = useMemo(
    () => buildGeometry(constellations, catalog),
    [constellations, catalog],
  );
  const activeGeo = useMemo(() => {
    if (!activeId) return null;
    const c = constellations.find((x) => x.id === activeId);
    return c ? buildGeometry([c], catalog) : null;
  }, [constellations, catalog, activeId]);

  useLayoutEffect(() => () => baseGeo.dispose(), [baseGeo]);
  useLayoutEffect(() => () => activeGeo?.dispose(), [activeGeo]);

  // 이미 선택돼 0.85로 그려지는 별자리에 글로우를 겹치면 더 밝아질 뿐
  // '조준 중'이라는 뜻은 사라진다.
  const aim = aimedId && aimedId !== activeId ? aimedId : null;

  return (
    <>
      {/* --line-constellation */}
      <lineSegments geometry={baseGeo} frustumCulled={false} renderOrder={2}>
        <lineBasicMaterial
          color={tint}
          transparent
          opacity={0.28}
          depthWrite={false}
          depthTest={false}
        />
      </lineSegments>

      <AimGlow constellations={constellations} catalog={catalog} aimedId={aim} tint={tint} />

      {/* --line-constellation-active */}
      {activeGeo && (
        <lineSegments geometry={activeGeo} frustumCulled={false} renderOrder={3}>
          <lineBasicMaterial
            color={tint}
            transparent
            opacity={0.85}
            depthWrite={false}
            depthTest={false}
          />
        </lineSegments>
      )}
    </>
  );
}
