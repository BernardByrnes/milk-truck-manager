'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TopBar, MobileNav } from '@/components/TopBar';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input, Select, TextArea } from '@/components/Input';
import { formatCurrency, formatDate, getTodayDate } from '@/lib/utils';
import { ExpenseWithCategory, Category } from '@/types';

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(getTodayDate());
  const [note, setNote] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAmount, setEditAmount] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [expRes, catRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/categories'),
      ]);
      
      if (!expRes.ok || !catRes.ok) throw new Error();
      
      setExpenses(await expRes.json());
      const cats = await catRes.json();
      setCategories(cats);
      if (cats.length > 0 && !categoryId) {
        setCategoryId(cats[0].id.toString());
      }
    } catch {
      router.push('/login');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || !categoryId) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          category_id: parseInt(categoryId),
          date,
          note: note || undefined,
        }),
      });
      
      if (res.ok) {
        setAmount('');
        setNote('');
        setDate(getTodayDate());
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategory }),
      });
      
      if (res.ok) {
        setNewCategory('');
        setShowAddCategory(false);
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editAmount || parseFloat(editAmount) <= 0 || !editCategoryId) return;
    
    try {
      await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(editAmount),
          category_id: parseInt(editCategoryId),
        }),
      });
      setEditingId(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this expense?')) return;
    
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      fetchData();
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

  const categoryOptions = categories.map(c => ({ value: c.id.toString(), label: c.name }));

  return (
    <div className="min-h-screen pb-20 md:pb-8">
      <TopBar />
      
      <main className="max-w-[1200px] mx-auto px-4 py-6">
        <h1 className="text-xl font-semibold text-text-primary mb-6">Expenses</h1>

        <Card className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-md font-semibold text-text-primary">Add Expense</h2>
            <button
              onClick={() => setShowAddCategory(!showAddCategory)}
              className="text-sm text-accent hover:underline"
            >
              {showAddCategory ? 'Cancel' : '+ Add Category'}
            </button>
          </div>

          {showAddCategory && (
            <form onSubmit={handleAddCategory} className="flex gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
              <Input
                placeholder="Category name"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                className="flex-1"
              />
              <Button type="submit">Add</Button>
            </form>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                type="number"
                placeholder="Amount (UGX)"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                min="0"
                required
              />
              <Select
                options={categoryOptions}
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
              <Input
                placeholder="Note (optional)"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? 'Adding...' : 'Add Expense'}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-md font-semibold text-text-primary mb-4">Expense History</h2>
          <div className="space-y-3">
            {expenses.map(expense => (
              <div key={expense.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-border last:border-0 gap-2">
                <div className="flex-1">
                  <p className="text-sm text-text-primary">{expense.category_name}</p>
                  <p className="text-xs text-text-secondary">
                    {formatDate(expense.date)}{expense.note ? ` • ${expense.note}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {editingId === expense.id ? (
                    <>
                      <Input
                        type="number"
                        value={editAmount}
                        onChange={e => setEditAmount(e.target.value)}
                        min="0"
                        className="w-28"
                      />
                      <Select
                        options={categoryOptions}
                        value={editCategoryId}
                        onChange={e => setEditCategoryId(e.target.value)}
                        className="w-36"
                      />
                      <Button size="sm" onClick={() => handleUpdate(expense.id)}>Save</Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Cancel</Button>
                    </>
                  ) : (
                    <>
                      <p className="text-danger font-semibold">{formatCurrency(expense.amount)}</p>
                      <Button size="sm" variant="secondary" onClick={() => { setEditingId(expense.id); setEditAmount(expense.amount.toString()); setEditCategoryId(expense.category_id.toString()); }}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => handleDelete(expense.id)}>Delete</Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <p className="text-sm text-text-secondary text-center py-4">No expense records yet</p>
            )}
          </div>
        </Card>
      </main>

      <MobileNav />
    </div>
  );
}