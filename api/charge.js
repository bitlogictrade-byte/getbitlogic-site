// Vercel Serverless Function — 포트원 빌링키 결제 처리
// 환경변수 필요: PORTONE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY

const { sendEmail } = require('./_email');

const PORTONE_SECRET      = process.env.PORTONE_SECRET_KEY;
const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PLAN_NAMES   = { basic: 'Basic', pro: 'Pro' };
const PLAN_AMOUNTS = { basic: 49000, pro: 119000 };

module.exports = async (req, res) => {
    /* CORS */
    res.setHeader('Access-Control-Allow-Origin', 'https://getbitlogic.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const {
        storeId,
        billingKey,
        subscriptionId,
        userId,
        planType,
        customerName,
        customerEmail,
        isUpgrade,
        planStartedAt,
    } = req.body;

    if (!storeId || !billingKey || !subscriptionId || !userId) {
        return res.status(400).json({ error: '필수 파라미터가 없습니다.' });
    }

    /* 업그레이드 차액 계산: 잔여금액 = 49,000 - (49,000/30 × 사용일수) */
    let amount;
    if (isUpgrade && planType === 'pro' && planStartedAt) {
        const now      = new Date();
        const start    = new Date(planStartedAt);
        const daysUsed = Math.max(1, Math.floor((now - start) / 86400000) + 1);
        const remaining = Math.max(0, Math.round(49000 - (49000 / 30 * daysUsed)));
        amount = 119000 - remaining;
    } else {
        amount = PLAN_AMOUNTS[planType];
    }
    if (!amount) {
        return res.status(400).json({ error: '유효하지 않은 플랜입니다.' });
    }

    try {
        /* 1. 포트원 빌링키 결제 요청 */
        const paymentId = `bitlogic-${planType}-${Date.now()}`;
        const planLabel = PLAN_NAMES[planType] || planType;

        console.log('[charge] 포트원 API 호출 시작', {
            paymentId,
            planType,
            amount,
            userId,
            billingKey: billingKey?.slice(0, 20) + '...',
            storeId: storeId,
            hasSecret: !!PORTONE_SECRET,
        });

        const portoneRes = await fetch(
            `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `PortOne ${PORTONE_SECRET}`,
                },
                body: JSON.stringify({
                    storeId:   storeId,
                    billingKey,
                    orderName: `BitLogic ${planLabel} 정기결제`,
                    amount: { total: amount },
                    currency: 'KRW',
                    customer: {
                        customerId: userId,
                        fullName:   customerName || '고객',
                        email:      customerEmail,
                    },
                }),
            }
        );

        const portoneText = await portoneRes.text();
        console.log('[charge] 포트원 API 응답', { status: portoneRes.status, body: portoneText });

        const portoneData = portoneText ? JSON.parse(portoneText) : {};

        if (!portoneRes.ok || portoneData.code != null) {
            throw new Error(portoneData.message || `포트원 결제 실패 (HTTP ${portoneRes.status})`);
        }

        /* 2. Supabase 구독 상태 업데이트 */
        const nextBillingAt = new Date();
        nextBillingAt.setMonth(nextBillingAt.getMonth() + 1);
        const startedAt = new Date().toISOString();

        const patchBody = isUpgrade
            ? {
                plan_type:       'pro',
                billing_key:     billingKey,
                amount:          119000,
                status:          'active',
                pending_plan:    null,
                started_at:      startedAt,
                next_billing_at: nextBillingAt.toISOString(),
              }
            : {
                status:          'active',
                started_at:      startedAt,
                next_billing_at: nextBillingAt.toISOString(),
              };

        const supabaseRes = await fetch(
            `${SUPABASE_URL}/rest/v1/subscriptions?id=eq.${subscriptionId}`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey':        SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                    'Prefer':        'return=minimal',
                },
                body: JSON.stringify(patchBody),
            }
        );

        if (!supabaseRes.ok) {
            throw new Error('구독 상태 업데이트 실패');
        }

        /* 3. 이메일 발송 (실패해도 결제 결과에 영향 없음) */
        sendEmail(
            isUpgrade ? 'upgrade' : 'payment',
            customerEmail,
            {
                name:          customerName,
                planType,
                amount,
                nextBillingAt: nextBillingAt.toISOString(),
            }
        ).catch(e => console.error('[charge] 이메일 발송 실패:', e.message));

        return res.status(200).json({ success: true, paymentId });

    } catch (err) {
        console.error('[charge] error:', err.message);
        return res.status(500).json({ error: err.message || '결제 처리 중 오류가 발생했습니다.' });
    }
};
