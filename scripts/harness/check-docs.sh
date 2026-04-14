#!/bin/bash
# scripts/harness/check-docs.sh
# docs/project-overview.md 동기화 검사
#
# 규칙: src/ 파일이 수정되면 docs/project-overview.md도 함께 업데이트해야 한다.
# 이 스크립트는 git status를 확인해 동기화 여부를 감지한다.
#
# 사용: check-docs.sh [<changed-file>]
#   <changed-file>: 방금 수정된 파일 경로 (PostToolUse 훅에서 전달)
#   인자 없으면: 전체 git diff 기준으로 검사

source "$(dirname "$0")/_lib.sh"

CHANGED_FILE="${1:-}"
ROOT=$(project_root)
DOCS_FILE="$ROOT/docs/project-overview.md"

# docs/project-overview.md 자체 수정 시 검사 생략
if [[ "$CHANGED_FILE" == *"project-overview.md"* ]] || \
   [[ "$CHANGED_FILE" == *"CLAUDE.md"* ]] || \
   [[ "$CHANGED_FILE" == *"harness"* ]]; then
  exit 0
fi

# ── src/ 변경 여부 확인 ───────────────────────────────────────────────────────
src_changed() {
  local changed
  # 스테이지 + 언스테이지 변경 파일 중 src/ 포함 여부
  changed=$(git -C "$ROOT" status --porcelain 2>/dev/null | grep "src/" | grep -v "^?" )
  [ -n "$changed" ]
}

docs_changed() {
  git -C "$ROOT" status --porcelain "$DOCS_FILE" 2>/dev/null | grep -q "project-overview"
}

# ── 단일 파일 모드 (PostToolUse 훅에서 호출) ─────────────────────────────────
if [ -n "$CHANGED_FILE" ] && [ -f "$CHANGED_FILE" ]; then
  # src/ 하위 TS/TSX 파일만 확인
  if ! is_src_ts_file "$CHANGED_FILE"; then
    exit 0
  fi

  # 중요 파일 변경 분류 (컴포넌트, 훅, 타입, 라우팅)
  local_file=$(basename "$CHANGED_FILE")
  is_significant=false
  case "$CHANGED_FILE" in
    */components/*|*/features/*|*/hooks/*|*/types/*|*/app/*/page.tsx|*/app/layout.tsx)
      is_significant=true ;;
  esac

  if $is_significant && ! docs_changed; then
    warn "docs/project-overview.md 업데이트 필요"
    echo "    → 수정된 파일: $local_file"
    echo "    → 해당 변경이 컴포넌트/훅/타입/라우팅에 영향을 준다면"
    echo "      docs/project-overview.md의 관련 섹션을 업데이트하세요."
    echo "    → CLAUDE.md §7 참조: 변경 유형별 업데이트 대상 섹션"
  fi
  exit 0
fi

# ── 전체 검사 모드 (gate.sh에서 호출) ────────────────────────────────────────
if src_changed && ! docs_changed; then
  warn "src/ 변경 감지 — docs/project-overview.md 업데이트 확인 필요"
  echo "    → git diff로 변경된 src/ 파일:"
  git -C "$ROOT" status --porcelain 2>/dev/null | grep "src/" | head -5 | while IFS= read -r line; do
    echo "      $line"
  done
  echo "    → 구조/타입/컴포넌트 변경이 있다면 docs/project-overview.md를 업데이트하세요"
else
  pass "docs 동기화 확인 완료"
fi

exit 0
