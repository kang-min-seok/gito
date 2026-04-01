'use client';

import { useEffect, useState, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { GitHubRepoItem, GitHubOwnerInfo } from '@/types/github';
import { GITHUB_CACHE_KEY } from '@/constants/github';
import { SELECTED_REPO_KEY } from '@/constants/planning';
import Button from '@/components/Button';

type RepoFetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; repos: GitHubRepoItem[] };

type OwnerFetchState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; info: GitHubOwnerInfo };

const loadFromCache = (): { repos: GitHubRepoItem[]; owner: GitHubOwnerInfo } | null => {
  try {
    const reposRaw = localStorage.getItem(GITHUB_CACHE_KEY.REPOS);
    const ownerRaw = localStorage.getItem(GITHUB_CACHE_KEY.OWNER);
    if (!reposRaw || !ownerRaw) return null;
    return {
      repos: JSON.parse(reposRaw) as GitHubRepoItem[],
      owner: JSON.parse(ownerRaw) as GitHubOwnerInfo,
    };
  } catch {
    return null;
  }
};

const saveToCache = (repos: GitHubRepoItem[], owner: GitHubOwnerInfo) => {
  try {
    localStorage.setItem(GITHUB_CACHE_KEY.REPOS, JSON.stringify(repos));
    localStorage.setItem(GITHUB_CACHE_KEY.OWNER, JSON.stringify(owner));
  } catch {}
};

const clearCache = () => {
  localStorage.removeItem(GITHUB_CACHE_KEY.REPOS);
  localStorage.removeItem(GITHUB_CACHE_KEY.OWNER);
};

export default function RepoSelectPage() {
  const router = useRouter();
  const [repoState, setRepoState] = useState<RepoFetchState>({ status: 'loading' });
  const [ownerState, setOwnerState] = useState<OwnerFetchState>({ status: 'loading' });
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null);
  const [appSettingsUrl, setAppSettingsUrl] = useState<string | null>(null);

  const fetchAll = useCallback(() => {
    let fetchedRepos: GitHubRepoItem[] | null = null;
    let fetchedOwner: GitHubOwnerInfo | null = null;

    const trySaveCache = () => {
      if (fetchedRepos && fetchedOwner) {
        saveToCache(fetchedRepos, fetchedOwner);
      }
    };

    fetch('/api/github/repos')
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? '레포지토리 목록을 불러오지 못했습니다.');
        }
        return res.json() as Promise<GitHubRepoItem[]>;
      })
      .then((repos) => {
        fetchedRepos = repos;
        setRepoState({ status: 'success', repos });
        trySaveCache();
      })
      .catch((err: unknown) =>
        setRepoState({
          status: 'error',
          message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
        })
      );

    fetch('/api/github/orgs')
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<GitHubOwnerInfo>;
      })
      .then((info) => {
        fetchedOwner = info;
        setOwnerState({ status: 'success', info });
        setSelectedOwner(info.login);
        trySaveCache();
      })
      .catch(() => setOwnerState({ status: 'error' }));
  }, []);

  useEffect(() => {
    const cached = loadFromCache();
    if (cached) {
      startTransition(() => {
        setRepoState({ status: 'success', repos: cached.repos });
        setOwnerState({ status: 'success', info: cached.owner });
        setSelectedOwner(cached.owner.login);
      });
    } else {
      fetchAll();
    }

    fetch('/api/github/app-settings-url')
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return res.json() as Promise<{ url: string }>;
      })
      .then(({ url }) => setAppSettingsUrl(url))
      .catch(() => {});
  }, [fetchAll]);

  const handleRefresh = () => {
    clearCache();
    startTransition(() => {
      setSelectedRepo(null);
      setRepoState({ status: 'loading' });
      setOwnerState({ status: 'loading' });
    });
    fetchAll();
  };

  const handleOwnerSelect = (login: string) => {
    setSelectedOwner(login);
    setSelectedRepo(null);
  };

  const handleCreateIssues = () => {
    if (!selectedRepo) return;
    sessionStorage.setItem(SELECTED_REPO_KEY, JSON.stringify(selectedRepo));
    router.push('/result');
  };

  const filteredRepos =
    repoState.status === 'success' && selectedOwner
      ? repoState.repos.filter((repo) => repo.owner === selectedOwner)
      : repoState.status === 'success'
        ? repoState.repos
        : [];

  const isLoading = repoState.status === 'loading' || ownerState.status === 'loading';

  return (
    <main className="flex flex-col min-h-[calc(100vh-120px)]">
      {/* 타이틀 */}
      <div className="px-6 pt-8 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">레포지토리 선택</h1>
          <p className="text-[13px] text-[#94a3b8] mt-1">
            이슈와 프로젝트를 생성할 레포지토리를 선택하세요.
          </p>
        </div>
        {!isLoading && repoState.status === 'success' && (
          <button
            onClick={handleRefresh}
            className="text-[12px] text-[#64748b] hover:text-[#94a3b8] bg-transparent border border-[#30363d] rounded-lg px-3 py-1.5 cursor-pointer mt-1"
          >
            새로고침
          </button>
        )}
      </div>

      {/* 본문 */}
      <div className="flex flex-1 gap-0 px-6 pb-24 min-h-0">
        {isLoading && (
          <div className="flex items-center gap-2 text-[#94a3b8] text-sm py-4">
            <div className="w-4 h-4 rounded-full border-2 border-[#30363d] border-t-[#6762a7] animate-spin" />
            불러오는 중...
          </div>
        )}

        {repoState.status === 'error' && (
          <div className="p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-400 text-sm">
            {repoState.message}
          </div>
        )}

        {!isLoading && repoState.status === 'success' && (
          <>
            {/* 왼쪽 사이드바: 계정/조직 */}
            <div className="w-[200px] shrink-0 flex flex-col pr-4">
              <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-widest mb-2 px-1">
                계정 / 조직
              </p>

              {ownerState.status === 'success' && (
                <>
                  <OwnerButton
                    label={ownerState.info.login}
                    sublabel="개인"
                    isSelected={selectedOwner === ownerState.info.login}
                    onClick={() => handleOwnerSelect(ownerState.info.login)}
                  />
                  <OwnerButton
                    label="모든 계정"
                    sublabel=""
                    isSelected={selectedOwner === null}
                    onClick={() => handleOwnerSelect(ownerState.info.login)}
                  />

                  {ownerState.info.orgs.length > 0 && (
                    <div className="border-t border-[#30363d] mt-2 pt-2 flex flex-col gap-0.5">
                      {ownerState.info.orgs.map((org) => (
                        <OwnerButton
                          key={org.login}
                          label={org.login}
                          sublabel="조직"
                          isSelected={selectedOwner === org.login}
                          onClick={() => handleOwnerSelect(org.login)}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {ownerState.status === 'error' && (
                <p className="text-[12px] text-red-400 px-2">조직 목록을 불러오지 못했습니다.</p>
              )}

              {/* 조직 권한 설정 */}
              <div className="border-t border-[#30363d] mt-3 pt-3 flex flex-col gap-2">
                <p className="text-[11px] font-bold text-[#64748b] uppercase tracking-widest">
                  조직 권한
                </p>
                <p className="text-[11px] text-[#64748b] leading-relaxed">
                  목록에 없는 조직이 있다면 권한을 설정하세요.
                </p>
                {appSettingsUrl && (
                  <a
                    href={appSettingsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block py-2 px-3 text-[12px] font-semibold text-[#94a3b8] border border-[#30363d] rounded-lg no-underline text-center bg-transparent hover:bg-[#161b22]"
                  >
                    ⚙ GitHub에서 권한 설정 →
                  </a>
                )}
              </div>
            </div>

            {/* 오른쪽: 레포 목록 */}
            <div className="flex-1 min-w-0 flex flex-col gap-3">
              {filteredRepos.length === 0 ? (
                <p className="text-sm text-[#64748b] pt-2">레포지토리가 없습니다.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1">
                  {filteredRepos.map((repo) => {
                    const isSelected = selectedRepo?.fullName === repo.fullName;
                    return (
                      <button
                        key={repo.fullName}
                        onClick={() => setSelectedRepo(isSelected ? null : repo)}
                        className={`flex flex-col items-start gap-2 px-4 py-4 rounded-xl cursor-pointer text-left w-full transition-colors border ${
                          isSelected
                            ? 'border-[#6762a7] bg-[#6762a7]/10'
                            : 'border-[#30363d] bg-[#161b22] hover:border-[#6762a7]/50 hover:bg-[#1c2128]'
                        }`}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-[13px] font-semibold text-[#f1f5f9] flex-1 truncate">
                            {repo.name}
                          </span>
                          {repo.isPrivate && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#30363d] text-[#94a3b8] shrink-0">
                              PRIVATE
                            </span>
                          )}
                          {!repo.isPrivate && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#3fb950]/20 text-[#3fb950] shrink-0">
                              PUBLIC
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <span className="text-[12px] text-[#64748b] line-clamp-2 leading-relaxed">
                            {repo.description}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 하단 고정 푸터 */}
      <div className="fixed bottom-0 left-0 right-0 flex justify-between items-center px-6 py-4 bg-[#0d1117] border-t border-[#30363d]">
        <Button variant="secondary" onClick={() => router.back()}>
          이전 단계
        </Button>
        <Button disabled={!selectedRepo} onClick={handleCreateIssues}>
          이슈 및 프로젝트 만들기 →
        </Button>
      </div>
    </main>
  );
}

function OwnerButton({
  label,
  sublabel,
  isSelected,
  onClick,
}: {
  label: string;
  sublabel: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-0.5 px-3 py-2.5 border-0 rounded-lg cursor-pointer text-left w-full transition-colors ${
        isSelected ? 'bg-[#6762a7]' : 'bg-transparent hover:bg-[#161b22]'
      }`}
    >
      <span
        className={`text-[13px] font-semibold truncate w-full ${isSelected ? 'text-white' : 'text-[#94a3b8]'}`}
      >
        {label}
      </span>
      {sublabel && (
        <span className={`text-[11px] ${isSelected ? 'text-white/70' : 'text-[#64748b]'}`}>
          {sublabel}
        </span>
      )}
    </button>
  );
}
