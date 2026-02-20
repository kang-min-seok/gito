# Claude Code 전역 규칙

## 1. 결정이 필요할 땐 반드시 먼저 물어볼 것

가장 중요한 규칙이야. 아래 상황에서는 **절대 스스로 판단해서 진행하지 말고** 반드시 나에게 먼저 물어봐.

- 요구사항이 모호하거나 해석이 두 가지 이상 가능할 때
- 기술 스택, 라이브러리 선택이 필요할 때
- 구조나 설계 방향을 결정해야 할 때
- 기존 코드에 영향을 줄 수 있는 변경을 할 때
- 프롬프트에 명시되지 않은 기능을 추가하려 할 때

**나쁜 예시:**

> 프롬프트에 상태관리 언급이 없었지만 Zustand가 적합할 것 같아서 설치했습니다.

**좋은 예시:**

> 상태관리 방식이 명시되지 않았습니다. 다음 중 어떤 방식을 선호하시나요?
>
> 1. Zustand (경량, 단순한 전역 상태)
> 2. Context API (외부 의존성 없음)
> 3. 다른 방식

---

## 2. 파일 분리 & 폴더 구조 원칙

### 하나의 파일은 하나의 책임만 가진다

- 컴포넌트 1개 = 파일 1개
- 200줄이 넘어가면 분리를 고려할 것
- 관련 없는 로직을 한 파일에 묶지 말 것

### 폴더 구조 기준

```
src/
├── components/       # 재사용 가능한 UI 컴포넌트
│   └── [ComponentName]/
│       ├── index.tsx         # 컴포넌트 본체
│       ├── [ComponentName].types.ts  # 타입 정의
│       └── [ComponentName].utils.ts  # 컴포넌트 전용 유틸
├── features/         # 도메인/기능 단위 묶음 (FSD 스타일)
│   └── [featureName]/
│       ├── components/
│       ├── hooks/
│       ├── utils/
│       └── types.ts
├── hooks/            # 전역 공통 커스텀 훅
├── utils/            # 전역 공통 유틸 함수
├── constants/        # 전역 상수
├── types/            # 전역 타입 정의
└── lib/              # 외부 라이브러리 설정 및 래핑
```

### 임포트 규칙

- 같은 레벨의 파일끼리 직접 참조 금지
- index.ts를 통해 외부로 노출할 것
- 상대경로 깊이가 3단계 이상이면 alias 사용 (`@/`)

---

## 3. 매직 넘버 & 매직 스트링 금지

코드에 의미를 알 수 없는 숫자나 문자열을 직접 쓰지 말 것.

**나쁜 예시:**

```typescript
if (status === 'github_oauth_callback') { ... }
setTimeout(fn, 3000)
if (issues.length > 50) { ... }
const url = 'https://api.github.com/repos'
```

**좋은 예시:**

```typescript
// src/constants/auth.ts
export const AUTH_STATUS = {
  GITHUB_OAUTH_CALLBACK: 'github_oauth_callback',
} as const;

// src/constants/github.ts
export const GITHUB_API = {
  BASE_URL: 'https://api.github.com/repos',
  MAX_ISSUES_PER_REQUEST: 50,
} as const;

// src/constants/ui.ts
export const DELAY_MS = {
  TOAST_DISMISS: 3000,
} as const;
```

### 상수 파일 위치

- 전역에서 쓰는 상수 → `src/constants/`
- 특정 feature에서만 쓰는 상수 → `src/features/[name]/constants.ts`
- 컴포넌트 내부에서만 쓰는 상수 → 해당 컴포넌트 파일 상단에 선언

---

## 4. 유틸 함수 활용 원칙

### 유틸로 분리할 기준

아래에 해당하면 반드시 util 함수로 분리할 것:

- 같은 로직이 2곳 이상에서 사용되는 경우
- 컴포넌트나 훅에서 순수 계산/변환 로직이 10줄 이상일 때
- 외부 API 응답을 가공하는 로직
- 날짜, 문자열, 배열 등의 데이터 변환

**나쁜 예시:**

```typescript
// 컴포넌트 안에 변환 로직이 섞임
const IssueList = ({ issues }) => {
  const grouped = issues.reduce((acc, issue) => {
    const type = issue.labels.find(l => ['epic','story','task'].includes(l))
    if (!acc[type]) acc[type] = []
    acc[type].push(issue)
    return acc
  }, {})
  return <div>...</div>
}
```

**좋은 예시:**

```typescript
// src/features/issues/utils/groupIssuesByType.ts
export const groupIssuesByType = (issues: Issue[]): GroupedIssues => {
  return issues.reduce((acc, issue) => {
    const type = issue.labels.find(l => ISSUE_TYPES.includes(l)) ?? 'task'
    if (!acc[type]) acc[type] = []
    acc[type].push(issue)
    return acc
  }, {} as GroupedIssues)
}

// 컴포넌트는 깔끔하게
const IssueList = ({ issues }) => {
  const grouped = groupIssuesByType(issues)
  return <div>...</div>
}
```

### 유틸 함수 작성 규칙

- 순수 함수(pure function)로 작성할 것 (사이드이펙트 없음)
- 함수명은 동사로 시작 (`get`, `format`, `parse`, `group`, `filter`, `convert`)
- 하나의 함수는 하나의 일만 할 것
- 반드시 입출력 타입을 명시할 것

---

## 5. 타입 정의 원칙

- `any` 사용 금지. 불가피하면 `unknown` 후 타입 가드 사용
- API 응답 타입은 반드시 별도 파일에 정의
- 타입과 인터페이스 구분: 확장 가능성 있으면 `interface`, 유니온/교차 타입은 `type`
- 타입 이름은 파스칼케이스, 접두사 `I` `T` 붙이지 않기

---

## 6. 코드 작성 전 체크리스트

새 기능을 만들기 전에 항상 이 순서로 진행:

1. **요구사항 확인** - 모호한 부분이 있으면 먼저 질문
2. **타입 먼저 정의** - 데이터 구조를 먼저 결정
3. **상수 정의** - 필요한 상수를 constants 파일에 추가
4. **유틸 함수 작성** - 순수 로직 먼저 분리
5. **훅 작성** - 상태/사이드이펙트 로직
6. **컴포넌트 작성** - UI만 담당, 최대한 얇게

---

## 7. 커밋 & PR 단위

- 하나의 커밋은 하나의 논리적 변경만 포함
- 커밋 메시지 형식: `type(scope): 내용`
  - type: `feat`, `fix`, `refactor`, `style`, `chore`, `docs`
  - 예시: `feat(issues): 이슈 타입별 그룹핑 유틸 추가`
