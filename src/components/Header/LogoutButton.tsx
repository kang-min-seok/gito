'use client';

import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/' })}
      style={{
        fontSize: '14px',
        padding: '4px 12px',
        border: '1px solid #d1d5db',
        borderRadius: '6px',
        cursor: 'pointer',
        background: 'white',
      }}
    >
      로그아웃
    </button>
  );
}
