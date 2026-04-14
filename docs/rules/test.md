# 테스트 규칙

## 테스트 파일 위치

소스 파일과 같은 디렉토리에 `.test.ts` / `.test.tsx`로 생성.

```
src/features/planning/utils/planningMarkdown.ts
  → src/features/planning/utils/planningMarkdown.test.ts

src/features/planning/hooks/usePlanningPage.ts
  → src/features/planning/hooks/usePlanningPage.test.ts
```

## 작성 대상

| 대상                        | 필수 여부                 |
| --------------------------- | ------------------------- |
| `src/features/*/hooks/*.ts` | 필수                      |
| `src/features/*/utils/*.ts` | 필수                      |
| `src/utils/*.ts`            | 필수                      |
| `src/lib/*.ts`              | 권장                      |
| page 컴포넌트               | 불필요 (훅 테스트로 커버) |

## 테스트 러너 설정 (Vitest)

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

`package.json`에 추가:

```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

## 실행 명령

```bash
bash scripts/harness/test-unit.sh           # 전체 단위 테스트
bash scripts/harness/test-unit.sh --watch   # 감시 모드
bash scripts/harness/test-integration.sh    # lint → TS → build → E2E
```

## 단위 테스트 작성 기준

- 정상 케이스 + 경계값 + 에러 케이스 포함
- 외부 의존성(API, sessionStorage)은 mock 처리
- 테스트 설명은 한국어로 작성
