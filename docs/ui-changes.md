# UI 변경 사항 문서

> 2026-03-26 — Figma 리디자인 기준으로 전체 UI 수정 (로직 변경 없음)

---

## 1. 공통 변경 사항

### globals.css

- `:root` 변수를 Figma 디자인 토큰으로 전면 교체
  - 기존: 라이트 모드 (`#ffffff` 배경, `#171717` 텍스트)
  - 변경: 다크 모드 (`#0d1117` 배경, `#f1f5f9` 텍스트)
- 새 CSS 변수 추가:
  - `--bg-page: #0d1117`
  - `--bg-surface: #161b22`
  - `--bg-surface-hover: #1c2128`
  - `--border-color: #30363d`
  - `--text-primary: #f1f5f9`
  - `--text-secondary: #94a3b8`
  - `--text-muted: #64748b`
  - `--color-success: #3fb950`
- `.badge-*` 클래스: 라이트 → 다크 (opacity 계열)
- `.card` 클래스: `bg-white border-gray-200` → `bg-[#161b22] border-[#30363d]`
- `.section-label`: `text-gray-400` → `text-[#64748b]`
- `@media (prefers-color-scheme: dark)` 제거 (항상 다크 모드)

---

## 2. 공통 컴포넌트

### `src/components/Button/index.tsx`

| variant   | 기존                                     | 변경                                             |
| --------- | ---------------------------------------- | ------------------------------------------------ |
| primary   | `bg-[var(--color-primary)] text-white`   | 동일 (퍼플 유지)                                 |
| secondary | `bg-white text-gray-700 border-gray-200` | `bg-transparent text-[#f1f5f9] border-[#30363d]` |
| ghost     | `text-gray-400`                          | `text-[#64748b]`                                 |

### `src/components/Header/index.tsx`

- 배경: `border-b border-gray-200` → `bg-[#0d1117] border-[#30363d]`
- `sticky top-0 z-50` 추가 (스크롤 시 고정)
- 유저 아바타에 `ring-2 ring-[#30363d]` 추가
- 유저 이름 텍스트 제거 (아이콘만 표시)
- **Stepper 컴포넌트 추가** (헤더 아래 바로 붙어서 렌더)

### `src/components/Stepper/index.tsx` ★ 신규 컴포넌트

- 5단계 진행 표시기: 아이디어 입력 / 기획서 생성 / 스토리 목록 / 레포 선택 / 생성 완료
- `usePathname`으로 현재 경로 감지하여 활성 단계 결정
- 완료 단계: 텍스트 `#f1f5f9` (흰색)
- 활성 단계: 텍스트 `#f1f5f9` + `#6762a7` 퍼플 하단 라인
- 미래 단계: 텍스트 `#64748b` (흐린 색)

---

## 3. 페이지별 변경

### `/` 로그인 화면 (`src/app/page.tsx`)

- 배경 전체 다크
- 로고 영역에 `💡` 이모지 아이콘 박스 추가
- 타이틀 `text-[#f1f5f9]`, 설명 `text-[#94a3b8]`
- 레이아웃: 기존과 동일 (중앙 정렬)

### Step 1 아이디어 입력 (`src/features/planning/IdeaForm/index.tsx`)

#### idle 상태

- 중앙 정렬 레이아웃 (기존과 동일)
- 아이콘 박스 + 큰 타이틀 + 설명 추가
- 입력 카드: `bg-[#161b22]`, `border-[#30363d]`, `rounded-2xl`
- textarea: `bg-[#0d1117]` 다크 배경, `focus:border-[#6762a7]` 포커스 효과
- "확인 →" 버튼으로 텍스트 변경
- 하단에 힌트 3개 카드 (구체적인 목표 / 핵심 기능 / 디자인 모드)

#### loading 상태 (Step 2_1)

- 기존: 폼이 disabled로 표시
- 변경: 전체 화면이 로딩 카드로 교체
  - `border-t-[#6762a7] animate-spin` 스피너
  - 진행 단계 로그 (완료 = 초록, 진행 중 = 퍼플 pulse)

#### question 상태 (Step 2_2)

- 기존: 폼 아래 인라인으로 표시
- 변경: 독립 전체 화면으로 교체
  - 상단 유저 아바타
  - 큰 제목 + 부제목
  - 카드 안에 Q&A 구성
  - 옵션 버튼: `border border-[#30363d]` → 선택시 `border-[#6762a7] bg-[#6762a7]/20`
  - 제출 버튼: full-width 퍼플

---

### Step 2_3 기획서 생성 완료 (`src/app/planning/page.tsx`)

**기존 구조**: 단일 스크롤 페이지에 모든 섹션 나열
**새 구조**: 사이드바(260px) + 문서 뷰어 레이아웃

#### 왼쪽 사이드바

- 탭 3개: 기획서(Proposal) / 유저 시나리오 / 기술적 도전 포인트
- 활성 탭: `bg-[#6762a7] text-white` (Step 2_3 Figma와 동일 패턴)
- 비활성 탭: `text-[#94a3b8] hover:bg-[#161b22]`

#### 오른쪽 문서 영역

- `bg-[#161b22]`, `border-[#30363d]`, `rounded-xl`
- 상단 파일명 표시 (proposal.md / user-scenarios.md / tech-challenges.md)
- 각 섹션을 `DocSection` 헬퍼 컴포넌트로 통일
- 내용: 아이콘 + 섹션 제목 헤더 + 본문

#### 하단 고정 푸터 (새로 추가)

- `fixed bottom-0 left-0 right-0 bg-[#0d1117] border-t border-[#30363d]`
- 좌: "↺ 다시 생성" (secondary 버튼)
- 우: "수정 완료 →" (primary 버튼)

#### 이슈 생성 중 로딩 (Step 3_1)

- 기존: 버튼 텍스트만 "이슈 생성 중..."으로 변경
- 변경: 전체 화면을 로딩 카드로 교체 (Step 2_1과 동일한 스타일)

---

### Step 3_2 백로그 생성 완료 (`src/app/issues/page.tsx`)

**기존 구조**: 전체 에픽 목록을 펼쳐서 표시
**새 구조**: 에픽 사이드바(260px) + 선택된 에픽의 스토리/태스크

#### 왼쪽 에픽 사이드바

- UI 전용 `selectedEpicIndex` 상태 추가
- 활성 에픽: `bg-[#6762a7] text-white`
- 비활성 에픽: `text-[#94a3b8] hover:bg-[#161b22]`
- 에픽 수정 버튼: hover 시 표시, 클릭 시 인라인 편집 (기존 로직 유지)

#### 오른쪽 스토리/태스크 영역

- 에픽 헤더 + story count 배지
- `IssueCard` 컴포넌트로 스토리 카드 표시
- 하단 고정 푸터: "↺ 다시 생성" + "수정 완료 →"

---

### IssueCard (`src/features/issues/IssueCard/index.tsx`)

- 카드 배경: `bg-white border-gray-200` → `bg-[#161b22] border-[#30363d]`
- 텍스트: `text-black` / `text-gray-700` → `text-[#f1f5f9]` / `text-[#94a3b8]`
- body 확장 영역: `bg-gray-50` → `bg-[#0d1117]/50`
- 수정 버튼: ghost 스타일 → `text-[#64748b]` 인라인 버튼으로 변경
- 확장/축소 화살표: `text-[#64748b]`
- task 항목 (indent > 0): 도트 인디케이터로 표시 (초록/퍼플/회색)
- 편집 input/textarea: 다크 배경으로 통일

---

### Step 4_1 레포 선택 (`src/app/repo-select/page.tsx`)

**기존 구조**: 180px 사이드바 + 레포 목록(리스트)
**새 구조**: 200px 사이드바 + 레포 카드(2열 그리드)

#### 왼쪽 사이드바

- 활성 owner: `bg-[#6762a7]` (기존 `bg-gray-900`)
- 비활성 owner: `text-[#94a3b8] hover:bg-[#161b22]`

#### 오른쪽 레포 영역

- 리스트 → **2열 그리드** (`grid grid-cols-2 gap-3`)
- 각 레포 카드: `bg-[#161b22] border-[#30363d] rounded-xl`
- 선택 시: `border-[#6762a7] bg-[#6762a7]/10`
- PUBLIC/PRIVATE 배지 추가 (PUBLIC = 초록, PRIVATE = 회색)
- 하단 고정 푸터: "이전 단계" + "이슈 및 프로젝트 만들기 →"

---

### Step 5 생성 완료 (`src/app/result/page.tsx`)

**기존 구조**: 스크롤 페이지에 이슈 목록 전체 표시
**새 구조**: 중앙 완료 카드

#### 성공 상태

- 중앙 정렬 완료 카드 (`max-w-[480px]`)
- 초록 체크마크 아이콘 (SVG, `#3fb950`)
- 레포 정보 행 (repo name + 이슈 수 + 초록 dot)
- "GitHub에서 확인하기" + "+ 새 프로젝트 시작" 버튼
- "새 아이디어 입력하기" 텍스트 링크

#### 로딩 상태

- 기존: 스피너 + 텍스트
- 변경: Step 2_1/3_1과 동일한 로딩 카드 패턴

#### 에러 상태

- `red-900/30` 배경의 에러 카드로 표시

---

## 4. 색상 대응표

| 기존 (라이트)                  | 새로운 (다크)        | 용도             |
| ------------------------------ | -------------------- | ---------------- |
| `bg-white`                     | `bg-[#161b22]`       | 카드/패널 배경   |
| `bg-gray-50`                   | `bg-[#0d1117]`       | 서브 배경        |
| `border-gray-200`              | `border-[#30363d]`   | 테두리           |
| `text-gray-900` / `text-black` | `text-[#f1f5f9]`     | 주요 텍스트      |
| `text-gray-700`                | `text-[#e2e8f0]`     | 본문 텍스트      |
| `text-gray-500`                | `text-[#94a3b8]`     | 보조 텍스트      |
| `text-gray-400`                | `text-[#64748b]`     | 흐린 텍스트      |
| `bg-gray-900` (선택 항목)      | `bg-[#6762a7]`       | 활성 선택 배경   |
| `border-gray-900`              | `border-[#6762a7]`   | 활성 선택 테두리 |
| `border-t-gray-900` (스피너)   | `border-t-[#6762a7]` | 스피너 액센트    |

---

## 5. 변경하지 않은 것들

- 모든 API 호출 (`fetch`, `router.push`, sessionStorage/localStorage 처리)
- Zod 스키마 파싱 및 에러 핸들링 로직
- `useEffect`, `startTransition`, `useRouter` 사용 패턴
- 에픽/스토리 수정 저장 로직 (`saveIssuesToStorage`)
- NextAuth 인증 로직
- `next.config.ts`, `tsconfig.json`, `package.json`

---

_최종 업데이트: 2026-03-26_
