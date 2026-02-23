import { GeneratedIssue } from '@/types/github';
import { useState } from 'react';

const TYPE_LABEL: Record<string, string> = {
  epic: 'Epic',
  story: 'Story',
  task: 'Task',
};

const TYPE_COLOR: Record<string, { background: string; color: string }> = {
  epic: { background: '#dbeafe', color: '#1d4ed8' },
  story: { background: '#dcfce7', color: '#15803d' },
  task: { background: '#fef9c3', color: '#a16207' },
};

const INDENT_PX: Record<string, number> = {
  epic: 0,
  story: 24,
  task: 48,
};

export default function IssueCard({ issue }: { issue: GeneratedIssue }) {
  const [expanded, setExpanded] = useState(false);
  const badge = TYPE_COLOR[issue.type] ?? { background: '#f3f4f6', color: '#374151' };
  const indent = INDENT_PX[issue.type] ?? 0;

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
          <span style={{ fontSize: '12px', color: '#9ca3af', flexShrink: 0 }}>
            {expanded ? '▲' : '▼'}
          </span>
        </div>

        {/* body */}
        {expanded && (
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
        <IssueCard key={i} issue={child} />
      ))}
    </div>
  );
}
