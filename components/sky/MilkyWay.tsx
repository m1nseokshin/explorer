"use client";

import { useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SKY_RADIUS } from "@/lib/sky";
import type { MilkyWay as MilkyWayData } from "@/lib/stars";

interface Props {
  data: MilkyWayData;
  /** 0..1. 사용자가 조절한다 — 도시에서는 실제로도 거의 안 보인다. */
  opacity: number;
  tint: THREE.Color;
}

/**
 * 은하 중심(궁수자리 Sgr A*)의 EQJ 단위벡터.
 * RA 266.41683° / Dec −29.00781°. 은하수에서 가장 밝고 노란 곳이다.
 */
const GALACTIC_CORE: [number, number, number] = [-0.054657, -0.872844, -0.484929];

/**
 * 은하수.
 *
 * 채워진 면이 아니라 4만 8천 개의 흐린 점으로 그린다. 물리적으로 은하수는
 * 분해되지 않은 별들의 집합이고, 실제 밤하늘에서도 매끈한 띠가 아니라 알갱이가
 * 뭉쳐 보이는 얼룩이다. 면으로 칠하면 안개처럼 보여 '하늘'이 아니라 '그래픽'이 된다.
 *
 * 여기서는 가산합성이 맞다. 별과 달리 은하수는 겹칠수록 밝아지는 게 실제 현상이고,
 * 캔버스가 검정이라 (카메라 영상 위가 아니라) 뿌옇게 뚫릴 배경도 없다.
 */
function hash31(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** 3D 값 잡음. 격자 8꼭짓점을 smoothstep으로 섞는다. */
function vnoise(x: number, y: number, z: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const iz = Math.floor(z);
  const sm = (t: number) => t * t * (3 - 2 * t);
  const fx = sm(x - ix);
  const fy = sm(y - iy);
  const fz = sm(z - iz);
  const L = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (dx: number, dy: number, dz: number) => hash31(ix + dx, iy + dy, iz + dz);
  return L(
    L(L(c(0, 0, 0), c(1, 0, 0), fx), L(c(0, 1, 0), c(1, 1, 0), fx), fy),
    L(L(c(0, 0, 1), c(1, 0, 1), fx), L(c(0, 1, 1), c(1, 1, 1), fx), fy),
    fz,
  );
}

function fbm(x: number, y: number, z: number): number {
  return (
    vnoise(x, y, z) * 0.55 +
    vnoise(x * 2.3, y * 2.3, z * 2.3) * 0.27 +
    vnoise(x * 5.1, y * 5.1, z * 5.1) * 0.18
  );
}

const smoothstep = (a: number, b: number, t: number) => {
  const u = Math.min(Math.max((t - a) / (b - a), 0), 1);
  return u * u * (3 - 2 * u);
};

export default function MilkyWay({ data, opacity, tint }: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    // 별보다 살짝 바깥에 둔다. 렌더 순서로도 뒤에 가지만, 깊이 테스트를 꺼둔
    // 상태라 반지름 차이가 의도를 문서화하는 역할을 한다.
    const r = SKY_RADIUS * 1.02;
    const pos = new Float32Array(data.count * 3);
    for (let i = 0; i < data.count * 3; i++) pos[i] = data.positions[i] * r;
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));

    // ⚠️ 먼지 얼룩과 중심 거리는 점마다 '고정'된 값이다. 셰이더에서 풀면
    //    48,018개 × 3옥타브 × sin 8회를 매 프레임 다시 계산하게 된다 —
    //    결과는 매번 똑같은데. 마운트 때 한 번 구워서 속성으로 올린다.
    const inten = new Float32Array(data.count);
    const core = new Float32Array(data.count);
    const [cx, cy, cz] = GALACTIC_CORE;
    for (let i = 0; i < data.count; i++) {
      const x = data.positions[i * 3];
      const y = data.positions[i * 3 + 1];
      const z = data.positions[i * 3 + 2];

      // 성간 먼지. 매끈한 띠로 두면 '안개'로만 보이므로 결을 준다.
      // ⚠️ 대비를 키우면 즉시 덩어리진다. 원본 등고선에 이미 진짜 암흑
      //    성운(폴리곤 구멍)이 들어 있고, 이건 그 위에 얹는 잔결일 뿐이다.
      //    거친 옥타브 하나만 쓰면 8°짜리 얼룩이 생겨 구름처럼 보인다.
      const dust =
        smoothstep(0.34, 0.70, fbm(x * 7, y * 7, z * 7)) * 0.6 +
        smoothstep(0.34, 0.70, fbm(x * 19, y * 19, z * 19)) * 0.4;

      // 궁수자리 방향이 밝다. 다만 밝기를 여기서 크게 밀어 올리면 안 된다 —
      // 중심부는 '점 밀도'가 이미 3배(은하 경도 0°에서 482, 반대편 150)라
      // 알파까지 올리면 곱해져서 흰 덩어리로 포화된다.
      const c = Math.pow(Math.max(0, x * cx + y * cy + z * cz), 6);
      core[i] = c;
      inten[i] = data.intensity[i] * (0.55 + 0.5 * dust) * (1 + c * 0.45);
    }
    g.setAttribute("aInten", new THREE.BufferAttribute(inten, 1));
    g.setAttribute("aCore", new THREE.BufferAttribute(core, 1));
    return g;
  }, [data]);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uPixelRatio: { value: 1 },
      uOpacity: { value: opacity },
      uTint: { value: tint.clone() },
    }),
    [opacity, tint],
  );

  // 은하수 유니폼은 프레임마다 바뀌지 않는다. useFrame에 두면 4만 8천 개짜리
  // 머티리얼을 매 프레임 건드리게 되고, 얻는 게 없다.
  useLayoutEffect(() => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uPixelRatio.value = gl.getPixelRatio();
    m.uniforms.uOpacity.value = opacity;
    (m.uniforms.uTint.value as THREE.Color).copy(tint);
  }, [gl, opacity, tint]);

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={-1}>
      <shaderMaterial
        ref={matRef}
        vertexShader={/* glsl */ `
          attribute float aInten;
          attribute float aCore;
          uniform float uPixelRatio;
          uniform float uOpacity;
          varying float vAlpha;
          varying float vCore;

          void main() {
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            vCore = aCore;
            // 밝은 부분일수록 점이 살짝 크고 진하다. 크기 차이가 없으면
            // 밝기 단계가 알파로만 표현돼 밋밋한 회색 띠가 된다.
            // 다만 점이 개별로 읽히면 '별 무리'가 아니라 '노이즈'가 된다 —
            // 크기는 작게, 알파는 낮게 두고 겹침으로 밝기를 만든다.
            gl_PointSize = (1.0 + aInten * 0.75) * uPixelRatio;
            // ⚠️ 가산합성이라 점 하나의 알파가 커지면 겹치는 곳이 바로 흰색으로
            //    포화된다. 밝기는 알파가 아니라 '겹침'이 만들게 두고, 점 하나는
            //    최대 0.35 언저리로 묶는다.
            vAlpha = pow(aInten, 1.7) * uOpacity * 0.40;
          }
        `}
        fragmentShader={/* glsl */ `
          precision mediump float;
          uniform vec3 uTint;
          varying float vAlpha;
          varying float vCore;

          void main() {
            float d = length(gl_PointCoord - 0.5);
            // 가장자리가 딱 끊기면 알갱이가 '점'으로 보인다. 부드럽게 흩어야
            // 겹쳤을 때 뭉근한 얼룩이 된다.
            float a = smoothstep(0.5, 0.0, d) * vAlpha;
            if (a < 0.003) discard;
            // 바깥 팔은 푸르고(젊고 뜨거운 별) 중심은 노랗다(늙은 별 + 먼지 적화).
            vec3 c = mix(vec3(0.84, 0.87, 1.0), vec3(1.0, 0.92, 0.76), vCore);
            gl_FragColor = vec4(uTint * c, a);
          }
        `}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
