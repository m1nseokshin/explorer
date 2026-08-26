"use client";

import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { SKY_RADIUS } from "@/lib/sky";

interface Props {
  tint: string;
  /** 나침반 방위(도, 북=0). */
  azDeg?: number;
  /** 능선 반각(도). 이 각도만큼 좌우로 퍼진다. */
  halfWidthDeg?: number;
  /** 가장 높은 봉우리의 고도(도). */
  peakDeg?: number;
}

const D2R = Math.PI / 180;

/**
 * 수평선 저 멀리의 섬.
 *
 * 눈이 수면 높이에 있으므로 먼 섬은 수평선 '위'로 솟는다. 1°로는 너무 납작해
 * 섬으로 안 읽혀서 2.6°로 올렸다 — 20km 밖의 400m급 산에 해당한다.
 *
 * ⚠️ 지평선 선(renderOrder 6)보다 뒤에 그린다. 앞에 그리면 수평선이 섬을
 *    가로질러서 섬이 반투명한 것처럼 보인다 — 실제로는 섬이 수평선을 가린다.
 */
export default function SeaIsland({
  tint,
  azDeg = 118,
  halfWidthDeg = 7.5,
  peakDeg = 2.6,
}: Props) {
  const geo = useMemo(
    () =>
      // 섬은 수평선 근처에만 있으므로 위아래로 좁은 띠만 있으면 된다.
      new THREE.SphereGeometry(
        SKY_RADIUS * 0.86,
        192,
        24,
        0,
        Math.PI * 2,
        // 섬이 높아졌으니 띠도 그만큼 넓어야 능선 꼭대기가 잘리지 않는다
        Math.PI / 2 - 10 * D2R,
        20 * D2R,
      ),
    [],
  );

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: /* glsl */ `
          varying float vS;
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vS = vDir.y;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          precision highp float;
          uniform vec3  uInk;
          uniform vec3  uRim;
          uniform float uAz;     // 중심 방위 (atan2(z,x) 공간)
          uniform float uHalf;   // 반각(라디안)
          uniform float uPeak;   // sin(정점 고도)
          varying float vS;
          varying vec3  vDir;

          /** 능선. 봉우리 둘을 겹쳐 좌우가 대칭이 아니게 만든다. */
          float ridge(float az) {
            float d = az - uAz;
            d = atan(sin(d), cos(d));            // -π..π 로 감는다
            float t = abs(d) / uHalf;
            if (t >= 1.0) return 0.0;
            // 밑동은 넓고 완만하게, 봉우리는 한쪽으로 치우치게
            float base = pow(cos(t * 1.5707963), 1.35);
            float peak = exp(-pow((d + uHalf * 0.22) / (uHalf * 0.30), 2.0)) * 0.55;
            float low  = exp(-pow((d - uHalf * 0.52) / (uHalf * 0.34), 2.0)) * 0.30;
            return uPeak * base * (1.0 + peak + low);
          }

          void main() {
            float h = ridge(atan(vDir.z, vDir.x));
            if (h <= 0.0) discard;

            if (vS >= 0.0) {
              // 수평선 위 — 섬의 실루엣. 별을 가려야 '덩어리'로 읽힌다.
              float sil = 1.0 - smoothstep(h - 0.0012, h + 0.0012, vS);

              // 능선을 따라 흐르는 가는 빛. 이게 없으면 밝은 수평선 띠에
              // 구멍을 뚫어 놓은 것처럼 뚝 끊겨 보인다. 실제로도 능선 너머의
              // 하늘빛이 가장자리를 스쳐 얇게 걸린다.
              float edge = exp(-pow((vS - h) / 0.0022, 2.0));

              float a = max(sil, edge * 0.95);
              if (a < 0.004) discard;
              gl_FragColor = vec4(uInk + uRim * edge, a);
            } else {
              // 수평선 아래 — 물에 비친 섬. 하늘이 아니라 검은 땅이 비치므로
              // 밝아지는 게 아니라 어두워진다. 반사는 원본보다 짧고 흐리다.
              float d = -vS;
              float hr = h * 0.75;
              float a = (1.0 - smoothstep(hr - 0.0015, hr + 0.0015, d))
                      * (1.0 - smoothstep(0.0, hr, d) * 0.35)
                      * 0.82;
              // 물에 비친 능선도 가장자리가 살짝 빛난다 — 다만 물결에 흩어져
              // 원본보다 훨씬 흐리다.
              float edge = exp(-pow((d - hr) / 0.0030, 2.0)) * 0.45;
              a = max(a, edge);
              if (a < 0.004) discard;
              gl_FragColor = vec4(uInk + uRim * edge, a);
            }
          }
        `,
        uniforms: {
          uInk: { value: new THREE.Color() },
          uRim: { value: new THREE.Color() },
          uAz: { value: 0 },
          uHalf: { value: halfWidthDeg * D2R },
          uPeak: { value: Math.sin(peakDeg * D2R) },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.BackSide,
      }),
    [halfWidthDeg, peakDeg],
  );

  useLayoutEffect(() => {
    // 나침반 방위 → 셰이더의 atan2(z, x) 공간.
    // altAzToWorld가 x=sin(az), z=-cos(az)로 두므로 이 변환이 따라온다.
    const a = azDeg * D2R;
    mat.uniforms.uAz.value = Math.atan2(-Math.cos(a), Math.sin(a));
    mat.uniforms.uHalf.value = halfWidthDeg * D2R;
    mat.uniforms.uPeak.value = Math.sin(peakDeg * D2R);
    // 섬은 하늘보다 확실히 어두워야 한다 — 광해를 되비치지 않는 '땅'이다.
    (mat.uniforms.uInk.value as THREE.Color).set(tint).multiplyScalar(0.012);
    // 수평선 띠(uHaze ≈ 0.06)보다 조금 밝아야 '가장자리'로 읽힌다.
    (mat.uniforms.uRim.value as THREE.Color).set(tint).multiplyScalar(0.16);
  }, [mat, tint, azDeg, halfWidthDeg, peakDeg]);

  useLayoutEffect(() => () => geo.dispose(), [geo]);
  useLayoutEffect(() => () => mat.dispose(), [mat]);

  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={7} />;
}
