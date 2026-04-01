'use client';

import { useEffect, useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PLANNING_STORAGE_KEY, ISSUES_STORAGE_KEY } from '@/constants/planning';
import type { PlanningResult } from '@/types/planning';
import type { GenerateIssuesResult } from '@/types/github';
import { GeneratePlanningSchema } from '@/features/planning/schemas';
import Button from '@/components/Button';

type SidebarTab = 'proposal' | 'scenarios' | 'techChallenge';

const SIDEBAR_TABS: { key: SidebarTab; label: string; icon: string }[] = [
  { key: 'proposal', label: '기획서 (Proposal)', icon: '📋' },
  { key: 'scenarios', label: '유저 시나리오', icon: '🗺' },
  { key: 'techChallenge', label: '기술적 도전 포인트', icon: '⚙️' },
];

export default function PlanningPage() {
  const router = useRouter();
  const [data, setData] = useState<PlanningResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>('proposal');

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
      startTransition(() => {
        setData(result);
      });
    } catch {
      router.replace('/');
    }
  }, [router]);

  /* ── 로딩 중 (Step 3_1 스타일) ── */
  if (isGenerating) {
    return (
      <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6 py-10">
        <div className="w-full max-w-[440px] bg-[#161b22] border border-[#30363d] rounded-2xl p-8 flex flex-col items-center gap-6">
          <div className="w-14 h-14 rounded-full border-4 border-[#6762a7]/30 border-t-[#6762a7] animate-spin" />
          <div className="text-center flex flex-col gap-2">
            <p className="text-lg font-semibold text-[#f1f5f9]">
              AI가 스토리 목록을 만들어내고 있습니다..
            </p>
            <p className="text-[13px] text-[#94a3b8]">
              기획서를 바탕으로 에픽, 스토리, 태스크를 생성하고 있습니다.
            </p>
          </div>
          <div className="w-full bg-[#6762a7]/20 rounded-lg px-4 py-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#6762a7] animate-pulse shrink-0" />
            <span className="text-[13px] text-[#f1f5f9]">에픽 목록 작성 중...</span>
          </div>
          <p className="text-[12px] text-[#64748b]">
            잠시만 기다려 주세요. 보통 1-2분 정도 소요됩니다.
          </p>
          <div className="w-full flex flex-col gap-2 border-t border-[#30363d] pt-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#3fb950] shrink-0" />
              <span className="text-[12px] text-[#94a3b8]">기획서 파싱 완료</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6762a7] animate-pulse shrink-0" />
              <span className="text-[12px] text-[#94a3b8]">에픽 목록 작성 중...</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="w-8 h-8 rounded-full border-2 border-[#30363d] border-t-[#6762a7] animate-spin" />
      </main>
    );
  }

  const { proposal, scenarios, techChallenge } = data;

  /* ── 이슈 생성 핸들러 (로직 변경 없음) ── */
  async function handleGenerateIssues() {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/generate/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planning: data }),
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
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="flex flex-col min-h-[calc(100vh-120px)]">
      {/* 타이틀 */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-[#f1f5f9]">생성된 기획서</h1>
        <p className="text-[13px] text-[#94a3b8] mt-1">
          AI가 제안하는 프로젝트 기획안을 검토하고 수정하세요.
        </p>
      </div>

      {/* 본문: 사이드바 + 문서 영역 */}
      <div className="flex flex-1 gap-0 px-6 pb-24 min-h-0">
        {/* 왼쪽 사이드바 */}
        <div className="w-[260px] shrink-0 flex flex-col gap-1 pr-4">
          {SIDEBAR_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left cursor-pointer border-0 transition-colors ${
                  isActive
                    ? 'bg-[#6762a7] text-white'
                    : 'bg-transparent text-[#94a3b8] hover:bg-[#161b22] hover:text-[#f1f5f9]'
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                <span className="text-[13px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* 오른쪽 문서 영역 */}
        <div className="flex-1 min-w-0 bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden flex flex-col">
          {/* 문서 헤더 */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[#30363d]">
            <div className="flex items-center gap-2 text-[13px] text-[#94a3b8]">
              <span>📄</span>
              <span>
                {activeTab === 'proposal' && 'proposal.md'}
                {activeTab === 'scenarios' && 'user-scenarios.md'}
                {activeTab === 'techChallenge' && 'tech-challenges.md'}
              </span>
            </div>
          </div>

          {/* 문서 본문 */}
          <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6 text-[14px] text-[#e2e8f0] leading-relaxed">
            {/* ── 기획서 탭 ── */}
            {activeTab === 'proposal' && (
              <>
                <DocSection icon="📌" title="문제 정의 (Problem Statement)">
                  <p className="text-[#94a3b8]">{proposal.problem}</p>
                </DocSection>

                <DocSection icon="❓" title="왜 필요한가? (Why Needed)">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-start gap-2">
                      <span className="text-[#6762a7] font-semibold text-[12px] shrink-0 mt-0.5">
                        기존
                      </span>
                      <span className="text-[#94a3b8]">{proposal.whyNeeded.existingWay}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[#3fb950] font-semibold text-[12px] shrink-0 mt-0.5">
                        지향
                      </span>
                      <span className="text-[#94a3b8]">{proposal.whyNeeded.targetWay}</span>
                    </div>
                  </div>
                </DocSection>

                <DocSection icon="✅" title="완료 기준 (Completion Criteria)">
                  <p className="text-[#94a3b8]">{proposal.completionCriteria}</p>
                </DocSection>

                <DocSection icon="🔖" title="주요 기능 (Main Features)">
                  <div className="flex flex-col gap-2">
                    {proposal.mainFeatures.map((f, i) => (
                      <div
                        key={i}
                        className="px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#6762a7]/20 text-[#a89fd8]">
                            Feature {i + 1}
                          </span>
                          <span className="text-[13px] font-semibold text-[#f1f5f9]">{f.name}</span>
                        </div>
                        <p className="text-[13px] text-[#94a3b8]">{f.description}</p>
                      </div>
                    ))}
                  </div>
                </DocSection>

                <DocSection icon="👥" title="타겟 유저 (Target Users)">
                  <p className="text-[#94a3b8] mb-3">{proposal.targetUsers.summary}</p>
                  <ul className="flex flex-col gap-1.5 pl-4">
                    {proposal.targetUsers.traits.map((trait, i) => (
                      <li key={i} className="text-[13px] text-[#94a3b8] list-disc">
                        {trait}
                      </li>
                    ))}
                  </ul>
                </DocSection>

                <DocSection icon="📈" title="유저 확보 계획">
                  <ul className="flex flex-col gap-1.5 pl-4">
                    {proposal.userAcquisitionPlan.map((plan, i) => (
                      <li key={i} className="text-[13px] text-[#94a3b8] list-disc">
                        {plan}
                      </li>
                    ))}
                  </ul>
                </DocSection>
              </>
            )}

            {/* ── 유저 시나리오 탭 ── */}
            {activeTab === 'scenarios' && (
              <>
                <DocSection icon="🔄" title="요약 플로우">
                  <div className="flex gap-2 flex-wrap">
                    {scenarios.summaryFlow.map((item, i) => (
                      <div
                        key={i}
                        className="px-3.5 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-[13px] min-w-[120px]"
                      >
                        <div className="font-bold mb-1 text-[#f1f5f9]">{item.step}</div>
                        <div className="text-[#64748b]">{item.description}</div>
                      </div>
                    ))}
                  </div>
                </DocSection>

                <DocSection icon="📝" title="상세 플로우">
                  <div className="flex flex-col gap-3">
                    {scenarios.detailedFlow.map((item, i) => (
                      <div
                        key={i}
                        className="px-4 py-3.5 bg-[#0d1117] border border-[#30363d] rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[11px] font-semibold text-[#94a3b8] bg-[#30363d] px-2 py-0.5 rounded">
                            {item.step}
                          </span>
                          <span className="text-[13px] font-semibold text-[#f1f5f9]">
                            {item.action}
                          </span>
                        </div>
                        <p className="text-[13px] text-[#94a3b8]">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </DocSection>
              </>
            )}

            {/* ── 기술적 도전 포인트 탭 ── */}
            {activeTab === 'techChallenge' && (
              <DocSection icon="⚙️" title="기술적 도전 포인트">
                <div className="flex flex-col gap-4">
                  {techChallenge.challenges.map((c, i) => (
                    <div
                      key={i}
                      className="px-4 py-3.5 bg-[#0d1117] border border-[#30363d] rounded-lg"
                    >
                      <p className="text-[13px] font-bold text-[#f1f5f9] mb-2">{c.title}</p>
                      <p className="text-[13px] text-[#94a3b8]">{c.description}</p>
                    </div>
                  ))}
                </div>
              </DocSection>
            )}
          </div>
        </div>
      </div>

      {/* 하단 고정 푸터 */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-between items-center px-6 py-4 bg-[#0d1117] border-t border-[#30363d]">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => router.push('/')}>
            ↺ 다시 생성
          </Button>
          {generateError && <p className="text-red-400 text-sm">{generateError}</p>}
        </div>
        <Button onClick={handleGenerateIssues}>수정 완료 →</Button>
      </div>
    </main>
  );
}

/* ── 헬퍼: 문서 섹션 래퍼 ── */
function DocSection({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#30363d]">
        <span>{icon}</span>
        <h3 className="text-[14px] font-bold text-[#f1f5f9]">{title}</h3>
      </div>
      {children}
    </div>
  );
}
