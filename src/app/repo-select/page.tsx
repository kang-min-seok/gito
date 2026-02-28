'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { GitHubRepoItem } from '@/types/github';

type FetchState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; repos: GitHubRepoItem[] };

export default function RepoSelectPage() {
  const router = useRouter();
  const [fetchState, setFetchState] = useState<FetchState>({ status: 'loading' });
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null);

  useEffect(() => {
    fetch('/api/github/repos')
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? '레포지토리 목록을 불러오지 못했습니다.');
        }
        return res.json() as Promise<GitHubRepoItem[]>;
      })
      .then((repos) => setFetchState({ status: 'success', repos }))
      .catch((err: unknown) =>
        setFetchState({
          status: 'error',
          message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
        })
      );
  }, []);

  return (
    <main style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>레포지토리 선택</h1>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '32px' }}>
        이슈를 등록할 GitHub 레포지토리를 선택하세요.
      </p>

      {fetchState.status === 'loading' && (
        <p style={{ color: '#6b7280', fontSize: '14px' }}>레포지토리 목록을 불러오는 중...</p>
      )}

      {fetchState.status === 'error' && (
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
          {fetchState.message}
        </div>
      )}

      {fetchState.status === 'success' && (
        <>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '480px',
              overflowY: 'auto',
              marginBottom: '24px',
              paddingRight: '4px',
            }}
          >
            {fetchState.repos.map((repo) => {
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                    <span
                      style={{ fontSize: '14px', fontWeight: '600', color: '#111827', flex: 1 }}
                    >
                      {repo.fullName}
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
                    <span style={{ fontSize: '13px', color: '#6b7280' }}>{repo.description}</span>
                  )}
                </button>
              );
            })}
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
