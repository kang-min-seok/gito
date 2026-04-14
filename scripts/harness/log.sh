#!/bin/bash
# scripts/harness/log.sh
# 개발 로그 항목 추가
#
# 사용:
#   bash scripts/harness/log.sh <TYPE> "<메시지>"
#   bash scripts/harness/log.sh --show          # 현재 로그 출력
#   bash scripts/harness/log.sh --tail [N]       # 마지막 N개 항목 출력 (기본 10)
#
# TYPE:
#   IMPL     - 구현 내용
#   TEST     - 테스트 실행 결과
#   BUILD    - 빌드 실행 결과
#   FIX      - 버그 수정
#   DECISION - 설계 결정 이유
#   ISSUE    - 발생한 문제 기록
#   AUTO     - 하네스 자동 기록 (파일 수정 이벤트)

source "$(dirname "$0")/_lib.sh"
ROOT=$(project_root)
LOGS_DIR="$ROOT/docs/logs"
mkdir -p "$LOGS_DIR"

# ── 활성 로그 파일 경로 결정 ──────────────────────────────────────────────────
get_log_file() {
  local active_plan
  active_plan=$(bash "$ROOT/scripts/harness/check-plan.sh" 2>/dev/null)
  if [ -z "$active_plan" ]; then
    # 계획 없을 때는 날짜 기준 임시 로그
    echo "$LOGS_DIR/$(date '+%Y%m%d')-session.log.md"
    return
  fi
  local plan_basename
  plan_basename=$(basename "$active_plan" .md)
  echo "$LOGS_DIR/${plan_basename}.log.md"
}

init_log_file() {
  local log_file="$1"
  local active_plan="$2"
  if [ ! -f "$log_file" ]; then
    mkdir -p "$(dirname "$log_file")"
    {
      echo "# 개발 로그: $(basename "$log_file" .log.md)"
      echo ""
      if [ -n "$active_plan" ]; then
        echo "계획: $active_plan"
      fi
      echo "시작: $(date '+%Y-%m-%d %H:%M:%S')"
      echo ""
      echo "---"
      echo ""
    } > "$log_file"
  fi
}

LOG_FILE=$(get_log_file)
ACTIVE_PLAN=$(bash "$ROOT/scripts/harness/check-plan.sh" 2>/dev/null || echo "")

# ── --show ────────────────────────────────────────────────────────────────────
if [ "${1:-}" = "--show" ]; then
  if [ ! -f "$LOG_FILE" ]; then
    info "로그 없음: $LOG_FILE"
    exit 0
  fi
  cat "$LOG_FILE"
  exit 0
fi

# ── --tail ────────────────────────────────────────────────────────────────────
if [ "${1:-}" = "--tail" ]; then
  N="${2:-10}"
  if [ ! -f "$LOG_FILE" ]; then
    info "로그 없음"
    exit 0
  fi
  # 마지막 N개의 ## 섹션 출력
  awk '/^## /{count++} count>0{print}' "$LOG_FILE" | \
    awk -v n="$N" 'BEGIN{buf=""} /^## /{entries[++i]=buf; buf=""} {buf=buf"\n"$0} END{start=(i-n+1<1)?1:i-n+1; for(j=start;j<=i;j++) print entries[j]; print buf}' 2>/dev/null || \
    tail -50 "$LOG_FILE"
  exit 0
fi

# ── 로그 항목 추가 ────────────────────────────────────────────────────────────
TYPE="${1:-INFO}"
MESSAGE="${2:-}"

if [ -z "$MESSAGE" ]; then
  echo ""
  fail "메시지를 입력하세요"
  echo ""
  echo "  사용법: bash scripts/harness/log.sh <TYPE> \"<메시지>\""
  echo ""
  echo "  TYPE: IMPL | TEST | BUILD | FIX | DECISION | ISSUE | AUTO"
  echo ""
  echo "  예시:"
  echo "    bash scripts/harness/log.sh IMPL \"useIssuesPage 훅 생성 — 상태 관리 로직 분리\""
  echo "    bash scripts/harness/log.sh TEST \"useIssuesPage 단위 테스트 3건 PASS\""
  echo "    bash scripts/harness/log.sh FIX \"SplitIssuesResult 타입 불일치 수정\""
  echo ""
  exit 1
fi

init_log_file "$LOG_FILE" "$ACTIVE_PLAN"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# 타입별 이모지
case "$TYPE" in
  IMPL)     ICON="⚙️" ;;
  TEST)     ICON="🧪" ;;
  BUILD)    ICON="🏗️" ;;
  FIX)      ICON="🔧" ;;
  DECISION) ICON="💡" ;;
  ISSUE)    ICON="🚨" ;;
  AUTO)     ICON="🤖" ;;
  *)        ICON="📝" ;;
esac

{
  echo "## ${TIMESTAMP} — ${ICON} ${TYPE}"
  echo ""
  echo "${MESSAGE}"
  echo ""
} >> "$LOG_FILE"

pass "로그 기록: [$TYPE] $MESSAGE"
