import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL  = 'https://ntnvjsewbptvzmxoubic.supabase.co/';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50bnZqc2V3YnB0dnpteG91YmljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzMTY3NzYsImV4cCI6MjA5NDg5Mjc3Nn0.3kHWfOIIc-3a7eymJCA1vzWMPdItRlEYjLH1iwdLApU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

/* ─── 이메일 회원가입 ─── */
export async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
}

/* ─── 이메일 로그인 ─── */
export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
}

/* ─── 로그아웃 ─── */
export async function signOut() {
    await supabase.auth.signOut();
}

/* ─── Google 로그인 ─── */
export async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/index.html' },
    });
    if (error) throw error;
}

/* ─── 카카오 로그인 ─── */
export async function signInWithKakao() {
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo: window.location.origin + '/index.html' },
    });
    if (error) throw error;
}

/* ─── 현재 로그인 세션 반환 ─── */
export async function getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
}
