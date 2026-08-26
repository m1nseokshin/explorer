/**
 * 위치 선택용 도시 목록.
 *
 * 별 위치를 정하는 데 필요한 정확도는 '도시 단위'다 — 1km 위치 오차는 별을
 * 0.01° 움직인다. 그래서 좌표는 도시 중심 근사면 충분하고, 대신 어느 대륙에
 * 있든 가까운 선택지가 하나는 나오도록 넓게 깔았다.
 *
 * rank는 지도 라벨 우선순위다. 1이 가장 먼저 표시되고, 확대할수록 2·3이 나온다.
 */
export interface City {
  ko: string;
  en: string;
  lat: number;
  lon: number;
  /** 1 = 항상 표시 후보, 3 = 확대해야 보인다 */
  rank: 1 | 2 | 3;
}

export const DEFAULT_CITY: City = {
  ko: "서울",
  en: "Seoul",
  lat: 37.5665,
  lon: 126.978,
  rank: 1,
};

export const CITIES: City[] = [
  // ── 한국 ──────────────────────────────────────────────────────────
  DEFAULT_CITY,
  { ko: "부산", en: "Busan", lat: 35.1796, lon: 129.0756, rank: 2 },
  { ko: "인천", en: "Incheon", lat: 37.4563, lon: 126.7052, rank: 3 },
  { ko: "대구", en: "Daegu", lat: 35.8714, lon: 128.6014, rank: 3 },
  { ko: "대전", en: "Daejeon", lat: 36.3504, lon: 127.3845, rank: 3 },
  { ko: "광주", en: "Gwangju", lat: 35.1595, lon: 126.8526, rank: 3 },
  { ko: "울산", en: "Ulsan", lat: 35.5384, lon: 129.3114, rank: 3 },
  { ko: "강릉", en: "Gangneung", lat: 37.7519, lon: 128.8761, rank: 3 },
  { ko: "제주", en: "Jeju", lat: 33.4996, lon: 126.5312, rank: 2 },

  // ── 동아시아 ──────────────────────────────────────────────────────
  { ko: "도쿄", en: "Tokyo", lat: 35.6762, lon: 139.6503, rank: 1 },
  { ko: "오사카", en: "Osaka", lat: 34.6937, lon: 135.5023, rank: 2 },
  { ko: "삿포로", en: "Sapporo", lat: 43.0618, lon: 141.3545, rank: 3 },
  { ko: "후쿠오카", en: "Fukuoka", lat: 33.5904, lon: 130.4017, rank: 3 },
  { ko: "베이징", en: "Beijing", lat: 39.9042, lon: 116.4074, rank: 1 },
  { ko: "상하이", en: "Shanghai", lat: 31.2304, lon: 121.4737, rank: 1 },
  { ko: "광저우", en: "Guangzhou", lat: 23.1291, lon: 113.2644, rank: 2 },
  { ko: "청두", en: "Chengdu", lat: 30.5728, lon: 104.0668, rank: 3 },
  { ko: "시안", en: "Xi'an", lat: 34.3416, lon: 108.9398, rank: 3 },
  { ko: "우루무치", en: "Ürümqi", lat: 43.8256, lon: 87.6168, rank: 3 },
  { ko: "홍콩", en: "Hong Kong", lat: 22.3193, lon: 114.1694, rank: 1 },
  { ko: "타이베이", en: "Taipei", lat: 25.033, lon: 121.5654, rank: 2 },
  { ko: "울란바토르", en: "Ulaanbaatar", lat: 47.8864, lon: 106.9057, rank: 2 },
  { ko: "평양", en: "Pyongyang", lat: 39.0392, lon: 125.7625, rank: 3 },

  // ── 동남아·남아시아 ────────────────────────────────────────────────
  { ko: "싱가포르", en: "Singapore", lat: 1.3521, lon: 103.8198, rank: 1 },
  { ko: "방콕", en: "Bangkok", lat: 13.7563, lon: 100.5018, rank: 1 },
  { ko: "하노이", en: "Hanoi", lat: 21.0278, lon: 105.8342, rank: 2 },
  { ko: "호치민", en: "Ho Chi Minh City", lat: 10.8231, lon: 106.6297, rank: 2 },
  { ko: "쿠알라룸푸르", en: "Kuala Lumpur", lat: 3.139, lon: 101.6869, rank: 2 },
  { ko: "자카르타", en: "Jakarta", lat: -6.2088, lon: 106.8456, rank: 1 },
  { ko: "마닐라", en: "Manila", lat: 14.5995, lon: 120.9842, rank: 1 },
  { ko: "양곤", en: "Yangon", lat: 16.8409, lon: 96.1735, rank: 3 },
  { ko: "프놈펜", en: "Phnom Penh", lat: 11.5564, lon: 104.9282, rank: 3 },
  { ko: "델리", en: "Delhi", lat: 28.6139, lon: 77.209, rank: 1 },
  { ko: "뭄바이", en: "Mumbai", lat: 19.076, lon: 72.8777, rank: 1 },
  { ko: "벵갈루루", en: "Bengaluru", lat: 12.9716, lon: 77.5946, rank: 2 },
  { ko: "콜카타", en: "Kolkata", lat: 22.5726, lon: 88.3639, rank: 2 },
  { ko: "첸나이", en: "Chennai", lat: 13.0827, lon: 80.2707, rank: 3 },
  { ko: "다카", en: "Dhaka", lat: 23.8103, lon: 90.4125, rank: 2 },
  { ko: "카트만두", en: "Kathmandu", lat: 27.7172, lon: 85.324, rank: 3 },
  { ko: "콜롬보", en: "Colombo", lat: 6.9271, lon: 79.8612, rank: 3 },
  { ko: "카라치", en: "Karachi", lat: 24.8607, lon: 67.0011, rank: 2 },
  { ko: "라호르", en: "Lahore", lat: 31.5204, lon: 74.3587, rank: 3 },
  { ko: "카불", en: "Kabul", lat: 34.5553, lon: 69.2075, rank: 3 },
  { ko: "타슈켄트", en: "Tashkent", lat: 41.2995, lon: 69.2401, rank: 3 },
  { ko: "알마티", en: "Almaty", lat: 43.222, lon: 76.8512, rank: 3 },

  // ── 중동 ──────────────────────────────────────────────────────────
  { ko: "두바이", en: "Dubai", lat: 25.2048, lon: 55.2708, rank: 1 },
  { ko: "리야드", en: "Riyadh", lat: 24.7136, lon: 46.6753, rank: 2 },
  { ko: "도하", en: "Doha", lat: 25.2854, lon: 51.531, rank: 3 },
  { ko: "테헤란", en: "Tehran", lat: 35.6892, lon: 51.389, rank: 2 },
  { ko: "바그다드", en: "Baghdad", lat: 33.3152, lon: 44.3661, rank: 3 },
  { ko: "예루살렘", en: "Jerusalem", lat: 31.7683, lon: 35.2137, rank: 2 },
  { ko: "이스탄불", en: "Istanbul", lat: 41.0082, lon: 28.9784, rank: 1 },
  { ko: "앙카라", en: "Ankara", lat: 39.9334, lon: 32.8597, rank: 3 },

  // ── 유럽 ──────────────────────────────────────────────────────────
  { ko: "런던", en: "London", lat: 51.5074, lon: -0.1278, rank: 1 },
  { ko: "파리", en: "Paris", lat: 48.8566, lon: 2.3522, rank: 1 },
  { ko: "베를린", en: "Berlin", lat: 52.52, lon: 13.405, rank: 1 },
  { ko: "마드리드", en: "Madrid", lat: 40.4168, lon: -3.7038, rank: 1 },
  { ko: "로마", en: "Rome", lat: 41.9028, lon: 12.4964, rank: 1 },
  { ko: "암스테르담", en: "Amsterdam", lat: 52.3676, lon: 4.9041, rank: 2 },
  { ko: "브뤼셀", en: "Brussels", lat: 50.8503, lon: 4.3517, rank: 3 },
  { ko: "취리히", en: "Zurich", lat: 47.3769, lon: 8.5417, rank: 3 },
  { ko: "빈", en: "Vienna", lat: 48.2082, lon: 16.3738, rank: 2 },
  { ko: "프라하", en: "Prague", lat: 50.0755, lon: 14.4378, rank: 2 },
  { ko: "바르샤바", en: "Warsaw", lat: 52.2297, lon: 21.0122, rank: 2 },
  { ko: "부다페스트", en: "Budapest", lat: 47.4979, lon: 19.0402, rank: 3 },
  { ko: "아테네", en: "Athens", lat: 37.9838, lon: 23.7275, rank: 2 },
  { ko: "리스본", en: "Lisbon", lat: 38.7223, lon: -9.1393, rank: 2 },
  { ko: "바르셀로나", en: "Barcelona", lat: 41.3874, lon: 2.1686, rank: 3 },
  { ko: "뮌헨", en: "Munich", lat: 48.1351, lon: 11.582, rank: 3 },
  { ko: "코펜하겐", en: "Copenhagen", lat: 55.6761, lon: 12.5683, rank: 2 },
  { ko: "스톡홀름", en: "Stockholm", lat: 59.3293, lon: 18.0686, rank: 2 },
  { ko: "오슬로", en: "Oslo", lat: 59.9139, lon: 10.7522, rank: 2 },
  { ko: "헬싱키", en: "Helsinki", lat: 60.1699, lon: 24.9384, rank: 2 },
  { ko: "트롬쇠", en: "Tromsø", lat: 69.6492, lon: 18.9553, rank: 2 },
  { ko: "레이캬비크", en: "Reykjavik", lat: 64.1466, lon: -21.9426, rank: 1 },
  { ko: "더블린", en: "Dublin", lat: 53.3498, lon: -6.2603, rank: 2 },
  { ko: "에든버러", en: "Edinburgh", lat: 55.9533, lon: -3.1883, rank: 3 },
  { ko: "모스크바", en: "Moscow", lat: 55.7558, lon: 37.6173, rank: 1 },
  { ko: "상트페테르부르크", en: "St Petersburg", lat: 59.9311, lon: 30.3609, rank: 3 },
  { ko: "키이우", en: "Kyiv", lat: 50.4501, lon: 30.5234, rank: 2 },
  { ko: "노보시비르스크", en: "Novosibirsk", lat: 55.0084, lon: 82.9357, rank: 3 },
  { ko: "이르쿠츠크", en: "Irkutsk", lat: 52.2871, lon: 104.3055, rank: 3 },
  { ko: "블라디보스토크", en: "Vladivostok", lat: 43.1155, lon: 131.8855, rank: 3 },

  // ── 아프리카 ──────────────────────────────────────────────────────
  { ko: "카이로", en: "Cairo", lat: 30.0444, lon: 31.2357, rank: 1 },
  { ko: "라고스", en: "Lagos", lat: 6.5244, lon: 3.3792, rank: 1 },
  { ko: "나이로비", en: "Nairobi", lat: -1.2921, lon: 36.8219, rank: 1 },
  { ko: "케이프타운", en: "Cape Town", lat: -33.9249, lon: 18.4241, rank: 1 },
  { ko: "요하네스버그", en: "Johannesburg", lat: -26.2041, lon: 28.0473, rank: 2 },
  { ko: "아디스아바바", en: "Addis Ababa", lat: 9.0192, lon: 38.7525, rank: 2 },
  { ko: "카사블랑카", en: "Casablanca", lat: 33.5731, lon: -7.5898, rank: 2 },
  { ko: "알제", en: "Algiers", lat: 36.7538, lon: 3.0588, rank: 3 },
  { ko: "다카르", en: "Dakar", lat: 14.7167, lon: -17.4677, rank: 2 },
  { ko: "아크라", en: "Accra", lat: 5.6037, lon: -0.187, rank: 3 },
  { ko: "킨샤사", en: "Kinshasa", lat: -4.4419, lon: 15.2663, rank: 2 },
  { ko: "루안다", en: "Luanda", lat: -8.839, lon: 13.2894, rank: 3 },
  { ko: "다르에스살람", en: "Dar es Salaam", lat: -6.7924, lon: 39.2083, rank: 3 },
  { ko: "안타나나리보", en: "Antananarivo", lat: -18.8792, lon: 47.5079, rank: 3 },
  { ko: "윈드훅", en: "Windhoek", lat: -22.5597, lon: 17.0832, rank: 3 },

  // ── 북아메리카 ────────────────────────────────────────────────────
  { ko: "뉴욕", en: "New York", lat: 40.7128, lon: -74.006, rank: 1 },
  { ko: "로스앤젤레스", en: "Los Angeles", lat: 34.0522, lon: -118.2437, rank: 1 },
  { ko: "시카고", en: "Chicago", lat: 41.8781, lon: -87.6298, rank: 1 },
  { ko: "샌프란시스코", en: "San Francisco", lat: 37.7749, lon: -122.4194, rank: 2 },
  { ko: "시애틀", en: "Seattle", lat: 47.6062, lon: -122.3321, rank: 2 },
  { ko: "덴버", en: "Denver", lat: 39.7392, lon: -104.9903, rank: 3 },
  { ko: "휴스턴", en: "Houston", lat: 29.7604, lon: -95.3698, rank: 2 },
  { ko: "마이애미", en: "Miami", lat: 25.7617, lon: -80.1918, rank: 2 },
  { ko: "보스턴", en: "Boston", lat: 42.3601, lon: -71.0589, rank: 3 },
  { ko: "피닉스", en: "Phoenix", lat: 33.4484, lon: -112.074, rank: 3 },
  { ko: "앵커리지", en: "Anchorage", lat: 61.2181, lon: -149.9003, rank: 2 },
  { ko: "호놀룰루", en: "Honolulu", lat: 21.3069, lon: -157.8583, rank: 1 },
  { ko: "토론토", en: "Toronto", lat: 43.6532, lon: -79.3832, rank: 1 },
  { ko: "밴쿠버", en: "Vancouver", lat: 49.2827, lon: -123.1207, rank: 2 },
  { ko: "몬트리올", en: "Montreal", lat: 45.5017, lon: -73.5673, rank: 3 },
  { ko: "옐로나이프", en: "Yellowknife", lat: 62.454, lon: -114.3718, rank: 3 },
  { ko: "멕시코시티", en: "Mexico City", lat: 19.4326, lon: -99.1332, rank: 1 },
  { ko: "과달라하라", en: "Guadalajara", lat: 20.6597, lon: -103.3496, rank: 3 },
  { ko: "아바나", en: "Havana", lat: 23.1136, lon: -82.3666, rank: 2 },
  { ko: "파나마시티", en: "Panama City", lat: 8.9824, lon: -79.5199, rank: 2 },
  { ko: "과테말라시티", en: "Guatemala City", lat: 14.6349, lon: -90.5069, rank: 3 },

  // ── 남아메리카 ────────────────────────────────────────────────────
  { ko: "상파울루", en: "São Paulo", lat: -23.5505, lon: -46.6333, rank: 1 },
  { ko: "리우데자네이루", en: "Rio de Janeiro", lat: -22.9068, lon: -43.1729, rank: 1 },
  { ko: "브라질리아", en: "Brasília", lat: -15.7975, lon: -47.8919, rank: 3 },
  { ko: "부에노스아이레스", en: "Buenos Aires", lat: -34.6037, lon: -58.3816, rank: 1 },
  { ko: "산티아고", en: "Santiago", lat: -33.4489, lon: -70.6693, rank: 1 },
  { ko: "리마", en: "Lima", lat: -12.0464, lon: -77.0428, rank: 1 },
  { ko: "보고타", en: "Bogotá", lat: 4.711, lon: -74.0721, rank: 2 },
  { ko: "카라카스", en: "Caracas", lat: 10.4806, lon: -66.9036, rank: 3 },
  { ko: "키토", en: "Quito", lat: -0.1807, lon: -78.4678, rank: 2 },
  { ko: "라파스", en: "La Paz", lat: -16.4897, lon: -68.1193, rank: 3 },
  { ko: "몬테비데오", en: "Montevideo", lat: -34.9011, lon: -56.1645, rank: 3 },
  { ko: "우수아이아", en: "Ushuaia", lat: -54.8019, lon: -68.303, rank: 2 },

  // ── 오세아니아·태평양 ──────────────────────────────────────────────
  { ko: "시드니", en: "Sydney", lat: -33.8688, lon: 151.2093, rank: 1 },
  { ko: "멜버른", en: "Melbourne", lat: -37.8136, lon: 144.9631, rank: 1 },
  { ko: "브리즈번", en: "Brisbane", lat: -27.4698, lon: 153.0251, rank: 2 },
  { ko: "퍼스", en: "Perth", lat: -31.9505, lon: 115.8605, rank: 1 },
  { ko: "애들레이드", en: "Adelaide", lat: -34.9285, lon: 138.6007, rank: 3 },
  { ko: "앨리스스프링스", en: "Alice Springs", lat: -23.698, lon: 133.8807, rank: 3 },
  { ko: "다윈", en: "Darwin", lat: -12.4634, lon: 130.8456, rank: 3 },
  { ko: "오클랜드", en: "Auckland", lat: -36.8485, lon: 174.7633, rank: 1 },
  { ko: "크라이스트처치", en: "Christchurch", lat: -43.5321, lon: 172.6362, rank: 2 },
  { ko: "포트모르즈비", en: "Port Moresby", lat: -9.4438, lon: 147.1803, rank: 3 },
  { ko: "수바", en: "Suva", lat: -18.1416, lon: 178.4419, rank: 2 },
  { ko: "파페에테", en: "Papeete", lat: -17.5516, lon: -149.5585, rank: 2 },

  // ── 극지 관측소 ───────────────────────────────────────────────────
  { ko: "롱이어비엔", en: "Longyearbyen", lat: 78.2232, lon: 15.6267, rank: 2 },
  { ko: "아문센-스콧 기지", en: "Amundsen–Scott", lat: -89.9975, lon: 0, rank: 2 },
  { ko: "세종기지", en: "King Sejong Station", lat: -62.2233, lon: -58.7869, rank: 3 },
];
