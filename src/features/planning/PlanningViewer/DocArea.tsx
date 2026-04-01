'use client';

import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { TAB_FILENAME, type SidebarTab } from '@/features/planning/constants';

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-[20px] font-bold text-[#f1f5f9] mb-4 mt-0 leading-snug">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-[15px] font-bold text-[#f1f5f9] mt-7 mb-2 pb-2 border-b border-[#30363d] leading-snug">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[14px] font-semibold text-[#e2e8f0] mt-4 mb-1.5 leading-snug">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="text-[14px] text-[#94a3b8] mb-3 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => <ul className="list-disc list-outside ml-5 space-y-1 mb-3">{children}</ul>,
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-5 space-y-1 mb-3">{children}</ol>
  ),
  li: ({ children }) => <li className="text-[14px] text-[#94a3b8] leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-[#e2e8f0]">{children}</strong>,
  em: ({ children }) => <em className="italic text-[#94a3b8]">{children}</em>,
  hr: () => <hr className="border-[#30363d] my-5" />,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-[#6762a7] pl-4 text-[#64748b] italic my-3">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="font-mono text-[12px] bg-[#1c2128] text-[#a89fd8] px-1.5 py-0.5 rounded">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-3 mb-3 overflow-x-auto text-[13px] text-[#e2e8f0] font-mono">
      {children}
    </pre>
  ),
};

export interface DocAreaProps {
  activeTab: SidebarTab;
  markdownContent: string;
  onMarkdownChange: (content: string) => void;
}

export default function DocArea({ activeTab, markdownContent, onMarkdownChange }: DocAreaProps) {
  const [viewMode, setViewMode] = useState<'preview' | 'raw'>('preview');

  // 탭 전환 시 Preview 모드로 초기화
  useEffect(() => {
    setViewMode('preview');
  }, [activeTab]);

  return (
    <div className="flex-1 min-w-0 bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden flex flex-col">
      {/* 문서 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#30363d]">
        <div className="flex items-center gap-2 text-[13px] text-[#94a3b8]">
          <span>📄</span>
          <span>{TAB_FILENAME[activeTab]}</span>
        </div>
        <div className="flex border border-[#30363d] rounded-md overflow-hidden text-[12px]">
          <button
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1 transition-colors cursor-pointer ${
              viewMode === 'raw'
                ? 'bg-[#6762a7] text-white'
                : 'text-[#94a3b8] hover:bg-[#1c2128] hover:text-[#f1f5f9]'
            }`}
          >
            Raw
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1 transition-colors border-l border-[#30363d] cursor-pointer ${
              viewMode === 'preview'
                ? 'bg-[#6762a7] text-white'
                : 'text-[#94a3b8] hover:bg-[#1c2128] hover:text-[#f1f5f9]'
            }`}
          >
            Preview
          </button>
        </div>
      </div>

      {/* 문서 본문 */}
      {viewMode === 'raw' ? (
        <textarea
          value={markdownContent}
          onChange={(e) => onMarkdownChange(e.target.value)}
          className="flex-1 bg-[#0d1117] text-[#e2e8f0] font-mono text-[13px] leading-relaxed px-6 py-5 resize-none outline-none border-none"
          spellCheck={false}
        />
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <ReactMarkdown components={markdownComponents}>{markdownContent}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
