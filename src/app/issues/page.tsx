'use client';

import { useEffect, useState, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ISSUES_STORAGE_KEY } from '@/constants/planning';
import type { GenerateIssuesResult, GeneratedIssue } from '@/types/github';
import { GenerateIssuesSchema } from '@/features/issues/schemas';
import IssueCard from '@/features/issues/IssueCard';
import { saveIssuesToStorage } from '@/features/issues/utils/updateIssuesStorage';
import Button from '@/components/Button';

export default function IssuesPage() {
  const router = useRouter();
  const [data, setData] = useState<GenerateIssuesResult | null>(null);
  const [editingEpicIndex, setEditingEpicIndex] = useState<number | null>(null);
  const [epicDraft, setEpicDraft] = useState('');
  const [selectedEpicIndex, setSelectedEpicIndex] = useState(0);

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

  if (!data) {
    return (
      <main className="flex items-center justify-center min-h-[calc(100vh-120px)]">
        <div className="w-8 h-8 rounded-full border-2 border-[#30363d] border-t-[#6762a7] animate-spin" />
      </main>
    );
  }

  const currentEpicGroup = data.issues[selectedEpicIndex];

  return (
    <main className="flex flex-col min-h-[calc(100vh-120px)]">
      {/* 타이틀 */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-[#f1f5f9]">생성된 백로그</h1>
        <p className="text-[13px] text-[#94a3b8] mt-1">
          AI가 생성한 에픽/스토리/태스크 목록을 검토하고 수정하세요.
        </p>
      </div>

      {/* 본문: 사이드바 + 콘텐츠 */}
      <div className="flex flex-1 gap-0 px-6 pb-24 min-h-0">
        {/* 왼쪽 에픽 사이드바 */}
        <div className="w-[260px] shrink-0 flex flex-col gap-1 pr-4">
          <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-widest mb-2 px-1">
            에픽 목록
          </p>

          {data.issues.map((group, i) => {
            const isActive = i === selectedEpicIndex;
            const isEditing = editingEpicIndex === i;

            return (
              <div key={i}>
                {isEditing ? (
                  <div className="flex gap-1 px-2 py-1">
                    <input
                      value={epicDraft}
                      onChange={(e) => setEpicDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEpicSave(i);
                        if (e.key === 'Escape') handleEpicCancel();
                      }}
                      autoFocus
                      className="flex-1 text-[13px] bg-[#0d1117] border border-[#6762a7] rounded-md px-2 py-1 text-[#f1f5f9] outline-none"
                    />
                    <button
                      onClick={() => handleEpicSave(i)}
                      className="text-[11px] px-2 py-1 bg-[#6762a7] text-white rounded cursor-pointer border-0"
                    >
                      저장
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedEpicIndex(i)}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-lg text-left cursor-pointer border-0 transition-colors group ${
                      isActive
                        ? 'bg-[#6762a7] text-white'
                        : 'bg-transparent text-[#94a3b8] hover:bg-[#161b22] hover:text-[#f1f5f9]'
                    }`}
                  >
                    <span className="text-[13px] font-medium truncate flex-1">{group.epic}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEpicEditStart(i, group.epic);
                      }}
                      className={`text-[11px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 border-0 cursor-pointer ml-1 shrink-0 ${
                        isActive ? 'bg-white/20 text-white' : 'bg-[#30363d] text-[#94a3b8]'
                      }`}
                    >
                      수정
                    </button>
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 오른쪽 스토리/태스크 영역 */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {/* 에픽 헤더 */}
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-[17px] font-bold text-[#f1f5f9]">{currentEpicGroup.epic}</h2>
            <span className="text-[12px] px-2.5 py-0.5 rounded-full bg-[#6762a7]/20 text-[#a89fd8] font-medium">
              {currentEpicGroup.stories.length} stories
            </span>
          </div>

          {/* 스토리 카드 목록 */}
          {currentEpicGroup.stories.map((story, j) => (
            <IssueCard
              key={j}
              issue={story}
              onUpdate={(updated) => handleStoryUpdate(selectedEpicIndex, j, updated)}
            />
          ))}
        </div>
      </div>

      {/* 하단 고정 푸터 */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-between items-center px-6 py-4 bg-[#0d1117] border-t border-[#30363d]">
        <Button variant="secondary" size="sm" onClick={() => router.back()}>
          ↺ 다시 생성
        </Button>
        <Button onClick={() => router.push('/repo-select')}>수정 완료 →</Button>
      </div>
    </main>
  );
}
