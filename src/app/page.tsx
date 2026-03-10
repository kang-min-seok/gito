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
    <main className="flex flex-col items-center justify-center min-h-[80vh] gap-4 text-center px-6">
      <h1 className="text-[28px] font-bold">Gito</h1>
      <p className="text-gray-500 max-w-[400px] leading-relaxed">
        아이디어를 입력하면 AI가 기획서를 만들고
        <br />
        GitHub 이슈와 프로젝트까지 자동으로 세팅해드려요.
      </p>
      <LoginButton />
    </main>
  );
}
