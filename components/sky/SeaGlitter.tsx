"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SKY_RADIUS } from "@/lib/sky";
import type { StarCatalog } from "@/lib/stars";

interface Props {
  catalog: StarCatalog;
  tint: THREE.Color;
}

/**
 * 물에 비치는 별의 한계등급.
 * 잔잔한 물은 스치는 각도에서 거의 완전한 거울이라 실제로는 꽤 어두운 별까지
 * 수면에 흔적을 남긴다. 4.2로는 수평선 근처가 너무 비어 보였다.
 */
const REFLECT_MAG = 5.4;

/**
 * 밤바다에 비친 별 — 윤슬.
 *
 * ⚠️ 반드시 하늘 그룹 '안'에 놓을 것. 그래야 modelMatrix가 곧 하늘 회전이고,
 *    셰이더에서 월드 y만 뒤집으면 정확한 거울상이 된다. 밖에 두면 하늘이
 *    돌아도 반사는 가만히 있어서 즉시 가짜로 보인다.
 *
 * 반사율은 눈대중이 아니라 슐릭 근사를 쓴다. 물은 정면에서 2%만 반사하고
 * 스치는 각도에서 100%에 가까워진다 — 그래서 수평선 근처의 낮은 별만 길게
 * 늘어지고 머리 위 별은 수면에 흔적도 남기지 않는다. 이 감쇠를 임의로 정하면
 * 하늘 전체가 물에 다 비쳐서 거울 바닥이 된다.
 */
export default function SeaGlitter({ catalog, tint }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { camera, gl } = useThree();

  const geometry = useMemo(() => {
    const idx: number[] = [];
    for (let i = 0; i < catalog.count; i++) if (catalog.mag[i] <= REFLECT_MAG) idx.push(i);

    const pos = new Float32Array(idx.length * 3);
    const mag = new Float32Array(idx.length);
    const ci = new Float32Array(idx.length);
    idx.forEach((s, k) => {
      pos[k * 3] = catalog.positions[s * 3] * SKY_RADIUS;
      pos[k * 3 + 1] = catalog.positions[s * 3 + 1] * SKY_RADIUS;
      pos[k * 3 + 2] = catalog.positions[s * 3 + 2] * SKY_RADIUS;
      mag[k] = catalog.mag[s];
      ci[k] = catalog.ci[s];
    });

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aMag", new THREE.BufferAttribute(mag, 1));
    g.setAttribute("aCi", new THREE.BufferAttribute(ci, 1));
    return g;
  }, [catalog]);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uPixelRatio: { value: 1 },
      uZoom: { value: 1 },
      uTime: { value: 0 },
      uTint: { value: tint.clone() },
    }),
    [tint],
  );

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uTime.value += Math.min(delta, 0.1);
    const cam = camera as THREE.PerspectiveCamera;
    m.uniforms.uZoom.value = THREE.MathUtils.clamp(65 / (cam.fov || 65), 0.5, 12);
  });

  useLayoutEffect(() => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uPixelRatio.value = gl.getPixelRatio();
    (m.uniforms.uTint.value as THREE.Color).copy(tint);
  }, [gl, tint]);

  return (
    // 바다(5)보다 뒤에 그려야 수면 위에 얹힌다
    <points geometry={geometry} frustumCulled={false} renderOrder={5.5}>
      <shaderMaterial
        ref={matRef}
        vertexShader={/* glsl */ `
          attribute float aMag;
          attribute float aCi;
          uniform float uPixelRatio;
          uniform float uZoom;
          varying float vAlpha;
          varying float vSeed;
          varying vec3  vColor;

          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vec3 d = normalize(wp.xyz);

            // 수평선 아래 별은 비칠 것이 없다. 걸러내지 않으면 지평 아래 별의
            // '반사'가 하늘 쪽에 떠서 유령 별이 된다.
            if (d.y <= 0.0) {
              gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
              gl_PointSize = 0.0;
              return;
            }

            // 거울상: 월드 y만 뒤집는다
            gl_Position = projectionMatrix * viewMatrix * vec4(wp.x, -wp.y, wp.z, 1.0);

            // 슐릭 근사 — 수직 입사 2%, 스치는 각도 100%
            float fresnel = 0.02 + 0.98 * pow(1.0 - d.y, 5.0);

            float b = clamp((5.4 - aMag) / 6.9, 0.0, 1.0);
            gl_PointSize = mix(8.0, 30.0, b) * pow(uZoom, 0.25) * uPixelRatio;
            vAlpha = pow(b, 1.2) * fresnel * 1.35;
            vSeed = fract(sin(dot(position, vec3(12.9898, 78.233, 37.719))) * 43758.5453);

            // 물은 붉은 쪽을 먼저 먹는다. 원래 별색을 남기되 푸른 쪽으로 끌어당긴다.
            float t = clamp((aCi + 0.4) / 2.4, 0.0, 1.0);
            vec3 sc = mix(vec3(0.71, 0.79, 1.0), vec3(1.0, 0.84, 0.62), t);
            vColor = mix(sc, vec3(0.74, 0.85, 1.0), 0.45);
          }
        `}
        fragmentShader={/* glsl */ `
          precision mediump float;
          uniform float uTime;
          uniform vec3  uTint;
          varying float vAlpha;
          varying float vSeed;
          varying vec3  vColor;

          void main() {
            vec2 uv = gl_PointCoord - 0.5;
            // 가로는 좁게, 세로는 길게. 물에 비친 상은 언제나 세로로 늘어난다 —
            // 수면의 기울어진 면들이 세로로만 상을 흩기 때문이다.
            float horiz = exp(-abs(uv.x) * 15.0);
            float vert  = exp(-abs(uv.y) * 1.9);
            // 물결이 상을 토막낸다. 이 끊김이 '반짝임'의 정체다 —
            // 매끈한 막대로 두면 반사가 아니라 형광등처럼 보인다.
            float chop = 0.32 + 0.68 * pow(
              max(0.0, sin(uv.y * 34.0 + uTime * 2.1 + vSeed * 31.0)), 2.0);

            float a = horiz * vert * chop * vAlpha;
            if (a < 0.004) discard;
            gl_FragColor = vec4(vColor * uTint, a);
          }
        `}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        // 물 위의 빛은 더해진다. 별과 달리 배경을 뚫을 걱정이 없다 (캔버스가 검정).
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
