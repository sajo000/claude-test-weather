// Open-Meteo API 연동 유틸리티

export type WeatherCondition = "sunny" | "cloudy" | "rainy" | "snowy" | "stormy" | "foggy";

export interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country_code: string;
  population?: number;
}

export interface HourlyForecast {
  time: string;
  temp: number;
  condition: WeatherCondition;
  precipitationProbability: number;
}

export interface DailyForecast {
  day: string;
  condition: WeatherCondition;
  high: number;
  low: number;
}

export interface WeatherData {
  location: string;
  temperature: number;
  feelsLike: number;
  condition: WeatherCondition;
  conditionLabel: string;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  uvIndex: number;
  uvLabel: string;
  visibility: number;
  pressure: number;
  high: number;
  low: number;
  sunrise: string;
  sunset: string;
  hourly: HourlyForecast[];
  weekly: DailyForecast[];
}

// WMO 날씨 코드 → 조건 타입 변환
export function wmoToCondition(code: number): WeatherCondition {
  if (code === 0 || code === 1) return "sunny";
  if (code <= 3) return "cloudy";
  if (code <= 48) return "foggy";
  if (code <= 67) return "rainy";
  if (code <= 77) return "snowy";
  if (code <= 82) return "rainy";
  if (code <= 86) return "snowy";
  return "stormy";
}

// WMO 날씨 코드 → 한국어 날씨 설명
export function wmoToLabel(code: number): string {
  const labels: Record<number, string> = {
    0: "맑음",
    1: "대체로 맑음",
    2: "구름 조금",
    3: "흐림",
    45: "안개",
    48: "안개",
    51: "가벼운 이슬비",
    53: "이슬비",
    55: "강한 이슬비",
    61: "가벼운 비",
    63: "비",
    65: "강한 비",
    71: "가벼운 눈",
    73: "눈",
    75: "강한 눈",
    77: "싸락눈",
    80: "소나기",
    81: "소나기",
    82: "강한 소나기",
    85: "눈 소나기",
    86: "강한 눈 소나기",
    95: "뇌우",
    96: "우박을 동반한 뇌우",
    99: "강한 우박을 동반한 뇌우",
  };
  return labels[code] ?? "날씨 정보 없음";
}

// UV 지수 → 등급 라벨
export function getUVLabel(index: number): string {
  if (index < 3) return "낮음";
  if (index < 6) return "보통";
  if (index < 8) return "높음";
  if (index < 11) return "매우 높음";
  return "위험";
}

// ISO 시간 문자열 → "오후 3시" 형식 변환
function formatHour(isoTime: string, index: number): string {
  if (index === 0) return "지금";
  const date = new Date(isoTime);
  const hours = date.getHours();
  if (hours === 0) return "자정";
  if (hours === 12) return "정오";
  if (hours < 12) return `오전 ${hours}시`;
  return `오후 ${hours - 12}시`;
}

// ISO 날짜 → 요일 이름 변환
function getDayName(dateStr: string, index: number): string {
  if (index === 0) return "오늘";
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const date = new Date(dateStr + "T00:00:00");
  return days[date.getDay()];
}

// ISO 시간 → "HH:MM" 추출 (예: "2026-04-13T06:15" → "06:15")
function extractTime(isoTime: string): string {
  return isoTime.split("T")[1]?.slice(0, 5) ?? "--:--";
}

// ─── 한국 주요 도시 내장 데이터 ───────────────────────────────
// Open-Meteo 지오코딩 API는 한국 소도시 품질이 불안정하므로
// 정확한 좌표를 직접 내장해 검색 정확도를 보장한다.

interface KoreanCity {
  name: string;
  province: string;
  latitude: number;
  longitude: number;
}

const KOREAN_CITIES: KoreanCity[] = [
  // 특별시 / 광역시
  { name: "서울",   province: "서울특별시",        latitude: 37.5665,  longitude: 126.9780 },
  { name: "부산",   province: "부산광역시",        latitude: 35.1796,  longitude: 129.0756 },
  { name: "인천",   province: "인천광역시",        latitude: 37.4563,  longitude: 126.7052 },
  { name: "대구",   province: "대구광역시",        latitude: 35.8714,  longitude: 128.6014 },
  { name: "대전",   province: "대전광역시",        latitude: 36.3504,  longitude: 127.3845 },
  { name: "광주",   province: "광주광역시",        latitude: 35.1595,  longitude: 126.8526 },
  { name: "울산",   province: "울산광역시",        latitude: 35.5384,  longitude: 129.3114 },
  { name: "세종",   province: "세종특별자치시",     latitude: 36.4800,  longitude: 127.2890 },
  // 경기도
  { name: "수원",   province: "경기도",            latitude: 37.2636,  longitude: 127.0286 },
  { name: "성남",   province: "경기도",            latitude: 37.4449,  longitude: 127.1389 },
  { name: "고양",   province: "경기도",            latitude: 37.6584,  longitude: 126.8320 },
  { name: "용인",   province: "경기도",            latitude: 37.2411,  longitude: 127.1776 },
  { name: "부천",   province: "경기도",            latitude: 37.5034,  longitude: 126.7660 },
  { name: "안산",   province: "경기도",            latitude: 37.3219,  longitude: 126.8309 },
  { name: "안양",   province: "경기도",            latitude: 37.3943,  longitude: 126.9568 },
  { name: "남양주", province: "경기도",            latitude: 37.6360,  longitude: 127.2160 },
  { name: "화성",   province: "경기도",            latitude: 37.1996,  longitude: 126.8312 },
  { name: "평택",   province: "경기도",            latitude: 36.9921,  longitude: 127.1128 },
  { name: "시흥",   province: "경기도",            latitude: 37.3800,  longitude: 126.8030 },
  { name: "파주",   province: "경기도",            latitude: 37.7601,  longitude: 126.7800 },
  { name: "의정부", province: "경기도",            latitude: 37.7381,  longitude: 127.0485 },
  { name: "하남",   province: "경기도",            latitude: 37.5398,  longitude: 127.2148 },
  { name: "김포",   province: "경기도",            latitude: 37.6153,  longitude: 126.7156 },
  { name: "광명",   province: "경기도",            latitude: 37.4784,  longitude: 126.8644 },
  { name: "광주",   province: "경기도",            latitude: 37.4296,  longitude: 127.2553 },
  { name: "군포",   province: "경기도",            latitude: 37.3617,  longitude: 126.9353 },
  { name: "오산",   province: "경기도",            latitude: 37.1500,  longitude: 127.0775 },
  { name: "이천",   province: "경기도",            latitude: 37.2720,  longitude: 127.4344 },
  { name: "구리",   province: "경기도",            latitude: 37.5943,  longitude: 127.1294 },
  { name: "안성",   province: "경기도",            latitude: 37.0076,  longitude: 127.2798 },
  { name: "의왕",   province: "경기도",            latitude: 37.3448,  longitude: 126.9682 },
  { name: "과천",   province: "경기도",            latitude: 37.4294,  longitude: 126.9878 },
  { name: "양주",   province: "경기도",            latitude: 37.7852,  longitude: 127.0457 },
  { name: "포천",   province: "경기도",            latitude: 37.8948,  longitude: 127.2004 },
  { name: "여주",   province: "경기도",            latitude: 37.2979,  longitude: 127.6373 },
  { name: "동두천", province: "경기도",            latitude: 37.9035,  longitude: 127.0606 },
  { name: "가평",   province: "경기도",            latitude: 37.8311,  longitude: 127.5096 },
  // 강원도
  { name: "춘천",   province: "강원도",            latitude: 37.8813,  longitude: 127.7298 },
  { name: "원주",   province: "강원도",            latitude: 37.3422,  longitude: 127.9201 },
  { name: "강릉",   province: "강원도",            latitude: 37.7519,  longitude: 128.8760 },
  { name: "동해",   province: "강원도",            latitude: 37.5245,  longitude: 129.1148 },
  { name: "속초",   province: "강원도",            latitude: 38.2070,  longitude: 128.5918 },
  { name: "삼척",   province: "강원도",            latitude: 37.4498,  longitude: 129.1649 },
  { name: "태백",   province: "강원도",            latitude: 37.1640,  longitude: 128.9854 },
  // 충청북도
  { name: "청주",   province: "충청북도",          latitude: 36.6424,  longitude: 127.4890 },
  { name: "충주",   province: "충청북도",          latitude: 36.9910,  longitude: 127.9259 },
  { name: "제천",   province: "충청북도",          latitude: 37.1328,  longitude: 128.1908 },
  // 충청남도
  { name: "천안",   province: "충청남도",          latitude: 36.8151,  longitude: 127.1139 },
  { name: "아산",   province: "충청남도",          latitude: 36.7898,  longitude: 127.0018 },
  { name: "서산",   province: "충청남도",          latitude: 36.7846,  longitude: 126.4503 },
  { name: "당진",   province: "충청남도",          latitude: 36.8895,  longitude: 126.6298 },
  { name: "공주",   province: "충청남도",          latitude: 36.4465,  longitude: 127.1192 },
  { name: "보령",   province: "충청남도",          latitude: 36.3332,  longitude: 126.6127 },
  { name: "논산",   province: "충청남도",          latitude: 36.1877,  longitude: 127.0988 },
  // 전라북도
  { name: "전주",   province: "전라북도",          latitude: 35.8242,  longitude: 127.1479 },
  { name: "군산",   province: "전라북도",          latitude: 35.9676,  longitude: 126.7368 },
  { name: "익산",   province: "전라북도",          latitude: 35.9483,  longitude: 126.9545 },
  { name: "정읍",   province: "전라북도",          latitude: 35.5699,  longitude: 126.8561 },
  { name: "남원",   province: "전라북도",          latitude: 35.4163,  longitude: 127.3901 },
  { name: "김제",   province: "전라북도",          latitude: 35.8033,  longitude: 126.8808 },
  // 전라남도
  { name: "목포",   province: "전라남도",          latitude: 34.8118,  longitude: 126.3922 },
  { name: "여수",   province: "전라남도",          latitude: 34.7604,  longitude: 127.6622 },
  { name: "순천",   province: "전라남도",          latitude: 34.9506,  longitude: 127.4872 },
  { name: "나주",   province: "전라남도",          latitude: 35.0160,  longitude: 126.7108 },
  { name: "광양",   province: "전라남도",          latitude: 34.9407,  longitude: 127.6956 },
  // 경상북도
  { name: "포항",   province: "경상북도",          latitude: 36.0190,  longitude: 129.3435 },
  { name: "경주",   province: "경상북도",          latitude: 35.8562,  longitude: 129.2247 },
  { name: "구미",   province: "경상북도",          latitude: 36.1195,  longitude: 128.3445 },
  { name: "안동",   province: "경상북도",          latitude: 36.5684,  longitude: 128.7294 },
  { name: "경산",   province: "경상북도",          latitude: 35.8248,  longitude: 128.7412 },
  { name: "김천",   province: "경상북도",          latitude: 36.1398,  longitude: 128.1135 },
  { name: "상주",   province: "경상북도",          latitude: 36.4107,  longitude: 128.1590 },
  { name: "문경",   province: "경상북도",          latitude: 36.5866,  longitude: 128.1866 },
  { name: "영주",   province: "경상북도",          latitude: 36.8058,  longitude: 128.6247 },
  { name: "영천",   province: "경상북도",          latitude: 35.9735,  longitude: 128.9381 },
  // 경상남도
  { name: "창원",   province: "경상남도",          latitude: 35.2285,  longitude: 128.6811 },
  { name: "진주",   province: "경상남도",          latitude: 35.1798,  longitude: 128.1076 },
  { name: "김해",   province: "경상남도",          latitude: 35.2285,  longitude: 128.8829 },
  { name: "거제",   province: "경상남도",          latitude: 34.8800,  longitude: 128.6213 },
  { name: "통영",   province: "경상남도",          latitude: 34.8544,  longitude: 128.4332 },
  { name: "양산",   province: "경상남도",          latitude: 35.3351,  longitude: 129.0367 },
  { name: "밀양",   province: "경상남도",          latitude: 35.5037,  longitude: 128.7460 },
  { name: "사천",   province: "경상남도",          latitude: 35.0036,  longitude: 128.0645 },
  { name: "함안",   province: "경상남도",          latitude: 35.2724,  longitude: 128.4069 },
  // 제주
  { name: "제주",   province: "제주특별자치도",     latitude: 33.4996,  longitude: 126.5312 },
  { name: "서귀포", province: "제주특별자치도",      latitude: 33.2530,  longitude: 126.5600 },
];

// 한국 도시 검색 — 내장 데이터 기반 (API 의존 없이 정확한 결과 보장)
export function searchKoreanCities(query: string): GeocodingResult[] {
  const q = query.trim();
  if (!q) return [];

  return KOREAN_CITIES
    .filter((city) => city.name.includes(q) || city.province.includes(q))
    .slice(0, 5)
    .map((city, i) => ({
      id: i,
      name: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
      admin1: city.province,
      country_code: "KR",
    }));
}

// Nominatim 역지오코딩: 좌표 → 한국어 도시명
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ko`;
    const res = await fetch(url, { headers: { "User-Agent": "weather-app/1.0" } });
    if (!res.ok) return "현재 위치";

    const data = await res.json();
    const addr = data.address ?? {};
    const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? "";
    const state = addr.state ?? "";
    return city ? `${city}${state ? ", " + state : ""}` : "현재 위치";
  } catch {
    return "현재 위치";
  }
}

// Open-Meteo API로 날씨 전체 데이터 조회
export async function fetchWeather(
  latitude: number,
  longitude: number,
  locationName: string
): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "surface_pressure",
      "visibility",
    ].join(",")
  );
  url.searchParams.set(
    "hourly",
    "temperature_2m,weather_code,uv_index,precipitation_probability"
  );
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset"
  );
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("timezone", "Asia/Seoul");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("forecast_hours", "24");

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`날씨 API 오류: ${res.status}`);

  const data = await res.json();
  const cur = data.current;
  const hourly = data.hourly;
  const daily = data.daily;

  // 현재 시각과 일치하는 hourly 인덱스 탐색
  const nowTime = cur.time as string;
  const hourlyTimes = hourly.time as string[];
  const nowIdx = Math.max(hourlyTimes.findIndex((t: string) => t === nowTime), 0);

  // 현재 시각 기준 UV 지수 (hourly에서 추출)
  const uvIndex = Math.round(hourly.uv_index[nowIdx] ?? 0);

  // 이후 12시간 시간별 예보
  const hourlyForecast: HourlyForecast[] = hourlyTimes
    .slice(nowIdx, nowIdx + 12)
    .map((t: string, i: number) => ({
      time: formatHour(t, i),
      temp: Math.round(hourly.temperature_2m[nowIdx + i]),
      condition: wmoToCondition(hourly.weather_code[nowIdx + i]),
      precipitationProbability: hourly.precipitation_probability[nowIdx + i] ?? 0,
    }));

  // 7일 주간 예보
  const weeklyForecast: DailyForecast[] = (daily.time as string[]).map(
    (t: string, i: number) => ({
      day: getDayName(t, i),
      condition: wmoToCondition(daily.weather_code[i]),
      high: Math.round(daily.temperature_2m_max[i]),
      low: Math.round(daily.temperature_2m_min[i]),
    })
  );

  return {
    location: locationName,
    temperature: Math.round(cur.temperature_2m),
    feelsLike: Math.round(cur.apparent_temperature),
    condition: wmoToCondition(cur.weather_code),
    conditionLabel: wmoToLabel(cur.weather_code),
    humidity: cur.relative_humidity_2m,
    windSpeed: Math.round(cur.wind_speed_10m),
    windDirection: Math.round(cur.wind_direction_10m ?? 0),
    uvIndex,
    uvLabel: getUVLabel(uvIndex),
    visibility: Math.round((cur.visibility ?? 0) / 1000),
    pressure: Math.round(cur.surface_pressure),
    high: weeklyForecast[0]?.high ?? 0,
    low: weeklyForecast[0]?.low ?? 0,
    sunrise: extractTime(daily.sunrise[0] ?? ""),
    sunset: extractTime(daily.sunset[0] ?? ""),
    hourly: hourlyForecast,
    weekly: weeklyForecast,
  };
}

// ─── 대기질 ────────────────────────────────────────────────────

export interface AirQualityData {
  pm2_5: number;
  pm10: number;
  europeanAqi: number;
}

export type AirQualityLevel = "좋음" | "보통" | "나쁨" | "매우나쁨";

// PM2.5 기준 (한국 환경부 기준, μg/m³)
export function getAirQualityLevel(pm2_5: number): AirQualityLevel {
  if (pm2_5 <= 15) return "좋음";
  if (pm2_5 <= 35) return "보통";
  if (pm2_5 <= 75) return "나쁨";
  return "매우나쁨";
}

// 등급별 색상
export function getAirQualityColor(level: AirQualityLevel): string {
  switch (level) {
    case "좋음":    return "#34d399"; // 초록
    case "보통":    return "#fbbf24"; // 노랑
    case "나쁨":    return "#f97316"; // 주황
    case "매우나쁨": return "#ef4444"; // 빨강
  }
}

// Open-Meteo Air Quality API 호출
export async function fetchAirQuality(latitude: number, longitude: number): Promise<AirQualityData> {
  try {
    const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
    url.searchParams.set("latitude", String(latitude));
    url.searchParams.set("longitude", String(longitude));
    url.searchParams.set("current", "pm10,pm2_5,european_aqi");
    url.searchParams.set("timezone", "Asia/Seoul");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`대기질 API 오류: ${res.status}`);

    const data = await res.json();
    const cur = data.current;
    return {
      pm2_5: Math.round(cur.pm2_5 ?? 0),
      pm10: Math.round(cur.pm10 ?? 0),
      europeanAqi: Math.round(cur.european_aqi ?? 0),
    };
  } catch (e) {
    console.error("대기질 데이터 로드 실패:", e);
    // 실패 시 기본값 반환 (앱 전체가 멈추지 않도록)
    return { pm2_5: 0, pm10: 0, europeanAqi: 0 };
  }
}
