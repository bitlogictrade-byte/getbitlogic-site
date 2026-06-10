# Project Changelog

---

## 2026-06-10 (57차)

### 모바일 상태바 ↔ nav 배경색 경계 제거

**수정 파일:** `style.css`, `script.js`, 전체 HTML 10개

#### 원인
- index.html 최상단(`at-top`) 상태에서 nav는 투명 → hero 이미지(다크 네이비)가 비침
- OS/브라우저 상태바 영역은 `theme-color` 미설정으로 검정(#000000) 고정
- → 상태바(검정) vs nav(네이비) 경계선 시각적으로 노출

#### 수정 내용

**1. `style.css` — `html::before` 재추가 (CSS 변수 기반)**
- `position:fixed;top:0;height:env(safe-area-inset-top)` 오버레이
- `--status-bar-bg` / `--status-bar-filter` CSS 변수로 제어
- 기본값: `transparent` (non-index 페이지에서 nav 배경이 그대로 노출)
- z-index: 101 (nav z-index: 100 위)

**2. `script.js` — `setupNavScroll()` 확장**
- `at-top` 전환 시 `--status-bar-bg` / `--status-bar-filter` 동기화
  - at-top: `transparent` / `none` → hero 이미지가 safe area까지 비침
  - 스크롤 후: `rgba(0,0,0,0.88)` / `blur(20px)` → nav 불투명 배경과 일치
- `meta[name="theme-color"]` 동적 업데이트
  - at-top: `#060a14` (다크 네이비, hero 색 매칭)
  - 스크롤 후: `#000000`

**3. 전체 HTML 10개 — `<meta name="theme-color" content="#060a14">` 추가**
- Android Chrome 상태바 색상 고정 기본값 설정
- index.html은 JS가 스크롤 상태에 따라 동적으로 덮어씀

---

## 2026-06-10 (56차)

### FAQ 모바일 텍스트 잘림 수정

**수정 파일:** `style.css`

#### 원인 및 수정

**1. 답변 텍스트 잘림 — `.faq-a.open { max-height: 200px → 1000px }`**
- 긴 답변(여러 줄 `<br>` 포함)이 200px에서 overflow:hidden으로 잘려 보이던 문제
- `max-height: 1000px`으로 확장 (CSS 높이 애니메이션 방식 유지)

**2. 질문 텍스트 + 아이콘 레이아웃 — `.faq-q { align-items: center → flex-start }`**
- 모바일에서 질문 텍스트가 줄바꿈될 때 `+` 아이콘이 세로 중앙에 고정되어 텍스트가 어색하게 보이던 문제
- `flex-start`로 변경하여 아이콘이 텍스트 첫 줄에 정렬
- `.faq-icon { margin-top: 0.1rem }` 추가로 첫 줄 텍스트와 시각적 정렬 맞춤

---

## 2026-06-10 (55차)

### 모바일 nav 버그 2건 수정

**수정 파일:** `style.css`, `script.js`, `index.html`(script.js 통해 처리), `login.html`, `mypage.html`, `checkout.html`, `success.html`, `register.html`, `onboarding.html`, `privacy-policy.html`, `refund-policy.html`, `terms-of-service.html`

#### 1. 햄버거 메뉴 열릴 때 nav 불투명 처리

**원인:** 기존 hamburger 핸들러가 `nav-mobile`에만 `open` class를 토글하고, `.nav` 자체에는 아무 클래스도 추가하지 않음 → index.html 최상단에서 `nav.at-top`(투명)이 유지된 채로 메뉴가 열려 배경이 보임

**수정:**
- `style.css`: `.nav.menu-open` 규칙 추가 — `!important`로 `.nav.at-top` 투명 상태 오버라이드
  ```css
  .nav.menu-open {
      background: rgba(0, 0, 0, 0.95) !important;
      backdrop-filter: blur(20px) !important;
      border-color: var(--border) !important;
  }
  ```
- `script.js` `setupNav()`: 햄버거 클릭 시 `.nav`에 `menu-open` class 토글, 링크 클릭 시 제거
- 전체 HTML 10개 파일의 인라인 hamburger 핸들러 동일하게 수정
  - `const mainNav = document.querySelector('.nav')` 추가
  - `mainNav?.classList.toggle('menu-open', isOpen)` / `mainNav?.classList.remove('menu-open')` 추가

#### 2. 모바일 상단 safe area (노치) 배경 불일치 수정

**원인:** `html::before` (z-index:9999, `background: var(--black)` = 순수 `#000000`)가 nav 위에 덮여 notch 영역을 순수 검정으로 채움 → nav의 `rgba(0,0,0,0.88)` + `backdrop-filter:blur` 배경과 색상/효과가 달라 notch 경계에서 시각적 불일치 발생

**수정:** `html::before` pseudo-element 제거  
- `.nav`는 이미 `position:fixed; top:0; padding-top:env(safe-area-inset-top)` 구조이므로 nav 배경이 notch 영역까지 자연스럽게 채워짐
- nav 투명 상태(at-top): hero 그라디언트가 notch까지 seamless하게 보임
- nav 불투명 상태(스크롤 or 메뉴 오픈): nav 배경이 notch까지 seamless하게 채워짐

---

## 2026-06-10 (54차)

### Resend 이메일 연동 추가

**신규 파일:** `api/send-email.js`  
**수정 파일:** `api/charge.js`, `register.html`, `login.html`, `success.html`, `mypage.html`, `CLAUDE.md`

> **Vercel 환경변수 추가 필요:**
> - `RESEND_API_KEY` — Resend 대시보드에서 발급

#### 1. api/send-email.js — Resend 이메일 발송 Vercel Serverless Function (신규)
- **모든 이메일 발송을 단일 파일에서 처리** (템플릿 포함 완전 자급)
- 발신 주소: `noreply@getbitlogic.com`
- 이메일 디자인: `#010d1a` 다크 헤더 + `#00e5ff` 청록 포인트 컬러 + 흰색 본문 카드 (이메일 클라이언트 호환 table 레이아웃)
- 템플릿 6종 (`TEMPLATES` 맵):
  - `welcome` — 환영 이메일
  - `reset-password` — 비밀번호 재설정 링크
  - `payment` — 결제 확인 (플랜명·금액·다음 결제일)
  - `upgrade` — Pro 업그레이드 안내
  - `downgrade-scheduled` — '다음 결제일부터 Basic으로 변경됩니다' 안내
  - `tv-reminder` — TradingView ID 미입력 안내 ([지금 입력하기] → getbitlogic.com)
- `reset-password` 처리:
  - `profiles` 테이블 이메일 존재 확인 → 미가입 시 `{ ok: false, notFound: true }` 반환
  - Supabase Admin API `generate_link({ type: 'recovery' })`로 복구 링크 생성
- `RESEND_API_KEY` 미설정 시 `{ ok: true, skipped: true }` graceful fallback
- XSS 방지: 사용자 입력값 `escHtml()` 처리
- 발송 실패 시 `{ ok: false }` 반환 (주요 플로우 차단 없음)

#### 2. api/charge.js — 결제 완료 이메일 발송 추가
- `_email.js` require 제거 → `/api/send-email` HTTP 호출로 교체
- `VERCEL_URL` 환경변수 활용 (미설정 시 `getbitlogic.com` fallback)
- Supabase 구독 업데이트 성공 후 fire-and-forget 발송
  - `isUpgrade: true` → `upgrade` 타입
  - 일반 결제 → `payment` 타입

#### 3. register.html — 환영 이메일 + 비밀번호 재설정 교체
- 회원가입 성공 후 `welcome` 이메일 fire-and-forget
- 전화번호 중복 복구 박스: `resetPassword()` → `reset-password` 타입 교체
  - `notFound: true` 응답 시 "가입된 계정 정보가 없습니다." 인라인 에러 표시
- `resetPassword` import 제거

#### 4. login.html — 비밀번호 재설정 Resend로 교체
- `resetPassword()` → `reset-password` 타입 교체 (클라이언트 측 profiles 조회 제거, 서버에서 처리)
- `resetPassword` import 제거

#### 5. success.html — TV ID 미입력 시 reminder 이메일
- '나중에 입력하기' 버튼 클릭 시 profiles에서 name 조회 후 `tv-reminder` 이메일 fire-and-forget

#### 6. mypage.html — 다운그레이드 예약 이메일
- `currentUser`, `currentProfile` 모듈-레벨 변수 추가 (init() 완료 후 저장)
- 다운그레이드 확인 후 `downgrade-scheduled` 이메일 fire-and-forget (sub.next_billing_at 포함)

#### 7. CLAUDE.md
- `RESEND_API_KEY` 환경변수 항목 추가
- `api/send-email.js` 파일 구조 테이블 추가

---

## 2026-06-10 (53차)

### 업그레이드/다운그레이드 로직 + Vercel Cron 추가

**수정 파일:** `checkout.html`, `api/charge.js`, `mypage.html`, `api/invite-tv.js`, `vercel.json`, `CLAUDE.md`

> **Supabase 마이그레이션 필요:**
> ```sql
> ALTER TABLE subscriptions ADD COLUMN pending_plan text;
> ```

#### 1. checkout.html — Basic→Pro 업그레이드 차액 계산
- `checkout?plan=pro` 진입 시 Basic 활성 구독 감지 (id·started_at·created_at 포함 fetch)
- 차액 공식: `사용일수 = 업그레이드일 - started_at + 1`, `잔여 = 49,000 - (49,000/30 × 사용일수)`, `청구 = 119,000 - 잔여`
- 플랜 카드에 Pro 정가 / Basic 잔여(차감) / 최종 청구금액 내역 표시 (`#upgradeBreakdown`)
- 업그레이드 시 새 구독 행 생성 스킵 → 기존 sub ID 그대로 사용
- `/api/charge` 요청에 `isUpgrade: true`, `planStartedAt` 추가 전달
- 결제 버튼 텍스트 "업그레이드 결제하기"로 변경

#### 2. api/charge.js — 업그레이드 차액 결제 + 구독 갱신
- `isUpgrade: true` 시 서버사이드에서 pro-rated 금액 재계산 (클라이언트 금액 신뢰 안 함)
- 결제 성공 후 기존 구독 행 PATCH: `plan_type='pro'`, `billing_key`, `amount=119000`, `started_at`, `next_billing_at`
- 일반 결제에도 `started_at` 추가 (이전에는 미설정으로 null)

#### 3. mypage.html — Pro 다운그레이드 신청
- Pro active 배지를 "최고 플랜 이용 중 🎉" 클릭 가능 배지로 표시 (보라 테마)
- 클릭 시 `showConfirm` 모달으로 다운그레이드 확인
- 확인 시 `subscriptions.pending_plan = 'basic'` 저장
- `pending_plan`이 이미 설정된 경우 "Pro (다운그레이드 예정)" 표시

#### 4. api/invite-tv.js — Cron GET 지원 + pending_plan 다운그레이드 처리
- `GET /api/invite-tv?action=sync` 엔드포인트 추가 (Vercel Cron용)
- `isCronAuthorized()`: `x-cron-secret` 또는 `Authorization: Bearer` 헤더 인증 지원
- `processPendingDowngrades()`: `pending_plan='basic' AND status='active' AND next_billing_at < now` Pro 구독 처리
  - PortOne으로 Basic(49,000원) 결제
  - TV 권한 전환: Pro 해제 → Basic 부여
  - DB 업데이트: `plan_type='basic'`, `amount=49000`, `pending_plan=null`, `started_at`, `next_billing_at`
- `syncExpiredSubscriptions` + `processPendingDowngrades` 병렬 실행 (`Promise.all`)
- PORTONE_SECRET_KEY / PORTONE_STORE_ID 상수 추가

#### 5. vercel.json — 매일 자정 KST Cron 추가
- `"0 15 * * *"` (UTC 15:00 = KST 00:00) 스케줄로 `/api/invite-tv?action=sync` 호출

#### 6. CLAUDE.md — subscriptions 스키마 업데이트
- `pending_plan text` 컬럼 추가

---

## 2026-06-10 (52차)

### 마이페이지 계정 정보 섹션 순서 변경

**수정 파일:** `mypage.html`

#### 변경 순서
이메일 → 가입일 → 로그인 방식 (기존)  
→ 이름 → 이메일 → 연락처 → 로그인 방식 → 가입일 (변경 후)

#### 구현 방식
- 이름·연락처를 동적 `addInfoRow`로 섹션 끝에 붙이던 방식 → 정적 HTML 행(`#userNameRow`, `#userPhoneRow`)으로 변경
- 데이터 없으면 `display:none` 유지, 있으면 JS에서 표시
- 연락처 행에는 `#userPhoneWrap`(`.info-value-wrap`)을 HTML에 미리 배치하고 JS에서 값+토글 버튼을 직접 주입 (이중 래퍼 방지)
- TradingView ID·약관 동의일은 여전히 동적으로 섹션 끝에 추가

---

## 2026-06-10 (51차)

### 마이페이지 계정 정보 이메일·연락처 마스킹

**수정 파일:** `mypage.html`

#### 1. 마스킹 형식
- 이메일: 로컬 파트 앞 2자 + `****` + 도메인 (예: `se****@gmail.com`)
- 연락처: 앞 3자리 + `****` + 뒤 4자리 (예: `010-****-5678`)

#### 2. 👁 토글 버튼
- 기본 상태: 마스킹된 값 표시 + 눈 아이콘(eye)
- 클릭 시: 전체 값 표시 + 눈 가림 아이콘(eye-off)으로 전환
- 재클릭 시: 다시 마스킹 상태로 복귀

#### 3. 구현 방식
- `maskEmail(email)`, `maskPhone(phone)` 유틸 함수 추가
- `wrapWithReveal(valueEl, raw, masked)` — 값 span + 토글 버튼을 묶는 래퍼 생성 함수
- `addMaskedInfoRow(label, raw, masked, container)` — 전화번호처럼 동적으로 추가되는 행에 사용
- 이메일은 정적 HTML `#userEmailDisplay` + `#emailRevealBtn` 요소 조작

---

## 2026-06-10 (50차)

### 토스트 UX 개선

**수정 파일:** `ui.js`, `style.css`

#### 1. 중복 메시지 제거
- `showToast` 호출 시 현재 표시 중인 토스트와 동일 메시지면 새 토스트를 생성하지 않음

#### 2. 최대 3개 제한
- 이미 3개가 쌓인 상태에서 새 토스트 추가 시 가장 오래된 것을 즉시 fade-out 제거

#### 3. 위치 분기
- PC (769px 이상): 오른쪽 상단 고정 (기존 동일)
- 모바일 (768px 이하): 오른쪽 하단 고정 (safe-area-inset-bottom 반영)

---

## 2026-06-10 (49차)

### 브라우저 기본 alert/confirm → 커스텀 토스트/모달 교체

**신규 파일:** `ui.js`  
**수정 파일:** `style.css`, `index.html`, `login.html`, `mypage.html`, `register.html`, `success.html`, `checkout.html`

#### 1. ui.js — 전역 UI 유틸리티 생성
- `showToast(message, type)` — 토스트 알림 표시
  - `type: 'success'` — 녹색 아이콘, 3초 후 자동 사라짐 + X 버튼
  - `type: 'error'` — 빨간 아이콘, X 버튼만 (자동 사라짐 없음)
  - `type: 'info'` — 시안 아이콘, 3초 후 자동 사라짐 + X 버튼
- `showConfirm(message, options)` — `Promise<boolean>` 반환하는 커스텀 모달
  - `options.title`, `options.confirmText`, `options.cancelText`, `options.danger` 지원
  - 배경 클릭 시 취소(false) 처리

#### 2. style.css — 토스트/컨펌 CSS 추가
- `:root`에 색상 변수 추가 (`--toast-*`, `--confirm-*`) — 퍼플 테마 전환 시 이 블록만 수정하면 됨
- 토스트: 오른쪽 상단 고정, slide-in/out 트랜지션, safe-area-inset 반영
- 컨펌 모달: 기존 `.modal-overlay`와 동일한 블러/페이드 애니메이션 스타일

#### 3. 각 페이지 alert/confirm 교체 내역
- **index.html**: 로그인 실패, 비밀번호 검증, 회원가입 결과, 비밀번호 재설정, 소셜 로그인 실패 → `showToast`, 로그아웃 확인 → `showConfirm`
- **login.html**: 비밀번호 재설정 성공/실패, 소셜 로그인 실패 → `showToast`
- **mypage.html**: TV ID 저장/수정, 비밀번호 변경, 구독 해지, 회원탈퇴 결과 → `showToast`, 로그아웃·구독해지·회원탈퇴 확인 → `showConfirm(danger: true)`
- **register.html**: 기존 로컬 `showToast` 구현 제거 및 전역 버전으로 통합, `alert` 2건 교체
- **success.html**, **checkout.html**: 오류 `alert` → `showToast('...', 'error')`

#### 4. register.html 기존 toast 정리
- 인라인 CSS `.toast-wrap`, `.toast`, `@keyframes toastIn/Out` 제거
- HTML `<div id="toastWrap">` 제거
- 로컬 `function showToast()` 정의 제거 → `ui.js` 전역 함수 사용

---

## 2026-06-10 (48차)

### UX 개선 및 코드 정리

**수정 파일:** `index.html`, `mypage.html`, `checkout.html`, `api/charge.js`

#### 1. index.html / mypage.html — 로그아웃 확인 다이얼로그 추가
- 두 파일의 `handleLogout` 함수 첫 줄에 `if (!confirm('로그아웃 하시겠어요?')) return;` 추가
- 네비게이션 드롭다운, 모바일 메뉴, 계정관리 섹션 버튼 모두 동일한 핸들러를 공유하므로 일괄 적용

#### 2. checkout.html / api/charge.js — PortOne Store ID 단일화
- `api/charge.js`에 하드코딩되어 있던 `PORTONE_STORE_ID` 상수 제거
- `checkout.html` → `/api/charge` 요청 body에 `storeId: PORTONE_STORE_ID` 추가하여 전달
- `api/charge.js`는 `req.body.storeId`로 읽도록 변경, 필수 파라미터 검증에도 포함
- Store ID 정의는 `checkout.html` 한 곳에만 유지 (`const PORTONE_STORE_ID = '...'`)

---

## 2026-06-10 (47차)

### 파비콘 추가

**수정 파일:** `favicon.ico`, `favicon-32x32.png`, `apple-touch-icon.png`, 전체 HTML 10개

#### 파비콘 파일 생성 (btlogocl.png 원본 기반)
- `favicon.ico` — 16×16 + 32×32 PNG 이중 임베드 ICO 포맷 (3.5KB)
- `favicon-32x32.png` — 32×32 PNG (2.6KB)
- `apple-touch-icon.png` — 180×180 PNG, iOS 홈 화면 추가용 (50KB)
- PowerShell + .NET `System.Drawing` 으로 고품질 bicubic 리샘플링 적용

#### 전체 HTML 파일 head에 파비콘 태그 삽입
아래 10개 파일 `<meta name="viewport">` 직후에 일괄 추가:
`index.html` / `login.html` / `register.html` / `checkout.html` / `success.html` / `mypage.html` / `onboarding.html` / `privacy-policy.html` / `refund-policy.html` / `terms-of-service.html`

```html
<link rel="icon" type="image/x-icon" href="favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
```

---

## 2026-06-10 (46차)

### 버그 수정 및 UX 개선 5건

**수정 파일:** `index.html`, `checkout.html`, `mypage.html`, `login.html`, `register.html`

#### 1. index.html — OAuth 콜백 에러 catch 폴백 추가
- OAuth 로그인 후 프로필 조회 실패 시 `console.error`만 하고 유저가 페이지에 갇히던 문제 수정
- catch 블록에 onboarding.html로 폴백 리다이렉트 추가 (세션 복구 흐름 유지)

#### 2. checkout.html — 결제 버튼 중복 클릭 방지 강화
- `payBtn.disabled` 상태 먼저 선언해 `validateForm()` 호출 전에 `if (payBtn.disabled) return;` 조기 반환 추가
- PortOne SDK 팝업 열려 있는 동안 중복 제출 완전 차단

#### 3. checkout.html — 전화번호 표시 포맷 통일 (`010-1234-5678`)
- 초기 프로필 로드 시 raw `01012345678` 그대로 표시하던 문제 수정 → `replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3')` 적용
- `setupEditField`에 `formatVal` 옵션 추가, 수정 후 confirm 시에도 포맷 적용
- mypage.html은 이미 포맷 적용되어 있어 변경 없음

#### 4. mypage.html — 구독 만료 7일 이내 경고 배너
- `renderSubscription`에서 `next_billing_at`까지 7일 이하 남은 경우 빨간 경고 배너 자동 표시
- D-0 당일 "오늘 구독 결제가 진행됩니다" 문구 분기 처리
- `.expiry-warn-banner` CSS 추가

#### 5. login.html / register.html / checkout.html / mypage.html — SEO 메타태그 추가
- 4개 페이지에 `<meta name="description">` 및 `<meta name="robots" content="noindex, nofollow">` 추가
- 결제·인증·계정 페이지는 크롤링 차단이 적절하므로 noindex 처리

---

## 2026-06-10 (45차)

### success.html, mypage.html — TV ID 미입력 스킵 플로우 수정

**수정 파일:** `success.html`, `mypage.html`

#### success.html
- "나중에 입력하기" 버튼 텍스트 → "나중에 마이페이지에서 입력하기"로 변경
- 스킵 버튼 클릭 시 `/api/send-tv-sms` 호출 제거 (미구현 엔드포인트)
- 대신 `mypage.html?tv_banner=1`로 즉시 이동
- 더 이상 사용하지 않는 `.sms-sent-box` CSS 및 HTML 제거

#### mypage.html
- `?tv_banner=1` URL 파라미터 감지 시 노란색 안내 배너 자동 표시
- 배너 문구: "TradingView ID를 아직 입력하지 않으셨어요. 지표 권한 부여를 위해 아래에서 입력해 주세요."
- "입력하러 가기" 버튼 클릭 시 TradingView ID 섹션으로 부드럽게 스크롤
- 배너 닫기(×) 버튼 추가
- 배너 스타일 (`.tv-notice-banner`) `<style>` 블록에 추가

---

## 2026-06-10 (44차)

### index.html, style.css — Footer 레이아웃 전면 재구성 (가운데 정렬)

**수정 파일:** `index.html`, `style.css`

- Footer 전체 구조를 좌우 분리 → 세로 중앙 정렬로 변경
- 상단: 이용약관 | 개인정보처리방침 | 환불정책 링크 (구분자 `|`)
- 중단: 사업자 정보를 3줄로 구성
  - 1줄: 상호명 | 대표자 | 사업자등록번호
  - 2줄: 통신판매업신고번호 | 주소
  - 3줄: 고객센터 | 이메일
- 하단: copyright
- 맨 아래: 투자 면책 문구 (상단 구분선 포함)
- 로고/브랜드명 제거 (링크로 대체)

---

## 2026-06-10 (43차)

### api/invite-tv.js — TradingView 스크립트 접근 권한 관리 Serverless Function 신규 작성

**수정 파일:** `api/invite-tv.js`, `CLAUDE.md`

#### api/invite-tv.js — 신규 생성
- `action: 'invite'` — 결제 완료 후 특정 유저를 TV 스크립트에 초대 (`POST /pine_perm/add/`)
  - 이미 권한 있는 경우 `modify_user_expiration` 으로 자동 fallback
- `action: 'revoke'` — 구독 해지 시 특정 유저 TV 권한 해제 (`POST /pine_perm/remove/`)
- `action: 'sync'` — 만료된 구독(`next_billing_at < now AND status = active`) 일괄 권한 해제 (cron 용)
  - `X-Cron-Secret` 헤더로 sync 엔드포인트 보호 (`CRON_SECRET` 설정 시)
- `TV_SESSION_COOKIE` 미설정 시 스킵 모드 — 결제/해지 플로우를 막지 않음
- TV API 실패 시 graceful fallback (500 대신 200 반환) + `ADMIN_NOTIFY_WEBHOOK` 으로 Slack/Discord 알림
- `TV_SCRIPT_ID_BASIC` / `TV_SCRIPT_ID_PRO` 미설정 시에도 스킵 처리
- 참조: [trendoscope-algorithms/Tradingview-Access-Management](https://github.com/trendoscope-algorithms/Tradingview-Access-Management)

#### CLAUDE.md — 환경변수 테이블 업데이트
- `TV_SESSION_COOKIE`, `TV_SCRIPT_ID_BASIC`, `TV_SCRIPT_ID_PRO`, `CRON_SECRET`, `ADMIN_NOTIFY_WEBHOOK` 항목 추가
- 페이지 구조 테이블에 `api/invite-tv.js` 항목 추가

---

## 2026-06-10 (42차)

### index.html — Feature 카드 SVG 아이콘 교체, FAQ 오탈자 수정, Footer 가독성 개선

**수정 파일:** `index.html`, `style.css`

#### index.html — Feature 카드 이모지 → SVG 아이콘
- 이모지(📊🔇⚡🔓)를 각 카드 의미에 맞는 인라인 SVG stroke 아이콘으로 교체
  - 검증된 알고리즘: 막대 차트(bar chart) 아이콘
  - 노이즈 필터: 깔때기(funnel/filter) 아이콘
  - 즉시 활성화: 번개(zap/lightning) 아이콘
  - 약정 없는 구독: 열린 자물쇠(unlock) 아이콘
- 시안(`var(--cyan)`) 색상 적용, 사이트 기존 SVG 스타일과 통일

#### index.html — FAQ 오탈자 수정
- "트레이딩뷰를 한 번도 사용해보지 않은 초보자도 쓸 수 있나요?" 답변:
  - `만들었습니다<br>` → `만들었습니다.<br>` (문장 끝 마침표 추가)
  - `사용하실 수 있습니다."` → `사용하실 수 있습니다.` (불필요한 큰따옴표 제거)
  - 답변 첫머리 불필요한 공백 제거
- "유료 지표를 쓰면 무조건 수익이 나나요?" 답변 첫머리 불필요한 공백 제거

#### index.html / style.css — Footer 사업자 정보 가독성 개선
- 기존 `|` 구분자로 이어 쓴 3줄 `<p>` → `<ul class="footer-biz">` 그리드 레이아웃으로 교체
- 라벨(`footer-biz-label`)과 값(`footer-biz-value`) 색상 분리로 시각적 구분 강화
- `grid-template-columns: repeat(auto-fill, minmax(210px, 1fr))` — 반응형 2~3열 자동 배치
- `style.css`에 `.footer-biz`, `.footer-biz-item`, `.footer-biz-label`, `.footer-biz-value` 스타일 추가

---

## 2026-06-10 (41차)

### 소셜 로그인 온보딩 플로우 구현

**신규 파일:** `onboarding.html`  
**수정 파일:** `index.html`, `login.html`, `register.html`, `checkout.html`, `mypage.html`, `CLAUDE.md`

#### onboarding.html (신규)
- 소셜 로그인(카카오/구글) 후 이름·전화번호가 없는 유저를 위한 온보딩 전용 페이지
- 페이지 로드 시 세션 확인 → 미로그인 시 `login.html` 리다이렉트
- 프로필에 이름·전화번호 이미 있으면 `?redirect` 목적지로 즉시 스킵
- 이름·전화번호 입력 → `profiles` 테이블에 upsert
- 전화번호 중복 시 "이미 가입된 번호예요" 박스 표시 + "다시 입력하기" / "로그인 페이지로 이동" 버튼 2개
- 뒤로가기(버튼/브라우저) 시 취소 확인 모달 → "나가기" 선택 시 로그아웃 후 `login.html` 이동
- `?redirect=<url>` 쿼리 파라미터로 완료 후 목적지 지정 (open redirect 방지 로직 포함)
- 스피너 로딩 상태 → 폼 노출 순서로 flash 없이 전환

#### index.html
- 소셜 OAuth 콜백 감지 로직 추가 (`window.location.hash.includes('access_token')`)
- 콜백 후 `onAuthStateChange`로 세션 확보 → profiles 조회 → 이름/전화번호 없으면 `onboarding.html?redirect=...`으로 이동
- 소셜 로그인 버튼 4개 모두 클릭 시 `sessionStorage.ob_redirect` 저장

#### login.html / register.html
- 소셜 로그인 버튼 클릭 시 `sessionStorage.ob_redirect = 'index.html'` 저장

#### checkout.html
- 로그인 확정 직후(이메일/소셜 무관) 온보딩 미완료 가드 삽입
- `profiles.name` 또는 `profiles.phone` 없으면 `onboarding.html?redirect=<checkout URL>`로 이동
- `await new Promise(() => {})` 패턴으로 이후 초기화 코드 실행 차단

#### mypage.html
- `init()` 함수 내 로그인 확인 직후 온보딩 미완료 가드 삽입
- 이름/전화번호 없으면 `onboarding.html?redirect=mypage.html`로 이동

---

## 2026-06-10 (40차)

### checkout.html — 주문 확인 플로우 리디자인 / success.html — TV ID 자동 초대 처리

**수정 파일:** `checkout.html`, `success.html`, `api/invite-tv.js` (신규)

#### checkout.html
- "주문자 정보" 섹션을 "주문 확인" 스타일로 리디자인
  - 이메일(읽기 전용), 이름, 연락처를 표시 모드(display mode)로 먼저 보여줌
  - Supabase `profiles`에서 이름·연락처 자동 불러와 표시, 이메일은 `auth` 세션에서 표시
  - 각 항목 옆 [수정] 버튼 → 클릭 시 해당 필드만 inline input으로 잠금 해제
  - 확인 버튼 클릭 또는 Enter → 다시 표시 모드로 복귀 (잠금), Escape → 값 복원
  - 미입력 상태일 때 "미입력" placeholder 스타일 표시
  - CSS: `.co-info-section`, `.co-info-item`, `.co-edit-btn`, `.co-confirm-btn`, `.co-edit-input` 등 추가

#### success.html
- TV ID 저장 후 `/api/invite-tv` 엔드포인트 호출하여 TradingView 자동 초대 처리
- 초대 API 실패해도 마이페이지로 정상 이동 (graceful fallback)

#### api/invite-tv.js (신규)
- TradingView Pine Script 초대 처리 Vercel Serverless Function
- 환경변수: `TV_SESSION_COOKIE`, `TV_SCRIPT_ID_BASIC`, `TV_SCRIPT_ID_PRO`
- Pro 플랜: Basic + Pro 전체 스크립트 초대 / Basic 플랜: Basic 스크립트만 초대
- `TV_SESSION_COOKIE` 미설정 시 스킵 처리 (로그 기록 후 성공 반환)
- `profiles` 테이블에 `tradingview_id` 재확인 업데이트

---

## 2026-06-10 (39차)

### register.html — 회원가입 2단계 분리

**수정 파일:** `register.html`

- 기존 단일 폼을 2단계 슬라이드 방식으로 분리
  - **1단계:** 이메일 / 비밀번호 / 비밀번호 확인 + 소셜 로그인
  - **2단계:** 이름 / 전화번호 + 회원가입 완료 버튼
- Step indicator (번호 dots + 진행선) 추가, 단계 완료 시 체크 표시로 전환
- `cubic-bezier` 슬라이드 애니메이션으로 자연스러운 단계 전환
- 1단계에서 Enter 키로 다음 단계로 이동 지원
- 이메일 중복 감지 시 자동으로 1단계로 복귀 후 에러 표시
- "이전으로" 버튼으로 1단계 복귀 가능
- 소셜 로그인(카카오/구글) 버튼은 1단계에 배치

---

## 2026-06-10 (38차)

### terms-of-service.html, refund-policy.html — TradingView® 무관 고지 문구 추가

**수정 파일:** `terms-of-service.html`, `refund-policy.html`

- 각 페이지 제목 아래 `TradingView®는 본 서비스와 무관합니다.` 문구 추가

---

## 2026-06-10 (37차)

### Nav 투명도 버그 수정 — 비index 페이지에서 항상 투명하던 문제

**수정 파일:** `style.css`, `script.js`, `index.html`

- 원인: `script.js`가 `index.html`에만 포함돼 있어 다른 페이지에서는 `.scrolled` 클래스가 붙지 않아 nav가 항상 투명
- 수정: nav 기본 스타일을 불투명(`rgba(0,0,0,0.88)` + blur)으로 변경
- `index.html` hero 최상단에서만 `.at-top` 클래스로 투명하게 전환하는 방식으로 로직 반전
- `index.html` nav에 초기 `at-top` 클래스 추가로 첫 렌더링 깜빡임 방지

---

## 2026-06-10 (36차)

### style.css — hero-desc 텍스트 반응형 비율 수정

**수정 파일:** `style.css`

- `.hero-desc` font-size를 고정값 `1rem`에서 `clamp(0.92rem, 1.2vw, 1.1rem)`으로 변경
- 롤링 타이틀(`clamp(1.6rem, 6.5vw, 80px)`)과 설명 텍스트가 뷰포트 크기에 비례해 스케일되도록 수정
- 기존에는 대형 화면에서 타이틀(80px) 대비 설명(16px) 비율이 5:1까지 벌어지던 문제 해결

---

## 2026-06-10 (35차)

### checkout.html — 약관 동의 체크박스 3개로 분리 + 자동결제 안내 문구 추가

**수정 파일:** `checkout.html`

- 기존 단일 체크박스 → 필수 3개로 분리
  - `agreeAuto`: 매월 자동 갱신 및 환불 불가 디지털 콘텐츠 동의
  - `agreeRisk`: 수익 미보장 및 투자 손실 책임 본인 확인
  - `agreeTerms`: 이용약관 · 개인정보처리방침 동의 (각 링크 연결)
- 결제하기 버튼 바로 위 소문자 안내 문구 추가: "구매 버튼 클릭 시 매월 자동 결제에 동의하는 것으로 간주됩니다."
- `validateForm()` — 3개 체크박스 모두 체크 시에만 결제 진행

---

## 2026-06-09 (34차)

### refund-policy.html — 인코딩 깨짐 수정 (파일 교체)

**수정 파일:** `refund-policy.html`

- 파일 인코딩이 깨져 있던 버전을 정상 UTF-8 한글 버전으로 교체

---

## 2026-06-09 (33차)

### privacy-policy.html — 인코딩 깨짐 수정 (파일 교체)

**수정 파일:** `privacy-policy.html`

- 파일 인코딩이 깨져 있던 버전을 정상 UTF-8 한글 버전으로 교체

---

## 2026-06-09 (32차)

### terms-of-service.html — 인코딩 깨짐 수정 (파일 교체)

**수정 파일:** `terms-of-service.html`

- 파일 인코딩이 깨져 있던 버전을 정상 UTF-8 한글 버전으로 교체

---

## 2026-06-09 (31차)

### checkout.html — 결제금액 레이블 변경, 플랜 변경 버튼 아웃라인, 아코디언 기능 목록 추가

**수정 파일:** `checkout.html`

- '이 결제금액' → '총 결제금액' 텍스트 변경
- `.co-switch-btn` 아웃라인 스타일 적용: 배경 투명, 테두리+텍스트 색상으로 강조
  - `.upgrade`: `var(--cyan)` 테두리/텍스트
  - `.downgrade`: 회색 테두리/텍스트 (반투명)
- 아코디언 내 다른 플랜 기능 최대 3개 표시 (`altPlan.features.slice(0,3)`)
  - `co-alt-features` 스타일 추가 (작은 점 불릿, 흐린 텍스트)

---

## 2026-06-09 (30차)

### checkout.html — 구독 중 기능 리스트 표시 버그 수정

**수정 파일:** `checkout.html`

- `renderPlan` 내 `summaryPrice` 엘리먼트 참조 제거 (29차에서 해당 DOM 요소 삭제됐으나 JS가 남아 있어 null 참조 에러 → `makeFeatList` 미실행)
- 구독 중 상태에서도 플랜 기능 리스트(`planFeatureList`) 정상 렌더링
- 플랜 설명 문구(`planSub`)만 숨김, 기능 리스트는 표시 유지

---

## 2026-06-09 (29차)

### checkout.html — 플랜 카드 UI 세부 수정

**수정 파일:** `checkout.html`

- 가격 띄어쓰기 제거: `<span>` 사이 줄바꿈 제거로 `49,000원 / 월` 붙여쓰기
- '플랜 금액' 행 제거, '이 결제금액' 행만 유지
- 구독 중(`activeSubPlan` 존재) 시 플랜 설명 문구(`planSub`) 숨김

---

## 2026-06-09 (28차)

### checkout.html — 아코디언 변경 버튼 업그레이드/다운그레이드 스타일 분기

**수정 파일:** `checkout.html`

- `co-switch-btn.upgrade`: 보라→청록 그라디언트 (Basic→Pro 업그레이드 시)
- `co-switch-btn.downgrade`: 회색 반투명 + 흐린 텍스트 (Pro→Basic 다운그레이드 시)
- `renderPlan`에서 `altKey === 'pro'` 여부로 `.upgrade` / `.downgrade` 클래스 자동 토글

---

## 2026-06-09 (27차)

### checkout.html — 구독 상태에 따른 헤더·플랜 방향 분기

**수정 파일:** `checkout.html`

- 로그인 후 `subscriptions` 테이블에서 `status=active` 구독 조회
- **구독 없음**: 헤더 '선택하신 플랜 확인', URL 파라미터로 초기 플랜 결정, 아코디언 양방향
- **Basic 구독 중**: 헤더 '현재 구독 플랜', 초기 planKey='basic', 토글 텍스트 'Pro 플랜으로 업그레이드', Pro 방향 단방향
- **Pro 구독 중**: 헤더 '현재 구독 플랜', 초기 planKey='pro', 토글 텍스트 'Basic 플랜으로 변경', Basic 방향 단방향
- 구독 중 플랜 전환 완료 시 아코디언 토글 숨김 (재선택 방지)
- `co-plan-hdr`에 `id="planHdr"` 추가

---

## 2026-06-09 (26차)

### checkout.html — 아코디언 패널 간소화

**수정 파일:** `checkout.html`

- 아코디언 패널 내부 간소화: Monthly 배지·플랜 설명·기능 리스트 제거
- 플랜명 + 가격을 한 줄(flex row)로 표시, 아래에 변경 버튼만 배치
- 그라디언트 헤더 `선택하신 플랜 확인` 유지 확인 (HTML/CSS 이미 존재)
- JS renderPlan에서 제거된 요소(altPlanSub, altFeatureList) 업데이트 코드 삭제

---

## 2026-06-09 (25차)

### checkout.html — 플랜 변경 아코디언 위치 이동 (카드 외부 → 카드 내부)

**수정 파일:** `checkout.html`

- 아코디언 토글 버튼 + 패널을 `.co-plan-card` 외부에서 `.co-plan-body` 내부로 이동
- 위치: 결제금액 행 바로 아래, 결제하기 버튼 위
- CSS: 독립 카드 스타일(외부 border/radius) → 카드 내부 스타일(subtle background + 얇은 border)로 조정
- 아코디언 열릴 때 토글 버튼 하단 radius 제거로 패널과 자연스럽게 연결

---

## 2026-06-09 (24차)

### checkout.html — 우측 플랜 카드 두 시안 합성 + 아코디언 플랜 전환

**수정 파일:** `checkout.html`

- 플랜 카드 상단에 그라디언트 헤더 "선택하신 플랜 확인" 추가 (시안1 반영, overflow:hidden으로 카드 안에 통합)
- 플랜 카드 본문은 기존 MONTHLY 배지·가격·기능·결제금액 구조 유지 (시안2 반영)
- "다른 플랜으로 변경하기" → 아코디언 토글 버튼으로 전환 (클릭 시 다른 플랜 카드 슬라이드 펼침)
  - 아코디언 내부: 대체 플랜 정보(배지·이름·가격·기능 목록) + "이 플랜으로 변경하기" 버튼
  - 변경 후 아코디언 자동 닫힘, URL `?plan=` 파라미터 동기화
  - Pro 플랜(현재/대체 모두) 보라색 테두리·글로우 강조

---

## 2026-06-09 (23차)

### checkout.html — 기존 2열 레이아웃 복원 + 우측 플랜 카드 개선

**수정 파일:** `checkout.html`

- 기존 2열 레이아웃(좌: 주문 정보 폼, 우: 플랜 카드) 유지
- Pro 플랜 전환 시 업그레이드 강조: 카드 보라색 테두리(`is-pro` 클래스) + "BEST" 그라디언트 배지
- TossPay/Stripe/VISA/Mastercard 로고 → "안전한 PG 결제 환경" 자물쇠 아이콘 문구로 교체
- VAT 관련 문구 요소 제거

---

## 2026-06-09 (22차)

### checkout.html — 결제 페이지 UI 전면 개편 (스크린샷 기준)

**수정 파일:** `checkout.html`

- 레이아웃: 2열 그리드 → 단일 컬럼 (max-width 500px, 중앙 정렬)
- 상단에 그라디언트 배너 "선택하신 플랜 확인" 추가 (보라→청록 그라디언트)
- 플랜 카드: 플랜명(cyan), 설명, 가격, 기능 리스트(체크마크 아이콘) 표시
- Pro 플랜 선택 시: 카드 테두리 강조 + "BEST" 배지 표시
- '다른 옵션으로 변경하기' 버튼: 플랜 카드 하단 full-width 아웃라인 버튼으로 변경, 전환 아이콘 포함
- 폼 입력란: 주문자명, 결제 및 안내 수신 번호 + 개인정보 안내 문구 추가
- 하단 총 결제금액 + 그라디언트 결제 버튼으로 재배치
- '안전한 PG 결제 환경' 자물쇠 아이콘과 함께 표시 (VAT 관련 문구 완전 제거)
- 기능 목록 아이템: 점 → SVG 체크마크 아이콘으로 변경

---

## 2026-06-09 (21차)

### checkout.html — '다른 플랜으로 변경하기' 인페이지 플랜 전환

**수정 파일:** `checkout.html`

- 기존: 버튼 클릭 시 `index.html#pricing`으로 이동
- 수정: 페이지 이동 없이 현재 플랜의 반대 플랜(Basic↔Pro)으로 즉시 전환
  - 플랜명, 설명, 가격, 기능 목록 모두 동적 업데이트
  - 버튼 텍스트도 전환 대상 플랜명으로 변경 (예: "Pro 플랜으로 변경하기")
  - URL 쿼리 파라미터(`?plan=...`)도 `history.replaceState`로 동기화
  - 결제 시 `planKey`/`plan` 변수도 최신 값 사용

---

## 2026-06-09 (20차)

### api/charge.js — 결제 금액 서버에서 결정 (클라이언트 amount 무시)

**수정 파일:** `api/charge.js`

- 기존: 클라이언트가 보낸 `amount` 값을 그대로 포트원 결제에 사용 → 금액 조작 가능
- 수정: `PLAN_AMOUNTS` 상수(`basic: 49000`, `pro: 119000`)를 서버에 정의하고 `planType` 기준으로 금액 결정
- 유효하지 않은 `planType` 요청 시 400 반환

---

## 2026-06-09 (19차)

### api/charge.js — 포트원 결제 요청에 storeId 누락 수정

**수정 파일:** `api/charge.js`

- 기존: 포트원 V2 빌링키 결제 API 요청 body에 `storeId` 없음 → 포트원이 요청 거부, 결제 기록 미생성
- 수정: `PORTONE_STORE_ID` 상수 추가 후 결제 요청 body에 `storeId` 포함

---

## 2026-06-09 (18차)

### api/charge.js — 포트원 빈 응답 JSON 파싱 에러 수정

**수정 파일:** `api/charge.js`

- 기존: `portoneRes.json()` 직접 호출 → 응답 body가 비어있을 때 `Unexpected end of JSON input` 에러 발생
- 수정: `portoneRes.text()`로 먼저 읽은 후 내용이 있을 때만 `JSON.parse()` 실행, 비어있으면 빈 객체 `{}` 사용
- 에러 메시지에 HTTP 상태코드 포함하여 디버깅 개선

---

## 2026-06-09 (17차)

### checkout.html — profiles upsert 시 전화번호 중복 에러(23505) 무시

**수정 파일:** `checkout.html`

- 기존: `profileErr` 발생 시 무조건 throw → 이미 가입된 유저의 전화번호 unique 제약 위반(23505)으로 결제 진행 불가
- 수정: `profileErr.code === '23505'`(unique violation)인 경우 에러 무시하고 기존 데이터 유지하며 결제 계속 진행

---

## 2026-06-09 (16차)

### checkout.html — 포트원 결제 billingKeyMethod 변경

**수정 파일:** `checkout.html`

- `billingKeyMethod: 'CARD'` → `billingKeyMethod: 'EASY_PAY'` 로 변경
- 간편결제(카카오페이, 토스페이 등) 방식으로 빌링키 발급 요청

---

## 2026-06-09 (15차)

### XSS 방지 처리 — 모든 사용자 입력값 sanitize 및 특수문자 이스케이프

**수정 파일:** `mypage.html`, `register.html`, `checkout.html`, `success.html`

#### 주요 취약점 수정

**1. mypage.html — `addInfoRow` innerHTML XSS 취약점 (Critical)**
- 기존: `row.innerHTML = \`<span>...</span>\`` 으로 DB 데이터(이름, 전화번호, TV ID 등)를 직접 삽입 → 저장된 XSS 페이로드 실행 가능
- 수정: `createElement` + `textContent` 방식으로 전면 교체 → HTML 삽입 원천 차단

**2. sanitizeInput 유틸 함수 추가 (register.html, checkout.html)**
- `< > " ' & \`` 등 HTML 특수문자를 폼 제출 전 제거
- 이름 필드에 적용 (register / checkout)

**3. sanitizeTvId 유틸 함수 추가 (success.html, mypage.html)**
- TradingView ID: `[a-zA-Z0-9._-]` 외 문자 자동 제거
- 정규식 패턴 검증 추가: `/^[a-zA-Z0-9._\-]{1,50}$/` — 범위 외 입력 시 에러 메시지 표시

**4. maxlength 속성 추가**
- `register.html` 이름 input: `maxlength="50"`
- `checkout.html` 이름 input: `maxlength="50"`
- `success.html` TV ID input: `maxlength="50"`
- `mypage.html` TV ID 수정 input: `maxlength="50"`

#### 보안 원칙 적용 사항
- 표시(Display): 모든 DB 데이터를 `.textContent`로만 DOM에 삽입
- 저장(Storage): 특수문자 strip 후 Supabase parameterized query로 저장
- 유효성: 이메일은 기존 정규식, 전화번호는 기존 숫자 only 강제, 이름/TV ID는 이번에 추가

---

## 2026-06-09 (14차)

### style.css - 모바일 nav 상단 검정 빈 공간 버그 수정

**원인:** nav의 `padding-top: env(safe-area-inset-top)` 영역이 투명 상태(스크롤 최상단)일 때 body 검정 배경이 그대로 비쳐 status bar 아래에 빈 공간처럼 보임

**수정:** `html::before` pseudo-element 추가
```css
html::before {
    position: fixed; top: 0; left: 0; right: 0;
    height: env(safe-area-inset-top);
    background: var(--black);
    z-index: 9999;
    pointer-events: none;
}
```
- 노치/상태바 높이만큼 항상 검정으로 덮음 → status bar와 seamless 연결
- 전 페이지(style.css 공통)에 자동 적용
- `pointer-events: none`으로 터치 이벤트 영향 없음
- nav 스크롤 투명→다크 동작은 유지됨

---

## 2026-06-09 (13차)

### 전 페이지 Nav scroll 적용 완료 (login / register / checkout / mypage)

**배경:** `setupNavScroll()`이 `script.js`에만 있어 `index.html` 외 페이지에선 nav가 항상 투명했던 문제 수정

**변경 파일:** `login.html`, `register.html`, `checkout.html`, `mypage.html`
- 각 파일 `</script>` 직전에 IIFE로 nav scroll 코드 추가
- `scrollY > 10` 기준 `.scrolled` 클래스 토글 (passive scroll listener)
- 페이지 로드 직후 `update()` 즉시 호출 (새로고침 중간 위치 대응)

**현재 safe area 전체 적용 상태 (style.css 11차 + 이번 13차)**
- `body`: 좌우 safe area (landscape 노치)
- `.nav`: 상단 safe area (Dynamic Island) + 좌우 safe area + 투명→다크 스크롤 전환 (전 페이지)
- `.footer`: 홈 인디케이터 하단 safe area
- `.modal-overlay`: 4방향 safe area

---

## 2026-06-09 (12차)

### style.css + script.js - Netflix 방식 Nav 스크롤 투명 처리

**style.css**
- `.nav` 기본 상태: `background: transparent`, `backdrop-filter: none`, `border: transparent` + 0.4s transition
- `.nav.scrolled`: `background: rgba(0,0,0,0.88)` + `backdrop-filter: blur(20px)` + border 복원
- 노치 영역은 `padding-top: env(safe-area-inset-top)` (11차에서 추가)로 nav 배경색이 자동으로 채워짐

**script.js**
- `setupNavScroll()` 추가: `scrollY > 10` 기준으로 `.scrolled` 클래스 토글 (passive scroll listener)
- 페이지 로드 시 즉시 실행(페이지 중간에서 새로고침할 경우 대응)
- `DOMContentLoaded` 초기화 블록에서 호출

---

## 2026-06-09 (11차)

### style.css - 모바일 Safe Area 처리 추가
- `body`: `padding-left/right: env(safe-area-inset-left/right)` — 좌우 노치(landscape) 대응
- `.nav` (fixed): `padding-top: env(safe-area-inset-top)` + 좌우 safe area — 상단 상태바/Dynamic Island 대응
- `.footer`: `padding-bottom: calc(3rem + env(safe-area-inset-bottom))` — 홈 인디케이터 대응
- `.modal-overlay`: 상하좌우 모두 safe area를 기존 padding에 calc로 합산

---

## 2026-06-09 (10차)

### vercel.json - cleanUrls 옵션 추가
- `"cleanUrls": true` 추가: `.html` 확장자 없이 URL 접근 가능 (예: `/login` → `login.html`)

---

## 2026-06-09 (9차)

### register.html - 전화번호 중복 복구 박스 재수정 (폼 독립 유지)

- 8차에서 변경한 "메인 버튼 교체" 방식을 되돌림
- 복구 박스 내부에 독립적인 이메일 입력칸 + "비밀번호 재설정 메일 보내기" 버튼 복원
- 문구: "비밀번호를 잊으셨나요? 가입 이메일로 재설정 링크를 보내드립니다."
- 회원가입 폼 submit 핸들러는 기존 동작 그대로 유지 (복구 모드 분기 제거)
- 박스 버튼 클릭 시 `resetPasswordForEmail()` 만 실행, 성공/실패 인라인 메시지 + 토스트 표시
- 폼 재제출 시 복구 박스 + 이메일 입력 초기화

---

## 2026-06-09 (8차)

### register.html - 전화번호 중복 복구 박스 UX 개선

- 복구 박스 문구 변경: "비밀번호를 잊으셨나요? 가입 이메일로 재설정 링크를 보내드립니다."
- 복구 박스 내부 별도 이메일 입력칸 + 버튼 제거 → 메인 폼의 Email 필드 + 메인 submit 버튼 재활용
- 전화번호 중복 감지 시 메인 버튼 텍스트 "회원가입" → "비밀번호 재설정 메일 보내기" 로 변경
- submit 핸들러 최상단에 복구 모드 분기 추가: 복구 박스가 보이면 회원가입 진행 없이 `resetPasswordForEmail()` 만 실행
- 성공 시 상단 성공 토스트 표시, 버튼 "전송 완료" 로 변경
- catch 블록을 케이스별로 분리하여 phone dup 시 버튼 텍스트 오버라이트 방지

---

## 2026-06-09 (7차)

### register.html - 전화번호 중복 시 토스트 + 비밀번호 재설정 안내

**토스트 알림**
- 전화번호 중복 감지 시 (RPC 선행 체크 / upsert 23505 오류 / catch 블록 공통) `alert` 대신 상단 고정 토스트로 "이미 가입된 전화번호입니다." 표시 (3.5초 후 자동 사라짐)

**비밀번호 재설정 복구 섹션**
- 토스트와 동시에 전화번호 필드 아래 인라인 섹션 표시
  - 안내 문구: "이미 가입된 전화번호입니다. 비밀번호를 잊으셨나요?"
  - 이메일 입력칸 + "비밀번호 재설정 메일 보내기" 버튼
- `resetPassword(email)` (`supabase.auth.resetPasswordForEmail`) 호출 후 성공/실패 인라인 메시지 표시
- 폼 재제출 시 복구 섹션 초기화 (입력값 + 결과 메시지 리셋)
- `resetPassword` import 추가

---

## 2026-06-09 (6차)

### 버그 수정: 회원가입 시 "Database error saving new user" 에러

**원인 1 — RLS 차단으로 전화번호 사전 체크 무용지물**
- `profiles`에 `FOR SELECT USING (auth.uid() = id)` RLS 정책이 있어, 비로그인 상태의 회원가입 중 전화번호 중복 쿼리가 항상 0행 반환
- 중복이어도 "없음"으로 통과되어 signUp 호출

**원인 2 — 트리거 unique_violation 예외 처리 누락**
- `profiles_phone_unique` 인덱스 추가 이후, 중복 phone으로 signUp 시 `handle_new_user()` 트리거가 unique_violation 예외 → auth.users INSERT 전체 롤백 → "Database error saving new user"

#### supabase-migration.sql
- `handle_new_user()` 트리거에 `EXCEPTION WHEN unique_violation` 핸들러 추가: phone 중복 시 phone 제외하고 프로필 행 생성
- `is_phone_taken(p_phone text)` SECURITY DEFINER 함수 추가: RLS 우회하여 전화번호 존재 여부만 boolean 반환

#### register.html
- 전화번호 중복 체크를 `.from('profiles').select()` (RLS에 막힘) → `supabase.rpc('is_phone_taken', ...)` 로 교체

---

## 2026-06-09 (5차)

### supabase-migration.sql - profiles.phone UNIQUE 제약조건 추가
- `profiles_phone_unique` partial unique index 추가 (`phone IS NOT NULL` 조건)
- Supabase SQL Editor에서 실행 필요

### register.html - 전화번호 중복 에러 핸들링 강화
- `profiles.upsert()` 반환 에러를 확인하도록 수정 (기존 코드는 에러 무시)
- DB 레벨 unique constraint 위반(`23505`) 시 "이미 가입된 전화번호입니다." 한국어 메시지 표시
- `catch` 블록에도 동일 조건 추가 (race condition 대비)

---

## 2026-06-09 (4차)

### checkout.html - 비로그인 로그인 모달 X버튼/뒤로가기 추가
- 로그인 모달 우상단에 X(닫기) 버튼 추가
- 모달 상단에 "이전 페이지로" 뒤로가기 버튼 추가
- X버튼/뒤로가기 클릭 시 `history.back()` 실행, 히스토리 없으면 `index.html`로 이동
- `.login-modal-box`에 `position: relative` 추가 및 관련 CSS 스타일 추가

### login.html - 비밀번호 찾기 존재하지 않는 이메일 처리
- 재설정 폼 제출 시 `profiles` 테이블에서 이메일 존재 여부 확인
- 미가입 이메일 입력 시 "가입된 계정 정보가 없습니다." 에러 메시지 표시
- `supabase` 클라이언트를 import에 추가
- 재제출 시 에러 텍스트 초기화 처리 추가

### register.html - 이용약관/개인정보처리방침 링크 수정
- 이용약관 링크: `#` → `https://getbitlogic.com/terms-of-service.html` (새 탭)
- 개인정보처리방침 링크: `privacy-policy.html` → `https://getbitlogic.com/privacy-policy.html` (새 탭)

---

## 2026-06-09 (3차)

### checkout.html - 비로그인 접근 시 로그인 모달
- 기존: 비로그인 접근 시 alert → `index.html` 리다이렉트
- 변경: 로그인 모달 오버레이 표시, 로그인 완료 후 checkout 페이지 그대로 유지
- 이메일/비밀번호 로그인, 카카오/Google OAuth 지원
- OAuth 소셜 로그인의 `redirectTo`를 현재 checkout URL(plan 파라미터 포함)로 설정해 로그인 후 checkout으로 복귀
- `supabase.auth.onAuthStateChange`로 로그인 완료를 감지해 프로필 자동입력 진행

### mypage.html - 구독 해지 버튼 추가
- 이용 플랜 섹션에 "구독 해지" 버튼 추가 (status === 'active' 일 때만 표시)
- 클릭 시 확인 다이얼로그 → `subscriptions` 테이블의 `status`를 `cancelled`, `cancelled_at`을 현재 시각으로 업데이트
- 해지 완료 후 버튼 숨김 및 플랜 뱃지 UI 즉시 반영

---

## 2026-06-09 (2차)

### CLAUDE.md 정리 (환경변수 & 스키마 실제 코드와 동기화)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 제거: 이 프로젝트는 빌드 과정 없는 순수 정적 사이트라 Vercel env를 프론트 JS에 주입 불가. anon key는 `supabase-auth.js`에 하드코딩이 올바른 방식(Supabase 설계상 공개 키)
- `SUPABASE_JWT_SECRET` 제거: 코드 전체 grep 결과 실제 사용처 없음
- `profiles` 테이블에 `email` 컬럼 추가: `supabase-migration.sql`에서 추가됐으나 CLAUDE.md에 누락되어 있었음

---

## 2026-06-09

### 초기 세팅
- project-context.md 최초 생성
- Supabase 스키마 정리 (profiles, subscriptions)
- 페이지 구조 파악 (index, checkout, mypage)

### 논의된 수정사항 (미적용 - VSC에서 작업 예정)

**회원가입**
- 이메일 중복 체크 추가
- 전화번호 중복 체크 추가
- 소셜 로그인 시 동일 이메일 안내

**비밀번호 찾기**
- 없는 이메일 입력 시 "가입된 계정 정보가 없습니다" 표시 (현재 버그)

**Checkout**
- TradingView ID 입력을 결제 후 success 페이지로 이동
- "VAT 포함" 문구 제거
- 로그인 유저 이름/전화번호 자동입력

**마이페이지**
- TradingView ID 1회 수정 기능 추가 예정
