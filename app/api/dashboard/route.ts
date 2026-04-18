import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDashboardStats, getInsights, getMonthlySummaries } from '@/lib/db';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = await getDashboardStats(user.id);
  const insights = await getInsights(user.id);
  const monthlySummaries = await getMonthlySummaries(user.id, 12);

  return NextResponse.json({ stats, insights, monthlySummaries });
}
