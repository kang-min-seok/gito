'use client';

import { useEffect, useState, startTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ISSUES_STORAGE_KEY, SELECTED_REPO_KEY } from '@/constants/planning';
import { GenerateIssuesSchema, SplitGenerateIssuesSchema } from '@/features/issues/schemas';
import type {
  CreateIssuesResult,
  GitHubRepoItem,
  IssuesResult,
  SetupProjectResult,
} from '@/types/github';
import Button from '@/components/Button';

// ── 타입 ────────────────────────────────────────────────────────────────

interface MonorepoSelected {
  type: 'monorepo';
  repo: GitHubRepoItem;
}

interface SplitSelected {
  type: 'split';
  frontend: GitHubRepoItem;
  backend: GitHubRepoItem;
}

type SelectedRepo = MonorepoSelected | SplitSelected;

// ── 페이지 상태 ──────────────────────────────────────────────────────────

type PhaseStatus = 'pending' | 'running' | 'done';

interface MonorepoPageState {
  type: 'monorepo';
  setupPhase: PhaseStatus;
  issuesPhase: PhaseStatus;
  result: CreateIssuesResult | null;
  repo: GitHubRepoItem | null;
  projectUrl: string | null;
  error: string | null;
}

interface SplitPhase {
  setup: PhaseStatus;
  issues: PhaseStatus;
  result: CreateIssuesResult | null;
  projectUrl: string | null;
}

interface SplitPageState {
  type: 'split';
  frontend: SplitPhase;
  backend: SplitPhase;
  repos: { frontend: GitHubRepoItem; backend: GitHubRepoItem } | null;
  error: string | null;
}

type PageState = MonorepoPageState | SplitPageState;

// ── 유틸 ─────────────────────────────────────────────────────────────────

async function setupProject(
  owner: string,
  projectTitle: string,
  epicNames: string[]
): Promise<SetupProjectResult> {
  const res = await fetch('/api/github/setup-project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner, projectTitle, epicNames }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? '프로젝트 생성 중 오류가 발생했습니다.');
  }
  return res.json() as Promise<SetupProjectResult>;
}

async function createIssues(
  owner: string,
  repo: string,
  issues: { issues: unknown[] },
  project: SetupProjectResult
): Promise<CreateIssuesResult> {
  const res = await fetch('/api/github/create-issues', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      owner,
      repo,
      issues,
      project: {
        projectId: project.projectId,
        issueTypeFieldId: project.issueTypeFieldId,
        storyOptionId: project.storyOptionId,
        taskOptionId: project.taskOptionId,
        epicFieldId: project.epicFieldId,
        epicOptions: project.epicOptions,
      },
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? '이슈 생성 중 오류가 발생했습니다.');
  }
  return res.json() as Promise<CreateIssuesResult>;
}

// ── 컴포넌트 ─────────────────────────────────────────────────────────────

export default function ResultPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    async function run() {
      const issuesRaw = sessionStorage.getItem(ISSUES_STORAGE_KEY);
      const repoRaw = sessionStorage.getItem(SELECTED_REPO_KEY);
      if (!issuesRaw || !repoRaw) {
        router.replace('/');
        return;
      }

      let issuesData: IssuesResult;
      let selectedRepo: SelectedRepo;

      try {
        const parsedIssues = JSON.parse(issuesRaw) as { type?: string };
        const parsedRepo = JSON.parse(repoRaw) as unknown;

        if (parsedIssues.type === 'split') {
          const result = SplitGenerateIssuesSchema.parse(parsedIssues);
          issuesData = { type: 'split', frontend: result.frontend, backend: result.backend };
          const repos = parsedRepo as { frontend: GitHubRepoItem; backend: GitHubRepoItem };
          selectedRepo = { type: 'split', frontend: repos.frontend, backend: repos.backend };
        } else {
          const result = GenerateIssuesSchema.parse(parsedIssues);
          issuesData = { type: 'monorepo', issues: result.issues };
          selectedRepo = { type: 'monorepo', repo: parsedRepo as GitHubRepoItem };
        }
      } catch {
        router.replace('/');
        return;
      }

      if (issuesData.type === 'monorepo' && selectedRepo.type === 'monorepo') {
        const { repo } = selectedRepo;
        startTransition(() =>
          setPageState({
            type: 'monorepo',
            setupPhase: 'running',
            issuesPhase: 'pending',
            result: null,
            repo,
            projectUrl: null,
            error: null,
          })
        );

        try {
          const epicNames = issuesData.issues.map((g) => g.epic);
          const projectInfo = await setupProject(repo.owner, repo.name, epicNames);

          startTransition(() =>
            setPageState((prev) =>
              prev?.type === 'monorepo'
                ? { ...prev, setupPhase: 'done', issuesPhase: 'running' }
                : prev
            )
          );

          const issuesResult = await createIssues(
            repo.owner,
            repo.name,
            { issues: issuesData.issues },
            projectInfo
          );

          startTransition(() =>
            setPageState((prev) =>
              prev?.type === 'monorepo'
                ? {
                    ...prev,
                    issuesPhase: 'done',
                    result: issuesResult,
                    projectUrl: projectInfo.projectUrl,
                  }
                : prev
            )
          );
        } catch (err: unknown) {
          startTransition(() =>
            setPageState((prev) =>
              prev?.type === 'monorepo'
                ? { ...prev, error: err instanceof Error ? err.message : '오류가 발생했습니다.' }
                : prev
            )
          );
        }
      } else if (issuesData.type === 'split' && selectedRepo.type === 'split') {
        const { frontend: feRepo, backend: beRepo } = selectedRepo;

        startTransition(() =>
          setPageState({
            type: 'split',
            frontend: { setup: 'running', issues: 'pending', result: null, projectUrl: null },
            backend: { setup: 'pending', issues: 'pending', result: null, projectUrl: null },
            repos: { frontend: feRepo, backend: beRepo },
            error: null,
          })
        );

        try {
          // Phase 1: 프론트엔드
          const feEpicNames = issuesData.frontend.issues.map((g) => g.epic);
          const feProject = await setupProject(feRepo.owner, feRepo.name, feEpicNames);

          startTransition(() =>
            setPageState((prev) =>
              prev?.type === 'split'
                ? { ...prev, frontend: { ...prev.frontend, setup: 'done', issues: 'running' } }
                : prev
            )
          );

          const feResult = await createIssues(
            feRepo.owner,
            feRepo.name,
            issuesData.frontend,
            feProject
          );

          startTransition(() =>
            setPageState((prev) =>
              prev?.type === 'split'
                ? {
                    ...prev,
                    frontend: {
                      ...prev.frontend,
                      issues: 'done',
                      result: feResult,
                      projectUrl: feProject.projectUrl,
                    },
                    backend: { ...prev.backend, setup: 'running' },
                  }
                : prev
            )
          );

          // Phase 2: 백엔드
          const beEpicNames = issuesData.backend.issues.map((g) => g.epic);
          const beProject = await setupProject(beRepo.owner, beRepo.name, beEpicNames);

          startTransition(() =>
            setPageState((prev) =>
              prev?.type === 'split'
                ? { ...prev, backend: { ...prev.backend, setup: 'done', issues: 'running' } }
                : prev
            )
          );

          const beResult = await createIssues(
            beRepo.owner,
            beRepo.name,
            issuesData.backend,
            beProject
          );

          startTransition(() =>
            setPageState((prev) =>
              prev?.type === 'split'
                ? {
                    ...prev,
                    backend: {
                      ...prev.backend,
                      issues: 'done',
                      result: beResult,
                      projectUrl: beProject.projectUrl,
                    },
                  }
                : prev
            )
          );
        } catch (err: unknown) {
          startTransition(() =>
            setPageState((prev) =>
              prev?.type === 'split'
                ? { ...prev, error: err instanceof Error ? err.message : '오류가 발생했습니다.' }
                : prev
            )
          );
        }
      }
    }

    run().catch((err: unknown) => {
      startTransition(() =>
        setPageState({
          type: 'monorepo',
          setupPhase: 'pending',
          issuesPhase: 'pending',
          result: null,
          repo: null,
          projectUrl: null,
          error: err instanceof Error ? err.message : '오류가 발생했습니다.',
        })
      );
    });
  }, [router]);

  // ── 로딩 상태 (초기) ──
  if (!pageState) {
    return (
      <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6 py-10">
        <div className="w-8 h-8 rounded-full border-2 border-[#30363d] border-t-[#6762a7] animate-spin" />
      </main>
    );
  }

  // ── 에러 상태 ──
  const error = pageState.error;
  if (error) {
    return (
      <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6 py-10">
        <div className="w-full max-w-110 bg-[#161b22] border border-red-800/50 rounded-2xl p-8 flex flex-col items-center gap-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-900/30 flex items-center justify-center text-2xl">
            ✕
          </div>
          <div>
            <p className="text-lg font-semibold text-red-400 mb-2">오류가 발생했습니다</p>
            <p className="text-[13px] text-[#94a3b8]">{error}</p>
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

  // ── 모노레포 진행/완료 ──
  if (pageState.type === 'monorepo') {
    const { setupPhase, issuesPhase, result, repo, projectUrl } = pageState;
    const isDone = issuesPhase === 'done' && result !== null;

    if (!isDone) {
      return (
        <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6 py-10">
          <div className="w-full max-w-110 bg-[#161b22] border border-[#30363d] rounded-2xl p-8 flex flex-col items-center gap-6">
            <div className="w-14 h-14 rounded-full border-4 border-[#6762a7]/30 border-t-[#6762a7] animate-spin" />
            <div className="text-center flex flex-col gap-2">
              <p className="text-lg font-semibold text-[#f1f5f9]">
                {setupPhase === 'running'
                  ? '프로젝트를 생성하고 있습니다...'
                  : '이슈를 생성하고 있습니다...'}
              </p>
              <p className="text-[13px] text-[#94a3b8]">
                {setupPhase === 'running'
                  ? 'GitHub Projects와 커스텀 필드를 설정하는 중입니다.'
                  : 'GitHub에 이슈를 등록하고 프로젝트에 추가하는 중입니다.'}
              </p>
            </div>
            <PhaseLog
              steps={[
                { label: 'GitHub 프로젝트 생성', status: setupPhase },
                { label: 'GitHub 이슈 등록', status: issuesPhase },
              ]}
            />
          </div>
        </main>
      );
    }

    return (
      <MonorepoSuccessView
        repo={repo!}
        projectUrl={projectUrl!}
        issuesResult={result}
        onNewProject={() => router.push('/')}
      />
    );
  }

  // ── Split 진행/완료 ──
  const { frontend: fe, backend: be, repos } = pageState;
  const isSplitDone = fe.issues === 'done' && be.issues === 'done';

  if (!isSplitDone) {
    return (
      <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6 py-10">
        <div className="w-full max-w-110 bg-[#161b22] border border-[#30363d] rounded-2xl p-8 flex flex-col items-center gap-6">
          <div className="w-14 h-14 rounded-full border-4 border-[#6762a7]/30 border-t-[#6762a7] animate-spin" />
          <div className="text-center flex flex-col gap-2">
            <p className="text-lg font-semibold text-[#f1f5f9]">이슈를 생성하고 있습니다...</p>
            <p className="text-[13px] text-[#94a3b8]">
              프론트엔드와 백엔드 레포지토리에 순차적으로 이슈를 등록합니다.
            </p>
          </div>
          <PhaseLog
            steps={[
              { label: `[FE] ${repos?.frontend.name ?? ''} — 프로젝트 생성`, status: fe.setup },
              { label: `[FE] ${repos?.frontend.name ?? ''} — 이슈 등록`, status: fe.issues },
              { label: `[BE] ${repos?.backend.name ?? ''} — 프로젝트 생성`, status: be.setup },
              { label: `[BE] ${repos?.backend.name ?? ''} — 이슈 등록`, status: be.issues },
            ]}
          />
        </div>
      </main>
    );
  }

  // split 완료
  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6 py-10">
      <div className="w-full max-w-130 bg-[#161b22] border border-[#30363d] rounded-2xl p-8 flex flex-col items-center gap-6">
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
            프론트엔드와 백엔드 레포지토리에 각각 이슈와 프로젝트를 생성했습니다.
          </p>
        </div>

        <div className="w-full flex flex-col gap-3">
          {(
            [
              { label: '프론트엔드', repo: repos?.frontend, phase: fe },
              { label: '백엔드', repo: repos?.backend, phase: be },
            ] as const
          ).map(({ label, repo, phase }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-xl"
            >
              <div className="w-8 h-8 rounded-md bg-[#30363d] flex items-center justify-center text-[14px] shrink-0">
                📦
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-[#6762a7] uppercase">{label}</span>
                  <p className="text-[13px] font-semibold text-[#f1f5f9] truncate">
                    {repo?.fullName}
                  </p>
                </div>
                <p className="text-[11px] text-[#64748b]">
                  {phase.result?.created.length ?? 0}개 이슈 생성
                  {(phase.result?.failed.length ?? 0) > 0 && (
                    <span className="text-red-400"> · {phase.result?.failed.length}개 실패</span>
                  )}
                </p>
              </div>
              {phase.projectUrl && (
                <a
                  href={phase.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[#94a3b8] hover:text-[#f1f5f9] shrink-0"
                >
                  프로젝트 →
                </a>
              )}
            </div>
          ))}
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

// ── 하위 컴포넌트 ─────────────────────────────────────────────────────────

function PhaseLog({ steps }: { steps: { label: string; status: PhaseStatus }[] }) {
  return (
    <div className="w-full flex flex-col gap-2 border-t border-[#30363d] pt-4">
      {steps.map(({ label, status }) => (
        <div key={label} className="flex items-center gap-2">
          {status === 'done' ? (
            <span className="w-2 h-2 rounded-full bg-[#3fb950] shrink-0" />
          ) : status === 'running' ? (
            <span className="w-2 h-2 rounded-full bg-[#6762a7] animate-pulse shrink-0" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-[#30363d] shrink-0" />
          )}
          <span className="text-[12px] text-[#94a3b8]">{label}</span>
        </div>
      ))}
    </div>
  );
}

function MonorepoSuccessView({
  repo,
  projectUrl,
  issuesResult,
  onNewProject,
}: {
  repo: GitHubRepoItem;
  projectUrl: string;
  issuesResult: CreateIssuesResult;
  onNewProject: () => void;
}) {
  const repoIssuesUrl = `https://github.com/${repo.fullName}/issues`;

  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6 py-10">
      <div className="w-full max-w-120 bg-[#161b22] border border-[#30363d] rounded-2xl p-8 flex flex-col items-center gap-6">
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
          onClick={onNewProject}
          className="text-[12px] text-[#64748b] hover:text-[#94a3b8] bg-transparent border-0 cursor-pointer"
        >
          새 아이디어 입력하기
        </button>
      </div>
    </main>
  );
}
