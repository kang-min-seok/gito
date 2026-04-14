# Harness Engineering — Gito 하네스 시스템 설계 문서

> 이 문서는 Gito 프로젝트의 하네스 엔지니어링 시스템 아키텍처를 정의한다.
> Claude가 코드를 수정할 때마다 자동으로 규칙을 검증하고 위반을 즉시 피드백한다.

---

## 1. 핵심 철학

> **"프롬프트로 부탁하지 말고, 하네스가 강제한다."**

| 기존 방식 (프롬프트 기반)             | 하네스 방식 (훅 기반)                         |
| ------------------------------------- | --------------------------------------------- |
| CLAUDE.md에 "매직 스트링 쓰지 마세요" | 파일 저장 시 자동으로 위반 탐지 + 즉시 피드백 |
| "page.tsx에 로직 넣지 마세요"         | 저장 시 useState 개수 자동 측정 + 경고        |
| 규칙을 잊으면 위반 발생               | 잊어도 하네스가 잡아준다                      |
| 사후 코드 리뷰에서 발견               | 실시간 자동 감지                              |

---

## 2. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                        Human Layer                          │
│   의도 전달 (요청) → Claude에게 high-level 지시              │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                       Agent Layer (Claude)                   │
│   코드 작성 / 수정 / 분석 — 실행은 Claude가 담당             │
└───────────────────────────┬─────────────────────────────────┘
                            │ Write/Edit/Bash 도구 호출
┌───────────────────────────▼─────────────────────────────────┐
│                      Harness Layer                          │
│   .claude/hooks/  →  scripts/harness/                       │
│                                                             │
│   PreToolUse  → 위험 명령어 차단 (pre-bash.sh)             │
│   PostToolUse → 파일 수정 후 즉시 검증 (on-file-edit.sh)   │
│   Stop        → 세션 종료 전 최종 게이트 (on-stop.sh)      │
└───────────────────────────┬─────────────────────────────────┘
                            │ 피드백 (Claude 컨텍스트에 자동 삽입)
┌───────────────────────────▼─────────────────────────────────┐
│                   Execution Environment                      │
│   Git, pnpm, TypeScript, Husky, ESLint                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. 파일 구조

```
.claude/
├── settings.json              ← Claude Code 훅 등록 설정
└── hooks/
    ├── on-file-edit.sh        ← PostToolUse: Write/Edit 후 실행
    ├── pre-bash.sh            ← PreToolUse: Bash 전 실행
    └── on-stop.sh             ← Stop: 세션 종료 전 실행

scripts/
└── harness/
    ├── _lib.sh                ← 공통 유틸 (색상, 함수, JSON 파싱)
    ├── check-magic.sh         ← 매직 스트링/넘버 탐지
    ├── check-component.sh     ← 컴포넌트 구조 규칙 검사
    ├── check-naming.sh        ← 네이밍 컨벤션 검사
    ├── check-imports.sh       ← 임포트 규칙 검사
    ├── check-docs.sh          ← docs 동기화 감지
    ├── check-ts.sh            ← TypeScript 타입 검사
    ├── gate.sh                ← 마스터 게이트 (모든 검사 실행)
    └── setup.sh               ← 초기 설정 스크립트
```

---

## 4. 훅 트리거 흐름

### 4-1. 파일 수정 시 (PostToolUse: Write|Edit)

```
Claude가 Write/Edit 실행
    ↓
on-file-edit.sh 자동 호출
    ↓
file_path 추출 (stdin JSON 파싱)
    ↓ src/**/*.ts, *.tsx 파일인 경우만
├── check-magic.sh      → 인라인 스토리지 키, hex 색상, 레이블 리터럴
├── check-naming.sh     → is/has/on 접두사, MOCK_ 접두사
├── check-component.sh  → (page.tsx만) useState 과다, 훅 위임 여부
└── check-docs.sh       → docs/project-overview.md 업데이트 필요 알림
    ↓
결과를 stdout으로 출력 → Claude 컨텍스트에 자동 삽입
Claude가 위반 사항을 보고 즉시 자가 수정
```

### 4-2. Bash 명령 실행 전 (PreToolUse: Bash)

```
Claude가 Bash 실행 요청
    ↓
pre-bash.sh 자동 호출
    ↓
위험 패턴 검사:
  • rm -rf src/         → exit 2 (차단)
  • git push --force main → exit 2 (차단)
  • git commit --no-verify → exit 2 (차단)
  • pnpm add <package>  → 경고 출력 (차단 X)
    ↓
exit 2: Claude에게 차단 이유 전달, 명령 실행 취소
exit 0: 명령 정상 실행
```

### 4-3. 작업 완료 시 (Stop)

```
Claude가 모든 작업 완료 후 응답 생성 직전
    ↓
on-stop.sh 자동 호출
    ↓
src/ 변경 감지 (git status)
    ↓ 변경 있을 때만
gate.sh --fast 실행 (TypeScript 검사 제외 빠른 검사)
    ↓
실패 시: 에러 요약을 Claude 컨텍스트에 포함
Claude가 응답에 에러 수정 계획 포함
```

---

## 5. 검사 항목 상세

### check-magic.sh — 매직 스트링/넘버 탐지

| 패턴               | 탐지 예시                                        | 올바른 대안                                    |
| ------------------ | ------------------------------------------------ | ---------------------------------------------- |
| 인라인 스토리지 키 | `sessionStorage.getItem('gito_planning_result')` | `sessionStorage.getItem(PLANNING_STORAGE_KEY)` |
| 인라인 hex 색상    | `style={{ color: '#6762a7' }}`                   | `style={{ color: 'var(--color-primary)' }}`    |
| 이슈 레이블 리터럴 | `labels: ['epic']`                               | `labels: [ISSUE_LABEL.EPIC]`                   |

### check-component.sh — 컴포넌트 구조

| 조건                                        | 수준 | 조치                                 |
| ------------------------------------------- | ---- | ------------------------------------ |
| page.tsx: useState ≥ 3 + useXxxPage 훅 없음 | WARN | features/\*/hooks/useXxxPage.ts 생성 |
| page.tsx: 인라인 핸들러 ≥ 3 + 훅 없음       | WARN | 핸들러를 훅으로 이동                 |

### check-naming.sh — 네이밍 컨벤션

| 위반 패턴                          | 수준 | 올바른 형식             |
| ---------------------------------- | ---- | ----------------------- |
| boolean prop: `visible: boolean`   | WARN | `isVisible: boolean`    |
| 콜백 prop: `submit: () => void`    | WARN | `onSubmit: () => void`  |
| 훅 내 mock: `const mockData = ...` | WARN | `const MOCK_DATA = ...` |

### check-imports.sh — 임포트 규칙

| 위반 패턴                             | 수준 | 조치                      |
| ------------------------------------- | ---- | ------------------------- |
| features/A에서 features/B 직접 임포트 | WARN | 공통 타입을 types/로 이동 |
| 한 파일에 변환 함수 5개 이상          | INFO | src/utils/ 분리 검토      |

### pre-bash.sh — 위험 명령어 차단

| 패턴                        | 수준  | 이유                   |
| --------------------------- | ----- | ---------------------- |
| `rm -rf src/`               | BLOCK | src 디렉토리 전체 삭제 |
| `git push --force main/dev` | BLOCK | 공유 브랜치 강제 push  |
| `git commit --no-verify`    | BLOCK | husky 훅 우회          |
| `pnpm add <package>`        | WARN  | 미승인 패키지 추가     |

---

## 6. 피드백 루프

```
① Claude가 파일 수정
② on-file-edit.sh 즉시 실행
③ 위반 발견 → Claude 컨텍스트에 피드백 삽입
④ Claude가 다음 응답에서 위반 수정
⑤ 다시 수정 → 다시 검사 → 통과
⑥ Stop 훅: 최종 gate.sh --fast 실행
⑦ 커밋 시: Husky pre-commit → gate.sh --fast
```

→ **에러는 발생 즉시 수정된다. 사람이 코드 리뷰에서 잡을 필요 없다.**

---

## 7. 초기 설정

```bash
# 1. 실행 권한 + Husky 설정
bash scripts/harness/setup.sh

# 2. 전체 검사 실행
bash scripts/harness/gate.sh

# 3. 빠른 검사 (TypeScript 제외)
bash scripts/harness/gate.sh --fast
```

---

## 8. 하네스 개선 원칙

> **증상을 고치지 말고, 하네스를 고쳐라.**

새로운 위반 패턴이 발견되면:

1. 어떤 규칙이 깨졌는지 파악
2. 해당 규칙을 자동화하는 검사를 `scripts/harness/check-*.sh`에 추가
3. CLAUDE.md와 이 문서를 업데이트

---

_최종 업데이트: 2026-04-13_
