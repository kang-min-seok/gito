import { generateText, Output } from 'ai';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { gemini } from '@/lib/ai';
import { GeneratePlanningRequestSchema, GeneratePlanningSchema } from '@/features/planning/schemas';
import { buildSystemPrompt, buildUserPrompt } from '@/features/planning/prompt';
import type { GoogleLanguageModelOptions } from '@ai-sdk/google';

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const parseResult = GeneratePlanningRequestSchema.safeParse(await req.json());
  if (!parseResult.success) {
    return Response.json({ error: '아이디어를 입력해주세요.' }, { status: 400 });
  }
  const { idea, answers } = parseResult.data;

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
        schema: GeneratePlanningSchema,
      }),
      system: buildSystemPrompt(),
      prompt: buildUserPrompt(idea, answers),
    });

    if (!output) {
      return Response.json({ error: '기획서 생성에 실패했습니다.' }, { status: 500 });
    }

    return Response.json(output);
  } catch (error: unknown) {
    console.error('[POST /api/generate/planning]', error);

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

    return Response.json({ error: '기획서 생성 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
