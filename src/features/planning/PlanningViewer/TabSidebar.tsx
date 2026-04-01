import { SIDEBAR_TABS, type SidebarTab } from '@/features/planning/constants';

interface TabSidebarProps {
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
}

export default function TabSidebar({ activeTab, onTabChange }: TabSidebarProps) {
  return (
    <div className="w-65 shrink-0 flex flex-col gap-1 pr-4">
      {SIDEBAR_TABS.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-left cursor-pointer border-0 transition-colors ${
              isActive
                ? 'bg-[#6762a7] text-white'
                : 'bg-transparent text-[#94a3b8] hover:bg-[#161b22] hover:text-[#f1f5f9]'
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="text-[13px] font-medium">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
