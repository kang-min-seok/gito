export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/planning', '/issues', '/result'],
};
