import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  exchangeCodeForTokens,
  fetchGoogleUserinfo,
  getGoogleOAuthConfig,
} from '@/lib/google-oauth';
import {
  SESSION_COOKIE_NAME,
  createSession,
  getOrCreateUserByEmail,
} from '@/lib/auth';

function buildRedirect(url: URL, params: Record<string, string | undefined>) {
  const target = new URL('/', url.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      target.searchParams.set(key, value);
    }
  });
  return target;
}

function finalizeResponse(response: NextResponse) {
  response.cookies.delete(GOOGLE_STATE_COOKIE, { path: '/' });
  response.cookies.delete(GOOGLE_VERIFIER_COOKIE, { path: '/' });
  return response;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const errorParam = url.searchParams.get('error');
  const code = url.searchParams.get('code');
  const stateParam = url.searchParams.get('state');

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;
  const verifier = cookieStore.get(GOOGLE_VERIFIER_COOKIE)?.value;

  if (errorParam) {
    const redirectUrl = buildRedirect(url, {
      authError: errorParam,
    });
    return finalizeResponse(NextResponse.redirect(redirectUrl));
  }

  if (!code || !stateParam) {
    const redirectUrl = buildRedirect(url, {
      authError: 'missing_code',
    });
    return finalizeResponse(NextResponse.redirect(redirectUrl));
  }

  if (!expectedState || !verifier) {
    const redirectUrl = buildRedirect(url, {
      authError: 'missing_oauth_session',
    });
    return finalizeResponse(NextResponse.redirect(redirectUrl));
  }

  if (expectedState !== stateParam) {
    const redirectUrl = buildRedirect(url, {
      authError: 'state_mismatch',
    });
    return finalizeResponse(NextResponse.redirect(redirectUrl));
  }

  try {
    const config = getGoogleOAuthConfig();
    const tokens = await exchangeCodeForTokens(config, code, verifier);
    const profile = await fetchGoogleUserinfo(tokens.access_token);

    if (!profile.email) {
      throw new Error('Google profile missing email');
    }

    const user = await getOrCreateUserByEmail(profile.email);

    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor?.split(',')[0]?.trim();
    const userAgent = req.headers.get('user-agent') ?? undefined;

    const session = await createSession(user.id, ipAddress, userAgent);

    const redirectUrl = buildRedirect(url, {
      authSuccess: 'google',
    });
    const response = NextResponse.redirect(redirectUrl);

    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: session.session_token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      expires: new Date(session.expires_at),
    });

    return finalizeResponse(response);
  } catch (error) {
    console.error('Google OAuth callback failed', error);
    const redirectUrl = buildRedirect(url, {
      authError: 'google_auth_failed',
    });
    return finalizeResponse(NextResponse.redirect(redirectUrl));
  }
}
