'use client';

import { useEffect, useState } from 'react';

export type PlanningLoadingContext = 'initial' | 'question';

const STEPS: Record<PlanningLoadingContext, string[]> = {
  initial: [
    '아이디어 분석 중...',
    '핵심 기능 파악 중...',
    '기획서 초안 작성 중...',
    '내용 구조화 및 검토 중...',
  ],
  question: ['답변 내용 분석 중...', '요구사항 정리 중...', '기획서 작성 중...', '최종 검토 중...'],
};

const STEP_INTERVAL_MS = 2800;

interface PlanningLoadingCardProps {
  context: PlanningLoadingContext;
}

export default function PlanningLoadingCard({ context }: PlanningLoadingCardProps) {
  const steps = STEPS[context];
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, STEP_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      setCurrentStep(0);
    };
  }, [context, steps.length]);

  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6 py-10">
      <div className="w-full max-w-110 bg-[#161b22] border border-[#30363d] rounded-2xl p-8 flex flex-col items-center gap-6">
        {/* 스피너 */}
        <div className="w-14 h-14 rounded-full border-4 border-[#6762a7]/30 border-t-[#6762a7] animate-spin" />

        {/* 제목 */}
        <div className="text-center flex flex-col gap-2">
          <p className="text-lg font-semibold text-[#f1f5f9]">AI가 기획서를 작성 중입니다...</p>
          <p className="text-[13px] text-[#94a3b8]">
            {context === 'initial'
              ? '입력하신 아이디어를 분석하고 기획서를 생성하고 있습니다.'
              : '답변 내용을 반영하여 기획서를 완성하고 있습니다.'}
          </p>
        </div>

        {/* 현재 단계 강조 배너 */}
        <div className="w-full bg-[#6762a7]/20 rounded-lg px-4 py-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#6762a7] animate-pulse shrink-0" />
          <span className="text-[13px] text-[#f1f5f9]">{steps[currentStep]}</span>
        </div>

        {/* 단계 목록 */}
        <div className="w-full flex flex-col gap-2.5 border-t border-[#30363d] pt-4">
          {steps.map((step, i) => {
            const isDone = i < currentStep;
            const isRunning = i === currentStep;
            return (
              <div key={step} className="flex items-center gap-2">
                {isDone ? (
                  <span className="w-2 h-2 rounded-full bg-[#3fb950] shrink-0" />
                ) : isRunning ? (
                  <span className="w-2 h-2 rounded-full bg-[#6762a7] animate-pulse shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#30363d] shrink-0" />
                )}
                <span
                  className={`text-[12px] transition-colors ${
                    isDone ? 'text-[#3fb950]' : isRunning ? 'text-[#f1f5f9]' : 'text-[#64748b]'
                  }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
