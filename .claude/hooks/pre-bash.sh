#!/bin/bash
# .claude/hooks/pre-bash.sh
# PreToolUse 훅 — Bash 도구 실행 전 자동 호출
#
# 역할: 위험한 bash 명령어를 실행 전에 차단하거나 경고한다.
#       exit 2 → 실행 차단 + 이유 출력
#       exit 0 → 실행 허용
#
# 입력: stdin으로 tool 실행 데이터(JSON) 수신

HOOK_INPUT=$(cat)

COMMAND=$(node -e "
const c=[];
process.stdin.on('data',d=>c.push(d.toString()));
process.stdin.on('end',()=>{
  try{
    const data=JSON.parse(c.join(''));
    process.stdout.write(data.tool_input?.command||'');
  }catch(e){ process.stdout.write(''); }
});
" <<< "$HOOK_INPUT" 2>/dev/null)

if [ -z "$COMMAND" ]; then exit 0; fi

# ── 위험 패턴 정의 ────────────────────────────────────────────────────────────

# [BLOCK] 즉시 차단 패턴
block_if_matches() {
  local pattern="$1"
  local reason="$2"
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo ""
    echo "🚫 [HARNESS BLOCK] 위험한 명령어 차단"
    echo "   명령어: $COMMAND"
    echo "   이유: $reason"
    echo ""
    exit 2
  fi
}

# src/ 전체 삭제
block_if_matches "rm\s+-rf\s+\.?\/?src" \
  "src/ 디렉토리 전체 삭제 — 절대 불가"

# 프로젝트 루트 전체 삭제
block_if_matches "rm\s+-rf\s+\.($|\s)" \
  "프로젝트 루트 전체 삭제 — 절대 불가"

# git force push (main/dev/master 브랜치)
block_if_matches "git\s+push\s+.*(--force|-f)\s+.*(main|master|dev)" \
  "main/dev 브랜치에 force push — 절대 불가"

block_if_matches "git\s+push\s+(origin\s+)?(main|master|dev)\s+.*(-f|--force)" \
  "main/dev 브랜치에 force push — 절대 불가"

# git reset --hard (원격 추적 브랜치에)
block_if_matches "git\s+reset\s+--hard\s+(origin|upstream)/(main|master|dev)" \
  "원격 main/dev 브랜치로 hard reset — 허용되지 않음"

# .env 파일 덮어쓰기
block_if_matches "echo\s+.*>\s+\.env$|cat\s+.*>\s+\.env$" \
  ".env 파일 덮어쓰기 — 민감 정보 손실 위험"

# node_modules / .next 강제 삭제는 허용 (재설치 가능)
# husky --no-verify 차단
block_if_matches "git\s+commit\s+.*--no-verify" \
  "--no-verify로 husky 훅 우회 — 허용되지 않음 (CLAUDE.md §8)"

# ── 경고 패턴 (차단하지 않고 메시지만 출력) ──────────────────────────────────
warn_if_matches() {
  local pattern="$1"
  local message="$2"
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "⚠️  [HARNESS WARN] $message"
    echo "   명령어: $COMMAND"
    echo ""
  fi
}

# pnpm add (의존성 추가) — 사용자 승인 권장
warn_if_matches "pnpm\s+add\s+[^-]" \
  "새 패키지 추가 — 사용자가 명시적으로 요청한 경우만 실행하세요"

# git clean -f (추적되지 않는 파일 삭제)
warn_if_matches "git\s+clean\s+.*-f" \
  "git clean -f는 추적되지 않는 파일을 삭제합니다. 의도한 동작인지 확인하세요"

exit 0
