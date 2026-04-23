export interface User {
  id: number;
  phone_number: string;
  password_hash: string;
  created_at: string;
}

export interface Income {
  id: number;
  user_id: number;
  date: string;
  liters: number;
  rate: number;
  total_amount: number;
  created_at: string;
}

export interface Category {
  id: number;
  user_id: number | null;
  name: string;
  is_custom: boolean;
  created_at: string;
}

export interface Expense {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  note: string | null;
  date: string;
  created_at: string;
}

export interface ExpenseWithCategory extends Expense {
  category_name: string;
}

export interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  monthIncome: number;
  monthExpenses: number;
  monthProfit: number;
  periodIncome: number;
  periodExpenses: number;
  periodProfit: number;
  periodLabel: string;
  /** Inclusive YYYY-MM-DD bounds for the current bimonthly dashboard period */
  periodFrom: string;
  periodTo: string;
}

export interface MonthSummary {
  month: string;
  income: number;
  expenses: number;
  liters: number;
  profit: number;
}

export interface Insight {
  type: 'warning' | 'danger' | 'info';
  message: string;
}

export interface DailySummary {
  date: string;
  income: number;
  expenses: number;
  profit: number;
}

export interface CategorySummary {
  name: string;
  total: number;
}