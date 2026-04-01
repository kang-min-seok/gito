'use client';

import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import { TAB_FILENAME, type SidebarTab } from '@/features/planning/constants';

type ExportFormat = 'md';

const EXPORT_FORMATS: { format: ExportFormat; label: string; mime: string }[] = [
  { format: 'md', label: 'Markdown (.md)', mime: 'text/markdown;charset=utf-8' },
];

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
  const [isExportOpen, setIsExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // 탭 전환 시 Preview 모드로 초기화
  useEffect(() => {
    setViewMode('preview');
  }, [activeTab]);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    if (!isExportOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExportOpen]);

  function handleExport(format: ExportFormat) {
    const { mime } = EXPORT_FORMATS.find((f) => f.format === format)!;
    const filename = TAB_FILENAME[activeTab];
    const blob = new Blob([markdownContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setIsExportOpen(false);
  }

  return (
    <div className="flex-1 min-w-0 bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden flex flex-col">
      {/* 문서 헤더 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#30363d]">
        <div className="flex items-center gap-2 text-[13px] text-[#94a3b8]">
          <span>📄</span>
          <span>{TAB_FILENAME[activeTab]}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* 내보내기 드롭다운 */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setIsExportOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1 text-[12px] border border-[#30363d] rounded-md text-[#94a3b8] hover:bg-[#1c2128] hover:text-[#f1f5f9] transition-colors cursor-pointer"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              내보내기
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
            {isExportOpen && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-[#1c2128] border border-[#30363d] rounded-md shadow-lg z-10 overflow-hidden">
                {EXPORT_FORMATS.map(({ format, label }) => (
                  <button
                    key={format}
                    onClick={() => handleExport(format)}
                    className="w-full text-left px-3 py-2 text-[12px] text-[#94a3b8] hover:bg-[#262c36] hover:text-[#f1f5f9] transition-colors cursor-pointer"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
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
