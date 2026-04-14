#!/bin/bash
# scripts/harness/gate.sh
# 마스터 품질 게이트
#
# 사용:
#   bash scripts/harness/gate.sh           # 전체 검사 (TypeScript 포함)
#   bash scripts/harness/gate.sh --fast    # TypeScript 빌드 제외

source "$(dirname "$0")/_lib.sh"

ROOT=$(project_root)
FAST_MODE=false
[ "${1:-}" = "--fast" ] && FAST_MODE=true

TOTAL_ERRORS=0

echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║   Gito Harness Gate 품질 검사        ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════╝${NC}\n"

run_check() {
  local name="$1"; local script="$2"; shift 2
  header "$name"
  bash "$ROOT/scripts/harness/$script" "$@"
  local exit_code=$?
  [ $exit_code -ne 0 ] && TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
  return $exit_code
}

# ── 0. 계획 상태 ──────────────────────────────────────────────────────────────
header "계획 상태"
ACTIVE_PLAN=$(bash "$ROOT/scripts/harness/check-plan.sh" 2>/dev/null)
if [ -n "$ACTIVE_PLAN" ]; then
  pass "활성 계획: $(basename "$ACTIVE_PLAN")"
else
  info "활성 계획 없음"
fi

# ── 1. 매직 스트링 ────────────────────────────────────────────────────────────
run_check "매직 스트링 검사" check-magic.sh

# ── 2. 컴포넌트 구조 ─────────────────────────────────────────────────────────
run_check "컴포넌트 구조 검사" check-component.sh

# ── 3. 네이밍 컨벤션 ─────────────────────────────────────────────────────────
run_check "네이밍 컨벤션 검사" check-naming.sh

# ── 4. 임포트 규칙 (인라인) ──────────────────────────────────────────────────
header "임포트 규칙 검사"
IMPORT_WARNS=0
mapfile -t FEAT_FILES < <(find "$ROOT/src/features" -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null)
for FILE in "${FEAT_FILES[@]}"; do
  FEAT_DIR=$(echo "$FILE" | grep -o "features/[^/]*" | head -1)
  [ -z "$FEAT_DIR" ] && continue
  MATCHES=$(grep -n "from.*features/" "$FILE" 2>/dev/null | grep -v "$FEAT_DIR\|// ")
  if [ -n "$MATCHES" ]; then
    warn "cross-feature 직접 임포트 ($(basename "$FILE"))"
    echo "$MATCHES" | head -2 | while IFS= read -r line; do echo "    → $(basename "$FILE"):$line"; done
    echo "    → 공통 타입은 src/types/ 로 이동하세요"
    IMPORT_WARNS=$((IMPORT_WARNS + 1))
  fi
done
[ $IMPORT_WARNS -eq 0 ] && pass "임포트 규칙 검사 통과"

# ── 5. 테스트 파일 존재 (인라인) ─────────────────────────────────────────────
header "테스트 파일 존재 검사"
MISSING_TESTS=0
mapfile -t TEST_TARGETS < <(find "$ROOT/src" -type f -name "*.ts" \
  \( -path "*/hooks/*" -o -path "*/utils/*" \) \
  ! -name "*.test.*" ! -name "*.d.ts" 2>/dev/null)
for FILE in "${TEST_TARGETS[@]}"; do
  BASE="${FILE%.ts}"
  if [ ! -f "${BASE}.test.ts" ] && [ ! -f "${BASE}.test.tsx" ]; then
    warn "테스트 없음: $(basename "$FILE")"
    echo "    → 필요: ${BASE}.test.ts"
    MISSING_TESTS=$((MISSING_TESTS + 1))
  fi
done
if [ $MISSING_TESTS -eq 0 ]; then
  pass "테스트 파일 존재 검사 통과"
else
  echo "  → ${MISSING_TESTS}개 파일에 테스트 없음. docs/rules/test.md 참조"
fi

# ── 6. docs 동기화 ───────────────────────────────────────────────────────────
run_check "docs 동기화 검사" check-docs.sh

# ── 7. TypeScript (--fast 시 생략) ────────────────────────────────────────────
if ! $FAST_MODE; then
  header "TypeScript 타입 검사"
  cd "$ROOT"
  TSC_OUTPUT=$(pnpm tsc --noEmit 2>&1)
  if [ $? -eq 0 ]; then
    pass "TypeScript 타입 검사 통과"
  else
    fail "TypeScript 타입 에러"
    echo "$TSC_OUTPUT" | head -15
    TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
  fi
else
  info "TypeScript 검사 생략 (--fast)"
fi

# ── 결과 ──────────────────────────────────────────────────────────────────────
echo -e "\n${BOLD}${CYAN}── 결과 ────────────────────────────────────${NC}"
if [ $TOTAL_ERRORS -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✓ 모든 검사 통과${NC}\n"
  exit 0
else
  echo -e "${RED}${BOLD}✗ ${TOTAL_ERRORS}개 검사 실패${NC}\n"
  exit 1
fi
