export interface SummaryFlowItem {
  step: string;
  description: string;
}

export interface Proposal {
  overview: string;
  problem: string;
  whyNeeded: {
    existingWay: string;
    targetWay: string;
  };
  completionCriteria: string;
  mainFeatures: string[];
  targetUsers: string;
  userAcquisitionPlan: string;
}

export interface Scenarios {
  summaryFlow: SummaryFlowItem[];
  detailedFlow: string;
}

export interface TechChallengeItem {
  title: string;
  description: string;
}

export interface TechChallenge {
  challenges: TechChallengeItem[];
}

export interface PlanningResult {
  type: 'planning';
  proposal: Proposal;
  scenarios: Scenarios;
  techChallenge: TechChallenge;
}

export interface QuestionItem {
  question: string;
  options?: string[];
}

export interface QuestionResult {
  type: 'question';
  questions: QuestionItem[];
}

export type GeneratePlanningResult = PlanningResult | QuestionResult;

export interface AnswerItem {
  question: string;
  answer: string;
}

export interface GeneratePlanningRequest {
  idea: string;
  answers?: AnswerItem[];
}
