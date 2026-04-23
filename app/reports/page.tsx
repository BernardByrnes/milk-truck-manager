'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar, MobileNav } from '@/components/TopBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { formatCurrency, getCurrentBimonthlyRange, getMonthRange } from '@/lib/utils';
import { DailySummary, CategorySummary } from '@/types';

type ReportType = 'daily' | 'expense' | 'bimonthly';

const REPORT_TYPE_OPTIONS = [
  { value: 'daily', label: 'Period report (date range)' },
  { value: 'bimonthly', label: 'Bimonthly Report' },
  { value: 'expense', label: 'Expense Breakdown' },
];

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const [periodTotals, setPeriodTotals] = useState({ totalIncome: 0, totalExpenses: 0, totalLiters: 0 });
  const [periodLabel, setPeriodLabel] = useState('');
  const [activePreset, setActivePreset] = useState<string>('allTime');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams();
        params.set('type', reportType);
        if (dateFrom) params.set('from', dateFrom);
        if (dateTo) params.set('to', dateTo);

        const res = await fetch(`/api/reports/summary?${params}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (cancelled) return;
        setDailySummaries(data.daily || []);
        setCategorySummaries(data.categories || []);
        setPeriodTotals(data.totals || { totalIncome: 0, totalExpenses: 0, totalLiters: 0 });
        setPeriodLabel(data.periodLabel || '');
      } catch {
        if (!cancelled) router.push('/login');
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [reportType, dateFrom, dateTo, router]);

  const applyPreset = (preset: string) => {
    setActivePreset(preset);
    if (preset === 'thisBimonth') {
      const range = getCurrentBimonthlyRange();
      setDateFrom(range.from);
      setDateTo(range.to);
      setReportType('bimonthly');
    } else if (preset === 'thisMonth') {
      const range = getMonthRange(new Date());
      setDateFrom(range.from);
      setDateTo(range.to);
      setReportType('daily');
    } else if (preset === 'lastMonth') {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const range = getMonthRange(lastMonth);
      setDateFrom(range.from);
      setDateTo(range.to);
      setReportType('daily');
    } else {
      setDateFrom('');
      setDateTo('');
      setReportType('daily');
    }
  };

  const handleReportTypeChange = (value: string) => {
    setReportType(value as ReportType);
    setActivePreset('');
    if (value === 'bimonthly' && !dateFrom && !dateTo) {
      const range = getCurrentBimonthlyRange();
      setDateFrom(range.from);
      setDateTo(range.to);
      setActivePreset('thisBimonth');
    }
  };

  const handleDateChange = (field: 'from' | 'to', value: string) => {
    setActivePreset('');
    if (field === 'from') setDateFrom(value);
    else setDateTo(value);
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ type: reportType });
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);

      const res = await fetch(`/api/reports/pdf?${params}`);
      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `milk_truck_report_${new Date().toISOString().split('T')[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
    setExporting(false);
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ type: reportType, format: 'csv' });
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);

      const res = await fetch(`/api/reports/excel?${params}`);
      if (!res.ok) throw new Error();

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `milk_truck_report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
    setExporting(false);
  };

  const totalIncome = periodTotals.totalIncome;
  const totalExpenses = periodTotals.totalExpenses;
  const netProfit = totalIncome - totalExpenses;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <TopBar />

      <main className="max-w-[1200px] mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold text-text-primary mb-6">Reports</h1>

        <Card className="mb-6">
          <h2 className="text-md font-semibold text-text-primary mb-4">Filter & Export</h2>

          <div className="flex flex-wrap gap-2 mb-4">
            {([
              { key: 'thisBimonth', label: 'This Bimonth' },
              { key: 'thisMonth', label: 'This Month' },
              { key: 'lastMonth', label: 'Last Month' },
              { key: 'allTime', label: 'All Time' },
            ] as const).map(p => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  activePreset === p.key
                    ? 'bg-accent text-white border-accent'
                    : 'bg-white text-text-primary border-border hover:border-accent hover:text-accent'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-4">
            <Select
              options={REPORT_TYPE_OPTIONS}
              value={reportType}
              onChange={e => handleReportTypeChange(e.target.value)}
              className="w-52"
            />
            <Input
              type="date"
              value={dateFrom}
              onChange={e => handleDateChange('from', e.target.value)}
              placeholder="From date"
              className="sm:w-40"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={e => handleDateChange('to', e.target.value)}
              placeholder="To date"
              className="sm:w-40"
            />
          </div>

          <div className="flex gap-3 mt-4">
            <Button onClick={handleExportPDF} disabled={exporting}>
              Export PDF
            </Button>
            <Button variant="secondary" onClick={handleExportCSV} disabled={exporting}>
              Export CSV
            </Button>
          </div>
        </Card>

        <Card className="mb-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-md font-semibold text-text-primary">Financial Summary</h2>
            {periodLabel && (
              <span className="text-xs text-accent font-medium">{periodLabel}</span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Total Income</p>
              <p className="text-lg sm:text-xl font-bold text-success break-all">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Total Expenses</p>
              <p className="text-lg sm:text-xl font-bold text-danger break-all">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className={`text-center p-4 rounded-lg ${netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-sm text-text-secondary mb-1">Net Profit</p>
              <p className={`text-lg sm:text-xl font-bold ${netProfit >= 0 ? 'text-success' : 'text-danger'} break-all`}>
                {formatCurrency(netProfit)}
              </p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-text-secondary mb-1">Liters Delivered</p>
              <p className="text-lg sm:text-xl font-bold text-accent break-all">{periodTotals.totalLiters.toFixed(0)} L</p>
            </div>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {reportType !== 'expense' && (
            <Card>
              <h2 className="text-md font-semibold text-text-primary mb-4">Activity by date</h2>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {dailySummaries.map(day => (
                  <div key={day.date} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border last:border-0 gap-1">
                    <span className="text-sm text-text-primary">{day.date}</span>
                    <div className="text-right">
                      <p className="text-xs text-text-secondary break-all">
                        In: {formatCurrency(day.income)} | Out: {formatCurrency(day.expenses)}
                      </p>
                      <p className={`text-sm font-semibold ${day.profit >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(day.profit)}
                      </p>
                    </div>
                  </div>
                ))}
                {dailySummaries.length === 0 && (
                  <p className="text-sm text-text-secondary text-center py-4">No data for selected period</p>
                )}
              </div>
            </Card>
          )}

          <Card className={reportType === 'expense' ? 'md:col-span-2 ring-2 ring-accent/20' : ''}>
            <h2 className="text-md font-semibold text-text-primary mb-4">Expenses by Category</h2>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {categorySummaries.map(cat => {
                const denom = totalExpenses > 0 ? totalExpenses : categorySummaries.reduce((s, c) => s + c.total, 0);
                const pct = denom > 0 ? ((cat.total / denom) * 100).toFixed(1) : '0';
                return (
                  <div key={cat.name} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border last:border-0 gap-1">
                    <div>
                      <span className="text-sm text-text-primary">{cat.name}</span>
                      <span className="ml-2 text-xs text-text-secondary">{pct}%</span>
                    </div>
                    <span className="text-danger font-semibold break-all">{formatCurrency(cat.total)}</span>
                  </div>
                );
              })}
              {categorySummaries.length === 0 && (
                <p className="text-sm text-text-secondary text-center py-4">No expense data yet</p>
              )}
            </div>
          </Card>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
