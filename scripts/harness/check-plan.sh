#!/bin/bash
# scripts/harness/check-plan.sh
# 활성 계획(IN_PROGRESS) 존재 여부 확인
#
# 출력: 활성 계획 파일 경로 (없으면 빈 문자열)
# 종료 코드:
#   0 = 활성 계획 있음 (경로를 stdout으로 출력)
#   1 = 활성 계획 없음

ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
PLANS_DIR="$ROOT/docs/plans"

if [ ! -d "$PLANS_DIR" ]; then
  exit 1
fi

# IN_PROGRESS 상태인 계획 파일 탐색 (가장 최근 것)
ACTIVE=$(find "$PLANS_DIR" -name "*.md" ! -name ".gitkeep" \
         -exec grep -l "^상태: IN_PROGRESS" {} \; 2>/dev/null | \
         sort | tail -1)

if [ -z "$ACTIVE" ]; then
  exit 1
fi

echo "$ACTIVE"
exit 0
