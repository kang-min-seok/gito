'use client';

import { useState } from 'react';
import TabSidebar from './TabSidebar';
import DocArea from './DocArea';
import type { SidebarTab } from '@/features/planning/constants';
import type { MarkdownContents } from '@/features/planning/hooks/usePlanningPage';

export interface PlanningViewerProps {
  markdownContents: MarkdownContents;
  onMarkdownChange: (contents: MarkdownContents) => void;
}

export default function PlanningViewer({
  markdownContents,
  onMarkdownChange,
}: PlanningViewerProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('proposal');

  function handleMarkdownChange(content: string) {
    onMarkdownChange({ ...markdownContents, [activeTab]: content });
  }

  return (
    <div className="flex flex-1 px-6 pb-20 min-h-0">
      <div className="sticky top-30 self-start pt-4">
        <TabSidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
      <DocArea
        activeTab={activeTab}
        markdownContent={markdownContents[activeTab]}
        onMarkdownChange={handleMarkdownChange}
      />
    </div>
  );
}
