// Vercel Serverless Function — Resend 이메일 발송 HTTP 엔드포인트
// 환경변수: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const { sendEmail } = require('./_email');

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 클라이언트에서 직접 호출 가능한 타입 (서버사이드 전용 타입은 이 목록에 없음)
const CLIENT_TYPES = new Set(['welcome', 'reset-password', 'tv-reminder', 'downgrade-scheduled']);

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://getbitlogic.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

    const { type, email, name, nextBillingAt } = req.body ?? {};

    if (!type || !email) {
        return res.status(400).json({ error: 'type과 email은 필수입니다.' });
    }
    if (!CLIENT_TYPES.has(type)) {
        return res.status(400).json({ error: `허용되지 않는 타입입니다: ${type}` });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: '유효하지 않은 이메일 주소입니다.' });
    }

    // reset-password: 이메일이 실제 가입된 계정인지 서버에서 재확인
    if (type === 'reset-password') {
        try {
            const chkRes = await fetch(
                `${SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`,
                {
                    headers: {
                        'apikey':        SUPABASE_SERVICE_KEY,
                        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    },
                }
            );
            const rows = await chkRes.json();
            if (!Array.isArray(rows) || rows.length === 0) {
                return res.status(200).json({ ok: false, notFound: true });
            }
        } catch (err) {
            console.error('[send-email] 이메일 존재 확인 실패:', err.message);
            // 실패 시 계속 진행 (사용자 경험 우선)
        }
    }

    try {
        const result = await sendEmail(type, email, { name, nextBillingAt });
        return res.status(200).json(result);
    } catch (err) {
        console.error('[send-email] error:', err.message);
        // 이메일 오류는 graceful fallback — 주요 플로우를 막지 않음
        return res.status(200).json({ ok: false, error: err.message });
    }
};
