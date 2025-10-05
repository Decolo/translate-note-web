import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  SESSION_COOKIE_NAME,
  createSession,
  verifyUserCredentials,
} from '@/lib/auth';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
});

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return errorResponse('Invalid email or password format');
  }

  const { email, password } = parsed.data;

  const user = await verifyUserCredentials(email, password);
  if (!user) {
    return errorResponse('Invalid credentials', 401);
  }

  const forwardedFor = req.headers.get('x-forwarded-for');
  const ipAddress = forwardedFor?.split(',')[0]?.trim();
  const userAgent = req.headers.get('user-agent') ?? undefined;

  const session = await createSession(user.id, ipAddress, userAgent);

  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at,
    },
  });

  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: session.session_token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(session.expires_at),
  });

  return response;
}
