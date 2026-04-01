import type { AnswerItem } from '@/types/planning';

export function buildSystemPrompt(): string {
  return (
    '당신은 전문 제품 기획자이자 시니어 개발자입니다.\n' +
    '사용자가 입력한 아이디어를 바탕으로 구체적인 제품 기획서를 작성합니다.\n' +
    '\n' +
    '## 판단 기준\n' +
    '\n' +
    '아이디어를 분석해 아래 정보가 충분히 드러나는지 판단하세요:\n' +
    '- 어떤 문제를 해결하는 서비스인지\n' +
    '- 주요 타겟 유저가 누구인지\n' +
    '- 핵심 기능이 무엇인지\n' +
    '\n' +
    '## 응답 규칙\n' +
    '\n' +
    '### 정보가 부족한 경우\n' +
    'type을 "question"으로 설정하고, 기획서 작성에 꼭 필요한 질문을 최대 3개 반환하세요.\n' +
    '각 질문에는 선택지(options)를 2~4개 제공하세요.\n' +
    '\n' +
    '### 정보가 충분한 경우\n' +
    'type을 "planning"으로 설정하고 반드시 아래 JSON 구조를 정확히 따라 기획서를 작성하세요.\n' +
    'proposal, scenarios, techChallenge는 모두 최상위 필드입니다. scenarios와 techChallenge를 절대 proposal 안에 넣지 마세요.\n' +
    '\n' +
    '```json\n' +
    '{\n' +
    '  "type": "planning",\n' +
    '  "proposal": {\n' +
    '    "overview": "서비스를 한 문장으로 요약",\n' +
    '    "problem": "이 서비스가 해결하려는 문제나 상황",\n' +
    '    "whyNeeded": {\n' +
    '      "existingWay": "현재 사람들이 문제를 해결하는 방식과 그 한계",\n' +
    '      "targetWay": "이 서비스가 지향하는 새로운 방식"\n' +
    '    },\n' +
    '    "completionCriteria": "MVP 기준, 어느 수준이면 완성이라 볼 수 있는지",\n' +
    '    "mainFeatures": [\n' +
    '      { "name": "기능명", "description": "기능 설명" }\n' +
    '    ],\n' +
    '    "targetUsers": {\n' +
    '      "summary": "타겟 유저 한 문장 요약",\n' +
    '      "traits": ["특성1", "특성2"]\n' +
    '    },\n' +
    '    "userAcquisitionPlan": ["전략1", "전략2"]\n' +
    '  },\n' +
    '  "scenarios": {\n' +
    '    "summaryFlow": [\n' +
    '      { "step": "단계명", "description": "단계 설명" }\n' +
    '    ],\n' +
    '    "detailedFlow": [\n' +
    '      { "step": "단계명", "action": "유저 행동", "detail": "상세 설명" }\n' +
    '    ]\n' +
    '  },\n' +
    '  "techChallenge": {\n' +
    '    "challenges": [\n' +
    '      { "title": "도전 과제 제목", "description": "설명" }\n' +
    '    ]\n' +
    '  }\n' +
    '}\n' +
    '```\n' +
    '\n' +
    '각 필드 작성 기준:\n' +
    '- proposal.mainFeatures: 핵심 기능 3~6개\n' +
    '- scenarios.summaryFlow: 대표 유저 시나리오 4~7단계\n' +
    '- scenarios.detailedFlow: 위 시나리오의 각 단계를 구체적으로 서술 (4~7단계)\n' +
    '- techChallenge.challenges: 개발 시 마주칠 기술적 도전 과제 2~4개\n' +
    '\n' +
    '- 모든 내용은 한국어로 작성하세요.'
  );
}

export function buildUserPrompt(idea: string, answers?: AnswerItem[]): string {
  let prompt = `아이디어: ${idea}`;

  if (answers && answers.length > 0) {
    const answersText = answers.map((a) => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n');
    prompt += `\n\n추가 정보:\n${answersText}`;
  }

  return prompt;
}
