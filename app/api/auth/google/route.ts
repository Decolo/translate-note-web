import { NextResponse } from 'next/server';
import {
  GOOGLE_OAUTH_COOKIE_MAX_AGE,
  GOOGLE_STATE_COOKIE,
  GOOGLE_VERIFIER_COOKIE,
  buildGoogleAuthorizationUrl,
  deriveCodeChallenge,
  generateCodeVerifier,
  generateOAuthState,
  getGoogleOAuthConfig,
} from '@/lib/google-oauth';

function errorResponse(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const config = getGoogleOAuthConfig();
    const state = generateOAuthState();
    const verifier = generateCodeVerifier();
    const codeChallenge = deriveCodeChallenge(verifier);
    const redirectUrl = buildGoogleAuthorizationUrl(
      config,
      state,
      codeChallenge
    );

    const response = NextResponse.redirect(redirectUrl);
    const isProduction = process.env.NODE_ENV === 'production';

    response.cookies.set({
      name: GOOGLE_STATE_COOKIE,
      value: state,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE,
    });

    response.cookies.set({
      name: GOOGLE_VERIFIER_COOKIE,
      value: verifier,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: GOOGLE_OAUTH_COOKIE_MAX_AGE,
    });

    return response;
  } catch (error) {
    console.error('Failed to initiate Google OAuth', error);
    return errorResponse('Unable to start Google sign-in', 500);
  }
}
