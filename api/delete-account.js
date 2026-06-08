// Vercel Serverless Function — 회원 탈퇴
// 환경변수 필요: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://getbitlogic.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    /* Authorization 헤더에서 유저 JWT 검증 */
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: '인증이 필요합니다.' });
    }
    const userToken = authHeader.replace('Bearer ', '');

    try {
        /* 1. 토큰으로 유저 ID 확인 */
        const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
            headers: {
                'apikey':        SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${userToken}`,
            },
        });
        const userData = await userRes.json();
        if (!userRes.ok || !userData.id) {
            return res.status(401).json({ error: '유효하지 않은 세션입니다.' });
        }
        const userId = userData.id;

        /* 2. 구독 cancelled 처리 */
        await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?user_id=eq.${userId}&status=eq.active`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'apikey':        SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Prefer':        'return=minimal',
            },
            body: JSON.stringify({ status: 'cancelled', cancelled_at: new Date().toISOString() }),
        });

        /* 3. auth.users에서 유저 삭제 (cascade로 profiles, subscriptions도 삭제) */
        const deleteRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'apikey':        SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
        });

        if (!deleteRes.ok) {
            throw new Error('계정 삭제 실패');
        }

        return res.status(200).json({ success: true });

    } catch (err) {
        console.error('[delete-account] error:', err.message);
        return res.status(500).json({ error: err.message || '탈퇴 처리 중 오류가 발생했습니다.' });
    }
};
