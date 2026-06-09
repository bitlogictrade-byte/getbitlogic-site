// Vercel Serverless Function — 포트원 빌링키 결제 처리
// 환경변수 필요: PORTONE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const PORTONE_SECRET      = process.env.PORTONE_SECRET_KEY;
const PORTONE_STORE_ID    = 'store-e58c2367-1a00-4d48-8e24-2e0482cfce17';
const SUPABASE_URL        = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const PLAN_NAMES = { basic: 'Basic', pro: 'Pro' };

module.exports = async (req, res) => {
    /* CORS */
    res.setHeader('Access-Control-Allow-Origin', 'https://getbitlogic.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const {
        billingKey,
        subscriptionId,
        userId,
        planType,
        amount,
        customerName,
        customerEmail,
    } = req.body;

    if (!billingKey || !subscriptionId || !userId) {
        return res.status(400).json({ error: '필수 파라미터가 없습니다.' });
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
            storeId: PORTONE_STORE_ID,
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
                    storeId:   PORTONE_STORE_ID,
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

        /* 2. Supabase 구독 상태 active로 업데이트 */
        const nextBillingAt = new Date();
        nextBillingAt.setMonth(nextBillingAt.getMonth() + 1);

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
                body: JSON.stringify({
                    status:          'active',
                    next_billing_at: nextBillingAt.toISOString(),
                }),
            }
        );

        if (!supabaseRes.ok) {
            throw new Error('구독 상태 업데이트 실패');
        }

        return res.status(200).json({ success: true, paymentId });

    } catch (err) {
        console.error('[charge] error:', err.message);
        return res.status(500).json({ error: err.message || '결제 처리 중 오류가 발생했습니다.' });
    }
};
