import { ISSUES_STORAGE_KEY } from '@/constants/planning';
import type { GenerateIssuesResult } from '@/types/github';

export const saveIssuesToStorage = (data: GenerateIssuesResult): void => {
  sessionStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(data));
};
