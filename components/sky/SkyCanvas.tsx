"use client";

import { Canvas } from "@react-three/fiber";
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Constellation } from "@/lib/constellations";
import { skyMatrix } from "@/lib/sky";
import type { MilkyWay as MilkyWayData, StarCatalog } from "@/lib/stars";
import ConstellationLines from "./ConstellationLines";
import MilkyWayLayer from "./MilkyWay";
import { BoundaryLines, EclipticRing, HorizonRing, SeaSurface } from "./HorizonGrid";
import SeaGlitter from "./SeaGlitter";
import SeaIsland from "./SeaIsland";
import SeaLife from "./SeaLife";
import SkyRig from "./SkyRig";
import SolarBodies from "./SolarBodies";
import StarField from "./StarField";

export interface SkyLayers {
  milkyway: boolean;
  lines: boolean;
  labels: boolean;
  boundaries: boolean;
  horizon: boolean;
  ecliptic: boolean;
  meridian: boolean;
  bodies: boolean;
}

interface Props {
  catalog: StarCatalog;
  constellations: Constellation[];
  boundaries: Float32Array | null;
  milkyway: MilkyWayData | null;
  lat: number;
  lon: number;
  timeRef: React.RefObject<number>;
  quatRef: React.RefObject<THREE.Quaternion>;
  fovRef: React.RefObject<number>;
  followTauRef: React.RefObject<number>;
  /** 하늘 회전 행렬. 피킹이 역행렬을 써야 해서 밖으로 노출한다. */
  skyMatRef: React.RefObject<THREE.Matrix4>;
  cameraRef: React.RefObject<THREE.Camera | null>;
  /** 최초 1회만 쓰이는 초기 화각(도). 이후엔 SkyRig가 매 프레임 fovRef로 갱신한다. */
  initialFov: number;
  transparent: boolean;
  saturation: number;
  nightMode: boolean;
  layers: SkyLayers;
  activeConstellation: string | null;
  /** 조준선이 들어와 있는 별자리(자동). 선택과는 다른 층이다. */
  aimedConstellation: string | null;
  /** 선택된 별의 카탈로그 인덱스. 크기·밝기를 올려 표시한다. */
  selectedStar: number | null;
  onOrient?: (q: THREE.Quaternion, fov: number) => void;
}

/**
 * 하늘 그룹의 자세를 갱신한다.
 *
 * 하늘은 15″/초로 돈다. FOV 65°·390pt 화면에서 초당 0.04px이므로 4Hz 갱신이면
 * 시각적으로 구분 불가능하다. 시간여행(배속) 중에만 매 프레임 갱신한다.
 */
function SkyGroupUpdater({
  groupRef,
  skyMatRef,
  timeRef,
  lat,
  lon,
  fast,
}: {
  groupRef: React.RefObject<THREE.Group | null>;
  skyMatRef: React.RefObject<THREE.Matrix4>;
  timeRef: React.RefObject<number>;
  lat: number;
  lon: number;
  fast: boolean;
}) {
  const target = useRef(new THREE.Quaternion());
  const acc = useRef(999);

  const sample = useCallback(() => {
    // timeRef가 아직 0이면(프로바이더 초기화 직전) 실제 현재 시각으로 대체한다
    const m = skyMatrix(new Date(timeRef.current || Date.now()), lat, lon);
    // ⚠️ group.matrix를 직접 쓰지 않는다. matrixAutoUpdate=false + 수동 행렬은
    //    r3f 리컨실러가 리렌더마다 되돌려 놓을 수 있다. 하늘 변환은 순수 회전이므로
    //    쿼터니언으로 주면 선언적으로 안전하다.
    target.current.setFromRotationMatrix(m);
  }, [timeRef, lat, lon]);

  // 프레임 루프에 의존하지 않고 즉시 한 번 적용한다. 탭이 백그라운드거나 저전력
  // 모드라 rAF가 스로틀링되면 첫 프레임이 항등 변환으로 그려지는데, 그러면
  // '북쪽을 봤는데 남극 별자리가 보이는' 화면이 잠깐이라도 노출된다.
  useLayoutEffect(() => {
    sample();
    const g = groupRef.current;
    if (g) g.quaternion.copy(target.current);
    skyMatRef.current.makeRotationFromQuaternion(target.current);
  }, [sample, groupRef, skyMatRef]);

  useFrameSafe((delta) => {
    // Rotation_EQJ_HOR은 세차·장동을 매번 다시 푸는 무거운 계산이다. 매 프레임
    // 부르면 시간여행 배속에서 p95가 20ms를 넘긴다. 정확한 값은 드물게 뽑고
    // 사이는 보간한다 — 손 인식(30Hz)을 60Hz로 이어 붙인 것과 같은 수법이다.
    //
    // 실시간에서는 하늘이 15″/초로 돌므로 4Hz면 시각적으로 구분 불가능하고,
    // 배속에서도 15Hz 샘플 + 보간이면 계단이 보이지 않는다.
    acc.current += delta;
    if (acc.current >= (fast ? 1 / 15 : 0.25)) {
      acc.current = 0;
      sample();
    }

    const g = groupRef.current;
    if (!g) return;
    const k = 1 - Math.exp(-Math.min(delta, 0.1) / 0.08);
    g.quaternion.slerp(target.current, k);

    // 피킹은 '화면에 그려진' 자세를 기준으로 해야 탭한 별이 실제로 잡힌다.
    // 목표값(target)을 쓰면 배속 중에 조준과 선택이 어긋난다.
    skyMatRef.current.makeRotationFromQuaternion(g.quaternion);
  });

  return null;
}

// useFrame을 조건부로 못 쓰므로 얇은 래퍼
import { useFrame } from "@react-three/fiber";
function useFrameSafe(fn: (delta: number) => void) {
  useFrame((_, delta) => fn(delta));
}

function SkyCanvas({
  catalog,
  constellations,
  boundaries,
  milkyway,
  lat,
  lon,
  timeRef,
  quatRef,
  fovRef,
  followTauRef,
  skyMatRef,
  cameraRef,
  initialFov,
  transparent,
  saturation,
  nightMode,
  layers,
  activeConstellation,
  aimedConstellation,
  selectedStar,
  onOrient,
}: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const [fast, setFast] = useState(false);

  // 야간 시야: WebGL 레이어는 CSS 필터를 쓸 수 없으므로 색을 직접 리맵한다.
  // 별은 셰이더 uTint로, 선은 머티리얼 color로 — 둘 다 같은 값을 써야
  // 하늘 전체가 한 덩어리로 붉어진다.
  const tintHex = nightMode ? "#ff6a52" : "#ffffff";
  const tint = useMemo(() => new THREE.Color(tintHex), [tintHex]);

  /**
   * 별자리선을 이루는 별의 표시.
   * segments는 좌표가 아니라 '카탈로그 인덱스' 쌍이라 그대로 표에 찍으면 된다.
   */
  const memberFlags = useMemo(() => {
    const f = new Uint8Array(catalog.count);
    for (const c of constellations) for (const i of c.segments) f[i] = 1;
    return f;
  }, [catalog.count, constellations]);

  // r3f는 컨테이너 크기가 0이 아니어야 렌더러를 만든다(Canvas.tsx의
  // containerRect.width > 0 게이트). 그런데 이 캔버스는 크기가 바뀌지 않는
  // fixed 전체화면 컨테이너 안에서 '이미 최종 크기인 채로' 마운트되기 때문에,
  // 환경에 따라 초기 ResizeObserver 콜백이 오지 않아 게이트가 영영 열리지 않고
  // 캔버스가 300×150인 채 빈 화면으로 남는다.
  // 마운트 직후 두 프레임에 걸쳐 측정을 한 번 깨워 준다.
  useEffect(() => {
    const nudge = () => window.dispatchEvent(new Event("resize"));
    const raf = requestAnimationFrame(nudge);
    const timers = [0, 60, 250].map((d) => window.setTimeout(nudge, d));
    return () => {
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
    };
  }, []);

  // 시간 배속이 바뀌면 행렬 갱신 주기를 올린다
  useEffect(() => {
    const id = setInterval(() => {
      const drift = Math.abs(timeRef.current - Date.now());
      setFast(drift > 5000);
    }, 500);
    return () => clearInterval(id);
  }, [timeRef]);

  return (
    <Canvas
      className="absolute inset-0"
      // 상한 1.75. 고밀도 화면에서 2.0은 픽셀 수를 4배로 만드는데, 별·은하수는
      // 점광원이라 1.75와 육안 차이가 거의 없고 프레임 여유는 크게 벌어진다.
      dpr={[1, 1.75]}
      gl={{ alpha: transparent, antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: initialFov, near: 0.1, far: 1000, position: [0, 0, 0] }}
      // 전체화면 고정 캔버스에 스크롤 추적은 불필요하다. debounce 0으로 두면
      // 아래 nudge가 즉시 반영된다.
      resize={{ scroll: false, debounce: 0 }}
      onCreated={({ gl, scene, camera }) => {
        cameraRef.current = camera;
        if (transparent) {
          scene.background = null;
          gl.setClearAlpha(0);
        } else {
          scene.background = new THREE.Color("#000000");
        }
      }}
    >
      <SkyRig
        targetQuat={quatRef}
        fovRef={fovRef}
        followTauRef={followTauRef}
        onOrient={onOrient}
      />
      <SkyGroupUpdater
        groupRef={groupRef}
        skyMatRef={skyMatRef}
        timeRef={timeRef}
        lat={lat}
        lon={lon}
        fast={fast}
      />

      {/* 관측자 고정: 지평선·자오선 (하늘 그룹 '밖') */}
      {layers.horizon && <HorizonRing showMeridian={layers.meridian} tint={tintHex} />}

      {/* 바다. 하늘 그룹 밖(관측자 고정)이며, 덧칠로 가리므로 하늘 요소를
          전부 선언한 뒤에 놓을 필요는 없다 — renderOrder가 순서를 정한다. */}
      {layers.horizon && <SeaLife tint={tint} />}
      {/* 섬 둘. 크기와 거리가 다르면 그 사이에 '거리'가 생겨서 수평선이
          평평한 벽이 아니라 열린 바다로 읽힌다. */}
      {layers.horizon && <SeaIsland tint={tintHex} azDeg={118} halfWidthDeg={7.5} peakDeg={2.6} />}
      {layers.horizon && (
        <SeaIsland tint={tintHex} azDeg={133} halfWidthDeg={3.6} peakDeg={1.3} />
      )}
      {layers.horizon && (
        <SeaSurface
          tint={tintHex}
          timeRef={timeRef}
          lat={lat}
          lon={lon}
          skyMatRef={skyMatRef}
        />
      )}

      {/* 천구 고정: 별·별자리·황도 (하늘 그룹 '안') */}
      <group ref={groupRef}>
        {/* 은하수가 가장 먼저(renderOrder -1). 별과 선이 그 위에 얹혀야 한다. */}
        {layers.milkyway && milkyway && (
          <MilkyWayLayer data={milkyway} opacity={0.42} tint={tint} />
        )}
        {layers.ecliptic && <EclipticRing tint={tintHex} />}
        {layers.boundaries && boundaries && <BoundaryLines data={boundaries} tint={tintHex} />}
        <StarField
          catalog={catalog}
          saturation={saturation}
          tint={tint}
          memberFlags={memberFlags}
          selectedIndex={selectedStar}
        />
        {layers.lines && (
          <ConstellationLines
            constellations={constellations}
            catalog={catalog}
            activeId={activeConstellation}
            aimedId={aimedConstellation}
            tint={tintHex}
          />
        )}
        {layers.bodies && (
          <SolarBodies timeRef={timeRef} lat={lat} lon={lon} />
        )}
        {/* 윤슬 — 하늘 그룹 '안'이어야 거울상이 하늘과 함께 돈다 */}
        {layers.horizon && <SeaGlitter catalog={catalog} tint={tint} />}
      </group>

    </Canvas>
  );
}

/**
 * ⚠️ memo가 없으면 부모(SkyExperience)의 10Hz 리드아웃 갱신마다 3D 트리 전체가
 *    React 재조정을 거친다. 지오메트리는 useMemo로 재사용되지만 재조정 자체가
 *    초당 20회씩 도는 건 공짜가 아니며, 그게 곧 프레임 끊김으로 나타난다.
 *    여기 들어오는 prop은 전부 ref이거나 실제로 바뀔 때만 바뀌는 값들이다.
 */
export default memo(SkyCanvas);
