'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PLANNING_STORAGE_KEY,
  MAX_QUESTION_ROUNDS,
  QUESTION_RETRY_DELAY_MS,
} from '@/constants/planning';
import type { GeneratePlanningResult, QuestionItem, AnswerItem } from '@/types/planning';

type FormState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'question'; questions: QuestionItem[]; answers: string[]; round: number }
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

  function updateAnswer(index: number, value: string) {
    if (formState.status !== 'question') return;
    const next = [...formState.answers];
    next[index] = value;
    setFormState({ ...formState, answers: next });
  }

  const isLoading = formState.status === 'loading';

  return (
    <main style={{ padding: '40px 24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
        안녕하세요, {userName}님
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '32px' }}>
        아이디어를 입력하면 기획서와 GitHub 이슈를 자동으로 만들어드려요.
      </p>

      <textarea
        aria-label="아이디어 입력"
        placeholder="아이디어를 입력하세요. (예: 중고 거래 앱, 독서 기록 서비스...)"
        rows={6}
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        disabled={isLoading}
        style={{
          width: '100%',
          maxWidth: '600px',
          padding: '12px',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '14px',
          resize: 'vertical',
        }}
      />
      <br />
      <button
        onClick={handleSubmit}
        disabled={isLoading || idea.trim().length === 0}
        style={{
          marginTop: '12px',
          padding: '10px 24px',
          background: isLoading || idea.trim().length === 0 ? '#9ca3af' : '#111827',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          cursor: isLoading || idea.trim().length === 0 ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoading ? '기획서 생성 중...' : '기획서 생성하기'}
      </button>

      {formState.status === 'error' && (
        <p style={{ marginTop: '16px', color: '#ef4444', fontSize: '14px' }}>{formState.message}</p>
      )}

      {formState.status === 'question' && (
        <div style={{ marginTop: '32px', maxWidth: '600px' }}>
          <p style={{ fontWeight: 'bold', marginBottom: '16px' }}>
            조금 더 구체적인 정보가 필요해요. 아래 질문에 답해주세요.
          </p>
          {formState.questions.map((q, i) => (
            <div key={i} style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                {i + 1}. {q.question}
              </p>
              {q.options && q.options.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {q.options.map((opt) => (
                    <label
                      key={opt}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${i}`}
                        value={opt}
                        checked={formState.answers[i] === opt}
                        onChange={() => updateAnswer(i, opt)}
                      />
                      {opt}
                    </label>
                  ))}
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    <input
                      type="radio"
                      name={`question-${i}`}
                      value="__custom__"
                      checked={
                        formState.answers[i] !== '' && !q.options.includes(formState.answers[i])
                      }
                      onChange={() => updateAnswer(i, '')}
                    />
                    직접 입력
                  </label>
                  {formState.answers[i] !== '' && !q.options.includes(formState.answers[i]) && (
                    <input
                      type="text"
                      value={formState.answers[i]}
                      onChange={(e) => updateAnswer(i, e.target.value)}
                      placeholder="직접 입력..."
                      style={{
                        padding: '8px 10px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={formState.answers[i]}
                  onChange={(e) => updateAnswer(i, e.target.value)}
                  placeholder="답변을 입력하세요..."
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                />
              )}
            </div>
          ))}
          <button
            onClick={handleAnswerSubmit}
            disabled={isLoading}
            style={{
              padding: '10px 24px',
              background: '#111827',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            기획서 생성하기
          </button>
        </div>
      )}
    </main>
  );
}
