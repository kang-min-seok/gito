'use client';

import { useEffect, useState, startTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ISSUES_STORAGE_KEY, SELECTED_REPO_KEY } from '@/constants/planning';
import { GenerateIssuesSchema } from '@/features/issues/schemas';
import type { CreateIssuesResult, GitHubRepoItem, SetupProjectResult } from '@/types/github';

type PageState =
  | { status: 'creating_project' }
  | { status: 'creating_issues' }
  | {
      status: 'success';
      issuesResult: CreateIssuesResult;
      repo: GitHubRepoItem;
      projectUrl: string;
    }
  | { status: 'error'; message: string };

const spinnerStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  border: '3px solid #e5e7eb',
  borderTop: '3px solid #111827',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

export default function ResultPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>({ status: 'creating_project' });
  const hasFetched = useRef(false); // Strict모드를 막는 임시 방편

  useEffect(() => {
    if (hasFetched.current) return; // Strict모드를 막는 임시 방편
    hasFetched.current = true;

    async function run() {
      const issuesRaw = sessionStorage.getItem(ISSUES_STORAGE_KEY);
      const repoRaw = sessionStorage.getItem(SELECTED_REPO_KEY);

      if (!issuesRaw || !repoRaw) {
        router.replace('/');
        return;
      }

      let issues;
      let repo: GitHubRepoItem;
      try {
        issues = GenerateIssuesSchema.parse(JSON.parse(issuesRaw));
        repo = JSON.parse(repoRaw) as GitHubRepoItem;
      } catch {
        router.replace('/');
        return;
      }

      // Phase 1: Create project with custom fields
      const epicNames = issues.issues.map((g) => g.epic);
      const setupRes = await fetch('/api/github/setup-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: repo.owner, projectTitle: repo.name, epicNames }),
      });

      if (!setupRes.ok) {
        const body = await setupRes.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? '프로젝트 생성 중 오류가 발생했습니다.'
        );
      }

      const projectInfo = (await setupRes.json()) as SetupProjectResult;
      startTransition(() => setPageState({ status: 'creating_issues' }));

      // Phase 2: Create issues and add to project
      const createRes = await fetch('/api/github/create-issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: repo.owner,
          repo: repo.name,
          issues,
          project: {
            projectId: projectInfo.projectId,
            issueTypeFieldId: projectInfo.issueTypeFieldId,
            storyOptionId: projectInfo.storyOptionId,
            taskOptionId: projectInfo.taskOptionId,
            epicFieldId: projectInfo.epicFieldId,
            epicOptions: projectInfo.epicOptions,
          },
        }),
      });

      if (!createRes.ok) {
        const body = await createRes.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? '이슈 생성 중 오류가 발생했습니다.');
      }

      const issuesResult = (await createRes.json()) as CreateIssuesResult;
      startTransition(() =>
        setPageState({ status: 'success', issuesResult, repo, projectUrl: projectInfo.projectUrl })
      );
    }

    run().catch((err: unknown) => {
      startTransition(() =>
        setPageState({
          status: 'error',
          message: err instanceof Error ? err.message : '오류가 발생했습니다.',
        })
      );
    });
  }, [router]);

  if (pageState.status === 'creating_project' || pageState.status === 'creating_issues') {
    const isProject = pageState.status === 'creating_project';
    return (
      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
          gap: '16px',
        }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={spinnerStyle} />
        <p style={{ fontSize: '16px', color: '#374151', fontWeight: '600' }}>
          {isProject ? '프로젝트를 생성하고 있습니다...' : '이슈를 생성하고 있습니다...'}
        </p>
        <p style={{ fontSize: '13px', color: '#9ca3af' }}>
          {isProject
            ? 'GitHub Projects와 커스텀 필드를 설정하는 중입니다.'
            : 'GitHub에 이슈를 등록하고 프로젝트에 추가하는 중입니다.'}
        </p>
      </main>
    );
  }

  if (pageState.status === 'error') {
    return (
      <main style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#dc2626' }}>
          오류가 발생했습니다
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
          {pageState.message}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => router.back()}
            style={{
              padding: '10px 24px',
              background: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            돌아가기
          </button>
          <button
            onClick={() => router.push('/')}
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
            처음으로
          </button>
        </div>
      </main>
    );
  }

  const { issuesResult, repo, projectUrl } = pageState;
  const repoIssuesUrl = `https://github.com/${repo.fullName}/issues`;

  return (
    <main style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>완료</h1>
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '32px' }}>
        <strong>{repo.fullName}</strong>에 총 <strong>{issuesResult.created.length}개</strong>의
        이슈가 등록되었습니다.
        {issuesResult.failed.length > 0 && (
          <span style={{ color: '#dc2626' }}> ({issuesResult.failed.length}개 실패)</span>
        )}
      </p>

      {issuesResult.created.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#9ca3af',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '12px',
            }}
          >
            생성된 이슈
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {issuesResult.created.map((issue) => (
              <a
                key={issue.number}
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: 'white',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#9ca3af',
                    flexShrink: 0,
                    minWidth: '40px',
                  }}
                >
                  #{issue.number}
                </span>
                <span style={{ fontSize: '14px', color: '#111827', flex: 1 }}>{issue.title}</span>
                <span style={{ fontSize: '12px', color: '#2563eb', flexShrink: 0 }}>열기 →</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {issuesResult.failed.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: '700',
              color: '#dc2626',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '12px',
            }}
          >
            생성 실패
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {issuesResult.failed.map((issue, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  background: '#fef2f2',
                }}
              >
                <span style={{ fontSize: '14px', color: '#374151', flex: 1 }}>{issue.title}</span>
                <span style={{ fontSize: '12px', color: '#dc2626', flexShrink: 0 }}>
                  {issue.error}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <a
          href={projectUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '10px 24px',
            background: '#111827',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          GitHub 프로젝트 보기
        </a>
        <a
          href={repoIssuesUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            padding: '10px 24px',
            background: 'white',
            color: '#111827',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            cursor: 'pointer',
            textDecoration: 'none',
          }}
        >
          GitHub 이슈 목록 보기
        </a>
        <button
          onClick={() => router.push('/')}
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
          새 아이디어 입력하기
        </button>
      </div>
    </main>
  );
}
