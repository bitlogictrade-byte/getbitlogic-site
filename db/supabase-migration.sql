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

-- 4. 전화번호 중복 방지 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique
ON profiles(phone) WHERE phone IS NOT NULL;

-- 5. handle_new_user 트리거 업데이트
--    phone unique 제약 위반 시 트리거 실패("Database error saving new user") 방지
--    unique_violation 예외를 잡아서 phone 제외하고 프로필 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, phone, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'phone',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
EXCEPTION WHEN unique_violation THEN
    -- phone 중복 시 phone 없이 행 생성 (이후 register.html upsert에서 처리)
    INSERT INTO public.profiles (id, name, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'name',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 전화번호 존재 여부 확인 함수 (비로그인 상태에서 RLS 우회)
--    register.html에서 supabase.rpc('is_phone_taken', { p_phone: ... }) 로 호출
CREATE OR REPLACE FUNCTION public.is_phone_taken(p_phone text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE phone = p_phone);
$$;
