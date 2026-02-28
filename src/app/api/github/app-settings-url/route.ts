import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401 });
  }

  const clientId = process.env.AUTH_GITHUB_ID;
  if (!clientId) {
    return Response.json({ error: '앱 설정을 찾을 수 없습니다.' }, { status: 500 });
  }

  return Response.json({
    url: `https://github.com/settings/connections/applications/${clientId}`,
  });
}
