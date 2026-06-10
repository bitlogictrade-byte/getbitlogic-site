// Vercel Serverless Function — Resend 이메일 발송
// 모든 이메일 발송은 이 파일에서 처리
// 환경변수: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const RESEND_API_KEY       = process.env.RESEND_API_KEY;
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FROM_EMAIL           = 'noreply@getbitlogic.com';
const SITE_URL             = 'https://getbitlogic.com';

// ─────────────────────────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────────────────────────

function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtKorDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
        return String(iso);
    }
}

// ─────────────────────────────────────────────────────────────────
// 공통 레이아웃 래퍼
// ─────────────────────────────────────────────────────────────────

function layout(content) {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>BitLogic</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f4f8;font-family:'Apple SD Gothic Neo','Noto Sans KR',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f4f8;padding:48px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

      <!-- 헤더 -->
      <tr>
        <td style="background-color:#010d1a;padding:28px 40px 24px;text-align:center;border-bottom:3px solid #00e5ff;">
          <p style="margin:0;font-size:11px;letter-spacing:0.2em;color:#00e5ff;font-family:Arial,sans-serif;font-weight:700;">— BITLOGIC —</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:700;letter-spacing:0.06em;color:#ffffff;font-family:Arial,sans-serif;">
            BIT<span style="color:#00e5ff;">LOGIC</span>
          </p>
        </td>
      </tr>

      <!-- 본문 -->
      <tr>
        <td style="padding:40px 40px 36px;background-color:#ffffff;">
          ${content}
        </td>
      </tr>

      <!-- 구분선 -->
      <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid #e9ecef;margin:0;"></td></tr>

      <!-- 푸터 -->
      <tr>
        <td style="background-color:#f8f9fa;padding:24px 40px;text-align:center;">
          <p style="margin:0 0 4px;font-size:12px;color:#999999;font-family:Arial,sans-serif;">&#169; 2026 BitLogic. All rights reserved.</p>
          <p style="margin:0 0 2px;font-size:11px;color:#bbbbbb;font-family:Arial,sans-serif;">상호: 비트로직(BitLogic) | 대표: 김서진 | 사업자등록번호: 472-13-03084</p>
          <p style="margin:0;font-size:11px;color:#bbbbbb;font-family:Arial,sans-serif;">
            문의: <a href="mailto:bitlogictrade@gmail.com" style="color:#00b8cc;text-decoration:none;">bitlogictrade@gmail.com</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────
// 재사용 컴포넌트
// ─────────────────────────────────────────────────────────────────

function ctaBtn(label, href) {
    return `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
  <tr>
    <td style="background-color:#00e5ff;border-radius:10px;text-align:center;">
      <a href="${href}" style="display:inline-block;padding:14px 40px;font-size:15px;font-weight:700;color:#010d1a;text-decoration:none;letter-spacing:0.04em;font-family:Arial,sans-serif;">${label}</a>
    </td>
  </tr>
</table>`;
}

function infoTable(rows) {
    const rowsHtml = rows.map(([label, value, highlight], i) => {
        const topBorder = i > 0 ? 'border-top:1px solid #e4f5f9;' : '';
        const pt        = i > 0 ? '10px' : '6px';
        const valColor  = highlight ? '#00b8cc' : '#1a2333';
        const valWeight = highlight ? '800' : '600';
        const valSize   = highlight ? '16px' : '13px';
        return `<tr>
      <td style="${topBorder}color:#666666;font-size:13px;padding:${pt} 0 6px;font-family:Arial,sans-serif;">${label}</td>
      <td style="${topBorder}color:${valColor};font-size:${valSize};font-weight:${valWeight};text-align:right;padding:${pt} 0 6px;font-family:Arial,sans-serif;">${value}</td>
    </tr>`;
    }).join('');
    return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5fcff;border:1px solid #c8eef5;border-radius:12px;margin:0 0 32px;">
  <tr><td style="padding:20px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0">${rowsHtml}</table>
  </td></tr>
</table>`;
}

function heading(title, sub) {
    return `<h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1a2333;font-family:Arial,sans-serif;">${title}</h1>
<p style="margin:0 0 28px;font-size:12px;font-weight:700;color:#00b8cc;letter-spacing:0.12em;text-transform:uppercase;font-family:Arial,sans-serif;">${sub}</p>`;
}

function bodyText(html) {
    return `<p style="margin:0 0 24px;font-size:15px;line-height:1.75;color:#333333;font-family:Arial,sans-serif;">${html}</p>`;
}

function subText(html) {
    return `<p style="margin:0 0 32px;font-size:13px;line-height:1.7;color:#999999;font-family:Arial,sans-serif;">${html}</p>`;
}

// ─────────────────────────────────────────────────────────────────
// 이메일 템플릿 6종
// ─────────────────────────────────────────────────────────────────

function tplWelcome(name) {
    return layout(
        heading('환영합니다! 🎉', 'Welcome to BitLogic') +
        bodyText(`안녕하세요, <strong>${escHtml(name)}</strong>님!<br>BitLogic 회원가입이 완료되었습니다.`) +
        subText('BitLogic의 알고리즘 지표로 더 스마트한 트레이딩을 시작해 보세요.<br>구독 플랜을 선택하면 TradingView에서 바로 이용하실 수 있습니다.') +
        ctaBtn('서비스 시작하기', SITE_URL)
    );
}

function tplResetPassword(resetLink) {
    return layout(
        heading('비밀번호 재설정', 'Password Reset') +
        bodyText('비밀번호 재설정을 요청하셨습니다.<br>아래 버튼을 클릭하여 새 비밀번호를 설정해 주세요.') +
        subText('이 링크는 <strong>1시간</strong> 후 만료됩니다.<br>본인이 요청하지 않으셨다면 이 메일을 무시해 주세요.') +
        ctaBtn('비밀번호 재설정하기', resetLink) +
        `<p style="margin:20px 0 4px;font-size:11px;color:#aaaaaa;text-align:center;font-family:Arial,sans-serif;">버튼이 작동하지 않으면 아래 링크를 복사하여 브라우저에 붙여넣으세요.</p>
<p style="margin:0;font-size:11px;color:#00b8cc;text-align:center;word-break:break-all;font-family:Arial,sans-serif;">${resetLink}</p>`
    );
}

function tplPayment(name, planType, amount, nextBillingAt) {
    const planLabel = planType === 'pro' ? 'Pro' : 'Basic';
    const fmtAmt    = Number(amount).toLocaleString('ko-KR');
    return layout(
        heading('결제가 완료되었습니다', 'Payment Confirmed') +
        bodyText(`안녕하세요, <strong>${escHtml(name)}</strong>님!<br>BitLogic ${planLabel} 플랜 결제가 완료되었습니다.`) +
        infoTable([
            ['구독 플랜',   `BitLogic ${planLabel}`, false],
            ['결제 금액',   `${fmtAmt}원`,            true],
            ['다음 결제일', fmtKorDate(nextBillingAt), false],
        ]) +
        ctaBtn('마이페이지 바로가기', `${SITE_URL}/mypage`)
    );
}

function tplUpgrade(name, nextBillingAt) {
    return layout(
        heading('Pro 플랜으로 업그레이드되었습니다', 'Plan Upgraded to Pro') +
        bodyText(`안녕하세요, <strong>${escHtml(name)}</strong>님!<br>BitLogic Pro 플랜으로 업그레이드되었습니다.`) +
        infoTable([
            ['변경된 플랜',  'BitLogic Pro',           false],
            ['정기 결제',    '119,000원 / 월',          false],
            ['다음 결제일',  fmtKorDate(nextBillingAt), false],
        ]) +
        subText('Pro 플랜의 모든 지표를 이용하실 수 있습니다.<br>TradingView에서 새로운 지표를 확인해 보세요.') +
        ctaBtn('마이페이지 바로가기', `${SITE_URL}/mypage`)
    );
}

function tplDowngradeScheduled(name, nextBillingAt) {
    const fmtDate = fmtKorDate(nextBillingAt);
    return layout(
        heading('플랜 변경이 예약되었습니다', 'Plan Change Scheduled') +
        bodyText(`안녕하세요, <strong>${escHtml(name)}</strong>님!<br>다음 결제일부터 Basic 플랜으로 변경됩니다.`) +
        infoTable([
            ['현재 플랜',   'BitLogic Pro',   false],
            ['변경될 플랜', 'BitLogic Basic', false],
            ['변경 적용일', fmtDate,          false],
            ['변경 후 금액','49,000원 / 월',  false],
        ]) +
        subText(`${fmtDate}까지는 Pro 플랜의 모든 기능을 이용하실 수 있습니다.<br>문의 사항이 있으시면 고객센터로 연락해 주세요.`) +
        ctaBtn('마이페이지 바로가기', `${SITE_URL}/mypage`)
    );
}

function tplTvReminder(name) {
    return layout(
        heading('TradingView ID를 입력해 주세요', 'Action Required') +
        bodyText(`안녕하세요, <strong>${escHtml(name)}</strong>님!<br>아직 TradingView ID를 입력하지 않으셨어요.`) +
        subText('TradingView ID를 입력해야 구독하신 지표 권한이 부여됩니다.<br>아래 버튼을 클릭하여 바로 입력해 주세요.') +
        ctaBtn('지금 입력하기', SITE_URL) +
        `<p style="margin:20px 0 0;font-size:12px;color:#aaaaaa;text-align:center;font-family:Arial,sans-serif;">마이페이지 → TradingView ID 섹션에서도 입력하실 수 있습니다.</p>`
    );
}

// ─────────────────────────────────────────────────────────────────
// 템플릿 맵
// ─────────────────────────────────────────────────────────────────

const TEMPLATES = {
    'welcome':              ({ name })                              => ({ subject: 'BitLogic 회원가입을 환영합니다!',                  html: tplWelcome(name) }),
    'reset-password':       ({ resetLink })                         => ({ subject: '[BitLogic] 비밀번호 재설정 링크',                   html: tplResetPassword(resetLink) }),
    'payment':              ({ name, planType, amount, nextBillingAt }) => ({ subject: '[BitLogic] 결제가 완료되었습니다',              html: tplPayment(name, planType, amount, nextBillingAt) }),
    'upgrade':              ({ name, nextBillingAt })               => ({ subject: '[BitLogic] Pro 플랜으로 업그레이드되었습니다',       html: tplUpgrade(name, nextBillingAt) }),
    'downgrade-scheduled':  ({ name, nextBillingAt })               => ({ subject: '[BitLogic] 다음 결제일부터 Basic으로 변경됩니다',   html: tplDowngradeScheduled(name, nextBillingAt) }),
    'tv-reminder':          ({ name })                              => ({ subject: '[BitLogic] TradingView ID를 아직 입력하지 않으셨어요', html: tplTvReminder(name) }),
};

// ─────────────────────────────────────────────────────────────────
// 핸들러
// ─────────────────────────────────────────────────────────────────

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://getbitlogic.com');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

    if (!RESEND_API_KEY) {
        console.warn('[send-email] RESEND_API_KEY 미설정 — 스킵');
        return res.status(200).json({ ok: true, skipped: true });
    }

    const { type, email, name, planType, amount, nextBillingAt } = req.body ?? {};

    if (!type || !email) {
        return res.status(400).json({ error: 'type과 email은 필수입니다.' });
    }
    if (!TEMPLATES[type]) {
        return res.status(400).json({ error: `알 수 없는 이메일 타입: ${type}` });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: '유효하지 않은 이메일 주소입니다.' });
    }

    try {
        let templateData = { name, planType, amount, nextBillingAt };

        /* reset-password: 이메일 존재 확인 + Supabase Admin API로 복구 링크 생성 */
        if (type === 'reset-password') {
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

            const linkRes  = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
                method:  'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'apikey':        SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                },
                body: JSON.stringify({
                    type:    'recovery',
                    email,
                    options: { redirect_to: `${SITE_URL}/login` },
                }),
            });
            const linkData = await linkRes.json();
            if (!linkRes.ok || !linkData.action_link) {
                throw new Error(linkData.message || '재설정 링크 생성 실패');
            }
            templateData.resetLink = linkData.action_link;
        }

        const { subject, html } = TEMPLATES[type](templateData);

        const resendRes  = await fetch('https://api.resend.com/emails', {
            method:  'POST',
            headers: {
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from:    `BitLogic <${FROM_EMAIL}>`,
                to:      [email],
                subject,
                html,
            }),
        });
        const resendData = await resendRes.json();

        if (!resendRes.ok) {
            throw new Error(resendData.message || `Resend 오류 (${resendRes.status})`);
        }

        console.log(`[send-email] 발송 완료: type=${type} to=${email} id=${resendData.id}`);
        return res.status(200).json({ ok: true, id: resendData.id });

    } catch (err) {
        console.error(`[send-email] 오류: type=${type} to=${email}`, err.message);
        return res.status(200).json({ ok: false, error: err.message });
    }
};
