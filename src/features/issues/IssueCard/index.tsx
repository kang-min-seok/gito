import { GeneratedIssue } from '@/types/github';
import { useState } from 'react';

const TYPE_LABEL: Record<string, string> = {
  story: 'Story',
  task: 'Task',
};

const TYPE_COLOR: Record<string, { background: string; color: string }> = {
  story: { background: '#dcfce7', color: '#15803d' },
  task: { background: '#fef9c3', color: '#a16207' },
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

  const badge = TYPE_COLOR[issue.type] ?? { background: '#f3f4f6', color: '#374151' };

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
    <div style={{ marginLeft: `${indent}px` }}>
      <div
        style={{
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          marginBottom: '8px',
          background: 'white',
          overflow: 'hidden',
        }}
      >
        {/* 헤더 */}
        {isEditing ? (
          <div
            style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  flexShrink: 0,
                  ...badge,
                }}
              >
                {TYPE_LABEL[issue.type] ?? issue.type}
              </span>
              <input
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                style={{
                  flex: 1,
                  fontSize: '14px',
                  fontWeight: '600',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  outline: 'none',
                }}
              />
            </div>
            <textarea
              value={bodyDraft}
              onChange={(e) => setBodyDraft(e.target.value)}
              rows={6}
              style={{
                width: '100%',
                fontSize: '13px',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '8px',
                resize: 'vertical',
                lineHeight: '1.6',
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '6px 16px',
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
                onClick={handleSave}
                style={{
                  padding: '6px 16px',
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
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              cursor: 'pointer',
            }}
            onClick={() => setExpanded((prev) => !prev)}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '4px',
                flexShrink: 0,
                ...badge,
              }}
            >
              {TYPE_LABEL[issue.type] ?? issue.type}
            </span>
            <span style={{ fontSize: '14px', fontWeight: '600', flex: 1 }}>{issue.title}</span>
            <button
              onClick={handleEditStart}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#9ca3af',
                fontSize: '12px',
                flexShrink: 0,
                padding: '2px 6px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#374151')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#9ca3af')}
            >
              수정
            </button>
            <span style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>
              {expanded ? '▲' : '▼'}
            </span>
          </div>
        )}

        {/* body */}
        {!isEditing && expanded && (
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid #f3f4f6',
              background: '#f9fafb',
              fontSize: '13px',
              color: '#374151',
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
            }}
          >
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
