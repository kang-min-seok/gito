import { z } from 'zod';

const SummaryFlowItemSchema = z.object({
  step: z.string(),
  description: z.string(),
});

const MainFeatureItemSchema = z.object({
  name: z.string(),
  description: z.string(),
});

const TargetUsersSchema = z.object({
  summary: z.string(),
  traits: z.array(z.string()),
});

const DetailedFlowItemSchema = z.object({
  step: z.string(),
  action: z.string(),
  detail: z.string(),
});

const ProposalSchema = z.object({
  overview: z.string(),
  problem: z.string(),
  whyNeeded: z.object({
    existingWay: z.string(),
    targetWay: z.string(),
  }),
  completionCriteria: z.string(),
  mainFeatures: z.array(MainFeatureItemSchema),
  targetUsers: TargetUsersSchema,
  userAcquisitionPlan: z.array(z.string()),
});

const ScenariosSchema = z.object({
  summaryFlow: z.array(SummaryFlowItemSchema),
  detailedFlow: z.array(DetailedFlowItemSchema),
});

const TechChallengeItemSchema = z.object({
  title: z.string(),
  description: z.string(),
});

const TechChallengeSchema = z.object({
  challenges: z.array(TechChallengeItemSchema),
});

const QuestionItemSchema = z.object({
  question: z.string(),
  options: z.array(z.string()).optional(),
});

export const GeneratePlanningSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('planning'),
    proposal: ProposalSchema,
    scenarios: ScenariosSchema,
    techChallenge: TechChallengeSchema,
  }),
  z.object({
    type: z.literal('question'),
    questions: z.array(QuestionItemSchema),
  }),
]);
