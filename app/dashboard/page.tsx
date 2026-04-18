'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar, MobileNav } from '@/components/TopBar';
import { Card, StatCard } from '@/components/Card';
import { InsightsPanel } from '@/components/InsightsPanel';
import { formatCurrency } from '@/lib/utils';
import { DashboardStats, Insight, MonthSummary } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then(data => {
        setStats(data.stats);
        setInsights(data.insights);
        setMonthlySummaries(data.monthlySummaries || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
        router.push('/login');
      });
  }, [router]);

  if (loading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  const chartData = [...monthlySummaries]
    .slice(0, 6)
    .reverse()
    .map(m => ({
      label: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      income: m.income,
      expenses: m.expenses,
    }));

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <TopBar />

      <main className="max-w-[1200px] mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold text-text-primary mb-6">Dashboard</h1>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label={`Period Income`}
            value={formatCurrency(stats.periodIncome)}
            subValue={stats.periodLabel}
            type="success"
          />
          <StatCard
            label="Period Expenses"
            value={formatCurrency(stats.periodExpenses)}
            subValue={stats.periodLabel}
            type="danger"
          />
          <StatCard
            label="Period Net Profit"
            value={formatCurrency(stats.periodProfit)}
            subValue={stats.periodLabel}
            type={stats.periodProfit >= 0 ? 'success' : 'danger'}
          />
          <StatCard
            label="This Month"
            value={formatCurrency(stats.monthIncome)}
            subValue={`Expenses: ${formatCurrency(stats.monthExpenses)} | Profit: ${formatCurrency(stats.monthProfit)}`}
          />
        </div>

        <InsightsPanel insights={insights} />

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <Card>
            <h2 className="text-md font-semibold text-text-primary mb-4">Monthly Income vs Expenses</h2>
            <div className="h-[200px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#64748B" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#64748B" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="income" name="Income" fill="#0EA5A4" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-text-secondary text-sm">
                  No data yet. Add income and expenses to see trends.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-md font-semibold text-text-primary mb-4">Monthly Summary</h2>
            <div className="space-y-2">
              {monthlySummaries.slice(0, 6).map((m) => {
                const label = new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                return (
                  <div key={m.month} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{label}</p>
                      <p className="text-xs text-text-secondary">
                        {m.liters.toFixed(0)} L · In: {formatCurrency(m.income)} · Out: {formatCurrency(m.expenses)}
                      </p>
                    </div>
                    <p className={`text-sm font-bold ${m.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                      {formatCurrency(m.profit)}
                    </p>
                  </div>
                );
              })}
              {monthlySummaries.length === 0 && (
                <p className="text-sm text-text-secondary text-center py-4">No activity yet</p>
              )}
            </div>
          </Card>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
