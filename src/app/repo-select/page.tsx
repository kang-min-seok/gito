'use client';

import { useEffect, useState, useCallback, startTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { GitHubRepoItem, GitHubOwnerInfo } from '@/types/github';
import { GITHUB_CACHE_KEY } from '@/constants/github';

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

  const filteredRepos =
    repoState.status === 'success' && selectedOwner
      ? repoState.repos.filter((repo) => repo.owner === selectedOwner)
      : repoState.status === 'success'
        ? repoState.repos
        : [];

  const isLoading = repoState.status === 'loading' || ownerState.status === 'loading';

  return (
    <main style={{ padding: '40px 24px', maxWidth: '960px', margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}
      >
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>레포지토리 선택</h1>
        {!isLoading && repoState.status === 'success' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={handleRefresh}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                color: '#374151',
                background: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              새로고침
            </button>
          </div>
        )}
      </div>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '32px' }}>
        이슈를 등록할 GitHub 레포지토리를 선택하세요.
      </p>

      {isLoading && <p style={{ color: '#6b7280', fontSize: '14px' }}>불러오는 중...</p>}

      {repoState.status === 'error' && (
        <div
          style={{
            padding: '16px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#dc2626',
            fontSize: '14px',
          }}
        >
          {repoState.message}
        </div>
      )}

      {!isLoading && repoState.status === 'success' && (
        <>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '24px' }}>
            {/* 사이드바: 개인 + 조직 목록 + 권한 설정 */}
            <div
              style={{
                width: '180px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#9ca3af',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '8px',
                }}
              >
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

                  {ownerState.info.orgs.length > 0 && (
                    <div
                      style={{
                        borderTop: '1px solid #f3f4f6',
                        marginTop: '8px',
                        paddingTop: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
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
                <p style={{ fontSize: '12px', color: '#dc2626' }}>
                  조직 목록을 불러오지 못했습니다.
                </p>
              )}

              {/* 조직 권한 설정 섹션 */}
              <div
                style={{
                  borderTop: '1px solid #f3f4f6',
                  marginTop: '12px',
                  paddingTop: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#9ca3af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginBottom: '4px',
                  }}
                >
                  조직 권한
                </p>
                <p style={{ fontSize: '11px', color: '#9ca3af', lineHeight: '1.5' }}>
                  목록에 없는 조직이 있다면 권한을 설정하세요.
                </p>
                {appSettingsUrl && (
                  <a
                    href={appSettingsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'block',
                      padding: '7px 10px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#374151',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      textDecoration: 'none',
                      textAlign: 'center',
                      background: 'white',
                    }}
                  >
                    GitHub에서 권한 설정 →
                  </a>
                )}
              </div>
            </div>

            {/* 레포 목록 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {filteredRepos.length === 0 ? (
                <p style={{ fontSize: '14px', color: '#9ca3af', paddingTop: '8px' }}>
                  레포지토리가 없습니다.
                </p>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '480px',
                    overflowY: 'auto',
                    paddingRight: '4px',
                  }}
                >
                  {filteredRepos.map((repo) => {
                    const isSelected = selectedRepo?.fullName === repo.fullName;
                    return (
                      <button
                        key={repo.fullName}
                        onClick={() => setSelectedRepo(isSelected ? null : repo)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          gap: '4px',
                          padding: '14px 16px',
                          border: isSelected ? '2px solid #111827' : '1px solid #e5e7eb',
                          borderRadius: '8px',
                          background: isSelected ? '#f9fafb' : 'white',
                          cursor: 'pointer',
                          textAlign: 'left',
                          width: '100%',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#111827',
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {repo.name}
                          </span>
                          {repo.isPrivate && (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: '600',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: '#f3f4f6',
                                color: '#6b7280',
                                flexShrink: 0,
                              }}
                            >
                              Private
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <span
                            style={{
                              fontSize: '13px',
                              color: '#6b7280',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              width: '100%',
                            }}
                          >
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
            <div
              style={{
                padding: '16px',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                marginBottom: '24px',
              }}
            >
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                선택된 레포지토리
              </p>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
                {selectedRepo.fullName}
              </p>
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => router.back()}
          style={{
            padding: '10px 24px',
            background: 'white',
            color: '#111827',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          이슈 목록으로 돌아가기
        </button>
        <button
          disabled={!selectedRepo}
          style={{
            padding: '10px 24px',
            background: selectedRepo ? '#111827' : '#e5e7eb',
            color: selectedRepo ? 'white' : '#9ca3af',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: selectedRepo ? 'pointer' : 'not-allowed',
          }}
        >
          이슈 생성하기
        </button>
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
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: '2px',
        padding: '8px 10px',
        border: 'none',
        borderRadius: '6px',
        background: isSelected ? '#111827' : 'transparent',
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <span
        style={{
          fontSize: '13px',
          fontWeight: '600',
          color: isSelected ? 'white' : '#374151',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: '11px',
          color: isSelected ? '#d1d5db' : '#9ca3af',
        }}
      >
        {sublabel}
      </span>
    </button>
  );
}
