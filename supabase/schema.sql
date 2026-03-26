-- ============================================================
-- NoJam — Supabase Schema v0.4
-- Supabase 대시보드 > SQL Editor에 붙여넣고 실행하세요.
-- ============================================================

-- 1. users 테이블 생성 (자체 계정 시스템 — Supabase Auth 미사용)
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. tasks 테이블 생성
--    status와 archived는 독립적: archived는 진행중/완료 상태와 무관하게 보관 여부만 관리
CREATE TABLE IF NOT EXISTS public.tasks (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES public.users(id),
  title      TEXT        NOT NULL,
  due_date   DATE        NOT NULL,
  due_time   TIME,                          -- nullable: 시간이 없으면 NULL
  status     TEXT        NOT NULL DEFAULT 'in_progress'
               CHECK (status IN ('in_progress', 'done')),
  archived   BOOLEAN     NOT NULL DEFAULT false,
  priority   FLOAT4      NOT NULL DEFAULT 3.0
               CHECK (priority >= 1.0 AND priority <= 5.0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tasks_pkey PRIMARY KEY (id)
);

-- 3. Row Level Security 활성화 (개발 단계 — 모든 접근 허용)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_users"
  ON public.users FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "allow_all_tasks"
  ON public.tasks FOR ALL USING (true) WITH CHECK (true);

-- 4. 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_tasks_user_id  ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks (due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status   ON public.tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_archived ON public.tasks (archived);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks (priority DESC);

-- ============================================================
-- 마이그레이션 (v0.3 → v0.4): 기존 테이블에 계정 시스템 추가
-- SQL Editor에서 순서대로 실행하세요.
-- ============================================================

-- Step 1: admin 계정 생성 (password: love0615)
-- bcrypt hash ($2b$10$...)는 love0615 를 bcrypt(rounds=10)으로 해싱한 값
INSERT INTO public.users (username, password_hash)
VALUES ('admin', '$2b$10$dCjWl9dMkeJqM6ODdk2FQuKbnCiy/lPOY1z4RxrbaUnQfN5CzwA.m')
ON CONFLICT (username) DO NOTHING;

-- Step 2: tasks 테이블에 user_id 컬럼 추가 (nullable로 먼저 추가)
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id);

-- Step 3: 기존 tasks → admin 계정으로 이전
UPDATE public.tasks
SET user_id = (SELECT id FROM public.users WHERE username = 'admin')
WHERE user_id IS NULL;

-- Step 4: user_id NOT NULL 제약 추가
ALTER TABLE public.tasks ALTER COLUMN user_id SET NOT NULL;

-- ============================================================
-- 마이그레이션 v0.5: 반복 일정 + 시간표 기능
-- ============================================================

-- tasks 테이블에 반복 관련 컬럼 추가
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_repeat      BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS repeat_days    INT     NOT NULL DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS repeat_hours   INT     NOT NULL DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS repeat_minutes INT     NOT NULL DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS repeat_seconds INT     NOT NULL DEFAULT 0;

-- timetable_entries 테이블 생성
CREATE TABLE IF NOT EXISTS public.timetable_entries (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES public.users(id),
  title        TEXT        NOT NULL,
  day_of_week  INT         NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=일, 1=월...6=토
  start_time   TIME        NOT NULL,
  end_time     TIME        NOT NULL,
  color        TEXT        NOT NULL DEFAULT '#a5b4fc',
  task_id      UUID        REFERENCES public.tasks(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_timetable"
  ON public.timetable_entries FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_timetable_user    ON public.timetable_entries (user_id);
CREATE INDEX IF NOT EXISTS idx_timetable_dow     ON public.timetable_entries (day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetable_task_id ON public.timetable_entries (task_id);

-- ============================================================
-- 마이그레이션 v0.6: 요일별 공유 노트
-- ============================================================
CREATE TABLE IF NOT EXISTS public.day_notes (
  day_of_week  INT         NOT NULL PRIMARY KEY CHECK (day_of_week BETWEEN 0 AND 6),
  content      TEXT        NOT NULL DEFAULT '',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.day_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_day_notes"
  ON public.day_notes FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 마이그레이션 v0.7: 시간표 일정에 subtitle (부제목/강의실) 추가
-- ============================================================
ALTER TABLE public.timetable_entries ADD COLUMN IF NOT EXISTS subtitle TEXT;

