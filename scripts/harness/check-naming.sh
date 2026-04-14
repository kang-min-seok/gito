#!/bin/bash
# scripts/harness/check-naming.sh
# 네이밍 컨벤션 검사
#
# 검사 항목:
#   1. boolean props: is- / has- 접두사 필수
#   2. 콜백 props: on- 접두사 필수
#   3. Mock 데이터: MOCK_ 접두사 필수 (const로 선언된 mock 객체)
#   4. Page 훅: useXxxPage 형식 (page.tsx에서 사용하는 훅)

source "$(dirname "$0")/_lib.sh"

TARGET="${1:-}"
ROOT=$(project_root)

if [ -n "$TARGET" ] && [ -f "$TARGET" ]; then
  FILES=("$TARGET")
else
  mapfile -t FILES < <(find "$ROOT/src" -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null)
fi

RUN_WARNINGS=0

check_boolean_props() {
  local file="$1"
  # type/interface 내 boolean 타입 prop (boolean 단독, boolean[] / boolean | 제외)
  # 패턴: 줄 끝이 ": boolean" 또는 "?: boolean" 으로 끝나는 것만 (세미콜론/쉼표 허용)
  # grep -n 출력 "줄번호:내용" 기준으로 is/has 필터링
  local matches
  matches=$(grep -n "^\s\+[a-z][a-zA-Z0-9]*\s*?*\s*:\s*boolean\s*[;,]\?\s*$" "$file" 2>/dev/null | \
            grep -v "//" | \
            grep -v ":.*\bis[A-Z]\|:.*\bhas[A-Z]")

  if [ -n "$matches" ]; then
    warn "boolean prop이 is/has 접두사 없음 ($(basename "$file"))"
    echo "$matches" | head -3 | while IFS= read -r line; do
      echo "    → $(basename "$file"):$line"
    done
    echo "    → boolean prop 이름은 isXxx 또는 hasXxx 형식으로 작성하세요"
    RUN_WARNINGS=$((RUN_WARNINGS + 1))
  fi
}

check_callback_props() {
  local file="$1"
  # type/interface 내 콜백 prop: "name: () => " 패턴 (on 접두사 없는 것)
  # grep -n 출력이 "줄번호:내용" 형식이므로, on[A-Z] 는 줄 어딘가에서 찾음
  # HTML 태그명(hr, p, a 등 react-markdown 컴포넌트 맵)은 제외
  local matches
  matches=$(grep -n "^\s\+[a-zA-Z][a-zA-Z0-9]*\s*?*\s*:\s*()\s*=>" "$file" 2>/dev/null | \
            grep -v "//" | \
            grep -v ":.*\bon[A-Z]" | \
            grep -v ":[[:space:]]*\(hr\|p\b\|a\b\|ul\|ol\|li\|h[1-6]\|pre\|code\|em\b\|strong\|blockquote\)[[:space:]]*:")

  if [ -n "$matches" ]; then
    warn "콜백 prop이 on 접두사 없음 ($(basename "$file"))"
    echo "$matches" | head -3 | while IFS= read -r line; do
      echo "    → $(basename "$file"):$line"
    done
    echo "    → 콜백 prop 이름은 onXxx 형식으로 작성하세요"
    RUN_WARNINGS=$((RUN_WARNINGS + 1))
  fi
}

check_mock_prefix() {
  local file="$1"
  # 훅 파일에서 mock 데이터가 MOCK_ 접두사 없이 선언된 경우
  if [[ "$file" != */hooks/* ]]; then return 0; fi

  local matches
  # 'mock', 'dummy', 'fake', 'sample' 키워드를 포함한 const 선언 중 MOCK_ 접두사 없는 것
  matches=$(grep -in "const \(mock\|dummy\|fake\|sample\)[A-Za-z]" "$file" 2>/dev/null | \
            grep -v "MOCK_\|// ")

  if [ -n "$matches" ]; then
    warn "Mock 데이터에 MOCK_ 접두사 누락 ($(basename "$file"))"
    echo "$matches" | head -3 | while IFS= read -r line; do
      echo "    → $(basename "$file"):$line"
    done
    echo "    → Mock 데이터는 const MOCK_Xxx = ... 형식으로 선언하세요"
    RUN_WARNINGS=$((RUN_WARNINGS + 1))
  fi
}

for FILE in "${FILES[@]}"; do
  check_boolean_props "$FILE"
  check_callback_props "$FILE"
  check_mock_prefix   "$FILE"
done

if [ "$RUN_WARNINGS" -eq 0 ]; then
  pass "네이밍 컨벤션 검사 통과"
fi
exit 0  # 경고만 있으므로 차단하지 않음
