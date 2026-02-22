import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import LoginButton from '@/components/LoginButton';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    return (
      <main style={{ padding: '40px 24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
          안녕하세요, {session.user.name}님
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '32px' }}>
          아이디어를 입력하면 기획서와 GitHub 이슈를 자동으로 만들어드려요.
        </p>
        <textarea
          aria-label="아이디어 입력"
          placeholder="아이디어를 입력하세요. (예: 중고 거래 앱, 독서 기록 서비스...)"
          rows={6}
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
          style={{
            marginTop: '12px',
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
      </main>
    );
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
