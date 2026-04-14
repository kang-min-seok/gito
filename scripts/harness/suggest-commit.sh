#!/bin/bash
# scripts/harness/suggest-commit.sh
# 커밋 메시지 자동 추천
#
# git diff를 분석해 현재 활성 계획 + 변경 파일 기준으로
# Conventional Commits 형식의 커밋 메시지를 생성한다.
#
# 사용:
#   bash scripts/harness/suggest-commit.sh

source "$(dirname "$0")/_lib.sh"
ROOT=$(project_root)
cd "$ROOT" || exit 1

header "커밋 메시지 추천"

# ── 변경 파일 분석 ────────────────────────────────────────────────────────────
STAGED=$(git diff --cached --name-only 2>/dev/null)
UNSTAGED=$(git diff --name-only 2>/dev/null)
ALL_CHANGED=$(git diff --name-only HEAD 2>/dev/null)

if [ -z "$STAGED" ] && [ -z "$UNSTAGED" ] && [ -z "$ALL_CHANGED" ]; then
  warn "변경된 파일 없음 — 커밋할 내용이 없습니다"
  exit 0
fi

# ── 활성 계획에서 제목 추출 ───────────────────────────────────────────────────
PLAN_FILE=$(bash "$ROOT/scripts/harness/check-plan.sh" 2>/dev/null || echo "")
PLAN_TITLE=""
if [ -n "$PLAN_FILE" ]; then
  PLAN_TITLE=$(grep "^# Plan:" "$PLAN_FILE" 2>/dev/null | sed 's/^# Plan: //')
fi

# ── 변경 유형 추론 ────────────────────────────────────────────────────────────
detect_type() {
  local files="$1"
  local has_src has_test has_docs has_config has_style

  echo "$files" | grep -q "src/features\|src/app\|src/components" && has_src=1
  echo "$files" | grep -q "\.test\.\|\.spec\." && has_test=1
  echo "$files" | grep -q "docs/\|README\|CLAUDE\.md" && has_docs=1
  echo "$files" | grep -q "package\.json\|\.config\.\|\.env\|husky\|harness" && has_config=1
  echo "$files" | grep -q "\.css\|globals\|tailwind" && has_style=1

  if [ "${has_test}" = "1" ] && [ -z "$has_src" ]; then echo "test"
  elif [ -n "$has_src" ] && [ -n "$has_test" ]; then echo "feat"
  elif [ -n "$has_src" ]; then echo "feat"
  elif [ -n "$has_docs" ]; then echo "docs"
  elif [ -n "$has_style" ]; then echo "style"
  elif [ -n "$has_config" ]; then echo "chore"
  else echo "chore"
  fi
}

# ── 변경 파일 요약 ────────────────────────────────────────────────────────────
summarize_changes() {
  local files="$1"
  local items=""

  # 신규 파일
  local new_files
  new_files=$(git status --porcelain 2>/dev/null | grep "^?" | awk '{print $2}' | grep "src/" | head -5)

  # 수정된 중요 파일들
  local modified
  modified=$(echo "$files" | grep "src/\|docs/" | head -8)

  while IFS= read -r f; do
    [ -z "$f" ] && continue
    local basename
    basename=$(basename "$f")
    local dir
    dir=$(dirname "$f" | sed 's|.*/src/||;s|.*/docs/||')
    items="$items\n- $basename ($dir)"
  done <<< "$modified"

  echo -e "$items"
}

TYPE=$(detect_type "$ALL_CHANGED")

# ── 파일 범주별 분류 ─────────────────────────────────────────────────────────
FEAT_FILES=$(echo "$ALL_CHANGED" | grep "src/features" | xargs -I{} basename {} 2>/dev/null | tr '\n' ', ' | sed 's/,$//')
PAGE_FILES=$(echo "$ALL_CHANGED" | grep "src/app" | xargs -I{} basename {} 2>/dev/null | tr '\n' ', ' | sed 's/,$//')
TYPE_FILES=$(echo "$ALL_CHANGED" | grep "src/types\|src/constants" | xargs -I{} basename {} 2>/dev/null | tr '\n' ', ' | sed 's/,$//')
TEST_FILES=$(echo "$ALL_CHANGED" | grep "\.test\." | xargs -I{} basename {} 2>/dev/null | tr '\n' ', ' | sed 's/,$//')
DOC_FILES=$(echo "$ALL_CHANGED"  | grep "docs/" | xargs -I{} basename {} 2>/dev/null | tr '\n' ', ' | sed 's/,$//')

# ── 요약 문장 생성 ────────────────────────────────────────────────────────────
build_summary() {
  if [ -n "$PLAN_TITLE" ]; then
    echo "$PLAN_TITLE"
    return
  fi

  # 계획 없으면 파일 기반으로 추론
  local summary=""
  if [ -n "$FEAT_FILES" ]; then
    summary="${FEAT_FILES%,*}"  # 첫 번째 파일명에서 확장자 제거
    summary=$(echo "$summary" | sed 's/\(use\|Use\)\([A-Z]\)/\2/' | sed 's/\.ts.*//')
  elif [ -n "$PAGE_FILES" ]; then
    summary="$PAGE_FILES 페이지"
  fi
  echo "${summary:-코드 변경}"
}

SUMMARY=$(build_summary)

# ── 커밋 메시지 생성 ──────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}추천 커밋 메시지:${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 제목
echo "${TYPE}: ${SUMMARY}"
echo ""

# 본문 bullet
[ -n "$FEAT_FILES" ]  && echo "- features: $FEAT_FILES"
[ -n "$PAGE_FILES" ]  && echo "- pages: $PAGE_FILES"
[ -n "$TYPE_FILES" ]  && echo "- types/constants: $TYPE_FILES"
[ -n "$TEST_FILES" ]  && echo "- tests: $TEST_FILES"
[ -n "$DOC_FILES" ]   && echo "- docs: $DOC_FILES"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 사전 확인 체크리스트 ──────────────────────────────────────────────────────
echo -e "${BOLD}커밋 전 체크리스트:${NC}"
echo ""

# 단위 테스트 통과 여부 (로그에서 확인)
LOG_FILE=""
if [ -n "$PLAN_FILE" ]; then
  PLAN_BASENAME=$(basename "$PLAN_FILE" .md)
  LOG_FILE="$ROOT/docs/logs/${PLAN_BASENAME}.log.md"
fi

if [ -n "$LOG_FILE" ] && [ -f "$LOG_FILE" ]; then
  LAST_TEST=$(grep "TEST" "$LOG_FILE" 2>/dev/null | tail -1)
  if echo "$LAST_TEST" | grep -q "PASS"; then
    echo -e "  ${GREEN}✓${NC} 단위 테스트 PASS (로그 확인)"
  else
    echo -e "  ${YELLOW}?${NC} 단위 테스트 — bash scripts/harness/test-unit.sh"
  fi
else
  echo -e "  ${YELLOW}?${NC} 단위 테스트 — bash scripts/harness/test-unit.sh"
fi

# 빌드 여부
if [ -n "$LOG_FILE" ] && [ -f "$LOG_FILE" ]; then
  LAST_BUILD=$(grep "pnpm build SUCCESS\|Build SUCCESS" "$LOG_FILE" 2>/dev/null | tail -1)
  if [ -n "$LAST_BUILD" ]; then
    echo -e "  ${GREEN}✓${NC} 빌드 SUCCESS (로그 확인)"
  else
    echo -e "  ${YELLOW}?${NC} 빌드 — bash scripts/harness/test-integration.sh --build"
  fi
else
  echo -e "  ${YELLOW}?${NC} 빌드 — bash scripts/harness/test-integration.sh"
fi

# 계획 완료 여부
if [ -n "$PLAN_FILE" ]; then
  echo -e "  ${YELLOW}!${NC} 계획 완료 처리 — bash scripts/harness/plan.sh --complete"
else
  echo -e "  ${GREEN}✓${NC} 활성 계획 없음"
fi

echo ""
info "위 항목 확인 후: git add . && git commit"
echo ""
