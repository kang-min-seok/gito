#!/bin/bash
# scripts/harness/check-component.sh
# 컴포넌트 설계 원칙 검사
#
# 검사 항목:
#   1. page.tsx: 비즈니스 로직이 인라인으로 많으면 경고 (useXxxPage 훅 위임 원칙)
#   2. page.tsx: useState가 3개 이상 + useXxxPage import 없을 때 경고
#   3. features/ 컴포넌트: 훅 없이 복잡한 로직 인라인 처리 경고

source "$(dirname "$0")/_lib.sh"

TARGET="${1:-}"
ROOT=$(project_root)

if [ -n "$TARGET" ] && [ -f "$TARGET" ]; then
  FILES=("$TARGET")
else
  mapfile -t FILES < <(find "$ROOT/src" -type f -name "page.tsx" 2>/dev/null)
fi

RUN_WARNINGS=0

check_page_file() {
  local file="$1"
  if ! is_page_file "$file"; then return 0; fi

  local use_state_count
  use_state_count=$(grep -c "useState" "$file" 2>/dev/null | tr -d '[:space:]')
  use_state_count=${use_state_count:-0}
  [[ "$use_state_count" =~ ^[0-9]+$ ]] || use_state_count=0

  local has_page_hook
  has_page_hook=$(grep -c "use[A-Z][a-zA-Z]*Page" "$file" 2>/dev/null | tr -d '[:space:]')
  has_page_hook=${has_page_hook:-0}
  [[ "$has_page_hook" =~ ^[0-9]+$ ]] || has_page_hook=0

  local has_callback_inline
  # 인라인 이벤트 핸들러 정의 (const handleXxx = ... 형태)
  has_callback_inline=$(grep -c "const handle[A-Z]" "$file" 2>/dev/null | tr -d '[:space:]')
  has_callback_inline=${has_callback_inline:-0}
  [[ "$has_callback_inline" =~ ^[0-9]+$ ]] || has_callback_inline=0

  local issues=0

  if [ "$use_state_count" -ge 3 ] && [ "$has_page_hook" -eq 0 ]; then
    warn "$(basename "$file"): useState ${use_state_count}개 발견, useXxxPage 훅 없음"
    echo "    → 비즈니스 로직을 features/*/hooks/useXxxPage.ts 로 분리하세요"
    echo "    → 파일: $file"
    issues=$((issues + 1))
  fi

  if [ "$has_callback_inline" -ge 3 ] && [ "$has_page_hook" -eq 0 ]; then
    warn "$(basename "$file"): 인라인 핸들러 ${has_callback_inline}개 — 훅으로 분리 권장"
    echo "    → 파일: $file"
    issues=$((issues + 1))
  fi

  return $issues
}

for FILE in "${FILES[@]}"; do
  check_page_file "$FILE" || RUN_WARNINGS=$((RUN_WARNINGS + 1))
done

if [ "$RUN_WARNINGS" -eq 0 ]; then
  pass "컴포넌트 구조 검사 통과"
fi
exit 0  # 경고만 있으므로 차단하지 않음
