import { ISSUES_STORAGE_KEY } from '@/constants/planning';
import type { IssuesResult } from '@/types/github';

export const saveIssuesToStorage = (data: IssuesResult): void => {
  sessionStorage.setItem(ISSUES_STORAGE_KEY, JSON.stringify(data));
};
