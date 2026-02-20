import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: {
        params: {
          // GitHub 이슈·프로젝트 생성에 필요한 권한
          scope: 'read:user user:email repo project',
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // GitHub access token을 JWT에 저장 (Octokit 사용에 필요)
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // 세션에 access token 노출 (클라이언트에서 사용 가능)
      session.accessToken = token.accessToken ?? '';
      return session;
    },
  },
});
