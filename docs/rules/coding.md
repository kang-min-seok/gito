# 코딩 규칙

## 컴포넌트 계층

```
app/*/page.tsx  → useXxxPage 훅 호출 + 레이아웃 조립만. useState/핸들러 직접 정의 금지.
Section         → props만 받는다. 자체 데이터 없음.
Card / Item     → 순수 표현 컴포넌트.
components/     → 여러 페이지 재사용 UI.
```

## 훅 규칙

- `useXxxPage` — 해당 page의 상태·핸들러 전담. page 컴포넌트에서만 사용.
- `useXxx` — 단일 관심사 (소켓, 타이머 등).
- 훅 파일 내 mock 데이터 → `MOCK_` 접두사 + 교체 시점 주석.

## Props 규칙

- `boolean` prop → `is` / `has` 접두사 (예: `isLoading`, `hasError`)
- 콜백 prop → `on` 접두사 (예: `onSubmit`, `onClose`)
- props 타입은 컴포넌트 파일 내 `export`

## 유틸 규칙

- 2곳 이상 재사용 순수 함수 → `src/utils/` 분리
- 다른 feature 직접 임포트 금지 → 공통 타입은 `src/types/`로
- 유틸 함수는 사이드 이펙트 없이 입력 → 출력만

## 매직 스트링 / 넘버 금지

| 위반                                             | 올바른 대안                                    |
| ------------------------------------------------ | ---------------------------------------------- |
| `sessionStorage.getItem('gito_planning_result')` | `sessionStorage.getItem(PLANNING_STORAGE_KEY)` |
| `style={{ color: '#6762a7' }}`                   | `style={{ color: 'var(--color-primary)' }}`    |
| `labels: ['epic']`                               | `labels: [ISSUE_LABEL.EPIC]`                   |

반복 문자열·숫자 → `src/constants/` 추출.
CSS 반복 색상 → `globals.css` `--color-*` 변수 사용.

## TypeScript

- `any` 금지. 타입 불명확 시 `unknown` + 타입 가드.
- Zod 스키마와 TypeScript 타입은 항상 동기화.
