'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar, MobileNav } from '@/components/TopBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { formatCurrency } from '@/lib/utils';
import { DailySummary, CategorySummary } from '@/types';

export default function ReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('daily');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [categorySummaries, setCategorySummaries] = useState<CategorySummary[]>([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch('/api/reports/summary');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDailySummaries(data.daily || []);
      setCategorySummaries(data.categories || []);
    } catch {
      router.push('/login');
    }
    setLoading(false);
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

  const filteredDaily = dailySummaries.filter(d => {
    if (dateFrom && d.date < dateFrom) return false;
    if (dateTo && d.date > dateTo) return false;
    return true;
  });

  const totalIncome = filteredDaily.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = filteredDaily.reduce((sum, d) => sum + d.expenses, 0);
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
          <h2 className="text-md font-semibold text-text-primary mb-4">Export Reports</h2>
          <div className="flex flex-wrap gap-4">
<Select
          options={[
            { value: 'daily', label: 'Daily Report' },
            { value: 'expense', label: 'Expense Breakdown' },
            { value: 'bimonthly', label: 'Bimonthly Report' },
          ]}
          value={reportType}
          onChange={e => setReportType(e.target.value)}
          className="w-48"
        />
            <Input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              placeholder="From date"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              placeholder="To date"
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
        <h2 className="text-md font-semibold text-text-primary mb-4">Financial Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        </div>
      </Card>

        <div className="grid md:grid-cols-2 gap-6">
<Card>
        <h2 className="text-md font-semibold text-text-primary mb-4">Daily Breakdown</h2>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {filteredDaily.map(day => (
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
          {filteredDaily.length === 0 && (
            <p className="text-sm text-text-secondary text-center py-4">No data for selected period</p>
          )}
        </div>
      </Card>

<Card>
        <h2 className="text-md font-semibold text-text-primary mb-4">Expenses by Category</h2>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {categorySummaries.map(cat => (
            <div key={cat.name} className="flex flex-col sm:flex-row sm:items-center justify-between py-2 border-b border-border last:border-0 gap-1">
              <span className="text-sm text-text-primary">{cat.name}</span>
              <span className="text-danger font-semibold break-all">{formatCurrency(cat.total)}</span>
            </div>
          ))}
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