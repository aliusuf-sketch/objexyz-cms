import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { signToken } from '@/lib/auth';

function passwordMatches(input: string, expected: string): boolean {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  // Lengths must match for timingSafeEqual; compare against a same-length
  // buffer first so we never leak the real length via an early throw/return.
  if (a.length !== b.length) {
    timingSafeEqual(a, a); // constant-time no-op to keep timing consistent
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  if (typeof password !== 'string' || !passwordMatches(password, process.env.CMS_PASSWORD || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = await signToken({ authenticated: true });
  const response = NextResponse.json({ success: true });
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
}
