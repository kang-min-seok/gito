import Image from 'next/image';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import LogoutButton from './LogoutButton';
import Stepper from '@/components/Stepper';

export default async function Header() {
  const session = await getServerSession(authOptions);

  return (
    <header className="sticky top-0 z-50 bg-[#0d1117]">
      {/* 상단 바: 로고 + 유저 */}
      <div className="flex justify-between items-center px-6 py-3 border-b border-[#30363d]">
        <span className="font-bold text-base text-[#f1f5f9]">Gito</span>

        {session?.user && (
          <div className="flex items-center gap-3">
            {session.user.image && (
              <Image
                src={session.user.image}
                alt={session.user.name ?? 'user avatar'}
                width={32}
                height={32}
                className="rounded-full ring-2 ring-[#30363d]"
              />
            )}
            <LogoutButton />
          </div>
        )}
      </div>

      {/* Stepper */}
      <Stepper />
    </header>
  );
}
