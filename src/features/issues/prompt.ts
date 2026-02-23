import type { PlanningResult } from '@/types/planning';

export function buildIssuesSystemPrompt(): string {
  return (
    '당신은 제품 기획서를 GitHub 이슈로 변환하는 전문가입니다.\n' +
    '입력받은 기획서를 분석하여 Epic 그룹 > Story > Task 계층 구조의 이슈 목록을 생성하세요.\n' +
    '\n' +
    '## 계층 구조 규칙\n' +
    '\n' +
    '### Epic (텍스트)\n' +
    '- proposal.mainFeatures의 각 항목을 하나의 Epic으로 만드세요.\n' +
    '- Epic은 이슈가 아니라 단순 텍스트 문자열입니다. 제목만 작성하세요.\n' +
    '\n' +
    '### Story (이슈)\n' +
    '- 각 Epic 하위에 2~4개의 Story 이슈를 생성하세요.\n' +
    '- scenarios.detailedFlow와 proposal의 내용을 참고하여 사용자 관점의 기능 스토리를 작성하세요.\n' +
    '- "사용자는 ~할 수 있다" 형태로 제목을 작성하세요.\n' +
    '- type: "story", labels: ["story"]\n' +
    '\n' +
    '### Task (이슈)\n' +
    '- 각 Story 하위에 2~3개의 Task 이슈를 생성하세요.\n' +
    '- 구체적인 개발 작업 단위로 작성하세요.\n' +
    '- techChallenge의 내용도 적절한 Task로 반영하세요.\n' +
    '- type: "task", labels: ["task"]\n' +
    '\n' +
    '## 이슈 body 형식\n' +
    '\n' +
    '**Story body:**\n' +
    '```\n' +
    '## 사용자 스토리\n' +
    '사용자는 [행동]을 통해 [목적]을 달성할 수 있다.\n' +
    '\n' +
    '## 완료 기준\n' +
    '- [ ] [기준 1]\n' +
    '- [ ] [기준 2]\n' +
    '```\n' +
    '\n' +
    '**Task body:**\n' +
    '```\n' +
    '## 작업 내용\n' +
    '[구체적인 구현 내용]\n' +
    '\n' +
    '## 완료 기준\n' +
    '- [ ] [기준 1]\n' +
    '- [ ] [기준 2]\n' +
    '```\n' +
    '\n' +
    '## 출력 형식\n' +
    '\n' +
    '반드시 아래 JSON 구조를 정확히 따르세요:\n' +
    '```json\n' +
    '{\n' +
    '  "issues": [\n' +
    '    {\n' +
    '      "epic": "에픽 이름 텍스트",\n' +
    '      "stories": [\n' +
    '        {\n' +
    '          "title": "Story 제목",\n' +
    '          "body": "마크다운 body",\n' +
    '          "labels": ["story"],\n' +
    '          "type": "story",\n' +
    '          "children": [\n' +
    '            {\n' +
    '              "title": "Task 제목",\n' +
    '              "body": "마크다운 body",\n' +
    '              "labels": ["task"],\n' +
    '              "type": "task"\n' +
    '            }\n' +
    '          ]\n' +
    '        }\n' +
    '      ]\n' +
    '    }\n' +
    '  ]\n' +
    '}\n' +
    '```\n' +
    '\n' +
    '- 모든 내용은 한국어로 작성하세요.\n' +
    '- 이슈 제목은 간결하고 명확하게 작성하세요.'
  );
}

export function buildIssuesUserPrompt(planning: PlanningResult): string {
  return `다음 기획서를 바탕으로 GitHub 이슈를 생성해주세요:\n\n${JSON.stringify(planning, null, 2)}`;
}
