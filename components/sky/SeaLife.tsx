"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { altAzToWorld, SKY_RADIUS } from "@/lib/sky";

interface Props {
  tint: THREE.Color;
}

/** 셸 반지름. 하늘보다 살짝 안쪽에 둔다. */
const R = SKY_RADIUS * 0.88;

/** 동시에 살아 있는 도약의 최대 수. 여러 마리가 겹치면 '가끔'이 아니게 된다. */
const MAX_EVENTS = 2;
/** 도약 하나가 만드는 물방울 수 (나올 때 + 들어갈 때). */
const DROPS = 26;

const NEXT_MIN = 9;
const NEXT_MAX = 26;

/**
 * 돌고래 몸길이(도). 2m짜리가 5.5°면 대략 20m 앞이다.
 * ⚠️ 기준 화각을 넓히면(DEFAULT_H_FOV_DEG) 화면에서 차지하는 픽셀이 그만큼
 *    줄어든다 — 3.4°였을 때 모바일에서 24px밖에 안 돼 형태가 안 읽혔다.
 */
const BODY_DEG = 5.5;
/** 물방울 중력 (도/초²). */
const GRAVITY = 3.2;

interface Drop {
  az: number;
  vAz: number;
  vAlt: number;
  /** 튀기 시작하는 시각(초, 이벤트 나이 기준). */
  start: number;
  size: number;
}

interface Leap {
  /** 이벤트가 시작된 뒤 흐른 시간(초). */
  age: number;
  /** 도약(공중) 구간의 길이(초). */
  dur: number;
  /** 물보라까지 다 끝나는 시각(초). */
  end: number;
  az0: number;
  dAz: number;
  peak: number;
  alt0: number;
  size: number;
  drops: Drop[];
}

/**
 * 돌고래 실루엣을 코드로 그린다 (외부 에셋 없음).
 * 왼쪽으로 헤엄칠 때는 셰이더에서 UV를 뒤집으므로 그림은 하나면 된다.
 */
function dolphinTexture(): THREE.Texture {
  const W = 512;
  const H = 256;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;

  // ⚠️ 모서리를 lineTo로 꺾지 않는다. 등지느러미·꼬리를 직선으로 이으면
  //    각진 종이 오림처럼 보인다. 전부 곡선으로 잇고 끝만 살짝 뾰족하게 둔다.
  const body = new Path2D();
  body.moveTo(482, 132); // 주둥이 끝
  body.bezierCurveTo(430, 92, 380, 74, 322, 74); // 이마 → 등
  body.bezierCurveTo(300, 60, 268, 26, 246, 22); // 등지느러미 앞면
  body.bezierCurveTo(240, 40, 232, 62, 214, 80); // 등지느러미 뒷면
  body.bezierCurveTo(168, 90, 120, 104, 88, 118); // 등 → 꼬리자루
  body.bezierCurveTo(64, 96, 40, 74, 20, 62); // 꼬리 위 갈래
  body.bezierCurveTo(46, 100, 52, 156, 22, 200); // 꼬리 가운데 → 아래 갈래
  body.bezierCurveTo(52, 184, 82, 162, 104, 148); // 꼬리자루 아래
  body.bezierCurveTo(150, 176, 202, 186, 250, 180); // 배
  body.bezierCurveTo(262, 204, 272, 226, 282, 234); // 가슴지느러미 앞
  body.bezierCurveTo(296, 226, 300, 196, 296, 172); // 가슴지느러미 뒤
  body.bezierCurveTo(360, 168, 428, 156, 482, 132); // 배 → 주둥이
  body.closePath();

  // ── 입체감 ────────────────────────────────────────────────────────
  // 밤바다에서 몸이 보이는 건 하늘빛을 되비쳐서다. 빛은 위에서 오므로 등이
  // 가장 밝고 배로 갈수록 어두워진다 — 이 한 방향의 그라데이션이 부피를 만든다.
  const grad = g.createLinearGradient(0, 18, 0, 240);
  grad.addColorStop(0.0, "#ffffff");
  grad.addColorStop(0.22, "#e8f0ff");
  grad.addColorStop(0.52, "#8fa4c4");
  grad.addColorStop(0.78, "#43536e");
  grad.addColorStop(1.0, "#2a3549");
  g.fillStyle = grad;
  g.fill(body);

  // 등을 따라 흐르는 반짝임. 젖은 등이 가장 밝게 빛나는 선이다.
  g.save();
  g.clip(body);
  const spec = g.createLinearGradient(0, 60, 0, 130);
  spec.addColorStop(0, "rgba(255,255,255,0)");
  spec.addColorStop(0.45, "rgba(255,255,255,0.85)");
  spec.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = spec;
  g.fillRect(0, 60, W, 70);

  // 배 쪽 반사광 — 물에서 올라오는 빛이 아래를 살짝 들어 올린다
  const bounce = g.createLinearGradient(0, 200, 0, 244);
  bounce.addColorStop(0, "rgba(140,170,210,0)");
  bounce.addColorStop(1, "rgba(140,170,210,0.5)");
  g.fillStyle = bounce;
  g.fillRect(0, 200, W, 44);
  g.restore();

  // 윤곽선은 아주 얇게. 굵으면 다시 스티커처럼 보인다.
  g.lineWidth = 1.6;
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.stroke(body);

  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

const BODY_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;

const BODY_FRAG = /* glsl */ `
precision mediump float;
uniform sampler2D uMap;
uniform vec3  uTint;
uniform float uFlip;
varying vec2 vUv;
varying vec3 vWorld;

void main() {
  vec2 uv = vec2(uFlip > 0.5 ? 1.0 - vUv.x : vUv.x, vUv.y);
  vec4 tex = texture2D(uMap, uv);
  if (tex.a < 0.02) discard;

  // ⚠️ 수면 아래는 '투명해지는' 게 아니라 '가려지는' 것이다. 몸 전체를
  //    페이드시키면 유령처럼 스르륵 사라져서 즉시 인위적으로 보인다.
  //    눈이 수면 높이에 있으므로 월드 y=0이 곧 수면이고, 그 아래를 잘라내면
  //    물속으로 파고드는 것처럼 보인다.
  float y = normalize(vWorld).y;
  float cut = smoothstep(-0.0016, 0.0016, y);
  if (cut < 0.01) discard;

  // 수면에 닿는 선은 젖어서 살짝 더 밝다
  float rim = exp(-pow(y / 0.0035, 2.0)) * 0.55;

  // 텍스처에 구워 둔 명암을 그대로 쓴다 — 등이 밝고 배가 어두워야 부피가 생긴다.
  gl_FragColor = vec4(uTint * (tex.rgb + rim), tex.a * cut);
}`;

/**
 * 밤바다에서 돌고래가 뛰어오른다.
 *
 * ⚠️ 스프라이트가 아니라 메시다. 스프라이트는 프래그먼트에서 월드 좌표를 알 수
 *    없어 수면으로 잘라낼 수가 없다. 카메라를 향해 세운 판이면 modelMatrix가
 *    그대로 월드 변환이라 y=0으로 자르는 게 정확해진다.
 *
 * ⚠️ 씬 객체를 JSX로 만들지 말 것 — r3f가 리렌더마다 prop을 되돌려서
 *    useFrame이 켜 둔 visible이 곧바로 꺼진다 (AGENTS.md 참조).
 */
export default function SeaLife({ tint }: Props) {
  const { gl, camera } = useThree();
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const events = useRef<Leap[]>([]);
  const nextAt = useRef(-1);

  const tex = useMemo(() => dolphinTexture(), []);

  const bodies = useMemo(
    () =>
      Array.from({ length: MAX_EVENTS }, () => {
        const geo = new THREE.PlaneGeometry(1, 1);
        const mat = new THREE.ShaderMaterial({
          vertexShader: BODY_VERT,
          fragmentShader: BODY_FRAG,
          uniforms: {
            uMap: { value: tex },
            uTint: { value: new THREE.Color(1, 1, 1) },
            uFlip: { value: 0 },
          },
          transparent: true,
          depthTest: false,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const m = new THREE.Mesh(geo, mat);
        m.visible = false;
        m.renderOrder = 8;
        m.frustumCulled = false;
        return m;
      }),
    [tex],
  );

  useLayoutEffect(() => {
    for (const b of bodies) {
      ((b.material as THREE.ShaderMaterial).uniforms.uTint.value as THREE.Color).copy(tint);
    }
  }, [bodies, tint]);

  useLayoutEffect(() => {
    const t = tex;
    const list = bodies;
    return () => {
      t.dispose();
      for (const b of list) {
        b.geometry.dispose();
        (b.material as THREE.ShaderMaterial).dispose();
      }
    };
  }, [tex, bodies]);

  // ── 물보라 (점) ────────────────────────────────────────────────────
  const geometry = useMemo(() => {
    const n = MAX_EVENTS * DROPS;
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(n), 1));
    return g;
  }, []);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({ uPixelRatio: { value: 1 }, uTint: { value: tint.clone() } }),
    [tint],
  );

  useLayoutEffect(() => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uPixelRatio.value = gl.getPixelRatio();
    (m.uniforms.uTint.value as THREE.Color).copy(tint);
  }, [gl, tint]);

  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);

    // ── 새 도약 ──────────────────────────────────────────────────────
    if (nextAt.current < 0) nextAt.current = 4 + Math.random() * 8;
    nextAt.current -= dt;
    if (nextAt.current <= 0 && events.current.length < MAX_EVENTS) {
      nextAt.current = NEXT_MIN + Math.random() * (NEXT_MAX - NEXT_MIN);

      const dur = 1.5 + Math.random() * 0.8;
      const peak = 1.8 + Math.random() * 2.4;
      // 물속에서 충분히 아래에서 출발해야 몸이 서서히 드러난다
      const alt0 = -(2.2 + Math.random() * 1.8);
      const az0 = Math.random() * 360;
      const dAz = (Math.random() < 0.5 ? -1 : 1) * (2.4 + Math.random() * 4.2);

      // 포물선이 수면(고도 0)을 지나는 두 시각. 여기서 물이 튄다.
      const A = peak - alt0;
      const sArm = Math.sqrt(Math.max(0, 1 + alt0 / A));
      const tExit = ((1 - sArm) / 2) * dur;
      const tEntry = ((1 + sArm) / 2) * dur;

      const drops: Drop[] = [];
      const burst = (n: number, at: number, tAtAz: number, power: number) => {
        for (let i = 0; i < n; i++) {
          drops.push({
            az: az0 + dAz * (tAtAz / dur),
            vAz: (Math.random() - 0.5) * 3.2 * power,
            vAlt: (1.1 + Math.random() * 1.9) * power,
            start: at,
            size: 1.6 + Math.random() * 1.8,
          });
        }
      };
      // 나올 때는 몸이 물을 밀어 올리고, 들어갈 때가 더 크게 터진다
      burst(10, tExit, tExit, 0.85);
      burst(16, tEntry, tEntry, 1.15);

      events.current.push({
        age: 0,
        dur,
        end: tEntry + 1.1,
        az0,
        dAz,
        peak,
        alt0,
        size: 0.85 + Math.random() * 0.4,
        drops,
      });
    }

    // ── 갱신 ─────────────────────────────────────────────────────────
    const pos = geometry.getAttribute("position") as THREE.BufferAttribute;
    const alpha = geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
    const size = geometry.getAttribute("aSize") as THREE.BufferAttribute;
    const arr = pos.array as Float32Array;
    const aArr = alpha.array as Float32Array;
    const sArr = size.array as Float32Array;
    aArr.fill(0);

    let slot = 0;

    for (let e = events.current.length - 1; e >= 0; e--) {
      const ev = events.current[e];
      ev.age += dt;
      if (ev.age >= ev.end) {
        events.current.splice(e, 1);
        continue;
      }
      const base = slot * DROPS;
      const body = bodies[slot];
      slot++;

      // 몸통 — 포물선 위를 지나며, 수면 아래는 셰이더가 잘라낸다
      const t = ev.age / ev.dur;
      if (t > 1) {
        body.visible = false;
      } else {
        const alt = ev.alt0 + (ev.peak - ev.alt0) * 4 * t * (1 - t);
        const az = ev.az0 + ev.dAz * t;
        altAzToWorld(az, alt, v).multiplyScalar(R);
        body.position.copy(v);

        // 카메라를 향해 판을 세운다. 그래야 어느 방위에서 봐도 옆모습이다.
        body.lookAt(camera.position);
        // 진행 방향으로 몸을 눕힌다. 방위 변화가 화면 x, 고도 변화가 화면 y다.
        const dAltDt = (ev.peak - ev.alt0) * 4 * (1 - 2 * t);
        const left = ev.dAz < 0;
        const angle = Math.atan2(dAltDt, Math.abs(ev.dAz));
        body.rotateZ(left ? -angle : angle);
        (body.material as THREE.ShaderMaterial).uniforms.uFlip.value = left ? 1 : 0;

        const len = BODY_DEG * ev.size * (Math.PI / 180) * R;
        body.scale.set(len, len / 2, 1);
        // 몸이 조금이라도 물 밖에 있을 때만 그린다
        body.visible = alt > -BODY_DEG * ev.size * 0.5;
      }

      // 물보라
      for (let i = 0; i < DROPS; i++) {
        const k = base + i;
        const d = ev.drops[i];
        const tt = ev.age - d.start;
        if (tt <= 0) {
          sArr[k] = 0;
          continue;
        }
        const alt = d.vAlt * tt - GRAVITY * tt * tt;
        if (alt < -0.2) {
          sArr[k] = 0;
          continue;
        }
        altAzToWorld(d.az + d.vAz * tt, alt, v).multiplyScalar(R);
        arr[k * 3] = v.x;
        arr[k * 3 + 1] = v.y;
        arr[k * 3 + 2] = v.z;
        // 물방울은 튀어 오른 뒤 사그라든다
        aArr[k] = Math.max(0, 1 - tt / 1.0);
        sArr[k] = d.size * ev.size;
      }
    }

    for (let i = slot; i < bodies.length; i++) bodies[i].visible = false;

    pos.needsUpdate = true;
    alpha.needsUpdate = true;
    size.needsUpdate = true;
  });

  return (
    <>
      {/* 돌고래는 가장 가까이 있는 것이라 섬(7)보다도 앞에 그린다 */}
      {bodies.map((b, i) => (
        <primitive key={i} object={b} />
      ))}

      {/* 물보라 — 바다(5)·윤슬(5.5)보다 뒤, 물 위에 얹힌다 */}
      <points geometry={geometry} frustumCulled={false} renderOrder={5.7}>
        <shaderMaterial
          ref={matRef}
          vertexShader={/* glsl */ `
            attribute float aAlpha;
            attribute float aSize;
            uniform float uPixelRatio;
            varying float vAlpha;
            void main() {
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = aSize * uPixelRatio;
              vAlpha = aAlpha;
            }
          `}
          fragmentShader={/* glsl */ `
            precision mediump float;
            uniform vec3 uTint;
            varying float vAlpha;
            void main() {
              if (vAlpha < 0.004) discard;
              float d = length(gl_PointCoord - 0.5);
              float a = smoothstep(0.5, 0.05, d) * vAlpha;
              if (a < 0.004) discard;
              gl_FragColor = vec4(uTint * vec3(0.92, 0.96, 1.0), a);
            }
          `}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}
