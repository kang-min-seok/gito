import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { createOctokit } from '@/lib/github';
import type { GitHubOwnerInfo } from '@/types/github';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  try {
    const octokit = createOctokit(session.accessToken);

    const [userRes, orgsRes] = await Promise.all([
      octokit.users.getAuthenticated(),
      octokit.orgs.listForAuthenticatedUser({ per_page: 100 }),
    ]);

    const result: GitHubOwnerInfo = {
      login: userRes.data.login,
      orgs: orgsRes.data.map((org) => ({ login: org.login })),
    };

    return Response.json(result);
  } catch (error) {
    console.error('[GET /api/github/orgs]', error);
    return Response.json({ error: '조직 목록을 가져오는 데 실패했습니다.' }, { status: 500 });
  }
}
