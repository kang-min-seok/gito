'use client';

import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      className="text-sm py-1 px-3 border border-gray-300 rounded-md cursor-pointer bg-white"
    >
      로그아웃
    </button>
  );
}
