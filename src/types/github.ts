export type IssueType = 'epic' | 'story' | 'task';

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
