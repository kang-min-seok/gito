# 트러블슈팅 & 에러 분석

> AI 참조용 문서 — 발생했던 오류와 해결 방법 정리

---

## 🔴 발생 에러 목록

```
[next-auth][warn][NO_SECRET]
[next-auth][warn][NEXTAUTH_URL]
[next-auth][error][JWT_SESSION_ERROR] decryption operation failed
[next-auth][error][SIGNIN_OAUTH_ERROR] client_id is required
```

---

## 1. JWT_SESSION_ERROR: decryption operation failed

### 원인

`NEXTAUTH_SECRET` 환경변수가 `.env.local`에 설정되어 있지 않거나 비어 있음.

NextAuth는 JWT 세션 쿠키를 암호화·복호화할 때 `NEXTAUTH_SECRET`을 키로 사용한다.
이 값이 없으면 **서버가 실행될 때마다 임의의 랜덤 키**를 생성한다.

**타임라인:**

1. 이전 서버 실행 → 랜덤 키 A로 JWT 쿠키 생성 → 브라우저에 저장
2. UI 코드 수정 → Next.js 핫 리로드/재시작 → 랜덤 키 B 생성
3. 브라우저의 기존 쿠키(키 A로 암호화)를 키 B로 복호화 시도 → **JWEDecryptionFailed**

### 해결 방법

**Step 1: `.env.local`에 고정 시크릿 설정**

```bash
# 터미널에서 랜덤 시크릿 생성
openssl rand -base64 32
```

생성된 값을 `.env.local`에 추가:

```
NEXTAUTH_SECRET=<생성된_값>
```

**Step 2: 브라우저 쿠키 초기화**

- 크롬 기준: `F12` → Application → Cookies → `http://localhost:3000` → 우클릭 → Clear
- 또는 시크릿 모드(Ctrl+Shift+N)로 접속

> ⚠️ **핵심**: `NEXTAUTH_SECRET`을 고정값으로 설정하지 않으면, 서버가 재시작될 때마다 기존 세션이 모두 무효화된다.

---

## 2. SIGNIN_OAUTH_ERROR: client_id is required

### 원인

`AUTH_GITHUB_ID` (GitHub OAuth App의 Client ID) 환경변수가 `.env.local`에 없거나 비어 있음.

`auth.ts`에서:

```typescript
GitHubProvider({
  clientId: process.env.AUTH_GITHUB_ID!, // ← 이 값이 undefined
  clientSecret: process.env.AUTH_GITHUB_SECRET!,
});
```

### 해결 방법

1. [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)에서 OAuth App 생성 (이미 있으면 조회)
2. `.env.local`에 추가:

```
AUTH_GITHUB_ID=<GitHub_Client_ID>
AUTH_GITHUB_SECRET=<GitHub_Client_Secret>
```

---

## 3. NEXTAUTH_URL 경고

### 원인

`NEXTAUTH_URL` 미설정. NextAuth가 콜백 URL을 자동으로 추론하지 못할 수 있음.

### 해결 방법

`.env.local`에 추가:

```
NEXTAUTH_URL=http://localhost:3000
```

---

## 4. `.env.local` 전체 설정 예시

```env
# GitHub OAuth
AUTH_GITHUB_ID=<GitHub_OAuth_App_Client_ID>
AUTH_GITHUB_SECRET=<GitHub_OAuth_App_Client_Secret>

# NextAuth
NEXTAUTH_SECRET=<openssl rand -base64 32 으로 생성한 값>
NEXTAUTH_URL=http://localhost:3000

# Google Gemini AI
GOOGLE_GENERATIVE_AI_API_KEY=<Google_AI_Studio_API_Key>
```

> `.env.example` 파일에 키 목록이 정리되어 있으니 참고.

---

## 5. IssueCard 렌더링 버그 (코드 수정 사항)

### 원인

UI 리디자인 과정에서 `IssueCard`에 잘못된 children 렌더링 로직이 추가됨.

**버그 코드 (삭제됨):**

```tsx
{/* ❌ 잘못된 코드: 접힌 상태에서도 children이 카드 밖으로 렌더됨 */}
{!expanded && issue.children?.map((child, i) => (
  <IssueCard key={i} issue={child} indent={16} ... />
))}
```

**올바른 동작:**

- Children(태스크)은 스토리 카드를 클릭해 **펼쳤을 때만** 카드 내부에 표시
- 접혔을 때는 children이 전혀 보이지 않아야 함

**수정:** 해당 `!expanded && issue.children?.map(...)` 블록을 제거함.
Children은 `expanded && (...)` 블록 안에서만 렌더됨.

---

## 6. 왜 UI 수정이 JWT 에러를 유발했나?

직접 원인은 코드가 아님. 하지만 간접적 연결고리:

```
UI 파일 수정
→ Next.js 핫 리로드 발동
→ 개발 서버 재시작
→ NEXTAUTH_SECRET 미설정으로 인해 새 랜덤 키 생성
→ 기존 브라우저 쿠키가 새 키로 복호화 실패
→ JWT_SESSION_ERROR 발생
```

**근본 원인**: `NEXTAUTH_SECRET`이 `.env.local`에 고정값으로 설정되어 있지 않음.
**코드 자체에는 오류 없음**: 페이지 컴파일 및 렌더는 정상 (`GET / 200`).

---

## 7. 체크리스트

- [ ] `.env.local` 파일이 프로젝트 루트에 존재하는가?
- [ ] `AUTH_GITHUB_ID` 값이 채워져 있는가?
- [ ] `AUTH_GITHUB_SECRET` 값이 채워져 있는가?
- [ ] `NEXTAUTH_SECRET` 값이 고정된 랜덤 문자열인가?
- [ ] `NEXTAUTH_URL=http://localhost:3000`이 설정되어 있는가?
- [ ] 서버 재시작 후 브라우저 쿠키를 초기화했는가?

---

_최종 업데이트: 2026-03-26_
