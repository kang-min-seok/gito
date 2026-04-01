export type IssueType = 'story' | 'task';

export type RepoStructure = 'monorepo' | 'split';

export interface GitHubRepo {
  owner: string;
  name: string;
  fullName: string;
}

export interface IssuePayload {
  title: string;
  body: string;
  labels: string[];
  type: IssueType;
}

export interface GeneratedIssue extends IssuePayload {
  children?: GeneratedIssue[];
}

export interface EpicGroup {
  epic: string;
  stories: GeneratedIssue[];
}

export interface GenerateIssuesResult {
  issues: EpicGroup[];
}

export interface MonorepoIssuesResult {
  type: 'monorepo';
  issues: EpicGroup[];
}

export interface SplitIssuesResult {
  type: 'split';
  frontend: { issues: EpicGroup[] };
  backend: { issues: EpicGroup[] };
}

export type IssuesResult = MonorepoIssuesResult | SplitIssuesResult;

export interface GitHubRepoItem {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
  updatedAt: string | null;
}

export interface GitHubOwnerInfo {
  login: string;
  orgs: Array<{ login: string }>;
}

export interface CreatedIssue {
  title: string;
  url: string;
  number: number;
  nodeId: string;
  epicName: string;
  issueType: IssueType;
}

export interface CreateIssuesResult {
  created: CreatedIssue[];
  failed: Array<{ title: string; error: string }>;
}

export interface SetupProjectResult {
  projectUrl: string;
  projectId: string;
  issueTypeFieldId: string;
  storyOptionId: string;
  taskOptionId: string;
  epicFieldId: string;
  epicOptions: Array<{ name: string; id: string }>;
}
