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
  // Step 1: 프로젝트에 이슈 추가 (itemId 확정 필요)
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

  // Step 2: 두 필드 업데이트를 병렬 처리
  const UPDATE_MUTATION = `
    mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
      updateProjectV2ItemFieldValue(input: {
        projectId: $projectId
        itemId: $itemId
        fieldId: $fieldId
        value: { singleSelectOptionId: $optionId }
      }) { projectV2Item { id } }
    }
  `;

  await Promise.all([
    githubGraphQL(token, UPDATE_MUTATION, {
      projectId,
      itemId,
      fieldId: issueTypeFieldId,
      optionId: issueTypeOptionId,
    }),
    githubGraphQL(token, UPDATE_MUTATION, {
      projectId,
      itemId,
      fieldId: epicFieldId,
      optionId: epicOptionId,
    }),
  ]);
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

  // ── Step 1: 모든 Story 병렬 생성 ──────────────────────────────────────

  type StoryJob = {
    story: (typeof issues.issues)[number]['stories'][number];
    epicGroup: (typeof issues.issues)[number];
  };

  const storyJobs: StoryJob[] = issues.issues.flatMap((epicGroup) =>
    epicGroup.stories.map((story) => ({ story, epicGroup }))
  );

  const storyResults = await Promise.allSettled(
    storyJobs.map(async ({ story, epicGroup }) => {
      const { data } = await octokit.issues.create({
        owner,
        repo,
        title: story.title,
        body: story.body,
        labels: story.labels,
      });
      return { story, epicGroup, issueData: data };
    })
  );

  type CreatedStory = {
    story: StoryJob['story'];
    epicGroup: StoryJob['epicGroup'];
    issueData: { number: number; html_url: string; node_id: string; id: number };
  };

  const createdStories: CreatedStory[] = [];

  for (const result of storyResults) {
    if (result.status === 'fulfilled') {
      const { story, epicGroup, issueData } = result.value;
      created.push({
        title: story.title,
        url: issueData.html_url,
        number: issueData.number,
        nodeId: issueData.node_id,
        epicName: epicGroup.epic,
        issueType: 'story',
      });
      createdStories.push(result.value);
    } else {
      const job = storyJobs[storyResults.indexOf(result)];
      failed.push({ title: job.story.title, error: '이슈 생성에 실패했습니다.' });
    }
  }

  // ── Step 2: 모든 Task 병렬 생성 ──────────────────────────────────────

  type TaskJob = {
    task: NonNullable<StoryJob['story']['children']>[number];
    epicGroup: StoryJob['epicGroup'];
    storyNumber: number;
  };

  const taskJobs: TaskJob[] = createdStories.flatMap(({ story, epicGroup, issueData }) =>
    (story.children ?? []).map((task) => ({
      task,
      epicGroup,
      storyNumber: issueData.number,
    }))
  );

  const taskResults = await Promise.allSettled(
    taskJobs.map(async ({ task, epicGroup, storyNumber }) => {
      const { data } = await octokit.issues.create({
        owner,
        repo,
        title: task.title,
        body: task.body,
        labels: task.labels,
      });
      return { task, epicGroup, storyNumber, issueData: data };
    })
  );

  type CreatedTask = {
    task: TaskJob['task'];
    epicGroup: TaskJob['epicGroup'];
    storyNumber: number;
    issueData: { number: number; html_url: string; node_id: string; id: number };
  };

  const createdTasks: CreatedTask[] = [];

  for (const result of taskResults) {
    if (result.status === 'fulfilled') {
      const { task, epicGroup, issueData } = result.value;
      created.push({
        title: task.title,
        url: issueData.html_url,
        number: issueData.number,
        nodeId: issueData.node_id,
        epicName: epicGroup.epic,
        issueType: 'task',
      });
      createdTasks.push(result.value);
    } else {
      const job = taskJobs[taskResults.indexOf(result)];
      failed.push({ title: job.task.title, error: '이슈 생성에 실패했습니다.' });
    }
  }

  // ── Step 3: 프로젝트 추가 + sub_issue 연결 병렬 처리 (fire-and-forget) ──

  const postCreationJobs: Promise<void>[] = [];

  if (project) {
    for (const { epicGroup, issueData } of createdStories) {
      const epicOption = project.epicOptions.find((o) => o.name === epicGroup.epic);
      if (!epicOption) continue;
      postCreationJobs.push(
        addIssueToProject(
          token,
          project.projectId,
          issueData.node_id,
          project.issueTypeFieldId,
          project.storyOptionId,
          project.epicFieldId,
          epicOption.id
        ).catch(() => {})
      );
    }

    for (const { epicGroup, issueData } of createdTasks) {
      const epicOption = project.epicOptions.find((o) => o.name === epicGroup.epic);
      if (!epicOption) continue;
      postCreationJobs.push(
        addIssueToProject(
          token,
          project.projectId,
          issueData.node_id,
          project.issueTypeFieldId,
          project.taskOptionId,
          project.epicFieldId,
          epicOption.id
        ).catch(() => {})
      );
    }
  }

  for (const { storyNumber, issueData } of createdTasks) {
    postCreationJobs.push(
      octokit
        .request('POST /repos/{owner}/{repo}/issues/{issue_number}/sub_issues', {
          owner,
          repo,
          issue_number: storyNumber,
          sub_issue_id: issueData.id,
        })
        .then(() => {})
        .catch(() => {})
    );
  }

  await Promise.all(postCreationJobs);

  return Response.json({ created, failed } satisfies CreateIssuesResult);
}
