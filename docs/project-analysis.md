# Gito 프로젝트 구조 분석

> AI 참조용 문서 — 코드 수정 전 반드시 확인

---

## 1. 프로젝트 개요

**Gito**: 사용자의 아이디어를 입력받아 AI로 기획서를 자동 생성하고, 에픽/스토리/태스크 백로그를 만든 뒤 GitHub 이슈와 프로젝트를 자동으로 세팅해주는 Next.js 풀스택 서비스.

- **스택**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, NextAuth v4, AI SDK (Google Gemini), Octokit
- **패키지 매니저**: pnpm

---

## 2. 디렉터리 구조

```
src/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 루트 레이아웃 (Header + children)
│   ├── globals.css               # 전역 스타일 (Tailwind + CSS 변수)
│   ├── page.tsx                  # / → 로그인 or Step 1 (IdeaForm)
│   ├── planning/page.tsx         # /planning → Step 2_3 (기획서 생성 완료)
│   ├── issues/page.tsx           # /issues → Step 3_2 (백로그 생성 완료)
│   ├── repo-select/page.tsx      # /repo-select → Step 4_1 (레포 선택)
│   ├── result/page.tsx           # /result → Step 5 (최종 완료)
│   └── api/
│       ├── auth/[...nextauth]/   # NextAuth 핸들러
│       ├── generate/
│       │   ├── planning/         # POST: 기획서 생성 AI API
│       │   └── issues/           # POST: 이슈 생성 AI API
│       └── github/
│           ├── repos/            # GET: GitHub 레포 목록
│           ├── orgs/             # GET: GitHub 조직 목록
│           ├── create-issues/    # POST: GitHub 이슈 생성
│           ├── setup-project/    # POST: GitHub 프로젝트 세팅
│           └── app-settings-url/ # GET: GitHub App 권한 URL
├── components/                   # 재사용 UI 컴포넌트
│   ├── Button/index.tsx          # 버튼 (primary/secondary/ghost)
│   ├── Header/
│   │   ├── index.tsx             # 헤더 (Server Component)
│   │   └── LogoutButton.tsx      # 로그아웃 버튼 (Client Component)
│   ├── LoginButton/index.tsx     # GitHub 로그인 버튼
│   └── Stepper/index.tsx         # [NEW] 5단계 진행 Stepper (Client Component)
├── features/
│   ├── planning/
│   │   ├── IdeaForm/index.tsx    # Step 1 + 로딩(2_1) + 질문(2_2) UI
│   │   ├── prompt.ts             # AI 기획서 생성 프롬프트
│   │   └── schemas.ts            # Zod 스키마 (planning 응답)
│   └── issues/
│       ├── IssueCard/index.tsx   # 에픽/스토리/태스크 카드
│       ├── prompt.ts             # AI 이슈 생성 프롬프트
│       ├── schemas.ts            # Zod 스키마 (issues 응답)
│       └── utils/updateIssuesStorage.ts
├── constants/
│   ├── auth.ts                   # AUTH_STATUS
│   ├── github.ts                 # GITHUB_CACHE_KEY, GITHUB_API
│   └── planning.ts               # 스토리지 키, 딜레이 상수
├── types/
│   ├── planning.ts               # PlanningResult, QuestionItem, AnswerItem
│   ├── github.ts                 # GitHubRepoItem, GeneratedIssue, ...
│   └── next-auth.d.ts            # NextAuth 타입 확장
├── hooks/                        # (현재 비어있음)
├── utils/                        # (현재 비어있음)
└── lib/
    ├── ai.ts                     # AI SDK 초기화
    └── github.ts                 # Octokit 초기화
```

---

## 3. 페이지별 라우트 및 Figma Step 매핑

| URL                    | Figma Step    | 상태              | 설명                           |
| ---------------------- | ------------- | ----------------- | ------------------------------ |
| `/` (비로그인)         | -             | 로그인 화면       | GitHub 로그인 버튼만 표시      |
| `/` (로그인, idle)     | Step 1        | 아이디어 입력     | IdeaForm 렌더                  |
| `/` (로그인, loading)  | Step 2_1      | AI 기획서 생성 중 | 스피너 카드                    |
| `/` (로그인, question) | Step 2_2      | AI 질문           | 질문 + 옵션 카드               |
| `/planning`            | Step 2_3      | 기획서 생성 완료  | 사이드바 + 문서 뷰어           |
| `/issues` (loading)    | Step 3_1      | 백로그 생성 중    | (planning에서 전환 시)         |
| `/issues`              | Step 3_2      | 백로그 생성 완료  | 사이드바 + 에픽/스토리/태스크  |
| `/repo-select`         | Step 4_1      | 레포 선택         | 계정/조직 사이드바 + 레포 목록 |
| `/result` (loading)    | (Step 5 로딩) | 이슈 생성 중      | 스피너 카드                    |
| `/result`              | Step 5        | 최종 완료         | 완료 카드                      |

**Stepper 활성 단계:**

- `/` → Step 1
- `/planning` → Step 2
- `/issues` → Step 3
- `/repo-select` → Step 4
- `/result` → Step 5

---

## 4. 데이터 흐름

```
[Step 1 IdeaForm]
  └─ POST /api/generate/planning  { idea, answers? }
     → 응답이 type='question' → question 상태 표시
     → 응답이 type='planning' → sessionStorage('gito_planning') 저장 → /planning

[Step 2_3 PlanningPage]
  └─ sessionStorage('gito_planning') 읽어서 data 표시
     └─ POST /api/generate/issues  { planning }
        → sessionStorage('gito_issues') 저장 → /issues

[Step 3_2 IssuesPage]
  └─ sessionStorage('gito_issues') 읽어서 에픽/스토리/태스크 표시
     └─ 수정 시 sessionStorage 업데이트
     └─ "레포에 이슈 등록하기" → /repo-select

[Step 4_1 RepoSelectPage]
  └─ /api/github/repos, /api/github/orgs 불러오기
     └─ 레포 선택 후 sessionStorage('gito_selected_repo') 저장 → /result

[Step 5 ResultPage]
  └─ Phase 1: POST /api/github/setup-project (프로젝트+커스텀필드 생성)
  └─ Phase 2: POST /api/github/create-issues (이슈 일괄 생성)
```

---

## 5. 스토리지 키 (constants/planning.ts)

| 키                   | 내용                                      |
| -------------------- | ----------------------------------------- |
| `gito_planning`      | PlanningResult (기획서)                   |
| `gito_issues`        | GenerateIssuesResult (에픽/스토리/태스크) |
| `gito_selected_repo` | GitHubRepoItem (선택된 레포)              |

---

## 6. 주요 컴포넌트 구조

### Button

- variant: `primary` (purple) | `secondary` (outline) | `ghost` (투명)
- size: `md` | `sm`
- href 있으면 `<a>`, 없으면 `<button>`

### IssueCard (재귀 구조)

- issue.type: `'story'` | `'task'`
- 확장/축소 토글, 제목/본문 인라인 편집
- children 있으면 하위 IssueCard 렌더 (indent)

### Header (Server Component)

- 세션 확인 후 로그인 상태면 유저 이미지/이름/로그아웃 표시
- Stepper 컴포넌트 포함 (Client Component 임포트)

---

## 7. Figma 디자인 토큰

| 토큰                    | 값        | 용도           |
| ----------------------- | --------- | -------------- |
| `--bg-page`             | `#0d1117` | 페이지 배경    |
| `--bg-surface`          | `#161b22` | 카드/패널 배경 |
| `--bg-surface-hover`    | `#1c2128` | 호버 상태      |
| `--border-color`        | `#30363d` | 테두리         |
| `--color-primary`       | `#6762a7` | 퍼플 강조색    |
| `--color-primary-hover` | `#574f91` | 퍼플 호버      |
| `--text-primary`        | `#f1f5f9` | 주요 텍스트    |
| `--text-secondary`      | `#94a3b8` | 보조 텍스트    |
| `--text-muted`          | `#64748b` | 흐린 텍스트    |
| `--color-success`       | `#3fb950` | 성공/완료 색상 |

---

## 8. 주의사항

1. **로직 변경 금지**: API 호출, 상태 관리, 라우팅 로직은 절대 건드리지 말 것
2. **Tailwind v4**: `@tailwindcss/postcss` 사용. `@theme inline` 블록으로 CSS 변수 → Tailwind 연결
3. **Server vs Client**: Header는 Server Component, Stepper는 Client Component (`usePathname` 필요)
4. **Tailwind opacity**: `bg-[#6762a7]/15` 같은 인라인 opacity 문법 사용 가능
5. **sessionStorage**: SSR에서 접근 불가, 반드시 `useEffect` 내부에서 사용

---

_최종 업데이트: 2026-03-26_
