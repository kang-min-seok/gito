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
      <main className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-10 h-10 border-[3px] border-gray-200 border-t-gray-900 rounded-full animate-spin" />
        <p className="text-base text-gray-700 font-semibold">
          {isProject ? '프로젝트를 생성하고 있습니다...' : '이슈를 생성하고 있습니다...'}
        </p>
        <p className="text-[13px] text-gray-400">
          {isProject
            ? 'GitHub Projects와 커스텀 필드를 설정하는 중입니다.'
            : 'GitHub에 이슈를 등록하고 프로젝트에 추가하는 중입니다.'}
        </p>
      </main>
    );
  }

  if (pageState.status === 'error') {
    return (
      <main className="page-container">
        <h1 className="text-2xl font-bold mb-2 text-red-600">오류가 발생했습니다</h1>
        <p className="text-sm text-gray-500 mb-6">{pageState.message}</p>
        <div className="flex gap-3">
          <button onClick={() => router.back()} className="btn-primary">
            돌아가기
          </button>
          <button onClick={() => router.push('/')} className="btn-secondary">
            처음으로
          </button>
        </div>
      </main>
    );
  }

  const { issuesResult, repo, projectUrl } = pageState;
  const repoIssuesUrl = `https://github.com/${repo.fullName}/issues`;

  return (
    <main className="page-container">
      <h1 className="text-2xl font-bold mb-2">완료</h1>
      <p className="text-sm text-gray-500 mb-8">
        <strong>{repo.fullName}</strong>에 총 <strong>{issuesResult.created.length}개</strong>의
        이슈가 등록되었습니다.
        {issuesResult.failed.length > 0 && (
          <span className="text-red-600"> ({issuesResult.failed.length}개 실패)</span>
        )}
      </p>

      {issuesResult.created.length > 0 && (
        <section className="mb-8">
          <p className="section-label mb-3">생성된 이슈</p>
          <div className="flex flex-col gap-2">
            {issuesResult.created.map((issue) => (
              <a
                key={issue.number}
                href={issue.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg bg-white no-underline text-inherit"
              >
                <span className="text-xs font-bold text-gray-400 shrink-0 min-w-10">
                  #{issue.number}
                </span>
                <span className="text-sm text-gray-900 flex-1">{issue.title}</span>
                <span className="text-xs text-blue-600 shrink-0">열기 →</span>
              </a>
            ))}
          </div>
        </section>
      )}

      {issuesResult.failed.length > 0 && (
        <section className="mb-8">
          <p className="section-label text-red-600 mb-3">생성 실패</p>
          <div className="flex flex-col gap-2">
            {issuesResult.failed.map((issue, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 border border-red-200 rounded-lg bg-red-50"
              >
                <span className="text-sm text-gray-700 flex-1">{issue.title}</span>
                <span className="text-xs text-red-600 shrink-0">{issue.error}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="flex gap-3 flex-wrap">
        <a
          href={projectUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary no-underline"
        >
          GitHub 프로젝트 보기
        </a>
        <a
          href={repoIssuesUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary no-underline"
        >
          GitHub 이슈 목록 보기
        </a>
        <button onClick={() => router.push('/')} className="btn-secondary">
          새 아이디어 입력하기
        </button>
      </div>
    </main>
  );
}
