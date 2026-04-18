export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateInput(date: string): string {
  return date;
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}