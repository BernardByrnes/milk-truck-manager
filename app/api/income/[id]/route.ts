import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { updateIncome, deleteIncome } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { liters, date, rate } = await req.json();

    if (!liters || liters <= 0) {
      return NextResponse.json({ error: 'Invalid liters value' }, { status: 400 });
    }

    const ok = await updateIncome(parseInt(id), user.id, liters, date, rate);
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
    const ok = await deleteIncome(parseInt(id), user.id);
    if (!ok) {
      return NextResponse.json({ error: 'Record not found or not owned by you' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
