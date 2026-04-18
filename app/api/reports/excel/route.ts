import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDailySummaries, getCategorySummaries, getDashboardStats } from '@/lib/db';

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
  const dailySummaries = (await getDailySummaries(user.id, 365)).filter(d => {
    if (from && d.date < from) return false;
    if (to && d.date > to) return false;
    return true;
  });

  const categorySummaries = await getCategorySummaries(user.id);

  const totalIncome = dailySummaries.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = dailySummaries.reduce((sum, d) => sum + d.expenses, 0);
  const netProfit = totalIncome - totalExpenses;

  let csv = 'Milk Truck Manager Report\n';
  csv += `Generated,${new Date().toLocaleDateString()}\n`;
  csv += `Report Type,${type === 'bimonthly' ? 'Bimonthly Report' : type === 'daily' ? 'Daily Summary' : 'Expense Breakdown'}\n`;
  csv += `Period,${from || 'Start'} to ${to || 'Today'}\n`;
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
  csv += `Net Profit,${netProfit}\n\n`;

  csv += 'Daily Summary\n';
  csv += 'Date,Income,Expenses,Profit\n';
  dailySummaries.forEach(d => {
    csv += `${d.date},${d.income},${d.expenses},${d.profit}\n`;
  });

  csv += '\nExpense Categories\n';
  csv += 'Category,Amount,Percentage\n';
  categorySummaries.forEach(c => {
    const pct = totalExpenses > 0 ? ((c.total / totalExpenses) * 100).toFixed(1) : 0;
    csv += `${c.name},${c.total},${pct}%\n`;
  });

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="milk_truck_report_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}