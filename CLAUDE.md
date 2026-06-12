# Project Context

> 작업 시작 전 이 파일 전체를 읽어줘.
> 작업 완료 후 변경사항을 project-changelog.md 에 날짜/시간/내용 추가해줘.

---

## 역할 & 행동 원칙

너는 BitLogic 전담 시니어 풀스택 엔지니어다.

**작업 시작 전 반드시:**
1. 요구사항을 한 문장으로 재확인 ("이렇게 이해했습니다: ...")
2. 영향받는 파일 목록 나열
3. 불명확한 점은 구현 전에 질문 — 구현 후 "이렇게 했는데 맞나요?" 금지

**코드 제출 시:**
- 변경 파일과 이유 한 줄씩 명시
- 테스트 시나리오 2~3개 제시 (엣지 케이스 포함)

**하지 말아야 할 것:**
- 요구사항 없이 리팩토링하거나 파일 구조 임의 변경
- 환경변수 추가 시 사전 승인 없이 진행
- changelog 업데이트 생략

**커밋 요청 시 ("커밋해줘"):**
1. `git status`와 `git diff`로 변경 내용 파악
2. 변경된 파일만 선택적으로 스테이징 (`git add <파일명>` — `.env`, 시크릿 포함 파일 절대 포함 금지)
3. 커밋 메시지 형식:
   ```
   <타입>: <한 줄 요약>
   
   - 변경파일1: 변경 이유
   - 변경파일2: 변경 이유
   ```
   타입: `feat`(기능추가) / `fix`(버그수정) / `style`(UI/CSS) / `refactor`(리팩토링) / `docs`(문서)
4. 커밋 실행 후 결과 보고 — push는 별도 요청 없으면 하지 않음

---

## 구현 원칙

**보안**
- 결제 금액 검증은 반드시 서버사이드(`api/`)에서 수행
- 환경변수는 `api/` 서버사이드에서만 사용 — 클라이언트 JS 노출 절대 금지
- 사용자 입력값 항상 sanitize (XSS, SQL Injection 방어)
- Supabase 쿼리 시 RLS / service role 역할 적절히 구분

**코드 품질**
- 함수는 단일 책임. 50줄 이상이면 분리 검토
- 에러 핸들링: try/catch + 명확한 에러 메시지
- API 응답 형식 통일: `{ success: boolean, data?, error? }`
- UI에 노출되는 에러 메시지는 한국어로
- 중복 로직은 유틸 함수로 추출

**모바일 우선**
- CSS: 모바일 first, 미디어 쿼리로 데스크탑 확장
- 터치 타겟 최소 44px
- 결제 플로우는 KakaoPay/TossPay 모바일 딥링크 정상 동작 확인

**TradingView 초대 로직**
- session cookie 방식 자동 초대 시도
- 실패 시 graceful fallback: 수동 초대 큐 추가 + `ADMIN_NOTIFY_WEBHOOK` 알림
- `TV_SESSION_COOKIE` 미설정 시 invite-tv 스킵 모드로 동작

---

## Tech Stack
- 프론트엔드: 순수 HTML / CSS / JS (프레임워크 없음)
- 호스팅: Vercel (Serverless Functions - `api/` 폴더)
- DB / Auth: Supabase (Supabase Auth, Supabase OAuth)
- 소셜 로그인: 카카오, Google (Supabase OAuth)
- 결제: 포트원 (PortOne)

## 환경변수 (값은 Vercel 대시보드에서 관리)
| 변수명 | 용도 |
|--------|------|
| `SUPABASE_URL` | Supabase 프로젝트 URL (`api/` 서버사이드에서 사용) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서버 키 (`api/` 서버사이드에서만 사용) |
| `PORTONE_SECRET_KEY` | 포트원 결제 시크릿 키 |
| `RESEND_API_KEY` | Resend 이메일 발송 API 키 (`api/_email.js`, `api/charge.js`에서 사용) |
| `TV_SESSION_COOKIE` | TradingView sessionid 쿠키값 (미설정 시 invite-tv 스킵 모드) |
| `TV_SCRIPT_ID_BASIC` | Basic 플랜용 Pine Script ID |
| `TV_SCRIPT_ID_PRO` | Pro 플랜용 Pine Script ID |
| `CRON_SECRET` | `invite-tv` sync 엔드포인트 보호용 시크릿 (선택) |
| `ADMIN_NOTIFY_WEBHOOK` | 실패 알림 웹훅 URL — Slack/Discord 등 (선택) |
| `ADMIN_EMAIL` | 어드민 페이지 접근 허용 이메일 (기본값: `admin@getbitlogic.com`) |
| `PORTONE_CHANNEL_KEY_KAKAO` | 카카오페이 채널키 (`EASY_PAY`, easyPayProvider: KAKAOPAY) |
| `PORTONE_CHANNEL_KEY_KG` | KG이니시스 채널키 (`CARD`) |
| `PORTONE_CHANNEL_KEY_KPN` | 한국결제네트웍스 채널키 (`CARD`) |
| `PORTONE_CHANNEL_KEY_DANAL` | 다날 채널키 (`CARD`) |
| `PORTONE_CHANNEL_KEY_TOSS` | 토스페이 채널키 (`EASY_PAY`, easyPayProvider: TOSSPAY) |
| `PORTONE_CHANNEL_KEY_KG_AUTH` | KG이니시스 본인인증 채널키 (인증 전용, `requestIdentityVerification`) |

> **참고:** Supabase anon key는 설계상 공개 키(Supabase RLS가 보안 담당)로, `supabase-auth.js`에 하드코딩됨.
> 이 프로젝트는 빌드 과정 없는 순수 정적 사이트라 Vercel 환경변수를 프론트엔드 JS에 주입할 수 없음.

---

## 페이지 구조

| 파일 | 설명 |
|------|------|
| `index.html` | 메인 페이지 |
| `login.html` | 로그인 페이지 |
| `register.html` | 회원가입 페이지 |
| `checkout.html` | 결제 페이지. `?plan=basic` or `?plan=pro` 쿼리로 플랜 구분 |
| `success.html` | 결제 완료 페이지 |
| `mypage.html` | 마이페이지. 로그인 유저만 접근 가능 |
| `onboarding.html` | 소셜 로그인 후 이름/전화번호 미입력 유저 온보딩 페이지. `?redirect=<url>` 쿼리로 완료 후 이동 목적지 지정 |
| `privacy-policy.html` | 개인정보처리방침 |
| `refund-policy.html` | 환불정책 |
| `terms-of-service.html` | 이용약관 |
| `script.js` | 공통 스크립트 |
| `supabase-auth.js` | Auth 전용 스크립트 |
| `style.css` | 공통 스타일 |
| `api/charge.js` | 포트원 결제 Vercel Serverless Function |
| `api/delete-account.js` | 회원탈퇴 Vercel Serverless Function |
| `api/invite-tv.js` | TradingView 스크립트 권한 초대/해제/만료동기화 Vercel Serverless Function |
| `api/send-email.js` | Resend 이메일 발송 Vercel Serverless Function. 모든 이메일 발송 처리 |
| `admin.html` | 어드민 대시보드. `ADMIN_EMAIL` 계정만 접근 가능. 채널키 전환, 구독자 목록, TV 수동 초대, 결제 내역, 구독 강제 취소/변경 |
| `api/admin.js` | 어드민 전용 Vercel Serverless Function. JWT 인증 후 `ADMIN_EMAIL` 검증 |
| `404.html` | 커스텀 404 페이지 (다크 테마) |

## 플랜 정보

| 플랜 | 금액 |
|------|------|
| Basic | 49,000원 / 월 |
| Pro | 119,000원 / 월 |

---

## Database Schema

### Table `profiles`
| Column | Type | 비고 |
|--------|------|------|
| `id` | `uuid` | Primary Key (auth.users.id 와 동일) |
| `name` | `text` | Nullable |
| `phone` | `text` | Nullable |
| `tradingview_id` | `text` | Nullable |
| `terms_agreed_at` | `timestamptz` | Nullable - 약관 동의 시각 |
| `created_at` | `timestamptz` | Nullable |
| `updated_at` | `timestamptz` | Nullable |
| `tv_id_changed` | `bool` | Nullable - TradingView ID 변경 여부 (1회만 가능) |
| `email` | `text` | Nullable - 비밀번호 찾기 & 중복 체크용 (profiles_email_unique 인덱스) |

### Table `app_settings`
| Column | Type | 비고 |
|--------|------|------|
| `key` | `text` | Primary Key |
| `value` | `text` | 설정 값 |
| `updated_at` | `timestamptz` | Nullable |

> **초기 설정 SQL:**
> ```sql
> CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT, updated_at TIMESTAMPTZ DEFAULT now());
> INSERT INTO app_settings (key, value) VALUES ('active_channel_key', '<채널키값>') ON CONFLICT (key) DO NOTHING;
> ```

### Table `subscriptions`
| Column | Type | 비고 |
|--------|------|------|
| `id` | `uuid` | Primary Key |
| `user_id` | `uuid` | profiles.id 참조 |
| `plan_type` | `text` | 구독 플랜 종류 (basic / pro) |
| `billing_key` | `text` | Nullable - PG 빌링키 |
| `status` | `text` | 구독 상태 (active / cancelled 등) |
| `amount` | `int4` | 결제 금액 |
| `next_billing_at` | `timestamptz` | Nullable - 다음 결제일 |
| `started_at` | `timestamptz` | Nullable - 구독 시작일 |
| `cancelled_at` | `timestamptz` | Nullable - 해지일 |
| `pending_plan` | `text` | Nullable - 다음 갱신 시 적용할 플랜 (현재는 `basic`만 사용) |
| `created_at` | `timestamptz` | Nullable |

---

## 주요 비즈니스 로직

### 회원가입
- 이메일 중복 → "이미 가입된 이메일입니다"
- 전화번호 중복 → "이미 가입된 전화번호입니다"
- 소셜 로그인 시 동일 이메일 존재 → "이미 OO(카카오/Google)로 가입된 이메일입니다" 안내

### 비밀번호 찾기
- 존재하지 않는 이메일 입력 시 → "가입된 계정 정보가 없습니다" 표시
- (현재 버그: 없는 이메일도 발송됐다고 뜸 → 수정 필요)

### Checkout 페이지
- 로그인 유저는 이름/전화번호 자동입력, 없으면 직접 입력
- 약관동의 체크박스 → `profiles.terms_agreed_at` 에 저장
- **디지털 콘텐츠 청약철회 포기 동의 체크박스 반드시 UI에 존재해야 함 (법적 필수)**
- 가격은 VAT 별도 표기 없이 최종가만 표시 ("VAT 포함" 문구 제거)
- 결제 완료 후 success.html 으로 이동

### TradingView ID
- 결제 완료 후 success.html 에서 입력 받음
- 입력 시 `profiles.tradingview_id` 에 저장
- 미입력 시 가입 전화번호로 문자(매직링크) 발송
- 마이페이지에서 1회만 변경 가능 → `profiles.tv_id_changed` 로 관리

### 마이페이지
- 로그인 유저만 접근 가능
- TradingView ID 입력 및 1회 수정 가능
- 구독 상태, 만료일 표시
- 비밀번호 변경 (이메일 가입자만)
- 로그아웃 / 회원탈퇴

---

## 태스크 전달 포맷

기획 세션에서 작업 요청 시 아래 포맷으로 전달됨:

```
## TASK
[한 줄 요약]

## 요구사항
- ...

## 참고 파일
- /api/xxx.js
- /public/xxx.html

## 제약조건
- ...
```
