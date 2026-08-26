/**
 * 별 점광원 셰이더. 로더 불필요한 템플릿 문자열.
 *
 * 밝기 하나가 크기·알파·광휘 반경·회절 스파이크를 모두 몰고 간다. 서로 다른
 * 감마를 쓰는 게 핵심이다 — 크기는 가파르게(1.6) 올라가야 1등성이 '지형지물'로
 * 읽히고, 알파는 완만하게(0.75) 올라가야 어두운 별들이 통째로 사라지지 않는다.
 */
export const STAR_VERT = /* glsl */ `
attribute float aMag;
attribute float aCi;
/** 1 = 별자리선을 이루는 별. 그림을 만드는 별은 배경별과 구분돼야 한다. */
attribute float aMember;

uniform float uPixelRatio;
uniform float uZoom;
uniform float uMagLimit;
uniform float uSizeMin;
uniform float uSizeMax;
uniform float uSaturation;
uniform vec3  uTint;
uniform float uTime;
uniform float uMemberBoost;
/** 선택된 별의 EQJ 방향. 선택이 없으면 (0,0,0)이라 어떤 별과도 일치하지 않는다. */
uniform vec3  uSelDir;

varying vec3  vColor;
varying float vAlpha;
varying float vBright;
varying float vHalo;
varying float vSel;

/** 위치에서 뽑는 결정적 난수. 별마다 다른 위상·주기를 주려고 쓴다. */
float starHash(vec3 p) {
  return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
}

vec3 bvToRgb(float bv) {
  float t = clamp((bv + 0.4) / 2.4, 0.0, 1.0);   // B-V -0.4 .. 2.0
  vec3 cool = vec3(0.608, 0.690, 1.000);          // --star-cool  #9bb0ff
  vec3 mid  = vec3(1.000, 1.000, 1.000);          // --star-neutral
  vec3 warm = vec3(1.000, 0.722, 0.420);          // --star-warm  #ffb86b
  vec3 c = t < 0.42
    ? mix(cool, mid, t / 0.42)
    : mix(mid,  warm, (t - 0.42) / 0.58);
  // 브랜드 절제: 기본 55%만 채도 적용. 100%는 장난감 플라네타륨처럼 보이고
  // 0%는 베텔게우스와 리겔을 잃는다 — 이 제품에서 가장 설득력 있는 순간을.
  return mix(vec3(1.0), c, uSaturation) * uTint;
}

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

  // 정규화 밝기: Sirius(-1.46) → 1.0, 한계등급 → 0.0
  float b = clamp((uMagLimit - aMag) / (uMagLimit + 1.46), 0.0, 1.0);
  vBright = b;

  // 스프라이트 크기. 밝은 별은 광휘가 퍼질 자리가 필요해서 별의 '심'보다
  // 넉넉하게 잡는다 — 이 여유가 없으면 후광이 사각형으로 잘린다.
  // ⚠️ 여유를 늘린 만큼 프래그먼트에서 심의 반경 비율을 줄여야 한다.
  //    안 그러면 스프라이트만 커지고 별은 오히려 흐려진다.
  float disc = mix(uSizeMin, uSizeMax, pow(b, 1.6));
  vHalo = 1.0 + 2.6 * pow(b, 2.2);

  // 별자리 구성별 확대. 스프라이트 전체를 키우므로 심(core)도 함께 커진다 —
  // 여기서는 '흐려지는' 게 아니라 '커지는' 게 목적이라 그게 맞다.
  float boost = mix(1.0, uMemberBoost, aMember);

  // 선택된 별. 방향이 일치하는 하나만 걸린다(0.99995 ≈ 0.57°).
  vSel = step(0.99995, dot(normalize(position), uSelDir));
  boost *= mix(1.0, 1.7, vSel);

  gl_PointSize = disc * vHalo * boost * pow(uZoom, 0.25) * uPixelRatio;

  vColor = bvToRgb(aCi);
  // 줌인하면 어두운 별이 '드러나야' 실제 관측 감각과 맞는다
  vAlpha = clamp(pow(b, 0.72) * pow(uZoom, 0.35), 0.18, 1.0);
  // 선택하면 밝기도 함께 올라간다. 크기만 키우면 '큰 점'이지 '밝은 별'이 아니다.
  vAlpha = min(1.0, vAlpha * mix(1.0, 1.6, vSel));

  // ── 섬광(scintillation) ────────────────────────────────────────────
  // 별이 떨리는 건 별이 아니라 대기가 하는 일이다. 그래서 통과하는 공기가
  // 두꺼운 저고도일수록 심해지고 천정에서는 거의 멎는다 — 지면 돔의 소광과
  // 같은 원인이라, 둘이 함께 움직여야 하늘이 한 덩어리로 읽힌다.
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float sinAlt = normalize(wp.xyz).y;
  float r = starHash(position);

  // 0.6 ≈ 고도 37°. 그 위로는 진폭이 바닥값에 눕는다.
  float amp = mix(0.34, 0.09, smoothstep(0.0, 0.6, max(sinAlt, 0.0)));
  float f = 2.1 + r * 3.4;
  float phase = r * 62.83;
  // 주기를 둘 겹친다. 하나면 규칙적으로 깜빡여서 메트로놈처럼 보인다.
  float flicker = sin(uTime * f + phase) * 0.62 + sin(uTime * f * 1.73 + phase * 2.3) * 0.38;

  // 가끔 한 별만 크게 튄다. 지수 24는 대부분의 시간을 0 근처에 붙여 둬서
  // '전부 반짝이는' 상태가 아니라 '어쩌다 하나'가 되게 한다.
  float burst = pow(max(0.0, sin(uTime * 0.31 + r * 31.4)), 24.0);

  float tw = 1.0 + (amp + burst * 0.45) * flicker;
  vAlpha = clamp(vAlpha * tw, 0.0, 1.0);
  // 크기도 아주 조금 같이 흔들린다. 알파만 흔들면 '점멸'이지 '반짝임'이 아니다.
  gl_PointSize *= 1.0 + (tw - 1.0) * 0.18;
}
`;

export const STAR_FRAG = /* glsl */ `
precision mediump float;

varying vec3  vColor;
varying float vAlpha;
varying float vBright;
varying float vHalo;
varying float vSel;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);

  // 심(core): 별은 점광원이므로 밝기와 무관하게 항상 또렷해야 한다.
  // 반경을 vHalo로 나누는 게 핵심 — 스프라이트를 광휘만큼 키웠으므로
  // 같은 '픽셀 크기'의 심을 유지하려면 비율을 그만큼 줄여야 한다.
  float coreR = 0.42 / vHalo;
  float core = smoothstep(coreR, 0.0, d);

  // 광휘(glow): 밝은 별일수록 넓고 진하게 번진다. 이게 등급 차이를 눈으로
  // 읽게 해주는 실제 신호다 — 크기만 키우면 '큰 점'이지 '밝은 별'이 아니다.
  float glow = pow(smoothstep(0.5, 0.0, d), 2.0) * (0.16 + 0.70 * pow(vBright, 1.7));

  // 회절 스파이크: 가장 밝은 별에만, 아주 옅게. 사람 눈의 수정체 구조 때문에
  // 실제로 1등성은 십자로 뻗어 보인다. 과하면 즉시 촌스러워지므로 b>0.72부터
  // 서서히 들어오고 최대 세기도 낮게 묶는다.
  float spikeAmt = smoothstep(0.72, 1.0, vBright);
  float spike = 0.0;
  if (spikeAmt > 0.001) {
    float ax = abs(uv.x);
    float ay = abs(uv.y);
    float armH = exp(-ay * 46.0) * exp(-ax * 5.0);
    float armV = exp(-ax * 46.0) * exp(-ay * 5.0);
    spike = (armH + armV) * spikeAmt * 0.30;
  }

  float a = clamp(core + glow + spike, 0.0, 1.0) * vAlpha;
  if (a < 0.01) discard;

  // 아주 밝은 별의 심은 색이 흰색 쪽으로 포화된다 — 실제 눈과 센서 모두 그렇다.
  vec3 col = mix(vColor, vec3(1.0), core * vBright * 0.55);
  // 선택된 별은 심이 흰색으로 타오른다 — 크기 변화만으로는 어느 걸 골랐는지
  // 밝은 별들 사이에서 알아보기 어렵다.
  col = mix(col, vec3(1.0), core * vSel * 0.6);
  gl_FragColor = vec4(col, a);
}
`;
