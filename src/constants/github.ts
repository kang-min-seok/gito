export const GITHUB_API = {
  BASE_URL: 'https://api.github.com',
  MAX_ISSUES_PER_REQUEST: 100,
  REPOS_PER_PAGE: 100,
} as const;

export const ISSUE_LABEL = {
  EPIC: 'epic',
  STORY: 'story',
  TASK: 'task',
} as const;

export const GITHUB_CACHE_KEY = {
  REPOS: 'gito_repos_cache',
  OWNER: 'gito_owner_cache',
} as const;
