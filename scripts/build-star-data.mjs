/**
 * 별 카탈로그 전처리 — data-src/*.json → public/data/*
 *
 * 출처: ofrohn/d3-celestial (BSD-3-Clause). 별·별자리선·경계·이름이 모두
 * 같은 프로젝트에서 나오므로 좌표가 이미 정합돼 있다. (HYG는 CC BY-SA라
 * 파생 데이터에 share-alike가 전파되고, 별자리선과 출처가 달라 스냅이 더 어렵다.)
 *
 * 실행: npm run data
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "data-src");
const OUT = path.join(ROOT, "public", "data");

const MAG_LIMIT = 8.0; // 사진처럼 별이 깔리는 한계. DESIGN.md의 --star-mag-limit과 반드시 일치
const SNAP_DEG = 0.35; // 별자리선 꼭짓점 → 별 스냅 허용 각거리

fs.mkdirSync(OUT, { recursive: true });

const readJson = (f) => JSON.parse(fs.readFileSync(path.join(SRC, f), "utf8"));
const D2R = Math.PI / 180;

/** RA(도), Dec(도) → EQJ 단위벡터. lib/sky.ts:radecToVec3와 동일 공식을 유지할 것.
 *  두 곳이 어긋나면 별자리선이 별에서 미묘하게 떨어져 나가고 디버깅이 지옥이 된다. */
function radecToUnit(raDeg, decDeg) {
  const ra = raDeg * D2R;
  const dec = decDeg * D2R;
  const cd = Math.cos(dec);
  return [cd * Math.cos(ra), cd * Math.sin(ra), Math.sin(dec)];
}

/** d3-celestial GeoJSON 경도는 -180..180 → 0..360 RA로 정규화 */
const lonToRa = (lon) => (lon < 0 ? lon + 360 : lon);

// ─────────────────────────────────────────────────────────── 1. 별
console.log("· stars.8.json 읽는 중…");
const rawStars = readJson("stars.8.json").features;

const stars = [];
for (const f of rawStars) {
  const mag = f.properties.mag;
  if (!Number.isFinite(mag) || mag > MAG_LIMIT) continue;
  const [lon, lat] = f.geometry.coordinates;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
  const bv = Number.parseFloat(f.properties.bv);
  stars.push({
    hip: f.id,
    ra: lonToRa(lon),
    dec: lat,
    mag,
    ci: Number.isFinite(bv) ? bv : 0.6, // 결측은 태양색(중립)으로
  });
}

// 밝은 순 정렬 — 점진 로딩과 피킹 루프 양쪽에 유리하다
stars.sort((a, b) => a.mag - b.mag);
const count = stars.length;
console.log(`  → mag ≤ ${MAG_LIMIT} 별 ${count}개`);

const xyz = new Float32Array(count * 3);
const magArr = new Float32Array(count);
const ciArr = new Float32Array(count);
const hipToIndex = new Map();

stars.forEach((s, i) => {
  const [x, y, z] = radecToUnit(s.ra, s.dec);
  xyz[i * 3] = x;
  xyz[i * 3 + 1] = y;
  xyz[i * 3 + 2] = z;
  magArr[i] = s.mag;
  ciArr[i] = s.ci;
  if (s.hip != null) hipToIndex.set(s.hip, i);
});

// stars.bin: 헤더 + 블록 3개(인터리브 아님) → 각 블록이 BufferAttribute로 무복사 매핑
const HEADER_BYTES = 16;
const buf = Buffer.alloc(HEADER_BYTES + count * (12 + 4 + 4));
buf.write("SKY1", 0, "ascii");
buf.writeUInt32LE(1, 4); // version
buf.writeUInt32LE(count, 8);
buf.writeFloatLE(MAG_LIMIT, 12);
let off = HEADER_BYTES;
Buffer.from(xyz.buffer).copy(buf, off);
off += xyz.byteLength;
Buffer.from(magArr.buffer).copy(buf, off);
off += magArr.byteLength;
Buffer.from(ciArr.buffer).copy(buf, off);
fs.writeFileSync(path.join(OUT, "stars.bin"), buf);
console.log(`  → stars.bin ${(buf.length / 1024).toFixed(0)} KB`);

function starRaDec(i) {
  const x = xyz[i * 3];
  const y = xyz[i * 3 + 1];
  const z = xyz[i * 3 + 2];
  const ra = (Math.atan2(y, x) / D2R + 360) % 360;
  const dec = Math.asin(Math.max(-1, Math.min(1, z))) / D2R;
  return [ra, dec];
}

// ─────────────────────────────────────────────────────────── 2. 별 이름
console.log("· starnames.json 읽는 중…");
const rawNames = readJson("starnames.json");
const meta = {};
for (const [hipStr, n] of Object.entries(rawNames)) {
  const idx = hipToIndex.get(Number(hipStr));
  if (idx === undefined) continue;
  const entry = { hip: Number(hipStr) };
  if (n.name) {
    entry.name = n.name;
    entry.notable = 1; // 고유명이 있는 별만 캔버스 라벨 후보
  }
  if (n.bayer) entry.bayer = n.bayer;
  if (n.flam) entry.flam = n.flam;
  if (n.c) entry.con = n.c;
  if (n.desig) entry.desig = n.desig;
  meta[idx] = entry;
}
fs.writeFileSync(path.join(OUT, "stars.meta.json"), JSON.stringify(meta));
console.log(
  `  → stars.meta.json ${Object.keys(meta).length}개 (고유명 ${
    Object.values(meta).filter((m) => m.notable).length
  }개)`,
);

// ─────────────────────────────────────────────────────────── 3. 별자리
console.log("· constellations 읽는 중…");
const consMeta = readJson("cons.json").features;
const consLines = readJson("lines.json").features;
/**
 * ⚠️ id가 유일하지 않다. 뱀자리(Ser)는 머리(Caput)와 꼬리(Cauda)로 나뉘어
 *    lines.json에 두 번 들어온다. new Map(...)으로 만들면 뒤엣것이 앞엣것을
 *    덮어써서 한쪽 선이 통째로 사라지는데, 별자리 수는 88개 그대로라 검사에도
 *    안 걸리고 화면에서도 '뱀자리가 원래 저렇게 짧은가' 싶어 넘어가게 된다.
 *    실제로 이 버그로 뱀머리 8선분이 사라지고 꼬리 5선분이 두 번 들어갔었다.
 */
const linesById = new Map();
for (const f of consLines) {
  if (!linesById.has(f.id)) linesById.set(f.id, []);
  linesById.get(f.id).push(f);
}

/** 꼭짓점 → 가장 가까운 별의 인덱스. 임계 밖이면 -1. */
const snapCos = Math.cos(SNAP_DEG * D2R);
let snapFail = 0;
function snapToStar(raDeg, decDeg) {
  const [x, y, z] = radecToUnit(raDeg, decDeg);
  let best = -1;
  let bestDot = snapCos;
  for (let i = 0; i < count; i++) {
    const d = x * xyz[i * 3] + y * xyz[i * 3 + 1] + z * xyz[i * 3 + 2];
    if (d > bestDot) {
      bestDot = d;
      best = i;
    }
  }
  return best;
}

const constellations = [];
const seenCons = new Set();
for (const cf of consMeta) {
  const id = cf.id;
  // 조각으로 나뉜 별자리는 첫 항목에서 선을 전부 모아 하나로 만든다.
  // 뒤이어 오는 같은 id는 건너뛴다 — 나중에 합치는 것보다 애초에 안 나누는 게 낫다.
  if (seenCons.has(id)) continue;
  seenCons.add(id);
  const features = linesById.get(id);
  if (!features) {
    console.warn(`  ! ${id}: 선 데이터 없음`);
    continue;
  }

  // segments: stars.bin 인덱스 쌍의 평탄 배열. 좌표가 아니라 인덱스로 저장해야
  // 선이 렌더된 별과 '증명 가능하게' 일치한다.
  const segments = [];
  const fallback = []; // 스냅 실패 구간용 생좌표 (ra,dec 4개 = 선분 1개)
  for (const line of features.flatMap((f) => f.geometry.coordinates)) {
    let prev = null;
    for (const [lon, lat] of line) {
      const ra = lonToRa(lon);
      const idx = snapToStar(ra, lat);
      if (idx < 0) snapFail++;
      const node = idx >= 0 ? { i: idx } : { ra, dec: lat };
      if (prev) {
        if (prev.i !== undefined && node.i !== undefined) {
          segments.push(prev.i, node.i);
        } else {
          const a = prev.i !== undefined ? starRaDec(prev.i) : [prev.ra, prev.dec];
          const b = node.i !== undefined ? starRaDec(node.i) : [node.ra, node.dec];
          fallback.push(a[0], a[1], b[0], b[1]);
        }
      }
      prev = node;
    }
  }

  const p = cf.properties;
  const [labelLon, labelLat] = cf.geometry.coordinates;

  // 가장 밝은 구성별 (라벨 배치·대표성 용도)
  let brightest = -1;
  for (let k = 0; k < segments.length; k++) {
    const i = segments[k];
    if (brightest < 0 || magArr[i] < magArr[brightest]) brightest = i;
  }

  constellations.push({
    id,
    nameLat: p.la || p.name,
    nameGen: p.gen,
    nameEn: p.en || p.name,
    nameKo: p.ko || p.name,
    rank: Number(p.rank) || 3,
    labelRa: lonToRa(labelLon),
    labelDec: labelLat,
    brightest,
    segments,
    ...(fallback.length ? { fallback } : {}),
  });
}

// id별로 하나만 만들었으므로 여기서 합칠 것은 없다. 다만 조각으로 나뉜
// 별자리는 cons.json에 라벨 위치가 여러 개 오는데, 그중 하나를 이미 썼다.
const byId = new Map(constellations.map((c) => [c.id, c]));
const mergedConstellations = [...byId.values()];
if (mergedConstellations.length !== constellations.length) {
  console.log(
    `  · ${constellations.length - mergedConstellations.length}개 조각 병합 → ${mergedConstellations.length}개`,
  );
}

fs.writeFileSync(
  path.join(OUT, "constellations.json"),
  JSON.stringify(mergedConstellations),
);
const segTotal = mergedConstellations.reduce((a, c) => a + c.segments.length / 2, 0);
const fbTotal = mergedConstellations.reduce((a, c) => a + (c.fallback?.length ?? 0) / 4, 0);
console.log(
  `  → constellations.json ${mergedConstellations.length}개 / 인덱스선분 ${segTotal} / 생좌표선분 ${fbTotal} / 스냅실패 꼭짓점 ${snapFail}`,
);

// ─────────────────────────────────────────────────────────── 4. 경계선
console.log("· borders 읽는 중…");
const borders = readJson("borders.json").features;
const bpts = [];
for (const f of borders) {
  const geoms =
    f.geometry.type === "MultiLineString"
      ? f.geometry.coordinates
      : [f.geometry.coordinates];
  for (const line of geoms) {
    for (let i = 0; i + 1 < line.length; i++) {
      const a = radecToUnit(lonToRa(line[i][0]), line[i][1]);
      const b = radecToUnit(lonToRa(line[i + 1][0]), line[i + 1][1]);
      bpts.push(...a, ...b);
    }
  }
}
const bArr = new Float32Array(bpts);
fs.writeFileSync(path.join(OUT, "boundaries.bin"), Buffer.from(bArr.buffer));
console.log(
  `  → boundaries.bin ${(bArr.byteLength / 1024).toFixed(0)} KB / 선분 ${bpts.length / 6}개`,
);

// ─────────────────────────────────────────────────────────── 5. 라이선스
fs.writeFileSync(
  path.join(OUT, "LICENSE.txt"),
  `이 디렉터리의 데이터 파일(stars.bin, stars.meta.json, constellations.json,
boundaries.bin, milkyway.bin)은 아래 원본에서 파생되었습니다.

  d3-celestial — https://github.com/ofrohn/d3-celestial
  Copyright (c) 2015-2019 Olaf Frohn
  BSD 3-Clause License

원본 성표는 Hipparcos / Yale Bright Star Catalogue / IAU 별 이름 목록에서
유래하며, 별자리 경계는 Delporte(1930)의 IAU 공식 경계를 J2000으로
세차보정한 것입니다. 은하수는 밝기 등고선(등광도선) 5단계 폴리곤이며,
이 앱은 그것을 점구름으로 래스터화해 씁니다.

BSD 3-Clause 전문: https://github.com/ofrohn/d3-celestial/blob/master/LICENSE

land.bin은 world-atlas TopoJSON에서 파생되었습니다.

  world-atlas — https://github.com/topojson/world-atlas (ISC License)
  원본 경계는 Natural Earth (public domain) 입니다.

주의: 렌더 단계에서 앱이 덧붙이는 것들 — 은하수의 먼지 얼룩(프랙탈 잡음),
은하 중심부 증광과 색조 — 은 관측 데이터가 아니라 시각적 표현이다.
형태·범위·밝기 단계와 암흑 성운(폴리곤 구멍)만이 원본에서 온 값이다.
`,
);

// ─────────────────────────────────────────────────────────── 6. 은하수
//
// 은하수를 '채워진 폴리곤'이 아니라 '점구름'으로 만든다. 물리적으로 은하수는
// 분해되지 않은 별들의 집합이고, 실제로도 매끈한 면이 아니라 알갱이로 보인다.
// 구면 폴리곤 삼각분할도 피할 수 있어 구현이 훨씬 견고하다.
//
// 방법: 등장방형 격자에 각 밝기 등고선을 짝수-홀수 규칙으로 채워 넣고,
// 겹친 등고선 수를 밝기로 삼은 뒤 그 밝기에 비례해 점을 뿌린다.
console.log("· milkyway 래스터화…");
{
  const GW = 2048; // 경도 방향 격자
  const GH = 1024; // 위도 방향 격자
  const levels = readJson("milkyway.json").features;
  const acc = new Uint8Array(GW * GH);

  for (const f of levels) {
    const rings =
      f.geometry.type === "MultiPolygon"
        ? f.geometry.coordinates.flat()
        : f.geometry.coordinates;

    // 등고선 하나를 짝수-홀수로 채운다 (링이 여러 개면 구멍도 자동 처리)
    const hit = new Uint8Array(GW * GH);
    for (let gy = 0; gy < GH; gy++) {
      const lat = 90 - ((gy + 0.5) / GH) * 180;
      const xs = [];
      for (const ring of rings) {
        for (let i = 0; i < ring.length; i++) {
          const [x1, y1] = ring[i];
          const [x2, y2] = ring[(i + 1) % ring.length];
          if (y1 === y2) continue;
          if (lat >= Math.min(y1, y2) && lat < Math.max(y1, y2)) {
            xs.push(x1 + ((lat - y1) / (y2 - y1)) * (x2 - x1));
          }
        }
      }
      if (xs.length < 2) continue;
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const gx1 = Math.max(0, Math.floor(((xs[k] + 180) / 360) * GW));
        const gx2 = Math.min(GW - 1, Math.ceil(((xs[k + 1] + 180) / 360) * GW));
        for (let gx = gx1; gx <= gx2; gx++) hit[gy * GW + gx] = 1;
      }
    }
    for (let i = 0; i < acc.length; i++) acc[i] += hit[i];
  }

  const maxLevel = levels.length;
  let covered = 0;
  for (let i = 0; i < acc.length; i++) if (acc[i] > 0) covered++;
  console.log(
    `  → 격자 ${GW}×${GH}, 은하수 덮인 셀 ${((covered / acc.length) * 100).toFixed(1)}%`,
  );

  // 위도가 높은 셀은 실제 입체각이 작으므로 cos(lat)로 가중해야 극 근처에 뭉치지 않는다
  const TARGET = 48000;
  let weightSum = 0;
  for (let gy = 0; gy < GH; gy++) {
    const lat = 90 - ((gy + 0.5) / GH) * 180;
    const cw = Math.cos((lat * Math.PI) / 180);
    for (let gx = 0; gx < GW; gx++) {
      const v = acc[gy * GW + gx];
      if (v) weightSum += v * cw;
    }
  }

  // 결정론적 난수 — 빌드가 재현 가능해야 diff가 의미 있다
  let seed = 0x2f6e2b1;
  const rnd = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 1e6) / 1e6;
  };

  const pts = [];
  const inten = [];
  for (let gy = 0; gy < GH; gy++) {
    const latTop = 90 - (gy / GH) * 180;
    const latBot = 90 - ((gy + 1) / GH) * 180;
    const cw = Math.cos((((latTop + latBot) / 2) * Math.PI) / 180);
    for (let gx = 0; gx < GW; gx++) {
      const v = acc[gy * GW + gx];
      if (!v) continue;
      const expected = (v * cw * TARGET) / weightSum;
      let n = Math.floor(expected);
      if (rnd() < expected - n) n++;
      for (let k = 0; k < n; k++) {
        const lon = -180 + ((gx + rnd()) / GW) * 360;
        const lat = latTop + (latBot - latTop) * rnd();
        pts.push(...radecToUnit(lonToRa(lon), lat));
        inten.push(v / maxLevel);
      }
    }
  }

  // 양자화: 단위벡터는 int16(1/32767 ≈ 0.002°)이면 차고 넘치고, 밝기는 등고선
  // 단계 수(5)만 구분하면 되므로 uint8이면 충분하다. 750KB → 384KB.
  const count = inten.length;
  const buf = Buffer.alloc(16 + count * 8);
  buf.write("MWY2", 0, "ascii");
  buf.writeUInt32LE(2, 4);
  buf.writeUInt32LE(count, 8);
  buf.writeUInt32LE(maxLevel, 12);
  const q = new Int16Array(count * 3);
  for (let i = 0; i < count * 3; i++) q[i] = Math.round(pts[i] * 32767);
  Buffer.from(q.buffer).copy(buf, 16);
  const qi = new Uint8Array(count);
  for (let i = 0; i < count; i++) qi[i] = Math.round(inten[i] * 255);
  Buffer.from(qi.buffer).copy(buf, 16 + count * 6);
  fs.writeFileSync(path.join(OUT, "milkyway.bin"), buf);
  console.log(`  → milkyway.bin ${(buf.length / 1024).toFixed(0)} KB / 점 ${count}개`);
}

// ─────────────────────────────────────────────────────────── 7. 별자리 면적
//
// 구면 폴리곤 면적을 직접 계산한다. 손으로 적은 숫자를 믿는 대신
// 88개 합이 천구 전체(41,253 제곱도)와 맞는지로 검산할 수 있다.
console.log("· 별자리 면적 계산…");
{
  const bounds = readJson("bounds.json").features;
  const areaOf = (ring) => {
    // A = (1/2) Σ (λᵢ₊₁ - λᵢ)(sin φᵢ + sin φᵢ₊₁)   [스테라디안]
    let a = 0;
    let wind = 0; // 경도 감김수 — 극을 감싸는지 판별한다
    for (let i = 0; i < ring.length; i++) {
      const [lon1, lat1] = ring[i];
      const [lon2, lat2] = ring[(i + 1) % ring.length];
      let dLon = lon2 - lon1;
      if (dLon > 180) dLon -= 360;
      if (dLon < -180) dLon += 360;
      wind += dLon;
      a += dLon * D2R * (Math.sin(lat1 * D2R) + Math.sin(lat2 * D2R));
    }
    const area = Math.abs(a / 2);
    // ⚠️ 극을 감싸는 폴리곤(작은곰자리·팔분의자리)은 경도가 한 바퀴 돌고,
    //    이때 사다리꼴 적분은 '여집합'의 면적을 준다. 반구에서 빼야 맞다.
    //    이 보정이 없으면 두 별자리만 20,000 제곱도로 나오는데, 88개 합계
    //    검산이 없었다면 그냥 지나쳤을 오류다.
    return Math.abs(wind) > 180 ? 2 * Math.PI - area : area;
  };

  const SQDEG = (180 / Math.PI) ** 2;
  const areas = new Map();
  for (const f of bounds) {
    const rings =
      f.geometry.type === "MultiPolygon"
        ? f.geometry.coordinates.flat()
        : f.geometry.coordinates;
    // 조각으로 나뉜 별자리(뱀자리)는 합산해야 한다 — 덮어쓰면 절반만 남는다
    const a = rings.reduce((s, r) => s + areaOf(r), 0) * SQDEG;
    areas.set(f.id, (areas.get(f.id) ?? 0) + a);
  }

  const total = [...areas.values()].reduce((a, b) => a + b, 0);
  console.log(
    `  → 합계 ${total.toFixed(0)} 제곱도 (천구 전체 41253, 오차 ${(((total - 41252.96) / 41252.96) * 100).toFixed(2)}%)`,
  );

  const sorted = [...areas.entries()].sort((a, b) => b[1] - a[1]);
  const rankOf = new Map(sorted.map(([id], i) => [id, i + 1]));
  const merged = JSON.parse(
    fs.readFileSync(path.join(OUT, "constellations.json"), "utf8"),
  );
  for (const c of merged) {
    const a = areas.get(c.id);
    if (a !== undefined) {
      c.areaSqDeg = Math.round(a);
      c.areaRank = rankOf.get(c.id);
    }
  }
  fs.writeFileSync(path.join(OUT, "constellations.json"), JSON.stringify(merged));
  console.log("  → constellations.json에 면적·순위 병합");
}

// ─────────────────────────────────────────────────────────── 7-b. 관측 적기
//
// 손으로 적은 '봄철 별자리' 같은 분류 대신 실제로 계산한다. 어떤 천체가
// 저녁 9시에 남중하는 달이 그 별자리를 보기 가장 좋은 때다.
// 남중 시각 ≈ 12h + (RA - 태양 RA) 이므로, 태양 RA = RA - 9h 인 날짜를 찾는다.
console.log("· 관측 적기 계산…");
{
  const { SunPosition } = await import("astronomy-engine");
  const merged = JSON.parse(
    fs.readFileSync(path.join(OUT, "constellations.json"), "utf8"),
  );

  // 한 해를 5일 간격으로 훑어 태양의 적경을 표로 만든다
  const YEAR = 2026;
  const samples = [];
  for (let d = 0; d < 365; d += 5) {
    const t = new Date(Date.UTC(YEAR, 0, 1 + d, 0, 0, 0));
    // SunPosition은 지심 황도좌표(태양의 겉보기 황경)를 준다. 황경 → 적경은
    // 황도경사만 알면 되고, 관측지가 필요 없어 여기선 이쪽이 알맞다.
    const ecl = SunPosition(t);
    const lam = ecl.elon * D2R;
    const eps = 23.4392911 * D2R;
    let ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam)) / D2R;
    if (ra < 0) ra += 360;
    samples.push({ date: t, raDeg: ra });
  }

  for (const c of merged) {
    const wantSunRa = ((c.labelRa - 135 + 360) % 360); // 9시간 = 135°
    let best = null;
    let bestSep = 1e9;
    for (const s of samples) {
      let d = Math.abs(s.raDeg - wantSunRa);
      if (d > 180) d = 360 - d;
      if (d < bestSep) {
        bestSep = d;
        best = s;
      }
    }
    c.bestMonth = best ? best.date.getUTCMonth() + 1 : null;
  }

  fs.writeFileSync(path.join(OUT, "constellations.json"), JSON.stringify(merged));
  const dist = {};
  for (const c of merged) dist[c.bestMonth] = (dist[c.bestMonth] ?? 0) + 1;
  console.log(
    `  → 월별 분포 ${Object.entries(dist).sort((a, b) => a[0] - b[0]).map(([m, n]) => `${m}월:${n}`).join(" ")}`,
  );
}

// ─────────────────────────────────────────────────────────── 8. 세계 지도
//
// 위치 선택 화면의 배경. TopoJSON을 직접 디코드한다(라이브러리 불필요).
console.log("· land 지도 디코드…");
{
  const topo = readJson("land.json");
  const { scale, translate } = topo.transform;

  const decodeArc = (arc) => {
    let x = 0;
    let y = 0;
    return arc.map(([dx, dy]) => {
      x += dx;
      y += dy;
      return [x * scale[0] + translate[0], y * scale[1] + translate[1]];
    });
  };
  const arcs = topo.arcs.map(decodeArc);
  const ringOf = (idxs) => {
    const out = [];
    for (const i of idxs) {
      const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i];
      out.push(...(out.length ? a.slice(1) : a)); // 이음매 점 중복 제거
    }
    return out;
  };

  const land = topo.objects.land;
  const geoms = land.type === "GeometryCollection" ? land.geometries : [land];
  const rings = [];
  for (const g of geoms) {
    const polys = g.type === "MultiPolygon" ? g.arcs : [g.arcs];
    for (const poly of polys) for (const r of poly) rings.push(ringOf(r));
  }

  // 링 하나당 [길이, lon, lat, lon, lat, …] — 헤더의 링 개수만으로 순차 파싱된다
  const flat = [];
  for (const r of rings) {
    flat.push(r.length);
    for (const [lon, lat] of r) flat.push(lon, lat);
  }
  const arr = new Float32Array(flat);
  const buf = Buffer.alloc(12 + arr.byteLength);
  buf.write("LND1", 0, "ascii");
  buf.writeUInt32LE(1, 4);
  buf.writeUInt32LE(rings.length, 8);
  Buffer.from(arr.buffer).copy(buf, 12);
  fs.writeFileSync(path.join(OUT, "land.bin"), buf);
  console.log(
    `  → land.bin ${(buf.length / 1024).toFixed(0)} KB / 링 ${rings.length}개`,
  );
}

console.log("완료.");
