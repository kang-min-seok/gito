import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { createOctokit } from '@/lib/github';
import { GITHUB_API } from '@/constants/github';
import type { GitHubRepoItem } from '@/types/github';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const octokit = createOctokit(session.accessToken);
    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: GITHUB_API.REPOS_PER_PAGE,
    });

    const repos: GitHubRepoItem[] = data.map((repo) => ({
      owner: repo.owner.login,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      isPrivate: repo.private,
      updatedAt: repo.updated_at,
    }));

    return Response.json(repos);
  } catch (error) {
    console.error('[GET /api/github/repos]', error);
    return Response.json({ error: '레포지토리 목록을 가져오는 데 실패했습니다.' }, { status: 500 });
  }
}
