'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PLANNING_STORAGE_KEY,
  MAX_QUESTION_ROUNDS,
  QUESTION_RETRY_DELAY_MS,
} from '@/constants/planning';
import type { GeneratePlanningResult, QuestionItem, AnswerItem } from '@/types/planning';
import Button from '@/components/Button';

type FormState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'question';
      questions: QuestionItem[];
      answers: string[];
      customModes: boolean[];
      round: number;
    }
  | { status: 'error'; message: string };

interface IdeaFormProps {
  userName: string;
}

export default function IdeaForm({ userName }: IdeaFormProps) {
  const router = useRouter();
  const [idea, setIdea] = useState('');
  const [formState, setFormState] = useState<FormState>({ status: 'idle' });

  async function submitIdea(answers?: AnswerItem[], currentRound = 0) {
    if (idea.trim().length === 0) return;

    setFormState({ status: 'loading' });

    try {
      const res = await fetch('/api/generate/planning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, answers }),
      });

      if (!res.ok) {
        const err = await res.json();
        const message =
          res.status === 429
            ? 'API 요청 한도를 초과했습니다. 1분 후 다시 시도해주세요.'
            : (err.error ?? '오류가 발생했습니다.');
        setFormState({ status: 'error', message });
        return;
      }

      const data: GeneratePlanningResult = await res.json();

      if (data.type === 'question') {
        if (currentRound >= MAX_QUESTION_ROUNDS) {
          setFormState({
            status: 'error',
            message: '아이디어를 더 구체적으로 작성하거나 질문에 직접 답변을 입력해주세요.',
          });
          return;
        }
        setFormState({
          status: 'question',
          questions: data.questions,
          answers: data.questions.map(() => ''),
          customModes: data.questions.map(() => false),
          round: currentRound + 1,
        });
        return;
      }

      sessionStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(data));
      router.push('/planning');
    } catch {
      setFormState({ status: 'error', message: '네트워크 오류가 발생했습니다.' });
    }
  }

  function handleSubmit() {
    submitIdea();
  }

  async function handleAnswerSubmit() {
    if (formState.status !== 'question') return;

    const answers: AnswerItem[] = formState.questions.map((q, i) => ({
      question: q.question,
      answer: formState.answers[i],
    }));
    const currentRound = formState.round;

    setFormState({ status: 'loading' });
    await new Promise<void>((resolve) => setTimeout(resolve, QUESTION_RETRY_DELAY_MS));
    await submitIdea(answers, currentRound);
  }

  function selectOption(index: number, value: string) {
    if (formState.status !== 'question') return;
    const nextAnswers = [...formState.answers];
    const nextCustomModes = [...formState.customModes];
    nextAnswers[index] = value;
    nextCustomModes[index] = false;
    setFormState({ ...formState, answers: nextAnswers, customModes: nextCustomModes });
  }

  function selectCustomMode(index: number) {
    if (formState.status !== 'question') return;
    const nextAnswers = [...formState.answers];
    const nextCustomModes = [...formState.customModes];
    nextAnswers[index] = '';
    nextCustomModes[index] = true;
    setFormState({ ...formState, answers: nextAnswers, customModes: nextCustomModes });
  }

  function updateCustomAnswer(index: number, value: string) {
    if (formState.status !== 'question') return;
    const next = [...formState.answers];
    next[index] = value;
    setFormState({ ...formState, answers: next });
  }

  const isLoading = formState.status === 'loading';
  const isDisabled = isLoading || idea.trim().length === 0;

  return (
    <main className="px-6 py-10">
      <h1 className="text-2xl font-bold mb-2">안녕하세요, {userName}님</h1>
      <p className="text-gray-500 mb-8">
        아이디어를 입력하면 기획서와 GitHub 이슈를 자동으로 만들어드려요.
      </p>

      <textarea
        aria-label="아이디어 입력"
        placeholder="아이디어를 입력하세요. (예: 중고 거래 앱, 독서 기록 서비스...)"
        rows={6}
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        disabled={isLoading}
        className="w-full max-w-150 p-3 border border-gray-300 rounded-lg text-sm resize-y"
      />
      <br />
      <Button onClick={handleSubmit} disabled={isDisabled} className="mt-3">
        {isLoading ? '기획서 생성 중...' : '기획서 생성하기'}
      </Button>

      {formState.status === 'error' && (
        <p className="mt-4 text-red-500 text-sm">{formState.message}</p>
      )}

      {formState.status === 'question' && (
        <div className="mt-8 max-w-150">
          <p className="font-bold mb-4">
            조금 더 구체적인 정보가 필요해요. 아래 질문에 답해주세요.
          </p>
          {formState.questions.map((q, i) => (
            <div key={i} className="mb-5">
              <p className="text-sm font-medium mb-2">
                {i + 1}. {q.question}
              </p>
              {q.options && q.options.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {q.options.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name={`question-${i}`}
                        value={opt}
                        checked={formState.answers[i] === opt && !formState.customModes[i]}
                        onChange={() => selectOption(i, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name={`question-${i}`}
                      value="__custom__"
                      checked={formState.customModes[i]}
                      onChange={() => selectCustomMode(i)}
                    />
                    직접 입력
                  </label>
                  {formState.customModes[i] && (
                    <input
                      type="text"
                      value={formState.answers[i]}
                      onChange={(e) => updateCustomAnswer(i, e.target.value)}
                      placeholder="직접 입력..."
                      className="px-2.5 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={formState.answers[i]}
                  onChange={(e) => updateCustomAnswer(i, e.target.value)}
                  placeholder="답변을 입력하세요..."
                  className="w-full px-2.5 py-2 border border-gray-300 rounded-md text-sm"
                />
              )}
            </div>
          ))}
          <Button onClick={handleAnswerSubmit} disabled={isLoading}>
            기획서 생성하기
          </Button>
        </div>
      )}
    </main>
  );
}
