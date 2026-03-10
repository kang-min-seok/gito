'use client';

import { signOut } from 'next-auth/react';
import Button from '@/components/Button';

export default function LogoutButton() {
  return (
    <Button variant="secondary" size="sm" onClick={() => signOut({ callbackUrl: '/' })}>
      로그아웃
    </Button>
  );
}
