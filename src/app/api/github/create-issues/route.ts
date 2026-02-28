import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { createOctokit } from '@/lib/github';
import { CreateIssuesRequestSchema } from '@/features/issues/schemas';
import type { CreateIssuesResult, CreatedIssue } from '@/types/github';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const parseResult = CreateIssuesRequestSchema.safeParse(await req.json());
  if (!parseResult.success) {
    return Response.json({ error: '요청 데이터가 올바르지 않습니다.' }, { status: 400 });
  }

  const { owner, repo, issues } = parseResult.data;
  const octokit = createOctokit(session.accessToken);

  const created: CreatedIssue[] = [];
  const failed: Array<{ title: string; error: string }> = [];

  for (const epicGroup of issues.issues) {
    for (const story of epicGroup.stories) {
      try {
        const { data } = await octokit.issues.create({
          owner,
          repo,
          title: story.title,
          body: story.body,
          labels: story.labels,
        });
        created.push({ title: story.title, url: data.html_url, number: data.number });
      } catch {
        failed.push({ title: story.title, error: '이슈 생성에 실패했습니다.' });
      }

      for (const task of story.children ?? []) {
        try {
          const { data } = await octokit.issues.create({
            owner,
            repo,
            title: task.title,
            body: task.body,
            labels: task.labels,
          });
          created.push({ title: task.title, url: data.html_url, number: data.number });
        } catch {
          failed.push({ title: task.title, error: '이슈 생성에 실패했습니다.' });
        }
      }
    }
  }

  const result: CreateIssuesResult = { created, failed };
  return Response.json(result);
}
