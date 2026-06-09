# Project Changelog

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
