# 커밋 규칙

## 형식

```
<type>: <한국어 요약>

- 변경 항목 1
- 변경 항목 2
```

## type 목록

| type       | 사용 시점                |
| ---------- | ------------------------ |
| `feat`     | 새 기능                  |
| `fix`      | 버그 수정                |
| `refactor` | 동작 변경 없는 코드 개선 |
| `test`     | 테스트 추가/수정         |
| `docs`     | 문서 변경                |
| `style`    | 포맷, CSS 등 UI 변경     |
| `chore`    | 설정, 스크립트, 의존성   |

## 예시

```
feat: 이슈 페이지 훅 분리 — useIssuesPage 추가

- src/app/issues/page.tsx: useIssuesPage 훅으로 로직 위임
- src/features/issues/hooks/useIssuesPage.ts: 신규 추가
- src/features/issues/hooks/useIssuesPage.test.ts: 단위 테스트 추가
```

```
fix: split 모드 레포 선택 시 타입 불일치 수정

- IssuesResult 타입 분기 처리 누락 수정
- src/app/repo-select/page.tsx 조건문 보완
```

## 커밋 전 체크리스트

```
□ 단위 테스트 PASS: bash scripts/harness/test-unit.sh
□ 통합 테스트 PASS: bash scripts/harness/test-integration.sh
□ 계획 완료 처리: bash scripts/harness/plan.sh --complete
□ 커밋 메시지 추천 확인: bash scripts/harness/suggest-commit.sh
```

## 금지

- `git commit --no-verify` 사용 금지 (Husky 우회 불가)
- 사용자가 명시적으로 "커밋해줘"라고 할 때까지 `git commit` 실행 금지
