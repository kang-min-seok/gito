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
import PlanningLoadingCard from '@/features/planning/PlanningLoadingCard';
import type { PlanningLoadingContext } from '@/features/planning/PlanningLoadingCard';

type FormState =
  | { status: 'idle' }
  | { status: 'loading'; context: PlanningLoadingContext }
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

    setFormState({ status: 'loading', context: answers ? 'question' : 'initial' });

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

    setFormState({ status: 'loading', context: 'question' });
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

  /* ────────────────────────────────────────
     Step 2_1: AI 기획서 생성 중 로딩 화면
  ──────────────────────────────────────── */
  if (formState.status === 'loading') {
    return <PlanningLoadingCard context={formState.context} />;
  }

  /* ────────────────────────────────────────
     Step 2_2: AI 추가 질문 화면
  ──────────────────────────────────────── */
  if (formState.status === 'question') {
    return (
      <main className="flex flex-col items-center px-6 py-10 min-h-[calc(100vh-120px)]">
        {/* 유저 아바타 */}
        <div className="w-12 h-12 rounded-full bg-[#6762a7]/20 flex items-center justify-center text-xl mb-6">
          👤
        </div>

        <h2 className="text-[22px] font-bold text-[#f1f5f9] text-center mb-2">
          AI가 더 정확한 기획서를 위해 몇 가지 질문을 준비했습니다.
        </h2>
        <p className="text-[14px] text-[#94a3b8] mb-8">각 항목에 답변해 주세요.</p>

        {/* 질문 카드 */}
        <div className="w-full max-w-[560px] bg-[#161b22] border border-[#30363d] rounded-2xl p-6 flex flex-col gap-6">
          {formState.questions.map((q, i) => (
            <div key={i}>
              <p className="text-[13px] font-semibold text-[#f1f5f9] mb-3">
                Q{i + 1}. {q.question}
              </p>
              {q.options && q.options.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => {
                    const isSelected = formState.answers[i] === opt && !formState.customModes[i];
                    return (
                      <button
                        key={opt}
                        onClick={() => selectOption(i, opt)}
                        className={`px-3.5 py-2 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#6762a7]/20 border-[#6762a7] text-[#f1f5f9]'
                            : 'bg-transparent border-[#30363d] text-[#94a3b8] hover:border-[#6762a7]/50 hover:text-[#f1f5f9]'
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => selectCustomMode(i)}
                    className={`px-3.5 py-2 rounded-lg text-[13px] font-medium border transition-colors cursor-pointer ${
                      formState.customModes[i]
                        ? 'bg-[#6762a7]/20 border-[#6762a7] text-[#f1f5f9]'
                        : 'bg-transparent border-[#30363d] text-[#94a3b8] hover:border-[#6762a7]/50 hover:text-[#f1f5f9]'
                    }`}
                  >
                    ✏️ 직접 입력하기
                  </button>
                  {formState.customModes[i] && (
                    <input
                      type="text"
                      value={formState.answers[i]}
                      onChange={(e) => updateCustomAnswer(i, e.target.value)}
                      placeholder="직접 입력..."
                      className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-[#f1f5f9] placeholder-[#64748b] outline-none focus:border-[#6762a7] mt-1"
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={formState.answers[i]}
                  onChange={(e) => updateCustomAnswer(i, e.target.value)}
                  placeholder="답변을 입력하세요..."
                  className="w-full px-3 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-[#f1f5f9] placeholder-[#64748b] outline-none focus:border-[#6762a7]"
                />
              )}
            </div>
          ))}

          {/* 제출 버튼 */}
          <Button onClick={handleAnswerSubmit} className="w-full !py-3 gap-2">
            답변 제출 및 기획서 생성 ⚡
          </Button>
        </div>
      </main>
    );
  }

  /* ────────────────────────────────────────
     Step 1: 아이디어 입력 화면 (idle / error)
  ──────────────────────────────────────── */
  const isDisabled = idea.trim().length === 0;

  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-6 py-10">
      {/* 타이틀 영역 */}
      <div className="text-center mb-10 flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-[#6762a7]/20 flex items-center justify-center text-2xl">
          💡
        </div>
        <h1 className="text-[28px] font-bold text-[#f1f5f9]">당신의 아이디어를 들려주세요</h1>
        <p className="text-[#94a3b8] text-[15px] leading-relaxed">
          새로운 프로젝트의 핵심 가치와 기능을 자유롭게 적어주세요.
          <br />
          AI가 당신의 아이디어를 구체적인 기획서로 변환해 드립니다.
        </p>
      </div>

      {/* 입력 카드 */}
      <div className="w-full max-w-[600px] bg-[#161b22] border border-[#30363d] rounded-2xl p-6 flex flex-col gap-4">
        <label className="text-[13px] font-semibold text-[#94a3b8]">프로젝트 상세 설명</label>
        <div className="relative">
          <textarea
            aria-label="아이디어 입력"
            placeholder={`예: 실시간으로 주식 포트폴리오를 공유하고 토론할 수 있는 모바일 전용 커뮤니티 앱을 만들고 싶습니다. 주요 기능으로는 차트 공유, 익명 게시판, 알림 서비스 등이 필요합니다.`}
            rows={7}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg p-3.5 text-sm text-[#f1f5f9] placeholder-[#64748b] resize-y outline-none focus:border-[#6762a7] leading-relaxed"
          />
          <p className="text-[11px] text-[#64748b] mt-2 flex items-center gap-1">
            <span>ℹ️</span> 입력한 내용은 안전하게 암호화되어 전송됩니다.
          </p>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSubmit} disabled={isDisabled} className="flex-1 !py-3 gap-2">
            확인 →
          </Button>
        </div>

        {formState.status === 'error' && (
          <p className="text-red-400 text-sm">{formState.message}</p>
        )}
      </div>

      {/* 힌트 카드 3개 */}
      <div className="w-full max-w-[600px] grid grid-cols-3 gap-3 mt-4">
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-2">
          <span className="text-xl">🎯</span>
          <p className="text-[13px] font-semibold text-[#f1f5f9]">구체적인 목표</p>
          <p className="text-[12px] text-[#64748b] leading-relaxed">
            해결하고자 하는 문제와 타겟 사용자를 명시해보세요.
          </p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-2">
          <span className="text-xl">⭐</span>
          <p className="text-[13px] font-semibold text-[#f1f5f9]">핵심 기능</p>
          <p className="text-[12px] text-[#64748b] leading-relaxed">
            반드시 포함되어야 하는 MVP 기능 위주로 작성하세요.
          </p>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 flex flex-col gap-2">
          <span className="text-xl">🎨</span>
          <p className="text-[13px] font-semibold text-[#f1f5f9]">디자인 모드</p>
          <p className="text-[12px] text-[#64748b] leading-relaxed">
            원하는 스타일이나 참고할 만한 서비스가 있다면 알려주세요.
          </p>
        </div>
      </div>
    </main>
  );
}
