export default function GeneratingCard() {
  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-120px)] px-6 py-10">
      <div className="w-full max-w-[440px] bg-[#161b22] border border-[#30363d] rounded-2xl p-8 flex flex-col items-center gap-6">
        <div className="w-14 h-14 rounded-full border-4 border-[#6762a7]/30 border-t-[#6762a7] animate-spin" />
        <div className="text-center flex flex-col gap-2">
          <p className="text-lg font-semibold text-[#f1f5f9]">
            AI가 스토리 목록을 만들어내고 있습니다..
          </p>
          <p className="text-[13px] text-[#94a3b8]">
            기획서를 바탕으로 에픽, 스토리, 태스크를 생성하고 있습니다.
          </p>
        </div>
        <div className="w-full bg-[#6762a7]/20 rounded-lg px-4 py-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#6762a7] animate-pulse shrink-0" />
          <span className="text-[13px] text-[#f1f5f9]">에픽 목록 작성 중...</span>
        </div>
        <p className="text-[12px] text-[#64748b]">
          잠시만 기다려 주세요. 보통 1-2분 정도 소요됩니다.
        </p>
        <div className="w-full flex flex-col gap-2 border-t border-[#30363d] pt-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#3fb950] shrink-0" />
            <span className="text-[12px] text-[#94a3b8]">기획서 파싱 완료</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#6762a7] animate-pulse shrink-0" />
            <span className="text-[12px] text-[#94a3b8]">에픽 목록 작성 중...</span>
          </div>
        </div>
      </div>
    </main>
  );
}
