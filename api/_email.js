// 공유 이메일 헬퍼 — Resend API 직접 호출
// Vercel 라우트로 노출되지 않음 (언더스코어 prefix)

const RESEND_API_KEY       = process.env.RESEND_API_KEY;
const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FROM_EMAIL           = 'noreply@getbitlogic.com';
const SITE_URL             = 'https://getbitlogic.com';

// ─────────────────────────────────────────────
// 공통 래퍼 템플릿
// ─────────────────────────────────────────────
function base(content) {
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
          <p style="margin:0;font-size:11px;letter-spacing:0.18em;color:#00e5ff;font-family:Arial,sans-serif;font-weight:700;">— BITLOGIC —</p>
          <p style="margin:6px 0 0;font-size:22px;font-weight:700;letter-spacing:0.05em;color:#ffffff;font-family:Arial,sans-serif;">
            BIT<span style="color:#00e5ff">LOGIC</span>
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
          <p style="margin:0 0 4px;font-size:12px;color:#999999;font-family:Arial,sans-serif;">© 2026 BitLogic. All rights reserved.</p>
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

// ─────────────────────────────────────────────
// CTA 버튼 컴포넌트
// ─────────────────────────────────────────────
function ctaBtn(label, href) {
    return `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
  <tr>
    <td style="background-color:#00e5ff;border-radius:10px;text-align:center;">
      <a href="${href}" style="display:inline-block;padding:14px 40px;font-size:15px;font-weight:700;color:#010d1a;text-decoration:none;letter-spacing:0.04em;font-family:Arial,sans-serif;">${label}</a>
    </td>
  </tr>
</table>`;
}

// ─────────────────────────────────────────────
// 정보 테이블 컴포넌트
// ─────────────────────────────────────────────
function infoTable(rows) {
    const rowsHtml = rows.map(([label, value, isHighlight], i) => {
        const border = i > 0 ? 'border-top:1px solid #e8f8fb;' : '';
        const valColor = isHighlight ? '#00b8cc' : '#1a2333';
        const valWeight = isHighlight ? '800' : '600';
        const valSize   = isHighlight ? '16px' : '13px';
        return `<tr>
      <td style="${border}color:#666666;font-size:13px;padding:${i === 0 ? '6px' : '10px'} 0 6px;font-family:Arial,sans-serif;">${label}</td>
      <td style="${border}color:${valColor};font-size:${valSize};font-weight:${valWeight};text-align:right;padding:${i === 0 ? '6px' : '10px'} 0 6px;font-family:Arial,sans-serif;">${value}</td>
    </tr>`;
    }).join('');

    return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5fcff;border:1px solid #c8eef5;border-radius:12px;margin:0 0 32px;">
  <tr>
    <td style="padding:20px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        ${rowsHtml}
      </table>
    </td>
  </tr>
</table>`;
}

// ─────────────────────────────────────────────
// 이메일 템플릿들
// ─────────────────────────────────────────────

function tplWelcome(name) {
    return base(`
<h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1a2333;font-family:Arial,sans-serif;">환영합니다! 🎉</h1>
<p style="margin:0 0 28px;font-size:13px;font-weight:700;color:#00b8cc;letter-spacing:0.1em;font-family:Arial,sans-serif;">WELCOME TO BITLOGIC</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.75;color:#333333;font-family:Arial,sans-serif;">
  안녕하세요, <strong>${escHtml(name)}</strong>님!<br>
  BitLogic 회원가입이 완료되었습니다.
</p>
<p style="margin:0 0 32px;font-size:14px;line-height:1.75;color:#666666;font-family:Arial,sans-serif;">
  BitLogic의 알고리즘 지표로 더 스마트한 트레이딩을 시작해 보세요.<br>
  구독 플랜을 선택하면 TradingView에서 바로 이용하실 수 있습니다.
</p>
${ctaBtn('서비스 시작하기', SITE_URL)}
`);
}

function tplResetPassword(resetLink) {
    return base(`
<h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1a2333;font-family:Arial,sans-serif;">비밀번호 재설정</h1>
<p style="margin:0 0 28px;font-size:13px;font-weight:700;color:#00b8cc;letter-spacing:0.1em;font-family:Arial,sans-serif;">PASSWORD RESET</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.75;color:#333333;font-family:Arial,sans-serif;">
  비밀번호 재설정을 요청하셨습니다.<br>
  아래 버튼을 클릭하여 새 비밀번호를 설정해 주세요.
</p>
<p style="margin:0 0 32px;font-size:13px;line-height:1.7;color:#999999;font-family:Arial,sans-serif;">
  이 링크는 <strong>1시간</strong> 후 만료됩니다.<br>
  본인이 요청하지 않으셨다면 이 메일을 무시해 주세요.
</p>
${ctaBtn('비밀번호 재설정하기', resetLink)}
<p style="margin:20px 0 4px;font-size:11px;color:#aaaaaa;text-align:center;font-family:Arial,sans-serif;">버튼이 작동하지 않으면 아래 링크를 복사하여 브라우저에 붙여넣으세요.</p>
<p style="margin:0;font-size:11px;color:#00b8cc;text-align:center;word-break:break-all;font-family:Arial,sans-serif;">${resetLink}</p>
`);
}

function tplPayment(name, planType, amount, nextBillingAt) {
    const planLabel = planType === 'pro' ? 'Pro' : 'Basic';
    const fmtAmount = Number(amount).toLocaleString('ko-KR');
    const fmtDate   = fmtKorDate(nextBillingAt);
    return base(`
<h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1a2333;font-family:Arial,sans-serif;">결제가 완료되었습니다</h1>
<p style="margin:0 0 28px;font-size:13px;font-weight:700;color:#00b8cc;letter-spacing:0.1em;font-family:Arial,sans-serif;">PAYMENT CONFIRMED</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.75;color:#333333;font-family:Arial,sans-serif;">
  안녕하세요, <strong>${escHtml(name)}</strong>님!<br>
  BitLogic ${planLabel} 플랜 결제가 완료되었습니다.
</p>
${infoTable([
    ['구독 플랜',   `BitLogic ${planLabel}`, false],
    ['결제 금액',   `${fmtAmount}원`,         true],
    ['다음 결제일', fmtDate,                  false],
])}
${ctaBtn('마이페이지 바로가기', `${SITE_URL}/mypage`)}
`);
}

function tplUpgrade(name, nextBillingAt) {
    const fmtDate = fmtKorDate(nextBillingAt);
    return base(`
<h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1a2333;font-family:Arial,sans-serif;">Pro 플랜으로 업그레이드되었습니다</h1>
<p style="margin:0 0 28px;font-size:13px;font-weight:700;color:#00b8cc;letter-spacing:0.1em;font-family:Arial,sans-serif;">PLAN UPGRADED TO PRO</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.75;color:#333333;font-family:Arial,sans-serif;">
  안녕하세요, <strong>${escHtml(name)}</strong>님!<br>
  BitLogic Pro 플랜으로 업그레이드되었습니다.
</p>
${infoTable([
    ['변경된 플랜',   'BitLogic Pro',     false],
    ['정기 결제',     '119,000원 / 월',   false],
    ['다음 결제일',   fmtDate,            false],
])}
<p style="margin:0 0 32px;font-size:14px;line-height:1.75;color:#666666;font-family:Arial,sans-serif;">
  Pro 플랜의 모든 지표를 이용하실 수 있습니다.<br>
  TradingView에서 새로운 지표를 확인해 보세요.
</p>
${ctaBtn('마이페이지 바로가기', `${SITE_URL}/mypage`)}
`);
}

function tplDowngradeScheduled(name, nextBillingAt) {
    const fmtDate = fmtKorDate(nextBillingAt);
    return base(`
<h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1a2333;font-family:Arial,sans-serif;">플랜 변경이 예약되었습니다</h1>
<p style="margin:0 0 28px;font-size:13px;font-weight:700;color:#00b8cc;letter-spacing:0.1em;font-family:Arial,sans-serif;">PLAN CHANGE SCHEDULED</p>
<p style="margin:0 0 24px;font-size:15px;line-height:1.75;color:#333333;font-family:Arial,sans-serif;">
  안녕하세요, <strong>${escHtml(name)}</strong>님!<br>
  다음 결제일부터 Basic 플랜으로 변경됩니다.
</p>
${infoTable([
    ['현재 플랜',   'BitLogic Pro',   false],
    ['변경될 플랜', 'BitLogic Basic', false],
    ['변경 적용일', fmtDate,          false],
    ['변경 후 금액','49,000원 / 월',  false],
])}
<p style="margin:0 0 32px;font-size:13px;line-height:1.7;color:#999999;font-family:Arial,sans-serif;">
  ${fmtDate}까지는 Pro 플랜의 모든 기능을 이용하실 수 있습니다.<br>
  문의 사항이 있으시면 고객센터로 연락해 주세요.
</p>
${ctaBtn('마이페이지 바로가기', `${SITE_URL}/mypage`)}
`);
}

function tplTvReminder(name) {
    return base(`
<h1 style="margin:0 0 6px;font-size:26px;font-weight:800;color:#1a2333;font-family:Arial,sans-serif;">TradingView ID를 입력해 주세요</h1>
<p style="margin:0 0 28px;font-size:13px;font-weight:700;color:#00b8cc;letter-spacing:0.1em;font-family:Arial,sans-serif;">ACTION REQUIRED</p>
<p style="margin:0 0 14px;font-size:15px;line-height:1.75;color:#333333;font-family:Arial,sans-serif;">
  안녕하세요, <strong>${escHtml(name)}</strong>님!<br>
  아직 TradingView ID를 입력하지 않으셨어요.
</p>
<p style="margin:0 0 32px;font-size:14px;line-height:1.75;color:#666666;font-family:Arial,sans-serif;">
  TradingView ID를 입력해야 구독하신 지표 권한이 부여됩니다.<br>
  아래 버튼을 클릭하여 사이트에서 바로 입력해 주세요.
</p>
${ctaBtn('지금 입력하기', SITE_URL)}
<p style="margin:20px 0 0;font-size:12px;color:#aaaaaa;text-align:center;font-family:Arial,sans-serif;">
  마이페이지 → TradingView ID 섹션에서도 입력하실 수 있습니다.
</p>
`);
}

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────

function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtKorDate(iso) {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
        return iso;
    }
}

// ─────────────────────────────────────────────
// 메인 sendEmail 함수
// ─────────────────────────────────────────────

async function sendEmail(type, to, data = {}) {
    if (!RESEND_API_KEY) {
        console.warn('[_email] RESEND_API_KEY 미설정 — 스킵');
        return { ok: true, skipped: true };
    }

    const { name, planType, amount, nextBillingAt } = data;
    let subject, html;

    switch (type) {
        case 'welcome':
            subject = 'BitLogic 회원가입을 환영합니다!';
            html    = tplWelcome(name || '고객');
            break;

        case 'reset-password': {
            const linkRes  = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
                method:  'POST',
                headers: {
                    'Content-Type':  'application/json',
                    'apikey':        SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                },
                body: JSON.stringify({
                    type:    'recovery',
                    email:   to,
                    options: { redirect_to: `${SITE_URL}/login` },
                }),
            });
            const linkData = await linkRes.json();
            if (!linkRes.ok || !linkData.action_link) {
                throw new Error(linkData.message || '재설정 링크 생성 실패');
            }
            subject = '[BitLogic] 비밀번호 재설정 링크';
            html    = tplResetPassword(linkData.action_link);
            break;
        }

        case 'payment':
            subject = '[BitLogic] 결제가 완료되었습니다';
            html    = tplPayment(name || '고객', planType, amount, nextBillingAt);
            break;

        case 'upgrade':
            subject = '[BitLogic] Pro 플랜으로 업그레이드되었습니다';
            html    = tplUpgrade(name || '고객', nextBillingAt);
            break;

        case 'downgrade-scheduled':
            subject = '[BitLogic] 다음 결제일부터 Basic으로 변경됩니다';
            html    = tplDowngradeScheduled(name || '고객', nextBillingAt);
            break;

        case 'tv-reminder':
            subject = '[BitLogic] TradingView ID를 아직 입력하지 않으셨어요';
            html    = tplTvReminder(name || '고객');
            break;

        default:
            throw new Error(`알 수 없는 이메일 타입: ${type}`);
    }

    const res  = await fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
            from:    `BitLogic <${FROM_EMAIL}>`,
            to:      [to],
            subject,
            html,
        }),
    });
    const resData = await res.json();

    if (!res.ok) throw new Error(resData.message || `Resend 오류 (${res.status})`);
    return { ok: true, id: resData.id };
}

module.exports = { sendEmail };
