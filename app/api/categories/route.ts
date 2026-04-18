import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getCategories, createCategory } from '@/lib/db';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const categories = await getCategories(user.id);
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Category name required' }, { status: 400 });
    }

    const category = await createCategory(user.id, name.trim());
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}