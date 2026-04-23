import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  getCategorySummaries,
  getDashboardStats,
  getMergedDailySummaries,
  getPeriodTotals,
} from '@/lib/db';
import { resolveReportRange, getPeriodLabel } from '@/lib/utils';

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'daily';
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const stats = await getDashboardStats(user.id);
  const { rangeFrom, rangeTo } = resolveReportRange(type, from || undefined, to || undefined, stats);

  const periodTotals = await getPeriodTotals(user.id, rangeFrom, rangeTo);
  const mergedDaily = await getMergedDailySummaries(user.id, {
    from: rangeFrom,
    to: rangeTo,
    limit: type === 'bimonthly' && !from && !to ? 400 : 200,
  });
  const categorySummaries = await getCategorySummaries(user.id, rangeFrom, rangeTo);

  const totalIncome = periodTotals.totalIncome;
  const totalExpenses = periodTotals.totalExpenses;
  const netProfit = totalIncome - totalExpenses;

  const periodLabel = getPeriodLabel(type, rangeFrom, rangeTo, stats);

  const reportTitle =
    type === 'bimonthly' ? 'Bimonthly Report' :
    type === 'expense' ? 'Expense Breakdown' :
    'Period summary (date range optional)';

  let csv = 'Milk Truck Manager Report\n';
  csv += `Generated,${new Date().toLocaleDateString('en-GB')}\n`;
  csv += `Report Type,${reportTitle}\n`;
  csv += `Period,${periodLabel}\n`;
  if (type === 'bimonthly') {
    csv += `Bimonthly Period,${stats.periodLabel}\n`;
  }
  csv += '\n';

  if (type === 'bimonthly') {
    csv += 'Bimonthly Summary\n';
    csv += `Period Income,${stats.periodIncome}\n`;
    csv += `Period Expenses,${stats.periodExpenses}\n`;
    csv += `Period Profit,${stats.periodProfit}\n\n`;
  }

  csv += 'Summary\n';
  csv += `Total Income,${totalIncome}\n`;
  csv += `Total Expenses,${totalExpenses}\n`;
  csv += `Net Profit,${netProfit}\n`;
  csv += `Liters Delivered,${periodTotals.totalLiters}\n\n`;

  csv += 'Activity by date\n';
  csv += 'Date,Income,Expenses,Profit\n';
  mergedDaily.forEach(d => {
    csv += `${d.date},${d.income},${d.expenses},${d.profit}\n`;
  });

  const denom = totalExpenses > 0 ? totalExpenses : categorySummaries.reduce((s, c) => s + c.total, 0);
  csv += '\nExpense Categories\n';
  csv += 'Category,Amount,Percentage\n';
  categorySummaries.forEach(c => {
    const pct = denom > 0 ? ((c.total / denom) * 100).toFixed(1) : '0';
    csv += `${c.name},${c.total},${pct}%\n`;
  });

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="milk_truck_report_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}
