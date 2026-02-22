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
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        gap: '16px',
        textAlign: 'center',
        padding: '24px',
      }}
    >
      <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Gito</h1>
      <p style={{ color: '#6b7280', maxWidth: '400px', lineHeight: '1.6' }}>
        아이디어를 입력하면 AI가 기획서를 만들고
        <br />
        GitHub 이슈와 프로젝트까지 자동으로 세팅해드려요.
      </p>
      <LoginButton />
    </main>
  );
}
