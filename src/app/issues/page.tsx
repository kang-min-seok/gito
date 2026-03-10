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

  if (!data) return <div className="p-10">로딩 중...</div>;

  return (
    <main className="page-container">
      <h1 className="text-2xl font-bold mb-2">이슈 목록</h1>
      <p className="text-sm text-gray-500 mb-8">
        총 {data.issues.length}개의 Epic으로 구성되었습니다. 각 항목을 클릭하면 상세 내용을 볼 수
        있습니다.
      </p>

      <div className="flex flex-col gap-8">
        {data.issues.map((group, i) => (
          <section key={i}>
            {/* Epic 헤더 */}
            <div className="flex items-center gap-2.5 mb-3">
              <span className="badge badge-epic">Epic</span>
              {editingEpicIndex === i ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    value={epicDraft}
                    onChange={(e) => setEpicDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEpicSave(i);
                      if (e.key === 'Escape') handleEpicCancel();
                    }}
                    autoFocus
                    className="flex-1 text-base font-bold border border-gray-300 rounded-md px-2 py-1 outline-none text-gray-900"
                  />
                  <button
                    onClick={handleEpicCancel}
                    className="py-1 px-3 bg-white text-gray-900 border border-gray-200 rounded-md text-[13px] cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => handleEpicSave(i)}
                    className="py-1 px-3 bg-gray-900 text-white border-0 rounded-md text-[13px] cursor-pointer"
                  >
                    저장
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-base font-bold text-gray-900 flex-1">{group.epic}</span>
                  <button onClick={() => handleEpicEditStart(i, group.epic)} className="btn-ghost">
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

      <div className="mt-10 flex gap-3 flex-wrap">
        <button onClick={() => router.back()} className="btn-primary">
          기획서로 돌아가기
        </button>
        <button onClick={() => router.push('/repo-select')} className="btn-blue">
          레포에 이슈 등록하기
        </button>
        <button onClick={() => router.push('/')} className="btn-secondary">
          새 아이디어 입력하기
        </button>
      </div>
    </main>
  );
}
