import { Octokit } from '@octokit/rest';

export const createOctokit = (accessToken: string) => {
  return new Octokit({ auth: accessToken });
};
