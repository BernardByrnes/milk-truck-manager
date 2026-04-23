import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { addIncome, getIncomeByUser } from '@/lib/db';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const records = await getIncomeByUser(user.id);
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { liters, date, rate } = await req.json();

    if (!liters || liters <= 0) {
      return NextResponse.json({ error: 'Invalid liters value' }, { status: 400 });
    }

    const record = await addIncome(user.id, date || new Date().toISOString().split('T')[0], liters, rate);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}