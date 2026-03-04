import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { createOctokit } from '@/lib/github';
import { CreateIssuesRequestSchema } from '@/features/issues/schemas';
import type { CreateIssuesResult, CreatedIssue } from '@/types/github';

async function githubGraphQL<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return json.data as T;
}

async function addIssueToProject(
  token: string,
  projectId: string,
  nodeId: string,
  issueTypeFieldId: string,
  issueTypeOptionId: string,
  epicFieldId: string,
  epicOptionId: string
) {
  const addData = await githubGraphQL<{ addProjectV2ItemById: { item: { id: string } } }>(
    token,
    `mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: { projectId: $projectId, contentId: $contentId }) {
        item { id }
      }
    }`,
    { projectId, contentId: nodeId }
  );
  const itemId = addData.addProjectV2ItemById.item.id;

  await githubGraphQL(
    token,
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { singleSelectOptionId: $optionId }
      }) { projectV2Item { id } }
    }`,
    { projectId, itemId, fieldId: issueTypeFieldId, optionId: issueTypeOptionId }
  );

  await githubGraphQL(
    token,
    `mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { singleSelectOptionId: $optionId }
      }) { projectV2Item { id } }
    }`,
    { projectId, itemId, fieldId: epicFieldId, optionId: epicOptionId }
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const parseResult = CreateIssuesRequestSchema.safeParse(await req.json());
  if (!parseResult.success) {
    return Response.json({ error: '요청 데이터가 올바르지 않습니다.' }, { status: 400 });
  }

  const { owner, repo, issues, project } = parseResult.data;
  const octokit = createOctokit(session.accessToken);
  const token = session.accessToken;

  const created: CreatedIssue[] = [];
  const failed: Array<{ title: string; error: string }> = [];

  for (const epicGroup of issues.issues) {
    const epicOption = project?.epicOptions.find((o) => o.name === epicGroup.epic);

    for (const story of epicGroup.stories) {
      let storyNumber: number | null = null;

      try {
        const { data } = await octokit.issues.create({
          owner,
          repo,
          title: story.title,
          body: story.body,
          labels: story.labels,
        });
        storyNumber = data.number;
        created.push({
          title: story.title,
          url: data.html_url,
          number: data.number,
          nodeId: data.node_id,
          epicName: epicGroup.epic,
          issueType: 'story',
        });

        if (project && epicOption) {
          await addIssueToProject(
            token,
            project.projectId,
            data.node_id,
            project.issueTypeFieldId,
            project.storyOptionId,
            project.epicFieldId,
            epicOption.id
          ).catch(() => {
            /* 프로젝트 추가 실패는 이슈 생성 성공으로 처리 */
          });
        }
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
          created.push({
            title: task.title,
            url: data.html_url,
            number: data.number,
            nodeId: data.node_id,
            epicName: epicGroup.epic,
            issueType: 'task',
          });

          // 스토리의 하위 이슈로 등록
          if (storyNumber !== null) {
            await octokit
              .request('POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', {
                owner,
                repo,
                issue_number: storyNumber,
                sub_issue_id: data.id,
              })
              .catch(() => {
                /* sub-issue 연결 실패는 이슈 생성 성공으로 처리 */
              });
          }

          if (project && epicOption) {
            await addIssueToProject(
              token,
              project.projectId,
              data.node_id,
              project.issueTypeFieldId,
              project.taskOptionId,
              project.epicFieldId,
              epicOption.id
            ).catch(() => {
              /* 프로젝트 추가 실패는 이슈 생성 성공으로 처리 */
            });
          }
        } catch {
          failed.push({ title: task.title, error: '이슈 생성에 실패했습니다.' });
        }
      }
    }
  }

  const result: CreateIssuesResult = { created, failed };
  return Response.json(result);
}
