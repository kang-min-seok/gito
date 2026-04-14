#!/bin/bash
# .claude/hooks/on-file-edit.sh
# PostToolUse 훅 — Write / Edit 실행 후 자동 호출
#
# 역할:
#   1. 파일 수정을 개발 로그에 자동 기록
#   2. src/ TS/TSX 파일에 대해 코드 품질 검사 실행 (매직 스트링, 네이밍 등)

HOOK_INPUT=$(cat)

FILE_PATH=$(node -e "
const c=[];
process.stdin.on('data',d=>c.push(d.toString()));
process.stdin.on('end',()=>{
  try{
    const data=JSON.parse(c.join(''));
    process.stdout.write(data.tool_input?.file_path||'');
  }catch(e){ process.stdout.write(''); }
});
" <<< "$HOOK_INPUT" 2>/dev/null)

if [ -z "$FILE_PATH" ]; then exit 0; fi

ROOT=$(git -C "$(dirname "$FILE_PATH")" rev-parse --show-toplevel 2>/dev/null || \
       git rev-parse --show-toplevel 2>/dev/null)

if [ -z "$ROOT" ]; then exit 0; fi

HARNESS="$ROOT/scripts/harness"

# ── 1. 자동 로그 기록 ────────────────────────────────────────────────────────
if [[ "$FILE_PATH" == */src/* ]]; then
  RELATIVE_PATH="${FILE_PATH#$ROOT/}"
  bash "$HARNESS/log.sh" "AUTO" "파일 수정: $RELATIVE_PATH" 2>/dev/null || true
fi

# ── 2. src/ TS/TSX 파일만 품질 검사 ─────────────────────────────────────────
if [[ "$FILE_PATH" != */src/* ]]; then exit 0; fi
if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx ]]; then exit 0; fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 하네스 검사: $(basename "$FILE_PATH")"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ANY_ISSUE=false

# ── 매직 스트링 / 넘버 ────────────────────────────────────────────────────────
RESULT=$(bash "$HARNESS/check-magic.sh" "$FILE_PATH" 2>&1)
EXIT=$?
if [ $EXIT -ne 0 ] || echo "$RESULT" | grep -q "HARNESS"; then
  echo "$RESULT"
  ANY_ISSUE=true
fi

# ── 네이밍 컨벤션 ─────────────────────────────────────────────────────────────
RESULT=$(bash "$HARNESS/check-naming.sh" "$FILE_PATH" 2>&1)
if echo "$RESULT" | grep -q "HARNESS"; then
  echo "$RESULT"
  ANY_ISSUE=true
fi

# ── 컴포넌트 구조 (page.tsx만) ───────────────────────────────────────────────
if [[ "$FILE_PATH" == */app/*/page.tsx ]] || [[ "$FILE_PATH" == */app/page.tsx ]]; then
  RESULT=$(bash "$HARNESS/check-component.sh" "$FILE_PATH" 2>&1)
  if echo "$RESULT" | grep -q "HARNESS"; then
    echo "$RESULT"
    ANY_ISSUE=true
  fi
fi

# ── docs 동기화 알림 ─────────────────────────────────────────────────────────
RESULT=$(bash "$HARNESS/check-docs.sh" "$FILE_PATH" 2>&1)
if echo "$RESULT" | grep -q "HARNESS"; then
  echo "$RESULT"
  ANY_ISSUE=true
fi

# ── 테스트 파일 존재 알림 ────────────────────────────────────────────────────
if [[ "$FILE_PATH" == */hooks/*.ts || "$FILE_PATH" == */utils/*.ts ]]; then
  if [[ "$FILE_PATH" != *.test.* ]]; then
    BASE="${FILE_PATH%.ts}"
    if [ ! -f "${BASE}.test.ts" ] && [ ! -f "${BASE}.test.tsx" ]; then
      echo ""
      echo "⚠️ [HARNESS WARN] 테스트 파일 없음: $(basename "$FILE_PATH")"
      echo "   → 필요: ${BASE}.test.ts"
      echo "   → 구현 완료 후 단위 테스트를 작성하세요"
      ANY_ISSUE=true
    fi
  fi
fi

if ! $ANY_ISSUE; then
  echo "✓ 검사 통과"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit 0
