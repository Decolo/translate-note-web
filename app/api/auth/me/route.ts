import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/session-token';

export async function GET() {
  const session = await getSessionFromCookies();

  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const { user } = session;
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
  });
}
