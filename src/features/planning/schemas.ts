import { z } from 'zod';

// Gemini가 문자열 필드를 배열로 반환하는 경우가 있어 배열이면 줄바꿈으로 합쳐서 문자열로 변환한다.
const coerceArrayToString = z.preprocess((val) => {
  if (Array.isArray(val)) return val.join('\n');
  return val;
}, z.string());

const SummaryFlowItemSchema = z.object({
  step: z.string(),
  description: coerceArrayToString,
});

const ProposalSchema = z.object({
  overview: coerceArrayToString,
  problem: coerceArrayToString,
  whyNeeded: z.object({
    existingWay: coerceArrayToString,
    targetWay: coerceArrayToString,
  }),
  completionCriteria: coerceArrayToString,
  mainFeatures: z.array(z.string()),
  targetUsers: coerceArrayToString,
  userAcquisitionPlan: coerceArrayToString,
});

const ScenariosSchema = z.object({
  summaryFlow: z.array(SummaryFlowItemSchema),
  detailedFlow: coerceArrayToString,
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
