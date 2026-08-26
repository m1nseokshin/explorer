"use client";

import { useEffect, useRef } from "react";

/**
 * 홈 히어로의 인터랙티브 별밭.
 *
 * 터치하면 초신성이 터지고 그 자리에 별이 남는다. 실제 초신성은 별을 파괴하지만,
 * 그 충격파가 주변 성간가스를 압축해 '다음 세대의 별'을 만든다 — 그래서 폭발에서
 * 별이 태어나는 이 표현은 은유로만 그럴듯한 게 아니라 실제로 일어나는 일이다.
 *
 * three.js를 쓰지 않는다. 홈 페이지가 3D 런타임을 통째로 내려받을 이유가 없고,
 * 필요한 건 점과 선뿐이라 2D 캔버스로 충분하다.
 */

interface BgStar {
  /** 0..1 정규화 — 창 크기가 바뀌어도 배치가 유지된다 */
  x: number;
  y: number;
  r: number;
  a: number;
  /** -1(푸른) .. 1(붉은) */
  tint: number;
  /**
   * 반짝임이 시작된 시각(ms). 0이면 반짝이지 않는 상태.
   *
   * 모든 별을 상시 사인파로 흔들면 화면 전체가 일렁여서 '별밭'이 아니라
   * '움직이는 배경'이 된다. 실제 섬광(scintillation)도 대기가 흔들릴 때
   * 몇몇 별에서 불규칙하게 일어나지, 모두가 동시에 규칙적으로 뛰지 않는다.
   */
  twinkleAt: number;
  /** 이번 반짝임의 세기·길이 */
  twinkleAmp: number;
  twinkleDur: number;
}

interface BornStar {
  x: number;
  y: number;
  r: number;
  tint: number;
  born: number;
  twinkleAt: number;
  twinkleAmp: number;
  twinkleDur: number;
}

interface Nova {
  x: number;
  y: number;
  born: number;
  tint: number;
  /** 방사 필라멘트 */
  sparks: { a: number; v: number; len: number; w: number; alpha: number }[];
  /** 충격파 껍질. 지연·크기·요철 위상이 제각각이라 겹쳐도 같은 모양이 안 된다. */
  shells: { delay: number; scale: number; alpha: number; width: number; seed: number }[];
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  len: number;
  born: number;
  life: number;
}

const NOVA_MS = 1900;
const BORN_FADE_MS = 900;
const MAX_BORN = 48;

/** B-V 감각의 색. 하늘 렌더와 같은 토큰 값을 쓴다. */
function tintColor(t: number, alpha: number) {
  // t<0 푸른(#9bb0ff) … 0 흰색 … t>0 따뜻(#ffb86b)
  const c =
    t < 0
      ? [155 + (255 - 155) * (1 + t), 176 + (255 - 176) * (1 + t), 255]
      : [255, 255 - (255 - 184) * t, 255 - (255 - 107) * t];
  return `rgba(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}, ${alpha})`;
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * 반짝임 봉투. 0..1 진행도 → 밝기 배수.
 *
 * 빠르게 두어 번 흔들리고 잦아든다. 대기 섬광은 사인파가 아니라 짧고
 * 불규칙한 떨림이라, 감쇠하는 진동이 실제와 훨씬 가깝다.
 */
function twinkleEnvelope(t: number, amp: number) {
  if (t <= 0 || t >= 1) return 1;
  const decay = Math.pow(1 - t, 2);
  return 1 + Math.sin(t * Math.PI * 5.5) * decay * amp;
}

export default function HomeStarfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgRef = useRef<BgStar[]>([]);
  const nextTwinkleRef = useRef(0);
  const bornRef = useRef<BornStar[]>([]);
  const novaRef = useRef<Nova[]>([]);
  const meteorRef = useRef<Meteor[]>([]);
  const nextMeteorRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    /** 폭발 반경을 화면 크기에 맞춘다. 고정값이면 큰 화면에서 우표만 해진다. */
    let scale = 1;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      scale = Math.min(1.9, Math.max(0.85, Math.hypot(w, h) / 820));

      // 화면 넓이에 비례해 배경 별 수를 정한다. 밀도를 고정하면 큰 화면에서
      // 휑하고 작은 화면에서 빽빽해진다.
      const target = Math.round(Math.min(260, Math.max(90, (w * h) / 5200)));
      const arr = bgRef.current;
      while (arr.length < target) {
        arr.push({
          x: Math.random(),
          y: Math.random(),
          // 대부분 아주 작고 몇 개만 크다 — 실제 등급 분포를 흉내낸다
          r: 0.35 + Math.pow(Math.random(), 3.2) * 1.5,
          a: 0.18 + Math.pow(Math.random(), 1.6) * 0.62,
          tint: (Math.random() - 0.45) * 1.3,
          twinkleAt: 0,
          twinkleAmp: 0,
          twinkleDur: 0,
        });
      }
      arr.length = target;
    };
    resize();
    window.addEventListener("resize", resize);

    const spawnMeteor = (now: number) => {
      // 왼쪽 위에서 오른쪽 아래로, 또는 그 반대. 각도를 좁게 묶어야
      // '떨어진다'는 인상이 유지된다.
      const fromLeft = Math.random() < 0.62;
      const ang = (fromLeft ? 28 : 152) * (Math.PI / 180) + (Math.random() - 0.5) * 0.24;
      const speed = 380 + Math.random() * 320;
      const startX = fromLeft ? -60 : w + 60;
      meteorRef.current.push({
        x: startX,
        y: Math.random() * h * 0.55 - h * 0.1,
        vx: Math.cos(ang) * speed * (fromLeft ? 1 : 1),
        vy: Math.sin(ang) * speed,
        len: 110 + Math.random() * 170,
        born: now,
        life: 1900 + Math.random() * 900,
      });
    };

    let lastNow = performance.now();

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      // ⚠️ 프레임 간격을 16.7ms로 고정하면 안 된다. 144Hz 화면에서는 실제 간격이
      //    7ms라 유성이 의도한 속도의 2.4배로 날아가 눈에 띄지도 않고 지나간다.
      //    반대로 저사양에서는 느려진다. 실제 dt로 적분한다.
      const dt = Math.min((now - lastNow) / 1000, 0.05);
      lastNow = now;
      ctx.clearRect(0, 0, w, h);


      // ── 반짝임 스케줄러 ────────────────────────────────────────
      // 한 번에 한둘만. 밝은 별일수록 자주 걸리게 해서, 실제로 눈에 띄는
      // 별이 반짝이는 것처럼 보이게 한다.
      if (!reduce && now > nextTwinkleRef.current) {
        const arr = bgRef.current;
        if (arr.length) {
          // 후보 몇 개를 뽑아 그중 가장 밝은 것을 고른다 — 전체 정렬 없이
          // 밝은 쪽에 치우친 선택을 만드는 값싼 방법이다.
          let pick = arr[(Math.random() * arr.length) | 0];
          for (let k = 0; k < 3; k++) {
            const c = arr[(Math.random() * arr.length) | 0];
            if (c.a > pick.a) pick = c;
          }
          pick.twinkleAt = now;
          pick.twinkleAmp = 0.35 + Math.random() * 0.45;
          pick.twinkleDur = 700 + Math.random() * 900;
        }
        nextTwinkleRef.current = now + 420 + Math.random() * 1400;
      }

      // ── 배경 별 ────────────────────────────────────────────────
      // 기본은 그냥 점이다. 반짝임은 지금 걸린 별에만 적용된다.
      for (const s of bgRef.current) {
        let tw = 1;
        if (s.twinkleAt) {
          const p = (now - s.twinkleAt) / s.twinkleDur;
          if (p >= 1) s.twinkleAt = 0;
          else tw = twinkleEnvelope(p, s.twinkleAmp);
        }
        ctx.fillStyle = tintColor(s.tint, Math.min(1, s.a * tw));
        ctx.beginPath();
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── 태어난 별 ──────────────────────────────────────────────
      for (const b of bornRef.current) {
        const fade = Math.min(1, (now - b.born) / BORN_FADE_MS);
        let tw = 1;
        if (!reduce) {
          if (b.twinkleAt) {
            const p = (now - b.twinkleAt) / b.twinkleDur;
            if (p >= 1) b.twinkleAt = 0;
            else tw = twinkleEnvelope(p, b.twinkleAmp);
          } else if (Math.random() < 0.0012) {
            // 태어난 별도 이따금 반짝인다. 배경 별과 달리 개수가 적어
            // 스케줄러를 따로 두지 않고 프레임마다 낮은 확률로 건다.
            b.twinkleAt = now;
            b.twinkleAmp = 0.4 + Math.random() * 0.4;
            b.twinkleDur = 700 + Math.random() * 800;
          }
        }
        // 갓 태어난 별도 그냥 점이다. 십자 빛줄기는 폭발 직후의 섬광에만 쓴다.
        ctx.fillStyle = tintColor(b.tint, Math.min(1, fade * tw));
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── 초신성 ─────────────────────────────────────────────────
      //
      // 방사형 그라디언트를 쓰지 않는다. 부드럽게 번지는 광구(光球)는 실제
      // 관측 사진과 닮은 구석이 없고 즉시 '만든 그래픽'으로 읽힌다. 실제
      // 초신성 잔해(게성운·베일성운)에서 눈에 남는 건 얇고 불규칙한 필라멘트다.
      // 그래서 여기서는 선만 쓴다 — 찌그러진 충격파 껍질과 방사 필라멘트.
      novaRef.current = novaRef.current.filter((n) => now - n.born < NOVA_MS);
      for (const n of novaRef.current) {
        const t = (now - n.born) / NOVA_MS;
        const fade = Math.pow(1 - t, 1.6);

        // 최초 섬광: 점광원이 아주 잠깐 밝아진다. 원 하나, 그라디언트 없음.
        if (t < 0.16) {
          const ft = 1 - t / 0.16;
          ctx.fillStyle = `rgba(255,255,255,${ft})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 0.8 + ft * 2.2, 0, Math.PI * 2);
          ctx.fill();

          // 아주 짧은 회절 십자 — 밝은 점광원을 볼 때 실제로 생기는 현상
          const sp = ft * 26 * scale;
          ctx.strokeStyle = `rgba(255,255,255,${ft * 0.75})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(n.x - sp, n.y);
          ctx.lineTo(n.x + sp, n.y);
          ctx.moveTo(n.x, n.y - sp);
          ctx.lineTo(n.x, n.y + sp);
          ctx.stroke();
        }

        // 충격파 껍질: 완전한 원이 아니라 울퉁불퉁하다. 실제 폭발은 등방적이지
        // 않고, 매끈한 원이야말로 CG처럼 보이게 만드는 주범이다.
        for (const shell of n.shells) {
          const tt = (t - shell.delay) / (1 - shell.delay);
          if (tt <= 0) continue;
          const rr = easeOut(tt) * 190 * scale * shell.scale;
          ctx.strokeStyle = tintColor(n.tint, fade * shell.alpha);
          ctx.lineWidth = Math.max(0.4, 1.6 * (1 - t) * shell.width);
          ctx.beginPath();
          for (let i = 0; i <= 72; i++) {
            const a = (i / 72) * Math.PI * 2;
            // 각도별 요철. 위상을 껍질마다 달리해 겹쳐도 같은 모양이 안 된다.
            // 진폭이 크면 껍질이 아니라 아메바가 된다 — 충격파가 살짝 찌그러진
            // 정도로만 둔다.
            // 저차 성분이 크면 삼각형·육각형처럼 '모양'으로 읽힌다.
            // 고차를 섞어 형태가 아니라 결로 보이게 한다.
            const wob =
              1 +
              0.026 * Math.sin(a * 3 + shell.seed) +
              0.018 * Math.sin(a * 7 - shell.seed * 1.7) +
              0.012 * Math.sin(a * 13 + shell.seed * 2.3);
            const x = n.x + Math.cos(a) * rr * wob;
            const y = n.y + Math.sin(a) * rr * wob;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }

        // 방사 필라멘트: 길이도 밝기도 제각각이라야 폭발처럼 보인다
        for (const f of n.sparks) {
          const d1 = easeOut(t) * f.len * f.v * scale;
          const d0 = d1 * (0.55 + 0.25 * f.v);
          const a = Math.pow(1 - t, 1.9) * f.alpha;
          if (a < 0.02) continue;
          ctx.strokeStyle = tintColor(n.tint, a);
          ctx.lineWidth = f.w;
          ctx.beginPath();
          ctx.moveTo(n.x + Math.cos(f.a) * d0, n.y + Math.sin(f.a) * d0);
          ctx.lineTo(n.x + Math.cos(f.a) * d1, n.y + Math.sin(f.a) * d1);
          ctx.stroke();
        }
      }

      // ── 유성 ───────────────────────────────────────────────────
      if (!reduce) {
        if (now > nextMeteorRef.current) {
          if (nextMeteorRef.current > 0) spawnMeteor(now);
          // 간헐적이어야 '간간히'가 된다. 너무 잦으면 배경 노이즈가 된다.
          nextMeteorRef.current = now + 4200 + Math.random() * 7000;
        }
        meteorRef.current = meteorRef.current.filter((m) => {
          const age = now - m.born;
          if (age > m.life) return false;
          const t = age / m.life;
          m.x += m.vx * dt;
          m.y += m.vy * dt;
          if (m.x < -200 || m.x > w + 200 || m.y > h + 200) return false;

          // 들어올 때 밝아지고 나갈 때 사그라든다
          const a = Math.min(1, t / 0.15) * (1 - Math.max(0, (t - 0.55) / 0.45));
          const nx = m.vx / Math.hypot(m.vx, m.vy);
          const ny = m.vy / Math.hypot(m.vx, m.vy);
          const tx = m.x - nx * m.len;
          const ty = m.y - ny * m.len;
          const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
          g.addColorStop(0, `rgba(255,255,255,${0.85 * a})`);
          g.addColorStop(0.35, `rgba(200,214,255,${0.28 * a})`);
          g.addColorStop(1, "rgba(155,176,255,0)");
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.4;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(m.x, m.y);
          ctx.stroke();

          // 머리는 작고 또렷한 점. 후광을 씌우면 즉시 만화처럼 보인다.
          ctx.fillStyle = `rgba(255,255,255,${0.95 * a})`;
          ctx.beginPath();
          ctx.arc(m.x, m.y, 1.1, 0, Math.PI * 2);
          ctx.fill();
          return true;
        });
      }
    };

    raf = requestAnimationFrame(draw);

    // ── 터치 → 초신성 → 별 탄생 ─────────────────────────────────
    const onPointerDown = (e: PointerEvent) => {
      // 버튼·링크 위에서는 발동하지 않는다. 별이 터지느라 CTA를 놓치면 곤란하다.
      if ((e.target as HTMLElement).closest("a, button, input")) return;
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (x < 0 || y < 0 || x > r.width || y > r.height) return;

      const now = performance.now();
      const tint = (Math.random() - 0.45) * 1.3;
      const sparkCount = 16 + ((Math.random() * 10) | 0);
      novaRef.current.push({
        x,
        y,
        born: now,
        tint,
        sparks: Array.from({ length: sparkCount }, () => ({
          // 각도를 균등 분포가 아니라 무작위로 두면 실제 파편처럼 뭉치고 벌어진다
          a: Math.random() * Math.PI * 2,
          v: 0.5 + Math.random() * 0.9,
          len: 110 + Math.random() * 110,
          w: 0.7 + Math.random() * 0.9,
          alpha: 0.45 + Math.random() * 0.5,
        })),
        shells: [
          { delay: 0, scale: 1, alpha: 0.62, width: 1, seed: Math.random() * 9 },
          { delay: 0.1, scale: 0.72, alpha: 0.34, width: 0.7, seed: Math.random() * 9 },
          { delay: 0.26, scale: 1.22, alpha: 0.2, width: 0.55, seed: Math.random() * 9 },
        ],
      });

      // 폭발이 잦아들 무렵 별이 남는다
      window.setTimeout(() => {
        bornRef.current.push({
          x,
          y,
          r: 1.3 + Math.random() * 1.2,
          tint,
          born: performance.now(),
          twinkleAt: 0,
          twinkleAmp: 0,
          twinkleDur: 0,
        });
        // 무한히 쌓이면 결국 화면이 하얘진다. 오래된 것부터 밀어낸다.
        if (bornRef.current.length > MAX_BORN) bornRef.current.shift();
      }, NOVA_MS * 0.42);
    };

    const host = canvas.parentElement ?? canvas;
    host.addEventListener("pointerdown", onPointerDown);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      host.removeEventListener("pointerdown", onPointerDown);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    />
  );
}
