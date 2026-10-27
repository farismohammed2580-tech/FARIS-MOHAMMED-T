import { Customer, Invoice, Expense, PaymentRecord } from '../types';
import { formatAED } from './calculations';

function downloadCSV(csvContent: string, fileName: string) {
  // UTF-8 BOM so Excel opens with proper characters
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function escapeCSV(text: any): string {
  if (text === null || text === undefined) return '""';
  const str = String(text).replace(/"/g, '""');
  return `"${str}"`;
}

export function exportCustomersCSV(customers: Customer[]) {
  const headers = [
    'Customer ID',
    'Customer Name',
    'Phone Number',
    'Total Invoices',
    'Total Spending (AED)',
    'Outstanding Balance (AED)',
    'Last Visit Date',
    'Created At',
  ];

  const rows = customers.map((c) => [
    escapeCSV(c.id),
    escapeCSV(c.name),
    escapeCSV(c.phone),
    escapeCSV(c.totalInvoices),
    escapeCSV(c.totalSpending.toFixed(2)),
    escapeCSV(c.outstandingBalance.toFixed(2)),
    escapeCSV(c.lastVisitDate || '-'),
    escapeCSV(c.createdAt),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCSV(csv, `WinWhiteLaundry_Customers_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportInvoicesCSV(invoices: Invoice[]) {
  const headers = [
    'Invoice Number',
    'Date & Time',
    'Customer Name',
    'Customer Phone',
    'Items Summary',
    'Total Pieces',
    'Subtotal (AED)',
    'Discount (AED)',
    'Grand Total (AED)',
    'Amount Paid (AED)',
    'Remaining Balance (AED)',
    'Payment Method',
    'Payment Status',
    'Order Status',
    'Expected Delivery',
  ];

  const rows = invoices.map((inv) => {
    const itemsSummary = inv.items
      .map((item) => `${item.dressTypeName} (${item.service}) x${item.quantity}`)
      .join('; ');
    const totalPieces = inv.items.reduce((sum, item) => sum + item.quantity, 0);

    return [
      escapeCSV(inv.invoiceNumber),
      escapeCSV(inv.invoiceDate),
      escapeCSV(inv.customerName),
      escapeCSV(inv.customerPhone),
      escapeCSV(itemsSummary),
      escapeCSV(totalPieces),
      escapeCSV(inv.subtotal.toFixed(2)),
      escapeCSV(inv.discount.toFixed(2)),
      escapeCSV(inv.total.toFixed(2)),
      escapeCSV(inv.amountPaid.toFixed(2)),
      escapeCSV(inv.remainingBalance.toFixed(2)),
      escapeCSV(inv.paymentMethod),
      escapeCSV(inv.paymentStatus),
      escapeCSV(inv.status),
      escapeCSV(inv.expectedDeliveryDate),
    ];
  });

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCSV(csv, `WinWhiteLaundry_Invoices_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportInvoiceItemsCSV(invoices: Invoice[]) {
  const headers = [
    'Invoice Number',
    'Date',
    'Customer',
    'Dress Type',
    'Service',
    'Quantity',
    'Unit Price (AED)',
    'Subtotal (AED)',
  ];

  const rows: string[][] = [];
  invoices.forEach((inv) => {
    inv.items.forEach((item) => {
      rows.push([
        escapeCSV(inv.invoiceNumber),
        escapeCSV(inv.invoiceDate.slice(0, 10)),
        escapeCSV(inv.customerName),
        escapeCSV(item.dressTypeName),
        escapeCSV(item.service),
        escapeCSV(item.quantity),
        escapeCSV(item.unitPrice.toFixed(2)),
        escapeCSV(item.subtotal.toFixed(2)),
      ]);
    });
  });

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCSV(csv, `WinWhiteLaundry_ItemizedDetails_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportExpensesCSV(expenses: Expense[]) {
  const headers = [
    'Date',
    'Category',
    'Description',
    'Amount (AED)',
    'Payment Method',
    'Recorded By',
  ];

  const rows = expenses.map((e) => [
    escapeCSV(e.date),
    escapeCSV(e.category),
    escapeCSV(e.description),
    escapeCSV(e.amount.toFixed(2)),
    escapeCSV(e.paymentMethod),
    escapeCSV(e.recordedBy),
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadCSV(csv, `WinWhiteLaundry_Expenses_${new Date().toISOString().slice(0, 10)}.csv`);
}

export function exportSalesSummaryCSV(
  periodLabel: string,
  summary: {
    totalSales: number;
    paymentsReceived: number;
    outstandingBalances: number;
    invoicesCount: number;
    serviceBreakdown: Record<string, { count: number; totalAED: number }>;
  }
) {
  const lines: string[] = [
    `"WIN WHITE LAUNDRY - SALES REPORT"`,
    `"Period: ${periodLabel}"`,
    `"Generated: ${new Date().toLocaleString()}"`,
    '',
    `"Metric","Value"`,
    `"Total Invoiced Sales","${formatAED(summary.totalSales)}"`,
    `"Total Payments Collected","${formatAED(summary.paymentsReceived)}"`,
    `"Outstanding Receivables","${formatAED(summary.outstandingBalances)}"`,
    `"Total Invoices Issued","${summary.invoicesCount}"`,
    '',
    `"SERVICE WISE BREAKDOWN"`,
    `"Service Name","Pieces Handled","Sales Total (AED)"`,
  ];

  Object.entries(summary.serviceBreakdown).forEach(([service, data]) => {
    lines.push(
      `${escapeCSV(service)},${escapeCSV(data.count)},${escapeCSV(data.totalAED.toFixed(2))}`
    );
  });

  const csv = lines.join('\n');
  downloadCSV(csv, `WinWhiteLaundry_SalesSummary_${new Date().toISOString().slice(0, 10)}.csv`);
}
