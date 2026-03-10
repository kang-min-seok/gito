'use client';

import { useEffect, useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PLANNING_STORAGE_KEY, ISSUES_STORAGE_KEY } from '@/constants/planning';
import type { PlanningResult } from '@/types/planning';
import type { GenerateIssuesResult } from '@/types/github';
import { GeneratePlanningSchema } from '@/features/planning/schemas';
import Button from '@/components/Button';

export default function PlanningPage() {
  const router = useRouter();
  const [data, setData] = useState<PlanningResult | null>(null);
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
      startTransition(() => {
        setData(result);
      });
    } catch {
      router.replace('/');
    }
  }, [router]);

  if (!data) return <div className="p-10">로딩 중...</div>;

  const { proposal, scenarios, techChallenge } = data;

  return (
    <main className="page-container">
      <h1 className="text-2xl font-bold mb-8">기획서</h1>

      {/* 기획서 */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4">📋 기획서</h2>

        <Field label="개요" value={proposal.overview} />
        <Field label="해결하고자 하는 문제" value={proposal.problem} />
        <Field label="기존 방식" value={proposal.whyNeeded.existingWay} />
        <Field label="지향하는 방식" value={proposal.whyNeeded.targetWay} />
        <Field label="완성도의 기준" value={proposal.completionCriteria} />

        <div className="mb-3">
          <strong>주요 기능</strong>
          <div className="mt-2 flex flex-col gap-2">
            {proposal.mainFeatures.map((f, i) => (
              <div key={i} className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="font-semibold text-sm mb-1 text-gray-900">{f.name}</div>
                <div className="text-sm text-gray-700">{f.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <strong>타겟 유저</strong>
          <p className="mt-1 text-sm mb-2">{proposal.targetUsers.summary}</p>
          <ul className="pl-5 m-0">
            {proposal.targetUsers.traits.map((trait, i) => (
              <li key={i} className="text-sm mb-1">
                {trait}
              </li>
            ))}
          </ul>
        </div>

        <div className="mb-3">
          <strong>유저 확보 계획</strong>
          <ul className="mt-1.5 pl-5">
            {proposal.userAcquisitionPlan.map((plan, i) => (
              <li key={i} className="text-sm mb-1.5">
                {plan}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 유저 시나리오 */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4">🗺 유저 시나리오</h2>

        <div className="flex gap-2 flex-wrap mb-5">
          {scenarios.summaryFlow.map((item, i) => (
            <div key={i} className="px-3.5 py-2.5 bg-gray-100 rounded-lg text-[13px]">
              <div className="font-bold mb-1 text-gray-900">{item.step}</div>
              <div className="text-gray-500">{item.description}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {scenarios.detailedFlow.map((item, i) => (
            <div key={i} className="px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                  {item.step}
                </span>
                <span className="text-sm font-semibold text-gray-900">{item.action}</span>
              </div>
              <p className="text-sm text-gray-700 m-0">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 기술적 도전 포인트 */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4">⚙️ 기술적 도전 포인트</h2>
        {techChallenge.challenges.map((c, i) => (
          <div key={i} className="mb-4">
            <strong>{c.title}</strong>
            <p className="mt-1 text-sm">{c.description}</p>
          </div>
        ))}
      </section>

      {generateError && <p className="text-red-500 text-sm mb-3">{generateError}</p>}

      <div className="flex gap-3 flex-wrap">
        <Button
          onClick={async () => {
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
          }}
          disabled={isGenerating}
        >
          {isGenerating ? '이슈 생성 중...' : '이슈 생성하기'}
        </Button>

        <Button onClick={() => router.push('/')} disabled={isGenerating} variant="secondary">
          새 아이디어 입력하기
        </Button>
      </div>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-3">
      <strong>{label}</strong>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}
