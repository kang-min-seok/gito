import { GeneratedIssue } from '@/types/github';
import { useState } from 'react';
import Button from '@/components/Button';

const TYPE_LABEL: Record<string, string> = {
  story: 'Story',
  task: 'Task',
};

const TYPE_BADGE_CLASS: Record<string, string> = {
  story: 'badge-story',
  task: 'badge-task',
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

  return (
    <div className={indent > 0 ? 'ml-6' : ''}>
      <div className="card mb-2">
        {/* 헤더 */}
        {isEditing ? (
          <div className="px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <span className={badgeClass}>{TYPE_LABEL[issue.type] ?? issue.type}</span>
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="flex-1 text-sm font-semibold border border-gray-300 rounded-md px-2 py-1 outline-none"
              />
            </div>
            <textarea
              value={bodyDraft}
              onChange={(e) => setBodyDraft(e.target.value)}
              rows={6}
              className="w-full text-[13px] text-gray-700 border border-gray-300 rounded-md p-2 resize-y leading-relaxed outline-none box-border font-[inherit]"
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
            <span className="text-sm font-semibold flex-1">{issue.title}</span>
            <Button variant="ghost" size="sm" onClick={handleEditStart} className="shrink-0">
              수정
            </Button>
            <span className="text-xs text-gray-400 shrink-0">{expanded ? '▲' : '▼'}</span>
          </div>
        )}

        {/* body */}
        {!isEditing && expanded && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-[13px] text-gray-700 whitespace-pre-wrap leading-relaxed">
            {issue.body}
          </div>
        )}
      </div>

      {/* 하위 이슈 */}
      {issue.children?.map((child, i) => (
        <IssueCard
          key={i}
          issue={child}
          indent={24}
          onUpdate={(updated) => handleChildUpdate(i, updated)}
        />
      ))}
    </div>
  );
}
