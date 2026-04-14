#!/bin/bash
# scripts/harness/_lib.sh
# 하네스 스크립트 공통 유틸리티 — 모든 check-*.sh에서 source하여 사용

# ── 색상 ──────────────────────────────────────────────────────────────────────
if [ -t 1 ] && [ "${NO_COLOR:-}" = "" ]; then
  RED='\033[0;31m'
  YELLOW='\033[1;33m'
  GREEN='\033[0;32m'
  BLUE='\033[0;34m'
  CYAN='\033[0;36m'
  BOLD='\033[1m'
  NC='\033[0m'
else
  RED='' YELLOW='' GREEN='' BLUE='' CYAN='' BOLD='' NC=''
fi

# ── 출력 함수 ─────────────────────────────────────────────────────────────────
pass()  { echo -e "${GREEN}✓${NC} $1"; }
fail()  { echo -e "${RED}✗ [HARNESS BLOCK]${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠ [HARNESS WARN]${NC} $1"; }
info()  { echo -e "${BLUE}ℹ${NC} $1"; }
header(){ echo -e "\n${BOLD}${CYAN}── $1 ──${NC}"; }

# ── 프로젝트 루트 ─────────────────────────────────────────────────────────────
project_root() {
  git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null || \
  git rev-parse --show-toplevel 2>/dev/null || \
  pwd
}

# ── Node.js로 JSON 필드 추출 ─────────────────────────────────────────────────
# 사용: parse_json "$JSON_STRING" "tool_input.file_path"
parse_json() {
  local json="$1"
  local field="$2"
  echo "$json" | node -e "
const c=[];
process.stdin.on('data',d=>c.push(d.toString()));
process.stdin.on('end',()=>{
  try{
    const data=JSON.parse(c.join(''));
    const val='$field'.split('.').reduce((o,k)=>o&&o[k],data);
    process.stdout.write(String(val==null?'':val));
  }catch(e){ process.stdout.write(''); }
});
" 2>/dev/null
}

# ── 파일이 src/ 하위 TS/TSX 파일인지 확인 ────────────────────────────────────
is_src_ts_file() {
  local f="$1"
  [[ "$f" == */src/* ]] && [[ "$f" == *.ts || "$f" == *.tsx ]]
}

# ── 파일이 page.tsx인지 확인 ─────────────────────────────────────────────────
is_page_file() {
  [[ "$1" == */app/*/page.tsx ]] || [[ "$1" == */app/page.tsx ]]
}
