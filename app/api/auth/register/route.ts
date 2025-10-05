import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createUser } from '@/lib/auth';

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

  try {
    const user = await createUser(email, password);
    return NextResponse.json({ id: user.id, email: user.email });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Email already exists')) {
        return errorResponse('Email already registered', 409);
      }
      return errorResponse(error.message, 400);
    }

    return errorResponse('Unable to create user', 500);
  }
}
