# Project: GUI Task & Ledger Monitor (PWA)

## 🎯 Project Overview
본 프로젝트는 개인의 일정(Task)과 향후 가계부(Ledger)를 모니터링하기 위한 Serverless GUI 기반 웹/앱 서비스입니다. PC 웹 환경은 물론, 안드로이드 PWA(Progressive Web App)를 통해 네이티브 앱처럼 동작하도록 만드는 것이 최우선 목표입니다.

## 🛠️ Tech Stack
- **Frontend Framework:** React (Vite)
- **Styling:** Tailwind CSS
- **Icons:** lucide-react
- **State Management:** Zustand
- **Routing:** react-router-dom
- **Date Utility:** date-fns (또는 dayjs)
- **Backend / DB:** Supabase (@supabase/supabase-js)
- **PWA Configuration:** vite-plugin-pwa

## 📐 Architecture & Core Rules
1. **Serverless (No Local Server):**
   - 별도의 백엔드 서버(Node.js, Python 등)를 띄우지 않습니다.
   - 모든 데이터 통신은 프론트엔드에서 Supabase Client 라이브러리를 통해 직접 PostgreSQL DB에 읽기/쓰기를 수행합니다.
2. **PWA & Mobile-First:**
   - 안드로이드 환경에서 브라우저 주소창 없이 단독 실행(`standalone`)되어야 하므로, Tailwind를 활용한 반응형 모바일 UI를 철저히 지킵니다.
3. **Modularity:**
   - 컴포넌트는 작고 재사용 가능하게 분리하며, Zustand를 활용해 전역 상태(Task 데이터 등)와 UI를 깔끔하게 분리합니다.

## 🎨 UI/UX Guidelines (Crucial)
현재 메인 개발 타겟인 `/tasks` 라우트에서는 다음 규칙을 무조건 준수해야 합니다.

1. **Inline Quick Add (초간편 추가):**
   - 일정 추가 시 **모달(Modal) 창을 절대 사용하지 마세요.**
   - 리스트나 캘린더 뷰 상단에 텍스트, 날짜, 시간 토글이 포함된 '인라인 입력 폼'을 고정 배치하여 `Enter` 키로 즉시 일정이 추가되도록 합니다.
2. **Visual Status Distinction (직관적인 상태 구분):**
   - 완료된 일정(`is_done: true`): 텍스트에 취소선(`line-through`), 텍스트 색상은 옅은 회색(`text-gray-400`), 배경도 옅은 회색(`bg-gray-100`)으로 처리.
   - 진행 중 일정(`is_done: false`): 뚜렷한 검은색 텍스트와 흰색(또는 투명) 배경 유지.
3. **List & Calendar View:**
   - **List View:** [전체], [진행 중], [완료됨] 필터링 탭을 제공합니다.
   - **Calendar View:** 달력의 각 날짜 셀(Cell) 안에 일정을 렌더링합니다. 한 날짜 안에서는 마감 시간(`due_time`) 오름차순으로 정렬하며, 제목이 길 경우 말줄임표(`truncate`)로 처리해 UI가 깨지지 않게 방어합니다.

## 🚀 Future Expansion (Routing)
- 향후 가계부 기능 확장을 대비해 최상단 라우터 구조를 미리 분리합니다.
- `/tasks`: 메인 Task 모니터링 뷰 (현재 집중 구현 대상)
- `/ledger`: 가계부 뷰 ("업데이트 예정입니다" 문구만 표시하는 Placeholder 컴포넌트)