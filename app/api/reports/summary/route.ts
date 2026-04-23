import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getMergedDailySummaries, getCategorySummaries, getPeriodTotals, getDashboardStats } from '@/lib/db';
import { resolveReportRange, getPeriodLabel } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'daily';
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;

  const stats = await getDashboardStats(user.id);
  const { rangeFrom, rangeTo } = resolveReportRange(type, from, to, stats);

  const [totals, daily, categories] = await Promise.all([
    getPeriodTotals(user.id, rangeFrom, rangeTo),
    getMergedDailySummaries(user.id, { from: rangeFrom, to: rangeTo, limit: 200 }),
    getCategorySummaries(user.id, rangeFrom, rangeTo),
  ]);

  const periodLabel = getPeriodLabel(type, rangeFrom, rangeTo, stats);

  return NextResponse.json({ daily, categories, totals, periodLabel, rangeFrom, rangeTo });
}
