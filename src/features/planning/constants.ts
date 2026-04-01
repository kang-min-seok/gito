export type SidebarTab = 'proposal' | 'scenarios' | 'techChallenge';

export const SIDEBAR_TABS: { key: SidebarTab; label: string; icon: string }[] = [
  { key: 'proposal', label: '기획서 (Proposal)', icon: '📋' },
  { key: 'scenarios', label: '유저 시나리오', icon: '🗺' },
  { key: 'techChallenge', label: '기술적 도전 포인트', icon: '⚙️' },
];

export const TAB_FILENAME: Record<SidebarTab, string> = {
  proposal: 'proposal.md',
  scenarios: 'user-scenarios.md',
  techChallenge: 'tech-challenges.md',
};
