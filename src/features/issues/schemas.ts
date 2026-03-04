import { z } from 'zod';
import { GeneratePlanningSchema } from '@/features/planning/schemas';
import type { GeneratedIssue } from '@/types/github';

const IssuePayloadSchema = z.object({
  title: z.string(),
  body: z.string(),
  labels: z.array(z.string()),
  type: z.enum(['story', 'task']),
});

const GeneratedIssueSchema: z.ZodType<GeneratedIssue> = z.lazy(() =>
  IssuePayloadSchema.extend({
    children: z.array(GeneratedIssueSchema).optional(),
  })
);

const EpicGroupSchema = z.object({
  epic: z.string(),
  stories: z.array(GeneratedIssueSchema),
});

export const GenerateIssuesSchema = z.object({
  issues: z.array(EpicGroupSchema),
});

export const GenerateIssuesRequestSchema = z.object({
  planning: GeneratePlanningSchema,
});

const ProjectInfoSchema = z.object({
  projectId: z.string(),
  issueTypeFieldId: z.string(),
  storyOptionId: z.string(),
  taskOptionId: z.string(),
  epicFieldId: z.string(),
  epicOptions: z.array(z.object({ name: z.string(), id: z.string() })),
});

export const CreateIssuesRequestSchema = z.object({
  owner: z.string(),
  repo: z.string(),
  issues: GenerateIssuesSchema,
  project: ProjectInfoSchema.optional(),
});

export const SetupProjectRequestSchema = z.object({
  owner: z.string(),
  projectTitle: z.string(),
  epicNames: z.array(z.string()),
});
