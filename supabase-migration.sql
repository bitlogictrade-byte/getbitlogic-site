-- ============================================================
-- BitLogic Supabase Migration
-- Supabase 대시보드 → SQL Editor → New query → Run
-- ============================================================

-- 1. tv_id_changed 컬럼 추가 (마이페이지 1회 수정 추적)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS tv_id_changed boolean DEFAULT false;

-- 2. email 컬럼 추가 (비밀번호 찾기 이메일 존재 확인용)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email text;

-- 3. 이메일 중복 방지 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_unique
ON profiles(email) WHERE email IS NOT NULL;
