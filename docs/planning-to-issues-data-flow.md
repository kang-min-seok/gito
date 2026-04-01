# Planning → Issues 데이터 흐름 분석

> 기획서(Planning) 페이지에서 수정한 마크다운 내용이 이슈 생성에 어떻게 반영되는지 추적한 문서.

---

## 전체 흐름 요약

```
[사용자가 Raw 모드에서 마크다운 편집]
        ↓
markdownContents: Record<SidebarTab, string>
        ↓
handleGenerateIssues() 호출
        ↓
markdownToProposal / markdownToScenarios / markdownToTechChallenge (역파싱)
        ↓
PlanningResult { type: 'planning', proposal, scenarios, techChallenge }
        ↓
POST /api/generate/issues  (JSON body: { planning: PlanningResult })
        ↓
GenerateIssuesRequestSchema.safeParse()  (Zod 검증)
        ↓
buildIssuesUserPrompt(planning)  → JSON.stringify(planning, null, 2)
        ↓
Gemini AI  (GenerateIssuesSchema로 구조화 출력)
        ↓
GenerateIssuesResult  (EpicGroup[])  → /issues 페이지
```

---

## 단계별 상세 분석

### 1. 마크다운 편집 상태 (`MarkdownContents`)

```typescript
// src/features/planning/hooks/usePlanningPage.ts
type MarkdownContents = Record<SidebarTab, string>;
// { proposal: string, scenarios: string, techChallenge: string }
```

3개의 탭이 각각 독립된 마크다운 문자열로 관리된다.
사용자가 Raw 모드 textarea에서 텍스트를 수정하면 즉시 이 상태가 갱신된다.

---

### 2. 역파싱: Markdown → PlanningResult

`handleGenerateIssues`가 실행될 때, 3개의 마크다운을 `PlanningResult` 구조체로 변환한다.

```typescript
// src/features/planning/utils/planningMarkdown.ts
planningData = {
  type: 'planning',
  proposal: markdownToProposal(markdownContents.proposal),
  scenarios: markdownToScenarios(markdownContents.scenarios),
  techChallenge: markdownToTechChallenge(markdownContents.techChallenge),
};
```

#### 파서 동작 방식

파서는 `## ` 헤더를 기준으로 섹션을 분리하고, `### ` 헤더로 하위 항목을 분리한다.

| 함수                      | 입력 헤더 (한국어 필수)                             | 파싱 결과                                  |
| ------------------------- | --------------------------------------------------- | ------------------------------------------ |
| `markdownToProposal`      | `## 개요 (Overview)`                                | `proposal.overview`                        |
|                           | `## 문제 정의 (Problem Statement)`                  | `proposal.problem`                         |
|                           | `## 왜 필요한가? (Why Needed)`                      | `proposal.whyNeeded.existingWay/targetWay` |
|                           | `## 완료 기준 (Completion Criteria)`                | `proposal.completionCriteria`              |
|                           | `## 주요 기능 (Main Features)` + `### 기능명`       | `proposal.mainFeatures[]`                  |
|                           | `## 타겟 유저 (Target Users)`                       | `proposal.targetUsers`                     |
|                           | `## 유저 확보 계획 (User Acquisition Plan)`         | `proposal.userAcquisitionPlan[]`           |
| `markdownToScenarios`     | `## 요약 플로우 (Summary Flow)` + `### 단계`        | `scenarios.summaryFlow[]`                  |
|                           | `## 상세 플로우 (Detailed Flow)` + `### 단계: 행동` | `scenarios.detailedFlow[]`                 |
| `markdownToTechChallenge` | `## 도전 제목`                                      | `techChallenge.challenges[]`               |

`whyNeeded` 파싱에는 줄 접두사도 의존한다:

```
기존: [existingWay 내용]
지향: [targetWay 내용]
```

---

### 3. Zod 검증 (`GenerateIssuesRequestSchema`)

```typescript
// src/features/issues/schemas.ts
const GenerateIssuesRequestSchema = z.object({
  planning: GeneratePlanningSchema, // discriminatedUnion('type', [...])
});
```

`GeneratePlanningSchema`는 `type: 'planning'`일 때 `proposal`, `scenarios`, `techChallenge` 전체를 검증한다.
모든 필드는 `z.string()` 또는 `z.array(...)` — 빈 문자열도 통과한다.

즉, **파서가 섹션을 찾지 못하면 빈 문자열/빈 배열로 폴백**하며, Zod 검증은 통과하지만 AI에 전달되는 정보가 손실된다.

---

### 4. AI 프롬프트 구성 (`buildIssuesUserPrompt`)

```typescript
// src/features/issues/prompt.ts
export function buildIssuesUserPrompt(planning: PlanningResult): string {
  return `다음 기획서를 바탕으로 GitHub 이슈를 생성해주세요:\n\n${JSON.stringify(planning, null, 2)}`;
}
```

`PlanningResult` 전체가 JSON으로 직렬화되어 Gemini AI에 전달된다.
**마크다운 에디터에서 수정한 모든 내용은 이 시점에 온전히 반영된다.**

---

### 5. AI의 이슈 생성 규칙 (시스템 프롬프트)

AI는 `PlanningResult`의 특정 필드를 이슈 계층 구조에 다음과 같이 매핑한다:

| 이슈 타입         | 참조 필드                             | 생성 규칙                                 |
| ----------------- | ------------------------------------- | ----------------------------------------- |
| **Epic** (텍스트) | `proposal.mainFeatures[].name`        | 각 주요 기능 = 1개의 Epic                 |
| **Story** (이슈)  | `scenarios.detailedFlow`, `proposal`  | Epic당 2~4개, "사용자는 ~할 수 있다" 형태 |
| **Task** (이슈)   | Story 하위 개발 작업, `techChallenge` | Story당 2~3개, 기술적 도전 내용도 반영    |

따라서 **이슈 구조에 가장 직접적인 영향을 주는 편집 영역**은:

1. `proposal.md`의 `## 주요 기능 (Main Features)` 섹션 — Epic 수와 이름이 결정됨
2. `user-scenarios.md`의 `## 상세 플로우 (Detailed Flow)` 섹션 — Story 내용이 결정됨
3. `tech-challenges.md`의 각 `## 도전` 섹션 — Task에 반영됨

---

## 파서 신뢰성 분석

### 안전한 편집 영역

사용자가 자유롭게 수정해도 파싱에 영향 없는 부분:

- `## ` 헤더 **아래**의 본문 텍스트 (overview, problem 등 단순 문자열 필드)
- `### ` 헤더 아래의 기능 설명 (`mainFeatures[].description`)
- `- ` 리스트 항목 내용 (traits, userAcquisitionPlan)

### 파싱이 깨질 수 있는 영역

| 편집 내용                                | 결과                                               |
| ---------------------------------------- | -------------------------------------------------- |
| `## 개요 (Overview)` 헤더 문구 변경      | `proposal.overview` → `''`                         |
| `## 주요 기능 (Main Features)` 헤더 삭제 | `mainFeatures` → `[]` → Epic 없음 → 이슈 미생성    |
| `### 기능명` 을 `**기능명**` 으로 변경   | 해당 기능 파싱 누락                                |
| `기존:` / `지향:` 접두사 변경            | `whyNeeded` → `{ existingWay: '', targetWay: '' }` |
| `### 단계: 행동` 에서 `:` 제거           | `detailedFlow.action` → `''`                       |

### 폴백 동작

모든 `extractH2Sections` 결과는 `?? ''`로 폴백되므로 **파싱 실패 시 예외 없이 빈 값이 전달**된다.
이슈 생성 자체는 성공하나 AI가 참조할 정보가 줄어들어 이슈 품질이 저하된다.

---

## 결론

마크다운 편집 내용은 이슈 생성에 **완전히 반영**된다. 단, 파서가 **마크다운 헤더의 정확한 한국어 문구**에 의존하기 때문에 헤더 자체를 수정하면 해당 섹션이 누락될 수 있다. 본문 텍스트 편집은 항상 안전하다.
