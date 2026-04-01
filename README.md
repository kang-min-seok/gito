# Gito

아이디어를 입력하면 AI가 기획서를 만들고, GitHub 이슈와 프로젝트까지 자동으로 세팅해주는 웹앱

<br>

## 💡 만든 계기

AI 덕분에 사이드 프로젝트 개발이 훨씬 쉬워졌지만, 기획은 여전히 번거롭다.

초기에 태스크를 잘 잡아두지 않으면 개발 흐름을 잃기 쉽고, 그렇다고 기획을 제대로 하자니 피로도가 높아져 개발보다 기획이 더 오래 걸리는 상황이 생긴다.

**Gito**는 아이디어 텍스트 하나로 기획서 작성부터 GitHub 이슈 등록까지 한 번에 처리해, 기획의 피로도를 낮추고 바로 개발에 집중할 수 있게 도와준다.

<br>

## ✨ 주요 기능

- **AI 기획서 생성** — 아이디어를 입력하면 Gemini가 서비스 개요, 문제 정의, 핵심 기능, 타겟 유저, 유저 시나리오, 기술적 도전 과제를 담은 기획서를 자동 생성
- **추가 질문으로 할루시네이션 방지** — 아이디어가 불분명할 경우 AI가 스스로 기획하지 않고 사용자에게 핵심 질문을 먼저 물어본 뒤 기획을 진행
- **GitHub 이슈 자동 생성** — 기획서를 바탕으로 Epic / Story / Task 계층 구조로 이슈를 생성하고 GitHub 레포지토리에 자동 등록
- **GitHub Project 자동 세팅** — Issue Type, Epic 필드가 포함된 GitHub Project를 자동으로 생성하고 이슈를 연결

<br>

## 🛣️ 사용 흐름

```
GitHub 로그인
   ↓
아이디어 입력
   ↓
(필요시) AI 추가 질문 답변
   ↓
기획서 확인
   ↓
이슈 목록 확인 및 편집
   ↓
레포지토리 선택 후 GitHub에 이슈/프로젝트 등록
   ↓
완료
```

<br>

## 🛠️ 기술 스택

- **Framework** — Next.js 15 (App Router)
- **AI** — Google Gemini (`@ai-sdk/google`)
- **Auth** — NextAuth.js (GitHub OAuth)
- **GitHub API** — `@octokit/rest` (Issues REST API), GitHub GraphQL API (Projects v2)
- **Validation** — Zod
- **Deploy** — Vercel

<br>

## 🚀 로컬 실행

### 사전 준비

- GitHub OAuth App 생성 ([설정 방법](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app))
- Google Gemini API 키 발급 ([Google AI Studio](https://aistudio.google.com/))

### 환경 변수 설정

`.env.local` 파일을 생성하고 아래 값을 입력한다.

```env
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
```

### 실행

```bash
pnpm install
pnpm dev
```

[http://localhost:3000](http://localhost:3000)에서 확인

<br>

## 🎯 타겟 유저

- 팀 프로젝트를 해야 하는 컴공과 대학생
- 가벼운 사이드 프로젝트를 진행하고 싶은 개발자
- 백로그의 중요성은 알지만 세팅하기 귀찮은 개발자
