#!/bin/bash
# scripts/harness/plan.sh
# 계획 문서 생성 및 상태 관리
#
# 사용:
#   bash scripts/harness/plan.sh "기능명"     # 계획 생성 (DRAFT)
#   bash scripts/harness/plan.sh --complete   # 현재 IN_PROGRESS 계획을 COMPLETED로
#   bash scripts/harness/plan.sh --list       # 계획 목록 출력
#   bash scripts/harness/plan.sh --status     # 현재 활성 계획 확인

source "$(dirname "$0")/_lib.sh"
ROOT=$(project_root)
PLANS_DIR="$ROOT/docs/plans"
mkdir -p "$PLANS_DIR"

# ── --complete ────────────────────────────────────────────────────────────────
if [ "${1:-}" = "--complete" ]; then
  ACTIVE=$(find "$PLANS_DIR" -name "*.md" ! -name ".gitkeep" -exec grep -l "상태: IN_PROGRESS" {} \; 2>/dev/null | sort | tail -1)
  if [ -z "$ACTIVE" ]; then
    warn "완료할 IN_PROGRESS 계획이 없습니다"
    exit 1
  fi
  # sed로 상태 변경 + 완료 시각 기록
  COMPLETED_AT=$(date '+%Y-%m-%d %H:%M:%S')
  sed -i "s/상태: IN_PROGRESS/상태: COMPLETED/" "$ACTIVE"
  sed -i "s/완료일:/완료일: $COMPLETED_AT/" "$ACTIVE" 2>/dev/null || true
  # 완료일 라인이 없으면 생성일 다음에 추가
  if ! grep -q "완료일:" "$ACTIVE"; then
    sed -i "s/생성일: .*/&\n완료일: $COMPLETED_AT/" "$ACTIVE"
  fi
  pass "계획 완료 처리: $(basename "$ACTIVE")"
  info "다음: bash scripts/harness/suggest-commit.sh"
  exit 0
fi

# ── --list ────────────────────────────────────────────────────────────────────
if [ "${1:-}" = "--list" ]; then
  header "계획 목록"
  ALL=$(find "$PLANS_DIR" -name "*.md" ! -name ".gitkeep" 2>/dev/null | sort)
  if [ -z "$ALL" ]; then
    info "계획 없음"
    exit 0
  fi
  while IFS= read -r f; do
    STATUS=$(grep "^상태:" "$f" 2>/dev/null | head -1 | sed 's/상태: //')
    NAME=$(basename "$f")
    case "$STATUS" in
      IN_PROGRESS) echo -e "  ${GREEN}▶ IN_PROGRESS${NC}  $NAME" ;;
      COMPLETED)   echo -e "  ${BLUE}✓ COMPLETED  ${NC}  $NAME" ;;
      DRAFT)       echo -e "  ${YELLOW}○ DRAFT      ${NC}  $NAME" ;;
      *)           echo -e "  ${NC}? $STATUS     ${NC}  $NAME" ;;
    esac
  done <<< "$ALL"
  exit 0
fi

# ── --status ──────────────────────────────────────────────────────────────────
if [ "${1:-}" = "--status" ]; then
  ACTIVE=$(find "$PLANS_DIR" -name "*.md" ! -name ".gitkeep" -exec grep -l "상태: IN_PROGRESS" {} \; 2>/dev/null | sort | tail -1)
  if [ -z "$ACTIVE" ]; then
    warn "현재 활성(IN_PROGRESS) 계획 없음"
    info "생성: bash scripts/harness/plan.sh \"기능명\""
    exit 1
  fi
  pass "활성 계획: $(basename "$ACTIVE")"
  # 구현 단계 진행률
  TOTAL=$(grep -c "^- \[" "$ACTIVE" 2>/dev/null | tr -d '[:space:]' || echo 0)
  DONE=$(grep -c "^- \[x\]" "$ACTIVE" 2>/dev/null | tr -d '[:space:]' || echo 0)
  [[ "$TOTAL" =~ ^[0-9]+$ ]] || TOTAL=0
  [[ "$DONE" =~ ^[0-9]+$ ]] || DONE=0
  info "진행: ${DONE}/${TOTAL} 단계"
  exit 0
fi

# ── 계획 생성 ─────────────────────────────────────────────────────────────────
PLAN_NAME="${1:-}"
if [ -z "$PLAN_NAME" ]; then
  echo ""
  fail "기능명을 입력하세요"
  echo ""
  echo "  사용법:"
  echo "    bash scripts/harness/plan.sh \"기능명\"     # 계획 생성"
  echo "    bash scripts/harness/plan.sh --complete   # 계획 완료"
  echo "    bash scripts/harness/plan.sh --list       # 목록"
  echo "    bash scripts/harness/plan.sh --status     # 현재 상태"
  echo ""
  exit 1
fi

# 이미 IN_PROGRESS 계획이 있으면 경고
EXISTING=$(find "$PLANS_DIR" -name "*.md" ! -name ".gitkeep" -exec grep -l "상태: IN_PROGRESS" {} \; 2>/dev/null | sort | tail -1)
if [ -n "$EXISTING" ]; then
  warn "이미 진행 중인 계획이 있습니다: $(basename "$EXISTING")"
  echo "    먼저 완료하거나 새 계획으로 계속 진행하세요."
  echo "    완료: bash scripts/harness/plan.sh --complete"
  echo ""
fi

# 파일명 정규화: 공백→하이픈, ASCII 특수문자 제거 (한글·알파벳·숫자·하이픈·언더스코어 허용)
SAFE_NAME=$(echo "$PLAN_NAME" | sed 's/ /-/g' | sed 's/[\/\\:*?"<>|]//g')
# 완전히 비었으면 timestamp만 사용
[ -z "$SAFE_NAME" ] && SAFE_NAME="plan"
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
PLAN_FILE="$PLANS_DIR/${TIMESTAMP}-${SAFE_NAME}.md"

cat > "$PLAN_FILE" << TEMPLATE
# Plan: ${PLAN_NAME}

생성일: $(date '+%Y-%m-%d %H:%M:%S')
완료일:
상태: DRAFT

---

## 목표

<!-- 이 작업으로 달성하려는 것. 1~3줄로 명확하게 기술한다. -->
<!-- 작성 후 상태를 IN_PROGRESS로 변경해야 구현을 시작할 수 있다. -->

## 영향 파일

<!-- 수정 예정 파일 목록. 경로 포함. -->
<!-- 예시:
- src/features/issues/hooks/useIssuesPage.ts (신규)
- src/app/issues/page.tsx (수정)
- src/types/github.ts (타입 추가)
-->

## 구현 단계

- [ ]
- [ ]
- [ ]

## 완료 기준

<!-- 어떻게 되면 이 계획이 완료된 것인가. -->

## 테스트 계획

<!-- 어떤 단위 테스트를 작성할 것인가. -->
<!-- 예시:
- useIssuesPage: 초기 상태 로딩 테스트
- useIssuesPage: 인라인 편집 저장 테스트
- updateIssuesStorage: sessionStorage 직렬화 테스트
-->

TEMPLATE

echo ""
pass "계획 파일 생성: $(basename "$PLAN_FILE")"
echo ""
echo "  다음 단계:"
echo "  1. 파일 열기: $PLAN_FILE"
echo "  2. 목표, 영향 파일, 구현 단계, 테스트 계획 작성"
echo "  3. 상태를 DRAFT → IN_PROGRESS 로 변경"
echo "  4. 구현 시작"
echo ""
echo "  경로: $PLAN_FILE"
echo ""
