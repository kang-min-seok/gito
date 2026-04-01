import { GeneratedIssue } from '@/types/github';
import { useState } from 'react';
import Button from '@/components/Button';

const TYPE_LABEL: Record<string, string> = {
  story: 'STORY',
  task: 'TASK',
};

const TYPE_BADGE_CLASS: Record<string, string> = {
  story: 'badge-story',
  task: 'badge-task',
};

const TASK_DOT_CLASS: Record<string, string> = {
  done: 'bg-[#3fb950]',
  in_progress: 'bg-[#6762a7]',
  todo: 'bg-[#30363d]',
};

export default function IssueCard({
  issue,
  indent = 0,
  onUpdate,
}: {
  issue: GeneratedIssue;
  indent?: number;
  onUpdate?: (updated: GeneratedIssue) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(issue.title);
  const [bodyDraft, setBodyDraft] = useState(issue.body);

  const badgeClass = `badge ${TYPE_BADGE_CLASS[issue.type] ?? 'badge-default'}`;

  const handleEditStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTitleDraft(issue.title);
    setBodyDraft(issue.body);
    setIsEditing(true);
    setExpanded(true);
  };

  const handleSave = () => {
    onUpdate?.({ ...issue, title: titleDraft, body: bodyDraft });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTitleDraft(issue.title);
    setBodyDraft(issue.body);
    setIsEditing(false);
  };

  const handleChildUpdate = (childIndex: number, updated: GeneratedIssue) => {
    const updatedChildren = (issue.children ?? []).map((child, i) =>
      i === childIndex ? updated : child
    );
    onUpdate?.({ ...issue, children: updatedChildren });
  };

  /* ── Task 항목 스타일 (하위 children이 없는 task) ── */
  if (issue.type === 'task' && indent > 0) {
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#30363d] last:border-b-0">
        <span className={`w-2 h-2 rounded-full shrink-0 ${TASK_DOT_CLASS['todo']}`} />
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="flex-1 text-[13px] bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1 text-[#f1f5f9] outline-none focus:border-[#6762a7]"
            />
            <button
              onClick={handleCancel}
              className="text-[11px] px-2 py-1 bg-transparent border border-[#30363d] text-[#94a3b8] rounded cursor-pointer hover:bg-[#30363d]"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="text-[11px] px-2 py-1 bg-[#6762a7] text-white rounded cursor-pointer border-0"
            >
              저장
            </button>
          </div>
        ) : (
          <span
            className="text-[13px] text-[#94a3b8] flex-1 cursor-pointer hover:text-[#f1f5f9]"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {issue.title}
          </span>
        )}
        {!isEditing && (
          <button
            onClick={handleEditStart}
            className="text-[11px] text-[#64748b] hover:text-[#94a3b8] bg-transparent border-0 cursor-pointer px-1 shrink-0"
          >
            수정
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={indent > 0 ? 'ml-4' : ''}>
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl mb-2 overflow-hidden">
        {/* 헤더 */}
        {isEditing ? (
          <div className="px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <span className={badgeClass}>{TYPE_LABEL[issue.type] ?? issue.type}</span>
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="flex-1 text-sm font-semibold bg-[#0d1117] border border-[#30363d] rounded-md px-2 py-1 outline-none text-[#f1f5f9] focus:border-[#6762a7]"
              />
            </div>
            <textarea
              value={bodyDraft}
              onChange={(e) => setBodyDraft(e.target.value)}
              rows={5}
              className="w-full text-[13px] text-[#94a3b8] bg-[#0d1117] border border-[#30363d] rounded-md p-2 resize-y leading-relaxed outline-none box-border font-[inherit] focus:border-[#6762a7]"
            />
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" size="sm" onClick={handleCancel}>
                취소
              </Button>
              <Button size="sm" onClick={handleSave}>
                저장
              </Button>
            </div>
          </div>
        ) : (
          <div
            className="flex items-center gap-2.5 px-4 py-3 cursor-pointer"
            onClick={() => setExpanded((prev) => !prev)}
          >
            <span className={badgeClass}>{TYPE_LABEL[issue.type] ?? issue.type}</span>
            <span className="text-sm font-semibold flex-1 text-[#f1f5f9]">{issue.title}</span>
            <button
              onClick={handleEditStart}
              className="text-[11px] text-[#64748b] hover:text-[#94a3b8] bg-transparent border-0 cursor-pointer px-1 shrink-0"
            >
              수정
            </button>
            <span className="text-[11px] text-[#64748b] shrink-0">{expanded ? '▲' : '▼'}</span>
          </div>
        )}

        {/* 확장 시: 하위 태스크 또는 body */}
        {!isEditing && expanded && (
          <>
            {issue.children && issue.children.length > 0 ? (
              <div className="border-t border-[#30363d]">
                {issue.children.map((child, i) => (
                  <IssueCard
                    key={i}
                    issue={child}
                    indent={16}
                    onUpdate={(updated) => handleChildUpdate(i, updated)}
                  />
                ))}
              </div>
            ) : (
              <div className="px-4 py-3 border-t border-[#30363d] bg-[#0d1117]/50 text-[13px] text-[#94a3b8] whitespace-pre-wrap leading-relaxed">
                {issue.body}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
