import { createClient } from '@libsql/client';

function getClient() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error('TURSO_DATABASE_URL is not set');
  return createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
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

  // Seed default categories if none exist
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

export async function addIncome(userId: number, date: string, liters: number): Promise<any> {
  await initDb();
  const db = getClient();
  const total = liters * 200;
  const result = await db.execute({
    sql: 'INSERT INTO income (user_id, date, liters, rate, total_amount) VALUES (?, ?, ?, 200, ?)',
    args: [userId, date, liters, total],
  });
  return { id: Number(result.lastInsertRowid), user_id: userId, date, liters, rate: 200, total_amount: total };
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

export async function updateIncome(id: number, liters: number): Promise<void> {
  await initDb();
  const db = getClient();
  await db.execute({
    sql: 'UPDATE income SET liters = ?, total_amount = ? WHERE id = ?',
    args: [liters, liters * 200, id],
  });
}

export async function deleteIncome(id: number): Promise<void> {
  await initDb();
  const db = getClient();
  await db.execute({ sql: 'DELETE FROM income WHERE id = ?', args: [id] });
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

export async function updateExpense(id: number, categoryId: number, amount: number, note?: string): Promise<void> {
  await initDb();
  const db = getClient();
  await db.execute({
    sql: 'UPDATE expenses SET category_id = ?, amount = ?, note = ? WHERE id = ?',
    args: [categoryId, amount, note ?? null, id],
  });
}

export async function deleteExpense(id: number): Promise<void> {
  await initDb();
  const db = getClient();
  await db.execute({ sql: 'DELETE FROM expenses WHERE id = ?', args: [id] });
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export async function getDashboardStats(userId: number): Promise<any> {
  await initDb();
  const db = getClient();
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const monthStart = todayStr.substring(0, 7) + '-01';
  const currentDay = today.getDate();

  const isPeriod1 = currentDay <= 15;
  const periodStart = isPeriod1
    ? todayStr.substring(0, 7) + '-01'
    : todayStr.substring(0, 7) + '-16';
  const periodEnd = isPeriod1
    ? todayStr.substring(0, 7) + '-15'
    : new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
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
  };
}

export async function getDailySummaries(userId: number, days = 30): Promise<any[]> {
  await initDb();
  const db = getClient();
  const result = await db.execute({
    sql: `SELECT date,
            COALESCE(SUM(total_amount),0) as income
          FROM income
          WHERE user_id = ?
          GROUP BY date
          ORDER BY date DESC
          LIMIT ?`,
    args: [userId, days],
  });

  const expResult = await db.execute({
    sql: `SELECT date,
            COALESCE(SUM(amount),0) as expenses
          FROM expenses
          WHERE user_id = ?
          GROUP BY date`,
    args: [userId],
  });

  const expMap = new Map(expResult.rows.map(r => [r.date as string, Number((r as any).expenses)]));

  return result.rows.map(r => {
    const income = Number((r as any).income);
    const expenses = expMap.get(r.date as string) ?? 0;
    return { date: r.date as string, income, expenses, profit: income - expenses };
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
            GROUP BY month`,
      args: [userId],
    }),
  ]);

  const expMap = new Map(expResult.rows.map(r => [r.month as string, Number((r as any).expenses)]));

  return incResult.rows.map(r => {
    const income = Number((r as any).income);
    const liters = Number((r as any).liters);
    const expenses = expMap.get(r.month as string) ?? 0;
    return { month: r.month as string, income, liters, expenses, profit: income - expenses };
  });
}

export async function getCategorySummaries(userId: number): Promise<any[]> {
  await initDb();
  const db = getClient();
  const result = await db.execute({
    sql: `SELECT c.name, COALESCE(SUM(e.amount),0) as total
          FROM expenses e
          JOIN categories c ON e.category_id = c.id
          WHERE e.user_id = ?
          GROUP BY c.name
          ORDER BY total DESC`,
    args: [userId],
  });
  return result.rows.map(r => ({ name: r.name as string, total: Number((r as any).total) }));
}

export async function getInsights(userId: number): Promise<any[]> {
  const insights: any[] = [];
  await initDb();
  const db = getClient();
  const today = new Date().toISOString().split('T')[0];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const monthStart = today.substring(0, 7) + '-01';

  const [mInc, mExp] = await Promise.all([
    db.execute({ sql: 'SELECT COALESCE(SUM(total_amount),0) as v FROM income WHERE user_id=? AND date>=?', args: [userId, monthStart] }),
    db.execute({ sql: 'SELECT COALESCE(SUM(amount),0) as v FROM expenses WHERE user_id=? AND date>=?', args: [userId, monthStart] }),
  ]);

  const monthIncome = Number((mInc.rows[0] as any).v);
  const monthExpenses = Number((mExp.rows[0] as any).v);
  const profit = monthIncome - monthExpenses;

  if (monthExpenses > monthIncome && monthIncome > 0) {
    insights.push({ type: 'danger', message: 'You are spending more than you earn this month' });
  } else if (profit < 0) {
    insights.push({ type: 'danger', message: 'You are operating at a loss this month' });
  }

  const fuelResult = await db.execute({
    sql: `SELECT COALESCE(SUM(e.amount),0) as v FROM expenses e
          JOIN categories c ON e.category_id = c.id
          WHERE e.user_id=? AND c.name='Fuel' AND e.date>=?`,
    args: [userId, weekAgo],
  });
  const fuelExpenses = Number((fuelResult.rows[0] as any).v);
  if (monthExpenses > 0 && fuelExpenses > 0.4 * monthExpenses) {
    insights.push({ type: 'warning', message: 'Fuel costs are unusually high this week' });
  }

  const topCat = await getCategorySummaries(userId);
  if (topCat.length > 0 && topCat[0].total > 0) {
    insights.push({ type: 'info', message: `Your most expensive category is ${topCat[0].name}` });
  }

  return insights;
}
