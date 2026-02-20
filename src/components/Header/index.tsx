import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import LogoutButton from './LogoutButton';

export default async function Header() {
  const session = await getServerSession(authOptions);

  return (
    <header
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 24px',
        borderBottom: '1px solid #e5e7eb',
      }}
    >
      <span style={{ fontWeight: 'bold', fontSize: '16px' }}>Gito</span>

      {session?.user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? 'user avatar'}
              width={32}
              height={32}
              style={{ borderRadius: '50%' }}
            />
          )}
          <span style={{ fontSize: '14px' }}>{session.user.name}</span>
          <LogoutButton />
        </div>
      )}
    </header>
  );
}
