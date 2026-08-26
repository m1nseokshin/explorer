"use client";

import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { altAzToWorld, radecToVec3, SKY_RADIUS } from "@/lib/sky";
import { computeSolarBodies } from "@/lib/solarBodies";

/**
 * 지평선·황도·자오선.
 *
 * 지평선과 자오선은 '월드 고정'(관측자 기준)이라 하늘 그룹 밖에 놓인다.
 * 황도는 천구 고정이라 하늘 그룹 안에 들어간다 — 이 구분을 틀리면
 * 지평선이 하늘과 함께 돌아버린다.
 */

/**
 * lineDashedMaterial은 lineDistance 속성 없이는 아무것도 그리지 않는다.
 * LineSegments는 선분마다 거리가 0에서 다시 시작한다 (Line과 다른 지점).
 */
function withLineDistances(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const pos = g.getAttribute("position");
  const d = new Float32Array(pos.count);
  for (let i = 0; i + 1 < pos.count; i += 2) {
    d[i] = 0;
    d[i + 1] = Math.hypot(
      pos.getX(i + 1) - pos.getX(i),
      pos.getY(i + 1) - pos.getY(i),
      pos.getZ(i + 1) - pos.getZ(i),
    );
  }
  g.setAttribute("lineDistance", new THREE.BufferAttribute(d, 1));
  return g;
}

function ringGeometry(build: (t: number) => THREE.Vector3, steps = 256) {
  const pts: number[] = [];
  for (let i = 0; i < steps; i++) {
    const a = build(i / steps);
    const b = build((i + 1) / steps);
    pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  return g;
}

/**
 * 지평선 위 몇 도부터 덮기 시작하는가. 대기 질량이 급격히 늘어 별이 눈에 띄게
 * 죽는 구간과 대략 맞다.
 */
const EXTINCTION_DEG = 9;

const GROUND_VERT = /* glsl */ `
varying float vS;
varying vec3 vDir;
void main() {
  // 돔은 회전하지 않으므로 오브젝트 y가 곧 월드 y이고, 월드 y가 sin(고도)다.
  vDir = normalize(position);
  vS = vDir.y;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const GROUND_FRAG = /* glsl */ `
// pow(x, 200)을 쓰므로 mediump로는 달빛 길이 계단처럼 끊긴다.
precision highp float;

uniform vec3  uHaze;
uniform float uTop;
uniform float uTime;
uniform vec3  uMoonDir;   // 월드 단위벡터
uniform float uMoonLit;   // 0..1. 달이 없거나 수평선 아래면 0

varying float vS;
varying vec3  vDir;

/** 낮게 깔린 광해. 수평선에서 가장 밝고 위로 갈수록 잦아든다. */
float skyGlow(float s) {
  return exp(-max(s, 0.0) / 0.16);
}

/**
 * 슐릭 근사. s = sin(고도) = 수면 법선과 이루는 각의 코사인.
 * 정면(s=1)에서 2%, 스치는 각도(s=0)에서 100%.
 */
float fresnel(float s) {
  float t = 1.0 - clamp(s, 0.0, 1.0);
  float t2 = t * t;
  return 0.02 + 0.98 * t2 * t2 * t;
}

void main() {
  // 수평선 아래(vS<0)는 smoothstep이 0이라 alpha=1 — 완전히 가린다.
  // 위쪽은 지수 2.2로 감광이 마지막 3~4°에 몰린다. 선형으로 하면 중간 고도의
  // 별까지 흐려져서 '안개 낀 하늘'이 되고, 소광이 아니라 결함으로 보인다.
  float a = pow(1.0 - smoothstep(0.0, uTop, vS), 2.2);
  if (a <= 0.002) discard;

  if (vS >= 0.0) {
    // 수평선 위 — 낮게 깔린 광해. 알파가 함께 옅어져 높은 하늘을 덮지 않는다.
    gl_FragColor = vec4(uHaze * skyGlow(vS), a);
    return;
  }

  float depth = -vS;
  float az = atan(vDir.z, vDir.x);

  // ── 물결 ────────────────────────────────────────────────────────────
  // 1/깊이로 주파수를 올려 원근 압축을 흉내낸다. 방위각 성분을 섞지 않으면
  // 완벽한 동심원이 돼 '연못'으로 보인다.
  // ⚠️ 수평선 바로 앞은 한 파장이 1픽셀보다 작아진다. 진폭을 0으로 눕히지
  //    않으면 그 띠가 통째로 알리아싱으로 지글거린다 — 실제로도 멀리 있는
  //    물은 매끈해 보이므로 물리적으로도 이쪽이 맞다.
  float persp = 1.0 / (depth + 0.055);
  // 옥타브마다 눕는 지점이 다르다. 성긴 너울은 수평선 가까이까지 살아남고
  // 잔물결은 금방 사라진다 — 한꺼번에 눕히면 수평선 띠가 통째로 매끈해져
  // 물이 아니라 안개 막대로 보인다.
  // 물결이 살아남는 깊이. 짧게 자르면 수평선 띠에만 결이 생기고 그 아래는
  // 통째로 매끈해져서 '물'이 아니라 '유리'로 보인다.
  float far = 1.0 - smoothstep(0.45, 0.95, depth);
  float wave =
      sin(persp * 1.4 - uTime * 0.62 + az *  5.0) * 0.52 * smoothstep(0.0, 0.012, depth)
    + sin(persp * 3.1 + uTime * 0.41 + az * 13.0) * 0.31 * smoothstep(0.0, 0.032, depth)
    + sin(persp * 7.3 - uTime * 1.10 + az * 27.0) * 0.17 * smoothstep(0.0, 0.070, depth);
  wave *= far;
  float amp = far;

  // 물결이 면을 기울이면 반사되는 하늘의 '높이'가 달라진다. 밝기를 곱해서
  // 흔드는 게 아니라 반사각 자체를 흔드는 것 — 이게 물의 질감이다.
  // 기울기 진폭. 이 값이 곧 물결의 대비다 — 반사각을 얼마나 흔드는가.
  // 0.095는 '거울처럼 잔잔한' 쪽이었다. 0.17이면 너울이 눈에 띄게 인다.
  float s = clamp(depth + wave * amp * 0.17, 0.0015, 1.0);

  // ⚠️ 잔잔한 물은 스치는 각도에서 거의 완전한 거울이다. 수평선 바로 아래가
  //    하늘만큼 밝아야 물로 읽힌다. 여기서 어둡게 깔면 그냥 검은 땅이 된다.
  vec3 c = uHaze * skyGlow(s) * fresnel(s) * vec3(0.80, 0.89, 1.0);

  // ── 달빛 길 ─────────────────────────────────────────────────────────
  if (uMoonLit > 0.0) {
    // 수면 거울 방향. 이게 달을 향하면 그 픽셀이 달을 비춘다.
    vec3 m = vec3(vDir.x, -vDir.y, vDir.z);
    vec2 mh = vec2(m.x, m.z);
    vec2 dh = vec2(uMoonDir.x, uMoonDir.z);
    float lm = length(mh) * length(dh);
    if (lm > 1e-4) {
      // 방위로는 좁게. 잔잔한 물일수록 길이 가늘다.
      float align = dot(mh, dh) / lm;
      float lane = pow(max(align, 0.0), 200.0);

      // 고도로는 길게, 그리고 비대칭으로. 달빛 길은 거울점에서 '관측자 쪽으로'
      // 늘어난다 — 대칭으로 하면 수평선 너머까지 뻗어 부자연스럽다.
      float dy = m.y - uMoonDir.y;
      float ver = dy > 0.0 ? exp(-dy * 1.6) : exp(dy * 3.2);

      // ⚠️ 물결이 길을 토막낸다. 이게 약하면 즉시 '탐조등 광선'이 된다 —
      //    달빛 길은 연속된 빛기둥이 아니라, 물결 하나하나가 달을 되비친
      //    조각들의 무리다. 그래서 대부분은 어둡고 가끔만 밝아야 한다.
      float g1 = sin(persp *  6.1 - uTime * 1.30 + az *  9.0);
      float g2 = sin(persp * 13.7 + uTime * 0.80 + az * 21.0);
      float chop = smoothstep(-0.30, 0.80, g1 * 0.55 + g2 * 0.45);
      // 수평선 근처는 조각이 눈보다 작아 이어져 보인다 — 거기만 바닥값을 준다.
      chop = mix(0.55, chop, far);

      c += vec3(0.95, 0.94, 0.88) * lane * ver * fresnel(s) * uMoonLit * chop * 0.46;
    }
  }

  gl_FragColor = vec4(c, a);
}`;

export function SeaSurface({
  tint,
  timeRef,
  lat,
  lon,
  skyMatRef,
}: {
  tint: string;
  timeRef: React.RefObject<number>;
  lat: number;
  lon: number;
  /** 하늘 회전. 달의 EQJ 좌표를 월드로 옮기는 데 쓴다. */
  skyMatRef: React.RefObject<THREE.Matrix4>;
}) {
  const geo = useMemo(() => {
    const cap = (EXTINCTION_DEG * Math.PI) / 180;
    // theta는 +Y(천정)에서 잰다. 지평선보다 cap만큼 위에서 시작해 천저까지.
    return new THREE.SphereGeometry(
      SKY_RADIUS * 0.9,
      64,
      32,
      0,
      Math.PI * 2,
      Math.PI / 2 - cap,
      Math.PI / 2 + cap,
    );
  }, []);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GROUND_VERT,
        fragmentShader: GROUND_FRAG,
        uniforms: {
          uHaze: { value: new THREE.Color() },
          uTop: { value: Math.sin((EXTINCTION_DEG * Math.PI) / 180) },
          uTime: { value: 0 },
          uMoonDir: { value: new THREE.Vector3(0, -1, 0) },
          uMoonLit: { value: 0 },
        },
        transparent: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.BackSide,
      }),
    [],
  );

  useLayoutEffect(() => {
    // 야간모드에서도 같은 규칙 — 틴트를 그대로 눌러 쓴다.
    (mat.uniforms.uHaze.value as THREE.Color).set(tint).multiplyScalar(0.06);
  }, [mat, tint]);

  // 달의 EQJ 방향과 위상. 달은 0.5°/시간으로 움직이므로 1Hz면 충분하다.
  const moonEqj = useRef(new THREE.Vector3());
  const moonPhase = useRef(0);
  const acc = useRef(99);
  const world = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    mat.uniforms.uTime.value += Math.min(delta, 0.1);

    acc.current += delta;
    if (acc.current >= 1) {
      acc.current = 0;
      // ⚠️ computeSolarBodies를 그대로 쓴다. 여기서 달 좌표를 다시 구현하면
      //    지평시차 보정을 빠뜨리기 딱 좋다 (AGENTS.md 참조).
      const moon = computeSolarBodies(
        new Date(timeRef.current || Date.now()),
        lat,
        lon,
      ).find((b) => b.id === "moon");
      if (moon) {
        radecToVec3(moon.ra, moon.dec, 1, moonEqj.current);
        moonPhase.current = moon.phase ?? 0;
      } else {
        moonPhase.current = 0;
      }
    }

    // 방향은 매 프레임 월드로 옮긴다 — 하늘이 도는 만큼 달빛 길도 따라간다.
    const w = world.current.copy(moonEqj.current).applyMatrix4(skyMatRef.current);
    if (w.lengthSq() > 1e-9) w.normalize();
    (mat.uniforms.uMoonDir.value as THREE.Vector3).copy(w);

    // 수평선 아래 달은 물에 길을 내지 않는다. 그믐달도 거의 못 낸다.
    const up = THREE.MathUtils.smoothstep(w.y, -0.02, 0.10);
    mat.uniforms.uMoonLit.value = moonPhase.current * moonPhase.current * up;
  });

  useLayoutEffect(() => () => geo.dispose(), [geo]);
  useLayoutEffect(() => () => mat.dispose(), [mat]);

  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={5} />;
}

/** 관측자 고정 요소: 지평선 + 자오선 */
export function HorizonRing({ showMeridian, tint }: { showMeridian: boolean; tint: string }) {
  const horizon = useMemo(
    () => ringGeometry((t) => altAzToWorld(t * 360, 0).multiplyScalar(SKY_RADIUS)),
    [],
  );
  const meridian = useMemo(
    () =>
      withLineDistances(
      ringGeometry((t) => {
        // 북(az 0) → 천정 → 남(az 180) → 천저 를 지나는 대원
        const ang = t * 360;
        const alt = ang <= 180 ? ang - 90 : 270 - ang;
        const az = ang <= 180 ? 0 : 180;
        return altAzToWorld(az, alt).multiplyScalar(SKY_RADIUS);
      }, 180),
      ),
    [],
  );

  useLayoutEffect(() => () => horizon.dispose(), [horizon]);
  useLayoutEffect(() => () => meridian.dispose(), [meridian]);

  return (
    <>
      {/* --line-horizon — 지면(5)보다 뒤에 그려야 경계가 덮이지 않는다. */}
      <lineSegments geometry={horizon} frustumCulled={false} renderOrder={6}>
        <lineBasicMaterial
          color={tint}
          transparent
          opacity={0.35}
          depthWrite={false}
          depthTest={false}
        />
      </lineSegments>

      {/* --line-meridian, 점선 2/10.
          renderOrder 0을 유지한다 — 지면이 나중에 덮으므로 지평선 아래
          구간이 저절로 잘린다. 자오선은 지하로 이어질 이유가 없다. */}
      {showMeridian && (
        <lineSegments geometry={meridian} frustumCulled={false} renderOrder={0}>
          <lineDashedMaterial
            color={tint}
            transparent
            opacity={0.12}
            dashSize={2}
            gapSize={10}
            depthWrite={false}
            depthTest={false}
          />
        </lineSegments>
      )}
    </>
  );
}

/** 천구 고정 요소: 황도. 반드시 하늘 그룹 '안'에 놓을 것. */
export function EclipticRing({ tint }: { tint: string }) {
  const geo = useMemo(() => {
    const EPS = 23.4392911 * (Math.PI / 180); // J2000 황도경사
    return withLineDistances(ringGeometry((t) => {
      const lam = t * 2 * Math.PI;
      // 황도좌표(λ, β=0) → 적도좌표
      const ra = Math.atan2(Math.cos(EPS) * Math.sin(lam), Math.cos(lam));
      const dec = Math.asin(Math.sin(EPS) * Math.sin(lam));
      return radecToVec3((ra * 180) / Math.PI, (dec * 180) / Math.PI);
    }));
  }, []);

  useLayoutEffect(() => () => geo.dispose(), [geo]);

  return (
    // --line-ecliptic, 점선 2/6
    <lineSegments geometry={geo} frustumCulled={false} renderOrder={0}>
      <lineDashedMaterial
        color={tint}
        transparent
        opacity={0.18}
        dashSize={2}
        gapSize={6}
        depthWrite={false}
        depthTest={false}
      />
    </lineSegments>
  );
}

/** IAU 별자리 경계. 기본 꺼짐. */
export function BoundaryLines({ data, tint }: { data: Float32Array; tint: string }) {
  const geo = useMemo(() => {
    const pts = new Float32Array(data.length);
    for (let i = 0; i < data.length; i++) pts[i] = data[i] * SKY_RADIUS;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    return withLineDistances(g);
  }, [data]);

  useLayoutEffect(() => () => geo.dispose(), [geo]);

  return (
    // --line-boundary, 파선 6/6
    <lineSegments geometry={geo} frustumCulled={false} renderOrder={0}>
      <lineDashedMaterial
        color={tint}
        transparent
        opacity={0.1}
        dashSize={6}
        gapSize={6}
        depthWrite={false}
        depthTest={false}
      />
    </lineSegments>
  );
}
