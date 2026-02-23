'use client';

import { useEffect, useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ISSUES_STORAGE_KEY } from '@/constants/planning';
import type { GenerateIssuesResult } from '@/types/github';
import { GenerateIssuesSchema } from '@/features/issues/schemas';
import IssueCard from '@/features/issues/IssueCard';

export default function IssuesPage() {
  const router = useRouter();
  const [data, setData] = useState<GenerateIssuesResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(ISSUES_STORAGE_KEY);
    if (!raw) {
      router.replace('/');
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      const result = GenerateIssuesSchema.parse(parsed);
      startTransition(() => {
        setData(result);
      });
    } catch {
      router.replace('/');
    }
  }, [router]);

  if (!data) return <div style={{ padding: '40px' }}>로딩 중...</div>;

  return (
    <main style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>이슈 목록</h1>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '32px' }}>
        총 {data.issues.length}개의 Epic으로 구성되었습니다. 각 항목을 클릭하면 상세 내용을 볼 수
        있습니다.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {data.issues.map((group, i) => (
          <section key={i}>
            {/* Epic 헤더 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  background: '#dbeafe',
                  color: '#1d4ed8',
                  flexShrink: 0,
                }}
              >
                Epic
              </span>
              <span style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>
                {group.epic}
              </span>
            </div>

            {/* Stories */}
            <div>
              {group.stories.map((story, j) => (
                <IssueCard key={j} issue={story} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div style={{ marginTop: '40px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => router.back()}
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
          기획서로 돌아가기
        </button>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '10px 24px',
            background: 'white',
            color: '#111827',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          새 아이디어 입력하기
        </button>
      </div>
    </main>
  );
}
