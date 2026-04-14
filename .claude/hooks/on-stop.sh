#!/bin/bash
# .claude/hooks/on-stop.sh
# Stop 훅 — Claude가 작업을 완료하고 응답을 생성하기 직전에 자동 호출
#
# 역할:
#   1. src/ 변경이 있을 때 단위 테스트 실행 안내
#   2. 통합 테스트 상태 확인
#   3. 커밋 메시지 추천 트리거

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# ── 변경 감지 ─────────────────────────────────────────────────────────────────
SRC_CHANGED=$(git -C "$ROOT" diff --name-only HEAD 2>/dev/null | grep "^src/")
SRC_STAGED=$(git -C "$ROOT" diff --cached --name-only 2>/dev/null | grep "^src/")
ANY_SRC_CHANGE="${SRC_CHANGED}${SRC_STAGED}"

# src/ 변경 없으면 스킵
if [ -z "$ANY_SRC_CHANGE" ]; then
  exit 0
fi

HARNESS="$ROOT/scripts/harness"

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  🔬 하네스 최종 상태 확인 (Stop Hook)        ║"
echo "╚══════════════════════════════════════════════╝"

# ── 활성 계획 확인 ────────────────────────────────────────────────────────────
ACTIVE_PLAN=$(bash "$HARNESS/check-plan.sh" 2>/dev/null)
if [ -n "$ACTIVE_PLAN" ]; then
  echo ""
  echo "  📋 활성 계획: $(basename "$ACTIVE_PLAN")"

  # 구현 단계 진행률
  TOTAL=$(grep -c "^- \[" "$ACTIVE_PLAN" 2>/dev/null | tr -d '[:space:]' || echo 0)
  DONE=$(grep -c "^- \[x\]" "$ACTIVE_PLAN" 2>/dev/null | tr -d '[:space:]' || echo 0)
  [[ "$TOTAL" =~ ^[0-9]+$ ]] || TOTAL=0
  [[ "$DONE" =~ ^[0-9]+$ ]] || DONE=0
  echo "  📊 진행: ${DONE}/${TOTAL} 단계"
fi

# ── 빠른 품질 검사 ────────────────────────────────────────────────────────────
echo ""
GATE_OUTPUT=$(bash "$HARNESS/gate.sh" --fast 2>&1)
GATE_EXIT=$?
echo "$GATE_OUTPUT"

# ── 테스트 안내 ───────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  다음 단계:"
echo ""

# 테스트 러너 존재 확인
if grep -q '"test"' "$ROOT/package.json" 2>/dev/null; then
  echo "  1. 단위 테스트:   bash scripts/harness/test-unit.sh"
  echo "  2. 통합 테스트:   bash scripts/harness/test-integration.sh"
  echo "  3. 커밋 준비:     bash scripts/harness/suggest-commit.sh"
else
  echo "  1. 통합 테스트:   bash scripts/harness/test-integration.sh"
  echo "  2. 커밋 준비:     bash scripts/harness/suggest-commit.sh"
  echo ""
  echo "  ⚠️  단위 테스트 미설정 — 테스트 러너를 설치하세요:"
  echo "      pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom"
fi

if [ -n "$ACTIVE_PLAN" ]; then
  echo ""
  echo "  계획 완료 시: bash scripts/harness/plan.sh --complete"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit 0
