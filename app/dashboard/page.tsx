'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar, MobileNav } from '@/components/TopBar';
import { Card, StatCard } from '@/components/Card';
import { InsightsPanel } from '@/components/InsightsPanel';
import { formatCurrency } from '@/lib/utils';
import { DashboardStats, Insight, MonthSummary } from '@/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Line, Area, CartesianGrid, Legend } from 'recharts';

function ChangeBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const isUp = value >= 0;
  return (
    <span className={`text-xs font-medium ml-1 ${isUp ? 'text-success' : 'text-danger'}`}>
      {isUp ? '↑' : '↓'} {Math.abs(value)}%
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthSummary[]>([]);
  const [comparison, setComparison] = useState<{ income: number | null; expenses: number | null; liters: number | null }>({ income: null, expenses: null, liters: null });
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
        setComparison(data.prevPeriodComparison || { income: null, expenses: null, liters: null });
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
      profit: m.profit,
      liters: m.liters,
    }));

  const periodMargin = stats.periodIncome > 0 ? ((stats.periodProfit / stats.periodIncome) * 100).toFixed(1) : null;
  const monthMargin = stats.monthIncome > 0 ? ((stats.monthProfit / stats.monthIncome) * 100).toFixed(1) : null;

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
            badge={<ChangeBadge value={comparison.income} />}
          />
          <StatCard
            label="Period Expenses"
            value={formatCurrency(stats.periodExpenses)}
            subValue={stats.periodLabel}
            type="danger"
            badge={<ChangeBadge value={comparison.expenses} />}
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Period Margin"
            value={periodMargin ? `${periodMargin}%` : 'N/A'}
            subValue={stats.periodLabel}
            type={periodMargin && Number(periodMargin) >= 0 ? 'success' : 'danger'}
          />
          <StatCard
            label="Month Margin"
            value={monthMargin ? `${monthMargin}%` : 'N/A'}
            subValue="Profit / Income"
            type={monthMargin && Number(monthMargin) >= 0 ? 'success' : 'danger'}
          />
          <StatCard
            label="All-Time Income"
            value={formatCurrency(stats.totalIncome)}
            type="success"
          />
          <StatCard
            label="All-Time Net Profit"
            value={formatCurrency(stats.netProfit)}
            type={stats.netProfit >= 0 ? 'success' : 'danger'}
          />
        </div>

        <InsightsPanel insights={insights} />

        <div className="grid md:grid-cols-2 gap-6 mt-6">
        <Card className="md:col-span-2">
          <h2 className="text-md font-semibold text-text-primary mb-4">Monthly Income vs Expenses</h2>
          <div className="h-[250px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#64748B" />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} stroke="#64748B" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#64748B" tickFormatter={(v) => `${v.toFixed(0)}L`} />
                  <Tooltip formatter={(value: number, name: string) => name === 'Liters' ? `${value.toFixed(0)} L` : formatCurrency(value)} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="income" name="Income" fill="#0EA5A4" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="left" dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="left" type="monotone" dataKey="profit" name="Profit" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
                  <Area yAxisId="right" type="monotone" dataKey="liters" name="Liters" fill="#8B5CF6" fillOpacity={0.15} stroke="#8B5CF6" strokeWidth={2} />
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
