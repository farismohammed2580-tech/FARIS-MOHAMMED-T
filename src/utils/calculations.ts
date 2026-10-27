import { InvoiceItem, PaymentRecord, Invoice, Expense, OrderStatus } from '../types';

/**
 * Format currency with UAE Dirham symbol/text
 */
export function formatAED(amount: number | null | undefined): string {
  const safeAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `AED ${safeAmount.toFixed(2)}`;
}

/**
 * Calculate single line subtotal
 */
export function calculateLineSubtotal(quantity: number, unitPrice: number): number {
  const safeQty = Math.max(0, Number(quantity) || 0);
  const safePrice = Math.max(0, Number(unitPrice) || 0);
  return Number((safeQty * safePrice).toFixed(2));
}

/**
 * Calculate invoice totals
 */
export function calculateInvoiceTotals(
  items: Array<{ quantity: number; unitPrice: number }>,
  discount: number = 0,
  amountPaid: number = 0
): {
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  remainingBalance: number;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
} {
  const subtotal = items.reduce((sum, item) => {
    return sum + calculateLineSubtotal(item.quantity, item.unitPrice);
  }, 0);

  const roundedSubtotal = Number(subtotal.toFixed(2));
  const safeDiscount = Math.min(roundedSubtotal, Math.max(0, Number(discount) || 0));
  const total = Number((roundedSubtotal - safeDiscount).toFixed(2));
  
  const safePaid = Math.max(0, Number(amountPaid) || 0);
  const remainingBalance = Number(Math.max(0, total - safePaid).toFixed(2));

  let paymentStatus: 'Paid' | 'Partial' | 'Unpaid' = 'Unpaid';
  if (total > 0) {
    if (safePaid >= total) {
      paymentStatus = 'Paid';
    } else if (safePaid > 0) {
      paymentStatus = 'Partial';
    } else {
      paymentStatus = 'Unpaid';
    }
  } else {
    paymentStatus = 'Paid';
  }

  return {
    subtotal: roundedSubtotal,
    discount: safeDiscount,
    total,
    amountPaid: safePaid,
    remainingBalance,
    paymentStatus,
  };
}

/**
 * Generate formatted unique invoice number
 */
export function formatInvoiceNumber(prefix: string, sequence: number): string {
  const cleanPrefix = (prefix || 'WWL-').trim();
  const padded = String(sequence).padStart(4, '0');
  return `${cleanPrefix}${padded}`;
}

/**
 * Format Dubai local date & time
 */
export function getDubaiCurrentDateTime(): { isoDate: string; displayDate: string; timeString: string } {
  const now = new Date();
  
  // Format YYYY-MM-DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');

  const isoDate = `${year}-${month}-${day}T${hours}:${minutes}`;
  const displayDate = `${day}/${month}/${year}`;
  const timeString = `${hours}:${minutes}`;

  return { isoDate, displayDate, timeString };
}

/**
 * Filter items by date period
 */
export function isDateInPeriod(
  dateString: string,
  period: 'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom',
  customStart?: string,
  customEnd?: string,
  referenceDate: Date = new Date()
): boolean {
  if (!dateString) return false;
  
  // Extract YYYY-MM-DD from iso or date string
  const targetDateOnly = dateString.slice(0, 10);
  const [tY, tM, tD] = targetDateOnly.split('-').map(Number);
  if (!tY || !tM || !tD) return false;
  
  const target = new Date(tY, tM - 1, tD);

  const refY = referenceDate.getFullYear();
  const refM = referenceDate.getMonth();
  const refD = referenceDate.getDate();
  const today = new Date(refY, refM, refD);

  switch (period) {
    case 'today':
      return target.getTime() === today.getTime();

    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      return target.getTime() === yesterday.getTime();
    }

    case 'week': {
      // Current week (starting Sunday or 7 days back)
      const weekStart = new Date(today);
      const dayOfWeek = weekStart.getDay(); // 0 is Sun
      weekStart.setDate(today.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      return target >= weekStart && target <= weekEnd;
    }

    case 'month':
      return target.getFullYear() === refY && target.getMonth() === refM;

    case 'year':
      return target.getFullYear() === refY;

    case 'custom': {
      if (!customStart) return true;
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      const end = customEnd ? new Date(customEnd) : new Date(customStart);
      end.setHours(23, 59, 59, 999);
      return target >= start && target <= end;
    }

    default:
      return true;
  }
}

/**
 * Calculate Dashboard summary statistics
 */
export function calculateDashboardMetrics(
  invoices: Invoice[],
  expenses: Expense[],
  referenceDate: Date = new Date()
) {
  const refY = referenceDate.getFullYear();
  const refM = referenceDate.getMonth();
  const refD = referenceDate.getDate();
  const todayStart = new Date(refY, refM, refD, 0, 0, 0, 0);
  const todayEnd = new Date(refY, refM, refD, 23, 59, 59, 999);

  let todaySales = 0;
  let todayPaymentsReceived = 0;
  let outstandingCustomerBalances = 0;
  let ordersReceivedToday = 0;
  let ordersInProgress = 0;
  let ordersReadyForPickup = 0;
  let ordersDeliveredToday = 0;
  let todayExpenses = 0;

  // Process invoices
  for (const inv of invoices) {
    const invDate = new Date(inv.invoiceDate);
    const isTodayInvoice = invDate >= todayStart && invDate <= todayEnd;

    if (isTodayInvoice) {
      todaySales += inv.total;
      ordersReceivedToday += 1;
    }

    // Outstanding balance across all active invoices
    outstandingCustomerBalances += inv.remainingBalance;

    // Check status
    if (inv.status === 'In Progress') {
      ordersInProgress += 1;
    } else if (inv.status === 'Ready for Pickup') {
      ordersReadyForPickup += 1;
    } else if (inv.status === 'Delivered') {
      // Check if delivered today
      const deliveredEntry = inv.statusHistory.find(h => h.status === 'Delivered');
      if (deliveredEntry) {
        const dDate = new Date(deliveredEntry.timestamp);
        if (dDate >= todayStart && dDate <= todayEnd) {
          ordersDeliveredToday += 1;
        }
      } else if (isTodayInvoice) {
        ordersDeliveredToday += 1;
      }
    }

    // Payments received today (from invoice payment history)
    for (const payment of inv.paymentHistory || []) {
      const pDate = new Date(payment.date);
      if (pDate >= todayStart && pDate <= todayEnd) {
        todayPaymentsReceived += payment.amount;
      }
    }
  }

  // Process expenses
  for (const exp of expenses) {
    const expDate = new Date(exp.date);
    if (expDate >= todayStart && expDate <= todayEnd) {
      todayExpenses += exp.amount;
    }
  }

  return {
    todaySales: Number(todaySales.toFixed(2)),
    todayPaymentsReceived: Number(todayPaymentsReceived.toFixed(2)),
    outstandingCustomerBalances: Number(outstandingCustomerBalances.toFixed(2)),
    ordersReceivedToday,
    ordersInProgress,
    ordersReadyForPickup,
    ordersDeliveredToday,
    todayExpenses: Number(todayExpenses.toFixed(2)),
  };
}

/**
 * Calculate financial profit estimate
 */
export function calculateProfitEstimate(
  totalSales: number,
  paymentsReceived: number,
  totalExpenses: number
): {
  cashBasisProfit: number; // Actual money in - money out
  accrualBasisProfit: number; // Total billed sales - money out
  notes: string;
} {
  const cashBasisProfit = Number((paymentsReceived - totalExpenses).toFixed(2));
  const accrualBasisProfit = Number((totalSales - totalExpenses).toFixed(2));

  return {
    cashBasisProfit,
    accrualBasisProfit,
    notes:
      'Cash basis profit represents actual collected payments minus recorded expenses. Accrual basis reflects total invoiced sales minus expenses.',
  };
}

/**
 * Generate formatted WhatsApp reminder link & message
 */
export function generateWhatsAppReminder(
  customerName: string,
  customerPhone: string,
  invoiceNumber: string,
  remainingBalance: number,
  businessName: string = 'WIN WHITE LAUNDRY',
  businessPhone: string = '+971 4 333 4455'
): { cleanPhone: string; message: string; url: string } {
  // Clean phone number (UAE mobile formatted)
  let cleanPhone = customerPhone.replace(/[^0-9]/g, '');
  if (cleanPhone.startsWith('05')) {
    cleanPhone = '971' + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith('971') && cleanPhone.length === 9) {
    cleanPhone = '971' + cleanPhone;
  }

  const message = `Hello ${customerName || 'Valued Customer'},\n\nThis is a polite reminder from *${businessName}* regarding your laundry invoice *${invoiceNumber}*.\n\nPending Balance: *AED ${remainingBalance.toFixed(
    2
  )}*.\n\nKindly arrange the payment at your earliest convenience upon delivery or pickup. If you have already settled this, please disregard this notice.\n\nFor inquiries, contact us at ${businessPhone}.\nThank you for choosing ${businessName}!`;

  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

  return { cleanPhone, message, url };
}
