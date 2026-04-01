'use client';

import { usePlanningPage } from '@/features/planning/hooks/usePlanningPage';
import GeneratingCard from '@/features/planning/GeneratingCard';
import PlanningViewer from '@/features/planning/PlanningViewer';
import Button from '@/components/Button';

export default function PlanningPage() {
  const {
    markdownContents,
    setMarkdownContents,
    isGenerating,
    generateError,
    handleBack,
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

      <div className="fixed bottom-0 left-0 right-0 flex justify-between items-center px-6 py-4 bg-[#0d1117] border-t border-[#30363d]">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={handleBack}>
            ↺ 다시 생성
          </Button>
          {generateError && <p className="text-red-400 text-sm">{generateError}</p>}
        </div>
        <Button onClick={handleGenerateIssues}>수정 완료 →</Button>
      </div>
    </main>
  );
}
