# ADR-001: Planning 페이지 Raw/Preview 에디터 구현 방식

- **상태**: Accepted
- **날짜**: 2026-04-01
- **결정자**: kang-min-seok

---

## 컨텍스트

Planning 페이지(`/planning`)는 AI가 생성한 기획서를 표시한다. Figma 디자인에는 문서 헤더 오른쪽에 **Raw | Preview** 토글이 존재하며, 이를 구현해야 한다.

### 요구사항

| 모드        | 동작                                                 |
| ----------- | ---------------------------------------------------- |
| **Preview** | Notion처럼 마크다운을 렌더링 — 헤딩, 리스트, 볼드 등 |
| **Raw**     | 마크다운 원문을 편집 가능한 textarea로 표시          |

### 보존해야 할 Figma 디자인

- 문서 영역 박스 (어두운 배경 카드, `bg-[#161b22]`, 테두리, 라운드 코너)
- Raw / Preview 토글 버튼 그룹 (헤더 우측)

---

## 검토한 옵션

### Option A: 외부 라이브러리 없이 커스텀 렌더러

- **번들 추가**: 0 KB
- **장점**: 완전한 디자인 제어
- **단점**: 마크다운 파싱 구현 복잡 (헤딩/리스트/볼드/링크 등), 유지보수 비용 높음, 엣지 케이스 대응 어려움

### Option B: react-markdown ✅ 채택

- **번들 추가**: ~20 KB (gzipped)
- **장점**:
  - 견고한 마크다운 파싱 (remark 기반)
  - `components` prop으로 각 요소에 커스텀 Tailwind 클래스 주입 가능 → 디자인 완전 제어
  - XSS 안전 (dangerouslySetInnerHTML 사용 안 함)
  - Preview 토글이 단순 렌더링이므로 파싱 오류 없음
- **단점**: 의존성 1개 추가 (소규모)

### Option C: marked + dangerouslySetInnerHTML

- **장점**: 빠른 파싱
- **단점**: XSS 위험, 글로벌 CSS 작성 필요 (Tailwind 클래스 적용 어려움)

### Option D: Monaco / CodeMirror

- 번들 200KB~5MB — 단순 기획서 편집에 과도함, 즉시 탈락

---

## 결정: Option B (react-markdown)

**이유**:

1. Figma에서 보존할 것은 박스 디자인 + 토글 버튼뿐 — Preview 내부 스타일은 자유롭게 변경 가능
2. `components` prop으로 Tailwind 클래스를 정확히 제어하므로 디자인 요구사항 완벽 충족
3. Preview 전환이 단순 렌더링 → 파싱 오류 없음 → UX 개선
4. 20KB 추가는 서비스 성격 대비 합리적

---

## 데이터 흐름 설계

### Source of Truth: Markdown String (탭별)

- 기존: `PlanningResult` (구조체) → 각 탭을 커스텀 UI로 렌더
- 변경: `PlanningResult` → 초기화 시 탭별 markdown 문자열로 직렬화 → 이후 markdown이 source of truth

```
sessionStorage (PlanningResult)
  ↓ [최초 1회 직렬화]
markdownContents: Record<SidebarTab, string>
  ↓ [사용자 편집 (Raw 모드)]
markdownContents 업데이트
  ↓ ["수정 완료" 클릭 시 역파싱]
PlanningResult → /api/generate/issues
```

### 탭별 마크다운 포맷

**proposal.md**

```markdown
# 기획서 (Proposal)

## 개요 (Overview)

{overview}

## 문제 정의 (Problem Statement)

{problem}

## 왜 필요한가? (Why Needed)

기존: {existingWay}

지향: {targetWay}

## 완료 기준 (Completion Criteria)

{completionCriteria}

## 주요 기능 (Main Features)

### {feature.name}

{feature.description}

## 타겟 유저 (Target Users)

{summary}

- {trait}

## 유저 확보 계획 (User Acquisition Plan)

- {plan}
```

**user-scenarios.md**

```markdown
# 유저 시나리오 (User Scenarios)

## 요약 플로우 (Summary Flow)

### {step}

{description}

## 상세 플로우 (Detailed Flow)

### {step}: {action}

{detail}
```

**tech-challenges.md**

```markdown
# 기술적 도전 포인트 (Tech Challenges)

## {title}

{description}
```

### 탭 전환 동작

- 탭 전환 시 viewMode → `preview` 자동 리셋
- Raw 편집 내용은 탭 전환 전에 이미 `markdownContents` 상태에 반영되어 있음 (onChange로 즉시 업데이트)

---

## 컴포넌트 구조

```
src/features/planning/
├── constants.ts                    # SidebarTab 타입, SIDEBAR_TABS 상수
├── hooks/
│   └── usePlanningPage.ts          # markdown 상태 관리, 역파싱 + API 전송
├── utils/
│   └── planningMarkdown.ts         # PlanningResult ↔ markdown 변환
├── GeneratingCard.tsx
└── PlanningViewer/
    ├── index.tsx                   # markdownContents + onMarkdownChange 수신
    ├── TabSidebar.tsx              # 탭 사이드바
    └── DocArea.tsx                 # Raw textarea | Preview react-markdown
```

---

## Preview 스타일 (Notion-like)

| 요소   | 스타일                                           |
| ------ | ------------------------------------------------ |
| H1     | `text-[20px]`, `font-bold`, `#f1f5f9`            |
| H2     | `text-[15px]`, `font-bold`, `#f1f5f9`, 하단 보더 |
| H3     | `text-[14px]`, `font-semibold`, `#e2e8f0`        |
| 본문   | `text-[14px]`, `#94a3b8`, 줄간격 여유            |
| 리스트 | `list-disc/decimal`, 적절한 들여쓰기             |
| 볼드   | `font-semibold`, `#e2e8f0`                       |
| 코드   | `font-mono`, `bg-[#1c2128]`, 퍼플 텍스트         |

---

## 결과

- 외부 의존성 1개 추가 (react-markdown ~20KB)
- Figma 박스 디자인 + 토글 버튼 100% 보존
- Preview가 Notion처럼 마크다운을 렌더링
- Raw↔Preview 전환 시 파싱 오류 없음 (사용성 개선)
- "수정 완료" 시에만 역파싱 → 오류 발생 최소화
