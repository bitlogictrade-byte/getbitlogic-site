// Vercel Serverless Function — TradingView 스크립트 접근 권한 관리
// 환경변수:
//   TV_SESSION_COOKIE        — TradingView sessionid 쿠키값 (미설정 시 스킵 모드)
//   TV_SCRIPT_ID_BASIC       — Basic 플랜 Pine Script ID
//   TV_SCRIPT_ID_PRO         — Pro 플랜 Pine Script ID
//   SUPABASE_URL             — Supabase 프로젝트 URL
//   SUPABASE_SERVICE_ROLE_KEY — Supabase 서버 키
//   CRON_SECRET              — sync 엔드포인트 보호용 시크릿 (선택)
//   ADMIN_NOTIFY_WEBHOOK     — 실패 알림 웹훅 URL (Slack/Discord/커스텀, 선택)

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TV_SESSION_COOKIE    = process.env.TV_SESSION_COOKIE;
const TV_SCRIPT_ID_BASIC   = process.env.TV_SCRIPT_ID_BASIC;
const TV_SCRIPT_ID_PRO     = process.env.TV_SCRIPT_ID_PRO;
const CRON_SECRET          = process.env.CRON_SECRET;
const ADMIN_NOTIFY_WEBHOOK = process.env.ADMIN_NOTIFY_WEBHOOK;
const PORTONE_SECRET       = process.env.PORTONE_SECRET_KEY;
const PORTONE_STORE_ID     = 'store-e58c2367-1a00-4d48-8e24-2e0482cfce17';

const TV_BASE = 'https://www.tradingview.com';

// ──────────────────────────────────────────────
// TradingView API 헬퍼
// ──────────────────────────────────────────────

// TV_SESSION_COOKIE는 sessionid 값 자체이거나 "sessionid=xxx" 형태 모두 허용
function buildCookieHeader() {
    if (!TV_SESSION_COOKIE) return '';
    return TV_SESSION_COOKIE.startsWith('sessionid=')
        ? TV_SESSION_COOKIE
        : `sessionid=${TV_SESSION_COOKIE}`;
}

function tvHeaders() {
    return {
        'origin':       TV_BASE,
        'referer':      `${TV_BASE}/`,
        'cookie':       buildCookieHeader(),
        'user-agent':   'Mozilla/5.0 (compatible; BitLogic/1.0)',
        'Content-Type': 'application/x-www-form-urlencoded',
    };
}

function getPineId(planType) {
    return planType === 'pro' ? TV_SCRIPT_ID_PRO : TV_SCRIPT_ID_BASIC;
}

// 권한 추가 (이미 있으면 modify 로 fallback)
async function tvInvite(tvUsername, pineId) {
    const body = new URLSearchParams({ pine_id: pineId, username_recip: tvUsername });

    const res  = await fetch(`${TV_BASE}/pine_perm/add/`, {
        method: 'POST',
        headers: tvHeaders(),
        body: body.toString(),
    });
    const text = await res.text();

    if (!res.ok) {
        // 이미 권한이 있는 경우 modify 로 재시도
        if (res.status === 400 || text.toLowerCase().includes('already')) {
            return tvModify(tvUsername, pineId);
        }
        throw new Error(`TV add 실패 (${res.status}): ${text.slice(0, 300)}`);
    }
    return { action: 'invited' };
}

// 만료일 갱신 (이미 권한 있는 유저 재초대 시)
async function tvModify(tvUsername, pineId) {
    const body = new URLSearchParams({ pine_id: pineId, username_recip: tvUsername });

    const res = await fetch(`${TV_BASE}/pine_perm/modify_user_expiration/`, {
        method: 'POST',
        headers: tvHeaders(),
        body: body.toString(),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`TV modify 실패 (${res.status}): ${text.slice(0, 300)}`);
    }
    return { action: 'modified' };
}

// 권한 해제
async function tvRevoke(tvUsername, pineId) {
    const body = new URLSearchParams({ pine_id: pineId, username_recip: tvUsername });

    const res = await fetch(`${TV_BASE}/pine_perm/remove/`, {
        method: 'POST',
        headers: tvHeaders(),
        body: body.toString(),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`TV remove 실패 (${res.status}): ${text.slice(0, 300)}`);
    }
    return { action: 'revoked' };
}

// ──────────────────────────────────────────────
// Supabase 헬퍼
// ──────────────────────────────────────────────

async function supabaseFetch(path, options = {}) {
    return fetch(`${SUPABASE_URL}/rest/v1${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'apikey':        SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            ...(options.headers ?? {}),
        },
    });
}

async function getProfile(userId) {
    const res = await supabaseFetch(
        `/profiles?id=eq.${encodeURIComponent(userId)}&select=id,tradingview_id`
    );
    if (!res.ok) throw new Error('profiles 조회 실패');
    const rows = await res.json();
    return rows[0] ?? null;
}

// ──────────────────────────────────────────────
// 관리자 알림 (Slack/Discord 웹훅 또는 커스텀 웹훅)
// ──────────────────────────────────────────────

async function notifyAdmin(subject, detail) {
    console.error(`[invite-tv] ${subject} | ${detail}`);
    if (!ADMIN_NOTIFY_WEBHOOK) return;
    try {
        await fetch(ADMIN_NOTIFY_WEBHOOK, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ text: `*${subject}*\n\`\`\`${detail}\`\`\`` }),
        });
    } catch (e) {
        console.error('[invite-tv] 관리자 알림 전송 실패:', e.message);
    }
}

// ──────────────────────────────────────────────
// 만료 구독 동기화 (cron 용)
//   next_billing_at < now AND status = active 인 구독을 찾아
//   TV 권한 해제 + DB cancelled 처리
// ──────────────────────────────────────────────

async function syncExpiredSubscriptions() {
    const now = new Date().toISOString();

    const res = await supabaseFetch(
        `/subscriptions?status=eq.active&next_billing_at=lt.${now}&select=id,user_id,plan_type`
    );
    if (!res.ok) throw new Error('subscriptions 조회 실패');

    const expired = await res.json();
    if (expired.length === 0) return { synced: 0, results: [] };

    const results = [];

    for (const sub of expired) {
        try {
            const profile = await getProfile(sub.user_id);

            if (!profile?.tradingview_id) {
                // TV ID 없으면 DB만 cancelled 처리
                await supabaseFetch(`/subscriptions?id=eq.${sub.id}`, {
                    method: 'PATCH',
                    headers: { 'Prefer': 'return=minimal' },
                    body:    JSON.stringify({ status: 'cancelled', cancelled_at: now }),
                });
                results.push({ userId: sub.user_id, status: 'cancelled_no_tv_id' });
                continue;
            }

            const pineId = getPineId(sub.plan_type);
            if (!pineId) {
                results.push({ userId: sub.user_id, status: 'skipped', reason: 'pine_id not configured' });
                continue;
            }

            await tvRevoke(profile.tradingview_id, pineId);

            await supabaseFetch(`/subscriptions?id=eq.${sub.id}`, {
                method: 'PATCH',
                headers: { 'Prefer': 'return=minimal' },
                body:    JSON.stringify({ status: 'cancelled', cancelled_at: now }),
            });

            results.push({ userId: sub.user_id, tvId: profile.tradingview_id, status: 'revoked' });
        } catch (err) {
            await notifyAdmin(
                `[BitLogic] TV 권한 해제 실패`,
                `userId=${sub.user_id} plan=${sub.plan_type}\n오류: ${err.message}`
            );
            results.push({ userId: sub.user_id, status: 'error', error: err.message });
        }
    }

    return { synced: results.length, results };
}

// ──────────────────────────────────────────────
// 다운그레이드 예약 처리 (cron 용)
//   pending_plan = 'basic' AND status = active AND next_billing_at < now 인 Pro 구독을
//   Basic 결제 → TV 권한 전환 → DB 업데이트
// ──────────────────────────────────────────────

async function processPendingDowngrades() {
    const now = new Date().toISOString();

    const res = await supabaseFetch(
        `/subscriptions?status=eq.active&plan_type=eq.pro&pending_plan=eq.basic&next_billing_at=lt.${now}&select=id,user_id,billing_key`
    );
    if (!res.ok) throw new Error('pending downgrade 구독 조회 실패');

    const subs = await res.json();
    if (subs.length === 0) return { downgrades: 0, results: [] };

    const results = [];

    for (const sub of subs) {
        try {
            if (!sub.billing_key) {
                results.push({ userId: sub.user_id, status: 'skipped', reason: 'no billing_key' });
                continue;
            }

            /* 1. Basic 금액 결제 */
            const paymentId  = `bitlogic-downgrade-basic-${sub.id}-${Date.now()}`;
            const nextBilling = new Date();
            nextBilling.setMonth(nextBilling.getMonth() + 1);

            const portoneRes = await fetch(
                `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`,
                {
                    method:  'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `PortOne ${PORTONE_SECRET}`,
                    },
                    body: JSON.stringify({
                        storeId:   PORTONE_STORE_ID,
                        billingKey: sub.billing_key,
                        orderName: 'BitLogic Basic 정기결제 (다운그레이드)',
                        amount:    { total: 49000 },
                        currency:  'KRW',
                        customer:  { customerId: sub.user_id },
                    }),
                }
            );
            const portoneText = await portoneRes.text();
            const portoneData = portoneText ? JSON.parse(portoneText) : {};
            if (!portoneRes.ok || portoneData.code != null) {
                throw new Error(portoneData.message || `포트원 결제 실패 (HTTP ${portoneRes.status})`);
            }

            /* 2. TV 권한 전환: Pro 해제 → Basic 부여 */
            const profile = await getProfile(sub.user_id);
            if (profile?.tradingview_id) {
                const proId   = getPineId('pro');
                const basicId = getPineId('basic');
                if (proId)   await tvRevoke(profile.tradingview_id, proId).catch(() => {});
                if (basicId) await tvInvite(profile.tradingview_id, basicId).catch(() => {});
            }

            /* 3. DB 업데이트 */
            await supabaseFetch(`/subscriptions?id=eq.${sub.id}`, {
                method:  'PATCH',
                headers: { 'Prefer': 'return=minimal' },
                body:    JSON.stringify({
                    plan_type:       'basic',
                    amount:          49000,
                    pending_plan:    null,
                    started_at:      new Date().toISOString(),
                    next_billing_at: nextBilling.toISOString(),
                }),
            });

            results.push({ userId: sub.user_id, status: 'downgraded_to_basic' });
        } catch (err) {
            await notifyAdmin(
                '[BitLogic] Basic 다운그레이드 실패',
                `userId=${sub.user_id}\n오류: ${err.message}`
            );
            results.push({ userId: sub.user_id, status: 'error', error: err.message });
        }
    }

    return { downgrades: results.length, results };
}

// ──────────────────────────────────────────────
// 메인 핸들러
// ──────────────────────────────────────────────

function isCronAuthorized(req) {
    if (!CRON_SECRET) return true;
    return (
        req.headers['x-cron-secret'] === CRON_SECRET ||
        req.headers['authorization'] === `Bearer ${CRON_SECRET}`
    );
}

async function handleSync(res) {
    if (!TV_SESSION_COOKIE) {
        console.warn('[invite-tv] TV_SESSION_COOKIE 미설정 — sync 스킵');
        return res.status(200).json({ ok: true, skipped: true, reason: 'TV_SESSION_COOKIE not configured' });
    }

    try {
        const [expireResult, downgradeResult] = await Promise.all([
            syncExpiredSubscriptions(),
            processPendingDowngrades(),
        ]);
        return res.status(200).json({ ok: true, ...expireResult, ...downgradeResult });
    } catch (err) {
        await notifyAdmin('[BitLogic] TV sync 전체 실패', err.message);
        return res.status(500).json({ error: err.message });
    }
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://getbitlogic.com');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Cron-Secret, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    /* ── GET: Vercel Cron에서 호출 ── */
    if (req.method === 'GET') {
        const action = req.query?.action;
        if (action === 'sync') {
            if (!isCronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
            return handleSync(res);
        }
        return res.status(400).json({ error: 'action=sync 파라미터가 필요합니다.' });
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { action, userId, planType } = req.body ?? {};

    // ── sync: 만료 구독 일괄 권한 해제 + 다운그레이드 처리 ──────────────────
    if (action === 'sync') {
        if (!isCronAuthorized(req)) return res.status(401).json({ error: 'Unauthorized' });
        return handleSync(res);
    }

    // ── invite / revoke: 개별 유저 처리 ─────────────────
    if (!action || !userId || !['invite', 'revoke'].includes(action)) {
        return res.status(400).json({
            error: 'action(invite|revoke|sync) 과 userId 가 필요합니다.',
        });
    }

    // TV_SESSION_COOKIE 미설정 시 스킵 모드 — 결제 플로우를 막지 않음
    if (!TV_SESSION_COOKIE) {
        console.warn('[invite-tv] TV_SESSION_COOKIE 미설정 — 스킵 모드');
        return res.status(200).json({ ok: true, skipped: true, reason: 'TV_SESSION_COOKIE not configured' });
    }

    try {
        const profile = await getProfile(userId);

        if (!profile?.tradingview_id) {
            return res.status(200).json({ ok: true, skipped: true, reason: 'tradingview_id not set' });
        }

        const plan   = planType ?? 'basic';
        const pineId = getPineId(plan);

        if (!pineId) {
            console.warn(`[invite-tv] TV_SCRIPT_ID_${plan.toUpperCase()} 미설정 — 스킵`);
            return res.status(200).json({ ok: true, skipped: true, reason: `TV_SCRIPT_ID_${plan.toUpperCase()} not configured` });
        }

        const result = action === 'invite'
            ? await tvInvite(profile.tradingview_id, pineId)
            : await tvRevoke(profile.tradingview_id, pineId);

        return res.status(200).json({ ok: true, tvId: profile.tradingview_id, ...result });

    } catch (err) {
        // graceful fallback — 결제/해지 플로우를 막지 않도록 500 대신 200 반환
        await notifyAdmin(
            `[BitLogic] TV ${action} 실패`,
            `userId=${userId} plan=${planType}\n오류: ${err.message}`
        );
        return res.status(200).json({ ok: false, skipped: true, error: err.message });
    }
};
