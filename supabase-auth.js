import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

/* ─── Supabase 설정 ─── */
/* 아래 두 값을 새 Supabase 프로젝트의 값으로 교체하세요.
   Supabase 대시보드 > Project Settings > API 에서 확인 가능 */
const SUPABASE_URL  = 'https://uemlhlxjkmenzfetgqdc.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVlbWxobHhqa21lbnpmZXRncWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MjYxMTYsImV4cCI6MjA5NjQwMjExNn0.FnMOxHr7_t_RqUrWjTWpqzk1FEZJKgKI9T6Q0zZHjCc';

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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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

/* ─── 현재 유저 정보 반환 ─── */
export async function getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

/* ─── 비밀번호 재설정 이메일 발송 ─── */
export async function resetPassword(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/index.html#reset-password',
    });
    if (error) throw error;
}

/* ─── 비밀번호 변경 (로그인 상태에서) ─── */
export async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
}

/* ─── 인증 상태 변화 구독 ─── */
export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ?? null);
    });
}
