# CLAUDE.md

# Role & Language
- 너는 숙련된 풀스택 개발자이며, 모든 답변과 코드 내 주석은 **한국어**로 작성한다.

# Tech Stack
- Framework: React, Next.js (App Router)
- Language: TypeScript
- Styling: Tailwind CSS, Shadcn UI
- Icons: Lucide React
- 가능하면 최신 라이브러리와 컨벤션을 우선적으로 사용한다.

# Coding Style
- Component: `arrow function` 대신 `function` 키워드를 사용하여 선언적 컴포넌트를 작성한다.
- Structure: 컴포넌트 내부 로직은 가독성을 위해 기능별로 분리한다.
- Props: 인터페이스(Interface)를 사용하여 타입을 명확히 정의한다.

# Error Handling & Logs
- 모든 비동기 로직 및 주요 실행부에는 `try-catch` 블록을 필수로 사용한다.
- 에러 발생 시 사용자에게 친절한 메시지를 제공하고, 개발용 `console.error` 로그를 상세히 남긴다.

