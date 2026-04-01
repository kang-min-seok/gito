'use client';

import { useEffect, useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PLANNING_STORAGE_KEY, ISSUES_STORAGE_KEY } from '@/constants/planning';
import { GeneratePlanningSchema } from '@/features/planning/schemas';
import {
  proposalToMarkdown,
  scenariosToMarkdown,
  techChallengeToMarkdown,
  markdownToProposal,
  markdownToScenarios,
  markdownToTechChallenge,
} from '@/features/planning/utils/planningMarkdown';
import type { SidebarTab } from '@/features/planning/constants';
import type { PlanningResult } from '@/types/planning';
import type { GenerateIssuesResult } from '@/types/github';

export type MarkdownContents = Record<SidebarTab, string>;

export function usePlanningPage() {
  const router = useRouter();
  const [markdownContents, setMarkdownContents] = useState<MarkdownContents | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(PLANNING_STORAGE_KEY);
    if (!raw) {
      router.replace('/');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const result = GeneratePlanningSchema.parse(parsed);
      if (result.type !== 'planning') {
        router.replace('/');
        return;
      }
      startTransition(() =>
        setMarkdownContents({
          proposal: proposalToMarkdown(result.proposal),
          scenarios: scenariosToMarkdown(result.scenarios),
          techChallenge: techChallengeToMarkdown(result.techChallenge),
        })
      );
    } catch {
      router.replace('/');
    }
  }, [router]);

  function handleBack() {
    router.push('/');
  }

  async function handleGenerateIssues() {
    if (!markdownContents) return;
    setIsGenerating(true);
    setGenerateError(null);

    try {
      // 마크다운 → PlanningResult 역파싱
      let planningData: PlanningResult;
      try {
        planningData = {
          type: 'planning',
          proposal: markdownToProposal(markdownContents.proposal),
          scenarios: markdownToScenarios(markdownContents.scenarios),
          techChallenge: markdownToTechChallenge(markdownContents.techChallenge),
        };
      } catch {
        setGenerateError('기획서 내용을 파싱하는 중 오류가 발생했습니다. 형식을 확인해주세요.');
        return;
      }

      try {
        const res = await fetch('/api/generate/issues', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planning: planningData }),
        });
        if (!res.ok) {
          const { error } = (await res.json()) as { error: string };
          setGenerateError(error ?? '이슈 생성 중 오류가 발생했습니다.');
          return;
        }
        const result = (await res.json()) as GenerateIssuesResult;
        sessionStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(result));
        router.push('/issues');
      } catch {
        setGenerateError('이슈 생성 중 오류가 발생했습니다.');
      }
    } finally {
      setIsGenerating(false);
    }
  }

  return {
    markdownContents,
    setMarkdownContents,
    isGenerating,
    generateError,
    handleBack,
    handleGenerateIssues,
  };
}
