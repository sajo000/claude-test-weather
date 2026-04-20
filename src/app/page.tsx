"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import {
  Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog,
  Wind, Droplets, Eye, Gauge, Thermometer, MapPin, Search,
  SunMedium, Loader2, Navigation, Heart, Sunrise, Sunset, X,
} from "lucide-react";
import {
  fetchWeather, fetchAirQuality, searchKoreanCities, reverseGeocode,
  getAirQualityLevel, getAirQualityColor,
  type WeatherCondition, type WeatherData, type GeocodingResult, type AirQualityData,
} from "@/lib/weather";

// ─── 타입 ──────────────────────────────────────────────────────

interface FavoriteCity {
  name: string;
  latitude: number;
  longitude: number;
}

interface Theme {
  text: string;
  textMuted: string;
  textFaint: string;
  cardBg: string;
  cardBorder: string;
  headerBg: string;
  inputBg: string;
  sectionLabel: string;
  isDark: boolean;
}

// ─── 헬퍼 함수 ─────────────────────────────────────────────────

const DEFAULT_LOCATION = { name: "서울, 대한민국", latitude: 37.5665, longitude: 126.978 };

// 시각별 cinematic 배경 그라디언트
function getGradient(condition: WeatherCondition, hour: number): string {
  // 심야 (22:00 – 04:00)
  if (hour >= 22 || hour < 4)
    return "linear-gradient(160deg, #020617 0%, #0c1445 55%, #0f172a 100%)";
  // 새벽 (04:00 – 06:00)
  if (hour < 6)
    return "linear-gradient(160deg, #0f0c29 0%, #1e1b4b 50%, #2d1b69 100%)";
  // 해진 직후 (20:00 – 22:00)
  if (hour >= 20)
    return "linear-gradient(160deg, #0a0a1a 0%, #0c1445 45%, #1a1040 100%)";
  // 황혼 (19:00 – 20:00)
  if (hour >= 19)
    return "linear-gradient(160deg, #1a0533 0%, #3b0764 35%, #7c1d37 70%, #4a1942 100%)";
  // 일몰 (18:00 – 19:00)
  if (hour >= 18)
    return "linear-gradient(160deg, #7c2d12 0%, #c2410c 30%, #ea580c 60%, #9333ea 100%)";
  // 노을 (17:00 – 18:00)
  if (hour >= 17)
    return "linear-gradient(160deg, #f97316 0%, #ea580c 25%, #dc2626 55%, #7c3aed 100%)";

  // 낮 시간 — 날씨 조건별
  switch (condition) {
    case "sunny":
      if (hour < 10) return "linear-gradient(160deg, #fef3c7 0%, #fde68a 35%, #fed7aa 70%, #fbbf24 100%)";
      return "linear-gradient(160deg, #0ea5e9 0%, #38bdf8 40%, #7dd3fc 75%, #bae6fd 100%)";
    case "cloudy":
      return "linear-gradient(160deg, #64748b 0%, #94a3b8 50%, #cbd5e1 100%)";
    case "rainy":
      return "linear-gradient(160deg, #1e3a5f 0%, #1e40af 45%, #1d4ed8 100%)";
    case "snowy":
      return "linear-gradient(160deg, #e0f2fe 0%, #dbeafe 50%, #eff6ff 100%)";
    case "stormy":
      return "linear-gradient(160deg, #1e1b4b 0%, #312e81 45%, #1f2937 100%)";
    case "foggy":
      return "linear-gradient(160deg, #94a3b8 0%, #cbd5e1 50%, #e2e8f0 100%)";
  }
}

// 배경이 어두운지 여부 판단
function calcIsDark(condition: WeatherCondition, hour: number): boolean {
  if (hour >= 18 || hour < 7) return true;
  if (condition === "stormy" || condition === "rainy") return true;
  if (hour >= 17) return true;
  return false;
}

// isDark에 따른 테마 색상 — 레이어드 글래스 기준
function getTheme(isDark: boolean): Theme {
  return isDark
    ? {
        text: "rgba(255,255,255,0.95)",
        textMuted: "rgba(255,255,255,0.62)",
        textFaint: "rgba(255,255,255,0.35)",
        cardBg: "rgba(255,255,255,0.06)",
        cardBorder: "rgba(255,255,255,0.18)",
        headerBg: "rgba(4,8,22,0.75)",
        inputBg: "rgba(255,255,255,0.08)",
        sectionLabel: "rgba(255,255,255,0.38)",
        isDark: true,
      }
    : {
        text: "#111827",
        textMuted: "rgba(17,24,39,0.62)",
        textFaint: "rgba(17,24,39,0.38)",
        cardBg: "rgba(255,255,255,0.42)",
        cardBorder: "rgba(255,255,255,0.85)",
        headerBg: "rgba(255,255,255,0.72)",
        inputBg: "rgba(255,255,255,0.38)",
        sectionLabel: "rgba(17,24,39,0.38)",
        isDark: false,
      };
}

// 도 → 나침반 방향
function degreesToCompass(deg: number): string {
  const dirs = ["북", "북동", "동", "남동", "남", "남서", "서", "북서"];
  return dirs[Math.round(deg / 45) % 8];
}

// 날씨 데이터 기반 옷차림·활동 추천
interface Recommendation {
  emoji: string;
  text: string;
}

function getOutfitRecommendations(weather: WeatherData): Recommendation[] {
  const results: Recommendation[] = [];
  const { feelsLike, condition, windSpeed, uvIndex } = weather;
  const precip = weather.hourly[0]?.precipitationProbability ?? 0;

  // 옷차림
  if (feelsLike >= 28)      results.push({ emoji: "👕", text: "반팔·반바지" });
  else if (feelsLike >= 23) results.push({ emoji: "👕", text: "반팔·얇은 긴바지" });
  else if (feelsLike >= 17) results.push({ emoji: "🧥", text: "긴팔·가벼운 아우터" });
  else if (feelsLike >= 10) results.push({ emoji: "🧥", text: "재킷·후드티" });
  else if (feelsLike >= 4)  results.push({ emoji: "🧥", text: "코트·두꺼운 니트" });
  else                      results.push({ emoji: "🧤", text: "패딩·목도리·장갑" });

  // 우산
  if (precip >= 60)        results.push({ emoji: "☂️", text: "우산 필수" });
  else if (precip >= 30)   results.push({ emoji: "🌂", text: "우산 챙기면 좋아요" });

  // 눈 / 뇌우
  if (condition === "snowy")  results.push({ emoji: "👟", text: "방수 신발 추천" });
  if (condition === "stormy") results.push({ emoji: "🏠", text: "외출 자제 권고" });

  // 강풍
  if (windSpeed >= 40) results.push({ emoji: "💨", text: "강풍 — 바람막이 필수" });
  else if (windSpeed >= 25) results.push({ emoji: "💨", text: "바람막이 추천" });

  // 자외선
  if (uvIndex >= 6)      results.push({ emoji: "🕶️", text: "선크림·선글라스 필수" });
  else if (uvIndex >= 3) results.push({ emoji: "🧴", text: "선크림 권장" });

  // 폭염·한파
  if (feelsLike >= 33) results.push({ emoji: "🥵", text: "폭염 주의 — 수분 보충" });
  if (feelsLike <= -5) results.push({ emoji: "🥶", text: "한파 주의 — 노출 최소화" });

  return results;
}

// 온도 단위 변환
function convertTemp(celsius: number, unit: "C" | "F"): number {
  return unit === "F" ? Math.round(celsius * 9 / 5 + 32) : celsius;
}

// 위경도 비교 (소수점 2자리 반올림)
function isSameLocation(a: FavoriteCity, lat: number, lon: number): boolean {
  return Math.abs(a.latitude - lat) < 0.05 && Math.abs(a.longitude - lon) < 0.05;
}

// ─── 서브 컴포넌트 ──────────────────────────────────────────────

interface WeatherIconProps {
  condition: WeatherCondition;
  size?: number;
  className?: string;
  isDark?: boolean;
}

function WeatherIcon({ condition, size = 20, className, isDark = false }: WeatherIconProps) {
  const dimColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(38,37,30,0.4)";
  const isLarge = size >= 48;

  switch (condition) {
    // 맑음: 천천히 회전 + 대형 아이콘엔 발광 펄스
    case "sunny":
      return (
        // will-change: transform → 별도 GPU 레이어로 분리, backdrop-filter 재계산 방지
        <motion.div
          key="sunny"
          className={className}
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            willChange: "transform",
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        >
          {isLarge && (
            <motion.div
              style={{
                position: "absolute",
                // inset 음수값 제거 → 섹션 경계 밖으로 확장되지 않도록
                inset: 0,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(249,115,22,0.35) 0%, transparent 75%)",
                pointerEvents: "none",
                willChange: "opacity, transform",
              }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.1, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          <Sun size={size} strokeWidth={1.5} style={{ color: "#f97316" }} />
        </motion.div>
      );

    // 흐림: x축 부유만 사용 (y 제거 → 수직 레이아웃 간섭 방지)
    case "cloudy":
      return (
        <motion.div
          key="cloudy"
          className={className}
          style={{ display: "inline-flex", willChange: "transform" }}
          animate={{ x: [0, 6, 0, -5, 0] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <Cloud size={size} strokeWidth={1.5} style={{ color: dimColor }} />
        </motion.div>
      );

    // 비: y 제거, rotate만 사용
    case "rainy":
      return (
        <motion.div
          key="rainy"
          className={className}
          style={{ display: "inline-flex", willChange: "transform" }}
          animate={{ rotate: [-4, 4, -4] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
        >
          <CloudRain size={size} strokeWidth={1.5} style={{ color: isDark ? "#93c5fd" : "#60a5fa" }} />
        </motion.div>
      );

    // 눈: y 제거, rotate만 사용
    case "snowy":
      return (
        <motion.div
          key="snowy"
          className={className}
          style={{ display: "inline-flex", willChange: "transform" }}
          animate={{ rotate: [-10, 10, -10] }}
          transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <CloudSnow size={size} strokeWidth={1.5} style={{ color: isDark ? "#bfdbfe" : "#93c5fd" }} />
        </motion.div>
      );

    // 뇌우: 번쩍임 + 진동, 플래시 사이 정지
    case "stormy":
      return (
        <motion.div
          key="stormy"
          className={className}
          style={{ display: "inline-flex", willChange: "transform, opacity" }}
          animate={{ x: [-3, 3, -2, 4, -1, 2, 0], opacity: [1, 0.55, 1, 0.4, 1, 0.75, 1] }}
          transition={{ duration: 0.55, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.8 }}
        >
          <CloudLightning size={size} strokeWidth={1.5} style={{ color: isDark ? "rgba(255,255,255,0.7)" : "#6366f1" }} />
        </motion.div>
      );

    // 안개: 서서히 opacity 페이드 + 수평 드리프트
    case "foggy":
      return (
        <motion.div
          key="foggy"
          className={className}
          style={{ display: "inline-flex", willChange: "transform, opacity" }}
          animate={{ opacity: [0.45, 1, 0.45], x: [0, 6, 0] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        >
          <CloudFog size={size} strokeWidth={1.5} style={{ color: dimColor }} />
        </motion.div>
      );
  }
}

interface CardProps {
  children: React.ReactNode;
  className?: string;
  theme: Theme;
  delay?: number;
}

function WeatherCard({ children, className, theme, delay = 0 }: CardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.33, 1, 0.68, 1] }}
      className={`rounded-2xl p-5 relative overflow-hidden ${className ?? ""}`}
      style={{
        boxShadow: theme.isDark
          ? "0 8px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06)"
          : "0 8px 40px rgba(0,0,0,0.1), 0 1px 0 rgba(255,255,255,0.8)",
      }}
    >
      {/* ① 블러 기반 레이어 — 리퀴드 글라스: blur 강화 + brightness로 굴절 시뮬레이션 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background: theme.cardBg,
          backdropFilter: "saturate(160%) brightness(112%)",
          WebkitBackdropFilter: "saturate(160%) brightness(112%)",
          pointerEvents: "none",
        }}
      />
      {/* ② 테두리 + 내부 림 라이트 레이어 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          border: `1px solid ${theme.cardBorder}`,
          boxShadow: theme.isDark
            ? "inset 0 1.5px 0 rgba(255,255,255,0.45), inset 0 -1px 0 rgba(0,0,0,0.2), inset 1px 0 0 rgba(255,255,255,0.08), inset -1px 0 0 rgba(0,0,0,0.08)"
            : "inset 0 1.5px 0 rgba(255,255,255,0.98), inset 0 -1px 0 rgba(0,0,0,0.04), inset 1px 0 0 rgba(255,255,255,0.6), inset -1px 0 0 rgba(0,0,0,0.03)",
          pointerEvents: "none",
        }}
      />
      {/* ③ 스펙큘러 하이라이트 — 핵심: 유리 굴절 느낌의 대각선 광택 */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "inherit",
          background: theme.isDark
            ? "linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 35%, transparent 60%)"
            : "linear-gradient(145deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.2) 35%, transparent 60%)",
          pointerEvents: "none",
        }}
      />
      {/* 콘텐츠 */}
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </motion.div>
  );
}

interface DetailItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  theme: Theme;
}

function DetailItem({ icon, label, value, theme }: DetailItemProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5" style={{ color: theme.textFaint }}>
        {icon}
        {/* LINE Seed 400 — 작은 uppercase 라벨은 400이 선명 */}
        <span className="text-xs font-normal tracking-widest uppercase">{label}</span>
      </div>
      {/* JetBrains Mono 300(Light): 대형 수치는 얇게 — 공학 계기판 느낌 */}
      <span
        className="text-2xl"
        style={{ color: theme.text, letterSpacing: "-0.5px", fontFamily: "var(--font-jetbrains), monospace", fontWeight: 300 }}
      >
        {value}
      </span>
    </div>
  );
}

// 주간 예보 온도 바
interface TempBarProps {
  low: number;
  high: number;
  globalMin: number;
  globalMax: number;
  theme: Theme;
}

function TemperatureBar({ low, high, globalMin, globalMax, theme }: TempBarProps) {
  const range = Math.max(globalMax - globalMin, 1);
  const leftPct = ((low - globalMin) / range) * 100;
  const widthPct = ((high - low) / range) * 100;

  return (
    <div
      className="relative h-1 rounded-full flex-1 mx-3"
      style={{ background: theme.isDark ? "rgba(255,255,255,0.12)" : "rgba(38,37,30,0.08)" }}
    >
      <div
        className="absolute h-full rounded-full"
        style={{
          left: `${leftPct}%`,
          width: `${Math.max(widthPct, 8)}%`,
          background: "linear-gradient(to right, #60a5fa, #f97316)",
        }}
      />
    </div>
  );
}

// 일출/일몰 아크 카드
interface SunArcProps {
  sunrise: string;
  sunset: string;
  theme: Theme;
}

function SunArcCard({ sunrise, sunset, theme }: SunArcProps) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [riseH, riseM] = sunrise.split(":").map(Number);
  const [setH, setM] = sunset.split(":").map(Number);
  const riseMinutes = riseH * 60 + (riseM || 0);
  const setMinutes = setH * 60 + (setM || 0);

  const progress = Math.max(0, Math.min(1, (currentMinutes - riseMinutes) / Math.max(setMinutes - riseMinutes, 1)));
  const isDaytime = currentMinutes >= riseMinutes && currentMinutes <= setMinutes;

  // 타원형 아크: x축 반지름 85, y축 반지름 48, 중심 (100, 62)
  const angle = progress * Math.PI;
  const sunX = 100 - 85 * Math.cos(angle);
  const sunY = 62 - 48 * Math.sin(angle);

  const arcStroke = theme.isDark ? "rgba(255,255,255,0.15)" : "rgba(38,37,30,0.1)";
  const progressStroke = "rgba(249,115,22,0.6)";

  // 진행 아크 포인트 생성
  const steps = Math.max(Math.ceil(progress * 40), 2);
  const arcPoints = Array.from({ length: steps }, (_, i) => {
    const t = (i / (steps - 1)) * progress * Math.PI;
    return `${100 - 85 * Math.cos(t)},${62 - 48 * Math.sin(t)}`;
  }).join(" ");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5" style={{ color: theme.textFaint }}>
          <Sunrise size={13} strokeWidth={1.5} />
          <span className="text-xs font-normal tracking-widest uppercase">일출 · 일몰</span>
        </div>
      </div>
      <svg viewBox="0 0 200 72" className="w-full" style={{ overflow: "visible" }}>
        {/* 배경 아크 */}
        <path d="M 15 62 A 85 48 0 0 1 185 62" fill="none" stroke={arcStroke} strokeWidth="2" strokeLinecap="round" />
        {/* 진행 아크 */}
        {isDaytime && steps > 1 && (
          <polyline points={arcPoints} fill="none" stroke={progressStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {/* 태양 */}
        <circle cx={sunX} cy={sunY} r="6" fill={isDaytime ? "#f97316" : arcStroke} />
        {isDaytime && <circle cx={sunX} cy={sunY} r="10" fill="rgba(249,115,22,0.2)" />}
        {/* 일출 시간 */}
        <text x="15" y="72" fontSize="9" fill={theme.textMuted} textAnchor="middle" fontFamily="var(--font-jetbrains), monospace">{sunrise}</text>
        {/* 일몰 시간 */}
        <text x="185" y="72" fontSize="9" fill={theme.textMuted} textAnchor="middle" fontFamily="var(--font-jetbrains), monospace">{sunset}</text>
      </svg>
    </div>
  );
}

// ─── 검색창 (독립 컴포넌트 — 타이핑이 WeatherPage 리렌더링을 유발하지 않도록 분리) ───

interface SearchBarProps {
  theme: Theme;
  onSelectCity: (lat: number, lon: number, name: string) => void;
}

function SearchBar({ theme, onSelectCity }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 검색어 디바운스 (로컬 검색이므로 150ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const results = searchKoreanCities(searchQuery);
      setSearchResults(results);
      setShowDropdown(results.length > 0);
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function handleSelect(result: GeocodingResult) {
    const name = result.admin1 ? `${result.name}, ${result.admin1}` : result.name;
    setSearchQuery("");
    setShowDropdown(false);
    setSearchResults([]);
    onSelectCity(result.latitude, result.longitude, name);
  }

  return (
    <div ref={searchRef} className="relative flex-shrink-0">
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{ background: theme.inputBg, border: `1px solid ${theme.cardBorder}`, width: "160px" }}
      >
        <Search size={12} strokeWidth={1.5} className="flex-shrink-0" style={{ color: theme.textFaint }} />
        <input
          type="text"
          placeholder="도시 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchResults.length > 0 && setShowDropdown(true)}
          className="bg-transparent outline-none text-xs w-full"
          style={{ color: theme.text, caretColor: "#f97316" }}
        />
        {searchQuery && (
          <button onClick={() => { setSearchQuery(""); setShowDropdown(false); }}>
            <X size={11} strokeWidth={1.5} style={{ color: theme.textFaint }} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 rounded-2xl overflow-hidden z-30"
            style={{
              background: theme.isDark ? "rgba(15,23,42,0.95)" : "rgba(255,255,255,0.95)",
              border: `1px solid ${theme.cardBorder}`,
              backdropFilter: "blur(16px)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
              width: "220px",
            }}
          >
            {searchResults.map((result, i) => (
              <button
                key={result.id}
                onClick={() => handleSelect(result)}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-white/10"
                style={{ borderBottom: i < searchResults.length - 1 ? `1px solid ${theme.cardBorder}` : "none" }}
              >
                <MapPin size={11} strokeWidth={1.5} style={{ color: "#f97316", flexShrink: 0 }} />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: theme.text }}>{result.name}</div>
                  {result.admin1 && (
                    <div className="text-xs truncate" style={{ color: theme.textFaint }}>{result.admin1}</div>
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── 메인 페이지 ────────────────────────────────────────────────

export default function WeatherPage() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<"C" | "F">("C");
  const [favorites, setFavorites] = useState<FavoriteCity[]>([]);
  const [locationKey, setLocationKey] = useState(0);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [displayTemp, setDisplayTemp] = useState(0);

  // 개발용: 날씨 조건 + 시간대 강제 미리보기 (null이면 실제 데이터 사용)
  const [previewCondition, setPreviewCondition] = useState<WeatherCondition | null>(null);
  const [previewHour, setPreviewHour] = useState<number | null>(null);

  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [windUnit, setWindUnit] = useState<"kmh" | "ms">("kmh");

  // 현재 로드된 좌표 추적 (즐겨찾기 저장 시 필요)
  const currentCoordsRef = useRef(DEFAULT_LOCATION);

  // 실시간 시각 추적 — 1분마다 갱신하여 그라디언트 자동 전환
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  // 현재 시각 기반 배경 + 테마 계산 (preview 값이 있으면 우선 적용)
  const hour = previewHour ?? now.getHours();
  const condition: WeatherCondition = previewCondition ?? weather?.condition ?? "sunny";
  const gradient = getGradient(condition, hour);
  const isDark = calcIsDark(condition, hour);
  const theme = getTheme(isDark);

  // 즐겨찾기 localStorage 로드
  useEffect(() => {
    try {
      const stored = localStorage.getItem("weather-favorites");
      if (stored) setFavorites(JSON.parse(stored));
    } catch {
      /* 무시 */
    }
  }, []);

  // 온도 카운팅 애니메이션
  useEffect(() => {
    const target = convertTemp(weather?.temperature ?? 0, unit);
    const controls = animate(displayTemp, target, {
      duration: 0.7,
      ease: [0.33, 1, 0.68, 1],
      onUpdate(v) {
        setDisplayTemp(Math.round(v));
      },
    });
    return controls.stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather?.temperature, unit]);

  // 날씨 데이터 로드
  const loadWeather = useCallback(async (lat: number, lon: number, name: string) => {
    currentCoordsRef.current = { name, latitude: lat, longitude: lon };
    setIsLoading(true);
    setError(null);
    try {
      // 날씨 + 대기질 병렬 요청
      const [weatherData, aqData] = await Promise.all([
        fetchWeather(lat, lon, name),
        fetchAirQuality(lat, lon),
      ]);
      setWeather(weatherData);
      setAirQuality(aqData);
      setLocationKey((k) => k + 1);
    } catch {
      setError("날씨 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 마운트 시 기본 위치(서울) 날씨 로드
  useEffect(() => {
    loadWeather(DEFAULT_LOCATION.latitude, DEFAULT_LOCATION.longitude, DEFAULT_LOCATION.name);
  }, [loadWeather]);

  // 현재 위치 자동 감지
  function handleGeolocate() {
    if (!navigator.geolocation) {
      setError("이 브라우저는 위치 서비스를 지원하지 않습니다.");
      return;
    }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const name = await reverseGeocode(coords.latitude, coords.longitude);
          await loadWeather(coords.latitude, coords.longitude, name);
        } finally {
          setIsGeolocating(false);
        }
      },
      (err) => {
        console.error("위치 접근 실패:", err);
        setError("위치 정보를 가져오지 못했습니다.");
        setIsGeolocating(false);
      }
    );
  }

  // 즐겨찾기 토글
  function toggleFavorite() {
    if (!weather) return;
    const updated = isFavorite
      ? favorites.filter((f) => f.name !== weather.location)
      : [
          ...favorites,
          {
            name: weather.location,
            latitude: currentCoordsRef.current.latitude,
            longitude: currentCoordsRef.current.longitude,
          },
        ];
    setFavorites(updated);
    try { localStorage.setItem("weather-favorites", JSON.stringify(updated)); } catch { /* 무시 */ }
  }

  const isFavorite = weather
    ? favorites.some((f) => f.name === weather.location)
    : false;

  // 주간 예보의 전체 최저/최고 (온도 바 비율 계산용)
  const globalMin = weather ? Math.min(...weather.weekly.map((d) => d.low)) : 0;
  const globalMax = weather ? Math.max(...weather.weekly.map((d) => d.high)) : 30;

  const tempUnit = unit === "C" ? "°" : "°F";

  // 풍속 단위 변환
  function convertWind(kmh: number): string {
    if (windUnit === "ms") return `${(kmh / 3.6).toFixed(1)}m/s`;
    return `${kmh}km/h`;
  }

  // previewCondition 활성 시 표시할 라벨
  const PREVIEW_LABELS: Record<WeatherCondition, string> = {
    sunny: "맑음", cloudy: "흐림", rainy: "비", snowy: "눈", stormy: "뇌우", foggy: "안개",
  };
  const conditionLabel = previewCondition
    ? PREVIEW_LABELS[previewCondition]
    : weather?.conditionLabel ?? "";

  return (
    <div
      className="min-h-screen transition-all duration-1000 relative"
      style={{ background: gradient }}
    >
      {/* 배경 그레인 노이즈 오버레이 — 대기 질감 */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
          opacity: isDark ? 0.55 : 0.25,
          mixBlendMode: "overlay",
        }}
      />
      {/* 헤더 */}
      <header
        className="sticky top-0 z-20 px-4 py-3 relative"
        style={{
          background: theme.headerBg,
          backdropFilter: "saturate(160%) brightness(112%)",
          WebkitBackdropFilter: "saturate(160%) brightness(112%)",
          borderBottom: `1px solid ${theme.cardBorder}`,
          boxShadow: isDark
            ? "inset 0 -1px 0 rgba(255,255,255,0.06), 0 1px 0 rgba(0,0,0,0.2)"
            : "inset 0 -1px 0 rgba(255,255,255,0.8), 0 1px 0 rgba(0,0,0,0.04)",
        }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {/* 현재 위치 + 즐겨찾기 버튼 */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <MapPin size={13} strokeWidth={1.5} style={{ color: "#f97316", flexShrink: 0 }} />
            <span className="text-sm font-medium truncate" style={{ color: theme.text }}>
              {weather?.location ?? DEFAULT_LOCATION.name}
            </span>
            <button
              onClick={toggleFavorite}
              className="flex-shrink-0 transition-transform hover:scale-110 active:scale-95"
            >
              <Heart
                size={14}
                strokeWidth={1.5}
                style={{
                  color: isFavorite ? "#f97316" : theme.textFaint,
                  fill: isFavorite ? "#f97316" : "none",
                }}
              />
            </button>
          </div>

          {/* 단위 토글 그룹 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={() => setUnit((u) => (u === "C" ? "F" : "C"))}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: theme.inputBg,
                border: `1px solid ${theme.cardBorder}`,
                color: theme.textMuted,
              }}
            >
              °{unit === "C" ? "F" : "C"}
            </button>
            <button
              onClick={() => setWindUnit((u) => (u === "kmh" ? "ms" : "kmh"))}
              className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
              style={{
                background: theme.inputBg,
                border: `1px solid ${theme.cardBorder}`,
                color: theme.textMuted,
              }}
            >
              {windUnit === "kmh" ? "m/s" : "km/h"}
            </button>
          </div>

          {/* 현재 위치 버튼 */}
          <button
            onClick={handleGeolocate}
            disabled={isGeolocating}
            className="flex-shrink-0 p-2 rounded-full transition-colors"
            style={{ background: theme.inputBg, border: `1px solid ${theme.cardBorder}` }}
          >
            {isGeolocating ? (
              <Loader2 size={13} strokeWidth={1.5} className="animate-spin" style={{ color: theme.textFaint }} />
            ) : (
              <Navigation size={13} strokeWidth={1.5} style={{ color: theme.textMuted }} />
            )}
          </button>

          {/* 검색창 — 타이핑 리렌더링 격리 */}
          <SearchBar theme={theme} onSelectCity={loadWeather} />
        </div>

        {/* 즐겨찾기 도시 목록 */}
        {favorites.length > 0 && (
          <div className="max-w-2xl mx-auto mt-2 flex gap-2 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
            {favorites.map((fav) => (
              <button
                key={fav.name}
                onClick={() => loadWeather(fav.latitude, fav.longitude, fav.name)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs flex-shrink-0 transition-colors"
                style={{
                  background: weather?.location === fav.name ? "rgba(249,115,22,0.25)" : theme.inputBg,
                  border: `1px solid ${weather?.location === fav.name ? "rgba(249,115,22,0.5)" : theme.cardBorder}`,
                  color: weather?.location === fav.name ? "#f97316" : theme.textMuted,
                }}
              >
                <MapPin size={10} strokeWidth={1.5} />
                {fav.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* 에러 메시지 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="max-w-2xl mx-auto px-6 pt-4"
          >
            <div
              className="rounded-xl px-4 py-3 text-sm flex items-center justify-between"
              style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}
            >
              {error}
              <button onClick={() => setError(null)}><X size={14} /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 로딩 */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-40 gap-3">
          <Loader2 size={28} strokeWidth={1.5} className="animate-spin" style={{ color: "rgba(255,255,255,0.4)" }} />
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>날씨 정보를 불러오는 중...</span>
        </div>
      )}

      {/* 날씨 콘텐츠 */}
      <AnimatePresence mode="wait">
        {!isLoading && weather && (
          <motion.main
            key={locationKey}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="relative z-10 max-w-2xl mx-auto px-4 pt-6 pb-12 grid grid-cols-4 gap-3"
          >
            {/* 현재 날씨 히어로 */}
            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
              className="col-span-4 py-10 px-6 flex flex-col items-center text-center rounded-3xl relative overflow-hidden"
              style={{
                boxShadow: isDark
                  ? "0 12px 60px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.08)"
                  : "0 12px 60px rgba(0,0,0,0.12), 0 1px 0 rgba(255,255,255,0.9)",
              }}
            >
              {/* ① 블러 기반 레이어 */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "inherit",
                  background: isDark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.38)",
                  backdropFilter: "saturate(160%) brightness(114%)",
                  WebkitBackdropFilter: "saturate(160%) brightness(114%)",
                  pointerEvents: "none",
                }}
              />
              {/* ② 테두리 + 림 라이트 */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "inherit",
                  border: `1px solid ${theme.cardBorder}`,
                  boxShadow: isDark
                    ? "inset 0 1.5px 0 rgba(255,255,255,0.5), inset 0 -1px 0 rgba(0,0,0,0.25)"
                    : "inset 0 1.5px 0 rgba(255,255,255,0.99), inset 0 -1px 0 rgba(0,0,0,0.05)",
                  pointerEvents: "none",
                }}
              />
              {/* ③ 스펙큘러 하이라이트 */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "inherit",
                  background: isDark
                    ? "linear-gradient(150deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 30%, transparent 55%)"
                    : "linear-gradient(150deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.25) 30%, transparent 55%)",
                  pointerEvents: "none",
                }}
              />
              {/* 콘텐츠: 블러 레이어 위 (z-index: 1) */}
              <div className="relative flex flex-col items-center" style={{ zIndex: 1 }}>
                <WeatherIcon condition={condition} size={64} isDark={isDark} />
                {/* Montserrat Thin: 기온 숫자를 공학적이면서도 세련되게 */}
                <div
                  className="mt-4 tabular-nums"
                  style={{
                    fontSize: "7rem",
                    fontWeight: 100,
                    lineHeight: 1,
                    letterSpacing: "-6px",
                    color: theme.text,
                    textShadow: isDark ? "0 2px 16px rgba(0,0,0,0.5)" : "none",
                    fontFamily: "var(--font-montserrat), sans-serif",
                  }}
                >
                  {displayTemp}{tempUnit}
                </div>
                {/* LINE Seed 400 — 명시적으로 선언 (500은 LINE Seed에 없음) */}
                <div className="mt-3 text-lg font-normal" style={{ color: theme.textMuted }}>
                  {conditionLabel}
                </div>
                <div className="mt-1.5 text-sm" style={{ color: theme.textFaint }}>
                  최고 {convertTemp(weather.high, unit)}{tempUnit} &middot; 최저 {convertTemp(weather.low, unit)}{tempUnit}
                </div>
              </div>
            </motion.section>

            {/* 시간별 예보 */}
            <WeatherCard theme={theme} delay={0.05} className="col-span-4">
              <h2 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: theme.sectionLabel }}>
                시간별 예보
              </h2>
              <div
                className="flex gap-1 overflow-x-auto pb-1"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
              >
                {weather.hourly.map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center gap-1.5 px-2.5 py-2.5 rounded-xl flex-shrink-0"
                    style={{
                      background: i === 0
                        ? (isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.6)")
                        : "transparent",
                      minWidth: "58px",
                    }}
                  >
                    {/* JetBrains Mono 300: 시간 레이블 — 보조 정보는 얇게 */}
                    <span
                      className="text-xs whitespace-nowrap"
                      style={{ color: i === 0 ? "#f97316" : theme.textFaint, fontFamily: "var(--font-jetbrains), monospace", fontWeight: 300 }}
                    >
                      {item.time}
                    </span>
                    <WeatherIcon condition={item.condition} size={15} isDark={isDark} />
                    {/* Montserrat 300(Light): 서브 기온 — 히어로(100)보다 약간 두껍게 */}
                    <span
                      className="text-sm"
                      style={{ color: theme.text, fontFamily: "var(--font-montserrat), sans-serif", fontWeight: 300 }}
                    >
                      {convertTemp(item.temp, unit)}{tempUnit}
                    </span>
                    {/* 강수 확률 */}
                    {item.precipitationProbability > 0 && (
                      <span className="text-xs" style={{ color: isDark ? "#93c5fd" : "#3b82f6", fontFamily: "var(--font-jetbrains), monospace" }}>
                        {item.precipitationProbability}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </WeatherCard>

            {/* ── 벤토 Row 2: 주간 예보 (왼쪽) + 대기질 (오른쪽) ── */}
            <WeatherCard theme={theme} delay={0.1} className={airQuality ? "col-span-2" : "col-span-4"}>
              <h2 className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: theme.sectionLabel }}>
                주간 예보
              </h2>
              <div className="flex flex-col">
                {weather.weekly.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center py-2.5 gap-2"
                    style={{ borderBottom: i < weather.weekly.length - 1 ? `1px solid ${theme.cardBorder}` : "none" }}
                  >
                    {/* LINE Seed 400 */}
                    <span className="w-10 text-xs font-normal flex-shrink-0" style={{ color: theme.text }}>{item.day}</span>
                    <WeatherIcon condition={item.condition} size={14} isDark={isDark} />
                    <TemperatureBar low={item.low} high={item.high} globalMin={globalMin} globalMax={globalMax} theme={theme} />
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {/* Montserrat 300: 최저기온 — 흐린 색 + 얇은 굵기로 낮은 우선순위 표현 */}
                      <span className="text-xs w-8 text-right" style={{ color: theme.textFaint, fontFamily: "var(--font-montserrat), sans-serif", fontWeight: 300 }}>{convertTemp(item.low, unit)}{tempUnit}</span>
                      {/* Montserrat 500: 최고기온 — Medium으로 명확한 계층 차별화 */}
                      <span className="text-xs w-8" style={{ color: theme.text, fontFamily: "var(--font-montserrat), sans-serif", fontWeight: 500 }}>{convertTemp(item.high, unit)}{tempUnit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </WeatherCard>

            {airQuality && (() => {
              const level = getAirQualityLevel(airQuality.pm2_5);
              const color = getAirQualityColor(level);
              const pct = Math.min((airQuality.pm2_5 / 75) * 100, 100);
              return (
                <WeatherCard theme={theme} delay={0.12} className="col-span-2">
                  <h2 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: theme.sectionLabel }}>대기질</h2>
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}>
                          {level}
                        </span>
                        <span className="text-xs" style={{ color: theme.textMuted }}>PM2.5 기준</span>
                      </div>
                      {/* JetBrains 500: AQI는 핵심 지표 — Medium으로 강조 */}
                      <span className="text-xs" style={{ color: theme.textFaint, fontFamily: "var(--font-jetbrains), monospace", fontWeight: 500 }}>AQI {airQuality.europeanAqi}</span>
                    </div>
                    <div className="relative h-2 rounded-full overflow-hidden"
                      style={{ background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)" }}>
                      <motion.div className="absolute left-0 top-0 h-full rounded-full" style={{ background: color }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[{ label: "PM2.5", value: airQuality.pm2_5 }, { label: "PM10", value: airQuality.pm10 }].map(({ label, value }) => (
                        <div key={label} className="flex flex-col gap-0.5">
                          <span className="text-xs" style={{ color: theme.textFaint }}>{label}</span>
                          {/* JetBrains 400: PM 수치 — Regular로 가독성 확보 */}
                          <span className="text-lg" style={{ color: theme.text, fontFamily: "var(--font-jetbrains), monospace", fontWeight: 400 }}>
                            {value} <span className="text-xs" style={{ fontWeight: 300 }}>μg/m³</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </WeatherCard>
              );
            })()}

            {/* ── 벤토 Row 3: 일출·일몰 (왼쪽) + 오늘의 추천 (오른쪽) ── */}
            <WeatherCard theme={theme} delay={0.15} className="col-span-2">
              <SunArcCard sunrise={weather.sunrise} sunset={weather.sunset} theme={theme} />
            </WeatherCard>

            <WeatherCard theme={theme} delay={0.17} className="col-span-2">
              <h2 className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: theme.sectionLabel }}>오늘의 추천</h2>
              <div className="flex flex-wrap gap-2">
                {getOutfitRecommendations(weather).map((rec, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                    style={{ background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)", color: theme.text }}>
                    <span>{rec.emoji}</span>
                    <span>{rec.text}</span>
                  </div>
                ))}
              </div>
            </WeatherCard>

            {/* ── 벤토 Row 4: 상세 지표 — 4열 그리드 ── */}
            <WeatherCard theme={theme} delay={0.18}>
              <DetailItem icon={<Droplets size={13} strokeWidth={1.5} />} label="습도" value={`${weather.humidity}%`} theme={theme} />
            </WeatherCard>
            <WeatherCard theme={theme} delay={0.2}>
              <DetailItem icon={<Wind size={13} strokeWidth={1.5} />} label="바람" value={convertWind(weather.windSpeed)} theme={theme} />
            </WeatherCard>
            <WeatherCard theme={theme} delay={0.22}>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-1.5" style={{ color: theme.textFaint }}>
                  <Navigation size={13} strokeWidth={1.5} style={{ transform: `rotate(${weather.windDirection}deg)` }} />
                  <span className="text-xs font-normal tracking-widest uppercase">풍향</span>
                </div>
                <span className="text-2xl font-light" style={{ color: theme.text, letterSpacing: "-0.5px", fontFamily: "var(--font-jetbrains), monospace" }}>
                  {degreesToCompass(weather.windDirection)}
                </span>
              </div>
            </WeatherCard>
            <WeatherCard theme={theme} delay={0.24}>
              <DetailItem icon={<SunMedium size={13} strokeWidth={1.5} />} label="자외선" value={`${weather.uvIndex} · ${weather.uvLabel}`} theme={theme} />
            </WeatherCard>

            {/* ── 벤토 Row 5 ── */}
            <WeatherCard theme={theme} delay={0.26}>
              <DetailItem icon={<Thermometer size={13} strokeWidth={1.5} />} label="체감" value={`${convertTemp(weather.feelsLike, unit)}${tempUnit}`} theme={theme} />
            </WeatherCard>
            <WeatherCard theme={theme} delay={0.28}>
              <DetailItem icon={<Eye size={13} strokeWidth={1.5} />} label="가시거리" value={`${weather.visibility}km`} theme={theme} />
            </WeatherCard>
            <WeatherCard theme={theme} delay={0.3} className="col-span-2">
              <DetailItem icon={<Gauge size={13} strokeWidth={1.5} />} label="기압" value={`${weather.pressure} hPa`} theme={theme} />
            </WeatherCard>
          </motion.main>
        )}
      </AnimatePresence>

      {/* 개발용 날씨 미리보기 패널 */}
      {process.env.NODE_ENV === "development" && (
        <div
          className="fixed top-1/2 right-4 -translate-y-1/2 flex flex-col gap-2 px-3 py-2.5 rounded-2xl z-50"
          style={{
            background: "rgba(10,10,20,0.88)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {/* 라벨 */}
          <span className="text-xs text-center" style={{ color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>PREVIEW</span>

          <div className="w-px self-stretch" style={{ background: "rgba(255,255,255,0.08)" }} />

          {/* 날씨 조건 — 세로 */}
          <span className="text-xs text-center" style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px" }}>날씨</span>
          {(
            [
              { cond: "sunny",  label: "맑음",  color: "#f97316" },
              { cond: "cloudy", label: "흐림",  color: "#94a3b8" },
              { cond: "rainy",  label: "비",    color: "#60a5fa" },
              { cond: "snowy",  label: "눈",    color: "#bfdbfe" },
              { cond: "stormy", label: "뇌우",  color: "#a78bfa" },
              { cond: "foggy",  label: "안개",  color: "#cbd5e1" },
            ] as { cond: WeatherCondition; label: string; color: string }[]
          ).map(({ cond, label, color }) => {
            const active = previewCondition === cond;
            return (
              <button
                key={cond}
                onClick={() => setPreviewCondition(active ? null : cond)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs transition-all w-full"
                style={{
                  background: active ? `${color}28` : "transparent",
                  border: `1px solid ${active ? color : "transparent"}`,
                  color: active ? color : "rgba(255,255,255,0.5)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                <WeatherIcon condition={cond} size={12} isDark />
                {label}
              </button>
            );
          })}

          <div className="w-px self-stretch" style={{ background: "rgba(255,255,255,0.08)" }} />

          {/* 시간대 — 세로 */}
          <span className="text-xs text-center" style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px" }}>시간</span>
          {(
            [
              { h: 2,  label: "심야", desc: "02" },
              { h: 5,  label: "새벽", desc: "05" },
              { h: 8,  label: "아침", desc: "08" },
              { h: 13, label: "낮",   desc: "13" },
              { h: 17, label: "노을", desc: "17" },
              { h: 18, label: "일몰", desc: "18" },
              { h: 19, label: "황혼", desc: "19" },
              { h: 21, label: "밤",   desc: "21" },
            ]
          ).map(({ h, label, desc }) => {
            const active = previewHour === h;
            return (
              <button
                key={h}
                onClick={() => setPreviewHour(active ? null : h)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-all w-full"
                style={{
                  background: active ? "rgba(249,115,22,0.2)" : "transparent",
                  border: `1px solid ${active ? "rgba(249,115,22,0.7)" : "transparent"}`,
                  color: active ? "#f97316" : "rgba(255,255,255,0.45)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                <span style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: "10px", opacity: 0.55, minWidth: "16px" }}>{desc}</span>
                {label}
              </button>
            );
          })}

          {/* 초기화 */}
          {(previewCondition !== null || previewHour !== null) && (
            <button
              onClick={() => { setPreviewCondition(null); setPreviewHour(null); }}
              className="px-2.5 py-1 rounded-lg text-xs transition-colors hover:bg-white/10 w-full text-center"
              style={{ color: "rgba(255,255,255,0.3)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              초기화
            </button>
          )}
        </div>
      )}
    </div>
  );
}
