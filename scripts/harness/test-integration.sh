#!/bin/bash
# scripts/harness/test-integration.sh
# 통합 테스트: lint → TypeScript → build → E2E
#
# 각 단계가 실패하면 다음 단계를 실행하지 않는다.
# 모든 단계 통과 시에만 종료 코드 0 반환.
#
# 사용:
#   bash scripts/harness/test-integration.sh           # 전체 실행
#   bash scripts/harness/test-integration.sh --lint    # lint만
#   bash scripts/harness/test-integration.sh --build   # TypeScript + build만
#   bash scripts/harness/test-integration.sh --e2e     # E2E만

source "$(dirname "$0")/_lib.sh"
ROOT=$(project_root)
cd "$ROOT" || exit 1

MODE="${1:-}"
TOTAL_FAIL=0

log_result() {
  local type="$1"
  local msg="$2"
  bash "$ROOT/scripts/harness/log.sh" "$type" "$msg" 2>/dev/null || true
}

# ── Step 1: Lint ──────────────────────────────────────────────────────────────
run_lint() {
  header "Step 1 / 3 — ESLint"

  if ! grep -q '"lint"' package.json 2>/dev/null; then
    warn "lint 스크립트 없음 — 건너뜀"
    return 0
  fi

  LINT_OUTPUT=$(pnpm lint 2>&1)
  LINT_EXIT=$?

  if [ $LINT_EXIT -eq 0 ]; then
    pass "ESLint 통과"
    log_result "BUILD" "ESLint PASS"
    return 0
  else
    fail "ESLint 실패"
    echo "$LINT_OUTPUT" | head -30
    log_result "BUILD" "ESLint FAIL"
    return 1
  fi
}

# ── Step 2: TypeScript + Build ────────────────────────────────────────────────
run_build() {
  header "Step 2 / 3 — TypeScript + Build"

  # TypeScript 타입 검사
  info "TypeScript 타입 검사..."
  TSC_OUTPUT=$(pnpm tsc --noEmit 2>&1)
  TSC_EXIT=$?

  if [ $TSC_EXIT -ne 0 ]; then
    fail "TypeScript 타입 에러"
    echo "$TSC_OUTPUT" | head -20
    log_result "BUILD" "TypeScript FAIL — $(echo "$TSC_OUTPUT" | grep -c "error TS") 에러"
    return 1
  fi
  pass "TypeScript 타입 검사 통과"

  # Next.js 빌드
  info "Next.js 빌드..."
  BUILD_OUTPUT=$(pnpm build 2>&1)
  BUILD_EXIT=$?

  if [ $BUILD_EXIT -eq 0 ]; then
    pass "빌드 성공"
    # 빌드 크기 요약 추출
    ROUTE_COUNT=$(echo "$BUILD_OUTPUT" | grep -c "^[○●λ]" 2>/dev/null || echo "?")
    log_result "BUILD" "pnpm build SUCCESS — 라우트 ${ROUTE_COUNT}개"
    return 0
  else
    fail "빌드 실패"
    echo "$BUILD_OUTPUT" | grep -A3 "Error\|error" | head -30
    log_result "BUILD" "pnpm build FAIL"
    return 1
  fi
}

# ── Step 3: E2E ───────────────────────────────────────────────────────────────
run_e2e() {
  header "Step 3 / 3 — E2E 테스트"

  # Playwright 설정 확인
  if [ ! -f "$ROOT/playwright.config.ts" ] && [ ! -f "$ROOT/playwright.config.js" ]; then
    info "Playwright 미설정 — E2E 건너뜀"
    echo "    (선택): pnpm add -D @playwright/test && npx playwright install"
    return 0
  fi

  if ! grep -q '"e2e"\|"test:e2e"\|"playwright"' package.json 2>/dev/null; then
    info "E2E 스크립트 미설정 — 건너뜀"
    return 0
  fi

  info "E2E 테스트 실행..."
  E2E_OUTPUT=$(pnpm e2e 2>&1)
  E2E_EXIT=$?

  if [ $E2E_EXIT -eq 0 ]; then
    pass "E2E 테스트 통과"
    log_result "TEST" "E2E PASS"
    return 0
  else
    fail "E2E 테스트 실패"
    echo "$E2E_OUTPUT" | tail -20
    log_result "TEST" "E2E FAIL"
    return 1
  fi
}

# ── 모드별 실행 ───────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║       통합 테스트 실행               ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════╝${NC}"

case "$MODE" in
  --lint)
    run_lint || exit 1
    ;;
  --build)
    run_build || exit 1
    ;;
  --e2e)
    run_e2e || exit 1
    ;;
  *)
    # 전체 실행 — 하나라도 실패하면 중단
    run_lint    || { TOTAL_FAIL=$((TOTAL_FAIL+1)); echo ""; echo "  lint 실패로 중단."; exit 1; }
    run_build   || { TOTAL_FAIL=$((TOTAL_FAIL+1)); echo ""; echo "  build 실패로 중단."; exit 1; }
    run_e2e     || { TOTAL_FAIL=$((TOTAL_FAIL+1)); }
    ;;
esac

echo ""
if [ $TOTAL_FAIL -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✓ 통합 테스트 전체 통과${NC}"
  echo ""
  info "다음: bash scripts/harness/suggest-commit.sh"
  exit 0
else
  echo -e "${RED}${BOLD}✗ 통합 테스트 실패${NC}"
  exit 1
fi
