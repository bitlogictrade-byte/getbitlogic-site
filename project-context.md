# Project Context

> 이 파일을 참고해서 작업해줘. DB는 Supabase 사용 중이고, Auth도 Supabase Auth야.

---

## Tech Stack
- DB / Auth: Supabase (Supabase Auth, Supabase OAuth)
- 소셜 로그인: Supabase OAuth

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

### Table `subscriptions`
| Column | Type | 비고 |
|--------|------|------|
| `id` | `uuid` | Primary Key |
| `user_id` | `uuid` | profiles.id 참조 |
| `plan_type` | `text` | 구독 플랜 종류 |
| `billing_key` | `text` | Nullable - PG 빌링키 |
| `status` | `text` | 구독 상태 (active/cancelled 등) |
| `amount` | `int4` | 결제 금액 |
| `next_billing_at` | `timestamptz` | Nullable - 다음 결제일 |
| `started_at` | `timestamptz` | Nullable - 구독 시작일 |
| `cancelled_at` | `timestamptz` | Nullable - 해지일 |
| `created_at` | `timestamptz` | Nullable |

---

## 주요 비즈니스 로직

### 회원가입
- 이메일 중복 → "이미 가입된 이메일입니다"
- 전화번호 중복 → "이미 가입된 전화번호입니다"
- 소셜 로그인 시 동일 이메일 존재 → "이미 OO(소셜)로 가입된 이메일입니다" 안내

### 비밀번호 찾기
- 존재하지 않는 이메일 입력 시 → "가입된 계정 정보가 없습니다" 표시

### Checkout 페이지
- 이메일 가입 유저는 이름/전화번호 자동입력, 없으면 입력칸
- 약관동의 체크박스 → `profiles.terms_agreed_at` 에 저장
- TradingView 사용자명 입력칸 → `profiles.tradingview_id` 에 저장
- 가격은 VAT 별도 표기 없이 최종가만 표시
- 결제 완료 후 success 페이지 이동

### TradingView ID
- 결제 완료 후 입력 받음
- 미입력 시 가입 전화번호로 문자(매직링크) 발송
- 마이페이지에서 1회만 변경 가능 → `profiles.tv_id_changed` 로 관리
