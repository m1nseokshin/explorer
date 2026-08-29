/**
 * 별의 유래와 역사.
 *
 * 숫자표만 있는 화면은 '무엇인지'는 알려주지만 '왜 이 별인지'는 알려주지 않는다.
 * 이 제품의 주제가 항해인 만큼, 이름의 어원과 함께 그 별이 실제로 어떻게 쓰였는지를
 * 앞세운다 — 별자리는 감상거리가 아니라 항법 도구였다.
 *
 * 고유명이 있는 별은 541개지만 사람이 실제로 눌러 보는 건 밝은 쪽이다. 여기 없는
 * 별은 관측값에서 문장을 만들어 낸다(starFallbackDescription) — 지어내지 않는다.
 */

export interface StarLore {
  ko: string;
  en: string;
  /**
   * 이름이 여러 별에 붙어 있을 때만 적는다. 없으면 이름만으로 맞춘다.
   * (Alnair처럼 같은 이름이 다른 별자리에도 있는 경우가 있다.)
   */
  con?: string;
}

/**
 * 항해력(Nautical Almanac)의 항법용 별 57개 + 북극성.
 * 천측 항법에서 육분의로 고도를 재는 표준 목록이며, 밝고 하늘에 고르게 흩어져
 * 있다는 두 조건으로 고른 것이다.
 */
/**
 * 항해력(Nautical Almanac)의 항법용 별 57개 + 북극성.
 *
 * 천측 항법에서 육분의로 고도를 재는 표준 목록이며, 밝고 하늘에 고르게 흩어져
 * 있다는 두 조건으로 고른 것이다.
 *
 * ⚠️ 이름만으로 맞추면 안 된다. 고유명은 하늘에서 유일하지 않다 — 예컨대
 *    Alnair는 두루미자리 α와 켄타우루스자리 ζ 둘 다에 붙어 있고, Markab·
 *    Menkar도 마찬가지다. 별자리까지 함께 봐야 엉뚱한 별에 항법별 표시가
 *    붙지 않는다. (카탈로그는 카시오페이아 α를 IAU 표기 Schedar가 아니라
 *    Shedar로 적는다.)
 */
export const NAVIGATION_STARS: Record<string, string> = {
  Acamar: "Eri", Achernar: "Eri", Acrux: "Cru", Adhara: "CMa", Aldebaran: "Tau",
  Alioth: "UMa", Alkaid: "UMa", Alnair: "Gru", Alnilam: "Ori", Alphard: "Hya",
  Alphecca: "CrB", Alpheratz: "And", Altair: "Aql", Ankaa: "Phe", Antares: "Sco",
  Arcturus: "Boo", Atria: "TrA", Avior: "Car", Bellatrix: "Ori", Betelgeuse: "Ori",
  Canopus: "Car", Capella: "Aur", Deneb: "Cyg", Denebola: "Leo", Diphda: "Cet",
  Dubhe: "UMa", Elnath: "Tau", Eltanin: "Dra", Enif: "Peg", Fomalhaut: "PsA",
  Gacrux: "Cru", Gienah: "Crv", Hadar: "Cen", Hamal: "Ari",
  "Kaus Australis": "Sgr", Kochab: "UMi", Markab: "Peg", Menkar: "Cet",
  Menkent: "Cen", Miaplacidus: "Car", Mirfak: "Per", Nunki: "Sgr", Peacock: "Pav",
  Polaris: "UMi", Pollux: "Gem", Procyon: "CMi", Rasalhague: "Oph", Regulus: "Leo",
  Rigel: "Ori", "Rigil Kentaurus": "Cen", Sabik: "Oph", Shaula: "Sco",
  Shedar: "Cas", Sirius: "CMa", Spica: "Vir", Suhail: "Vel", Vega: "Lyr",
  Zubenelgenubi: "Lib",
};

export function isNavigationStar(
  name: string | null | undefined,
  con: string | null | undefined,
): boolean {
  return !!name && !!con && NAVIGATION_STARS[name] === con;
}

export const STAR_LORE: Record<string, StarLore> = {
  Sirius: {
    ko: "그리스어 세이리오스(‘타는 듯한’)에서 왔다. 하늘에서 가장 밝은 별이며, 고대 이집트는 이 별이 새벽 동쪽에 처음 다시 나타나는 날로 나일강의 범람을 예고했다 — 별을 달력으로 쓴 가장 오래된 기록 중 하나다.",
    en: "From the Greek Seirios, ‘scorching’. The brightest star in the sky; ancient Egypt timed the Nile flood by the day it first reappeared before dawn — one of the oldest records of a star used as a calendar.",
  },
  Canopus: {
    ko: "트로이로 향한 메넬라오스 함대의 키잡이 이름에서 왔다는 설이 오래됐다. 남쪽 하늘 두 번째로 밝은 별이라, 지금도 우주선이 자세를 잡을 때 기준으로 삼는다.",
    en: "Long said to be named for the helmsman of Menelaus’s fleet. The second-brightest star in the sky, and still used by spacecraft as an attitude reference.",
  },
  Arcturus: {
    ko: "그리스어 아르크투로스, ‘곰지기’. 큰곰자리 뒤를 따라가는 자리에 있어 붙은 이름이다. 폴리네시아 항해사들은 이 별이 천정에 오는 위도로 하와이를 찾아갔다.",
    en: "Greek Arktouros, ‘bear guard’, for the way it follows Ursa Major. Polynesian navigators found Hawai‘i by the latitude at which this star passes overhead.",
  },
  "Rigil Kentaurus": {
    ko: "아랍어 리즐 칸투리스, ‘켄타우로스의 발’. 태양에서 가장 가까운 항성계로 4.4광년 거리이며, 맨눈에는 하나로 보이지만 실제로는 세 개의 별이다.",
    en: "Arabic rijl qanṭūris, ‘foot of the centaur’. The nearest star system to the Sun at 4.4 light-years — one star to the eye, three in truth.",
  },
  Vega: {
    ko: "아랍어 와키(‘내리꽂는’)에서 왔다. 세차운동 때문에 기원전 12,000년경에는 이 별이 북극성이었고, 서기 13,700년경 다시 그 자리로 돌아온다. 사람이 사진으로 찍은 최초의 별이기도 하다(1850).",
    en: "From the Arabic wāqi‘, ‘swooping’. Precession made it the pole star around 12,000 BC, and will again around AD 13,700. It was also the first star ever photographed, in 1850.",
  },
  Capella: {
    ko: "라틴어로 ‘작은 암염소’. 마차부자리에 안긴 염소를 가리킨다. 하나로 보이지만 서로 도는 노란 거성 두 개다.",
    en: "Latin for ‘little she-goat’, the goat carried by the Charioteer. A single point to the eye, but in fact two yellow giants orbiting each other.",
  },
  Rigel: {
    ko: "아랍어 리즐 알자우자, ‘거인의 발’. 오리온의 왼발에 해당한다. 지구에서 약 860광년 떨어진 청색 초거성으로, 태양보다 십만 배 이상 밝다.",
    en: "Arabic rijl al-jauzā’, ‘the giant’s foot’. A blue supergiant some 860 light-years away, over a hundred thousand times more luminous than the Sun.",
  },
  Procyon: {
    ko: "그리스어로 ‘개보다 먼저’. 시리우스(큰개자리)보다 조금 앞서 떠오르기 때문에 붙은 이름이다. 시리우스·베텔게우스와 함께 겨울의 대삼각형을 이룬다.",
    en: "Greek for ‘before the dog’ — it rises just ahead of Sirius. With Sirius and Betelgeuse it forms the Winter Triangle.",
  },
  Achernar: {
    ko: "아랍어 아키르 안나르, ‘강의 끝’. 에리다누스강 별자리의 남쪽 끝을 표시한다. 매우 빠르게 자전해 적도가 극보다 1.5배 부풀어 있다.",
    en: "Arabic ākhir an-nahr, ‘the river’s end’, marking the southern tip of Eridanus. It spins so fast that its equator bulges half again as wide as its poles.",
  },
  Betelgeuse: {
    ko: "아랍어 표기가 필사 과정에서 흐트러져 굳은 이름이다. 적색 초거성이며 태양계에 놓으면 목성 궤도까지 삼킨다. 언젠가 초신성으로 끝나는데, 그때는 대낮에도 보인다.",
    en: "A name mangled in transcription from Arabic. A red supergiant so vast it would swallow Jupiter’s orbit, and one that will end as a supernova bright enough to see in daylight.",
  },
  Altair: {
    ko: "아랍어 안나스르 앗타이르, ‘나는 독수리’. 견우성으로 알려진 별이다. 8.9시간에 한 바퀴 도는 초고속 자전으로 눈에 띄게 납작하다.",
    en: "Arabic an-nasr aṭ-ṭā’ir, ‘the flying eagle’. It rotates once every 8.9 hours — fast enough to be visibly flattened.",
  },
  Acrux: {
    ko: "남십자자리의 알파별이라 ‘α Crucis’를 줄여 부른 근대식 이름이다. 남십자의 긴 축을 4.5배 늘이면 남극점에 닿는다 — 남반구에는 북극성이 없어 이 방법으로 남쪽을 찾았다.",
    en: "A modern contraction of ‘α Crucis’. Extend the long axis of the Southern Cross four and a half times and you reach the south celestial pole — the southern hemisphere has no pole star, so this is how south was found.",
  },
  Aldebaran: {
    ko: "아랍어 앗다바란, ‘뒤따르는 것’. 플레이아데스 성단을 뒤쫓아 떠오르는 데서 왔다. 황소자리의 붉은 눈이다.",
    en: "Arabic ad-dabarān, ‘the follower’, for the way it trails the Pleiades across the sky. The red eye of the Bull.",
  },
  Spica: {
    ko: "라틴어로 ‘밀 이삭’. 처녀가 든 이삭을 가리킨다. 히파르코스는 기원전 2세기에 이 별의 위치를 옛 기록과 견주다가 세차운동을 발견했다.",
    en: "Latin for ‘ear of wheat’, the sheaf held by the Maiden. Comparing its position against older records led Hipparchus to discover precession in the 2nd century BC.",
  },
  Antares: {
    ko: "그리스어로 ‘아레스(화성)의 맞수’. 붉은빛이 화성과 닮아 헷갈렸기 때문이다. 전갈의 심장에 해당하며, 동아시아에서는 대화(大火)라 불러 계절을 가늠했다.",
    en: "Greek for ‘rival of Ares’ — its red glow was easily mistaken for Mars. The heart of the Scorpion, and a seasonal marker in East Asia as the ‘Great Fire’.",
  },
  Pollux: {
    ko: "쌍둥이자리의 두 형제 중 불사의 동생. 카스토르와 폴룩스는 뱃사람의 수호신이었고, 돛대 끝에 맺히는 세인트엘모의 불을 두 사람이 나타난 것으로 여겼다.",
    en: "The immortal twin. Castor and Pollux were the patron gods of sailors; St Elmo’s fire at the masthead was read as the pair arriving.",
  },
  Castor: {
    ko: "쌍둥이자리의 필멸의 형. 망원경으로 보면 두 개, 실제로는 서로 얽혀 도는 별 여섯 개다.",
    en: "The mortal twin. Two stars through a telescope — and in truth a system of six, all bound together.",
  },
  Fomalhaut: {
    ko: "아랍어 팜 알후트, ‘물고기의 입’. 가을 남쪽 하늘에 홀로 밝아 ‘외로운 별’로 불렸다. 주위를 도는 먼지 원반이 관측된 첫 별 중 하나다.",
    en: "Arabic fam al-ḥūt, ‘mouth of the fish’. Alone in an empty stretch of autumn sky, it earned the name ‘the Solitary One’, and was among the first stars found ringed by a dust disc.",
  },
  Deneb: {
    ko: "아랍어 다나브, ‘꼬리’. 백조의 꼬리에 해당한다. 여름의 대삼각형 한 꼭짓점이며, 겉보기로는 평범해 보여도 실제로는 이 목록에서 가장 멀고 가장 밝은 별에 속한다.",
    en: "Arabic dhanab, ‘tail’ — the swan’s. A corner of the Summer Triangle, and though modest to the eye, among the most distant and most luminous stars visible at all.",
  },
  Regulus: {
    ko: "라틴어로 ‘작은 왕’. 바빌로니아에서 이미 ‘왕의 별’이었다. 황도에서 0.5° 안쪽에 놓여 달과 행성이 자주 스쳐 지나간다.",
    en: "Latin for ‘little king’, and already ‘the king star’ in Babylon. It lies within half a degree of the ecliptic, so the Moon and planets pass close by again and again.",
  },
  Polaris: {
    ko: "지금 천구 북극에서 1° 안쪽에 있어 밤새 거의 움직이지 않는다. 이 별의 고도가 곧 관측자의 위도다 — 육분의로 이 각도만 재면 북반구 어디서든 자기 위도를 알 수 있었고, 이 앱은 그 계산을 거꾸로 돌린 것이다.",
    en: "It sits within a degree of the north celestial pole and barely moves all night. Its altitude equals your latitude — measure that one angle with a sextant and you know where you are, anywhere in the northern hemisphere. This app runs that calculation backwards.",
  },
  Kochab: {
    ko: "작은곰자리의 베타별. 기원전 1500년부터 서기 500년 무렵까지는 이 별이 북극성 노릇을 했다. 세차운동 때문에 ‘북극성’은 시대마다 바뀐다.",
    en: "Beta Ursae Minoris. From about 1500 BC to AD 500 this was the pole star — precession moves the title from one star to another across the ages.",
  },
  Dubhe: {
    ko: "아랍어 답, ‘곰’. 북두칠성의 국자 앞쪽 두 별(두베·메라크) 중 위쪽이며, 이 둘을 이어 5배 늘이면 북극성에 닿는다 — 가장 널리 쓰인 길찾기다.",
    en: "Arabic dubb, ‘bear’. The upper of the Big Dipper’s two Pointers: extend the line through them five times and you arrive at Polaris — the most widely used sky-path there is.",
  },
  Alkaid: {
    ko: "아랍어 알카이드, ‘상여꾼들의 우두머리’. 북두칠성 손잡이 끝이다. 손잡이의 휜 곡선을 그대로 이어 가면 아르크투루스, 더 가면 스피카에 닿는다.",
    en: "Arabic al-qā’id, ‘the leader’. The end of the Dipper’s handle — follow the handle’s curve outward and it arcs to Arcturus, then on to Spica.",
  },
  Alioth: {
    ko: "북두칠성에서 가장 밝은 별이다. 손잡이가 국자와 만나는 자리에 있다.",
    en: "The brightest star of the Big Dipper, where the handle meets the bowl.",
  },
  Mizar: {
    ko: "북두칠성 손잡이 가운데 별. 바로 옆의 알코르와 짝을 이루며, 이 둘을 갈라 볼 수 있느냐가 예로부터 시력 시험이었다. 망원경으로 발견된 최초의 이중성이기도 하다(1617).",
    en: "The middle star of the Dipper’s handle, paired with Alcor beside it — splitting the two by eye was an old test of eyesight. It was also the first double star ever found by telescope, in 1617.",
  },
  Algol: {
    ko: "아랍어 알굴, ‘구울(악귀)’. 2.87일마다 밝기가 뚝 떨어져 ‘악마의 별’로 불렸다. 원인은 짝별이 앞을 가리는 식(蝕)이며, 이름이 붙던 시절 이미 그 변화를 알고 있었다는 뜻이기도 하다.",
    en: "Arabic al-ghūl, ‘the ghoul’. Every 2.87 days it visibly dims — a companion eclipsing it — and the name suggests people had noticed long before anyone knew why.",
  },
  Shaula: {
    ko: "아랍어 아슈샤울라, ‘치켜든 꼬리’. 전갈의 독침이다.",
    en: "Arabic al-shaulah, ‘the raised tail’ — the Scorpion’s sting.",
  },
  Bellatrix: {
    ko: "라틴어로 ‘여전사’. 오리온의 왼쪽 어깨다.",
    en: "Latin for ‘female warrior’ — Orion’s left shoulder.",
  },
  Alnilam: {
    ko: "아랍어 안니잠, ‘진주 끈’. 오리온 삼태성의 가운데 별이다. 삼태성은 천구 적도에 거의 걸쳐 있어 지구 어디서든 보이고, 그래서 방위의 기준으로 오래 쓰였다.",
    en: "Arabic an-niẓām, ‘the string of pearls’ — the middle star of Orion’s Belt. The Belt straddles the celestial equator, visible from nearly everywhere on Earth, which made it a lasting bearing.",
  },
  Alnitak: {
    ko: "아랍어 안니타크, ‘허리띠’. 오리온 삼태성의 동쪽 끝이며, 바로 아래에 말머리성운이 있다.",
    en: "Arabic an-niṭāq, ‘the girdle’ — the eastern star of Orion’s Belt, with the Horsehead Nebula just below it.",
  },
  Saiph: {
    ko: "아랍어 사이프 알자바르, ‘거인의 칼’. 원래 칼을 가리키던 이름이 오리온의 오른발에 잘못 붙었다.",
    en: "Arabic saif al-jabbār, ‘the giant’s sword’ — a name that drifted onto Orion’s right foot instead.",
  },
  Hadar: {
    ko: "아랍어로 ‘땅’ 또는 ‘정주지’를 뜻한다. 리길 켄타우루스와 나란히 서서 남십자자리를 가리키는 두 별 중 하나다.",
    en: "Arabic for ‘ground’ or ‘settled land’. With Rigil Kentaurus it forms the pair that points the way to the Southern Cross.",
  },
  Mimosa: {
    ko: "남십자자리의 베타별. 이름의 유래는 분명치 않고, 미모사 꽃에서 따왔다는 설이 있다.",
    en: "Beta Crucis. The origin of the name is uncertain; it may simply come from the mimosa flower.",
  },
  Gacrux: {
    ko: "‘γ Crucis’를 줄인 근대식 이름. 남십자 세로축의 위쪽 끝이며, 아크룩스와 이어 남극을 찾는 기준선이 된다.",
    en: "A modern contraction of ‘γ Crucis’. The top of the Southern Cross’s long axis — the line to Acrux that finds the pole.",
  },
  Adhara: {
    ko: "아랍어 알아드라, ‘처녀들’. 큰개자리에서 시리우스 다음으로 밝다. 약 470만 년 전에는 지구에서 가장 밝은 별이었다.",
    en: "Arabic al-‘adhārā, ‘the maidens’. Second brightest in Canis Major — and about 4.7 million years ago, the brightest star in Earth’s sky.",
  },
  Elnath: {
    ko: "아랍어 안나트, ‘들이받는 것’. 황소의 뿔 끝이며, 마차부자리와 황소자리가 이 별을 공유했었다.",
    en: "Arabic an-naṭḥ, ‘the butting one’ — the tip of the Bull’s horn, once shared between Taurus and Auriga.",
  },
  Mirfak: {
    ko: "아랍어 마르피크 앗투라이야, ‘플레이아데스 쪽 팔꿈치’. 페르세우스자리에서 가장 밝다.",
    en: "Arabic mirfaq, ‘the elbow’ — the brightest star of Perseus.",
  },
  Alphard: {
    ko: "아랍어 알파르드, ‘외로운 것’. 주변에 밝은 별이 없어 붙은 이름이며, 바다뱀자리의 심장이다.",
    en: "Arabic al-fard, ‘the solitary one’, for the emptiness around it. The heart of the Water Snake.",
  },
  Alpheratz: {
    ko: "아랍어 수라트 알파라스, ‘말의 배꼽’. 원래 페가수스의 일부였으나 지금은 안드로메다자리에 속하며, 페가수스 사각형의 한 모서리를 여전히 맡고 있다.",
    en: "Arabic surrat al-faras, ‘the horse’s navel’. Once part of Pegasus, now assigned to Andromeda — yet it still holds one corner of the Great Square.",
  },
  Hamal: {
    ko: "아랍어 알하말, ‘양’. 2천 년 전에는 춘분점이 이 별 근처에 있어 황도 12궁의 시작으로 삼았다. 세차운동으로 지금 춘분점은 물고기자리에 있다.",
    en: "Arabic al-ḥamal, ‘the ram’. Two thousand years ago the vernal equinox sat near it, which is why the zodiac begins with Aries; precession has since carried that point into Pisces.",
  },
  Nunki: {
    ko: "바빌로니아 이름에서 유래했다고 전해지는 드문 예다. 궁수자리의 ‘주전자’ 손잡이에 해당하며, 그 방향이 곧 은하 중심이다.",
    en: "One of the rare names thought to descend from Babylonian. It marks the handle of the Sagittarius ‘Teapot’ — and that direction is the centre of our galaxy.",
  },
  "Kaus Australis": {
    ko: "라틴어와 아랍어가 섞인 이름으로 ‘남쪽 활’. 궁수가 당긴 활의 아래쪽이다.",
    en: "A hybrid name meaning ‘southern bow’ — the lower limb of the Archer’s bow.",
  },
  Denebola: {
    ko: "아랍어 다나브 알아사드, ‘사자의 꼬리’. 사자자리의 동쪽 끝이다.",
    en: "Arabic dhanab al-asad, ‘the lion’s tail’ — the eastern end of Leo.",
  },
  Algieba: {
    ko: "아랍어 알자바, ‘이마’. 실제로는 사자의 갈기에 해당하며, 작은 망원경으로도 금빛 두 별로 갈라 보인다.",
    en: "Arabic al-jabha, ‘the forehead’, though it actually marks the mane. Even a small telescope splits it into two golden stars.",
  },
  Diphda: {
    ko: "아랍어 앗디파 앗타니, ‘두 번째 개구리’. 고래자리의 꼬리에 있으며, 주변이 비어 있어 항법 별로 쓰기 좋았다.",
    en: "Arabic al-ḍifdi‘ al-thānī, ‘the second frog’. In the Whale’s tail, in an empty patch of sky that made it useful for navigation.",
  },
  Mirach: {
    ko: "아랍어 미자르, ‘허리띠’. 안드로메다의 허리이며, 이 별에서 위로 두 별을 짚어 가면 안드로메다 은하에 닿는다.",
    en: "Arabic mi’zar, ‘the girdle’ — Andromeda’s waist, and the starting point for star-hopping up to the Andromeda Galaxy.",
  },
  Almach: {
    ko: "아랍어 알아나크 알아르드, 사막의 작은 짐승 이름에서 왔다. 금색과 푸른색이 대비되는 아름다운 이중성이다.",
    en: "From an Arabic name for a small desert animal. A famously beautiful double, one star gold and the other blue.",
  },
  Rasalhague: {
    ko: "아랍어 라스 알하위, ‘뱀 부리는 사람의 머리’.",
    en: "Arabic ra’s al-ḥawwā’, ‘head of the serpent-bearer’.",
  },
  Alphecca: {
    ko: "아랍어 안나이르 알파카, ‘부서진 고리 중 밝은 것’. 북쪽왕관자리의 보석에 해당한다.",
    en: "Arabic al-nā’ir al-fakka, ‘the bright one of the broken ring’ — the jewel of the Northern Crown.",
  },
  Peacock: {
    ko: "20세기 영국 항공부가 항법용 별에 이름이 없으면 곤란하다며 붙인 이름이다. 공작자리의 알파별.",
    en: "Named in the 20th century by Britain’s Air Ministry, which needed every navigation star to have a name. Alpha Pavonis.",
  },
  Atria: {
    ko: "‘α Trianguli Australis’를 줄인 근대식 이름. 남쪽삼각형자리에서 가장 밝다.",
    en: "A modern contraction of ‘α Trianguli Australis’, brightest in the Southern Triangle.",
  },
  Miaplacidus: {
    ko: "아랍어와 라틴어가 섞인 ‘고요한 물’. 용골자리, 곧 아르고호의 용골에 속한 별이라 배와 물의 이미지가 이름에 남았다.",
    en: "A hybrid name meaning ‘placid waters’ — fitting for a star in Carina, the keel of the ship Argo.",
  },
  Avior: {
    ko: "이 별 역시 20세기 항법 목록을 만들며 새로 이름 붙인 경우다. 용골자리의 엡실론별.",
    en: "Another star named only in the 20th century, for the sake of the navigation list. Epsilon Carinae.",
  },
  Suhail: {
    ko: "아랍어에서 남쪽 하늘의 밝은 별을 두루 이르던 말이다. 돛자리에 속한다.",
    en: "An Arabic name once given broadly to bright southern stars. It belongs to Vela, the sails.",
  },
  Naos: {
    ko: "그리스어로 ‘배’. 고물자리, 곧 아르고호의 선미에 있다. 표면 온도가 4만 K에 이르는 드문 초고온 별이다.",
    en: "Greek for ‘ship’, in Puppis — the stern of Argo. One of the rare stars with a surface near 40,000 K.",
  },
  Alnair: {
    con: "Gru",
    ko: "아랍어 안나이르, ‘밝은 것’. 두루미자리에서 가장 밝다.",
    en: "Arabic al-nayyir, ‘the bright one’ — brightest in Grus, the crane.",
  },
  Menkent: {
    ko: "‘켄타우로스의 어깨’를 뜻한다.",
    en: "‘Shoulder of the centaur’.",
  },
  Menkalinan: {
    ko: "아랍어 만키브 디 알이난, ‘고삐 쥔 이의 어깨’. 마차부자리에 있다.",
    en: "Arabic mankib dhī al-‘inān, ‘shoulder of the rein-holder’, in Auriga.",
  },
  Wezen: {
    ko: "아랍어 알와즌, ‘무게’. 지평선 위로 힘겹게 떠오르는 모습에서 왔다고 전해진다.",
    en: "Arabic al-wazn, ‘the weight’ — said to describe how heavily it seems to climb from the horizon.",
  },
  Mirzam: {
    ko: "아랍어 알미르잠, ‘알리는 것’. 시리우스보다 조금 먼저 떠서 그 도착을 예고한다.",
    en: "Arabic al-mirzam, ‘the announcer’ — it rises just before Sirius and heralds it.",
  },
  Sargas: {
    ko: "수메르 기원으로 추정되는 오래된 이름이다. 전갈자리 꼬리에 있다.",
    en: "An old name, likely Sumerian in origin, in the Scorpion’s tail.",
  },
  Alhena: {
    ko: "아랍어 알한아, 낙타 목에 찍는 낙인을 뜻한다. 쌍둥이자리의 발에 해당한다.",
    en: "Arabic al-han‘ah, a brand mark on a camel’s neck. It marks a foot of the Twins.",
  },
  Alsephina: {
    ko: "아랍어 알사피나, ‘배’. 아르고호에서 갈라져 나온 돛자리에 속한다.",
    en: "Arabic al-safīnah, ‘the ship’ — in Vela, split off from the old constellation Argo.",
  },
  Aspidiske: {
    ko: "그리스어로 ‘작은 방패’. 용골자리에 있다.",
    en: "Greek for ‘little shield’, in Carina.",
  },
  Tiaki: {
    ko: "마오리어에서 온 이름으로 두루미자리의 베타별이다. 남반구 항해 문화의 흔적이 남은 드문 예다.",
    en: "A Māori name for Beta Gruis — one of the few star names carrying the trace of southern navigating cultures.",
  },
  Muhlifain: {
    ko: "아랍어 알무흘리파인, ‘맹세하는 두 사람’. 켄타우루스자리의 감마별이다.",
    en: "Arabic al-muḥlifayn, ‘the two who swear an oath’ — Gamma Centauri.",
  },
  Regor: {
    ko: "돛자리의 감마별. 이름은 20세기에 붙은 것으로, 아폴로 1호 승무원 로저 채피를 거꾸로 읽은 것이라고 전해진다.",
    en: "Gamma Velorum. The name is 20th-century, said to be ‘Roger’ reversed, for Apollo 1 astronaut Roger Chaffee.",
  },
  Acamar: {
    ko: "아랍어 아키르 안나르, ‘강의 끝’. 원래 에리다누스강의 남쪽 끝을 뜻했으나, 세차운동으로 강이 더 남쪽까지 그려지면서 그 이름은 아케르나르로 넘어갔다.",
    en: "Arabic ākhir an-nahr, ‘the river’s end’. It once marked the southern tip of Eridanus, until the river was extended further south and the name passed to Achernar.",
  },
  Ankaa: {
    ko: "아랍어로 ‘불사조’. 봉황자리에서 가장 밝다.",
    en: "Arabic for ‘the phoenix’ — brightest star of Phoenix.",
  },
  Eltanin: {
    ko: "아랍어 앗투반, ‘용’. 용자리에서 가장 밝다. 1725년 제임스 브래들리가 이 별을 관측하다 광행차를 발견했고, 그것이 지구가 실제로 움직인다는 첫 직접 증거였다.",
    en: "Arabic al-tinnīn, ‘the dragon’, brightest in Draco. Watching it in 1725, James Bradley found stellar aberration — the first direct proof that the Earth really moves.",
  },
  Enif: {
    ko: "아랍어 안프, ‘코’. 페가수스의 주둥이에 해당한다.",
    en: "Arabic anf, ‘the nose’ — the muzzle of Pegasus.",
  },
  Gienah: {
    ko: "아랍어 자나 알구랍, ‘까마귀의 날개’.",
    en: "Arabic janāḥ al-ghurāb, ‘the raven’s wing’.",
  },
  Markab: {
    con: "Peg",
    ko: "아랍어 마르캅, ‘탈것’ 또는 ‘안장’. 페가수스 사각형의 한 모서리다.",
    en: "Arabic markab, ‘saddle’ or ‘thing ridden’ — a corner of the Great Square of Pegasus.",
  },
  Menkar: {
    con: "Cet",
    ko: "아랍어 만히르, ‘콧구멍’. 고래의 주둥이에 있다.",
    en: "Arabic manḥar, ‘nostril’ — in the Whale’s snout.",
  },
  Sabik: {
    ko: "아랍어로 ‘앞서가는 것’. 뱀주인자리에 있다.",
    en: "Arabic for ‘the preceding one’, in Ophiuchus.",
  },
  Shedar: {
    ko: "아랍어 앗사드르, ‘가슴’. 카시오페이아의 가슴에 해당하며, IAU 공식 표기는 Schedar다.",
    en: "Arabic al-ṣadr, ‘the breast’ — Cassiopeia’s chest. The IAU spells it Schedar.",
  },
  Zubenelgenubi: {
    con: "Lib",
    ko: "아랍어 아주반 알자누비, ‘남쪽 집게발’. 천칭자리는 원래 전갈의 집게였고 이름에 그 흔적이 남았다. 황도 바로 위에 있어 달이 자주 가린다.",
    en: "Arabic al-zubānā al-janūbiyya, ‘the southern claw’ — Libra was once the Scorpion’s claws, and the name still says so. It sits right on the ecliptic, so the Moon occults it often.",
  },
  Navi: {
    ko: "카시오페이아자리의 감마별. 거스 그리섬(Ivan)의 이름을 거꾸로 읽어 붙인 것으로, 아폴로 항법 훈련에 쓰이던 별이다.",
    en: "Gamma Cassiopeiae, named by reversing ‘Ivan’ — Gus Grissom’s middle name — and used in Apollo navigation training.",
  },
};

/**
 * 이름과 별자리로 유래를 찾는다.
 * 이름이 같아도 별자리가 다르면 다른 별이므로 넘기지 않는다.
 */
export function loreForStar(
  name: string | null | undefined,
  con: string | null | undefined,
  lang: "ko" | "en",
): string | null {
  if (!name) return null;
  const l = STAR_LORE[name];
  if (!l) return null;
  if (l.con && l.con !== con) return null;
  return l[lang];
}

/**
 * B−V 색지수 → 표면 온도(K).
 *
 * Ballesteros(2012)의 경험식. 태양(B−V 0.65)에서 5778K로 실측(5772K)과 거의
 * 일치하고 베텔게우스(1.85)에서도 3333K로 실측 3600K에 가깝다.
 *
 * ⚠️ 아주 푸른 별(B−V < −0.1)에서는 크게 빗나간다 — −0.30에서 16,600K를 주는데
 *    실제로는 25,000K에 이른다. 그래서 그 구간에서는 숫자를 적지 않는다
 *    (TEMP_RELIABLE_BV 참조). 틀린 숫자를 적느니 안 적는 쪽이 낫다.
 */
export const TEMP_RELIABLE_BV = -0.1;

export function colorTempFromBV(bv: number): number {
  const t = 0.92 * bv;
  return 4600 * (1 / (t + 1.7) + 1 / (t + 0.62));
}

/**
 * 고유명이 없는 별의 설명을 관측값에서 만든다.
 *
 * ⚠️ 지어내지 않는다. 여기 들어가는 건 전부 카탈로그에 있는 값이거나 그것에서
 *    바로 유도되는 것뿐이다 — 별자리 소속, 부호의 뜻, 색온도, 맨눈 가시성.
 */
export function starFallbackDescription(
  lang: "ko" | "en",
  opts: {
    constellation: string | null;
    bayer: string | null;
    flamsteed: string | null;
    mag: number;
    bv: number;
  },
): string {
  const { constellation, bayer, flamsteed, mag, bv } = opts;
  const reliable = bv >= TEMP_RELIABLE_BV;
  const tempK = Math.round(colorTempFromBV(bv) / 50) * 50;

  const hue =
    bv < 0.0
      ? { ko: "푸른", en: "blue" }
      : bv < 0.3
        ? { ko: "푸른빛이 도는 흰", en: "blue-white" }
        : bv < 0.6
          ? { ko: "흰", en: "white" }
          : bv < 0.9
            ? { ko: "노란", en: "yellow" }
            : bv < 1.4
              ? { ko: "주황", en: "orange" }
              : { ko: "붉은", en: "red" };

  const vis =
    mag <= 2
      ? { ko: "도시에서도 눈에 띄는 밝기다", en: "bright enough to stand out even from a city" }
      : mag <= 4
        ? { ko: "맨눈으로 어렵지 않게 보인다", en: "an easy naked-eye star" }
        : mag <= 6
          ? { ko: "빛이 없는 밤에야 맨눈에 잡힌다", en: "visible to the unaided eye only under a dark sky" }
          : { ko: "맨눈으로는 보이지 않고 쌍안경이 필요하다", en: "beyond the unaided eye — binoculars are needed" };

  const parts: string[] = [];

  if (lang === "ko") {
    if (constellation) parts.push(`${constellation}에 속한 별이다.`);
    if (bayer) {
      parts.push(
        `고유명은 전해지지 않고 바이어 부호 ${bayer}로 부른다 — 1603년 요한 바이어가 별자리마다 밝은 순으로 그리스 문자를 매긴 방식이다.`,
      );
    } else if (flamsteed) {
      parts.push(
        `고유명 대신 플램스티드 번호 ${flamsteed}를 쓴다 — 별자리 안에서 서쪽부터 차례로 매긴 번호다.`,
      );
    } else {
      parts.push("따로 전해지는 이름이 없어 카탈로그 번호로만 부른다.");
    }
    parts.push(
      reliable
        ? `색지수 B−V ${bv.toFixed(2)} — ${hue.ko}빛이며, 표면 온도는 대략 ${tempK.toLocaleString()}K다.`
        : `색지수 B−V ${bv.toFixed(2)} — ${hue.ko}빛이다. 표면 온도가 2만 K를 넘는 부류라 색만으로는 정확히 가늠하기 어렵다.`,
    );
    parts.push(`겉보기 등급은 ${mag.toFixed(2)}. ${vis.ko}.`);
  } else {
    if (constellation) parts.push(`A star in ${constellation}.`);
    if (bayer) {
      parts.push(
        `No proper name survives for it; it goes by the Bayer letter ${bayer} — the scheme Johann Bayer introduced in 1603, lettering each constellation’s stars roughly in order of brightness.`,
      );
    } else if (flamsteed) {
      parts.push(
        `It carries no proper name, only the Flamsteed number ${flamsteed}, assigned west to east within the constellation.`,
      );
    } else {
      parts.push("No name has come down for it — only a catalogue number.");
    }
    parts.push(
      reliable
        ? `Its colour index B−V of ${bv.toFixed(2)} makes it ${hue.en}, with a surface near ${tempK.toLocaleString()} K.`
        : `Its colour index B−V of ${bv.toFixed(2)} makes it ${hue.en} — hot enough that colour alone cannot pin the temperature down.`,
    );
    parts.push(`At magnitude ${mag.toFixed(2)} it is ${vis.en}.`);
  }

  return parts.join(" ");
}
