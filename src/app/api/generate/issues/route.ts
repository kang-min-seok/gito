import { generateText, Output } from 'ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { gemini } from '@/lib/ai';
import { GenerateIssuesRequestSchema, GenerateIssuesSchema } from '@/features/issues/schemas';
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

  const { planning } = parseResult.data;

  if (planning.type !== 'planning') {
    return Response.json({ error: '기획서 데이터가 올바르지 않습니다.' }, { status: 400 });
  }

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
        schema: GenerateIssuesSchema,
      }),
      system: buildIssuesSystemPrompt(),
      prompt: buildIssuesUserPrompt(planning),
    });

    if (!output) {
      return Response.json({ error: '이슈 생성에 실패했습니다.' }, { status: 500 });
    }

    return Response.json(output);
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
