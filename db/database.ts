import { promises as fs } from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'db', 'data.json');

interface DBData {
  users: any[];
  income: any[];
  expenses: any[];
  categories: any[];
  counters: { [key: string]: number };
}

let cachedData: DBData | null = null;

async function readDb(): Promise<DBData> {
  if (cachedData) return cachedData;
  
  try {
    const content = await fs.readFile(dbPath, 'utf-8');
    cachedData = JSON.parse(content);
  } catch {
    cachedData = {
      users: [],
      income: [],
      expenses: [],
      categories: [
        { id: 1, name: 'Fuel', is_custom: false },
        { id: 2, name: 'Vehicle Maintenance', is_custom: false },
        { id: 3, name: 'Driver Salary', is_custom: false },
        { id: 4, name: 'Assistant Salary', is_custom: false },
      ],
      counters: { users: 0, income: 0, expenses: 0, categories: 4 }
    };
  }
  return cachedData!;
}

async function saveDb(data: DBData): Promise<void> {
  await fs.mkdir(path.dirname(dbPath), { recursive: true });
  await fs.writeFile(dbPath, JSON.stringify(data, null, 2));
}

export async function runQuery(sql: string, params: any[] = []): Promise<any> {
  const db = await readDb();
  
  if (sql.trim().toUpperCase().startsWith('INSERT')) {
    const table = sql.match(/INTO\s+(\w+)/i)?.[1]?.toLowerCase();
    if (table && db[table as keyof DBData]) {
      const id = ++db.counters[table];
      const record = { id, ...Object.fromEntries(
        sql.match(/\(([^)]+)\)\s*VALUES/i)?.[1].split(',').map((v, i) => [v.trim(), params[i]] ) || []
      )};
      (db[table as keyof DBData] as any[]).push(record);
      await saveDb(db);
      return { lastInsertRowid: id };
    }
  }
  
  return { lastInsertRowid: 0 };
}

export async function getOne<T>(sql: string, params: any[] = []): Promise<T | undefined> {
  const db = await readDb();
  const tableMatch = sql.match(/FROM\s+(\w+)/i);
  if (!tableMatch) return undefined;
  
  const table = tableMatch[1].toLowerCase();
  if (!db[table as keyof DBData]) return undefined;
  
  const records = db[table as keyof DBData] as any[];
  
  if (sql.includes('WHERE')) {
    const whereMatch = sql.match(/WHERE\s+\w+\s*=\s*\?/i);
    if (whereMatch && params[0] !== undefined) {
      return records.find(r => r.id === params[0] || r.phone_number === params[0]) as T;
    }
  }
  
  return records[0] as T;
}

export async function getAll<T>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await readDb();
  const tableMatch = sql.match(/FROM\s+(\w+)/i);
  if (!tableMatch) return [];
  
  const table = tableMatch[1].toLowerCase();
  if (!db[table as keyof DBData]) return [];
  
  let records = [...db[table as keyof DBData] as any[]];
  
  if (sql.includes('ORDER BY')) {
    const orderMatch = sql.match(/ORDER BY\s+(\w+)(?:\s+DESC)?/i);
    if (orderMatch) {
      records.sort((a, b) => {
        if (orderMatch[1] === 'date') {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        return (b[orderMatch[1]] || 0) - (a[orderMatch[1]] || 0);
      });
    }
  }
  
  if (sql.includes('LIMIT')) {
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      records = records.slice(0, parseInt(limitMatch[1]));
    }
  }
  
  if (sql.includes('WHERE') && params.length > 0) {
    const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
    if (whereMatch) {
      const field = whereMatch[1];
      records = records.filter(r => r[field] === params[0]);
    }
  }
  
  return records as T[];
}

export async function createUser(phoneNumber: string, passwordHash: string): Promise<any> {
  const db = await readDb();
  const id = ++db.counters.users;
  const user = { id, phone_number: phoneNumber, password_hash: passwordHash, created_at: new Date().toISOString() };
  db.users.push(user);
  await saveDb(db);
  return user;
}

export async function getUserByPhone(phoneNumber: string): Promise<any> {
  const db = await readDb();
  return db.users.find(u => u.phone_number === phoneNumber);
}

export async function getUserById(id: number): Promise<any> {
  const db = await readDb();
  return db.users.find(u => u.id === id);
}

export async function addIncome(userId: number, date: string, liters: number): Promise<any> {
  const db = await readDb();
  const id = ++db.counters.income;
  const record = { id, user_id: userId, date, liters, rate: 200, total_amount: liters * 200, created_at: new Date().toISOString() };
  db.income.push(record);
  await saveDb(db);
  return record;
}

export async function getIncomeByUser(userId: number, limit = 50): Promise<any[]> {
  const db = await readDb();
  return db.income.filter(i => i.user_id === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
}

export async function updateIncome(id: number, liters: number): Promise<void> {
  const db = await readDb();
  const record = db.income.find(i => i.id === id);
  if (record) {
    record.liters = liters;
    record.total_amount = liters * 200;
    await saveDb(db);
  }
}

export async function deleteIncome(id: number): Promise<void> {
  const db = await readDb();
  db.income = db.income.filter(i => i.id !== id);
  await saveDb(db);
}

export async function getCategories(userId?: number): Promise<any[]> {
  const db = await readDb();
  return db.categories;
}

export async function createCategory(userId: number, name: string): Promise<any> {
  const db = await readDb();
  const id = ++db.counters.categories;
  const record = { id, user_id: userId, name, is_custom: true, created_at: new Date().toISOString() };
  db.categories.push(record);
  await saveDb(db);
  return record;
}

export async function addExpense(userId: number, categoryId: number, amount: number, date: string, note?: string): Promise<any> {
  const db = await readDb();
  const id = ++db.counters.expenses;
  const record = { id, user_id: userId, category_id: categoryId, amount, date, note: note || null, created_at: new Date().toISOString() };
  db.expenses.push(record);
  await saveDb(db);
  return record;
}

export async function getExpensesByUser(userId: number, limit = 50): Promise<any[]> {
  const db = await readDb();
  return db.expenses.filter(e => e.user_id === userId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, limit);
}

export async function updateExpense(id: number, categoryId: number, amount: number, note?: string): Promise<void> {
  const db = await readDb();
  const record = db.expenses.find(e => e.id === id);
  if (record) {
    record.category_id = categoryId;
    record.amount = amount;
    record.note = note || null;
    await saveDb(db);
  }
}

export async function deleteExpense(id: number): Promise<void> {
  const db = await readDb();
  db.expenses = db.expenses.filter(e => e.id !== id);
  await saveDb(db);
}

export async function getDashboardStats(userId: number): Promise<any> {
  const db = await readDb();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const monthStart = todayStr.substring(0, 7) + '-01';
  const currentDay = today.getDate();

  // Bimonthly period calculation (Period 1: 1-15, Period 2: 16-end)
  const isPeriod1 = currentDay <= 15;
  const periodStart = isPeriod1
    ? todayStr.substring(0, 7) + '-01'
    : todayStr.substring(0, 7) + '-16';
  const periodEnd = isPeriod1
    ? todayStr.substring(0, 7) + '-15'
    : new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
  const periodLabel = isPeriod1 ? `1st-15th (${today.toLocaleString('default', { month: 'short' })})` : `16th-End (${today.toLocaleString('default', { month: 'short' })})`;

  const userIncome = db.income.filter(i => i.user_id === userId);
  const userExpenses = db.expenses.filter(e => e.user_id === userId);

  const totalIncome = userIncome.reduce((sum, i) => sum + i.total_amount, 0);
  const totalExpenses = userExpenses.reduce((sum, e) => sum + e.amount, 0);
  const todayIncome = userIncome.filter(i => i.date === todayStr).reduce((sum, i) => sum + i.total_amount, 0);
  const todayExpenses = userExpenses.filter(e => e.date === todayStr).reduce((sum, e) => sum + e.amount, 0);
  const monthIncome = userIncome.filter(i => i.date >= monthStart).reduce((sum, i) => sum + i.total_amount, 0);
  const monthExpenses = userExpenses.filter(e => e.date >= monthStart).reduce((sum, e) => sum + e.amount, 0);

  // Period (bimonthly) stats
  const periodIncome = userIncome.filter(i => i.date >= periodStart && i.date <= periodEnd).reduce((sum, i) => sum + i.total_amount, 0);
  const periodExpenses = userExpenses.filter(e => e.date >= periodStart && e.date <= periodEnd).reduce((sum, e) => sum + e.amount, 0);
  const periodProfit = periodIncome - periodExpenses;

  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    todayIncome,
    todayExpenses,
    monthIncome,
    monthExpenses,
    monthProfit: monthIncome - monthExpenses,
    periodIncome,
    periodExpenses,
    periodProfit,
    periodLabel,
  };
}

export async function getDailySummaries(userId: number, days = 30): Promise<any[]> {
  const db = await readDb();
  const userIncome = db.income.filter(i => i.user_id === userId);
  const userExpenses = db.expenses.filter(e => e.user_id === userId);
  
  const dateMap = new Map<string, { income: number; expenses: number }>();
  
  userIncome.forEach(i => {
    const existing = dateMap.get(i.date) || { income: 0, expenses: 0 };
    dateMap.set(i.date, { ...existing, income: existing.income + i.total_amount });
  });
  
  userExpenses.forEach(e => {
    const existing = dateMap.get(e.date) || { income: 0, expenses: 0 };
    dateMap.set(e.date, { ...existing, expenses: existing.expenses + e.amount });
  });
  
  return Array.from(dateMap.entries())
    .map(([date, data]) => ({ date, ...data, profit: data.income - data.expenses }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, days);
}

export async function getCategorySummaries(userId: number): Promise<any[]> {
  const db = await readDb();
  const userExpenses = db.expenses.filter(e => e.user_id === userId);
  
  const categoryMap = new Map<string, number>();
  
  userExpenses.forEach(e => {
    const category = db.categories.find(c => c.id === e.category_id);
    if (category) {
      categoryMap.set(category.name, (categoryMap.get(category.name) || 0) + e.amount);
    }
  });
  
  return Array.from(categoryMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

export async function getMonthlySummaries(userId: number, months = 12): Promise<any[]> {
  const db = await readDb();
  const userIncome = db.income.filter((i: any) => i.user_id === userId);
  const userExpenses = db.expenses.filter((e: any) => e.user_id === userId);

  const monthMap = new Map<string, { income: number; expenses: number; liters: number }>();

  userIncome.forEach((i: any) => {
    const month = i.date.substring(0, 7);
    const existing = monthMap.get(month) || { income: 0, expenses: 0, liters: 0 };
    monthMap.set(month, { ...existing, income: existing.income + i.total_amount, liters: existing.liters + i.liters });
  });

  userExpenses.forEach((e: any) => {
    const month = e.date.substring(0, 7);
    const existing = monthMap.get(month) || { income: 0, expenses: 0, liters: 0 };
    monthMap.set(month, { ...existing, expenses: existing.expenses + e.amount });
  });

  return Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data, profit: data.income - data.expenses }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, months);
}

export async function getInsights(userId: number): Promise<any[]> {
  const insights: any[] = [];
  const db = await readDb();
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthStart = today.substring(0, 7) + '-01';
  
  const userIncome = db.income.filter(i => i.user_id === userId);
  const userExpenses = db.expenses.filter(e => e.user_id === userId);
  
  const monthIncome = userIncome.filter(i => i.date >= monthStart).reduce((sum, i) => sum + i.total_amount, 0);
  const monthExpenses = userExpenses.filter(e => e.date >= monthStart).reduce((sum, e) => sum + e.amount, 0);
  
  if (monthExpenses > monthIncome && monthIncome > 0) {
    insights.push({ type: 'danger', message: 'You are spending more than you earn this month' });
  }
  
  const fuelCategory = db.categories.find(c => c.name === 'Fuel');
  if (fuelCategory) {
    const fuelExpenses = userExpenses.filter(e => e.category_id === fuelCategory.id && e.date >= weekAgo).reduce((sum, e) => sum + e.amount, 0);
    if (monthExpenses > 0 && fuelExpenses > 0.4 * monthExpenses) {
      insights.push({ type: 'warning', message: 'Fuel costs are unusually high this week' });
    }
  }
  
  const profit = monthIncome - monthExpenses;
  if (profit < 0) {
    insights.push({ type: 'danger', message: 'You are operating at a loss this month' });
  }
  
  const topCategory = await getCategorySummaries(userId);
  if (topCategory.length > 0 && topCategory[0].total > 0) {
    insights.push({ type: 'info', message: `Your most expensive category is ${topCategory[0].name}` });
  }
  
  return insights;
}