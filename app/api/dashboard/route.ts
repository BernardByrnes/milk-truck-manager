import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDashboardStats, getInsights, getMonthlySummaries, getPreviousPeriodTotals } from '@/lib/db';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const stats = await getDashboardStats(user.id);
  const insights = await getInsights(user.id);
  const monthlySummaries = await getMonthlySummaries(user.id, 12);
  const prevPeriod = await getPreviousPeriodTotals(user.id, stats.periodFrom, stats.periodTo);

  const pctChange = (current: number, previous: number): number | null => {
    if (previous === 0) return current > 0 ? 100 : null;
    return Math.round(((current - previous) / previous) * 100);
  };

  return NextResponse.json({
    stats,
    insights,
    monthlySummaries,
    prevPeriodComparison: {
      income: pctChange(stats.periodIncome, prevPeriod.totalIncome),
      expenses: pctChange(stats.periodExpenses, prevPeriod.totalExpenses),
      liters: pctChange(stats.periodProfit, prevPeriod.totalLiters),
    },
  });
}
