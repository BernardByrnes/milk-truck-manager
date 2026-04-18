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
    const { liters } = await req.json();

    if (!liters || liters <= 0) {
      return NextResponse.json({ error: 'Invalid liters value' }, { status: 400 });
    }

    await updateIncome(parseInt(id), liters);
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
    await deleteIncome(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}