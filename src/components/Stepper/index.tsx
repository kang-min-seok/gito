'use client';

import { usePathname } from 'next/navigation';

const STEPS = [
  { label: '아이디어 입력', path: '/' },
  { label: '기획서 생성', path: '/planning' },
  { label: '스토리 목록', path: '/issues' },
  { label: '레포 선택', path: '/repo-select' },
  { label: '생성 완료', path: '/result' },
];

function getActiveStep(pathname: string): number {
  if (pathname === '/result') return 4;
  if (pathname === '/repo-select') return 3;
  if (pathname === '/issues') return 2;
  if (pathname === '/planning') return 1;
  return 0;
}

export default function Stepper() {
  const pathname = usePathname();
  const activeStep = getActiveStep(pathname);

  return (
    <nav className="flex border-b border-[#30363d]">
      {STEPS.map((step, index) => {
        const isActive = index === activeStep;
        const isCompleted = index < activeStep;
        const isFuture = index > activeStep;

        return (
          <div key={step.path} className="flex-1 flex flex-col items-center py-3 relative">
            <span className="text-[11px] font-medium text-[#64748b] mb-0.5">Step {index + 1}</span>
            <span
              className={`text-[13px] font-semibold ${
                isFuture ? 'text-[#64748b]' : 'text-[#f1f5f9]'
              }`}
            >
              {step.label}
            </span>
            {isActive && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#6762a7]" />}
            {isCompleted && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#30363d]" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
