'use client';

import { usePlanningPage } from '@/features/planning/hooks/usePlanningPage';
import GeneratingCard from '@/features/planning/GeneratingCard';
import PlanningViewer from '@/features/planning/PlanningViewer';
import Button from '@/components/Button';
import type { RepoStructure } from '@/types/github';

const REPO_STRUCTURE_OPTIONS: { value: RepoStructure; label: string; description: string }[] = [
  { value: 'monorepo', label: '모노레포', description: '하나의 레포지토리에 이슈를 생성합니다.' },
  {
    value: 'split',
    label: '프론트엔드 · 백엔드 분리',
    description: '각 레포에 맞는 이슈를 분리하여 생성합니다.',
  },
];

export default function PlanningPage() {
  const {
    markdownContents,
    setMarkdownContents,
    repoStructure,
    setRepoStructure,
    isGenerating,
    generateError,
    handleGenerateIssues,
  } = usePlanningPage();

  if (isGenerating) return <GeneratingCard />;

  if (!markdownContents) {
    return (
      <main className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="w-8 h-8 rounded-full border-2 border-[#30363d] border-t-[#6762a7] animate-spin" />
      </main>
    );
  }

  return (
    <main className="flex flex-col min-h-[calc(100vh-120px)]">
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-[#f1f5f9]">생성된 기획서</h1>
        <p className="text-[13px] text-[#94a3b8] mt-1">
          AI가 제안하는 프로젝트 기획안을 검토하고 수정하세요.
        </p>
      </div>

      <PlanningViewer markdownContents={markdownContents} onMarkdownChange={setMarkdownContents} />

      <div className="fixed bottom-0 left-0 right-0 bg-[#0d1117] border-t border-[#30363d]">
        <div className="flex items-center justify-between px-6 py-3 gap-4">
          {/* 레포 구조 선택 (세그먼트 컨트롤) */}
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-[11px] font-semibold text-[#64748b] uppercase tracking-widest">
              레포 구조
            </span>
            <div className="flex bg-[#161b22] border border-[#30363d] rounded-lg p-0.5">
              {REPO_STRUCTURE_OPTIONS.map(({ value, label }) => {
                const isSelected = repoStructure === value;
                return (
                  <button
                    key={value}
                    onClick={() => setRepoStructure(value)}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#6762a7] text-[#f1f5f9]'
                        : 'text-[#94a3b8] hover:text-[#f1f5f9]'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 에러 + 액션 버튼 */}
          <div className="flex items-center gap-3">
            {generateError && <p className="text-red-400 text-[12px]">{generateError}</p>}
            <Button onClick={handleGenerateIssues}>수정 완료 →</Button>
          </div>
        </div>
      </div>
    </main>
  );
}
