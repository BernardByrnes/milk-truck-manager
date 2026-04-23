export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateInput(date: string): string {
  return date;
}

export function getTodayDate(): string {
  return toLocalDateString(new Date());
}

export function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentBimonthlyRange(): { from: string; to: string; label: string } {
  const today = new Date();
  const todayStr = toLocalDateString(today);
  const currentDay = today.getDate();
  const isPeriod1 = currentDay <= 15;
  const from = isPeriod1
    ? todayStr.substring(0, 7) + '-01'
    : todayStr.substring(0, 7) + '-16';
  const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const to = isPeriod1
    ? todayStr.substring(0, 7) + '-15'
    : todayStr.substring(0, 7) + '-' + String(lastDayOfMonth).padStart(2, '0');
  const label = isPeriod1
    ? `1st-15th (${today.toLocaleString('default', { month: 'short' })})`
    : `16th-End (${today.toLocaleString('default', { month: 'short' })})`;
  return { from, to, label };
}

export function getMonthRange(date: Date): { from: string; to: string } {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return {
    from: `${y}-${m}-01`,
    to: `${y}-${m}-${String(lastDay).padStart(2, '0')}`,
  };
}

export function resolveReportRange(
  type: string,
  from: string | undefined,
  to: string | undefined,
  stats: { periodFrom: string; periodTo: string }
): { rangeFrom?: string; rangeTo?: string } {
  if (type === 'bimonthly' && !from && !to) {
    return { rangeFrom: stats.periodFrom, rangeTo: stats.periodTo };
  }
  return { rangeFrom: from, rangeTo: to };
}

function ordinal(d: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = d % 100;
  return d + (s[(v - 20) % 10] || s[v] || s[0]);
}

function fmtDate(iso: string): string {
  const dt = new Date(iso + 'T00:00:00');
  return `${ordinal(dt.getDate())} ${dt.toLocaleDateString('en-US', { month: 'long' })} ${dt.getFullYear()}`;
}

export function getPeriodLabel(
  type: string,
  from: string | undefined,
  to: string | undefined,
  stats: { periodLabel: string }
): string {
  if (type === 'bimonthly' && !from && !to) {
    return stats.periodLabel;
  }
  if (from || to) {
    const todayStr = toLocalDateString(new Date());
    const startLabel = from ? fmtDate(from) : 'Start';
    const endLabel = to ? fmtDate(to) : fmtDate(todayStr);
    return `${startLabel} to ${endLabel}`;
  }
  return 'All time';
}
