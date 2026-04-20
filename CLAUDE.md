# CLAUDE.md

## 🌍 역할 및 언어 (Role & Language)
- **Role**: 숙련된 풀스택 개발자
- **Language**: 모든 답변과 주석은 **한국어**만 사용 (No English)
- **Tone**: 쉽고 명확한 설명, 실행 가능한 코드 중심

---

## 🛠 기술 스택 (Tech Stack)

| 구분 | 라이브러리 / 버전 |
| :--- | :--- |
| **Framework** | Next.js 16.2.3 (App Router) |
| **Runtime** | React 19 |
| **Language** | TypeScript 5 (Strict Mode) |
| **Styling** | Tailwind CSS v4, tw-animate-css |
| **Animation** | Framer Motion 12 |
| **UI Primitives** | Base UI (`@base-ui/react`) |
| **UI Components** | Shadcn UI (CVA 기반 래핑) |
| **Icons** | Lucide React |
| **Class Utility** | clsx + tailwind-merge (`cn()`) |
| **Fonts** | LINE Seed Sans KR (CDN), Montserrat + JetBrains Mono (next/font/google) |

### 외부 API (무인증)
- **날씨**: [Open-Meteo](https://api.open-meteo.com/v1/forecast) — API 키 불필요
- **역지오코딩**: [Nominatim](https://nominatim.openstreetmap.org/reverse) — API 키 불필요
- **한국 도시 검색**: `lib/weather.ts` 내 하드코딩 데이터 (API 의존 없음)

---

## 🏗 프로젝트 구조 (Project Structure)

```
src/
├── app/
│   ├── layout.tsx        # RootLayout — Montserrat/JetBrains(next/font) + LINE Seed(preload), lang="ko"
│   ├── page.tsx          # WeatherPage — 메인 페이지 (모든 UI 컴포넌트 포함)
│   └── globals.css       # 전역 CSS (Tailwind base)
├── components/
│   └── ui/
│       └── button.tsx    # Button — Base UI + CVA 래핑
└── lib/
    ├── utils.ts          # cn() 유틸리티
    └── weather.ts        # 날씨 타입, API 호출, 지오코딩, 도시 데이터
```

### `src/app/page.tsx` 내부 구조
현재 모든 서브 컴포넌트가 단일 파일에 공존한다.

| 컴포넌트 | 역할                                      |
| :--- |:----------------------------------------|
| `WeatherIcon` | 날씨 조건별 Lucide 아이콘 + Framer Motion 애니메이션 |
| `WeatherCard` | 리퀴드 글라스 카드 래퍼 (motion.div, 3-레이어 구조)    |
| `DetailItem` | 상세 지표 1개 (아이콘 + 라벨 + 값)                 |
| `TemperatureBar` | 주간 예보 온도 범위 바                           |
| `SunArcCard` | 일출·일몰 SVG 아크 카드                         |
| `SearchBar` | 도시 검색창 (WeatherPage 리렌더링 격리용 독립 컴포넌트)   |
| `WeatherPage` | 메인 페이지 (상태 관리, API 호출, 전체 레이아웃)         |

### `src/lib/weather.ts` 내부 구조

| 함수 / 데이터 | 역할 |
| :--- | :--- |
| `KOREAN_CITIES[]` | 한국 주요 도시 좌표 하드코딩 (약 90개) |
| `wmoToCondition()` | WMO 날씨 코드 → `WeatherCondition` 변환 |
| `wmoToLabel()` | WMO 날씨 코드 → 한국어 날씨 설명 |
| `searchKoreanCities()` | 도시명 로컬 검색 (API 없음) |
| `reverseGeocode()` | 좌표 → 한국어 도시명 (Nominatim) |
| `fetchWeather()` | Open-Meteo API 호출 → `WeatherData` 반환 |

---

## 🎨 코딩 스타일 (Coding Style)

### 컴포넌트
- `function` 키워드 사용 (`arrow function` 금지)
- **Pages / Layouts**: Next.js App Router 규칙상 `default export` 사용
- **그 외 컴포넌트 / 유틸**: `named export` 사용
- Props 타입은 반드시 `interface`로 정의 (type alias 지양)

```tsx
// ✅ 올바른 패턴
interface WeatherIconProps {
  condition: WeatherCondition;
  size?: number;
}

function WeatherIcon({ condition, size = 20 }: WeatherIconProps) { ... }
export { WeatherIcon };
```

### 스타일링
- Tailwind 유틸리티 클래스만 사용 (커스텀 `.css` 파일 생성 금지)
- 클래스 병합은 `cn()` 사용 (`clsx` + `tailwind-merge`)
- 인라인 `style`은 동적 값(테마 색상, 애니메이션 수치 등)에만 허용

### 리퀴드 글라스 (Liquid Glass) 구조
`WeatherCard`와 히어로 섹션에 적용된 Apple 스타일 리퀴드 글라스는 **3개 레이어**로 구성된다.
`backdrop-filter`와 애니메이션 요소의 GPU 레이어 분리를 위해 블러 레이어를 반드시 `position: absolute`로 분리해야 한다 (같은 요소에 두면 매 프레임 blur 재계산으로 깜빡임 발생).

```
motion.div (relative, overflow-hidden)  ← 외부 그림자(box-shadow)만 담당
 ├── ① 블러 레이어 (absolute, inset:0)
 │     backdrop-filter: blur(48px) saturate(200%) brightness(112%)
 │     background: rgba(255,255,255,0.06)  ← 거의 투명 (굴절 느낌)
 │
 ├── ② 림 라이트 레이어 (absolute, inset:0)
 │     border: 1px solid cardBorder
 │     box-shadow: inset 상단 밝음 / 하단 어둠 / 좌우 미세 조정
 │
 ├── ③ 스펙큘러 하이라이트 레이어 (absolute, inset:0)  ← 핵심
 │     background: linear-gradient(145deg, rgba(255,255,255,0.14) 0%, transparent 60%)
 │     (빛이 유리를 통과하는 대각선 광택 — 글래스모피즘과의 핵심 차이)
 │
 └── 콘텐츠 div (relative, z-index:1)
```

**글래스모피즘 vs 리퀴드 글라스 비교**

| 항목 | 글래스모피즘 | 리퀴드 글라스 |
| :--- | :--- | :--- |
| 배경 불투명도 | `rgba(255,255,255,0.55)` | `rgba(255,255,255,0.06)` |
| blur 강도 | `blur(28px) saturate(180%)` | `blur(48px) saturate(200%) brightness(112%)` |
| 레이어 수 | 1개 | 3개 (블러 / 림라이트 / 스펙큘러) |
| 스펙큘러 | ❌ | ✅ 대각선 광택 그라디언트 |
| 림 라이트 | 단순 inset shadow | 4방향 독립 inset shadow |

### 폰트 시스템

| 폰트 | 적용 위치 | 로드 방식 | 가용 굵기 |
| :--- | :--- | :--- | :--- |
| **LINE Seed Sans KR** | 기본 한국어 텍스트 (`--font-sans`) | `@font-face` + jsDelivr CDN | 100 / 400 / 700 |
| **Montserrat** | 기온 숫자, 주간 예보 수치 (`--font-montserrat`) | `next/font/google` | 100~700 |
| **JetBrains Mono** | 습도·풍속·기압 등 수치형 데이터 (`--font-jetbrains`) | `next/font/google` | 300~600 |

**굵기 사용 규칙**
- LINE Seed: 100/400/700만 실제 존재 → `font-medium(500)` 사용 금지, 400 또는 700만 사용
- Montserrat: 히어로 기온 `100`, 서브 기온 `300`, 최고기온 `500`
- JetBrains Mono: 대형 수치 `300`, 일반 수치 `400`, 강조 수치 `500`

**LINE Seed CDN URL**
```
https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_11-01@1.0/LINESeedKR-Th.woff2  (100)
https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_11-01@1.0/LINESeedKR-Rg.woff2  (400)
https://cdn.jsdelivr.net/gh/projectnoonnu/noonfonts_11-01@1.0/LINESeedKR-Bd.woff2  (700)
```

### 배경 그라디언트 시스템
`getGradient(condition, hour)` — 시각 기반 cinematic 배경, 1분마다 자동 갱신 (`setInterval 60_000ms`)

| 시간대 | 그라디언트 |
| :--- | :--- |
| 22:00 – 04:00 | 심야 네이비 |
| 04:00 – 06:00 | 새벽 인디고 |
| 17:00 – 18:00 | 노을 주황·빨강 |
| 18:00 – 19:00 | 일몰 오렌지·보라 |
| 19:00 – 20:00 | 황혼 다크 퍼플 |
| 20:00 – 22:00 | 초저녁 인디고 |
| 06:00 – 17:00 | 날씨 조건별 (맑음·흐림·비·눈·뇌우·안개) |

### 상태 관리
- 외부 상태 라이브러리 없음 — `useState` / `useEffect` / `useCallback` / `useRef`
- 즐겨찾기 영속성: `localStorage` (`weather-favorites` 키)
- 현재 좌표 추적: `useRef` (`currentCoordsRef`)

### 애니메이션
- Framer Motion `motion.*` 컴포넌트 사용
- 조건 변경 시 애니메이션 상태 초기화: `key={condition}` 명시 필수
- 반복 애니메이션: `transition.repeat: Infinity`

### 네이밍
- 컴포넌트: `PascalCase`
- 변수 / 함수: `camelCase`
- 상수: `UPPER_SNAKE_CASE`
- 타입 / 인터페이스: `PascalCase`

---

## ⚠️ 에러 처리 및 보안

- 모든 API 호출은 `try-catch`로 감싸기
- 에러 발생 시 사용자용 친절한 메시지 + 상세한 `console.error` 출력
- `console.log` 프로덕션 코드에 남기지 않기
- `.env` 파일 절대 커밋 금지 (현재 API 키 없음)

---

## 💻 주요 명령어

```bash
npm run dev    # 개발 서버 시작 (http://localhost:3000)
npm run build  # 프로덕션 빌드
npm run start  # 빌드 결과 실행
npm run lint   # ESLint 검사
```

---

## 🦄 특별 주의사항

### 절대 하지 말 것
- `any` 타입 사용
- Mock 데이터 / 가짜 구현
- 직접적인 DOM 조작 (`document.querySelector` 등)
- `arrow function`으로 컴포넌트 선언

### 권장사항
- 실제 API를 호출하는 코드 작성
- 재사용 가능한 컴포넌트 설계
- 접근성(a11y) 고려
- `WeatherCondition` 유니온 타입 활용 (`"sunny" | "cloudy" | "rainy" | "snowy" | "stormy" | "foggy"`)

### 문제 해결 우선순위
1. 실제 동작하는 해결책 찾기
2. 기존 코드 패턴 분석 후 일관성 유지
3. 타입 안전성 보장
4. 테스트 가능한 구조로 설계
