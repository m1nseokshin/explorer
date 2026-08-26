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
  pinchDistance,
  handScale,
  zoomRateFromDepth,
  DEPTH_DEADZONE,
  DEPTH_MAX_RATE,
} from "../lib/gestures.ts";

let pass = 0;
let fail = 0;
const failures = [];
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
  const near = readHand(makeHand({ curl: 0, s: 0.24 }), false);
  const far = readHand(makeHand({ curl: 0, s: 0.08 }), false);
  check("  카메라 거리 무관 (가까이/멀리 모두 open)", near.kind === "open" && far.kind === "open",
    `${near.kind}/${far.kind}`);
  check(
    "  거리가 달라도 openness 동일",
    Math.abs(near.openness - far.openness) < 0.02,
    `${near.openness.toFixed(3)} vs ${far.openness.toFixed(3)}`,
  );
}

// ─── 2. 기본 3종 판정 ────────────────────────────────────────────────
console.log("2. 펼침 / 주먹 / 핀치 판정");
{
  const open = readHand(makeHand({ curl: 0 }), false);
  check("  완전히 편 손 → open", open.kind === "open", `kind=${open.kind} openness=${open.openness.toFixed(3)}`);

  const fist = readHand(makeHand({ curl: 1 }), false);
  check("  완전히 쥔 주먹 → fist", fist.kind === "fist", `kind=${fist.kind} openness=${fist.openness.toFixed(3)}`);

  const pinch = readHand(makeHand({ curl: 0, thumbToIndex: 0.92 }), false);
  check("  엄지-검지 붙임 → pinch", pinch.kind === "pinch",
    `kind=${pinch.kind} pinchDist=${pinch.pinchDist.toFixed(3)}`);

  // 핀치는 openness보다 우선해야 한다. 순서를 뒤집으면 '펼침'으로 오독된다.
  check("  핀치가 펼침보다 우선", pinch.kind === "pinch" && pinch.openness > 0.5,
    `openness=${pinch.openness.toFixed(3)}`);
}

// ─── 3. 히스테리시스 — 경계에서 떨리지 않아야 한다 ───────────────────
console.log("3. 핀치 히스테리시스");
{
  // PINCH_ON(0.42)과 PINCH_OFF(0.62) 사이 구간에서는 직전 상태를 유지해야 한다
  let between = null;
  for (let t = 0.5; t <= 0.95; t += 0.01) {
    const h = makeHand({ curl: 0, thumbToIndex: t });
    const d = pinchDistance(h);
    if (d > 0.42 && d < 0.62) { between = { h, d }; break; }
  }
  check("  중간 구간 샘플 확보", between !== null, between ? `d=${between.d.toFixed(3)}` : "없음");
  if (between) {
    const held = readHand(between.h, true);
    const notHeld = readHand(between.h, false);
    check("  중간 구간: 핀치 중이면 유지", held.kind === "pinch", `kind=${held.kind}`);
    check("  중간 구간: 핀치 아니면 유지 안 함", notHeld.kind !== "pinch", `kind=${notHeld.kind}`);
  }
}

// ─── 4. 미러링 ───────────────────────────────────────────────────────
console.log("4. 전면 카메라 미러링");
{
  const right = readHand(makeHand({ curl: 0, cx: 0.8 }), false, true);
  const left = readHand(makeHand({ curl: 0, cx: 0.2 }), false, true);
  // 영상에서 x=0.8(오른쪽)에 있으면, 미러링 후에는 x=0.2가 되어야 한다
  check("  x 반전됨", right.cx < 0.5 && left.cx > 0.5,
    `right→${right.cx.toFixed(2)} left→${left.cx.toFixed(2)}`);
  const noMirror = readHand(makeHand({ curl: 0, cx: 0.8 }), false, false);
  check("  미러링 끄면 그대로", noMirror.cx > 0.5, `${noMirror.cx.toFixed(2)}`);
}

// ─── 5. 손바닥 중심은 손가락 움직임에 흔들리지 않아야 한다 ───────────
console.log("5. 손바닥 중심 안정성");
{
  const a = readHand(makeHand({ curl: 0, cx: 0.5, cy: 0.5 }), false);
  const b = readHand(makeHand({ curl: 1, cx: 0.5, cy: 0.5 }), false);
  const drift = Math.hypot(a.cx - b.cx, a.cy - b.cy);
  // 손가락을 다 접어도 중심이 거의 안 움직여야 팬이 떨리지 않는다
  check("  손가락 접어도 중심 고정", drift < 0.005, `drift=${drift.toFixed(5)}`);

  const moved = readHand(makeHand({ curl: 0, cx: 0.7, cy: 0.3 }), false);
  check("  손을 옮기면 중심도 따라감",
    Math.abs(moved.cy - a.cy) > 0.15, `Δy=${(moved.cy - a.cy).toFixed(3)}`);
}

// ─── 6. 중간 자세는 어느 쪽으로도 잡히지 않아야 한다 ─────────────────
console.log("6. 애매한 자세는 none");
{
  const half = readHand(makeHand({ curl: 0.5 }), false);
  check("  반쯤 접은 손 → none", half.kind === "none",
    `kind=${half.kind} openness=${half.openness.toFixed(3)}`);
}

// ─── 7. 손가락 하나만 편 경우 (가리키기) ─────────────────────────────
console.log("7. 검지만 편 손은 open이 아니어야 한다");
{
  const point = readHand(makeHand({ curl: [0, 0, 1, 1, 1] }), false);
  check("  가리키기 → open 아님", point.kind !== "open",
    `kind=${point.kind} openness=${point.openness.toFixed(3)}`);
}

// ─── 8. 깊이 줌: 미는 방향이 곧 확대/축소 ────────────────────────────
console.log("8. 깊이 줌 매핑");
{
  check("  기준 그대로면 정지", zoomRateFromDepth(1) === 0,
    `rate=${zoomRateFromDepth(1)}`);

  // 불감대 안(±6%)에서는 움직이지 않아야 한다 — 손 떨림이 그만큼 된다
  const inside = Math.exp(DEPTH_DEADZONE * 0.9);
  check("  불감대 안은 정지", zoomRateFromDepth(inside) === 0,
    `ratio=${inside.toFixed(3)} rate=${zoomRateFromDepth(inside)}`);

  check("  가까이(비율>1) → 확대", zoomRateFromDepth(1.3) > 0,
    `rate=${zoomRateFromDepth(1.3).toFixed(3)}`);
  check("  멀리(비율<1) → 축소", zoomRateFromDepth(1 / 1.3) < 0,
    `rate=${zoomRateFromDepth(1 / 1.3).toFixed(3)}`);

  // 로그를 쓰므로 밀고 당기는 감도가 대칭이어야 한다
  const sym = Math.abs(zoomRateFromDepth(1.3) + zoomRateFromDepth(1 / 1.3));
  check("  밀기/당기기 감도 대칭", sym < 1e-9, `차이=${sym.toExponential(2)}`);

  check("  튀는 프레임은 상한에 걸림",
    Math.abs(zoomRateFromDepth(50)) === DEPTH_MAX_RATE,
    `rate=${zoomRateFromDepth(50)}`);

  check("  비정상 입력은 0", zoomRateFromDepth(0) === 0 && zoomRateFromDepth(-1) === 0);
}

console.log(`\n═══ ${pass} 통과 / ${fail} 실패 ═══`);
if (fail) {
  console.log("\n실패 항목:");
  for (const f of failures) console.log("  ✗", f);
  process.exit(1);
}
console.log("모두 통과.");
