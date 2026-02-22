'use client';

import { useEffect, useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { PLANNING_STORAGE_KEY } from '@/constants/planning';
import type { PlanningResult } from '@/types/planning';
import { GeneratePlanningSchema } from '@/features/planning/schemas';

export default function PlanningPage() {
  const router = useRouter();
  const [data, setData] = useState<PlanningResult | null>(null);

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
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {proposal.mainFeatures.map((f, i) => (
              <div
                key={i}
                style={{
                  padding: '10px 14px',
                  background: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              >
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '4px' }}>
                  {f.name}
                </div>
                <div style={{ fontSize: '14px', color: '#374151' }}>{f.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <strong>타겟 유저</strong>
          <p style={{ marginTop: '4px', fontSize: '14px', color: '#374151', marginBottom: '8px' }}>
            {proposal.targetUsers.summary}
          </p>
          <ul style={{ paddingLeft: '20px', margin: 0 }}>
            {proposal.targetUsers.traits.map((trait, i) => (
              <li key={i} style={{ fontSize: '14px', color: '#374151', marginBottom: '4px' }}>
                {trait}
              </li>
            ))}
          </ul>
        </div>

        <div style={{ marginBottom: '12px' }}>
          <strong>유저 확보 계획</strong>
          <ul style={{ marginTop: '6px', paddingLeft: '20px' }}>
            {proposal.userAcquisitionPlan.map((plan, i) => (
              <li key={i} style={{ fontSize: '14px', color: '#374151', marginBottom: '6px' }}>
                {plan}
              </li>
            ))}
          </ul>
        </div>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {scenarios.detailedFlow.map((item, i) => (
            <div
              key={i}
              style={{
                padding: '14px 16px',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '6px',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6b7280',
                    background: '#e5e7eb',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {item.step}
                </span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{item.action}</span>
              </div>
              <p style={{ fontSize: '14px', color: '#374151', margin: 0 }}>{item.detail}</p>
            </div>
          ))}
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
