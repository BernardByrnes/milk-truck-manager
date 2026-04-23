import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/auth';

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

    if (password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    const result = await register(phone, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}