import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { SetupProjectRequestSchema } from '@/features/issues/schemas';
import type { SetupProjectResult } from '@/types/github';

const EPIC_COLORS = ['RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE', 'PINK'] as const;

async function githubGraphQL<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {},
  step = 'unknown'
): Promise<T> {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{ message: string; type?: string; locations?: unknown[] }>;
  };

  console.log(`[setup-project][${step}] HTTP ${res.status}`, JSON.stringify(json, null, 2));

  if (json.errors?.length) {
    const messages = json.errors.map((e) => e.message).join(' | ');
    throw new Error(`[${step}] ${messages}`);
  }
  if (!json.data) {
    throw new Error(`[${step}] GraphQL 응답에 data가 없습니다. 전체 응답: ${JSON.stringify(json)}`);
  }
  return json.data;
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const parseResult = SetupProjectRequestSchema.safeParse(await req.json());
  if (!parseResult.success) {
    return Response.json({ error: '요청 데이터가 올바르지 않습니다.' }, { status: 400 });
  }

  const { owner, projectTitle, epicNames } = parseResult.data;
  const token = session.accessToken;

  try {
    console.log(
      `[setup-project] START owner=${owner} projectTitle=${projectTitle} epics=${epicNames.join(',')}`
    );

    // 1. Get owner node ID
    const ownerData = await githubGraphQL<{ repositoryOwner: { id: string } | null }>(
      token,
      `query($login: String!) { repositoryOwner(login: $login) { id } }`,
      { login: owner },
      '1-get-owner'
    );
    const ownerId = ownerData.repositoryOwner?.id;
    if (!ownerId) throw new Error(`Owner '${owner}'를 찾을 수 없습니다.`);

    // 2. Create project
    const projectData = await githubGraphQL<{
      createProjectV2: { projectV2: { id: string; url: string } };
    }>(
      token,
      `mutation($ownerId: ID!, $title: String!) {
        createProjectV2(input: { ownerId: $ownerId, title: $title }) {
          projectV2 { id url }
        }
      }`,
      { ownerId, title: projectTitle },
      '2-create-project'
    );
    const { id: projectId, url: projectUrl } = projectData.createProjectV2.projectV2;

    // 3. Create "Issue Type" SINGLE_SELECT field
    const issueTypeFieldData = await githubGraphQL<{
      createProjectV2Field: {
        projectV2Field: { id: string; options: Array<{ id: string; name: string }> };
      };
    }>(
      token,
      `mutation($projectId: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) {
        createProjectV2Field(input: {
          projectId: $projectId
          dataType: SINGLE_SELECT
          name: "Issue Type"
          singleSelectOptions: $options
        }) {
          projectV2Field {
            ... on ProjectV2SingleSelectField { id options { id name } }
          }
        }
      }`,
      {
        projectId,
        options: [
          { name: 'story', color: 'BLUE', description: '' },
          { name: 'task', color: 'YELLOW', description: '' },
        ],
      },
      '3-create-issue-type-field'
    );
    const issueTypeField = issueTypeFieldData.createProjectV2Field.projectV2Field;
    const storyOptionId = issueTypeField.options.find((o) => o.name === 'story')?.id ?? '';
    const taskOptionId = issueTypeField.options.find((o) => o.name === 'task')?.id ?? '';

    // 4. Create "Epic" SINGLE_SELECT field
    const uniqueEpics = [...new Set(epicNames)];
    const epicOptions = uniqueEpics.map((epic, idx) => ({
      name: epic,
      color: EPIC_COLORS[idx % EPIC_COLORS.length],
      description: '',
    }));

    const epicFieldData = await githubGraphQL<{
      createProjectV2Field: {
        projectV2Field: { id: string; options: Array<{ id: string; name: string }> };
      };
    }>(
      token,
      `mutation($projectId: ID!, $options: [ProjectV2SingleSelectFieldOptionInput!]!) {
        createProjectV2Field(input: {
          projectId: $projectId
          dataType: SINGLE_SELECT
          name: "Epic"
          singleSelectOptions: $options
        }) {
          projectV2Field {
            ... on ProjectV2SingleSelectField { id options { id name } }
          }
        }
      }`,
      { projectId, options: epicOptions },
      '4-create-epic-field'
    );
    const epicField = epicFieldData.createProjectV2Field.projectV2Field;

    const result: SetupProjectResult = {
      projectUrl,
      projectId,
      issueTypeFieldId: issueTypeField.id,
      storyOptionId,
      taskOptionId,
      epicFieldId: epicField.id,
      epicOptions: epicField.options.map((o) => ({ name: o.name, id: o.id })),
    };

    return Response.json(result);
  } catch (err) {
    console.error('[setup-project] FAILED:', err);
    const message = err instanceof Error ? err.message : '프로젝트 설정 중 오류가 발생했습니다.';
    return Response.json({ error: message }, { status: 500 });
  }
}
