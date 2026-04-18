import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { phone_number, password } = await req.json();

    if (!phone_number || !password) {
      return NextResponse.json({ error: 'Phone number and password required' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    const result = await register(phone_number, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Register error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}