# Project Changelog

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
