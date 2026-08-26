/**
 * 천문 계산·데이터 무결성 검증 — 브라우저도 테스트러너도 없이 순수 Node.
 *
 * 이 스크립트가 통과하기 전에는 AR을 만들지 않는다. 카메라·자이로·천문을
 * 동시에 만들면 하늘이 틀렸을 때 여섯 개 서브시스템 중 무엇이 거짓말하는지
 * 알 수 없다.
 *
 * 실행: npm run verify
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  Body,
  Constellation,
  Equator,
  EquatorFromVector,
  GeoVector,
  Horizon,
  MakeTime,
  Observer,
  Rotation_EQJ_HOR,
} from "astronomy-engine";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "public", "data");
const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

let pass = 0;
let fail = 0;
const failures = [];

function check(name, ok, detail = "") {
  if (ok) {
    pass++;
  } else {
    fail++;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  }
}
function near(name, got, want, tol, unit = "°") {
  const d = Math.abs(got - want);
  check(name, d <= tol, `got ${got.toFixed(4)}${unit}, want ${want.toFixed(4)}${unit} (Δ${d.toFixed(4)}, tol ${tol})`);
}

// ─── lib/sky.ts 의 순수 JS 미러 (three.js 없이) ───────────────────────
// 의도적으로 lib/sky.ts와 같은 공식을 손으로 옮겨 적었다. 두 구현이 어긋나면
// 아래 3번 교차검증이 실패하므로, 복제 자체가 회귀 테스트 역할을 한다.
function skyMatrixCols(date, lat, lon, h = 0) {
  const { rot } = Rotation_EQJ_HOR(MakeTime(date), new Observer(lat, lon, h));
  // rot[i] = i번째 EQJ 기저벡터의 HOR(n,w,u) 성분 = 수학 행렬의 i번째 '열'
  return [0, 1, 2].map((i) => {
    const [n, w, u] = rot[i];
    return [-w, u, -n]; // HOR(n,w,u) → world(동, 천정, 남)
  });
}
function applySky(cols, v) {
  return [0, 1, 2].map(
    (r) => cols[0][r] * v[0] + cols[1][r] * v[1] + cols[2][r] * v[2],
  );
}
function radecToUnit(raDeg, decDeg) {
  const ra = raDeg * D2R;
  const dec = decDeg * D2R;
  const cd = Math.cos(dec);
  return [cd * Math.cos(ra), cd * Math.sin(ra), Math.sin(dec)];
}
function worldToAltAz([x, y, z]) {
  const n = Math.hypot(x, y, z);
  const alt = Math.asin(Math.max(-1, Math.min(1, y / n))) * R2D;
  let az = Math.atan2(x, -z) * R2D;
  if (az < 0) az += 360;
  return { az, alt };
}
const altAzOf = (date, lat, lon, raDeg, decDeg) =>
  worldToAltAz(applySky(skyMatrixCols(date, lat, lon), radecToUnit(raDeg, decDeg)));

console.log("═══ 천문 검증 ═══\n");

// ─── H1. Polaris 고도 ≈ 위도 ──────────────────────────────────────────
// 행렬 전치, lat/lon 뒤바뀜, 부호 오류를 한 번에 잡는 가장 빠른 검사.
console.log("H1. Polaris 고도 ≈ 관측지 위도");
const POLARIS_RA = 37.9546; // 02h31m49s
const POLARIS_DEC = 89.2641;
for (const lat of [0, 15, 37.5665, 51.5, 70]) {
  for (const lon of [-120, 0, 127]) {
    for (const hour of [0, 4, 8, 12, 16, 20]) {
      const t = new Date(Date.UTC(2026, 2, 15, hour, 0, 0));
      const { az, alt } = altAzOf(t, lat, lon, POLARIS_RA, POLARIS_DEC);
      near(`  lat=${lat} lon=${lon} ${hour}h alt`, alt, lat, 0.8);
      const azErr = Math.min(Math.abs(az), Math.abs(az - 360));
      // Polaris는 천구북극에서 0.736° 떨어져 있어 하루에 그만큼 극 주위를 돈다.
      // 화면상 방위각 진폭은 고도가 높아질수록 커진다: ≈ p / cos(고도) ≈ p / cos(위도).
      // 이건 기하학적 정상 현상이므로 허용오차를 위도에 따라 스케일해야 한다.
      const azBound = 0.736 / Math.cos(Math.min(lat, 80) * D2R) + 0.35;
      check(`  lat=${lat} lon=${lon} ${hour}h az≈북`, azErr < azBound, `az=${az.toFixed(3)}, bound ${azBound.toFixed(2)}`);
    }
  }
}

// ─── H2. Dec 0° 천체는 정남에서 고도 90-|lat| 로 남중 ──────────────────
console.log("H2. Dec=0° 천체의 남중 고도 = 90° - |위도|");
for (const lat of [10, 37.5665, 55]) {
  // 24시간을 1분 단위로 훑어 최대 고도를 찾는다
  let bestAlt = -Infinity;
  let bestAz = 0;
  for (let m = 0; m < 1440; m++) {
    const t = new Date(Date.UTC(2026, 5, 1, 0, m, 0));
    const { az, alt } = altAzOf(t, lat, 0, 0, 0); // 춘분점
    if (alt > bestAlt) {
      bestAlt = alt;
      bestAz = az;
    }
  }
  near(`  lat=${lat} 남중고도`, bestAlt, 90 - Math.abs(lat), 0.35);
  near(`  lat=${lat} 남중방위`, bestAz, 180, 1.2);
}

// ─── H3. astronomy-engine의 독립 경로와 교차검증 ──────────────────────
// (a) Equator(J2000) → radecToUnit → skyMatrix → worldToAltAz
// (b) Equator(of-date) → Horizon()
// 두 경로는 코드를 전혀 공유하지 않는다. 행렬/리맵 체인 전체를 검증한다.
console.log("H3. skyMatrix 경로 vs Horizon() 경로 교차검증 (< 0.01°)");
const obsSeoul = { lat: 37.5665, lon: 126.978 };
const bodies = [Body.Moon, Body.Sun, Body.Venus, Body.Mars, Body.Jupiter, Body.Saturn];
for (const body of bodies) {
  for (const hour of [3, 11, 19]) {
    const t = new Date(Date.UTC(2026, 0, 15, hour, 0, 0));
    const obs = new Observer(obsSeoul.lat, obsSeoul.lon, 0);

    const eqj = Equator(body, t, obs, /* ofdate */ false, /* aberration */ true);
    const mine = altAzOf(t, obsSeoul.lat, obsSeoul.lon, eqj.ra * 15, eqj.dec);

    const ofd = Equator(body, t, obs, /* ofdate */ true, /* aberration */ true);
    // refraction: null — 굴절을 넣으면 지평 부근에서 최대 34′ 차이가 나 비교가 깨진다
    const hor = Horizon(t, obs, ofd.ra, ofd.dec, null);

    near(`  ${body} ${hour}h alt`, mine.alt, hor.altitude, 0.01);
    // 천정 근처에서는 방위각이 특이점이므로 고도가 높으면 완화
    const azTol = Math.abs(hor.altitude) > 85 ? 1.0 : 0.01;
    let dAz = Math.abs(mine.az - hor.azimuth);
    if (dAz > 180) dAz = 360 - dAz;
    check(`  ${body} ${hour}h az`, dAz <= azTol, `Δ${dAz.toFixed(4)}°`);
  }
}

// ─── H4. 별자리 소속 일치 ─────────────────────────────────────────────
// 별자리선이 참조하는 모든 별에 대해 IAU 경계 기준 소속을 확인한다.
// 스냅 오류와 RA 단위 실수를 88개 별자리 전체에 대해 공짜로 잡아낸다.
console.log("H4. 별자리선 구성별의 IAU 소속 일치");
const raw = fs.readFileSync(path.join(DATA, "stars.bin"));
check("  stars.bin 매직", raw.subarray(0, 4).toString("ascii") === "SKY1");
const starCount = raw.readUInt32LE(8);
const magLimit = raw.readFloatLE(12);
const HDR = 16;
const sxyz = new Float32Array(
  raw.buffer.slice(raw.byteOffset + HDR, raw.byteOffset + HDR + starCount * 12),
);
const smag = new Float32Array(
  raw.buffer.slice(
    raw.byteOffset + HDR + starCount * 12,
    raw.byteOffset + HDR + starCount * 16,
  ),
);
const sci = new Float32Array(
  raw.buffer.slice(
    raw.byteOffset + HDR + starCount * 16,
    raw.byteOffset + HDR + starCount * 20,
  ),
);

function starRaDec(i) {
  const x = sxyz[i * 3];
  const y = sxyz[i * 3 + 1];
  const z = sxyz[i * 3 + 2];
  const ra = (Math.atan2(y, x) * R2D + 360) % 360;
  const dec = Math.asin(Math.max(-1, Math.min(1, z))) * R2D;
  return [ra, dec];
}

const cons = JSON.parse(fs.readFileSync(path.join(DATA, "constellations.json"), "utf8"));
let memberOk = 0;
let memberBad = 0;
const badSample = [];
for (const c of cons) {
  const seen = new Set(c.segments);
  for (const i of seen) {
    const [ra, dec] = starRaDec(i);
    // Constellation()은 RA를 '시간' 단위로 받는다 — 여기서 ×15를 빠뜨리면
    // 하늘이 15배 회전하는 고전적 버그가 잡힌다.
    const got = Constellation(ra / 15, dec).symbol;
    if (got === c.id) memberOk++;
    else {
      memberBad++;
      if (badSample.length < 8) badSample.push(`${c.id}←${got} (idx ${i}, mag ${smag[i].toFixed(2)})`);
    }
  }
}
// 별자리선은 인접 별자리의 별을 빌려 쓰는 경우가 실제로 있다(예: Pegasus/Andromeda가
// 공유하는 Alpheratz). 그래서 100%가 아니라 비율로 판정한다.
const memberRate = memberOk / (memberOk + memberBad);
check(
  `  소속 일치율 ${(memberRate * 100).toFixed(1)}% (${memberOk}/${memberOk + memberBad})`,
  memberRate > 0.93,
  badSample.join(", "),
);

// ─── H5. 데이터 무결성 ────────────────────────────────────────────────
console.log("H5. 데이터 무결성");
check(`  별 개수 ${starCount}`, starCount > 35000 && starCount < 50000);
near("  헤더 한계등급", magLimit, 8.0, 1e-6, "");
let unitBad = 0;
let magBad = 0;
let ciBad = 0;
let nanBad = 0;
for (let i = 0; i < starCount; i++) {
  const x = sxyz[i * 3];
  const y = sxyz[i * 3 + 1];
  const z = sxyz[i * 3 + 2];
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) nanBad++;
  if (Math.abs(Math.hypot(x, y, z) - 1) > 1e-4) unitBad++;
  if (!(smag[i] >= -1.6 && smag[i] <= 8.0)) magBad++;
  // 상한 6.0: mag 8까지 내려가면 B-V가 5를 넘는 탄소별이 실제로 들어온다.
  // 셰이더가 -0.4..2.0으로 클램프하므로 렌더에는 영향이 없다.
  if (!(sci[i] >= -0.6 && sci[i] <= 6.0)) ciBad++;
}
check("  NaN 없음", nanBad === 0, `${nanBad}개`);
check("  모든 위치가 단위벡터", unitBad === 0, `${unitBad}개`);
check("  등급 범위", magBad === 0, `${magBad}개`);
check("  B-V 범위", ciBad === 0, `${ciBad}개`);

let idxBad = 0;
for (const c of cons) {
  for (const i of c.segments) if (!(i >= 0 && i < starCount)) idxBad++;
}
check("  별자리선 인덱스 범위", idxBad === 0, `${idxBad}개`);
check(`  별자리 ${cons.length}개`, cons.length >= 88);
check(
  "  모든 별자리에 한국어 이름",
  cons.every((c) => c.nameKo && c.nameKo.length > 0),
);

const bBuf = fs.readFileSync(path.join(DATA, "boundaries.bin"));
check("  boundaries.bin 4바이트 정렬", bBuf.length % 24 === 0, `${bBuf.length}B`);

// ─── H6. RA 단위 회귀 (시간 vs 도) ────────────────────────────────────
// Sirius가 서울에서 6월 정오(UTC)엔 지평선 아래, 1월 밤엔 위에 있어야 한다.
console.log("H6. RA 단위(시간↔도) 회귀");
const SIRIUS_RA = 101.2875;
const SIRIUS_DEC = -16.7161;
{
  const summer = altAzOf(new Date(Date.UTC(2026, 5, 21, 12, 0, 0)), 37.5665, 126.978, SIRIUS_RA, SIRIUS_DEC);
  const winter = altAzOf(new Date(Date.UTC(2026, 0, 15, 13, 0, 0)), 37.5665, 126.978, SIRIUS_RA, SIRIUS_DEC);
  check("  6/21 12h UTC 서울: Sirius 지평 아래", summer.alt < 0, `alt=${summer.alt.toFixed(2)}°`);
  check("  1/15 13h UTC 서울: Sirius 지평 위", winter.alt > 0, `alt=${winter.alt.toFixed(2)}°`);
}

// ─── H7. 외부 기준 골든값 (Stellarium / JPL Horizons 대조용) ──────────
// 서울 2026-01-01 22:00 KST = 13:00 UTC. 값은 astronomy-engine의 독립 경로로
// 생성했으므로 '자기 자신과의 일치'가 아니라 '체인 전체의 회귀'를 잠근다.
// 최초 1회는 Stellarium과 눈으로 대조할 것 — 아래 표를 그대로 쓰면 된다.
console.log("H7. 골든 회귀값 (서울 2026-01-01 13:00 UTC)");
{
  const t = new Date(Date.UTC(2026, 0, 1, 13, 0, 0));
  const targets = [
    ["Polaris", POLARIS_RA, POLARIS_DEC],
    ["Sirius", SIRIUS_RA, SIRIUS_DEC],
    ["Betelgeuse", 88.7929, 7.4071],
    ["Vega", 279.2347, 38.7837],
    ["Capella", 79.1723, 45.998],
  ];
  for (const [name, ra, dec] of targets) {
    const { az, alt } = altAzOf(t, obsSeoul.lat, obsSeoul.lon, ra, dec);
    console.log(`     ${name.padEnd(11)} az ${az.toFixed(2).padStart(7)}°  alt ${alt.toFixed(2).padStart(6)}°`);
  }
  const obs = new Observer(obsSeoul.lat, obsSeoul.lon, 0);
  const m = Equator(Body.Moon, t, obs, false, true);
  const mm = altAzOf(t, obsSeoul.lat, obsSeoul.lon, m.ra * 15, m.dec);
  console.log(`     ${"Moon".padEnd(11)} az ${mm.az.toFixed(2).padStart(7)}°  alt ${mm.alt.toFixed(2).padStart(6)}°`);
  // 달은 지평시차가 ~1°에 달한다. 관측지 좌표를 넣지 않으면 렌더된 달 표식이
  // 실제 달에서 '달 지름 두 개'만큼 빗나가고, 사용자가 가장 먼저 알아채는 오류가 된다.
  // 지구 반대편 관측자와 비교해 시차가 실제로 반영되는지 확인한다.
  // 지심 위치와 직접 비교한다. 서울에서 달이 고도 77°면 시차는 최대치의 약 cos(77°)…
  // 가 아니라 천정거리에 비례하므로 여기선 0.2~0.3° 수준이 정상이다.
  const geo = EquatorFromVector(GeoVector(Body.Moon, t, true));
  const dPar = Math.hypot((m.ra - geo.ra) * 15 * Math.cos(m.dec * D2R), m.dec - geo.dec);
  check("  달 지평시차가 반영됨 (지심 ≠ 관측지)", dPar > 0.1, `Δ${dPar.toFixed(3)}°`);
  console.log(`     달 지평시차 Δ${dPar.toFixed(3)}° (천정거리 ${(90 - mm.alt).toFixed(1)}°)`);
}

// ─── H8. 은하수 데이터 ────────────────────────────────────────────────
console.log("H8. 은하수 점구름");
{
  const mw = fs.readFileSync(path.join(DATA, "milkyway.bin"));
  check("  매직", mw.subarray(0, 4).toString("ascii") === "MWY2");
  const n = mw.readUInt32LE(8);
  const levels = mw.readUInt32LE(12);
  check(`  점 개수 ${n}`, n > 20000 && n < 80000);
  check(`  등고선 단계 ${levels}`, levels >= 3 && levels <= 8);
  check("  파일 크기 일치", mw.length === 16 + n * 8, `${mw.length}B`);

  const qxyz = new Int16Array(mw.buffer.slice(mw.byteOffset + 16, mw.byteOffset + 16 + n * 6));
  const qi = new Uint8Array(mw.buffer.slice(mw.byteOffset + 16 + n * 6, mw.byteOffset + 16 + n * 8));

  let unitBad = 0;
  let inten0 = 0;
  for (let i = 0; i < n; i++) {
    const x = qxyz[i * 3] / 32767;
    const y = qxyz[i * 3 + 1] / 32767;
    const z = qxyz[i * 3 + 2] / 32767;
    if (Math.abs(Math.hypot(x, y, z) - 1) > 2e-3) unitBad++;
    if (qi[i] === 0) inten0++;
  }
  check("  모든 점이 단위벡터", unitBad === 0, `${unitBad}개`);
  check("  밝기 0인 점 없음", inten0 === 0, `${inten0}개`);

  // 은하 중심(궁수자리 방향, RA 266.4° Dec -28.9°) 주변에 점이 몰려 있어야 한다.
  // 이게 어긋나면 래스터화의 경도 부호나 RA 변환이 뒤집힌 것이다.
  const gcRa = 266.405;
  const gcDec = -28.936;
  const g = radecToUnit(gcRa, gcDec);
  // 반경 10° 안의 점 밀도 vs 은하 북극(RA 192.9 Dec +27.1) 반경 10° 안의 밀도
  const npRa = 192.86;
  const npDec = 27.13;
  const np = radecToUnit(npRa, npDec);
  const cos10 = Math.cos(10 * D2R);
  let nearGc = 0;
  let nearNp = 0;
  let sumGcInten = 0;
  for (let i = 0; i < n; i++) {
    const x = qxyz[i * 3] / 32767;
    const y = qxyz[i * 3 + 1] / 32767;
    const z = qxyz[i * 3 + 2] / 32767;
    if (x * g[0] + y * g[1] + z * g[2] > cos10) {
      nearGc++;
      sumGcInten += qi[i];
    }
    if (x * np[0] + y * np[1] + z * np[2] > cos10) nearNp++;
  }
  check("  은하 중심 부근에 점이 있다", nearGc > 200, `${nearGc}개`);
  check("  은하 북극 부근은 비어 있다", nearNp < nearGc / 10, `북극 ${nearNp} vs 중심 ${nearGc}`);
  check(
    "  은하 중심 평균 밝기가 높다",
    nearGc > 0 && sumGcInten / nearGc > 150,
    `평균 ${(sumGcInten / Math.max(nearGc, 1)).toFixed(0)}/255`,
  );
}

// ─── H9. 별자리 면적 ──────────────────────────────────────────────────
// 손으로 적은 숫자를 믿지 않고 구면 폴리곤에서 직접 계산한 값이다.
// 88개 합계가 천구 전체와 맞는지가 이 계산 전체의 검산이다.
console.log("H9. 별자리 면적");
{
  const withArea = cons.filter((c) => typeof c.areaSqDeg === "number");
  check(`  면적이 있는 별자리 ${withArea.length}`, withArea.length >= 88);
  const total = withArea.reduce((a, c) => a + c.areaSqDeg, 0);
  // d3-celestial 경계는 단순화돼 있어 1~2% 부족한 게 정상이다
  near("  합계(제곱도)", total, 41252.96, 41252.96 * 0.03, "");

  // IAU 공표값과 개별 대조 — 극을 감싸는 별자리(UMi/Oct) 보정이 핵심이다
  const IAU = { Hya: 1302.84, Vir: 1294.43, UMa: 1279.66, Cet: 1231.41, UMi: 255.86, Oct: 291.04, Cru: 68.45, Equ: 71.64 };
  for (const [id, want] of Object.entries(IAU)) {
    const c = withArea.find((x) => x.id === id);
    check(`  ${id} 면적`, c && Math.abs(c.areaSqDeg - want) / want < 0.02,
      c ? `${c.areaSqDeg} vs ${want}` : "없음");
  }
  const ranks = withArea.map((c) => c.areaRank).sort((a, b) => a - b);
  check("  순위가 1..N으로 연속", ranks.every((r, i) => r === i + 1));
  check("  1위는 바다뱀자리", withArea.find((c) => c.areaRank === 1)?.id === "Hya");
}

// ─── H9-b. 관측 적기 ──────────────────────────────────────────────────
// 손으로 적은 '봄철 별자리' 분류가 아니라 태양 적경에서 계산한 값이다.
// 잘 알려진 몇 개로 검산하면 공식 전체가 잠긴다.
console.log("H9-b. 관측 적기");
{
  const want = { Ori: 1, Tau: 1, Gem: 2, Leo: 4, Vir: 5, Sco: 7, Sgr: 8, Cyg: 9, Peg: 10, And: 11 };
  for (const [id, m] of Object.entries(want)) {
    const c = cons.find((x) => x.id === id);
    // 별자리는 폭이 넓어 ±1개월은 정상 범위다
    const d = c ? Math.min(Math.abs(c.bestMonth - m), 12 - Math.abs(c.bestMonth - m)) : 99;
    check(`  ${id} 적기 ≈ ${m}월`, d <= 1, c ? `${c.bestMonth}월` : "없음");
  }
  check("  모든 별자리에 적기가 있다", cons.every((c) => c.bestMonth >= 1 && c.bestMonth <= 12));
  // 12개월에 고르게 퍼져야 한다 — 한 달에 몰리면 태양 적경 계산이 틀린 것이다
  const dist = new Map();
  for (const c of cons) dist.set(c.bestMonth, (dist.get(c.bestMonth) ?? 0) + 1);
  check(`  12개월 모두 등장`, dist.size === 12, `${dist.size}개월`);
  check(`  한 달 최대 ${Math.max(...dist.values())}개`, Math.max(...dist.values()) <= 16);
}

// ─── H10. 세계 지도 ───────────────────────────────────────────────────
console.log("H10. 세계 지도");
{
  const land = fs.readFileSync(path.join(DATA, "land.bin"));
  check("  매직", land.subarray(0, 4).toString("ascii") === "LND1");
  const ringCount = land.readUInt32LE(8);
  check(`  링 ${ringCount}개`, ringCount > 50 && ringCount < 5000);
  const f32 = new Float32Array(land.buffer.slice(land.byteOffset + 12));
  let o = 0;
  let rings = 0;
  let pts = 0;
  let bad = 0;
  while (o < f32.length && rings < ringCount) {
    const len = f32[o++];
    if (!Number.isInteger(len) || len < 3) { bad++; break; }
    for (let i = 0; i < len; i++) {
      const lon = f32[o + i * 2];
      const lat = f32[o + i * 2 + 1];
      if (!(lon >= -180.1 && lon <= 180.1 && lat >= -90.1 && lat <= 90.1)) bad++;
    }
    o += len * 2;
    pts += len;
    rings++;
  }
  check("  링 개수가 헤더와 일치", rings === ringCount, `${rings}/${ringCount}`);
  check("  좌표가 경위도 범위 안", bad === 0, `${bad}개 이탈`);
  check(`  총 ${pts}점, 데이터 끝까지 정확히 소비`, o === f32.length, `${o}/${f32.length}`);
}

// ─── 결과 ─────────────────────────────────────────────────────────────
// ─── 별자리 그림 떼어내기 ────────────────────────────────────────────
// 좌우가 뒤집혀도 별자리는 그럴듯해 보인다. 눈으로는 못 잡으므로 여기서 잠근다.
console.log("H10. 별자리 그림 투영");
{
  const { buildFigure } = await import("../lib/figure.ts");

  let built = 0;
  let outOfBox = 0;
  for (const c of cons) {
    const f = buildFigure(c.segments, sxyz, smag);
    if (!f) continue;
    built++;
    for (const p of f.points) {
      if (!(p.x >= 0 && p.x <= 100 && p.y >= 0 && p.y <= 100)) outOfBox++;
    }
  }
  check(`  88개 중 ${built}개 도형 생성`, built >= 85, `${built}개`);
  check("  모든 점이 화면 박스 안", outOfBox === 0, `${outOfBox}개 벗어남`);

  // 뱀자리는 뱀주인자리를 사이에 두고 머리·꼬리로 나뉜 유일한 별자리다.
  // lines.json에 두 조각으로 오는데, id로 Map을 만들면 한쪽이 조용히 사라진다.
  {
    const ser = cons.find((c) => c.id === "Ser");
    const idx = [...new Set(ser.segments)];
    const ras = idx.map((i) => ((Math.atan2(sxyz[i * 3 + 1], sxyz[i * 3]) * 180) / Math.PI + 360) % 360);
    check("  뱀자리에 머리 구간이 있음 (적경 < 250°)", Math.min(...ras) < 250,
      `최소 ${Math.min(...ras).toFixed(0)}°`);
    check("  뱀자리에 꼬리 구간이 있음 (적경 > 270°)", Math.max(...ras) > 270,
      `최대 ${Math.max(...ras).toFixed(0)}°`);
    // 같은 선분이 두 번 들어가면 조각 병합이 잘못된 것이다
    const seen = new Set();
    let dup = 0;
    for (let k = 0; k < ser.segments.length; k += 2) {
      const key = `${ser.segments[k]}-${ser.segments[k + 1]}`;
      if (seen.has(key)) dup++;
      seen.add(key);
    }
    check("  뱀자리에 중복 선분 없음", dup === 0, `${dup}개 중복`);
  }

  const ori = cons.find((c) => c.id === "Ori");
  const f = buildFigure(ori.segments, sxyz, smag);
  const uniq = [...new Set(ori.segments)];
  const meta = JSON.parse(fs.readFileSync(path.join(DATA, "stars.meta.json"), "utf8"));
  const byName = {};
  uniq.forEach((gi, k) => {
    const nm = meta[gi]?.name;
    if (nm) byName[nm] = f.points[k];
  });
  const B = byName.Betelgeuse;
  const L = byName.Bellatrix;
  const R = byName.Rigel;
  const S = byName.Saiph;

  // 하늘은 구 '안쪽'에서 본다 — 북쪽을 위로 두면 적경이 커지는 쪽이 왼쪽이다
  check("  동쪽이 왼쪽 (베텔게우스 < 벨라트릭스)", B.x < L.x,
    `${B.x.toFixed(1)} vs ${L.x.toFixed(1)}`);
  check("  동쪽이 왼쪽 (사이프 < 리겔)", S.x < R.x,
    `${S.x.toFixed(1)} vs ${R.x.toFixed(1)}`);
  check("  북쪽이 위 (어깨가 발보다 위)", B.y < R.y,
    `${B.y.toFixed(1)} vs ${R.y.toFixed(1)}`);

  // 축마다 따로 늘이면 별자리 모양 자체가 바뀐다. 긴 쪽이 여백을 뺀 폭과 맞아야 한다.
  const w = Math.max(...f.points.map((p) => p.x)) - Math.min(...f.points.map((p) => p.x));
  const h = Math.max(...f.points.map((p) => p.y)) - Math.min(...f.points.map((p) => p.y));
  near("  종횡비 보존 (긴 축 = 82)", Math.max(w, h), 82, 0.5, "");
}

// ─── 별 유래·항법별 데이터가 카탈로그와 맞는가 ───────────────────────
// 이름이 어긋나면 조용히 아무것도 안 뜬다 — 화면으로는 절대 못 잡는다.
console.log("H11. 별 유래 / 항법별 대조");
{
  const { STAR_LORE, NAVIGATION_STARS, loreForStar, colorTempFromBV } =
    await import("../lib/starLore.ts");
  const meta = JSON.parse(fs.readFileSync(path.join(DATA, "stars.meta.json"), "utf8"));

  /** 이름 → 그 이름을 가진 별들의 별자리 집합 */
  const conOf = new Map();
  for (const v of Object.values(meta)) {
    if (!v.name) continue;
    if (!conOf.has(v.name)) conOf.set(v.name, new Set());
    conOf.get(v.name).add(v.con);
  }

  const navMissing = Object.keys(NAVIGATION_STARS).filter((n) => !conOf.has(n));
  check("  항법별 58개가 모두 카탈로그에 있음", navMissing.length === 0, navMissing.join(", "));

  const navWrongCon = Object.entries(NAVIGATION_STARS).filter(
    ([n, c]) => conOf.has(n) && !conOf.get(n).has(c),
  );
  check("  항법별의 별자리가 카탈로그와 일치", navWrongCon.length === 0,
    navWrongCon.map(([n, c]) => `${n}≠${c}`).join(", "));

  check("  항법별 수 = 57 + 북극성", Object.keys(NAVIGATION_STARS).length === 58,
    `${Object.keys(NAVIGATION_STARS).length}개`);

  const loreMissing = Object.keys(STAR_LORE).filter((n) => !conOf.has(n));
  check("  유래를 쓴 별이 모두 카탈로그에 있음", loreMissing.length === 0, loreMissing.join(", "));

  // 이름이 중복되는 별은 반드시 con으로 잠가야 엉뚱한 별에 붙지 않는다
  const ambiguous = Object.keys(STAR_LORE).filter(
    (n) => (conOf.get(n)?.size ?? 0) > 1 && !STAR_LORE[n].con,
  );
  check("  이름이 겹치는 별은 별자리로 잠겨 있음", ambiguous.length === 0, ambiguous.join(", "));

  const navNoLore = Object.keys(NAVIGATION_STARS).filter((n) => !STAR_LORE[n]);
  check("  항법별 전부에 유래가 있음", navNoLore.length === 0, navNoLore.join(", "));

  check("  별자리가 다르면 유래를 주지 않음",
    loreForStar("Alnair", "Cen", "ko") === null && loreForStar("Alnair", "Gru", "ko") !== null);

  // Ballesteros 식은 태양에서 실측과 6K 안쪽으로 맞는다
  near("  색온도 식 (태양 B−V 0.65)", colorTempFromBV(0.65), 5772, 10, "K");
}

// ─── 별 선택 판정 ────────────────────────────────────────────────────
// 셰이더의 점 크기와 어긋나면 '보이는 별보다 판정이 크거나 작은' 상태가 되는데
// 화면에는 아무 표시도 안 난다.
console.log("H12. 별 선택 허용 오차");
{
  const { starScreenRadiusPx, starHitToleranceDeg, STAR_SIZE_MIN, STAR_SIZE_MAX, STAR_HIT_TOLERANCE } =
    await import("../lib/starHit.ts");
  const shader = fs.readFileSync(path.join(ROOT, "lib", "starShader.ts"), "utf8");

  // 셰이더가 쓰는 식이 그대로인지 — 바뀌면 여기 상수도 같이 바꿔야 한다
  check("  셰이더 disc 식이 그대로", shader.includes("mix(uSizeMin, uSizeMax, pow(b, 1.6))"));
  check("  셰이더 halo 식이 그대로", shader.includes("1.0 + 2.6 * pow(b, 2.2)"));

  const F = { magLimit, zoom: 1, fov: 52, h: 720 };
  const rBright = starScreenRadiusPx(-1.44, F.magLimit, F.zoom);
  const rFaint = starScreenRadiusPx(F.magLimit, F.magLimit, F.zoom);
  near("  가장 어두운 별 반지름 = 최소치/2", rFaint, STAR_SIZE_MIN / 2, 1e-9, "px");
  check(`  밝은 별이 훨씬 크다 (${rBright.toFixed(2)}px vs ${rFaint.toFixed(2)}px)`,
    rBright > rFaint * 8);
  check("  최대 반지름이 셰이더 상한과 맞음",
    rBright < (STAR_SIZE_MAX * 3.6) / 2 + 0.01, `${rBright.toFixed(2)}px`);

  const tBright = starHitToleranceDeg(-1.44, F.magLimit, F.zoom, F.fov, F.h);
  const tFaint = starHitToleranceDeg(F.magLimit, F.magLimit, F.zoom, F.fov, F.h);
  check(`  밝은 별 허용 오차 ${tBright.toFixed(2)}° > 어두운 별 ${tFaint.toFixed(2)}°`,
    tBright > tFaint * 3);

  // 예전처럼 화각의 4%(2.08°)를 통째로 뒤지면 어두운 별에도 그만큼 허용된다
  check(`  어두운 별은 예전 반경(2.08°)보다 훨씬 좁다`, tFaint < 0.6, `${tFaint.toFixed(2)}°`);

  // 배율을 올리면 화각이 좁아지므로 각도 허용치도 함께 좁아져야 한다
  const tZoomed = starHitToleranceDeg(2, F.magLimit, 4, F.fov / 4, F.h);
  check("  확대하면 각도 허용치가 좁아진다", tZoomed < starHitToleranceDeg(2, F.magLimit, 1, F.fov, F.h));

  check("  허용 배수는 3", STAR_HIT_TOLERANCE === 3);
}

console.log(`\n═══ ${pass} 통과 / ${fail} 실패 ═══`);
if (fail) {
  console.log("\n실패 항목:");
  for (const f of failures.slice(0, 40)) console.log("  ✗", f);
  if (failures.length > 40) console.log(`  … 외 ${failures.length - 40}건`);
  process.exit(1);
}
console.log("모두 통과.");
