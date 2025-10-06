import { cookies } from 'next/headers';
import { getSessionWithUser, SESSION_COOKIE_NAME, SessionWithUser } from './auth';

function parseCookieHeader(header: string | null): string | null {
  if (!header) return null;

  const parts = header.split(';');
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split('=');
    if (!rawKey) continue;
    if (rawKey !== SESSION_COOKIE_NAME) continue;
    const rawValue = rest.join('=');
    return rawValue ? decodeURIComponent(rawValue) : '';
  }

  return null;
}

export async function getSessionFromCookies(): Promise<SessionWithUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getSessionWithUser(token);
}

export async function getSessionFromRequest(
  req: Request
): Promise<SessionWithUser | null> {
  const token = parseCookieHeader(req.headers.get('cookie'));
  if (!token) return null;
  return getSessionWithUser(token);
}

export function getSessionTokenFromRequest(req: Request): string | null {
  return parseCookieHeader(req.headers.get('cookie'));
}
