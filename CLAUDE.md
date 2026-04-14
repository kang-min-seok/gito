# CLAUDE.md

> 하네스가 규칙을 강제한다. 우회하지 않는다.

---

## 개발 플로우

모든 작업은 이 순서를 따른다.

```
1. 계획        bash scripts/harness/plan.sh "기능명"
               → docs/plans/ 에 계획 파일 생성
               → 목표·영향 파일·구현 단계·테스트 계획 작성
               → 상태를 IN_PROGRESS 로 변경

2. 구현 + 로그  src/ 파일 수정 시 로그 자동 기록
               bash scripts/harness/log.sh IMPL "구현 내용"
               bash scripts/harness/log.sh FIX  "수정 내용"

3. 단위 테스트  bash scripts/harness/test-unit.sh
               → PASS 전까지 다음 단계 진행 불가

4. 통합 테스트  bash scripts/harness/test-integration.sh
               → lint → TypeScript → build 순서
               → 하나라도 실패하면 중단

5. 커밋 추천    bash scripts/harness/plan.sh --complete
               bash scripts/harness/suggest-commit.sh
```

---

## 하네스 자동 강제

| 시점                | 동작                              |
| ------------------- | --------------------------------- |
| `src/` 파일 수정 전 | 계획 없으면 차단                  |
| 파일 수정 후        | 품질 검사 + 로그 자동 기록        |
| 작업 완료 시        | gate 검사 + 다음 단계 안내        |
| `git commit`        | 단위 테스트 + lint + build 재검증 |

---

## 참고 규칙

필요한 순간에만 열어본다.

| 상황                    | 파일                                                       |
| ----------------------- | ---------------------------------------------------------- |
| 컴포넌트·훅·유틸 설계   | [docs/rules/coding.md](docs/rules/coding.md)               |
| CSS 변수·Tailwind 사용  | [docs/rules/design.md](docs/rules/design.md)               |
| 커밋 메시지 형식·예시   | [docs/rules/commit.md](docs/rules/commit.md)               |
| 테스트 파일 위치·작성법 | [docs/rules/test.md](docs/rules/test.md)                   |
| 하네스 아키텍처         | [docs/harness-engineering.md](docs/harness-engineering.md) |
| 프로젝트 구조·API       | [docs/project-overview.md](docs/project-overview.md)       |
