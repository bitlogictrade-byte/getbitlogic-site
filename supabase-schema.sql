-- =====================================================
-- BitLogic Supabase Schema
-- Supabase 대시보드 > SQL Editor 에서 이 파일 전체 실행
-- =====================================================

-- ── 1. profiles (유저 추가 정보) ──────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id               UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name             TEXT,
    phone            TEXT,
    tradingview_id   TEXT,
    terms_agreed_at  TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 프로필 조회" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "본인 프로필 저장" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "본인 프로필 수정" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);


-- ── 2. subscriptions (구독/플랜 정보) ─────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    plan_type        TEXT NOT NULL CHECK (plan_type IN ('basic', 'pro')),
    billing_key      TEXT,
    status           TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
    amount           INTEGER NOT NULL,
    next_billing_at  TIMESTAMPTZ,
    started_at       TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 구독 조회" ON public.subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "본인 구독 추가" ON public.subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "본인 구독 수정" ON public.subscriptions
    FOR UPDATE USING (auth.uid() = user_id);


-- ── 3. updated_at 자동 갱신 트리거 ───────────────────
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ── 4. 신규 가입 시 profiles 자동 생성 트리거 ─────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, created_at, updated_at)
    VALUES (NEW.id, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
