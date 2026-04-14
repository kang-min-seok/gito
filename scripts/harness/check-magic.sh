#!/bin/bash
# scripts/harness/check-magic.sh
# 매직 스트링 / 매직 넘버 위반 탐지
#
# 검사 항목:
#   1. sessionStorage/localStorage 키를 문자열 리터럴로 직접 사용 (상수 불가)
#   2. TypeScript/TSX 파일 내 인라인 hex 색상 (CSS 변수 사용 규칙 위반)
#   3. GitHub 이슈 레이블('epic','story','task')을 문자열 리터럴로 직접 사용

source "$(dirname "$0")/_lib.sh"

TARGET="${1:-}"
ROOT=$(project_root)
ERRORS=0
WARNINGS=0

# ── 대상 파일 목록 결정 ───────────────────────────────────────────────────────
if [ -n "$TARGET" ] && [ -f "$TARGET" ]; then
  FILES=("$TARGET")
else
  mapfile -t FILES < <(find "$ROOT/src" -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null)
fi

# ── 검사 1: 인라인 스토리지 키 ───────────────────────────────────────────────
check_storage_keys() {
  local file="$1"
  # gito_로 시작하는 스토리지 키를 문자열 리터럴로 사용하는 패턴 탐지
  local matches
  matches=$(grep -n "(sessionStorage\|localStorage)\.\(getItem\|setItem\|removeItem\)(['\"]gito_" "$file" 2>/dev/null)
  if [ -n "$matches" ]; then
    fail "인라인 스토리지 키 발견 — 상수(PLANNING_STORAGE_KEY 등) 사용 필요"
    echo "$matches" | while IFS= read -r line; do
      echo "    → $file:$line"
    done
    ERRORS=$((ERRORS + 1))
    return 1
  fi
  return 0
}

# ── 검사 2: 인라인 hex 색상 ──────────────────────────────────────────────────
check_hex_colors() {
  local file="$1"
  # 주석 제외 후 hex 색상 패턴 탐지 (CSS 파일 제외)
  if [[ "$file" == *.css ]]; then return 0; fi

  local matches
  # 문자열 리터럴 내 hex 색상 패턴: '#' + 3 or 6 hex digits
  matches=$(grep -n "'#[0-9a-fA-F]\{3,6\}'\|\"#[0-9a-fA-F]\{3,6\}\"" "$file" 2>/dev/null | grep -v "//.*#[0-9a-fA-F]")
  if [ -n "$matches" ]; then
    warn "인라인 hex 색상 발견 — CSS 변수(var(--color-*)) 사용 권장"
    echo "$matches" | head -5 | while IFS= read -r line; do
      echo "    → $(basename "$file"):$line"
    done
    WARNINGS=$((WARNINGS + 1))
    return 1
  fi
  return 0
}

# ── 검사 3: 인라인 이슈 레이블 ───────────────────────────────────────────────
check_issue_labels() {
  local file="$1"
  # schemas.ts, prompt.ts는 레이블 정의 파일이므로 제외
  local basename
  basename=$(basename "$file")
  if [[ "$basename" == "schemas.ts" ]] || [[ "$basename" == "prompt.ts" ]]; then
    return 0
  fi

  # constants/github.ts도 제외
  if [[ "$file" == */constants/github.ts ]]; then return 0; fi

  local matches
  matches=$(grep -n "labels.*['\"]epic['\"\|]\|labels.*['\"]story['\"\|]\|labels.*['\"]task['\"\|]" "$file" 2>/dev/null)
  if [ -n "$matches" ]; then
    warn "이슈 레이블 리터럴 발견 — ISSUE_LABEL.EPIC/STORY/TASK 상수 사용 권장"
    echo "$matches" | head -3 | while IFS= read -r line; do
      echo "    → $(basename "$file"):$line"
    done
    WARNINGS=$((WARNINGS + 1))
  fi
}

# ── 실행 ──────────────────────────────────────────────────────────────────────
RUN_ERRORS=0
RUN_WARNINGS=0

for FILE in "${FILES[@]}"; do
  # globals.css는 hex 검사 제외
  check_storage_keys "$FILE" || RUN_ERRORS=$((RUN_ERRORS + 1))
  check_hex_colors   "$FILE" || RUN_WARNINGS=$((RUN_WARNINGS + 1))
  check_issue_labels "$FILE"
done

if [ "$RUN_ERRORS" -eq 0 ] && [ "$RUN_WARNINGS" -eq 0 ]; then
  pass "매직 스트링/넘버 검사 통과"
  exit 0
elif [ "$RUN_ERRORS" -gt 0 ]; then
  exit 1
else
  exit 0  # 경고만 있을 때는 차단하지 않음
fi
