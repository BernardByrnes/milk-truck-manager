import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { phone_number, password } = (body || {}) as {
      phone_number?: string;
      password?: string;
    };

    const phone = typeof phone_number === 'string' ? phone_number.trim() : '';
    if (!phone || !password) {
      return NextResponse.json({ error: 'Phone number and password required' }, { status: 400 });
    }

    const result = await login(phone, password);

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
    console.error('POST /api/auth/login', error);
    const dev = process.env.NODE_ENV === 'development';
    const message = error instanceof Error ? error.message : 'Server error';
    return NextResponse.json(
      { error: dev ? message : 'Server error' },
      { status: 500 }
    );
  }
}