import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  getCategorySummaries,
  getIncomeByUser,
  getDashboardStats,
  getMergedDailySummaries,
  getPeriodTotals,
} from '@/lib/db';
import { formatCurrency, resolveReportRange, getPeriodLabel } from '@/lib/utils';
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
  doc.setFillColor(...TEAL);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Milk Truck Manager', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Financial Report', 14, 19);

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
  const { rangeFrom, rangeTo } = resolveReportRange(type, from, to, stats);

  const periodTotals = await getPeriodTotals(user.id, rangeFrom, rangeTo);
  const mergedDaily = await getMergedDailySummaries(user.id, {
    from: rangeFrom,
    to: rangeTo,
    limit: type === 'bimonthly' && !from && !to ? 400 : 200,
  });
  const categorySummaries = await getCategorySummaries(user.id, rangeFrom, rangeTo);

  const allIncome = await getIncomeByUser(user.id, 1000);
  const incomeRecords = allIncome.filter(i => {
    if (rangeFrom && i.date < rangeFrom) return false;
    if (rangeTo && i.date > rangeTo) return false;
    return true;
  });

  const totalIncome = periodTotals.totalIncome;
  const totalExpenses = periodTotals.totalExpenses;
  const netProfit = totalIncome - totalExpenses;
  const totalLiters = periodTotals.totalLiters;

  const periodLabel = getPeriodLabel(type, rangeFrom, rangeTo, stats);

  const reportTitle =
    type === 'bimonthly' ? 'Bimonthly Report' :
    type === 'expense' ? 'Expense Breakdown' :
    'Period Report';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  drawHeader(doc, reportTitle, periodLabel);

  let y = 36;

  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text(`Period: ${periodLabel}`, 14, y);
  y += 8;

  y = drawSummaryBox(doc, y, totalIncome, totalExpenses, netProfit, totalLiters);

  if (type === 'bimonthly') {
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

  y = drawSectionTitle(doc, y, type === 'bimonthly' ? 'Activity by date (period)' : 'Activity by date');

  const dailyTableData = mergedDaily.slice(0, 60).map(d => [
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

  if (y > 230) {
    doc.addPage();
    drawHeader(doc, reportTitle, periodLabel);
    y = 36;
  }

  y = drawSectionTitle(doc, y, 'Expense Breakdown by Category');

  const expenseDenominator = totalExpenses > 0 ? totalExpenses : categorySummaries.reduce((s, c) => s + c.total, 0);
  const catData = categorySummaries.map(c => [
    c.name,
    formatCurrency(c.total),
    expenseDenominator > 0 ? `${((c.total / expenseDenominator) * 100).toFixed(1)}%` : '0%',
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

  y = (doc as any).lastAutoTable.finalY + 8;
  if (y > 230) {
    doc.addPage();
    drawHeader(doc, reportTitle, periodLabel);
    y = 36;
  }

  y = drawSectionTitle(doc, y, 'Income Details');

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
