'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar, MobileNav } from '@/components/TopBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { formatCurrency, formatDate, getTodayDate } from '@/lib/utils';
import { Income } from '@/types';

const DEFAULT_RATE = 200;

export default function IncomePage() {
  const router = useRouter();
  const [records, setRecords] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [liters, setLiters] = useState('');
  const [rate, setRate] = useState(DEFAULT_RATE);
  const [date, setDate] = useState(getTodayDate());
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLiters, setEditLiters] = useState('');
  const [editDate, setEditDate] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const res = await fetch('/api/income');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRecords(data);
    } catch {
      router.push('/login');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liters || parseFloat(liters) <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/income', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liters: parseFloat(liters), date, rate }),
      });

      if (res.ok) {
        setLiters('');
        setDate(getTodayDate());
        fetchRecords();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editLiters || parseFloat(editLiters) <= 0) return;

    try {
      await fetch(`/api/income/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liters: parseFloat(editLiters), date: editDate || undefined }),
      });
      setEditingId(null);
      setEditLiters('');
      setEditDate('');
      fetchRecords();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this income record?')) return;

    try {
      await fetch(`/api/income/${id}`, { method: 'DELETE' });
      fetchRecords();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  const currentRate = rate || DEFAULT_RATE;

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <TopBar />

      <main className="max-w-[1200px] mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold text-text-primary mb-6">Income</h1>

        <Card className="mb-6">
          <h2 className="text-md font-semibold text-text-primary mb-4">Add Daily Income</h2>
          <p className="text-sm text-text-secondary mb-4">
            Income = Liters × Rate (UGX)
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
            <Input
              type="number"
              placeholder="Liters collected"
              value={liters}
              onChange={e => setLiters(e.target.value)}
              min="0"
              step="0.1"
              required
              className="flex-1"
            />
            <Input
              type="number"
              placeholder="Rate (UGX/L)"
              value={rate}
              onChange={e => setRate(parseInt(e.target.value) || DEFAULT_RATE)}
              min="1"
              className="sm:w-28"
            />
            <Input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="sm:w-40"
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Income'}
            </Button>
          </form>
          {liters && parseFloat(liters) > 0 && (
            <p className="mt-3 text-sm text-success font-medium">
              Calculated Income: {formatCurrency(parseFloat(liters) * currentRate)}
            </p>
          )}
        </Card>

        <Card>
          <h2 className="text-md font-semibold text-text-primary mb-4">Income History</h2>
          <div className="space-y-3">
            {records.map(record => (
              <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-border last:border-0 gap-2">
                <div className="flex-1">
                  <p className="text-sm text-text-primary">{formatDate(record.date)}</p>
                  <p className="text-xs text-text-secondary">{record.liters} liters × {record.rate} UGX/L</p>
                </div>
                <div className="flex items-center gap-3">
                  {editingId === record.id ? (
                    <>
                      <Input
                        type="number"
                        value={editLiters}
                        onChange={e => setEditLiters(e.target.value)}
                        min="0"
                        step="0.1"
                        className="w-28"
                      />
                      <Input
                        type="date"
                        value={editDate}
                        onChange={e => setEditDate(e.target.value)}
                        className="w-36"
                      />
                      <Button size="sm" onClick={() => handleUpdate(record.id)}>Save</Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <p className="text-success font-semibold">{formatCurrency(record.total_amount)}</p>
                      <Button size="sm" variant="secondary" onClick={() => { setEditingId(record.id); setEditLiters(record.liters.toString()); setEditDate(record.date); }}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(record.id)}>Delete</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {records.length === 0 && (
              <p className="text-sm text-text-secondary text-center py-4">No income records yet</p>
            )}
          </div>
        </Card>
      </main>

      <MobileNav />
    </div>
  );
}
