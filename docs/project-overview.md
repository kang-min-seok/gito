# Gito — 프로젝트 개요

> Claude가 작업 전 반드시 읽는 레퍼런스 문서.
> 코드 변경 시 관련 섹션을 즉시 업데이트한다.

---

## 1. 서비스 개요

**Gito**는 사용자의 아이디어를 입력받아 AI가 기획서를 자동 생성하고, 에픽/스토리/태스크 백로그를 만든 뒤 GitHub 이슈와 프로젝트를 자동으로 세팅해주는 Next.js 풀스택 서비스다.

### 기술 스택

| 항목            | 내용                                     |
| --------------- | ---------------------------------------- |
| Framework       | Next.js 16 (App Router)                  |
| Language        | TypeScript 5                             |
| Styling         | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| Auth            | NextAuth.js v4 (GitHub OAuth)            |
| AI              | Vercel AI SDK + Google Gemini 2.5 Flash  |
| GitHub API      | Octokit REST                             |
| Validation      | Zod 4                                    |
| Package Manager | pnpm                                     |

---

## 2. 디렉토리 구조

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 루트 레이아웃 (Header + children)
│   ├── globals.css               # 전역 스타일 (Tailwind + CSS 변수)
│   ├── page.tsx                  # / → 로그인 또는 Step 1 (IdeaForm)
│   ├── planning/page.tsx         # /planning → Step 2 (기획서 확인)
│   ├── issues/page.tsx           # /issues → Step 3 (백로그 편집)
│   ├── repo-select/page.tsx      # /repo-select → Step 4 (레포 선택)
│   ├── result/page.tsx           # /result → Step 5 (완료)
│   └── api/
│       ├── auth/[...nextauth]/   # NextAuth 핸들러
│       ├── generate/
│       │   ├── planning/route.ts # POST: AI 기획서 생성
│       │   └── issues/route.ts   # POST: AI 이슈 생성
│       └── github/
│           ├── repos/route.ts    # GET: GitHub 레포 목록
│           ├── orgs/route.ts     # GET: GitHub 조직 목록
│           ├── create-issues/route.ts   # POST: GitHub 이슈 생성
│           ├── setup-project/route.ts   # POST: GitHub 프로젝트 세팅
│           └── app-settings-url/route.ts # GET: 권한 설정 URL
├── components/                   # 재사용 UI 컴포넌트
│   ├── Button/index.tsx          # 다형성 버튼 (button | a)
│   ├── Header/
│   │   ├── index.tsx             # 헤더 (Server Component)
│   │   └── LogoutButton.tsx      # 로그아웃 버튼 (Client Component)
│   ├── LoginButton/index.tsx     # GitHub 로그인 버튼 (Client Component)
│   └── Stepper/index.tsx         # 5단계 진행 스테퍼 (Client Component)
├── features/
│   ├── planning/
│   │   ├── IdeaForm/index.tsx    # 아이디어 입력 + AI 질문 UI (Client Component)
│   │   ├── GeneratingCard.tsx    # 이슈 생성 중 로딩 UI (Client Component)
│   │   ├── PlanningViewer/       # 기획서 뷰어 (Raw/Preview 토글 포함)
│   │   │   ├── index.tsx         # markdownContents 수신, 탭 사이드바 + 문서 영역 조립
│   │   │   ├── TabSidebar.tsx    # 왼쪽 탭 사이드바
│   │   │   └── DocArea.tsx       # Raw textarea | Preview(react-markdown) 토글
│   │   ├── constants.ts          # SidebarTab 타입, SIDEBAR_TABS, TAB_FILENAME
│   │   ├── hooks/
│   │   │   └── usePlanningPage.ts  # markdown 상태 관리, 역파싱 + 이슈 생성 API
│   │   ├── utils/
│   │   │   └── planningMarkdown.ts # PlanningResult ↔ markdown 양방향 변환
│   │   ├── prompt.ts             # AI 기획서 생성 프롬프트 빌더
│   │   └── schemas.ts            # Zod 스키마 (planning 응답)
│   └── issues/
│       ├── IssueCard/index.tsx   # 이슈 카드 (재귀 구조, Client Component)
│       ├── prompt.ts             # AI 이슈 생성 프롬프트 빌더
│       ├── schemas.ts            # Zod 스키마 (issues 응답)
│       └── utils/
│           └── updateIssuesStorage.ts  # sessionStorage 저장 헬퍼
├── constants/
│   ├── auth.ts                   # GITHUB_OAUTH_SCOPE
│   ├── github.ts                 # GITHUB_CACHE_KEY, GITHUB_API, ISSUE_LABEL
│   └── planning.ts               # 스토리지 키, MAX_QUESTION_ROUNDS, 딜레이 상수
├── types/
│   ├── planning.ts               # PlanningResult, QuestionItem, AnswerItem 등
│   ├── github.ts                 # GitHubRepoItem, GeneratedIssue, EpicGroup 등
│   └── next-auth.d.ts            # NextAuth 타입 확장 (accessToken)
├── hooks/                        # (현재 비어있음 — 도메인 훅 추가 시 사용)
├── utils/                        # (현재 비어있음 — 공통 유틸 추가 시 사용)
└── lib/
    ├── ai.ts                     # Google Gemini 모델 초기화
    └── github.ts                 # Octokit 인스턴스 팩토리
```

---

## 3. 라우팅 & 페이지 흐름

5단계 위저드 플로우로 동작한다.

| URL                 | Step        | 상태              | 설명                               |
| ------------------- | ----------- | ----------------- | ---------------------------------- |
| `/` (비로그인)      | -           | 로그인 화면       | GitHub 로그인 버튼만 표시          |
| `/` (idle)          | Step 1      | 아이디어 입력     | IdeaForm 렌더                      |
| `/` (loading)       | Step 2-1    | AI 기획서 생성 중 | 스피너 카드                        |
| `/` (question)      | Step 2-2    | AI 추가 질문      | 질문 + 옵션 카드 (최대 3라운드)    |
| `/planning`         | Step 2-3    | 기획서 완료       | 사이드바 탭 + 문서 뷰어            |
| `/issues`           | Step 3      | 백로그 편집       | 에픽 사이드바 + 스토리/태스크 카드 |
| `/repo-select`      | Step 4      | 레포 선택         | 계정/조직 사이드바 + 레포 그리드   |
| `/result` (loading) | Step 5-로딩 | 이슈 생성 중      | 단계별 로그 카드                   |
| `/result`           | Step 5      | 완료              | 성공/실패 결과 카드                |

**Stepper 활성 단계 (경로 → 스텝 번호):**

- `/` → 1, `/planning` → 2, `/issues` → 3, `/repo-select` → 4, `/result` → 5

---

## 4. 상태 관리

이 프로젝트는 별도 전역 상태 라이브러리 없이 세 가지 방식으로 상태를 관리한다.

### 4-1. 페이지 간 데이터 (SessionStorage)

| 스토리지 키            | 상수명                 | 내용                                                         |
| ---------------------- | ---------------------- | ------------------------------------------------------------ |
| `gito_planning_result` | `PLANNING_STORAGE_KEY` | PlanningResult (기획서)                                      |
| `gito_issues_result`   | `ISSUES_STORAGE_KEY`   | IssuesResult — `MonorepoIssuesResult` \| `SplitIssuesResult` |
| `gito_selected_repo`   | `SELECTED_REPO_KEY`    | 모노레포: `GitHubRepoItem` / split: `{ frontend, backend }`  |

> ⚠️ sessionStorage는 SSR에서 접근 불가. 반드시 `useEffect` 내부에서 사용.

### 4-2. API 캐시 (LocalStorage)

| 캐시 키            | 상수명                   | 내용                |
| ------------------ | ------------------------ | ------------------- |
| `gito_repos_cache` | `GITHUB_CACHE_KEY.REPOS` | 레포 목록 캐시      |
| `gito_owner_cache` | `GITHUB_CACHE_KEY.OWNER` | 계정/조직 정보 캐시 |

### 4-3. 컴포넌트 로컬 상태 (React Hooks)

- `useState`: 폼 상태, UI 상태(확장/편집 등)
- `useEffect`: 마운트 시 데이터 로딩
- `useCallback`: 레포 패칭 함수 메모이제이션
- `useRef`: Strict Mode 이중 실행 방지
- `startTransition`: React 19 비차단 상태 업데이트
- `useRouter` / `usePathname`: 라우팅 및 현재 경로 감지

### 4-4. 인증 상태 (NextAuth Session)

- `getServerSession()`: Server Component에서 세션 접근
- JWT callback: `access_token` 저장
- Session callback: `accessToken`을 클라이언트에 노출

---

## 5. 데이터 흐름

```
[Step 1 — IdeaForm]
  POST /api/generate/planning { idea, answers? }
    → type='question'  → question 상태 표시 (최대 3라운드)
    → type='planning'  → sessionStorage 저장 → /planning

[Step 2 — PlanningPage]
  sessionStorage 읽기 → 기획서 표시
  레포 구조 선택 (모노레포 | 프론트엔드·백엔드 분리)
  POST /api/generate/issues { planning, repoStructure }
    → 모노레포: IssuesResult { type:'monorepo', issues }
    → split:    IssuesResult { type:'split', frontend, backend }
    → sessionStorage 저장 → /issues

[Step 3 — IssuesPage]
  sessionStorage 읽기 → IssuesResult 파싱
  모노레포: 기존 에픽/스토리/태스크 UI
  split: 프론트엔드 | 백엔드 탭 전환 후 각각 편집
  인라인 편집 → sessionStorage 업데이트
  "이슈 등록" 클릭 → /repo-select

[Step 4 — RepoSelectPage]
  GET /api/github/repos + /api/github/orgs
  모노레포: 레포 1개 선택 → sessionStorage 저장
  split: 프론트엔드/백엔드 탭으로 레포 각각 선택 → { frontend, backend } 저장
  → /result

[Step 5 — ResultPage]
  모노레포:
    Phase 1: POST /api/github/setup-project
    Phase 2: POST /api/github/create-issues
  split (순차):
    Phase 1: 프론트엔드 setup-project
    Phase 2: 프론트엔드 create-issues
    Phase 3: 백엔드 setup-project
    Phase 4: 백엔드 create-issues
```

---

## 6. 컴포넌트 상세

### 6-1. common/ 재사용 컴포넌트

#### Button (`src/components/Button/index.tsx`)

- **다형성**: `href` 있으면 `<a>`, 없으면 `<button>` 렌더
- **Variants**: `primary` (퍼플), `secondary` (아웃라인), `ghost` (투명)
- **Sizes**: `md` (기본), `sm`

#### Header (`src/components/Header/index.tsx`)

- **Server Component**: `getServerSession()`으로 세션 확인
- 로그인 상태면 유저 아바타 + LogoutButton 표시
- Stepper 포함 (`usePathname` 필요 → Client Component import)

#### Stepper (`src/components/Stepper/index.tsx`)

- **Client Component**: `usePathname()`으로 현재 스텝 감지
- 5단계 표시: 아이디어 입력 → 기획서 생성 → 스토리 목록 → 레포 선택 → 생성 완료
- 활성 스텝에 하단 보더 강조

#### LoginButton (`src/components/LoginButton/index.tsx`)

- **Client Component**: `signIn('github')` 트리거
- GitHub SVG 아이콘 내장

#### LogoutButton (`src/components/Header/LogoutButton.tsx`)

- **Client Component**: `signOut({ callbackUrl: '/' })` 트리거

### 6-2. features/ 컴포넌트

#### IdeaForm (`src/features/planning/IdeaForm/index.tsx`)

- **상태 머신**: `idle` → `loading` → `question` | `planning`
- 최대 3라운드 AI 추가 질문 처리
- 힌트 카드 3종 (목표/기능/디자인), 에러 처리 (429 포함)

#### GeneratingCard (`src/features/planning/GeneratingCard.tsx`)

- 이슈 생성 중 표시되는 로딩 UI (스피너 + 단계 로그)
- PlanningPage에서 `isGenerating === true`일 때 렌더

#### PlanningViewer (`src/features/planning/PlanningViewer/index.tsx`)

- **Client Component**: `activeTab` 상태 관리 (proposal / scenarios / techChallenge)
- Props: `data: PlanningResult`, `onDataChange: (data: PlanningResult) => void`
- TabSidebar + DocArea 조립

#### TabSidebar (`src/features/planning/PlanningViewer/TabSidebar.tsx`)

- Props: `activeTab`, `onTabChange`
- 3개 탭 버튼 렌더 (활성 탭은 퍼플 배경)
- `SidebarTab` 타입과 `SIDEBAR_TABS` 상수 export

#### DocArea (`src/features/planning/PlanningViewer/DocArea.tsx`)

- **Raw/Preview 토글** 핵심 컴포넌트
- Props: `activeTab`, `markdownContent: string`, `onMarkdownChange`
- 내부 상태: `viewMode ('preview' | 'raw')`
- 탭 변경 시 `viewMode` → `preview` 초기화 (useEffect)
- **Raw 모드**: `<textarea>` — 편집 즉시 `onMarkdownChange` 호출 (onChange)
- **Preview 모드**: `react-markdown` + 커스텀 컴포넌트로 Notion 스타일 렌더
- 토글 전환 시 파싱 오류 없음 (Preview는 단순 렌더링)

#### IssueCard (`src/features/issues/IssueCard/index.tsx`)

- **재귀 컴포넌트**: `children` 있으면 하위 IssueCard 렌더 (들여쓰기)
- `type`: `'story'` | `'task'`
- 확장/축소 토글, 제목·본문 인라인 편집, Save/Cancel 버튼

---

## 7. 타입 시스템

### planning.ts

```typescript
PlanningResult; // type='planning' + proposal + scenarios + techChallenge
QuestionResult; // type='question' + questions (QuestionItem[])
GeneratePlanningResult; // PlanningResult | QuestionResult (discriminated union)
QuestionItem; // { question, options? }
AnswerItem; // { question, answer }
GeneratePlanningRequest; // { idea, answers? }
Proposal; // overview, problem, mainFeatures, targetUsers 등
Scenarios; // summaryFlow, detailedFlow
TechChallengeItem; // { title, description }
```

### github.ts

```typescript
IssueType; // 'story' | 'task'
RepoStructure; // 'monorepo' | 'split'
GitHubRepo; // { owner, name, fullName }
IssuePayload; // { title, body, labels, type }
GeneratedIssue; // IssuePayload + children? (재귀)
EpicGroup; // { epic, stories: GeneratedIssue[] }
GenerateIssuesResult; // { issues: EpicGroup[] } — AI 응답 원형
MonorepoIssuesResult; // { type: 'monorepo', issues: EpicGroup[] }
SplitIssuesResult; // { type: 'split', frontend: { issues }, backend: { issues } }
IssuesResult; // MonorepoIssuesResult | SplitIssuesResult — sessionStorage 저장 타입
GitHubRepoItem; // 레포 정보 (name, owner, isPrivate, updatedAt 등)
GitHubOwnerInfo; // { login, orgs }
CreatedIssue; // 생성된 이슈 (url, number 포함)
CreateIssuesResult; // { created, failed }
SetupProjectResult; // 프로젝트 설정 데이터
```

---

## 8. 디자인 시스템

### 8-1. CSS 변수 (src/app/globals.css)

| 변수                       | 값        | 용도           |
| -------------------------- | --------- | -------------- |
| `--bg-page`                | `#0d1117` | 페이지 배경    |
| `--bg-surface`             | `#161b22` | 카드/패널 배경 |
| `--bg-surface-hover`       | `#1c2128` | 호버 상태      |
| `--border-color`           | `#30363d` | 테두리         |
| `--text-primary`           | `#f1f5f9` | 주요 텍스트    |
| `--text-secondary`         | `#94a3b8` | 보조 텍스트    |
| `--text-muted`             | `#64748b` | 흐린 텍스트    |
| `--color-primary`          | `#6762a7` | 퍼플 강조색    |
| `--color-primary-hover`    | `#574f91` | 퍼플 호버      |
| `--color-primary-active`   | `#4f4680` | 퍼플 액티브    |
| `--color-primary-disabled` | `#3d3a5c` | 퍼플 비활성    |
| `--color-success`          | `#3fb950` | 성공/완료      |

### 8-2. 컴포넌트 클래스 (@layer components)

| 클래스            | 용도                                |
| ----------------- | ----------------------------------- |
| `.badge`          | 기본 뱃지 (11px, bold)              |
| `.badge-epic`     | 에픽 뱃지 (파란색)                  |
| `.badge-story`    | 스토리 뱃지 (초록색)                |
| `.badge-task`     | 태스크 뱃지 (노란색)                |
| `.badge-default`  | 기본 회색 뱃지                      |
| `.card`           | 어두운 배경 카드 (border + rounded) |
| `.section-label`  | 11px, bold, uppercase, tracking     |
| `.page-container` | 최대 800px 너비, 중앙 정렬, 패딩    |

### 8-3. Tailwind v4 사용 규칙

- `@tailwindcss/postcss` 사용 (postcss.config.mjs)
- `@theme inline` 블록으로 CSS 변수 → Tailwind 색상 연결
- 인라인 opacity 문법 사용 가능: `bg-[#6762a7]/15`
- CSS에서 반복 색상은 CSS 변수 사용, 인라인 hex는 지양

---

## 9. AI 통합

### 9-1. 기획서 생성 (`/api/generate/planning`)

- 모델: `gemini-2.5-flash`
- 입력: `{ idea: string, answers?: AnswerItem[] }`
- 출력: `PlanningResult` 또는 `QuestionResult` (Zod 검증)
- 로직: AI가 아이디어가 불명확하다 판단하면 `type='question'` 반환 → 최대 3라운드

### 9-2. 이슈 생성 (`/api/generate/issues`)

- 모델: `gemini-2.5-flash`
- 입력: `{ planning: PlanningResult, repoStructure: 'monorepo' | 'split' }`
- 출력: `IssuesResult` — `{ type:'monorepo', issues }` 또는 `{ type:'split', frontend, backend }` (Zod 검증)
- 구조: 에픽 → 스토리(issue) → 태스크(sub-issue) 계층
- split 모드: 프론트엔드(UI/화면/상태관리)와 백엔드(API/DB/인증) 이슈를 분리 생성

---

## 10. GitHub 통합

### 10-1. OAuth 스코프

```
read:user  user:email  repo  project  read:org
```

### 10-2. GitHub Project 세팅 순서 (`/result`)

1. **Phase 1 — `setup-project`**: 프로젝트 생성 + 커스텀 필드(Issue Type, Epic) 생성
2. **Phase 2 — `create-issues`**: 이슈 일괄 생성 → 프로젝트에 연결 → 커스텀 필드 값 설정

### 10-3. 이슈 레이블 (ISSUE_LABEL)

| 상수                | 값        |
| ------------------- | --------- |
| `ISSUE_LABEL.EPIC`  | `'epic'`  |
| `ISSUE_LABEL.STORY` | `'story'` |
| `ISSUE_LABEL.TASK`  | `'task'`  |

---

## 11. 아키텍처 패턴 & 주의사항

### Server vs Client 구분

- **Server Components**: Header (세션 접근), API Route 핸들러
- **Client Components**: Stepper (usePathname), IdeaForm, IssueCard, LoginButton, LogoutButton, 각 page.tsx

### 재귀 컴포넌트

IssueCard는 `children` prop이 있을 경우 자기 자신을 재귀 렌더한다.
에픽 > 스토리 > 태스크 3단계 계층을 이 구조로 표현한다.

### Strict Mode 대응

`useRef`로 이중 실행 방지 플래그를 관리한다 (레포 패칭 등).

### 로딩 상태 표현

- Spinner: `animate-spin` (Tailwind)
- 단계별 로그: ResultPage에서 phase별 진행 상황을 배열로 누적 표시

---

## 12. 파일 변경 이력

| 날짜       | 파일                                              | 변경 내용                                                                        |
| ---------- | ------------------------------------------------- | -------------------------------------------------------------------------------- |
| 2026-03-26 | `components/Stepper/index.tsx`                    | 신규 추가 — 5단계 진행 스테퍼                                                    |
| 2026-03-26 | `app/globals.css`                                 | 디자인 전체 수정 (Figma 기반)                                                    |
| 2026-04-01 | `docs/project-overview.md`                        | 최초 작성                                                                        |
| 2026-04-01 | `app/planning/page.tsx`                           | 리팩토링 — 훅 분리, 컴포넌트 분리로 간소화                                       |
| 2026-04-01 | `features/planning/constants.ts`                  | 신규 추가 — SidebarTab 타입, SIDEBAR_TABS, TAB_FILENAME                          |
| 2026-04-01 | `features/planning/hooks/usePlanningPage.ts`      | 신규 추가 — markdown 상태 관리 + 역파싱 + 이슈 생성                              |
| 2026-04-01 | `features/planning/utils/planningMarkdown.ts`     | 신규 추가 — PlanningResult ↔ markdown 변환 유틸                                  |
| 2026-04-01 | `features/planning/GeneratingCard.tsx`            | 신규 추가 — 이슈 생성 중 로딩 UI                                                 |
| 2026-04-01 | `features/planning/PlanningViewer/index.tsx`      | 신규 추가 — markdownContents 기반 뷰어 조립                                      |
| 2026-04-01 | `features/planning/PlanningViewer/TabSidebar.tsx` | 신규 추가 — 탭 사이드바                                                          |
| 2026-04-01 | `features/planning/PlanningViewer/DocArea.tsx`    | 신규 추가 — Raw textarea / Preview react-markdown 토글                           |
| 2026-04-01 | `docs/adr-001-raw-preview-editor.md`              | 신규 추가 + 수정 — react-markdown 채택 근거 ADR                                  |
| 2026-04-01 | `types/github.ts`                                 | RepoStructure, MonorepoIssuesResult, SplitIssuesResult, IssuesResult 추가        |
| 2026-04-01 | `constants/planning.ts`                           | REPO_STRUCTURE_KEY 추가                                                          |
| 2026-04-01 | `features/issues/schemas.ts`                      | SplitGenerateIssuesSchema 추가; GenerateIssuesRequestSchema에 repoStructure 추가 |
| 2026-04-01 | `features/issues/prompt.ts`                       | split 모드 시스템 프롬프트 분기 추가                                             |
| 2026-04-01 | `app/api/generate/issues/route.ts`                | repoStructure 분기 처리, IssuesResult 래핑 반환                                  |
| 2026-04-01 | `features/planning/hooks/usePlanningPage.ts`      | repoStructure 상태 추가, API 요청에 포함                                         |
| 2026-04-01 | `app/planning/page.tsx`                           | 레포 구조 선택 UI (모노레포 / 분리) 추가                                         |
| 2026-04-01 | `features/issues/utils/updateIssuesStorage.ts`    | IssuesResult 타입으로 업데이트                                                   |
| 2026-04-01 | `app/issues/page.tsx`                             | split 모드 프론트엔드/백엔드 탭 추가                                             |
| 2026-04-01 | `app/repo-select/page.tsx`                        | split 모드 레포 2개 선택 UI 추가                                                 |
| 2026-04-01 | `app/result/page.tsx`                             | split 모드 순차 이슈 생성 + 4단계 로딩/완료 UI 추가                              |

### Deprecated

| 날짜       | 파일                                                         | 사유                           |
| ---------- | ------------------------------------------------------------ | ------------------------------ |
| 2026-04-01 | `features/planning/PlanningViewer/DocSection.tsx`            | react-markdown 전환으로 불필요 |
| 2026-04-01 | `features/planning/PlanningViewer/tabs/ProposalTab.tsx`      | react-markdown 전환으로 불필요 |
| 2026-04-01 | `features/planning/PlanningViewer/tabs/ScenariosTab.tsx`     | react-markdown 전환으로 불필요 |
| 2026-04-01 | `features/planning/PlanningViewer/tabs/TechChallengeTab.tsx` | react-markdown 전환으로 불필요 |

---

---

## 13. 하네스 엔지니어링 시스템

Claude Code 훅 + 셸 스크립트 기반 자동 품질 검증 시스템. 파일 수정 즉시 규칙 위반을 탐지해 Claude에게 피드백한다.

```
.claude/settings.json          ← PostToolUse / PreToolUse / Stop 훅 등록
.claude/hooks/
  on-file-edit.sh              ← Write/Edit 후: magic, naming, component, docs 검사
  pre-bash.sh                  ← Bash 전: 위험 명령어 차단
  on-stop.sh                   ← 작업 완료 전: gate.sh --fast 실행

scripts/harness/
  gate.sh                      ← 마스터 게이트 (모든 검사 실행)
  check-magic.sh               ← 인라인 스토리지 키·hex 색상·레이블 리터럴
  check-component.sh           ← page.tsx: useState 과다 + useXxxPage 훅 누락
  check-naming.sh              ← is/has/on 접두사, MOCK_ 접두사
  check-imports.sh             ← cross-feature 직접 임포트
  check-docs.sh                ← docs/project-overview.md 동기화 알림
  check-ts.sh                  ← pnpm tsc --noEmit
```

> 상세 설계: `docs/harness-engineering.md`

---

_최종 업데이트: 2026-04-13 (하네스 엔지니어링 시스템 추가)_
