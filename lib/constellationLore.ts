/**
 * 별자리 설명.
 *
 * 면적·순위·구성 별 수·가장 밝은 별·관측 적기는 전부 데이터에서 계산해 오므로
 * 여기에는 '계산할 수 없는 것'만 둔다 — 유래와 무엇을 그린 것인지, 그리고
 * 그 안에서 무엇을 볼 만한지.
 *
 * 출처 구분:
 *   프톨레마이오스 48개 — 고대 그리스에서 전해진 별자리
 *   케이서·더 하우트만(1597–98) — 네덜란드 항해사들이 남긴 남천 12개
 *   플란시우스·헤벨리우스(17세기) — 북천의 빈틈을 메운 별자리
 *   라카유(1751–52) — 희망봉에서 관측해 만든 남천 14개, 대부분 과학기구 이름
 */
export interface Lore {
  ko: string;
  en: string;
}

export const CONSTELLATION_LORE: Record<string, Lore> = {
  And: {
    ko: "바다괴물의 제물로 바위에 묶인 에티오피아의 공주. 프톨레마이오스 48개 중 하나로, 옆의 페가수스자리와 별 하나(알페라츠)를 나눠 쓴다. 맨눈으로 보이는 가장 먼 천체인 안드로메다 은하(M31)가 여기 있다.",
    en: "The Ethiopian princess chained to a rock as an offering to a sea monster. One of Ptolemy's 48, it shares the star Alpheratz with neighbouring Pegasus. It holds the Andromeda Galaxy (M31) — the most distant thing visible to the naked eye.",
  },
  Ant: {
    ko: "라카유가 18세기 중반 희망봉에서 만든 별자리로, 진공 펌프를 기린다. 밝은 별이 없어 도시에서는 거의 보이지 않는다.",
    en: "Lacaille's tribute to the air pump, invented at the Cape of Good Hope in the mid-1700s. With no bright stars, it is all but invisible from a city.",
  },
  Aps: {
    ko: "케이서와 더 하우트만이 남긴 남천 별자리. 극락조를 그렸는데, 당시 유럽에 들어온 표본은 다리가 잘려 있어 '땅에 내려앉지 않는 새'로 오해받았다.",
    en: "A southern figure from Keyser and de Houtman, depicting the bird-of-paradise. Specimens reaching Europe had their legs removed, feeding the myth of a bird that never lands.",
  },
  Aqr: {
    ko: "물을 쏟는 사람. 황도 12궁 중 하나이며 프톨레마이오스 48개에 든다. 주변에 고래자리·물고기자리·에리다누스자리 같은 '물의 별자리'가 모여 있다.",
    en: "The water-bearer, a zodiac constellation and one of Ptolemy's 48. It sits amid a whole region of watery figures — Cetus, Pisces, Eridanus.",
  },
  Aql: {
    ko: "제우스의 번개를 나르던 독수리. 알타이르가 여기 있고, 거문고자리 베가·고니자리 데네브와 함께 여름의 대삼각형을 이룬다.",
    en: "The eagle that carried Zeus's thunderbolts. Its star Altair forms the Summer Triangle with Vega in Lyra and Deneb in Cygnus.",
  },
  Ara: {
    ko: "신들이 티탄과 싸우기 전 맹세를 올린 제단. 프톨레마이오스 48개 중 하나로, 남반구에서 은하수를 배경으로 놓인다.",
    en: "The altar where the gods swore their oath before battling the Titans. One of Ptolemy's 48, set against the southern Milky Way.",
  },
  Ari: {
    ko: "황금 양털을 지닌 숫양. 약 2천 년 전에는 춘분점이 이 별자리에 있어 황도의 시작으로 여겨졌다. 세차운동으로 지금 춘분점은 물고기자리에 있다.",
    en: "The ram of the Golden Fleece. Two thousand years ago the vernal equinox lay here, making it the start of the zodiac; precession has since moved that point into Pisces.",
  },
  Aur: {
    ko: "마차를 모는 사람. 북천에서 여섯 번째로 밝은 별 카펠라가 여기 있고, 겨울 은하수를 가로질러 산개성단 세 개(M36·M37·M38)를 품는다.",
    en: "The charioteer. It holds Capella, the sixth-brightest star in the sky, and straddles the winter Milky Way with three open clusters — M36, M37 and M38.",
  },
  Boo: {
    ko: "큰곰을 쫓는 목동. 북반구에서 가장 밝은 별 아르크투루스가 여기 있으며, 큰곰자리 국자 손잡이의 곡선을 그대로 이어 내려오면 찾을 수 있다.",
    en: "The herdsman driving the Great Bear. It contains Arcturus, the brightest star in the northern sky — follow the curve of the Big Dipper's handle straight to it.",
  },
  Cae: {
    ko: "라카유가 만든 남천 별자리로, 조각가의 끌을 그렸다. 88개 중 여덟 번째로 작고 밝은 별이 없다.",
    en: "Lacaille's engraving chisel. It is the eighth-smallest constellation and contains no bright stars.",
  },
  Cam: {
    ko: "1612년 플란시우스가 북극 근처의 별 없는 빈 공간을 메우려 만든 별자리. 이름은 기린이지만 3등성보다 밝은 별이 하나도 없다.",
    en: "Invented by Plancius in 1612 to fill an empty patch near the pole. Despite naming a giraffe, it has no star brighter than third magnitude.",
  },
  Cnc: {
    ko: "헤라클레스의 발에 밟힌 게. 황도 12궁 중 가장 어둡지만, 맨눈으로도 흐릿하게 보이는 벌집성단(프레세페, M44)이 한가운데 있다.",
    en: "The crab crushed under Heracles' heel. The faintest constellation of the zodiac, yet it holds the Beehive Cluster (M44), visible to the unaided eye as a misty patch.",
  },
  CVn: {
    ko: "헤벨리우스가 17세기에 만든 별자리로, 목동이 큰곰을 쫓을 때 데리고 다니는 사냥개 두 마리를 그렸다. 정면으로 보이는 나선은하 M51(부자은하)이 여기 있다.",
    en: "Hevelius's hunting dogs, held on a leash by Boötes as he pursues the Great Bear. It contains M51, the Whirlpool Galaxy, seen face-on.",
  },
  CMa: {
    ko: "오리온을 따르는 큰 사냥개. 밤하늘에서 가장 밝은 별 시리우스가 여기 있다. 시리우스가 밝은 건 특별히 거대해서가 아니라 8.6광년으로 가깝기 때문이다.",
    en: "Orion's greater hunting dog, home to Sirius — the brightest star in the night sky. Sirius is brilliant not because it is huge but because it is close: 8.6 light-years.",
  },
  CMi: {
    ko: "작은 사냥개. 별 두 개가 사실상 전부지만 그중 프로키온이 시리우스·베텔게우스와 함께 겨울의 대삼각형을 이룬다.",
    en: "The lesser dog — essentially just two stars, but one of them is Procyon, which forms the Winter Triangle with Sirius and Betelgeuse.",
  },
  Cap: {
    ko: "상반신은 염소, 하반신은 물고기인 기묘한 형상. 황도 12궁에서 가장 작으며, 판 신이 괴물을 피해 강에 뛰어들다 변한 모습이라 전해진다.",
    en: "A goat with a fish's tail — the smallest zodiac constellation. The story has the god Pan leaping into a river to escape a monster and half-transforming.",
  },
  Car: {
    ko: "원래 거대한 아르고자리의 일부였던 배의 용골. 라카유가 아르고자리를 셋으로 나누면서 독립했다. 두 번째로 밝은 별 카노푸스와 거대한 용골자리 성운이 있다.",
    en: "The keel of the ship Argo, split off when Lacaille divided that vast constellation into three. It holds Canopus, the second-brightest star, and the vast Carina Nebula.",
  },
  Cas: {
    ko: "딸의 미모를 자랑하다 벌을 받아 하늘에 거꾸로 매달린 왕비. 다섯 별이 그리는 W(또는 M) 자가 워낙 뚜렷해 북쪽 하늘의 이정표 노릇을 한다.",
    en: "The boastful queen, set in the sky upside-down as punishment. Her five stars trace an unmistakable W — one of the north's most reliable landmarks.",
  },
  Cen: {
    ko: "반인반마 케이론. 태양에서 가장 가까운 별 프록시마 켄타우리(4.2광년)와 하늘에서 가장 큰 구상성단 오메가 센타우리가 여기 있다.",
    en: "The centaur Chiron. It contains Proxima Centauri, the nearest star to the Sun at 4.2 light-years, and Omega Centauri, the sky's largest globular cluster.",
  },
  Cep: {
    ko: "카시오페이아의 남편이자 안드로메다의 아버지인 왕. 오각형 집 모양으로 그려진다. 변광성 주기와 밝기의 관계가 처음 밝혀진 델타 세페이가 여기 있고, 그 발견이 우주의 거리를 재는 잣대가 됐다.",
    en: "The king, husband of Cassiopeia and father of Andromeda, drawn as a lopsided house. Delta Cephei gave its name to the Cepheid variables, whose period–luminosity law became the yardstick for cosmic distance.",
  },
  Cet: {
    ko: "안드로메다를 삼키려던 바다괴물. 네 번째로 큰 별자리이며, 밝기가 300일 주기로 2등급에서 10등급까지 오르내리는 최초의 발견 변광성 미라가 있다.",
    en: "The sea monster sent to devour Andromeda. The fourth-largest constellation, it holds Mira — the first variable star ever recognised, swinging from second to tenth magnitude over 300 days.",
  },
  Cha: {
    ko: "케이서와 더 하우트만이 만든 남천 별자리. 카멜레온을 그렸으며 남극 가까이 있어 북반구에서는 볼 수 없다.",
    en: "The chameleon, from Keyser and de Houtman. It lies so close to the south celestial pole that it never rises for northern observers.",
  },
  Cir: {
    ko: "라카유가 만든 제도용 컴퍼스. 알파 센타우리 바로 옆에 있어 찾기는 쉽지만 그 자체는 어둡다.",
    en: "Lacaille's drafting compasses. It sits right beside Alpha Centauri, which makes it easy to locate even though it is faint.",
  },
  Col: {
    ko: "노아의 방주에서 날려 보낸 비둘기. 1592년 플란시우스가 큰개자리 아래의 빈 하늘에 만들었다.",
    en: "The dove released from Noah's ark, placed by Plancius in 1592 in the empty sky below Canis Major.",
  },
  Com: {
    ko: "이집트 왕비 베레니케 2세가 남편의 무사 귀환을 빌며 잘라 바친 머리카락. 실존 인물을 기리는 유일한 별자리이며, 흐릿하게 흩뿌려진 별무리가 머리카락처럼 보인다.",
    en: "The hair Queen Berenice II cut off in thanks for her husband's safe return — the only constellation named for a historical person. Its scattered faint stars really do look like strands.",
  },
  CrA: {
    ko: "남쪽의 왕관. 궁수자리 바로 아래에서 작은 반원을 그린다. 프톨레마이오스 48개 중 하나다.",
    en: "The southern crown, a small arc just below Sagittarius. One of Ptolemy's 48.",
  },
  CrB: {
    ko: "아리아드네가 받은 왕관. 일곱 별이 또렷한 반원을 그려 작지만 알아보기 쉽다. 수십 년에 한 번 폭발하는 재귀 신성 T 코로나이 보레알리스가 여기 있다.",
    en: "Ariadne's crown — seven stars in a clean semicircle, small but unmistakable. It hosts T Coronae Borealis, a recurrent nova that erupts every few decades.",
  },
  Crv: {
    ko: "아폴론이 보낸 까마귀. 물을 떠 오라는 심부름을 미루고 거짓말을 하다 하늘에 박혔다는 이야기가 전한다. 네 별이 만드는 작은 사다리꼴이 뚜렷하다.",
    en: "Apollo's raven, fixed in the sky after dawdling on an errand and lying about it. Its four stars form a compact, distinct trapezoid.",
  },
  Crt: {
    ko: "아폴론의 잔. 까마귀자리 옆에 놓여 같은 이야기의 일부를 이룬다.",
    en: "Apollo's cup, placed beside Corvus as part of the same story.",
  },
  Cru: {
    ko: "88개 중 가장 작지만 남반구에서 가장 유명한 별자리. 긴 축을 남쪽으로 4.5배 연장하면 천구 남극의 위치를 알 수 있어 항해에 쓰였다. 여러 나라 국기에 그려져 있다.",
    en: "The smallest of the 88 and the most famous in the south. Extend its long axis four and a half times and you find the south celestial pole — a navigator's trick, and the reason it appears on several national flags.",
  },
  Cyg: {
    ko: "은하수를 따라 날아 내려오는 백조. '북쪽의 십자가'로도 불린다. 꼬리의 데네브는 지구에서 1,500광년 넘게 떨어져 있는데도 1등성으로 보일 만큼 밝다.",
    en: "The swan flying down the Milky Way, also called the Northern Cross. Deneb in its tail is over 1,500 light-years away yet still shines as a first-magnitude star.",
  },
  Del: {
    ko: "시인 아리온을 구한 돌고래. 작지만 다섯 별이 만드는 마름모가 또렷해서 눈에 잘 띈다.",
    en: "The dolphin that rescued the poet Arion. Small, but its five-star diamond is crisp enough to spot easily.",
  },
  Dor: {
    ko: "케이서와 더 하우트만이 만든 별자리. 만새기(황새치)를 그렸다. 우리 은하의 위성은하인 대마젤란은하 대부분이 이 영역에 들어온다.",
    en: "The dolphinfish, from Keyser and de Houtman. Most of the Large Magellanic Cloud, a satellite galaxy of our own, lies within its borders.",
  },
  Dra: {
    ko: "황금 사과를 지키던 용. 큰곰자리와 작은곰자리를 휘감으며 길게 뻗는다. 약 5천 년 전에는 이 별자리의 투반이 북극성이었고, 피라미드가 그 별을 향해 정렬됐다.",
    en: "The dragon that guarded the golden apples, winding between the two Bears. Five thousand years ago its star Thuban was the pole star — the pyramids were aligned to it.",
  },
  Equ: {
    ko: "88개 중 두 번째로 작은 별자리로, 말의 머리 부분만 그린다. 프톨레마이오스 48개에 들지만 밝은 별이 없다.",
    en: "The little horse — second-smallest of the 88, showing only a head. One of Ptolemy's 48, though it has no bright stars.",
  },
  Eri: {
    ko: "태양신의 마차를 몰다 추락한 파에톤이 떨어진 강. 오리온의 발치에서 시작해 남쪽으로 굽이쳐 내려가는, 여섯 번째로 큰 별자리다.",
    en: "The river into which Phaethon fell after losing control of the Sun's chariot. It winds south from Orion's foot and is the sixth-largest constellation.",
  },
  For: {
    ko: "라카유가 화학자 라부아지에를 기려 만든 화학로. 어두운 영역이지만 은하가 많아 외부은하 관측에서는 중요한 하늘이다.",
    en: "Lacaille's chemical furnace, honouring Lavoisier. Faint to the eye but rich in galaxies, making it important ground for extragalactic astronomy.",
  },
  Gem: {
    ko: "쌍둥이 형제 카스토르와 폴룩스. 두 밝은 별이 나란히 놓여 알아보기 쉽다. 매년 12월 중순 쌍둥이자리 유성우가 이 부근에서 쏟아진다.",
    en: "The twins Castor and Pollux, marked by two bright stars side by side. The Geminid meteor shower radiates from here each December.",
  },
  Gru: {
    ko: "케이서와 더 하우트만이 만든 두루미. 원래는 남쪽물고기자리의 일부로 여겨지던 별들이다.",
    en: "The crane, from Keyser and de Houtman. Its stars were once considered part of Piscis Austrinus.",
  },
  Her: {
    ko: "열두 과업의 영웅. 다섯 번째로 큰 별자리이며 몸통의 사다리꼴이 표지가 된다. 북천에서 가장 밝은 구상성단 M13이 그 사다리꼴 한 변에 걸려 있다.",
    en: "The hero of the twelve labours, fifth-largest of the constellations. The trapezoid of his torso is the landmark, and along one of its sides sits M13, the finest globular cluster in the northern sky.",
  },
  Hor: {
    ko: "라카유가 만든 진자시계. 항해 중 경도를 재려면 정확한 시계가 필요했던 시대의 산물이다.",
    en: "Lacaille's pendulum clock — a product of the age when finding longitude at sea depended on keeping accurate time.",
  },
  Hya: {
    ko: "헤라클레스가 벤 머리 아홉 달린 물뱀. 하늘에서 가장 큰 별자리로 100도 넘게 뻗어 있어, 한쪽 끝이 뜰 때 다른 끝은 아직 지평선 아래에 있다.",
    en: "The nine-headed serpent slain by Heracles — the largest constellation, sprawling over 100 degrees. One end is rising while the other is still below the horizon.",
  },
  Hyi: {
    ko: "케이서와 더 하우트만이 만든 작은 물뱀. 이름이 비슷한 바다뱀자리(Hydra)와는 전혀 다른 별자리이며, 남극 가까이 있다.",
    en: "The lesser water snake, from Keyser and de Houtman — a different constellation from the similarly named Hydra, and far to the south.",
  },
  Ind: {
    ko: "케이서와 더 하우트만이 만든 별자리로, 항해 중 마주친 원주민을 그렸다. 어둡고 눈에 띄는 천체가 적다.",
    en: "The Indian, from Keyser and de Houtman, depicting an indigenous figure encountered on their voyages. Faint, with few notable objects.",
  },
  Lac: {
    ko: "헤벨리우스가 백조자리와 안드로메다자리 사이의 빈 하늘에 만든 도마뱀. 밝은 별이 없어 W 자를 옆으로 눕힌 듯한 흐릿한 지그재그로 보인다.",
    en: "Hevelius's lizard, squeezed into the gap between Cygnus and Andromeda. With no bright stars it reads as a faint zigzag.",
  },
  Leo: {
    ko: "헤라클레스가 맨손으로 잡은 네메아의 사자. 앞가슴의 '낫' 모양이 뚜렷하고 그 아래 레굴루스가 놓인다. 황도에 걸쳐 있어 행성이 자주 지나간다.",
    en: "The Nemean lion Heracles killed bare-handed. The Sickle marks its head and mane, with Regulus at its base. Being on the ecliptic, planets pass through often.",
  },
  LMi: {
    ko: "헤벨리우스가 사자자리와 큰곰자리 사이에 만든 작은 사자. 알파성이 지정되지 않은 몇 안 되는 별자리 중 하나다.",
    en: "Hevelius's lesser lion, tucked between Leo and Ursa Major. It is one of the few constellations with no star designated alpha.",
  },
  Lep: {
    ko: "오리온의 발밑에 웅크린 토끼. 붉기로 유명한 탄소별 힌드의 심홍성이 여기 있다.",
    en: "The hare crouching at Orion's feet. It contains Hind's Crimson Star, a carbon star famous for its deep red colour.",
  },
  Lib: {
    ko: "정의의 저울. 원래는 전갈의 집게로 여겨졌고, 가장 밝은 두 별의 이름(주벤엘게누비·주벤에스차말리)이 아직 '남쪽 집게', '북쪽 집게'라는 뜻이다.",
    en: "The scales of justice — once the claws of the Scorpion. Its two brightest stars are still named Zubenelgenubi and Zubeneschamali: the southern and northern claw.",
  },
  Lup: {
    ko: "센타우루스가 창으로 꿴 늑대. 프톨레마이오스 48개 중 하나이며 은하수 가장자리에 놓인다.",
    en: "The wolf impaled on the Centaur's spear. One of Ptolemy's 48, lying along the edge of the Milky Way.",
  },
  Lyn: {
    ko: "헤벨리우스가 만든 별자리. 별이 워낙 어두워 '살쾡이의 눈을 가진 사람만 볼 수 있다'는 뜻으로 이름 붙였다고 전한다.",
    en: "Hevelius's lynx, so faint that he is said to have named it for the sharp eyes needed to see it at all.",
  },
  Lyr: {
    ko: "오르페우스의 수금. 작지만 하늘에서 다섯 번째로 밝은 베가가 있다. 세차운동으로 약 1만 2천 년 뒤에는 베가가 북극성이 된다.",
    en: "Orpheus's lyre. Small, but home to Vega, the fifth-brightest star — and, in about twelve thousand years, the pole star once again.",
  },
  Men: {
    ko: "라카유가 희망봉의 테이블산을 기려 만든 별자리. 지형을 기린 유일한 별자리이며, 88개 중 가장 어둡다.",
    en: "Lacaille's tribute to Table Mountain above Cape Town — the only constellation named after a landform, and the faintest of the 88.",
  },
  Mic: {
    ko: "라카유가 만든 현미경. 그가 만든 남천 14개 별자리는 대부분 과학기구의 이름을 땄다.",
    en: "Lacaille's microscope. Most of his fourteen southern constellations are named for scientific instruments.",
  },
  Mon: {
    ko: "플란시우스가 오리온과 큰개자리 사이 은하수 한복판에 만든 외뿔소. 별 자체는 어둡지만 장미성운과 크리스마스트리성단 같은 볼거리가 많다.",
    en: "Plancius's unicorn, set in the Milky Way between Orion and Canis Major. Its stars are faint but it holds the Rosette Nebula and the Christmas Tree Cluster.",
  },
  Mus: {
    ko: "케이서와 더 하우트만이 만든 파리. 남십자자리 바로 아래에 있으며, 곤충을 그린 유일한 별자리다.",
    en: "The fly, from Keyser and de Houtman, just below the Southern Cross — the only constellation depicting an insect.",
  },
  Nor: {
    ko: "라카유가 만든 직각자. 경계가 다시 그어지면서 원래 알파·베타로 지정됐던 별들이 이웃 별자리로 넘어가, 지금은 알파성이 없다.",
    en: "Lacaille's set square. Later boundary revisions moved its alpha and beta stars into a neighbouring constellation, so it now has neither.",
  },
  Oct: {
    ko: "라카유가 만든 팔분의. 천구 남극이 이 안에 있지만, 북극성에 해당하는 밝은 별이 없어 남반구에는 맨눈으로 극을 짚을 별이 없다.",
    en: "Lacaille's octant. The south celestial pole lies within it, but there is no bright star to mark it — the southern sky has no Polaris.",
  },
  Oph: {
    ko: "뱀을 든 치유의 신 아스클레피오스. 황도를 가로지르지만 12궁에는 들지 않아 자주 '열세 번째 별자리'로 불린다. 가장 큰 고유운동을 보이는 바너드별이 여기 있다.",
    en: "Asclepius, the healer, holding a serpent. The ecliptic crosses it, yet it is not one of the twelve signs — hence its reputation as the thirteenth. It contains Barnard's Star, which shows the largest proper motion of any star.",
  },
  Ori: {
    ko: "허리띠의 세 별로 즉시 알아볼 수 있는 사냥꾼. 붉은 초거성 베텔게우스와 푸른 리겔이 대각으로 마주 놓여 별의 색 차이를 맨눈으로 확인할 수 있다. 허리띠 아래 오리온 대성운(M42)은 별이 지금 태어나고 있는 곳이다.",
    en: "The hunter, identified instantly by the three stars of his belt. Red supergiant Betelgeuse and blue Rigel sit diagonally opposite, letting you see stellar colour with the naked eye. Below the belt, the Orion Nebula (M42) is a place where stars are forming right now.",
  },
  Pav: {
    ko: "케이서와 더 하우트만이 만든 공작. 가장 밝은 별 피코크는 20세기 영국 항법 성표를 위해 이름이 붙여진 비교적 최근의 명명이다.",
    en: "The peacock, from Keyser and de Houtman. Its brightest star was named Peacock only in the twentieth century, for a British air-navigation catalogue.",
  },
  Peg: {
    ko: "메두사의 피에서 태어난 날개 달린 말. 네 별이 만드는 커다란 사각형이 가을 하늘의 이정표다. 그중 한 꼭짓점은 사실 안드로메다자리의 별이다.",
    en: "The winged horse born from Medusa's blood. Its Great Square is the landmark of the autumn sky — though one of its four corners actually belongs to Andromeda.",
  },
  Per: {
    ko: "메두사의 목을 벤 영웅. 손에 든 머리에 해당하는 알골은 2.87일마다 짝별에 가려 눈에 띄게 어두워지는 식변광성으로, '악마의 별'로 불려 왔다.",
    en: "The hero who beheaded Medusa. Algol, marking the head he carries, dims noticeably every 2.87 days as its companion eclipses it — which is why it has long been called the Demon Star.",
  },
  Phe: {
    ko: "케이서와 더 하우트만이 만든 불사조. 재에서 되살아나는 새를 그렸다.",
    en: "The phoenix, from Keyser and de Houtman — the bird reborn from its own ashes.",
  },
  Pic: {
    ko: "라카유가 만든 화가의 이젤. 베타 픽토리스는 원시행성 원반이 직접 촬영된 최초의 별 중 하나로, 외계행성 연구의 출발점이 됐다.",
    en: "Lacaille's painter's easel. Beta Pictoris was among the first stars imaged with a protoplanetary disc, opening the way to exoplanet science.",
  },
  Psc: {
    ko: "끈으로 묶인 두 마리 물고기. 세차운동으로 현재 춘분점이 이 별자리 안에 있어, 태양의 1년 여정이 여기서 시작된다.",
    en: "Two fish joined by a cord. Precession has placed the vernal equinox inside its borders, so the Sun's yearly circuit now begins here.",
  },
  PsA: {
    ko: "물병자리가 쏟는 물을 받아 마시는 남쪽 물고기. 포말하우트는 가을 남쪽 하늘에 홀로 밝게 떠 '외로운 별'로 불린다.",
    en: "The southern fish drinking the water poured by Aquarius. Its star Fomalhaut shines alone in an empty stretch of autumn sky, earning it the name the Lonely One.",
  },
  Pup: {
    ko: "아르고자리를 나눈 세 조각 중 배의 고물. 은하수가 지나가 산개성단이 풍부하다.",
    en: "The stern of the ship Argo, one of the three pieces it was divided into. The Milky Way runs through it, making it rich in open clusters.",
  },
  Pyx: {
    ko: "라카유가 아르고자리 근처에 만든 나침반. 배의 부속이지만 아르고자리 분할과는 별개로 새로 만들어진 별자리다.",
    en: "Lacaille's mariner's compass, placed near Argo. Although a ship's instrument, it was created separately from the division of Argo itself.",
  },
  Ret: {
    ko: "라카유가 만든 그물. 망원경 접안부의 십자선(레티클)을 가리키며, 그가 별 위치를 재는 데 실제로 쓴 도구다.",
    en: "Lacaille's reticle — the crosshair grid in a telescope eyepiece, the very tool he used to measure star positions.",
  },
  Sge: {
    ko: "88개 중 세 번째로 작은 별자리. 화살 모양이 작지만 또렷하고, 헤라클레스가 쏜 화살이라고도 전한다.",
    en: "The arrow — third-smallest of the constellations, but its shape is small and unmistakable. Some tellings make it the arrow loosed by Heracles.",
  },
  Sgr: {
    ko: "활을 당긴 켄타우로스. 밝은 별들이 만드는 '찻주전자' 모양으로 찾는다. 그 주전자 주둥이 방향이 우리 은하의 중심이며, 은하수가 가장 두껍고 밝게 보이는 곳이다.",
    en: "The archer, found by the Teapot its bright stars form. The spout points toward the centre of our galaxy — which is why the Milky Way is thickest and brightest here.",
  },
  Sco: {
    ko: "오리온을 찔러 죽인 전갈. 붉은 초거성 안타레스가 심장 자리에 놓이는데, 그 이름은 '화성의 맞수'라는 뜻으로 색이 비슷해서 붙었다. 꼬리가 갈고리처럼 휘어 실제 전갈처럼 보이는 드문 별자리다.",
    en: "The scorpion that killed Orion. Red supergiant Antares marks its heart — the name means rival of Mars, for their similar colour. Its hooked tail makes it one of the few constellations that genuinely resembles its namesake.",
  },
  Scl: {
    ko: "라카유가 만든 조각가의 작업실. 은하 남극이 이 안에 있어 우리 은하의 먼지에 가리지 않은 외부은하가 잘 보인다.",
    en: "Lacaille's sculptor's studio. The south galactic pole lies here, so we look out of our own galaxy's dust and straight into deep space.",
  },
  Sct: {
    ko: "헤벨리우스가 폴란드 왕 얀 3세 소비에스키를 기려 만든 방패. 정치적 인물을 기린 유일한 별자리이며, 은하수의 밝은 부분인 '방패자리 성운'이 여기 있다.",
    en: "Hevelius's shield, honouring King John III Sobieski of Poland — the only constellation commemorating a political figure. It contains the Scutum Star Cloud, a bright knot of the Milky Way.",
  },
  Ser: {
    ko: "뱀주인이 두 손으로 붙든 뱀. 뱀주인자리를 사이에 두고 머리(Caput)와 꼬리(Cauda)로 완전히 갈라진, 하늘에서 유일하게 두 조각으로 나뉜 별자리다.",
    en: "The serpent held by Ophiuchus — and the only constellation split into two separate pieces, the head (Caput) and tail (Cauda), divided by the serpent-bearer between them.",
  },
  Sex: {
    ko: "헤벨리우스가 만든 육분의. 화재로 잃은 자신의 관측기구를 기려 이름 붙였다.",
    en: "Hevelius's sextant, named in memory of the instrument he lost when his observatory burned.",
  },
  Tau: {
    ko: "에우로페를 태우고 바다를 건넌 황소. 붉은 알데바란이 눈에 해당하고, 어깨에는 맨눈으로 여섯에서 일곱 개가 보이는 플레이아데스 성단이 얹혀 있다. 초신성 잔해인 게성운(M1)도 여기 있다.",
    en: "The bull that carried Europa across the sea. Red Aldebaran is its eye, and the Pleiades ride on its shoulder — six or seven stars to the naked eye. The Crab Nebula (M1), a supernova remnant, lies here too.",
  },
  Tel: {
    ko: "라카유가 만든 망원경. 그가 남천 별자리를 만들 때 실제로 쓴 도구를 기린 것이다.",
    en: "Lacaille's telescope, honouring the instrument he used to chart the southern sky in the first place.",
  },
  Tri: {
    ko: "단순한 삼각형이지만 프톨레마이오스 48개에 드는 오래된 별자리. 나선은하 M33(삼각형자리 은하)이 여기 있으며, 아주 어두운 하늘에서는 맨눈으로도 보인다고 한다.",
    en: "A plain triangle, yet one of Ptolemy's original 48. It holds M33, the Triangulum Galaxy, which under truly dark skies is said to be visible to the unaided eye.",
  },
  TrA: {
    ko: "케이서와 더 하우트만이 만든 남쪽 삼각형. 북쪽의 삼각형자리보다 밝은 별로 이루어져 오히려 눈에 잘 띈다.",
    en: "The southern triangle, from Keyser and de Houtman. Its stars are brighter than those of the northern Triangulum, making it the easier of the two to see.",
  },
  Tuc: {
    ko: "케이서와 더 하우트만이 만든 큰부리새. 소마젤란은하와 하늘에서 두 번째로 밝은 구상성단 47 투카나이가 여기 있다.",
    en: "The toucan, from Keyser and de Houtman. It contains the Small Magellanic Cloud and 47 Tucanae, the second-brightest globular cluster in the sky.",
  },
  UMa: {
    ko: "제우스에게 곰으로 변한 님프 칼리스토. 일곱 별이 만드는 북두칠성은 별자리 전체가 아니라 그 일부다. 국자 끝 두 별을 이어 다섯 배 늘이면 북극성에 닿는다.",
    en: "The nymph Callisto, turned into a bear by Zeus. The seven stars of the Big Dipper are only part of it. Extend the two stars at the end of the bowl five times and you reach Polaris.",
  },
  UMi: {
    ko: "꼬리 끝에 북극성이 달린 작은 곰. 북극성은 특별히 밝지는 않지만 천구 북극에서 1도도 안 떨어져 있어 밤새 거의 움직이지 않는다. 고도가 곧 관측지의 위도다.",
    en: "The little bear, with Polaris at the tip of its tail. Polaris is not especially bright, but it sits less than a degree from the celestial pole and barely moves all night. Its altitude equals your latitude.",
  },
  Vel: {
    ko: "아르고자리를 나눈 세 조각 중 배의 돛. 라카유의 분할 때문에 알파와 베타 별이 없다 — 그 부호들은 용골자리로 갔다.",
    en: "The sails of the ship Argo. Because of Lacaille's division it has no alpha or beta star — those designations went to Carina.",
  },
  Vir: {
    ko: "밀 이삭을 든 수확의 여신. 두 번째로 큰 별자리이며, 이삭에 해당하는 스피카가 밝다. 수천 개의 은하가 모인 처녀자리 은하단이 이 방향에 있다.",
    en: "The harvest maiden holding an ear of wheat — the second-largest constellation, marked by bright Spica. The Virgo Cluster, with thousands of galaxies, lies in this direction.",
  },
  Vol: {
    ko: "케이서와 더 하우트만이 만든 날치. 항해 중 갑판으로 뛰어오르던 물고기를 그렸다.",
    en: "The flying fish, from Keyser and de Houtman — the fish that leapt onto their decks during the voyage.",
  },
  Vul: {
    ko: "헤벨리우스가 만든 작은 여우. 원래는 거위를 문 여우였다. 최초로 발견된 행성상성운 아령성운(M27)이 여기 있고, 최초의 펄서도 이 방향에서 검출됐다.",
    en: "Hevelius's little fox, originally shown carrying a goose. It holds the Dumbbell Nebula (M27), the first planetary nebula ever found, and the first pulsar was detected in this direction.",
  },
};

export function loreOf(id: string, lang: "ko" | "en"): string | null {
  const l = CONSTELLATION_LORE[id];
  return l ? l[lang] : null;
}
