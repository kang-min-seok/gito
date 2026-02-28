'use client';

import { useEffect, useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ISSUES_STORAGE_KEY } from '@/constants/planning';
import type { GenerateIssuesResult, GeneratedIssue } from '@/types/github';
import { GenerateIssuesSchema } from '@/features/issues/schemas';
import IssueCard from '@/features/issues/IssueCard';
import { saveIssuesToStorage } from '@/features/issues/utils/updateIssuesStorage';

export default function IssuesPage() {
  const router = useRouter();
  const [data, setData] = useState<GenerateIssuesResult | null>(null);
  const [editingEpicIndex, setEditingEpicIndex] = useState<number | null>(null);
  const [epicDraft, setEpicDraft] = useState('');

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

  const handleStoryUpdate = (epicIndex: number, storyIndex: number, updated: GeneratedIssue) => {
    if (!data) return;
    const newIssues = data.issues.map((group, i) => {
      if (i !== epicIndex) return group;
      return {
        ...group,
        stories: group.stories.map((story, j) => (j === storyIndex ? updated : story)),
      };
    });
    const newData = { issues: newIssues };
    startTransition(() => setData(newData));
    saveIssuesToStorage(newData);
  };

  const handleEpicEditStart = (index: number, currentEpic: string) => {
    setEpicDraft(currentEpic);
    setEditingEpicIndex(index);
  };

  const handleEpicSave = (epicIndex: number) => {
    if (!data) return;
    const newIssues = data.issues.map((group, i) =>
      i === epicIndex ? { ...group, epic: epicDraft } : group
    );
    const newData = { issues: newIssues };
    startTransition(() => setData(newData));
    saveIssuesToStorage(newData);
    setEditingEpicIndex(null);
  };

  const handleEpicCancel = () => {
    setEditingEpicIndex(null);
  };

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
              {editingEpicIndex === i ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <input
                    value={epicDraft}
                    onChange={(e) => setEpicDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEpicSave(i);
                      if (e.key === 'Escape') handleEpicCancel();
                    }}
                    autoFocus
                    style={{
                      flex: 1,
                      fontSize: '16px',
                      fontWeight: '700',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      padding: '4px 8px',
                      outline: 'none',
                      color: '#111827',
                    }}
                  />
                  <button
                    onClick={handleEpicCancel}
                    style={{
                      padding: '4px 12px',
                      background: 'white',
                      color: '#111827',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleEpicSave(i)}
                    style={{
                      padding: '4px 12px',
                      background: '#111827',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    저장
                  </button>
                </div>
              ) : (
                <>
                  <span style={{ fontSize: '16px', fontWeight: '700', color: '#111827', flex: 1 }}>
                    {group.epic}
                  </span>
                  <button
                    onClick={() => handleEpicEditStart(i, group.epic)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#9ca3af',
                      fontSize: '12px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#374151')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
                  >
                    수정
                  </button>
                </>
              )}
            </div>

            {/* Stories */}
            <div>
              {group.stories.map((story, j) => (
                <IssueCard
                  key={j}
                  issue={story}
                  onUpdate={(updated) => handleStoryUpdate(i, j, updated)}
                />
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
