#!/bin/bash
# scripts/harness/test-unit.sh
# 단위 테스트 실행
#
# 사용:
#   bash scripts/harness/test-unit.sh           # 전체 단위 테스트
#   bash scripts/harness/test-unit.sh --watch   # 감시 모드
#   bash scripts/harness/test-unit.sh --related # git 변경 파일 관련 테스트만

source "$(dirname "$0")/_lib.sh"
ROOT=$(project_root)
cd "$ROOT" || exit 1

MODE="${1:-}"

header "단위 테스트"

# ── 테스트 러너 확인 ─────────────────────────────────────────────────────────
detect_runner() {
  if grep -q '"test"' package.json 2>/dev/null; then
    return 0
  fi
  return 1
}

if ! detect_runner; then
  warn "테스트 러너가 설정되지 않았습니다"
  echo ""
  echo "  이 프로젝트에 단위 테스트가 아직 설정되지 않았습니다."
  echo "  아래 명령으로 Vitest를 설치하세요:"
  echo ""
  echo "  pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom"
  echo ""
  echo "  그리고 package.json에 추가:"
  echo '  "scripts": { "test": "vitest run", "test:watch": "vitest" }'
  echo ""
  echo "  설정 파일 생성:"
  echo "  bash scripts/harness/setup-vitest.sh"
  echo ""
  exit 1
fi

# ── 테스트 실행 ───────────────────────────────────────────────────────────────
LOG_ENTRY=""

case "$MODE" in
  --watch)
    info "감시 모드로 테스트 실행..."
    pnpm test:watch
    exit $?
    ;;
  --related)
    info "변경 파일 관련 테스트 실행..."
    CHANGED=$(git diff --name-only HEAD 2>/dev/null | grep "src/" | grep -v "\.test\.")
    if [ -z "$CHANGED" ]; then
      info "변경된 src/ 파일 없음"
      exit 0
    fi
    TEST_OUTPUT=$(pnpm test --changed 2>&1)
    EXIT=$?
    ;;
  *)
    info "전체 단위 테스트 실행..."
    TEST_OUTPUT=$(pnpm test 2>&1)
    EXIT=$?
    ;;
esac

# ── 결과 출력 ─────────────────────────────────────────────────────────────────
echo "$TEST_OUTPUT"

# 결과 요약 추출 (Vitest/Jest 공통 패턴)
PASS_COUNT=$(echo "$TEST_OUTPUT" | grep -oE "[0-9]+ passed" | tail -1)
FAIL_COUNT=$(echo "$TEST_OUTPUT" | grep -oE "[0-9]+ failed" | tail -1)

echo ""
if [ $EXIT -eq 0 ]; then
  pass "단위 테스트 PASS${PASS_COUNT:+ — $PASS_COUNT}"
  LOG_ENTRY="단위 테스트 PASS${PASS_COUNT:+ ($PASS_COUNT)}"
  # 로그 기록
  bash "$ROOT/scripts/harness/log.sh" "TEST" "$LOG_ENTRY" 2>/dev/null || true
  exit 0
else
  fail "단위 테스트 FAIL${FAIL_COUNT:+ — $FAIL_COUNT}"
  echo ""
  echo "  → 실패한 테스트를 수정하고 다시 실행하세요"
  echo "  → 테스트 없이 다음 단계로 넘어갈 수 없습니다"
  LOG_ENTRY="단위 테스트 FAIL${FAIL_COUNT:+ ($FAIL_COUNT)}"
  bash "$ROOT/scripts/harness/log.sh" "TEST" "$LOG_ENTRY" 2>/dev/null || true
  exit 1
fi
