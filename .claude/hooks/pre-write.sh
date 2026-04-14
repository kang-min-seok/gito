#!/bin/bash
# .claude/hooks/pre-write.sh
# PreToolUse 훅 — Write / Edit 실행 전 자동 호출
#
# 역할: src/ 파일을 수정하기 전에 활성 계획(IN_PROGRESS) 존재 여부를 검사한다.
#       계획 없이 코드를 작성하는 것을 차단한다.
#
# 예외: docs/, scripts/, .claude/, CLAUDE.md, *.config.* 파일은 계획 불필요

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

# ── 계획 필요 여부 판단 ───────────────────────────────────────────────────────
# src/ 하위 TS/TSX 파일만 검사
if [[ "$FILE_PATH" != */src/* ]]; then exit 0; fi
if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx ]]; then exit 0; fi

# 하네스 자체 파일 제외
if [[ "$FILE_PATH" == */harness/* ]]; then exit 0; fi

ROOT=$(git -C "$(dirname "$FILE_PATH")" rev-parse --show-toplevel 2>/dev/null || \
       git rev-parse --show-toplevel 2>/dev/null)

if [ -z "$ROOT" ]; then exit 0; fi

# ── 활성 계획 확인 ────────────────────────────────────────────────────────────
ACTIVE_PLAN=$(bash "$ROOT/scripts/harness/check-plan.sh" 2>/dev/null)

if [ -n "$ACTIVE_PLAN" ]; then
  # 계획 있음 → 허용
  exit 0
fi

# ── 계획 없음 → 차단 ─────────────────────────────────────────────────────────
echo ""
echo "🚫 [HARNESS BLOCK] 활성 계획(IN_PROGRESS)이 없습니다"
echo ""
echo "  src/ 파일을 수정하기 전에 계획 문서를 먼저 작성해야 합니다."
echo ""
echo "  ① 계획 생성:"
echo "     bash scripts/harness/plan.sh \"기능명\""
echo ""
echo "  ② 생성된 파일에 목표, 영향 파일, 구현 단계, 테스트 계획 작성"
echo ""
echo "  ③ 상태를 변경:"
echo "     상태: DRAFT  →  상태: IN_PROGRESS"
echo ""
echo "  ④ 구현 시작"
echo ""
echo "  현재 계획 목록: bash scripts/harness/plan.sh --list"
echo ""

exit 2
