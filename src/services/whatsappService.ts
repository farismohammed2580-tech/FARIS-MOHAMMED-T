import { MonthlyStatement, MonthlyCustomerAccount, BusinessSettings } from '../types';
import { formatAED } from '../utils/calculations';
import { formatDubaiDateDisplay } from '../utils/billingCycle';

export interface WhatsAppStatusResponse {
  configured: boolean;
  provider: string;
  phoneNumberId: string | null;
  businessAccountId: string | null;
  statusText: string;
  missingKeys: string[];
}

export interface WhatsAppSendResult {
  success: boolean;
  status: 'Sent' | 'Failed' | 'Not Configured';
  messageId?: string;
  error?: string;
  providerResponse?: string;
}

/**
 * Fetch WhatsApp Business Cloud API server configuration status
 */
export async function checkWhatsAppApiStatus(): Promise<WhatsAppStatusResponse> {
  try {
    const res = await fetch('/api/whatsapp/status');
    if (!res.ok) {
      return {
        configured: false,
        provider: 'Meta WhatsApp Business Cloud API',
        phoneNumberId: null,
        businessAccountId: null,
        statusText: 'Server Error',
        missingKeys: ['API_UNAVAILABLE'],
      };
    }
    return await res.json();
  } catch (err: any) {
    return {
      configured: false,
      provider: 'Meta WhatsApp Business Cloud API',
      phoneNumberId: null,
      businessAccountId: null,
      statusText: 'Offline / Not Connected',
      missingKeys: ['SERVER_OFFLINE'],
    };
  }
}

/**
 * Format a clear, professional English statement summary message suitable for WhatsApp
 */
export function formatStatementWhatsAppMessage(
  statement: MonthlyStatement,
  settings: BusinessSettings
): string {
  const bizName = settings.businessName || 'WIN WHITE LAUNDRY';
  const phone = settings.phone || '02 440 3012';
  const mobile = settings.mobile || '056 657 5169';
  const address = settings.address || 'Zayed Street, Tourist Club, Behind Subaru Showroom, Abu Dhabi, U.A.E.';

  const invoiceLines = statement.invoices
    .slice(0, 15)
    .map(
      (inv) =>
        `• ${inv.invoiceNumber} (${formatDubaiDateDisplay(inv.invoiceDate)}): ${formatAED(inv.total)} [${inv.paymentStatus}]`
    )
    .join('\n');

  const moreInvoices =
    statement.invoices.length > 15
      ? `\n...and ${statement.invoices.length - 15} more orders in this billing period.`
      : '';

  return (
    `*${bizName.toUpperCase()} – MONTHLY ACCOUNT STATEMENT*\n` +
    `================================\n` +
    `Customer: *${statement.customerName}*\n` +
    `Account Code: *${statement.customerCode}*\n` +
    `Statement No: *${statement.statementNumber}*\n` +
    `Billing Cycle: *${statement.periodLabel}*\n` +
    `Date Issued: *${formatDubaiDateDisplay(statement.generationDate)}*\n` +
    `================================\n\n` +
    `*INVOICE BREAKDOWN (${statement.invoices.length} Orders)*\n` +
    `${invoiceLines}${moreInvoices}\n\n` +
    `*FINANCIAL SUMMARY*\n` +
    `--------------------------------\n` +
    `Total Billed (This Cycle): *${formatAED(statement.totalBilled)}*\n` +
    `Payments Received: *${formatAED(statement.paymentsReceivedInCycle)}*\n` +
    `Cycle Balance: *${formatAED(statement.currentCycleOutstanding)}*\n` +
    `Prior Outstanding Balance: *${formatAED(statement.previousOutstandingBalance)}*\n` +
    `--------------------------------\n` +
    `*TOTAL CURRENT AMOUNT DUE: ${formatAED(statement.totalAmountDue)}*\n\n` +
    `Payment Methods: Cash, Card, or Bank Transfer.\n\n` +
    `If you have already settled this balance, kindly disregard this notice.\n` +
    `For any questions or pickups:\n` +
    `Tel: ${phone} | Mobile/WhatsApp: ${mobile}\n` +
    `${address}\n` +
    `Thank you for your valued patronage!`
  );
}

/**
 * Send official monthly statement via backend WhatsApp Cloud API endpoint
 */
export async function sendStatementViaWhatsApp(
  statement: MonthlyStatement,
  settings: BusinessSettings,
  customerAccount?: MonthlyCustomerAccount,
  customMessage?: string
): Promise<WhatsAppSendResult> {
  const recipientPhone = customerAccount?.whatsappNumber || statement.whatsappNumber || statement.customerPhone;
  const formattedText = customMessage || formatStatementWhatsAppMessage(statement, settings);

  try {
    const res = await fetch('/api/whatsapp/send-statement', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipientPhone,
        customerName: statement.customerName,
        customerCode: statement.customerCode,
        statementNumber: statement.statementNumber,
        periodLabel: statement.periodLabel,
        totalBilled: statement.totalBilled,
        paymentsReceived: statement.paymentsReceivedInCycle,
        previousOutstanding: statement.previousOutstandingBalance,
        totalAmountDue: statement.totalAmountDue,
        statementText: formattedText,
      }),
    });

    if (!res.ok) {
      return {
        success: false,
        status: 'Failed',
        error: `Server HTTP error ${res.status}: ${res.statusText}`,
      };
    }

    const data = await res.json();
    return {
      success: data.success === true,
      status: data.status || (data.success ? 'Sent' : 'Failed'),
      messageId: data.messageId,
      error: data.error,
      providerResponse: data.providerResponse,
    };
  } catch (err: any) {
    return {
      success: false,
      status: 'Failed',
      error: err.message || 'Network failure communicating with backend service.',
    };
  }
}
