import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { createClient } from '@libsql/client';

function toLocalISOString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getClient() {
  let url = process.env.TURSO_DATABASE_URL?.trim();
  if (!url && process.env.NODE_ENV !== 'production') {
    const dbPath = path.join(process.cwd(), 'db', 'local.db');
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    url = pathToFileURL(dbPath).href;
  }
  if (!url) {
    throw new Error(
      'TURSO_DATABASE_URL is not set. Copy .env.example to .env or set TURSO_DATABASE_URL for production.'
    );
  }
  const token = process.env.TURSO_AUTH_TOKEN?.trim();
  return createClient({
    url,
    ...(token ? { authToken: token } : {}),
  });
}

export async function initDb() {
  const db = getClient();
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS income (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      liters REAL NOT NULL,
      rate INTEGER NOT NULL DEFAULT 200,
      total_amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      is_custom INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      note TEXT,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `);

  const existing = await db.execute('SELECT COUNT(*) as count FROM categories WHERE user_id IS NULL');
  const count = Number((existing.rows[0] as any).count);
  if (count === 0) {
    await db.executeMultiple(`
      INSERT INTO categories (user_id, name, is_custom) VALUES (NULL, 'Fuel', 0);
      INSERT INTO categories (user_id, name, is_custom) VALUES (NULL, 'Vehicle Maintenance', 0);
      INSERT INTO categories (user_id, name, is_custom) VALUES (NULL, 'Driver Salary', 0);
      INSERT INTO categories (user_id, name, is_custom) VALUES (NULL, 'Assistant Salary', 0);
    `);
  }
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export async function createUser(phoneNumber: string, passwordHash: string): Promise<any> {
  await initDb();
  const db = getClient();
  const result = await db.execute({
    sql: 'INSERT INTO users (phone_number, password_hash) VALUES (?, ?)',
    args: [phoneNumber, passwordHash],
  });
  return { id: Number(result.lastInsertRowid), phone_number: phoneNumber };
}

export async function getUserByPhone(phoneNumber: string): Promise<any> {
  await initDb();
  const db = getClient();
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE phone_number = ?',
    args: [phoneNumber],
  });
  return result.rows[0] ?? null;
}

export async function getUserById(id: number): Promise<any> {
  await initDb();
  const db = getClient();
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [id],
  });
  return result.rows[0] ?? null;
}

// ─── Income ───────────────────────────────────────────────────────────────────

export async function addIncome(userId: number, date: string, liters: number, rate = 200): Promise<any> {
  await initDb();
  const db = getClient();
  const total = liters * rate;
  const result = await db.execute({
    sql: 'INSERT INTO income (user_id, date, liters, rate, total_amount) VALUES (?, ?, ?, ?, ?)',
    args: [userId, date, liters, rate, total],
  });
  return { id: Number(result.lastInsertRowid), user_id: userId, date, liters, rate, total_amount: total };
}

export async function getIncomeByUser(userId: number, limit = 50): Promise<any[]> {
  await initDb();
  const db = getClient();
  const result = await db.execute({
    sql: 'SELECT * FROM income WHERE user_id = ? ORDER BY date DESC LIMIT ?',
    args: [userId, limit],
  });
  return result.rows.map(r => ({ ...r, liters: Number(r.liters), total_amount: Number(r.total_amount) }));
}

export async function updateIncome(id: number, userId: number, liters: number, date?: string, rate?: number): Promise<boolean> {
  await initDb();
  const db = getClient();
  const existing = await db.execute({ sql: 'SELECT rate, user_id FROM income WHERE id = ?', args: [id] });
  if (existing.rows.length === 0 || Number((existing.rows[0] as any).user_id) !== userId) return false;
  const currentRate = rate ?? Number((existing.rows[0] as any).rate);
  const total = liters * currentRate;
  if (date) {
    await db.execute({
      sql: 'UPDATE income SET liters = ?, rate = ?, total_amount = ?, date = ? WHERE id = ? AND user_id = ?',
      args: [liters, currentRate, total, date, id, userId],
    });
  } else {
    await db.execute({
      sql: 'UPDATE income SET liters = ?, rate = ?, total_amount = ? WHERE id = ? AND user_id = ?',
      args: [liters, currentRate, total, id, userId],
    });
  }
  return true;
}

export async function deleteIncome(id: number, userId: number): Promise<boolean> {
  await initDb();
  const db = getClient();
  const result = await db.execute({ sql: 'DELETE FROM income WHERE id = ? AND user_id = ?', args: [id, userId] });
  return result.rowsAffected > 0;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(userId?: number): Promise<any[]> {
  await initDb();
  const db = getClient();
  const result = await db.execute({
    sql: 'SELECT * FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY id',
    args: [userId ?? null],
  });
  return result.rows;
}

export async function createCategory(userId: number, name: string): Promise<any> {
  await initDb();
  const db = getClient();
  const result = await db.execute({
    sql: 'INSERT INTO categories (user_id, name, is_custom) VALUES (?, ?, 1)',
    args: [userId, name],
  });
  return { id: Number(result.lastInsertRowid), user_id: userId, name, is_custom: 1 };
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function addExpense(userId: number, categoryId: number, amount: number, date: string, note?: string): Promise<any> {
  await initDb();
  const db = getClient();
  const result = await db.execute({
    sql: 'INSERT INTO expenses (user_id, category_id, amount, date, note) VALUES (?, ?, ?, ?, ?)',
    args: [userId, categoryId, amount, date, note ?? null],
  });
  return { id: Number(result.lastInsertRowid), user_id: userId, category_id: categoryId, amount, date, note: note ?? null };
}

export async function getExpensesByUser(userId: number, limit = 50): Promise<any[]> {
  await initDb();
  const db = getClient();
  const result = await db.execute({
    sql: `SELECT e.*, c.name as category_name
    FROM expenses e
    JOIN categories c ON e.category_id = c.id
    WHERE e.user_id = ?
    ORDER BY e.date DESC
    LIMIT ?`,
    args: [userId, limit],
  });
  return result.rows.map(r => ({ ...r, amount: Number(r.amount) }));
}

export async function updateExpense(id: number, userId: number, categoryId: number, amount: number, note?: string): Promise<boolean> {
  await initDb();
  const db = getClient();
  const result = await db.execute({
    sql: 'UPDATE expenses SET category_id = ?, amount = ?, note = ? WHERE id = ? AND user_id = ?',
    args: [categoryId, amount, note ?? null, id, userId],
  });
  return result.rowsAffected > 0;
}

export async function deleteExpense(id: number, userId: number): Promise<boolean> {
  await initDb();
  const db = getClient();
  const result = await db.execute({ sql: 'DELETE FROM expenses WHERE id = ? AND user_id = ?', args: [id, userId] });
  return result.rowsAffected > 0;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getDashboardStats(userId: number): Promise<any> {
  await initDb();
  const db = getClient();
  const today = new Date();
  const todayStr = toLocalISOString(today);
  const monthStart = todayStr.substring(0, 7) + '-01';
  const currentDay = today.getDate();

  const isPeriod1 = currentDay <= 15;
  const periodStart = isPeriod1
    ? todayStr.substring(0, 7) + '-01'
    : todayStr.substring(0, 7) + '-16';
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const periodEnd = isPeriod1
    ? todayStr.substring(0, 7) + '-15'
    : todayStr.substring(0, 7) + '-' + String(lastDayOfMonth).padStart(2, '0');
  const periodLabel = isPeriod1
    ? `1st-15th (${today.toLocaleString('default', { month: 'short' })})`
    : `16th-End (${today.toLocaleString('default', { month: 'short' })})`;

  const [totIncome, totExpenses, monthIncome, monthExpenses, periodIncome, periodExpenses] =
    await Promise.all([
      db.execute({ sql: 'SELECT COALESCE(SUM(total_amount),0) as v FROM income WHERE user_id=?', args: [userId] }),
      db.execute({ sql: 'SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE user_id=?', args: [userId] }),
      db.execute({ sql: 'SELECT COALESCE(SUM(total_amount),0) as v FROM income WHERE user_id=? AND date>=?', args: [userId, monthStart] }),
      db.execute({ sql: 'SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE user_id=? AND date>=?', args: [userId, monthStart] }),
      db.execute({ sql: 'SELECT COALESCE(SUM(total_amount),0) as v FROM income WHERE user_id=? AND date>=? AND date<=?', args: [userId, periodStart, periodEnd] }),
      db.execute({ sql: 'SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE user_id=? AND date>=? AND date<=?', args: [userId, periodStart, periodEnd] }),
    ]);

  const totalIncome = Number((totIncome.rows[0] as any).v);
  const totalExpenses = Number((totExpenses.rows[0] as any).v);
  const mIncome = Number((monthIncome.rows[0] as any).v);
  const mExpenses = Number((monthExpenses.rows[0] as any).v);
  const pIncome = Number((periodIncome.rows[0] as any).v);
  const pExpenses = Number((periodExpenses.rows[0] as any).v);

  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    monthIncome: mIncome,
    monthExpenses: mExpenses,
    monthProfit: mIncome - mExpenses,
    periodIncome: pIncome,
    periodExpenses: pExpenses,
    periodProfit: pIncome - pExpenses,
    periodLabel,
    periodFrom: periodStart,
    periodTo: periodEnd,
  };
}

export async function getPreviousPeriodTotals(
  userId: number,
  currentFrom: string,
  currentTo: string
): Promise<{ totalIncome: number; totalExpenses: number; totalLiters: number }> {
  await initDb();
  const db = getClient();

  const from = new Date(currentFrom + 'T00:00:00');
  const to = new Date(currentTo + 'T00:00:00');
  const spanMs = to.getTime() - from.getTime() + 24 * 60 * 60 * 1000;
  const prevTo = new Date(from.getTime() - 1 * 24 * 60 * 60 * 1000);
  const prevFrom = new Date(prevTo.getTime() - spanMs + 24 * 60 * 60 * 1000);

  const prevFromStr = toLocalISOString(prevFrom);
  const prevToStr = toLocalISOString(prevTo);

  return getPeriodTotals(userId, prevFromStr, prevToStr);
}

/** Income, expense, and liter totals for an optional inclusive date range (YYYY-MM-DD). */
export async function getPeriodTotals(
  userId: number,
  from?: string,
  to?: string
): Promise<{ totalIncome: number; totalExpenses: number; totalLiters: number }> {
  await initDb();
  const db = getClient();
  let incCond = 'user_id = ?';
  let expCond = 'user_id = ?';
  const argsI: (string | number)[] = [userId];
  const argsE: (string | number)[] = [userId];
  if (from) {
    incCond += ' AND date >= ?';
    expCond += ' AND date >= ?';
    argsI.push(from);
    argsE.push(from);
  }
  if (to) {
    incCond += ' AND date <= ?';
    expCond += ' AND date <= ?';
    argsI.push(to);
    argsE.push(to);
  }
  const [inc, exp] = await Promise.all([
    db.execute({
      sql: `SELECT COALESCE(SUM(total_amount),0) as v, COALESCE(SUM(liters),0) as liters FROM income WHERE ${incCond}`,
      args: argsI,
    }),
    db.execute({
      sql: `SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE ${expCond}`,
      args: argsE,
    }),
  ]);
  return {
    totalIncome: Number((inc.rows[0] as any).v),
    totalLiters: Number((inc.rows[0] as any).liters),
    totalExpenses: Number((exp.rows[0] as any).v),
  };
}

/**
 * One row per calendar day in range where there was income and/or expenses.
 * Replaces income-only daily rows so period expense totals match the breakdown table.
 */
export async function getMergedDailySummaries(
  userId: number,
  options?: { from?: string; to?: string; limit?: number }
): Promise<{ date: string; income: number; expenses: number; profit: number }[]> {
  await initDb();
  const db = getClient();
  const { from, to, limit = 200 } = options ?? {};

  let incWhere = 'user_id = ?';
  let expWhere = 'user_id = ?';
  const argsI: (string | number)[] = [userId];
  const argsE: (string | number)[] = [userId];
  if (from) {
    incWhere += ' AND date >= ?';
    expWhere += ' AND date >= ?';
    argsI.push(from);
    argsE.push(from);
  }
  if (to) {
    incWhere += ' AND date <= ?';
    expWhere += ' AND date <= ?';
    argsI.push(to);
    argsE.push(to);
  }

  const [incResult, expResult] = await Promise.all([
    db.execute({
      sql: `SELECT date, COALESCE(SUM(total_amount),0) as income FROM income WHERE ${incWhere} GROUP BY date`,
      args: argsI,
    }),
    db.execute({
      sql: `SELECT date, COALESCE(SUM(amount),0) as expenses FROM expenses WHERE ${expWhere} GROUP BY date`,
      args: argsE,
    }),
  ]);

  const dates = new Set<string>();
  for (const r of incResult.rows) dates.add(r.date as string);
  for (const r of expResult.rows) dates.add(r.date as string);

  const incMap = new Map(incResult.rows.map(r => [r.date as string, Number((r as any).income)]));
  const expMap = new Map(expResult.rows.map(r => [r.date as string, Number((r as any).expenses)]));

  return Array.from(dates)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, limit)
    .map(date => {
      const income = incMap.get(date) ?? 0;
      const expenses = expMap.get(date) ?? 0;
      return { date, income, expenses, profit: income - expenses };
    });
}

export async function getMonthlySummaries(userId: number, months = 12): Promise<any[]> {
  await initDb();
  const db = getClient();

  const [incResult, expResult] = await Promise.all([
    db.execute({
      sql: `SELECT substr(date,1,7) as month,
      COALESCE(SUM(total_amount),0) as income,
      COALESCE(SUM(liters),0) as liters
      FROM income WHERE user_id=?
      GROUP BY month ORDER BY month DESC LIMIT ?`,
      args: [userId, months],
    }),
    db.execute({
      sql: `SELECT substr(date,1,7) as month,
      COALESCE(SUM(amount),0) as expenses
      FROM expenses WHERE user_id=?
      GROUP BY month
      ORDER BY month DESC LIMIT ?`,
      args: [userId, months],
    }),
  ]);

  const incMap = new Map(incResult.rows.map(r => [r.month as string, { income: Number((r as any).income), liters: Number((r as any).liters) }]));
  const expMap = new Map(expResult.rows.map(r => [r.month as string, Number((r as any).expenses)]));

  const allMonths = new Set<string>();
  for (const r of incResult.rows) allMonths.add(r.month as string);
  for (const r of expResult.rows) allMonths.add(r.month as string);

  return Array.from(allMonths)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, months)
    .map(month => {
      const inc = incMap.get(month);
      const income = inc?.income ?? 0;
      const liters = inc?.liters ?? 0;
      const expenses = expMap.get(month) ?? 0;
      return { month, income, liters, expenses, profit: income - expenses };
    });
}

export async function getCategorySummaries(userId: number, from?: string, to?: string): Promise<any[]> {
  await initDb();
  const db = getClient();
  let where = 'e.user_id = ?';
  const args: (string | number)[] = [userId];
  if (from) {
    where += ' AND e.date >= ?';
    args.push(from);
  }
  if (to) {
    where += ' AND e.date <= ?';
    args.push(to);
  }
  const result = await db.execute({
    sql: `SELECT c.name, COALESCE(SUM(e.amount),0) as total
    FROM expenses e
    JOIN categories c ON e.category_id = c.id
    WHERE ${where}
    GROUP BY c.name
    HAVING SUM(e.amount) > 0
    ORDER BY total DESC`,
    args,
  });
  return result.rows.map(r => ({ name: r.name as string, total: Number((r as any).total) }));
}

export async function getInsights(userId: number): Promise<any[]> {
  const insights: any[] = [];
  await initDb();
  const db = getClient();
  const today = toLocalISOString(new Date());
  const weekAgo = toLocalISOString(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const monthStart = today.substring(0, 7) + '-01';

  const lastMonthDate = new Date();
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthStart = toLocalISOString(lastMonthDate).substring(0, 7) + '-01';
  const lastMonthEnd = toLocalISOString(new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0));

  const [mInc, mExp, lmInc, lmExp] = await Promise.all([
    db.execute({ sql: 'SELECT COALESCE(SUM(total_amount),0) as v FROM income WHERE user_id=? AND date>=?', args: [userId, monthStart] }),
    db.execute({ sql: 'SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE user_id=? AND date>=?', args: [userId, monthStart] }),
    db.execute({ sql: 'SELECT COALESCE(SUM(total_amount),0) as v FROM income WHERE user_id=? AND date>=? AND date<=?', args: [userId, lastMonthStart, lastMonthEnd] }),
    db.execute({ sql: 'SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE user_id=? AND date>=? AND date<=?', args: [userId, lastMonthStart, lastMonthEnd] }),
  ]);

  const monthIncome = Number((mInc.rows[0] as any).v);
  const monthExpenses = Number((mExp.rows[0] as any).v);
  const profit = monthIncome - monthExpenses;
  const lastMonthIncome = Number((lmInc.rows[0] as any).v);
  const lastMonthExpenses = Number((lmExp.rows[0] as any).v);

  if (monthExpenses > monthIncome && monthIncome > 0) {
    insights.push({ type: 'danger', message: 'You are spending more than you earn this month' });
  } else if (profit < 0) {
    insights.push({ type: 'danger', message: 'You are operating at a loss this month' });
  }

  if (monthIncome > 0 && lastMonthIncome > 0) {
    const incomeChange = Math.round(((monthIncome - lastMonthIncome) / lastMonthIncome) * 100);
    if (incomeChange <= -20) {
      insights.push({ type: 'warning', message: `Income dropped ${Math.abs(incomeChange)}% vs. last month` });
    } else if (incomeChange >= 20) {
      insights.push({ type: 'info', message: `Income grew ${incomeChange}% vs. last month` });
    }
  }

  if (lastMonthExpenses > 0 && monthExpenses > 0) {
    const expChange = Math.round(((monthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100);
    if (expChange >= 30) {
      insights.push({ type: 'warning', message: `Expenses surged ${expChange}% vs. last month` });
    }
  }

  if (monthIncome > 0 && monthExpenses > 0) {
    const ratio = Math.round((monthExpenses / monthIncome) * 100);
    if (ratio > 70 && ratio <= 100) {
      insights.push({ type: 'warning', message: `Expense ratio is ${ratio}% of income — consider cutting costs` });
    }
  }

  const [fuelResult, weekExpResult] = await Promise.all([
    db.execute({
      sql: `SELECT COALESCE(SUM(e.amount),0) as v FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.user_id=? AND c.name='Fuel' AND e.date>=?`,
      args: [userId, weekAgo],
    }),
    db.execute({
      sql: 'SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE user_id=? AND date>=?',
      args: [userId, weekAgo],
    }),
  ]);
  const fuelExpenses = Number((fuelResult.rows[0] as any).v);
  const weekExpenses = Number((weekExpResult.rows[0] as any).v);
  if (weekExpenses > 0 && fuelExpenses > 0.5 * weekExpenses) {
    insights.push({ type: 'warning', message: 'Fuel costs are over half your expenses this week' });
  }

  const [mLiters, lmLiters] = await Promise.all([
    db.execute({ sql: 'SELECT COALESCE(SUM(liters),0) as v FROM income WHERE user_id=? AND date>=?', args: [userId, monthStart] }),
    db.execute({ sql: 'SELECT COALESCE(SUM(liters),0) as v FROM income WHERE user_id=? AND date>=? AND date<=?', args: [userId, lastMonthStart, lastMonthEnd] }),
  ]);
  const monthLiters = Number((mLiters.rows[0] as any).v);
  const lastMonthLiters = Number((lmLiters.rows[0] as any).v);
  if (lastMonthLiters > 0 && monthLiters > 0) {
    const literChange = Math.round(((monthLiters - lastMonthLiters) / lastMonthLiters) * 100);
    if (literChange <= -20) {
      insights.push({ type: 'warning', message: `Liters delivered dropped ${Math.abs(literChange)}% vs. last month` });
    } else if (literChange >= 20) {
      insights.push({ type: 'info', message: `Liters delivered up ${literChange}% vs. last month` });
    }
  }

  const monthSummaries = await getMonthlySummaries(userId, 3);
  if (monthSummaries.length >= 3) {
    const recent3 = monthSummaries.slice(0, 3);
    if (recent3.every(m => m.profit < 0)) {
      insights.push({ type: 'danger', message: 'You have been operating at a loss for 3 consecutive months' });
    }
  }

  const topCat = await getCategorySummaries(userId);
  if (topCat.length > 0 && topCat[0].total > 0) {
    insights.push({ type: 'info', message: `Your most expensive category is ${topCat[0].name}` });
  }

  return insights;
}
