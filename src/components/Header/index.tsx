import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import LogoutButton from './LogoutButton';

export default async function Header() {
  const session = await getServerSession(authOptions);

  return (
    <header className="flex justify-between items-center px-6 py-3 border-b border-gray-200">
      <span className="font-bold text-base">Gito</span>

      {session?.user && (
        <div className="flex items-center gap-3">
          {session.user.image && (
            <Image
              src={session.user.image}
              alt={session.user.name ?? 'user avatar'}
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <span className="text-sm">{session.user.name}</span>
          <LogoutButton />
        </div>
      )}
    </header>
  );
}
