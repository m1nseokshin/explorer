"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export interface LabelAnchor {
  id: string;
  name: string;
  rank: number;
  /** EQJ 단위벡터 */
  vec: THREE.Vector3;
}

interface Props {
  anchors: LabelAnchor[];
  skyMatRef: React.RefObject<THREE.Matrix4>;
  cameraRef: React.RefObject<THREE.Camera | null>;
  containerRef: React.RefObject<HTMLElement | null>;
  nightMode: boolean;
  activeId: string | null;
  /** 조준선이 들어와 있는 별자리. 선택보다 약하게 밝힌다. */
  aimedId: string | null;
  /**
   * 조준선(화면 중앙)이 이름표 위에 올라온 별자리. 없으면 null.
   * 바뀔 때만 부른다 — 매 프레임 올리면 부모가 60Hz로 리렌더된다.
   */
  onAimLabel?: (id: string | null) => void;
  onSelect?: (id: string) => void;
}

/** 화면에 동시에 띄울 라벨 상한. 12개를 넘으면 하늘이 읽히지 않는다 —
 *  성능 결정이기 이전에 디자인 결정이다. */
const MAX_LABELS = 12;
/** DOM에 붙여 두는 후보 수. 여유를 둬야 페이드로 드나들 수 있다. */
const MAX_MOUNTED = 26;
/** 후보 목록 갱신 주기(ms). 위치는 매 프레임 갱신하므로 이건 느려도 된다. */
const CANDIDATE_MS = 400;
/**
 * sin(6°) — 지평선 6° 아래 컷.
 * 지면 돔의 소광이 6° 아래부터 눈에 띄게 짙어진다. 라벨은 DOM이라 캔버스
 * 소광의 영향을 안 받으므로, 컷이 더 낮으면 선은 흐린데 이름만 또렷한
 * 어긋난 그림이 된다.
 */
const HORIZON_CUT = Math.sin((6 * Math.PI) / 180);
const MIN_GAP_X = 92;
const MIN_GAP_Y = 26;
/** 페이드 시정수(초). 이게 없으면 라벨이 딱딱 꺼졌다 켜진다. */
const FADE_TAU = 0.12;

/**
 * 별자리 이름 라벨.
 *
 * 캔버스 밖 DOM 오버레이로 구현한다. 라벨이 12개뿐이라 DOM 비용이 무의미하고,
 * 대신 .type-eyebrow를 그대로 쓸 수 있으며 한글 글리프 문제가 사라진다.
 *
 * ⚠️ 위치를 React state로 옮기면 안 된다. state를 10Hz로 갱신하던 이전 구현은
 *    드래그 중에 라벨이 100ms 계단으로 움직여서 눈에 띄게 끊겼다. 지금은
 *    '어떤 라벨을 붙여 둘지'만 state가 정하고(400ms), 실제 좌표와 투명도는
 *    매 프레임 DOM에 직접 쓴다 — 리렌더 없이 60fps로 따라간다.
 */
export default function ConstellationLabels({
  anchors,
  skyMatRef,
  cameraRef,
  containerRef,
  nightMode,
  activeId,
  aimedId,
  onAimLabel,
  onSelect,
}: Props) {
  const [mounted, setMounted] = useState<{ id: string; name: string }[]>([]);
  const nodes = useRef(new Map<string, HTMLButtonElement | null>());
  const alphas = useRef(new Map<string, number>());
  const raf = useRef(0);
  // 선택이 바뀔 때마다 rAF 루프를 다시 만들 이유가 없다. ref로 읽는다.
  const activeRef = useRef(activeId);
  useEffect(() => {
    activeRef.current = activeId;
  }, [activeId]);
  const aimedRef = useRef(aimedId);
  useEffect(() => {
    aimedRef.current = aimedId;
  }, [aimedId]);
  const onAimLabelRef = useRef(onAimLabel);
  useEffect(() => {
    onAimLabelRef.current = onAimLabel;
  }, [onAimLabel]);
  const overLabel = useRef<string | null>(null);

  useEffect(() => {
    const v = new THREE.Vector3();
    let lastCandidate = 0;
    let last = performance.now();

    const tick = (now: number) => {
      raf.current = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      const cam = cameraRef.current;
      const el = containerRef.current;
      if (!cam || !el) return;

      const w = el.clientWidth;
      const h = el.clientHeight;
      const mat = skyMatRef.current;

      // 1) 모든 앵커를 투영해 화면 좌표와 점수를 구한다 (88개, 매 프레임)
      const shots: { id: string; name: string; x: number; y: number; score: number }[] = [];
      for (const a of anchors) {
        v.copy(a.vec).applyMatrix4(mat);
        if (v.y < HORIZON_CUT) continue;
        v.multiplyScalar(100).project(cam);
        if (v.z > 1 || v.x < -1.15 || v.x > 1.15 || v.y < -1.15 || v.y > 1.15) continue;

        const rawX = ((v.x + 1) / 2) * w;
        const rawY = ((1 - v.y) / 2) * h;
        const PAD = 56;
        const RIGHT_PAD = 88;
        const x = Math.min(Math.max(rawX, PAD), Math.max(PAD, w - RIGHT_PAD));
        const y = Math.min(Math.max(rawY, PAD), Math.max(PAD, h - PAD));
        if (Math.abs(x - rawX) > 60 || Math.abs(y - rawY) > 60) continue;

        shots.push({
          id: a.id,
          name: a.name,
          x,
          y,
          score: -Math.hypot(v.x, v.y) * 1.4 - a.rank * 0.5,
        });
      }
      shots.sort((p, q) => q.score - p.score);

      // 2) 겹치지 않는 상위 12개를 고른다. 진 라벨은 사라지는 게 아니라
      //    투명도가 0으로 잦아든다 — 그래서 튀지 않는다.
      const winners = new Set<string>();
      const placed: { x: number; y: number }[] = [];
      for (const s of shots) {
        if (winners.size >= MAX_LABELS) break;
        const clash = placed.some(
          (p) => Math.abs(p.x - s.x) < MIN_GAP_X && Math.abs(p.y - s.y) < MIN_GAP_Y,
        );
        if (clash) continue;
        placed.push(s);
        winners.add(s.id);
      }

      // 3) 좌표와 투명도를 DOM에 직접 쓴다 (리렌더 없음)
      const k = 1 - Math.exp(-dt / FADE_TAU);
      const byId = new Map(shots.map((s) => [s.id, s]));
      for (const [id, node] of nodes.current) {
        if (!node) continue;
        const s = byId.get(id);
        const target = s && winners.has(id) ? 1 : 0;
        const cur = (alphas.current.get(id) ?? 0) + (target - (alphas.current.get(id) ?? 0)) * k;
        alphas.current.set(id, cur);
        if (s) node.style.transform = `translate3d(${s.x}px, ${s.y}px, 0) translate(-50%, -50%)`;
        // 선택 1 · 조준 0.9 · 나머지 0.62. 선이 밝아질 때 이름도 같이
        // 떠올라야 '저게 지금 조준선 안에 있는 것'으로 읽힌다.
        const tier =
          activeRef.current === id ? 1 : aimedRef.current === id ? 0.9 : 0.62;
        node.style.opacity = String(cur * tier);
        // 완전히 사라진 라벨은 클릭도 받지 않아야 한다
        node.style.pointerEvents = cur > 0.35 ? "auto" : "none";
      }

      // 3-b) 조준선이 이름표 위에 올라왔는가.
      //      경계로 판정하면 하늘 어디를 봐도 늘 어떤 별자리 '안'이라
      //      안내가 상시 켜져 있는 것과 같아진다. 이름표를 겨눴을 때만
      //      켜야 '가리켰다'는 행동과 화면이 맞아떨어진다.
      const cx = w / 2;
      const cy = h / 2;
      let over: string | null = null;
      for (const [id, node] of nodes.current) {
        if (!node) continue;
        if ((alphas.current.get(id) ?? 0) < 0.35) continue;
        const s = byId.get(id);
        if (!s) continue;
        const hw = node.offsetWidth / 2 + 6;
        const hh = node.offsetHeight / 2 + 6;
        if (Math.abs(cx - s.x) <= hw && Math.abs(cy - s.y) <= hh) {
          over = id;
          break;
        }
      }
      if (over !== overLabel.current) {
        overLabel.current = over;
        onAimLabelRef.current?.(over);
      }

      // 4) 후보 목록은 느리게. 화면에 들어올 만한 것들을 넉넉히 붙여 둔다.
      if (now - lastCandidate > CANDIDATE_MS) {
        lastCandidate = now;
        const want = shots.slice(0, MAX_MOUNTED).map((s) => ({ id: s.id, name: s.name }));
        setMounted((prev) => {
          if (prev.length === want.length && prev.every((p, i) => p.id === want[i].id)) {
            return prev;
          }
          return want;
        });
      }
    };

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [anchors, skyMatRef, cameraRef, containerRef]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {mounted.map((m) => (
        <button
          key={m.id}
          ref={(el) => {
            if (el) nodes.current.set(m.id, el);
            else nodes.current.delete(m.id);
          }}
          type="button"
          onClick={() => onSelect?.(m.id)}
          className="type-eyebrow hud-shadow absolute left-0 top-0 whitespace-nowrap px-2 py-1 will-change-transform"
          style={{
            color: nightMode ? "var(--on-primary)" : "#ffffff",
            // 초기값은 0. 첫 프레임에 rAF가 실제 좌표와 투명도를 써 넣는다.
            opacity: 0,
          }}
        >
          {m.name}
        </button>
      ))}
    </div>
  );
}
