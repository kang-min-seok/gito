import { createAnthropic } from '@ai-sdk/anthropic';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY 환경 변수가 설정되지 않았습니다.');
}

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export const claude = anthropic('claude-sonnet-4-5');
