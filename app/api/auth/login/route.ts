import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { phone_number, password } = await req.json();

    if (!phone_number || !password) {
      return NextResponse.json({ error: 'Phone number and password required' }, { status: 400 });
    }

    const result = await login(phone_number, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const response = NextResponse.json({ success: true });
    response.cookies.set('auth_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}