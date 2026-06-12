// Vercel Serverless Function — 어드민 전용 API
// 환경변수 필요:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   ADMIN_EMAIL (기본값: admin@getbitlogic.com)
//   PORTONE_CHANNEL_KEY_KAKAO, PORTONE_CHANNEL_KEY_KG, PORTONE_CHANNEL_KEY_KPN
//   PORTONE_CHANNEL_KEY_DANAL, PORTONE_CHANNEL_KEY_TOSS, PORTONE_CHANNEL_KEY_KG_AUTH

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL   = process.env.ADMIN_EMAIL || 'admin@getbitlogic.com';
const V1_IMP_KEY    = process.env.PORTONE_V1_IMP_KEY || '';

const CHANNEL_KEYS = {
    KAKAO:   { label: 'KakaoTalk Pay',    value: process.env.PORTONE_CHANNEL_KEY_KAKAO    || '' },
    KG:      { label: 'KG Inicis',        value: process.env.PORTONE_CHANNEL_KEY_KG       || '' },
    KPN:     { label: '한국결제네트웍스', value: process.env.PORTONE_CHANNEL_KEY_KPN      || '' },
    DANAL:   { label: '다날',             value: process.env.PORTONE_CHANNEL_KEY_DANAL    || '' },
    TOSS:    { label: 'TossPay',          value: process.env.PORTONE_CHANNEL_KEY_TOSS     || '' },
    KG_AUTH: { label: 'KG Auth (인증)',   value: process.env.PORTONE_CHANNEL_KEY_KG_AUTH  || '' },
};

function sbHeaders(extra = {}) {
    return {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        ...extra,
    };
}

async function sbFetch(endpoint, opts = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const res  = await fetch(url, {
        method: opts.method || 'GET',
        headers: sbHeaders(opts.headers || {}),
        body: opts.body,
    });
    const text = await res.text();
    return text ? JSON.parse(text) : null;
}

async function verifyAdmin(req) {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return false;
    const token = auth.slice(7);
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const user = await res.json();
    return user?.email === ADMIN_EMAIL;
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const action = req.query.action || (req.method === 'POST' ? req.body?.action : null);

    /* ── 공개 엔드포인트: 결제 페이지용 활성 채널키 조회 ── */
    if (action === 'get-channel-key' && req.method === 'GET') {
        try {
            const rows = await sbFetch('app_settings?key=eq.active_channel_key&select=value');
            const stored = rows?.[0]?.value;
            if (stored) return res.status(200).json({ channelKey: stored });
            // 설정값 없으면 첫 번째 env 채널키 반환
            const fallback = Object.values(CHANNEL_KEYS).find(k => k.value)?.value || '';
            return res.status(200).json({ channelKey: fallback });
        } catch {
            return res.status(200).json({ channelKey: '' });
        }
    }

    /* ── 이하 모든 엔드포인트는 어드민 인증 필요 ── */
    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) return res.status(403).json({ error: '권한이 없습니다.' });

    /* ── 어드민 인증 확인 ── */
    if (action === 'verify') {
        return res.status(200).json({ isAdmin: true });
    }

    /* ── 포트원 V1 IMP 키 조회 ── */
    if (action === 'get-v1-imp-key') {
        return res.status(200).json({ impKey: V1_IMP_KEY });
    }

    /* ── 채널키 목록 + 현재 활성키 조회 ── */
    if (action === 'get-channel-keys') {
        try {
            const rows = await sbFetch('app_settings?key=eq.active_channel_key&select=value');
            const activeKey = rows?.[0]?.value || '';
            return res.status(200).json({ keys: CHANNEL_KEYS, activeKey });
        } catch {
            return res.status(200).json({ keys: CHANNEL_KEYS, activeKey: '' });
        }
    }

    /* ── 활성 채널키 변경 ── */
    if (action === 'set-channel-key') {
        const { channelKey } = req.body || {};
        if (!channelKey) return res.status(400).json({ error: '채널키가 필요합니다.' });
        const validKeys = Object.values(CHANNEL_KEYS).map(k => k.value).filter(Boolean);
        if (!validKeys.includes(channelKey)) {
            return res.status(400).json({ error: '유효하지 않은 채널키입니다.' });
        }
        await sbFetch('app_settings', {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: JSON.stringify({ key: 'active_channel_key', value: channelKey, updated_at: new Date().toISOString() }),
        });
        return res.status(200).json({ ok: true });
    }

    /* ── 구독자 목록 조회 ── */
    if (action === 'get-subscribers') {
        const data = await sbFetch(
            'profiles?select=id,name,email,phone,tradingview_id,created_at,subscriptions(id,plan_type,status,amount,next_billing_at,started_at,cancelled_at)&order=created_at.desc'
        );
        return res.status(200).json({ subscribers: data || [] });
    }

    /* ── 결제 내역 조회 ── */
    if (action === 'get-payments') {
        const data = await sbFetch(
            'subscriptions?select=id,plan_type,status,amount,started_at,next_billing_at,cancelled_at,created_at,profiles(name,email)&order=created_at.desc&limit=200'
        );
        return res.status(200).json({ payments: data || [] });
    }

    /* ── TV ID 수동 초대 ── */
    if (action === 'invite-tv') {
        const { userId, tradingviewId } = req.body || {};
        if (!userId || !tradingviewId) return res.status(400).json({ error: '필수 파라미터가 없습니다.' });

        await sbFetch(`profiles?id=eq.${userId}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ tradingview_id: tradingviewId }),
        });

        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://getbitlogic.com';
        try {
            const r = await fetch(`${baseUrl}/api/invite-tv`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'invite', userId }),
            });
            const result = r.ok ? await r.json() : { ok: false };
            return res.status(200).json({ ok: true, tv: result });
        } catch {
            return res.status(200).json({ ok: true, tv: { ok: false, skipped: true } });
        }
    }

    /* ── 구독 강제 취소 ── */
    if (action === 'cancel-subscription') {
        const { subscriptionId, userId } = req.body || {};
        if (!subscriptionId || !userId) return res.status(400).json({ error: '필수 파라미터가 없습니다.' });

        await sbFetch(`subscriptions?id=eq.${subscriptionId}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ status: 'cancelled', cancelled_at: new Date().toISOString() }),
        });

        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://getbitlogic.com';
        try {
            await fetch(`${baseUrl}/api/invite-tv`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'revoke', userId }),
            });
        } catch { /* TV 해제 실패해도 DB 취소는 유지 */ }

        return res.status(200).json({ ok: true });
    }

    /* ── 구독 플랜 강제 변경 ── */
    if (action === 'change-plan') {
        const { subscriptionId, userId, newPlan } = req.body || {};
        if (!subscriptionId || !userId || !['basic', 'pro'].includes(newPlan)) {
            return res.status(400).json({ error: '유효하지 않은 파라미터입니다.' });
        }
        await sbFetch(`subscriptions?id=eq.${subscriptionId}`, {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ plan_type: newPlan, amount: newPlan === 'pro' ? 119000 : 49000, pending_plan: null }),
        });

        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://getbitlogic.com';
        try {
            await fetch(`${baseUrl}/api/invite-tv`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'invite', userId }),
            });
        } catch { /* TV 권한 업데이트 실패해도 DB 변경은 유지 */ }

        return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: '알 수 없는 액션입니다.' });
};
