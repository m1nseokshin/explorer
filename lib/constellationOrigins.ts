/**
 * 88개 별자리가 '언제, 누구 손에서' 하늘에 올랐는가.
 *
 * 소개 페이지의 성도가 시대 순으로 불을 켜는 데 쓴다. 네 무리의 합이 정확히
 * 88이어야 하고, 한 별자리가 두 무리에 들어가서도 안 된다 — verify-sky.mjs의
 * H13이 이걸 잠근다. 빠진 별자리는 화면에서 영영 불이 안 켜지는데, 88칸 중
 * 한 칸이 어두운 건 눈으로 잘 안 잡힌다.
 *
 * 분류 기준은 '지금의 88개가 어디서 왔는가'다.
 *   - 아르고자리(Argo Navis)는 프톨레마이오스의 48개 중 하나였고, 라카유가 셋
 *     (용골·고물·돛)으로 나눴다. 그림은 고대의 것이므로 고대 무리에 둔다.
 *   - 남십자자리·머리털자리는 프톨레마이오스 때 이미 알려진 별들이지만 독립된
 *     별자리가 된 건 16세기다. 대항해시대 무리에 둔다.
 *
 * 연도가 문헌마다 엇갈리는 경우(헤벨리우스의 성표는 1687년 완성, 1690년 출간)는
 * 숫자를 적지 않고 세기로만 적는다. 모르는 숫자는 적지 않는다.
 */

export type EraId = "ptolemy" | "voyage" | "hevelius" | "lacaille";

export interface Era {
  id: EraId;
  /** 짧은 시기 표기 — 성도 눈썹 줄에 쓴다 */
  whenKo: string;
  whenEn: string;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
  members: readonly string[];
}

/** 프톨레마이오스의 48개 중 지금까지 이름 그대로 남은 47개 */
const PTOLEMY_47 = [
  "And", "Aql", "Aqr", "Ara", "Ari", "Aur", "Boo", "CMa", "CMi", "Cnc", "Cap", "Cas",
  "Cen", "Cep", "Cet", "CrA", "CrB", "Crt", "Crv", "Cyg", "Del", "Dra", "Equ", "Eri",
  "Gem", "Her", "Hya", "Leo", "Lep", "Lib", "Lup", "Lyr", "Oph", "Ori", "Peg", "Per",
  "PsA", "Psc", "Sge", "Sco", "Ser", "Sgr", "Tau", "Tri", "UMa", "UMi", "Vir",
] as const;

/** 48번째였던 아르고자리를 나눈 세 조각 */
export const ARGO_PIECES = ["Car", "Pup", "Vel"] as const;

export const ERAS: readonly Era[] = [
  {
    id: "ptolemy",
    whenKo: "2세기",
    whenEn: "2nd century",
    titleKo: "프톨레마이오스의 48개",
    titleEn: "Ptolemy's forty-eight",
    bodyKo:
      "알렉산드리아의 프톨레마이오스는 「알마게스트」에 별자리 48개를 적었습니다. 그중 47개가 지금도 이름 그대로 남아 있고 가장 컸던 배 아르고자리는 훗날 용골·고물·돛 셋으로 나뉘었습니다. 지중해에서 보이는 하늘만 담았으니 남쪽 끝 하늘은 비어 있었습니다.",
    bodyEn:
      "In Alexandria, Ptolemy set down 48 constellations in the Almagest. Forty-seven survive under the same names; the largest, the ship Argo, was later cut into keel, stern and sails. He recorded only the sky visible from the Mediterranean, so the far southern sky stayed empty.",
    members: [...PTOLEMY_47, ...ARGO_PIECES],
  },
  {
    id: "voyage",
    whenKo: "16–17세기",
    whenEn: "16th–17th century",
    titleKo: "항해사들이 채운 남쪽 하늘",
    titleEn: "The south, filled in by navigators",
    bodyKo:
      "유럽의 배가 적도를 넘자 처음 보는 별이 떠올랐습니다. 네덜란드의 첫 동인도 항해에서 항해사 케이서와 더 하우트만이 그 별들의 위치를 쟀습니다. 플란시우스가 그 기록을 지구의에 올리면서 남쪽 하늘에 새 별자리 열두 개가 생겼습니다. 남쪽을 가리키는 남십자자리가 따로 떨어져 나온 것도 이 무렵입니다.",
    bodyEn:
      "Once European ships crossed the equator, stars nobody in Europe had seen began to rise. On the first Dutch voyage to the East Indies the navigators Keyser and de Houtman measured them, and when Plancius put them on a globe the southern sky gained twelve new figures. Crux, the cross that points south, became a constellation of its own in the same period.",
    members: [
      "Aps", "Cha", "Dor", "Gru", "Hyi", "Ind", "Mus", "Pav", "Phe", "TrA", "Tuc", "Vol",
      "Col", "Mon", "Cam", "Cru", "Com",
    ],
  },
  {
    id: "hevelius",
    whenKo: "17세기 말",
    whenEn: "Late 17th century",
    titleKo: "헤벨리우스가 메운 빈틈",
    titleEn: "The gaps Hevelius filled",
    bodyKo:
      "그단스크의 헤벨리우스는 밝은 별자리 사이에 남은 어두운 틈에 일곱 개를 더했습니다. 살쾡이자리는 살쾡이의 눈을 가져야 보인다는 뜻으로 붙인 이름이라고 전합니다. 그만큼 어둡습니다.",
    bodyEn:
      "In Gdańsk, Hevelius added seven figures to the faint gaps left between the bright ones. Lynx, the story goes, was named because you would need a lynx's eyes to see it. That is how dim these are.",
    members: ["CVn", "Lac", "LMi", "Lyn", "Sct", "Sex", "Vul"],
  },
  {
    id: "lacaille",
    whenKo: "1751–52",
    whenEn: "1751–52",
    titleKo: "과학 기구가 된 별자리",
    titleEn: "Constellations named for instruments",
    bodyKo:
      "라카유는 희망봉에서 남쪽 하늘의 별 약 1만 개를 쟀습니다. 마지막 빈틈에 붙인 이름은 신화가 아니라 망원경·현미경·진자시계 같은 과학 기구였습니다. 너무 컸던 아르고자리를 셋으로 나눈 것도 그입니다.",
    bodyEn:
      "From the Cape of Good Hope, Lacaille measured some ten thousand southern stars. The names he gave the last empty patches came from instruments rather than myths: telescope, microscope, pendulum clock. He was also the one who cut the oversized Argo into three.",
    members: [
      "Ant", "Cae", "Cir", "For", "Hor", "Men", "Mic", "Nor", "Oct", "Pic", "Pyx", "Ret",
      "Scl", "Tel",
    ],
  },
];

const ERA_OF = new Map<string, EraId>();
for (const e of ERAS) for (const id of e.members) ERA_OF.set(id, e.id);

/** 별자리 약어 → 시대. 목록에 없으면 null (데이터가 바뀌었다는 뜻). */
export function eraOf(id: string): EraId | null {
  return ERA_OF.get(id) ?? null;
}

export function eraIndex(id: EraId): number {
  return ERAS.findIndex((e) => e.id === id);
}
