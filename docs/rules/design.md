# 디자인 규칙

## CSS 변수 (globals.css)

| 변수                       | 값        | 용도           |
| -------------------------- | --------- | -------------- |
| `--bg-page`                | `#0d1117` | 페이지 배경    |
| `--bg-surface`             | `#161b22` | 카드/패널 배경 |
| `--bg-surface-hover`       | `#1c2128` | 호버 상태      |
| `--border-color`           | `#30363d` | 테두리         |
| `--text-primary`           | `#f1f5f9` | 주요 텍스트    |
| `--text-secondary`         | `#94a3b8` | 보조 텍스트    |
| `--text-muted`             | `#64748b` | 흐린 텍스트    |
| `--color-primary`          | `#6762a7` | 퍼플 강조색    |
| `--color-primary-hover`    | `#574f91` | 퍼플 호버      |
| `--color-primary-active`   | `#4f4680` | 퍼플 액티브    |
| `--color-primary-disabled` | `#3d3a5c` | 퍼플 비활성    |
| `--color-success`          | `#3fb950` | 성공/완료      |

## 컴포넌트 클래스 (@layer components)

| 클래스            | 용도                   |
| ----------------- | ---------------------- |
| `.badge`          | 기본 뱃지 (11px, bold) |
| `.badge-epic`     | 에픽 뱃지 (파란색)     |
| `.badge-story`    | 스토리 뱃지 (초록색)   |
| `.badge-task`     | 태스크 뱃지 (노란색)   |
| `.card`           | 어두운 배경 카드       |
| `.section-label`  | 11px, bold, uppercase  |
| `.page-container` | 최대 800px, 중앙 정렬  |

## Tailwind v4 규칙

- `@tailwindcss/postcss` 사용 (postcss.config.mjs)
- CSS 변수 → Tailwind 색상 연결: `@theme inline` 블록
- 인라인 hex 색상 지양. CSS 변수 우선.
