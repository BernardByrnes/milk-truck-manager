import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { updateExpense, deleteExpense } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { amount, category_id, note } = await req.json();

    if (!amount || amount <= 0 || !category_id) {
      return NextResponse.json({ error: 'Invalid values' }, { status: 400 });
    }

    const ok = await updateExpense(parseInt(id), user.id, category_id, amount, note);
    if (!ok) {
      return NextResponse.json({ error: 'Record not found or not owned by you' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const ok = await deleteExpense(parseInt(id), user.id);
    if (!ok) {
      return NextResponse.json({ error: 'Record not found or not owned by you' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
