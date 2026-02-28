export type IssueType = 'story' | 'task';

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
}

export interface CreateIssuesResult {
  created: CreatedIssue[];
  failed: Array<{ title: string; error: string }>;
}
