/**
 * 제스처 판정 검증 — 브라우저도 카메라도 없이.
 *
 * 실제 MediaPipe 출력에서 뽑은 대표 손 자세를 합성해 판정을 확인한다.
 * 손 인식 자체는 검증할 수 없지만, '랜드마크 → 제스처' 규칙은 순수 함수이므로
 * 여기서 전부 잠글 수 있다. 임계값을 만질 때마다 이걸 돌릴 것.
 */
import {
  readHand,
  openness,
  handScale,
  zoomStep,
  createGrasp,
  stepGrasp,
  graspArmed,
  APERTURE_MIN,
  APERTURE_MAX,
  PINCH_SENSITIVITY,
  GRASP_HOLD_S,
  GRASP_WINDOW_S,
  GRASP_COOLDOWN_S,
} from "../lib/gestures.ts";

let pass = 0;
let fail = 0;
const failures = [];
const near2 = (a, b, tol, name) =>
  check(name, Math.abs(a - b) < tol, `${a.toFixed(4)} vs ${b.toFixed(4)}`);

const check = (name, ok, detail = "") => {
  if (ok) pass++;
  else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  }
};

/**
 * 손 랜드마크 합성기.
 * 손목을 원점으로 두고 손가락을 위쪽(-y)으로 뻗은 정면 손을 만든다.
 * @param curl 0=완전히 펴짐, 1=완전히 접힘 (손가락별 배열 가능)
 * @param thumbToIndex 엄지 TIP을 검지 TIP 쪽으로 당기는 비율 (핀치)
 */
function makeHand({ curl = 0, thumbToIndex = 0, cx = 0.5, cy = 0.5, s = 0.12 } = {}) {
  const curls = Array.isArray(curl) ? curl : [curl, curl, curl, curl, curl];
  const lm = new Array(21);
  const put = (i, x, y) => (lm[i] = { x: cx + x * s, y: cy + y * s, z: 0 });

  put(0, 0, 0); // 손목

  // 4개 손가락(검지~새끼)을 '관절 3개짜리 사슬'로 만든다.
  // 마디를 통째로 접으면 curl 0.5가 이미 주먹처럼 보여서 판정 곡선이 왜곡된다.
  // 실제 손처럼 MCP/PIP/DIP가 각각 굽어야 중간 자세가 중간으로 읽힌다.
  const fingers = [
    { base: 5, dx: -0.35, seg: 0.40 }, // 검지
    { base: 9, dx: -0.1, seg: 0.44 },  // 중지 — handScale 기준
    { base: 13, dx: 0.15, seg: 0.40 }, // 약지
    { base: 17, dx: 0.4, seg: 0.34 },  // 새끼
  ];
  // 최대 굴곡각(라디안): MCP 90°, PIP 100°, DIP 70° — 사람 손의 대략적인 가동범위
  const MAX_FLEX = [Math.PI / 2, (Math.PI * 100) / 180, (Math.PI * 70) / 180];

  for (let f = 0; f < fingers.length; f++) {
    const { base, dx, seg } = fingers[f];
    const c = curls[f + 1];
    const mx = dx;
    const my = -1.0;
    put(base, mx, my); // MCP

    // 손가락이 위(-y)를 향한 상태에서 시작해 관절마다 손바닥 쪽으로 누적 회전
    let x = mx;
    let y = my;
    let ang = -Math.PI / 2; // 위쪽
    for (let j = 0; j < 3; j++) {
      ang += c * MAX_FLEX[j]; // 굽을수록 아래(+y)로 돌아온다
      x += Math.cos(ang) * seg * 0.15;
      y += Math.sin(ang) * seg;
      put(base + j + 1, x, y);
    }
  }

  // 엄지: 옆으로 뻗는다. 접혀도 옆으로 남아 있으므로 openness 계산에서 제외했다.
  const tc = curls[0];
  put(1, -0.5, -0.25);
  put(2, -0.8, -0.5);
  put(3, -1.0, -0.75);
  let tipX = -1.1;
  let tipY = -1.0 + tc * 0.5;
  // 핀치: 엄지 TIP을 검지 TIP으로 보간
  if (thumbToIndex > 0) {
    const it = lm[8];
    const ix = (it.x - cx) / s;
    const iy = (it.y - cy) / s;
    tipX = tipX + (ix - tipX) * thumbToIndex;
    tipY = tipY + (iy - tipY) * thumbToIndex;
  }
  put(4, tipX, tipY);

  return lm;
}

if (process.env.CURVE) {
  console.log("curl → openness 곡선");
  for (let c = 0; c <= 1.001; c += 0.1) {
    const h = makeHand({ curl: c });
    console.log(`  curl ${c.toFixed(1)}  openness ${openness(h).toFixed(3)}`);
  }
  process.exit(0);
}

console.log("═══ 제스처 검증 ═══\n");

// ─── 1. 손 크기 척도는 제스처와 무관해야 한다 ────────────────────────
console.log("1. handScale은 손 모양이 바뀌어도 일정해야 한다");
{
  const open = handScale(makeHand({ curl: 0 }));
  const fist = handScale(makeHand({ curl: 1 }));
  const pinch = handScale(makeHand({ curl: 0, thumbToIndex: 0.95 }));
  check(
    "  펼침 vs 주먹 척도 동일",
    Math.abs(open - fist) / open < 0.02,
    `${open.toFixed(4)} vs ${fist.toFixed(4)}`,
  );
  check(
    "  펼침 vs 핀치 척도 동일",
    Math.abs(open - pinch) / open < 0.02,
    `${open.toFixed(4)} vs ${pinch.toFixed(4)}`,
  );
  // 카메라와의 거리가 2배여도 정규화된 판정은 같아야 한다
  const near = readHand(makeHand({ curl: 0, s: 0.24 }));
  const far = readHand(makeHand({ curl: 0, s: 0.08 }));
  check("  카메라 거리 무관 (가까이/멀리 모두 open)", near.kind === "open" && far.kind === "open",
    `${near.kind}/${far.kind}`);
  check(
    "  거리가 달라도 openness 동일",
    Math.abs(near.openness - far.openness) < 0.02,
    `${near.openness.toFixed(3)} vs ${far.openness.toFixed(3)}`,
  );
}

// ─── 2. 펼침 / 핀치 / 주먹 판정 ──────────────────────────────────────
console.log("2. 펼침 / 핀치 / 주먹 판정");
{
  const open = readHand(makeHand({ curl: 0 }));
  check("  활짝 편 손 → open", open.kind === "open", `kind=${open.kind}`);

  const fist = readHand(makeHand({ curl: 1 }));
  check("  주먹 → fist", fist.kind === "fist", `kind=${fist.kind}`);

  // 엄지·검지만 편 'L' 자세. 핀치를 시작하는 자세다.
  const ell = readHand(makeHand({ curl: [0, 0, 1, 1, 1] }));
  check("  엄지·검지만 편 손 → pinch", ell.kind === "pinch",
    `kind=${ell.kind} indexOpen=${ell.indexOpen.toFixed(3)} others=${ell.othersOpen.toFixed(3)}`);

  // 끝을 맞붙인 핀치. 이게 주먹으로 읽히면 축소하다가 '쥐었다 펴기'가 무장된다.
  const closed = readHand(makeHand({ curl: [0, 0.3, 1, 1, 1], thumbToIndex: 0.95 }));
  check("  끝을 붙인 핀치 → pinch (주먹 아님)", closed.kind === "pinch",
    `kind=${closed.kind} indexOpen=${closed.indexOpen.toFixed(3)}`);

  // ⚠️ 이게 판정 규칙의 존재 이유다. 손을 편 채로 엄지·검지가 가까워져도(OK 사인)
  //    핀치로 읽히면 안 된다 — 둘러보다가 배율이 바뀐다.
  const ok = readHand(makeHand({ curl: [0, 0.3, 0, 0, 0], thumbToIndex: 0.95 }));
  check("  나머지 세 손가락을 편 채 엄지·검지를 붙여도 → open", ok.kind === "open",
    `kind=${ok.kind}`);

  const half = readHand(makeHand({ curl: 0.5 }));
  check("  반쯤 접은 손은 어느 쪽도 아님", half.kind === "none", `kind=${half.kind}`);

  // 주먹에서 손을 펴는 도중. 다섯 손가락이 함께 펴지는 동안은 핀치가 아니어야
  // 한다 — 새면 펴는 순간 배율이 흔들린다. (검지가 먼저 펴지는 경우는
  // HandControls가 PINCH_ENGAGE_S만큼 기다려서 거른다.)
  for (const c of [0.45, 0.5, 0.55, 0.6]) {
    const opening = readHand(makeHand({ curl: [0, c, c, c, c] }));
    check(`  주먹→펼침 중간 자세(curl ${c})는 핀치가 아님`, opening.kind !== "pinch",
      `kind=${opening.kind} index=${opening.indexOpen.toFixed(3)} others=${opening.othersOpen.toFixed(3)}`);
  }
}

// ─── 3. 핀치 → 배율 ──────────────────────────────────────────────────
console.log("3. 엄지-검지 벌림의 변화로 배율");
{
  // ⚠️ 손 크기로 나눈 비율이라 카메라와의 거리가 배율에 섞이면 안 된다.
  const near = readHand(makeHand({ curl: [0, 0, 1, 1, 1], thumbToIndex: 0.3, s: 0.18 }));
  const far = readHand(makeHand({ curl: [0, 0, 1, 1, 1], thumbToIndex: 0.3, s: 0.08 }));
  near2(near.aperture, far.aperture, 1e-6, "  거리가 달라도 벌림은 같다");

  const wide = readHand(makeHand({ thumbToIndex: 0 }));
  const tight = readHand(makeHand({ thumbToIndex: 0.9 }));
  check("  벌릴수록 값이 크다", wide.aperture > tight.aperture,
    `${wide.aperture.toFixed(2)} vs ${tight.aperture.toFixed(2)}`);

  check("  벌리면 확대", zoomStep(2, 0.2) > 2, `${zoomStep(2, 0.2).toFixed(3)}`);
  check("  좁히면 축소", zoomStep(2, -0.2) < 2, `${zoomStep(2, -0.2).toFixed(3)}`);
  near2(zoomStep(zoomStep(2, 0.3), -0.3), 2, 1e-9, "  벌렸다 같은 만큼 좁히면 제자리");
  // 감도: 예전 절대 매핑은 벌림 전 구간(0.3→1.25)에 ×8이었다. 지금은 그 0.8배 속도다.
  near2(zoomStep(1, APERTURE_MAX - APERTURE_MIN), Math.pow(8, PINCH_SENSITIVITY), 1e-9,
    "  감도 0.8 — 예전 전 구간에서 ×8^0.8");
  near2(PINCH_SENSITIVITY, 0.8, 1e-12, "  감도 상수는 0.8");
  // 배율은 곱셈 축 — 같은 손짓은 어느 배율에서든 같은 비율만큼 바꾼다
  near2(zoomStep(1.5, 0.1) / 1.5, zoomStep(3, 0.1) / 3, 1e-9, "  같은 손짓 = 같은 비율");
  near2(zoomStep(1, -5), 1, 1e-9, "  최소 배율에서 물린다");
  near2(zoomStep(8, 5), 8, 1e-9, "  최대 배율에서 물린다");
}

// ─── 4. 미러링 ───────────────────────────────────────────────────────
console.log("4. 전면 카메라 미러링");
{
  const right = readHand(makeHand({ curl: 0, cx: 0.8 }), true);
  const left = readHand(makeHand({ curl: 0, cx: 0.2 }), true);
  // 영상에서 x=0.8(오른쪽)에 있으면, 미러링 후에는 x=0.2가 되어야 한다
  check("  x 반전됨", right.cx < 0.5 && left.cx > 0.5,
    `right→${right.cx.toFixed(2)} left→${left.cx.toFixed(2)}`);
  const noMirror = readHand(makeHand({ curl: 0, cx: 0.8 }), false);
  check("  미러링 끄면 그대로", noMirror.cx > 0.5, `${noMirror.cx.toFixed(2)}`);
}

// ─── 5. 손바닥 중심은 손가락 움직임에 흔들리지 않아야 한다 ───────────
console.log("5. 손바닥 중심 안정성");
{
  const a = readHand(makeHand({ curl: 0, cx: 0.5, cy: 0.5 }));
  const b = readHand(makeHand({ curl: 1, cx: 0.5, cy: 0.5 }));
  const drift = Math.hypot(a.cx - b.cx, a.cy - b.cy);
  // 손가락을 다 접어도 중심이 거의 안 움직여야 팬이 떨리지 않는다
  check("  손가락 접어도 중심 고정", drift < 0.005, `drift=${drift.toFixed(5)}`);

  const moved = readHand(makeHand({ curl: 0, cx: 0.7, cy: 0.3 }));
  check("  손을 옮기면 중심도 따라감",
    Math.abs(moved.cy - a.cy) > 0.15, `Δy=${(moved.cy - a.cy).toFixed(3)}`);
}

// ─── 6. 중간 자세는 어느 쪽으로도 잡히지 않아야 한다 ─────────────────
console.log("6. 애매한 자세는 none");
{
  const half = readHand(makeHand({ curl: 0.5 }));
  check("  반쯤 접은 손 → none", half.kind === "none",
    `kind=${half.kind} openness=${half.openness.toFixed(3)}`);
}

// ─── 7. 주먹 쥐었다 펴기 ─────────────────────────────────────────────
console.log("7. 주먹 쥐었다 펴기는 순서로 판정한다");
{
  const dt = 1 / 30;
  /** 판정 열을 30fps로 흘려 넣고 발화 횟수를 센다. [kind, 초] 쌍의 배열. */
  const run = (seq, g = createGrasp(), t0 = 0) => {
    let t = t0;
    let fired = 0;
    for (const [kind, sec] of seq) {
      const n = Math.max(1, Math.round(sec / dt));
      for (let i = 0; i < n; i++) {
        if (stepGrasp(g, kind, t)) fired++;
        t += dt;
      }
    }
    return { fired, g, t };
  };

  check("  쥐었다 펴면 한 번 발화",
    run([["open", 0.3], ["fist", 0.3], ["open", 0.3]]).fired === 1);
  check("  펴기만 해서는 발화하지 않음", run([["open", 1.0]]).fired === 0);
  check("  주먹만 쥐고 있으면 발화하지 않음", run([["fist", 1.0]]).fired === 0);
  check("  스치듯 짧은 주먹은 무시",
    run([["open", 0.3], ["fist", GRASP_HOLD_S / 2], ["open", 0.3]]).fired === 0);
  check("  펴는 도중의 중간 자세·인식 끊김은 무장을 풀지 않음",
    run([["fist", 0.3], ["none", 0.1], [null, 0.07], ["pinch", 0.1], ["open", 0.2]]).fired === 1);
  check("  한참 뒤에 펴면 없던 일",
    run([["fist", 0.3], ["none", GRASP_WINDOW_S + 0.2], ["open", 0.3]]).fired === 0);
  check("  편 채로 있어도 다시 발화하지 않음",
    run([["fist", 0.3], ["open", 2.0]]).fired === 1);
  check("  두 번 하면 두 번 발화 (열기 → 닫기)",
    run([["fist", 0.3], ["open", 0.6], ["fist", 0.3], ["open", 0.3]]).fired === 2);
  check("  쿨다운 안의 떨림은 두 번째로 치지 않음",
    run([["fist", 0.3], ["open", 0.05], ["fist", GRASP_HOLD_S + 0.05], ["open", 0.2]]).fired === 1,
    `cooldown=${GRASP_COOLDOWN_S}`);
  {
    const { g, t } = run([["fist", 0.3]]);
    check("  주먹을 충분히 쥐면 무장 표시", graspArmed(g, t));
  }
  {
    const { g, t } = run([["fist", GRASP_HOLD_S / 2]]);
    check("  짧게 쥐면 아직 무장 아님", !graspArmed(g, t));
  }
}

console.log(`\n═══ ${pass} 통과 / ${fail} 실패 ═══`);
if (fail) {
  console.log("\n실패 항목:");
  for (const f of failures) console.log("  ✗", f);
  process.exit(1);
}
console.log("모두 통과.");
