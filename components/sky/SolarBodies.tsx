"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { radecToVec3, SKY_RADIUS } from "@/lib/sky";
import { computeSolarBodies, type SolarBody } from "@/lib/solarBodies";

interface Props {
  timeRef: React.RefObject<number>;
  lat: number;
  lon: number;
}

/** 원형 스프라이트 텍스처를 코드로 만든다 (외부 에셋 없음). */
function discTexture(soft: boolean): THREE.Texture {
  const S = 64;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  if (soft) {
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.85)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
  } else {
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.82, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

/**
 * 해·달·행성. 별과 같은 EQJ 그룹 안에 놓이므로 하늘 변환을 그대로 공유한다.
 * 달은 0.5°/시간으로 움직이므로 1Hz 재계산이면 충분하다.
 */
export default function SolarBodies({ timeRef, lat, lon }: Props) {
  const [bodies, setBodies] = useState<SolarBody[]>([]);
  const acc = useRef(0);
  const lastKey = useRef("");

  const softTex = useMemo(() => discTexture(true), []);
  const hardTex = useMemo(() => discTexture(false), []);

  useFrame((_, delta) => {
    acc.current += delta;
    const key = `${lat.toFixed(3)},${lon.toFixed(3)}`;
    if (acc.current < 1 && key === lastKey.current) return;
    acc.current = 0;
    lastKey.current = key;
    const next = computeSolarBodies(new Date(timeRef.current || Date.now()), lat, lon);
    setBodies(next);
  });

  return (
    <group renderOrder={4}>
      {bodies.map((b) => {
        const pos = radecToVec3(b.ra, b.dec);
        // 각지름이 있는 천체(해·달)는 실제 크기로, 행성은 등급 기반 점으로.
        const isDisc = b.angularDiameter > 0.01;
        const size = isDisc
          ? 2 * SKY_RADIUS * Math.tan((b.angularDiameter * Math.PI) / 360)
          : THREE.MathUtils.clamp(1.6 - b.mag * 0.28, 0.5, 2.6);
        return (
          <sprite
            key={b.id}
            position={pos}
            scale={[size, size, 1]}
            renderOrder={4}
          >
            <spriteMaterial
              map={isDisc ? hardTex : softTex}
              color={b.color}
              transparent
              depthWrite={false}
              depthTest={false}
              // 행성은 별처럼 반짝여야 하므로 가산합성, 원반은 일반합성
              blending={isDisc ? THREE.NormalBlending : THREE.AdditiveBlending}
            />
          </sprite>
        );
      })}
    </group>
  );
}
