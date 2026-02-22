'use client';

import { useEffect, useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PLANNING_STORAGE_KEY } from '@/constants/planning';
import type { PlanningResult } from '@/types/planning';

export default function PlanningPage() {
  const router = useRouter();
  const [data, setData] = useState<PlanningResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(PLANNING_STORAGE_KEY);
    if (!raw) {
      router.replace('/');
      return;
    }
    startTransition(() => {
      setData(JSON.parse(raw) as PlanningResult);
    });
  }, [router]);

  if (!data) return <div style={{ padding: '40px' }}>로딩 중...</div>;

  const { proposal, scenarios, techChallenge } = data;

  return (
    <main style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '32px' }}>기획서</h1>

      {/* 기획서 */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>📋 기획서</h2>

        <Field label="개요" value={proposal.overview} />
        <Field label="해결하고자 하는 문제" value={proposal.problem} />
        <Field label="기존 방식" value={proposal.whyNeeded.existingWay} />
        <Field label="지향하는 방식" value={proposal.whyNeeded.targetWay} />
        <Field label="완성도의 기준" value={proposal.completionCriteria} />

        <div style={{ marginBottom: '12px' }}>
          <strong>주요 기능</strong>
          <ul style={{ marginTop: '6px', paddingLeft: '20px' }}>
            {proposal.mainFeatures.map((f, i) => (
              <li key={i} style={{ marginBottom: '4px' }}>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <Field label="타겟 유저" value={proposal.targetUsers} />
        <Field label="유저 확보 계획" value={proposal.userAcquisitionPlan} />
      </section>

      {/* 유저 시나리오 */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
          🗺 유저 시나리오
        </h2>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {scenarios.summaryFlow.map((item, i) => (
            <div
              key={i}
              style={{
                padding: '10px 14px',
                background: '#f3f4f6',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{item.step}</div>
              <div style={{ color: '#6b7280' }}>{item.description}</div>
            </div>
          ))}
        </div>

        <div style={{ whiteSpace: 'pre-wrap', fontSize: '14px', lineHeight: '1.7' }}>
          {scenarios.detailedFlow}
        </div>
      </section>

      {/* 기술적 도전 포인트 */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>
          ⚙️ 기술적 도전 포인트
        </h2>
        {techChallenge.challenges.map((c, i) => (
          <div key={i} style={{ marginBottom: '16px' }}>
            <strong>{c.title}</strong>
            <p style={{ marginTop: '4px', fontSize: '14px', color: '#374151' }}>{c.description}</p>
          </div>
        ))}
      </section>

      <button
        onClick={() => router.push('/')}
        style={{
          padding: '10px 24px',
          background: '#111827',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        새 아이디어 입력하기
      </button>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <strong>{label}</strong>
      <p style={{ marginTop: '4px', fontSize: '14px', color: '#374151' }}>{value}</p>
    </div>
  );
}
