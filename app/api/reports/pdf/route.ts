import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getDailySummaries, getCategorySummaries, getIncomeByUser, getExpensesByUser, getDashboardStats } from '@/lib/db';
import { formatCurrency } from '@/lib/utils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const TEAL: [number, number, number] = [14, 165, 164];
const TEAL_LIGHT: [number, number, number] = [224, 247, 247];
const GREEN: [number, number, number] = [34, 197, 94];
const RED: [number, number, number] = [239, 68, 68];
const DARK: [number, number, number] = [15, 23, 42];
const GRAY: [number, number, number] = [100, 116, 139];
const BORDER: [number, number, number] = [226, 232, 240];

function drawHeader(doc: jsPDF, title: string, subtitle: string) {
  // Teal header band
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Milk Truck Manager', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Financial Report', 14, 19);

  // Title on right side
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 196, 12, { align: 'right' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, 196, 19, { align: 'right' });

  doc.setTextColor(...DARK);
}

function drawSummaryBox(
  doc: jsPDF,
  y: number,
  income: number,
  expenses: number,
  profit: number,
  liters?: number
): number {
  const boxY = y;
  doc.setFillColor(...TEAL_LIGHT);
  doc.roundedRect(14, boxY, 182, liters !== undefined ? 28 : 22, 3, 3, 'F');
  doc.setDrawColor(...TEAL);
  doc.setLineWidth(0.5);
  doc.roundedRect(14, boxY, 182, liters !== undefined ? 28 : 22, 3, 3, 'S');

  const cols = liters !== undefined ? 4 : 3;
  const colW = 182 / cols;

  const items = [
    { label: 'Total Income', value: formatCurrency(income), color: GREEN },
    { label: 'Total Expenses', value: formatCurrency(expenses), color: RED },
    { label: 'Net Profit', value: formatCurrency(profit), color: profit >= 0 ? GREEN : RED },
  ];
  if (liters !== undefined) {
    items.push({ label: 'Liters Delivered', value: `${liters.toFixed(0)} L`, color: TEAL });
  }

  items.forEach((item, i) => {
    const x = 14 + i * colW + colW / 2;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(item.label, x, boxY + 9, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...item.color);
    doc.text(item.value, x, boxY + 17, { align: 'center' });
  });

  doc.setTextColor(...DARK);
  return boxY + (liters !== undefined ? 28 : 22) + 6;
}

function drawSectionTitle(doc: jsPDF, y: number, text: string): number {
  doc.setFillColor(...BORDER);
  doc.rect(14, y, 182, 0.5, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(text, 14, y + 7);
  return y + 12;
}

function drawFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageH = doc.internal.pageSize.height;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(14, pageH - 12, 196, pageH - 12);
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, pageH - 7);
  doc.text(`Page ${pageNum} of ${totalPages}`, 196, pageH - 7, { align: 'right' });
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'daily';
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;

  const stats = await getDashboardStats(user.id);

  const allDailySummaries = await getDailySummaries(user.id, 365);
  const dailySummaries = allDailySummaries.filter(d => {
    if (from && d.date < from) return false;
    if (to && d.date > to) return false;
    return true;
  });

  const categorySummaries = await getCategorySummaries(user.id);

  const allIncome = await getIncomeByUser(user.id, 1000);
  const incomeRecords = allIncome.filter(i => {
    if (from && i.date < from) return false;
    if (to && i.date > to) return false;
    return true;
  });

  const allExpenses = await getExpensesByUser(user.id, 1000);
  const expenseRecords = allExpenses.filter(e => {
    if (from && e.date < from) return false;
    if (to && e.date > to) return false;
    return true;
  });

  const totalIncome = dailySummaries.reduce((s, d) => s + d.income, 0);
  const totalExpenses = dailySummaries.reduce((s, d) => s + d.expenses, 0);
  const netProfit = totalIncome - totalExpenses;
  const totalLiters = incomeRecords.reduce((s, i) => s + i.liters, 0);

  function ordinal(d: number) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = d % 100;
    return d + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  function fmtDate(iso: string) {
    const dt = new Date(iso + 'T00:00:00');
    return `${ordinal(dt.getDate())} ${dt.toLocaleDateString('en-US', { month: 'long' })} ${dt.getFullYear()}`;
  }

  let periodLabel: string;
  if (type === 'bimonthly' && !from && !to) {
    periodLabel = stats.periodLabel;
  } else {
    const today = new Date();
    const effectiveFrom = from
      ? fmtDate(from)
      : dailySummaries.length > 0
      ? fmtDate([...dailySummaries].sort((a, b) => a.date.localeCompare(b.date))[0].date)
      : fmtDate(today.toISOString().split('T')[0]);
    const effectiveTo = to
      ? fmtDate(to)
      : fmtDate(today.toISOString().split('T')[0]);
    periodLabel = `${effectiveFrom} to ${effectiveTo}`;
  }

  const reportTitle =
    type === 'bimonthly' ? 'Bimonthly Report' :
    type === 'expense' ? 'Expense Breakdown' :
    'Monthly Report';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  drawHeader(doc, reportTitle, periodLabel);

  let y = 36;

  // Meta line
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(`Period: ${periodLabel}`, 14, y);
  y += 8;

  // Summary box
  y = drawSummaryBox(doc, y, totalIncome, totalExpenses, netProfit, totalLiters);

  if (type === 'bimonthly') {
    // Bimonthly breakdown section
    y = drawSectionTitle(doc, y, 'Current Bimonthly Period Breakdown');

    (doc as any).autoTable({
      startY: y,
      head: [['Period', 'Income', 'Expenses', 'Net Profit']],
      body: [
        [
          stats.periodLabel,
          formatCurrency(stats.periodIncome),
          formatCurrency(stats.periodExpenses),
          formatCurrency(stats.periodProfit),
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      bodyStyles: { fontSize: 9, textColor: DARK },
      columnStyles: {
        0: { cellWidth: 60 },
        3: { textColor: stats.periodProfit >= 0 ? GREEN : RED, fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Daily breakdown table
  y = drawSectionTitle(doc, y, type === 'bimonthly' ? 'Daily Breakdown for Period' : 'Daily Breakdown');

  const dailyTableData = dailySummaries.slice(0, 60).map(d => [
    d.date,
    formatCurrency(d.income),
    formatCurrency(d.expenses),
    formatCurrency(d.profit),
  ]);

  (doc as any).autoTable({
    startY: y,
    head: [['Date', 'Income', 'Expenses', 'Profit / Loss']],
    body: dailyTableData.length > 0 ? dailyTableData : [['No records in this range', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      1: { textColor: GREEN },
      2: { textColor: RED },
    },
    didParseCell: (data: any) => {
      if (data.section === 'body' && data.column.index === 3) {
        const val = parseFloat(data.cell.raw?.replace(/[^0-9.-]/g, '') || '0');
        data.cell.styles.textColor = val >= 0 ? GREEN : RED;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Expense breakdown section — always included
  if (y > 230) {
    doc.addPage();
    drawHeader(doc, reportTitle, periodLabel);
    y = 36;
  }

  y = drawSectionTitle(doc, y, 'Expense Breakdown by Category');

  const filteredTotalExpenses = expenseRecords.reduce((s, e) => s + e.amount, 0);
  const catData = categorySummaries.map(c => [
    c.name,
    formatCurrency(c.total),
    filteredTotalExpenses > 0 ? `${((c.total / filteredTotalExpenses) * 100).toFixed(1)}%` : '0%',
  ]);

  (doc as any).autoTable({
    startY: y,
    head: [['Category', 'Amount', '% of Total']],
    body: catData.length > 0 ? catData : [['No expenses recorded', '', '']],
    theme: 'striped',
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      1: { textColor: RED, fontStyle: 'bold' },
      2: { textColor: GRAY },
    },
    margin: { left: 14, right: 14 },
  });

  // Income details section
  y = (doc as any).lastAutoTable.finalY + 8;
  if (y > 230) {
    doc.addPage();
    drawHeader(doc, reportTitle, periodLabel);
    y = 36;
  }

  y = drawSectionTitle(doc, y, 'Income Details (Liters × 200 UGX)');

  const incomeTableData = incomeRecords.slice(0, 60).map(i => [
    i.date,
    `${i.liters} L`,
    `${i.rate} UGX/L`,
    formatCurrency(i.total_amount),
  ]);

  (doc as any).autoTable({
    startY: y,
    head: [['Date', 'Liters', 'Rate', 'Amount']],
    body: incomeTableData.length > 0 ? incomeTableData : [['No income records', '', '', '']],
    theme: 'striped',
    headStyles: { fillColor: TEAL, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 8, textColor: DARK },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      3: { textColor: GREEN, fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  });

  // Footers on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(doc, p, totalPages);
  }

  const pdfOutput = doc.output('arraybuffer');

  return new NextResponse(pdfOutput, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="milk_truck_report_${new Date().toISOString().split('T')[0]}.pdf"`,
    },
  });
}
