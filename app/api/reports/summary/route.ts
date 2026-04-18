import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDailySummaries, getCategorySummaries } from '@/lib/db';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const daily = await getDailySummaries(user.id, 365);
  const categories = await getCategorySummaries(user.id);

  return NextResponse.json({ daily, categories });
}