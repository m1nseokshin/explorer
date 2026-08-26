"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { SKY_RADIUS } from "@/lib/sky";
import { STAR_FRAG, STAR_VERT } from "@/lib/starShader";
import { STAR_SIZE_MAX, STAR_SIZE_MIN } from "@/lib/starHit";
import type { StarCatalog } from "@/lib/stars";

interface Props {
  catalog: StarCatalog;
  saturation: number;
  /** 야간모드 틴트. 기본 흰색. */
  tint?: THREE.Color;
  /** 별자리선을 이루는 별 표시 (catalog.count 길이, 1/0). */
  memberFlags: Uint8Array;
  /** 선택된 별의 카탈로그 인덱스. 없으면 null. */
  selectedIndex: number | null;
}

/**
 * 별자리 구성별을 배경별 대비 몇 배로 키울지 — '지름' 배율이다.
 *
 * 등급 8까지 4만 개를 깔고 나면 그림을 만드는 별이 배경에 묻히므로 키우는 게
 * 맞다. 다만 지름 12배는 못 쓴다 — 1등성이 지름 190px짜리 흐릿한 원반이 되고,
 * 모든 구성별이 같은 크기로 뭉개져 등급 차이가 통째로 사라진다.
 * 3.5배(면적 12배)로 시작했다가 실제로는 커 보여서 20% 줄인 값이다.
 * 면적으로는 약 7.8배에 해당한다.
 */
const MEMBER_SIZE_BOOST = 2.8;

/**
 * 별 41,411개(mag ≤ 8) = 드로우콜 1개. 지오메트리는 마운트 시 한 번만 GPU에 올라가고
 * 이후 절대 건드리지 않는다 — 하늘 회전은 부모 그룹의 행렬로만 처리한다.
 */
export default function StarField({
  catalog,
  saturation,
  tint,
  memberFlags,
  selectedIndex,
}: Props) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const { camera, gl } = useThree();

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    // 카탈로그는 단위벡터로 저장돼 있다. 셸 반지름은 여기서 한 번만 곱한다.
    const pos = new Float32Array(catalog.count * 3);
    for (let i = 0; i < catalog.count * 3; i++) pos[i] = catalog.positions[i] * SKY_RADIUS;
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aMag", new THREE.BufferAttribute(catalog.mag, 1));
    g.setAttribute("aCi", new THREE.BufferAttribute(catalog.ci, 1));
    // Uint8Array를 그대로 올리면 셰이더에서 정수로 읽혀 mix()가 어긋난다
    const member = new Float32Array(catalog.count);
    for (let i = 0; i < catalog.count; i++) member[i] = memberFlags[i] ? 1 : 0;
    g.setAttribute("aMember", new THREE.BufferAttribute(member, 1));
    return g;
  }, [catalog, memberFlags]);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  const uniforms = useMemo(
    () => ({
      uPixelRatio: { value: 1 },
      uZoom: { value: 1 },
      uMagLimit: { value: catalog.magLimit },
      // 판정(lib/stars.ts)과 같은 값을 써야 보이는 크기와 고르는 크기가 일치한다
      uSizeMin: { value: STAR_SIZE_MIN },
      uSizeMax: { value: STAR_SIZE_MAX },
      uSaturation: { value: saturation },
      uTint: { value: tint ?? new THREE.Color(1, 1, 1) },
      uTime: { value: 0 },
      uMemberBoost: { value: MEMBER_SIZE_BOOST },
      uSelDir: { value: new THREE.Vector3() },
    }),
    [catalog.magLimit, saturation, tint],
  );

  useFrame((_, delta) => {
    const m = matRef.current;
    if (!m) return;
    // 섬광용 시계. state로 두면 초당 60회 리렌더가 난다 (성능 규약).
    m.uniforms.uTime.value += Math.min(delta, 0.1);
    // 줌 = 기준 FOV 대비 배율. 셰이더가 크기·알파를 함께 밀어 올려
    // "줌인하면 어두운 별이 드러난다"는 실제 관측 감각을 만든다.
    // 프레임마다 바뀌는 건 이것뿐이므로 나머지는 건드리지 않는다.
    const cam = camera as THREE.PerspectiveCamera;
    m.uniforms.uZoom.value = THREE.MathUtils.clamp(65 / (cam.fov || 65), 0.5, 12);
  });

  // 픽셀비·채도·틴트는 사용자가 바꿀 때만 변한다 — 프레임 루프에서 뺀다
  useLayoutEffect(() => {
    const m = matRef.current;
    if (!m) return;
    m.uniforms.uPixelRatio.value = gl.getPixelRatio();
    m.uniforms.uSaturation.value = saturation;
    if (tint) (m.uniforms.uTint.value as THREE.Color).copy(tint);
  }, [gl, saturation, tint]);

  // 선택 표시. 인덱스가 아니라 방향을 넘긴다 — gl_VertexID에 기대지 않아
  // 어떤 WebGL 버전에서도 같게 동작하고, 속성 재업로드도 없다.
  useLayoutEffect(() => {
    const m = matRef.current;
    if (!m) return;
    const v = m.uniforms.uSelDir.value as THREE.Vector3;
    if (selectedIndex == null) v.set(0, 0, 0);
    else
      v.set(
        catalog.positions[selectedIndex * 3],
        catalog.positions[selectedIndex * 3 + 1],
        catalog.positions[selectedIndex * 3 + 2],
      ).normalize();
    // ⚠️ uniforms가 새로 만들어지면(야간모드 토글 등) uSelDir이 0으로 초기화된다.
    //    의존성에 넣어야 그때 다시 써 준다 — 안 그러면 야간 시야를 켜는 순간
    //    골라 둔 별의 강조가 조용히 풀린다.
  }, [catalog, selectedIndex, uniforms]);

  return (
    <points
      geometry={geometry}
      // 셸이 카메라를 감싸고 있어 바운딩스피어 컬링은 도움이 안 되고 가끔 오작동한다
      frustumCulled={false}
      renderOrder={1}
    >
      <shaderMaterial
        ref={matRef}
        vertexShader={STAR_VERT}
        fragmentShader={STAR_FRAG}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        // NormalBlending — 라이브 영상 위에 source-over로 합성되므로 가산합성은
        // 은하수 중심부에서 알파까지 부풀려 뿌연 반점을 뚫는다. DESIGN.md 참조.
        blending={THREE.NormalBlending}
      />
    </points>
  );
}
