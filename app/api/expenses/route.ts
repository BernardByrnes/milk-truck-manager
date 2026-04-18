import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getExpensesByUser, addExpense } from '@/lib/db';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const records = await getExpensesByUser(user.id);
  return NextResponse.json(records);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { amount, category_id, date, note } = await req.json();

    if (!amount || amount <= 0 || !category_id) {
      return NextResponse.json({ error: 'Invalid values' }, { status: 400 });
    }

    const record = await addExpense(user.id, category_id, amount, date || new Date().toISOString().split('T')[0], note);
    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}