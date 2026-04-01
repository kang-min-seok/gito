import type { Proposal, Scenarios, TechChallenge } from '@/types/planning';

// ── 직렬화 ──────────────────────────────────────────────────────

export function proposalToMarkdown(proposal: Proposal): string {
  const featuresText = proposal.mainFeatures
    .map((f) => `### ${f.name}\n${f.description}`)
    .join('\n\n');

  const traitsText = proposal.targetUsers.traits.map((t) => `- ${t}`).join('\n');
  const acquisitionText = proposal.userAcquisitionPlan.map((p) => `- ${p}`).join('\n');

  return `# 기획서 (Proposal)

## 개요 (Overview)
${proposal.overview}

## 문제 정의 (Problem Statement)
${proposal.problem}

## 왜 필요한가? (Why Needed)
기존: ${proposal.whyNeeded.existingWay}

지향: ${proposal.whyNeeded.targetWay}

## 완료 기준 (Completion Criteria)
${proposal.completionCriteria}

## 주요 기능 (Main Features)

${featuresText}

## 타겟 유저 (Target Users)
${proposal.targetUsers.summary}

${traitsText}

## 유저 확보 계획 (User Acquisition Plan)
${acquisitionText}`.trim();
}

export function scenariosToMarkdown(scenarios: Scenarios): string {
  const summaryText = scenarios.summaryFlow
    .map((item) => `### ${item.step}\n${item.description}`)
    .join('\n\n');

  const detailedText = scenarios.detailedFlow
    .map((item) => `### ${item.step}: ${item.action}\n${item.detail}`)
    .join('\n\n');

  return `# 유저 시나리오 (User Scenarios)

## 요약 플로우 (Summary Flow)

${summaryText}

## 상세 플로우 (Detailed Flow)

${detailedText}`.trim();
}

export function techChallengeToMarkdown(techChallenge: TechChallenge): string {
  const challengesText = techChallenge.challenges
    .map((c) => `## ${c.title}\n${c.description}`)
    .join('\n\n');

  return `# 기술적 도전 포인트 (Tech Challenges)

${challengesText}`.trim();
}

// ── 파싱 유틸 ───────────────────────────────────────────────────

/** `## ` 헤더를 기준으로 섹션 분리 */
function extractH2Sections(md: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = md.split('\n');
  let currentTitle = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentTitle) {
        result[currentTitle] = currentLines.join('\n').trim();
      }
      currentTitle = line.slice(3).trim();
      currentLines = [];
    } else if (!line.startsWith('# ')) {
      currentLines.push(line);
    }
  }
  if (currentTitle) {
    result[currentTitle] = currentLines.join('\n').trim();
  }
  return result;
}

/** `### ` 헤더를 기준으로 하위 항목 분리 */
function extractH3Subsections(content: string): { title: string; content: string }[] {
  const result: { title: string; content: string }[] = [];
  const parts = content.split(/^### /m);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const firstNewline = trimmed.indexOf('\n');
    if (firstNewline === -1) {
      result.push({ title: trimmed, content: '' });
    } else {
      result.push({
        title: trimmed.slice(0, firstNewline).trim(),
        content: trimmed.slice(firstNewline + 1).trim(),
      });
    }
  }
  return result;
}

// ── 역직렬화 ────────────────────────────────────────────────────

export function markdownToProposal(md: string): Proposal {
  const sections = extractH2Sections(md);

  const overview = sections['개요 (Overview)'] ?? '';
  const problem = sections['문제 정의 (Problem Statement)'] ?? '';

  const whyContent = sections['왜 필요한가? (Why Needed)'] ?? '';
  const whyLines = whyContent
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const existingLine = whyLines.find((l) => l.startsWith('기존:'));
  const targetLine = whyLines.find((l) => l.startsWith('지향:'));
  const whyNeeded = {
    existingWay: existingLine ? existingLine.slice(3).trim() : '',
    targetWay: targetLine ? targetLine.slice(3).trim() : '',
  };

  const completionCriteria = sections['완료 기준 (Completion Criteria)'] ?? '';

  const featuresContent = sections['주요 기능 (Main Features)'] ?? '';
  const mainFeatures = extractH3Subsections(featuresContent).map((f) => ({
    name: f.title,
    description: f.content,
  }));

  const targetUsersContent = sections['타겟 유저 (Target Users)'] ?? '';
  const targetLines = targetUsersContent.split('\n');
  const summaryLines: string[] = [];
  const traits: string[] = [];
  for (const line of targetLines) {
    if (line.trimStart().startsWith('- ')) {
      traits.push(line.replace(/^\s*-\s*/, '').trim());
    } else if (line.trim()) {
      summaryLines.push(line.trim());
    }
  }
  const targetUsers = {
    summary: summaryLines.join('\n').trim(),
    traits,
  };

  const acquisitionContent = sections['유저 확보 계획 (User Acquisition Plan)'] ?? '';
  const userAcquisitionPlan = acquisitionContent
    .split('\n')
    .filter((l) => l.trimStart().startsWith('- '))
    .map((l) => l.replace(/^\s*-\s*/, '').trim());

  return {
    overview,
    problem,
    whyNeeded,
    completionCriteria,
    mainFeatures,
    targetUsers,
    userAcquisitionPlan,
  };
}

export function markdownToScenarios(md: string): Scenarios {
  const sections = extractH2Sections(md);

  const summaryContent = sections['요약 플로우 (Summary Flow)'] ?? '';
  const summaryFlow = extractH3Subsections(summaryContent).map((s) => ({
    step: s.title,
    description: s.content,
  }));

  const detailedContent = sections['상세 플로우 (Detailed Flow)'] ?? '';
  const detailedFlow = extractH3Subsections(detailedContent).map((s) => {
    const colonIdx = s.title.indexOf(':');
    if (colonIdx !== -1) {
      return {
        step: s.title.slice(0, colonIdx).trim(),
        action: s.title.slice(colonIdx + 1).trim(),
        detail: s.content,
      };
    }
    return { step: s.title, action: '', detail: s.content };
  });

  return { summaryFlow, detailedFlow };
}

export function markdownToTechChallenge(md: string): TechChallenge {
  const sections = extractH2Sections(md);
  const challenges = Object.entries(sections).map(([title, description]) => ({
    title,
    description,
  }));
  return { challenges };
}
