import { generateText, Output } from 'ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { gemini } from '@/lib/ai';
import {
  GenerateIssuesRequestSchema,
  GenerateIssuesSchema,
  SplitGenerateIssuesSchema,
} from '@/features/issues/schemas';
import { buildIssuesSystemPrompt, buildIssuesUserPrompt } from '@/features/issues/prompt';
import type { GoogleLanguageModelOptions } from '@ai-sdk/google';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const parseResult = GenerateIssuesRequestSchema.safeParse(await req.json());
  if (!parseResult.success) {
    return Response.json({ error: '기획서 데이터가 올바르지 않습니다.' }, { status: 400 });
  }

  const { planning, repoStructure } = parseResult.data;

  if (planning.type !== 'planning') {
    return Response.json({ error: '기획서 데이터가 올바르지 않습니다.' }, { status: 400 });
  }

  const isSplit = repoStructure === 'split';

  try {
    const { output } = await generateText({
      model: gemini,
      maxRetries: 0,
      providerOptions: {
        google: {
          structuredOutputs: false,
        } satisfies GoogleLanguageModelOptions,
      },
      output: Output.object({
        schema: isSplit ? SplitGenerateIssuesSchema : GenerateIssuesSchema,
      }),
      system: buildIssuesSystemPrompt(repoStructure),
      prompt: buildIssuesUserPrompt(planning),
    });

    if (!output) {
      return Response.json({ error: '이슈 생성에 실패했습니다.' }, { status: 500 });
    }

    // IssuesResult 형태로 래핑하여 반환
    if (isSplit) {
      const splitOutput = output as {
        frontend: { issues: unknown[] };
        backend: { issues: unknown[] };
      };
      return Response.json({ type: 'split', ...splitOutput });
    }

    return Response.json({ type: 'monorepo', ...(output as { issues: unknown[] }) });
  } catch (error: unknown) {
    console.error('[POST /api/generate/issues]', error);

    const statusCode =
      error && typeof error === 'object' && 'statusCode' in error
        ? (error as { statusCode: number }).statusCode
        : null;

    if (statusCode === 429) {
      return Response.json(
        { error: 'API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 429 }
      );
    }

    return Response.json({ error: '이슈 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
