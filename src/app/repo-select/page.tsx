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
    <main className="px-6 py-10 max-w-[960px] mx-auto">
      <div className="flex items-start justify-between mb-2">
        <h1 className="text-2xl font-bold">레포지토리 선택</h1>
        {!isLoading && repoState.status === 'success' && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleRefresh}>
              새로고침
            </Button>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-8">이슈를 등록할 GitHub 레포지토리를 선택하세요.</p>

      {isLoading && <p className="text-gray-500 text-sm">불러오는 중...</p>}

      {repoState.status === 'error' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {repoState.message}
        </div>
      )}

      {!isLoading && repoState.status === 'success' && (
        <>
          <div className="flex gap-5 mb-6">
            {/* 사이드바: 개인 + 조직 목록 + 권한 설정 */}
            <div className="w-[180px] shrink-0 flex flex-col gap-1">
              <p className="section-label mb-2">계정 / 조직</p>

              {ownerState.status === 'success' && (
                <>
                  <OwnerButton
                    label={ownerState.info.login}
                    sublabel="개인"
                    isSelected={selectedOwner === ownerState.info.login}
                    onClick={() => handleOwnerSelect(ownerState.info.login)}
                  />

                  {ownerState.info.orgs.length > 0 && (
                    <div className="border-t border-gray-100 mt-2 pt-2 flex flex-col gap-1">
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
                <p className="text-xs text-red-600">조직 목록을 불러오지 못했습니다.</p>
              )}

              {/* 조직 권한 설정 섹션 */}
              <div className="border-t border-gray-100 mt-3 pt-3 flex flex-col gap-1.5">
                <p className="section-label mb-1">조직 권한</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  목록에 없는 조직이 있다면 권한을 설정하세요.
                </p>
                {appSettingsUrl && (
                  <a
                    href={appSettingsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block py-[7px] px-2.5 text-xs font-semibold text-gray-700 border border-gray-200 rounded-md no-underline text-center bg-white"
                  >
                    GitHub에서 권한 설정 →
                  </a>
                )}
              </div>
            </div>

            {/* 레포 목록 */}
            <div className="flex-1 min-w-0">
              {filteredRepos.length === 0 ? (
                <p className="text-sm text-gray-400 pt-2">레포지토리가 없습니다.</p>
              ) : (
                <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto pr-1">
                  {filteredRepos.map((repo) => {
                    const isSelected = selectedRepo?.fullName === repo.fullName;
                    return (
                      <button
                        key={repo.fullName}
                        onClick={() => setSelectedRepo(isSelected ? null : repo)}
                        className={`flex flex-col items-start gap-1 px-4 py-3.5 rounded-lg cursor-pointer text-left w-full ${isSelected ? 'border-2 border-gray-900 bg-gray-50' : 'border border-gray-200 bg-white'}`}
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="text-sm font-semibold text-gray-900 flex-1 truncate">
                            {repo.name}
                          </span>
                          {repo.isPrivate && <span className="badge badge-default">Private</span>}
                        </div>
                        {repo.description && (
                          <span className="text-[13px] text-gray-500 truncate w-full">
                            {repo.description}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {selectedRepo && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-6">
              <p className="text-[13px] text-gray-500 mb-1">선택된 레포지토리</p>
              <p className="text-[15px] font-semibold text-gray-900">{selectedRepo.fullName}</p>
            </div>
          )}
        </>
      )}

      <div className="flex gap-3 flex-wrap">
        <Button variant="secondary" onClick={() => router.back()}>
          이슈 목록으로 돌아가기
        </Button>
        <Button disabled={!selectedRepo} onClick={handleCreateIssues}>
          이슈 생성하기
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
      className={`flex flex-col items-start gap-0.5 px-2.5 py-2 border-0 rounded-md cursor-pointer text-left w-full ${isSelected ? 'bg-gray-900' : 'bg-transparent'}`}
    >
      <span
        className={`text-[13px] font-semibold truncate w-full ${isSelected ? 'text-white' : 'text-gray-700'}`}
      >
        {label}
      </span>
      <span className={`text-[11px] ${isSelected ? 'text-gray-300' : 'text-gray-400'}`}>
        {sublabel}
      </span>
    </button>
  );
}
