# 이슈 생성 속도 개선 분석 및 해결 계획

## 문제

`POST /api/github/create-issues` 엔드포인트에서 이슈 등록이 과도하게 느림 (30~60초).

## 원인: 완전 직렬 API 호출

기존 구현은 중첩 `for` 루프 안에서 모든 GitHub API 호출을 `await`으로 순차 처리한다.

### 이슈 1개당 호출 체인

```
Story 생성 (REST 1회)
  └─ addProjectV2ItemById          (GraphQL 1회)
     ├─ updateIssueTypeField       (GraphQL 1회)  ← 순차
     └─ updateEpicField            (GraphQL 1회)  ← 순차
  └─ [Task × N개] 각각 직렬
     ├─ Task 생성                  (REST 1회)
     ├─ sub_issue 연결             (REST 1회)
     └─ addProjectV2ItemById       (GraphQL 1회)
        ├─ updateIssueTypeField    (GraphQL 1회)  ← 순차
        └─ updateEpicField         (GraphQL 1회)  ← 순차
```

### 호출 횟수 계산 (에픽 3 × 스토리 3 × 태스크 2 기준)

| 구간                          | 방식 | 호출 수  | 예상 시간 |
| ----------------------------- | ---- | -------- | --------- |
| Story 생성 9개                | 직렬 | 9        | ~3초      |
| Story 프로젝트 추가 (3호출×9) | 직렬 | 27       | ~8초      |
| Task 생성 18개                | 직렬 | 18       | ~6초      |
| sub_issue 연결 18개           | 직렬 | 18       | ~6초      |
| Task 프로젝트 추가 (3호출×18) | 직렬 | 54       | ~16초     |
| **합계**                      |      | **~126** | **~40초** |

## 해결 계획

의존 관계를 분석하여 **독립적인 호출은 모두 병렬화**한다.

### 의존 관계 그래프

```
[1] Story 일괄 생성 (병렬)
     ↓ nodeId, number 확정
[2] Task 일괄 생성 (병렬) + Story 프로젝트 추가 (병렬, fire-and-forget)
     ↓ nodeId 확정
[3] sub_issue 연결 (병렬) + Task 프로젝트 추가 (병렬, fire-and-forget)
```

### 변경 사항

1. **`addIssueToProject` 내부**: `updateIssueTypeField` + `updateEpicField` → `Promise.all`로 병렬화

2. **Story 생성**: `for` 루프 → `Promise.allSettled` 병렬 생성

3. **Task 생성**: 모든 스토리의 태스크를 수집한 뒤 `Promise.allSettled` 병렬 생성

4. **후처리 (프로젝트 추가 + sub_issue)**: 이슈 생성 완료 후 전체를 `Promise.all`로 병렬 처리

### 예상 개선 후 시간

| 구간                                  | 방식        | 예상 시간  |
| ------------------------------------- | ----------- | ---------- |
| Story 전체 병렬 생성                  | Promise.all | ~0.5초     |
| Task 전체 병렬 생성                   | Promise.all | ~0.5초     |
| 프로젝트 추가 전체 병렬 (내부도 병렬) | Promise.all | ~0.8초     |
| sub_issue 연결 전체 병렬              | Promise.all | ~0.5초     |
| **합계**                              |             | **~2.3초** |

> 개선율: ~40초 → ~2초 (**약 20배 단축**)

## 주의사항

- GitHub REST API: 인증된 요청은 분당 5,000 요청 허용. 일반적인 Gito 규모(20~60 이슈)에서 병렬화해도 Rate Limit에 걸리지 않는다.
- GraphQL API: 포인트 기반 Rate Limit. 단일 mutation은 1포인트 미만이므로 문제없다.
- `Promise.allSettled` 사용: 일부 이슈 생성 실패가 전체를 중단시키지 않도록 처리.

## 구현 파일

- `src/app/api/github/create-issues/route.ts` 단일 파일 수정
