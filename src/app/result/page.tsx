'use client';

import { useEffect, useState, startTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ISSUES_STORAGE_KEY, SELECTED_REPO_KEY } from '@/constants/planning';
import { GenerateIssuesSchema } from '@/features/issues/schemas';
import type { CreateIssuesResult, GitHubRepoItem, SetupProjectResult } from '@/types/github';
import Button from '@/components/Button';

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

  /* ── 로딩 상태 ── */
  if (pageState.status === 'creating_project' || pageState.status === 'creating_issues') {
    const isProject = pageState.status === 'creating_project';
    return (
      <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6 py-10">
        <div className="w-full max-w-[440px] bg-[#161b22] border border-[#30363d] rounded-2xl p-8 flex flex-col items-center gap-6">
          <div className="w-14 h-14 rounded-full border-4 border-[#6762a7]/30 border-t-[#6762a7] animate-spin" />
          <div className="text-center flex flex-col gap-2">
            <p className="text-lg font-semibold text-[#f1f5f9]">
              {isProject ? '프로젝트를 생성하고 있습니다...' : '이슈를 생성하고 있습니다...'}
            </p>
            <p className="text-[13px] text-[#94a3b8]">
              {isProject
                ? 'GitHub Projects와 커스텀 필드를 설정하는 중입니다.'
                : 'GitHub에 이슈를 등록하고 프로젝트에 추가하는 중입니다.'}
            </p>
          </div>
          <div className="w-full bg-[#6762a7]/20 rounded-lg px-4 py-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#6762a7] animate-pulse shrink-0" />
            <span className="text-[13px] text-[#f1f5f9]">
              {isProject ? 'GitHub 프로젝트 생성 중...' : 'GitHub 이슈 등록 중...'}
            </span>
          </div>
          <div className="w-full flex flex-col gap-2 border-t border-[#30363d] pt-4">
            {!isProject && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#3fb950] shrink-0" />
                <span className="text-[12px] text-[#94a3b8]">GitHub 프로젝트 생성 완료</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#6762a7] animate-pulse shrink-0" />
              <span className="text-[12px] text-[#94a3b8]">
                {isProject ? 'GitHub 프로젝트 생성 중...' : 'GitHub 이슈 등록 중...'}
              </span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* ── 에러 상태 ── */
  if (pageState.status === 'error') {
    return (
      <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6 py-10">
        <div className="w-full max-w-[440px] bg-[#161b22] border border-red-800/50 rounded-2xl p-8 flex flex-col items-center gap-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-900/30 flex items-center justify-center text-2xl">
            ✕
          </div>
          <div>
            <p className="text-lg font-semibold text-red-400 mb-2">오류가 발생했습니다</p>
            <p className="text-[13px] text-[#94a3b8]">{pageState.message}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => router.back()}>
              돌아가기
            </Button>
            <Button onClick={() => router.push('/')}>처음으로</Button>
          </div>
        </div>
      </main>
    );
  }

  /* ── 성공 상태 ── */
  const { issuesResult, repo, projectUrl } = pageState;
  const repoIssuesUrl = `https://github.com/${repo.fullName}/issues`;

  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6 py-10">
      <div className="w-full max-w-[480px] bg-[#161b22] border border-[#30363d] rounded-2xl p-8 flex flex-col items-center gap-6">
        {/* 완료 아이콘 */}
        <div className="w-16 h-16 rounded-full bg-[#3fb950]/20 border-2 border-[#3fb950] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M20 6L9 17l-5-5"
              stroke="#3fb950"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="text-center flex flex-col gap-2">
          <h1 className="text-xl font-bold text-[#f1f5f9]">이슈 생성이 완료되었습니다!</h1>
          <p className="text-[13px] text-[#94a3b8] leading-relaxed">
            축하합니다! 모든 단계가 성공적으로 마무리되었습니다.
            <br />
            설정하신 GitHub 레포지토리에 프로젝트를 만들고
            <br />
            이슈를 생성 및 등록하였습니다!!
          </p>
        </div>

        {/* 레포 정보 */}
        <div className="w-full flex items-center gap-3 px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-xl">
          <div className="w-8 h-8 rounded-md bg-[#30363d] flex items-center justify-center text-[14px] shrink-0">
            📦
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#f1f5f9] truncate">{repo.fullName}</p>
            <p className="text-[11px] text-[#64748b]">
              {issuesResult.created.length}개 이슈 생성
              {issuesResult.failed.length > 0 && (
                <span className="text-red-400"> · {issuesResult.failed.length}개 실패</span>
              )}
            </p>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#3fb950] shrink-0" />
        </div>

        {/* 실패 목록 */}
        {issuesResult.failed.length > 0 && (
          <div className="w-full">
            <p className="section-label text-red-400 mb-2">생성 실패</p>
            <div className="flex flex-col gap-2">
              {issuesResult.failed.map((issue, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 px-4 py-3 border border-red-800/50 rounded-lg bg-red-900/10"
                >
                  <span className="text-[13px] text-[#94a3b8] flex-1">{issue.title}</span>
                  <span className="text-[11px] text-red-400 shrink-0">{issue.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="w-full flex gap-3">
          <Button
            variant="secondary"
            href={projectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            GitHub에서 확인하기
          </Button>
          <Button href={repoIssuesUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
            + 새 프로젝트 시작
          </Button>
        </div>

        <button
          onClick={() => router.push('/')}
          className="text-[12px] text-[#64748b] hover:text-[#94a3b8] bg-transparent border-0 cursor-pointer"
        >
          새 아이디어 입력하기
        </button>
      </div>
    </main>
  );
}
