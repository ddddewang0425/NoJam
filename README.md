# NoJam — Task Monitor (PWA + Android)

> 새 Claude 인스턴스용 온보딩 문서. 이 파일만 읽으면 바로 작업 가능.

---

## 프로젝트 개요

개인 일정(Task)을 관리하는 **Serverless PWA + Android 앱**. PC 웹 / PWA 홈화면 설치 / Android 네이티브 앱 모두 지원.
백엔드 서버 없이 Supabase Client를 프론트에서 직접 호출.

**경로:** `/home/ddddewang/Desktop/nojam/daily_ddddewang/`

---

## 기술 스택

| 역할     | 라이브러리                                        |
| -------- | ------------------------------------------------- |
| UI       | React 18 + Vite 5                                 |
| 스타일   | Tailwind CSS 3                                    |
| 상태관리 | Zustand 4                                         |
| 라우팅   | react-router-dom 6                                |
| 날짜     | date-fns 3                                        |
| 아이콘   | lucide-react 0.344                                |
| DB       | Supabase (@supabase/supabase-js 2)                |
| PWA      | vite-plugin-pwa 0.20                              |
| Android  | Capacitor 7 (@capacitor/core, @capacitor/android) |

---

## 실행 방법

```bash
# 환경변수 확인
cat .env   # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

# 개발 서버 (웹)
npm run dev

# 웹 빌드 + Android 동기화
npm run build && npx cap sync android

# Android Studio 열기 (Android Studio 설치 필요)
export CAPACITOR_ANDROID_STUDIO_PATH=/home/ddddewang/Downloads/android-studio/bin/studio.sh
npx cap open android
# → Android Studio에서 ▶ Run 버튼으로 에뮬레이터/실기기 배포
```

---

## 파일 구조

```
src/
  App.jsx                     # BrowserRouter + Routes (/ → /tasks, /ledger)
  main.jsx                    # React 진입점
  index.css                   # Tailwind directives + 글로벌 리셋 + calSlide 애니메이션
  supabase.js                 # createClient (env vars)
  store/
    taskStore.js              # Zustand 전역 스토어
  pages/
    TasksPage.jsx             # 헤더(아이콘+QuickAdd) + 탭(모바일 슬라이드 패널) + ListView|CalendarView
    LedgerPage.jsx            # placeholder ("업데이트 예정")
  components/
    Layout.jsx                # 데스크톱 사이드바 + 모바일 하단 네비
    Sidebar.jsx               # zinc-900 배경, /tasks /ledger 네비링크
    BottomNav.jsx             # 모바일 고정 하단 바
    tasks/
      QuickAdd.jsx            # 인라인 입력폼 (ScrollDatePicker + ScrollTimePicker)
      ListView.jsx            # 필터 탭 + D-Day 설정 + TaskItem 목록
      TaskItem.jsx            # 개별 태스크 행 (체크박스, D-day, 우선순위)
      CalendarView.jsx        # 월간 달력 그리드 + 양방향 스와이프 + AddTask/Detail 패널
      ScrollDatePicker.jsx    # 드럼롤 스크롤 날짜/시간 피커
public/
  icons/                      # PWA 아이콘 (svg, png 192/512, favicon.ico 등)
supabase/
  schema.sql                  # tasks 테이블 생성 + RLS + 인덱스
capacitor.config.json         # Capacitor 설정 (appId, appName, webDir)
android/                      # Android Studio 네이티브 프로젝트 (npx cap add android로 생성)
```

---

## Supabase DB 스키마

```sql
CREATE TABLE public.tasks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT        NOT NULL,
  due_date   DATE        NOT NULL,           -- 'YYYY-MM-DD'
  due_time   TIME,                           -- nullable, 없으면 24:00으로 처리
  status     TEXT        NOT NULL DEFAULT 'in_progress',  -- 'in_progress' | 'done'
  archived   BOOLEAN     NOT NULL DEFAULT false,
  priority   FLOAT       NOT NULL DEFAULT 3.0,            -- 1.0~5.0
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- RLS: allow_all (FOR ALL USING true) — 개발용
```

---

## Zustand Store (`taskStore.js`)

| 상태              | 타입                         | 설명                                |
| ----------------- | ---------------------------- | ----------------------------------- |
| `tasks`           | Task[]                       | 전체 태스크 배열                    |
| `loading`         | bool                         | fetch 중 여부                       |
| `filter`          | `'all'│'in_progress'│'done'` | 리스트 필터                         |
| `currentMonth`    | Date                         | 캘린더 표시 월                      |
| `ddayGranularity` | `'일'│'시간'│'분'│'초'`      | D-day 표시 단위 (localStorage 저장) |
| `priorityStep`    | number                       | priority 슬라이더 스텝 (0.5 등)     |

| 액션                                   | 설명                                             |
| -------------------------------------- | ------------------------------------------------ |
| `fetchTasks()`                         | Supabase에서 전체 조회                           |
| `addTask({title, due_date, due_time})` | 추가 후 로컬 sort                                |
| `toggleTask(id)`                       | status 토글 in_progress ↔ done (낙관적 업데이트) |
| `archiveTask(id)`                      | archived 토글 (낙관적 업데이트)                  |
| `deleteTask(id)`                       | 삭제 (낙관적 업데이트)                           |
| `setPriority(id, value)`               | priority 변경                                    |
| `setFilter(v)`                         | 필터 변경                                        |
| `setCurrentMonth(date)`                | 캘린더 월 변경                                   |
| `setDdayGranularity(g)`                | D-day 단위 변경 + localStorage 저장              |

---

## 핵심 UI 규칙

### 앱 헤더 (모바일/앱 전용)

- 최상단에 `env(safe-area-inset-top)` 패딩 → Android 상태바와 겹침 방지
- 아이콘(`/icons/icon.svg`) + "NoJam" 텍스트
- QuickAdd 입력폼 바로 아래 배치

### QuickAdd (인라인 입력, 모달 없음)

- **Row 1**: 제목 텍스트 입력
- **Row 2**: **ScrollDatePicker**(드럼롤 날짜) + **ScrollTimePicker**(드럼롤 시간) + [추가] 버튼

`due_time`이 없으면 `null` 저장 (정렬 시 맨 뒤 = 24:00 취급). UI에서는 `24:00` 표시.

### 모바일 탭 전환 (슬라이딩 패널)

- 리스트/캘린더 두 패널이 `width:200%` 컨테이너 안에 나란히 배치
- `translateX(0%)` ↔ `translateX(-50%)` CSS transition (300ms ease-out)
- 탭 버튼 클릭 + **좌우 스와이프** 모두 전환 가능
- 탭 바 하단에 슬라이딩 인디케이터 바

### 상태 시각 구분 (리스트/캘린더 공통)

- **진행 중** (`status: 'in_progress'`): 검은 텍스트, 흰 배경
- **완료됨** (`status: 'done'`): `line-through`, `text-gray-400`, `bg-gray-100`
- **보관됨** (`archived: true`): `text-amber-400~500`, `bg-amber-50`
- **완료+보관**: `line-through text-amber-300/70`

### ListView 필터 탭

`[전체 보기]` `[진행 중]` `[완료됨]` — 탭 아래에 D-Day 단위 설정 바

### D-Day 표시 (`TaskItem.getDdayInfo`)

- **날짜 기준**: 24시간이 아닌 **캘린더 날짜(calDays)**로 계산 (내일 = 1일)
- **granularity별 표시**:

| 설정 | 5일 3시간 30분 남음      | 오늘 3시간 30분 남음 |
| ---- | ------------------------ | -------------------- |
| 일   | 5일 남음                 | 오늘                 |
| 시간 | 5일 3시간 남음           | 3시간 남음           |
| 분   | 5일 3시간 30분 남음      | 3시간 30분 남음      |
| 초   | 5일 3시간 30분 XX초 남음 | 3시간 30분 XX초 남음 |

- **완료된 task**: D-day 숨김
- **라이브 타이머**: `'초'` = 1s interval, 나머지 = 60s interval

### 긴급도 색상 (D-day)

| 조건         | 색상                         |
| ------------ | ---------------------------- |
| calDays >= 4 | `text-gray-400`              |
| calDays 1~3  | `text-amber-500`             |
| 당일 6h+     | `text-orange-500`            |
| 당일 1~6h    | `text-red-400`               |
| 당일 1h 미만 | `text-red-500`               |
| 기한 초과    | `text-red-500 font-semibold` |

### CalendarView

- 일~토 7열 CSS Grid
- **월 이동**: `ChevronLeft/Right` 버튼, **마우스 휠**, **상하 스와이프**, **좌우 스와이프** 모두 지원
  - 좌우 스와이프는 `stopPropagation()`으로 탭 전환 swipe와 충돌 방지
- 날짜 셀 클릭 → AddTask 패널 (portal, 블러 오버레이)
- task 칩 클릭 → TaskDetail 패널 (priority 슬라이더, 완료/보관/삭제)
- 3개 초과 시 `+N개` overflow 표시
- 월 전환 시 슬라이드 애니메이션 (`calSlideFromLeft/Right`, `index.css`)

### 레이아웃

- **데스크톱 (lg+)**: 좌측 사이드바(zinc-900) + 우측 메인 (ListView flex-1 | CalendarView 드래그 리사이즈)
- **모바일/앱**: 하단 네비바 + 리스트/캘린더 슬라이딩 패널

---

## Android 앱 워크플로우

```bash
# 코드 변경 후 매번
npm run build && npx cap sync android
# → Android Studio ▶ Run

# APK 생성 (Android Studio)
# Build → Build Bundle(s)/APK(s) → Build APK(s)
# 출력: android/app/build/outputs/apk/debug/app-debug.apk
```

**Capacitor 설정** (`capacitor.config.json`):

```json
{
  "appId": "com.ddddewang.nojam",
  "appName": "NoJam",
  "webDir": "dist",
  "server": { "androidScheme": "https" }
}
```

---

## PWA 설정 (`vite.config.js`)

```js
display: 'standalone'      // 브라우저 주소창 없이 단독 실행
start_url: '/tasks'
theme_color: '#18181b'     // zinc-900
build.outDir: 'dist'       // Capacitor webDir와 일치
```

---

## 라우팅

| 경로      | 컴포넌트     | 상태                  |
| --------- | ------------ | --------------------- |
| `/`       | → redirect   | `/tasks`로 리다이렉트 |
| `/tasks`  | `TasksPage`  | 구현 완료             |
| `/ledger` | `LedgerPage` | placeholder           |

---

## 미구현 / 예정 기능

1. **설정(Settings) 탭**
   - Sidebar 좌측 하단 배치
   - priority 슬라이더 스텝 설정
   - 화면 전환 애니메이션 속도 설정

2. **리스트 아이템 재정렬 애니메이션**
   - 중요도/기한 변경 시 항목 이동 애니메이션

3. **LedgerPage 구현**
   - 가계부 화면 (현재 placeholder)

---

## 개발 메모

- `npm run build`는 항상 통과 상태 유지
- 낙관적 업데이트 패턴: 로컬 state 먼저 변경 → Supabase API → 실패 시 rollback
- `due_time` null = 정렬 맨 뒤 (Supabase: `nullsFirst: false`, 로컬: `compareTasks` null last)
- Tailwind `text-amber-500`, `text-orange-500`, `text-red-400/500` = D-day 긴급도 색상 체계
- localStorage key: `'dday-granularity'` (D-day 단위 설정 영속)
- `env(safe-area-inset-top)` 사용 → `viewport-fit=cover`와 함께 Android 상태바 대응
- Android Studio 경로: `/home/ddddewang/Downloads/android-studio/bin/studio.sh`
  - 데스크탑 런처: `~/.local/share/applications/jetbrains-studio.desktop`
