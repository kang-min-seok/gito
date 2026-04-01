import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import LoginButton from '@/components/LoginButton';
import IdeaForm from '@/features/planning/IdeaForm';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    return <IdeaForm userName={session.user.name ?? ''} />;
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-[80vh] gap-6 text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-[#6762a7]/20 flex items-center justify-center text-3xl">
        💡
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-[32px] font-bold text-[#f1f5f9]">Gito</h1>
        <p className="text-[#94a3b8] max-w-[400px] leading-relaxed text-[15px]">
          아이디어를 입력하면 AI가 기획서를 만들고
          <br />
          GitHub 이슈와 프로젝트까지 자동으로 세팅해드려요.
        </p>
      </div>
      <LoginButton />
    </main>
  );
}
