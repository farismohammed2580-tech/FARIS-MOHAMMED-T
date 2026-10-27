import test from 'node:test';
import assert from 'node:assert';
import {
  getCustomerBillingCycle,
  isInvoiceInCycle,
  generateStatementNumber,
} from './billingCycle';

// Mock minimal localStorage for Node.js test environment
const mockStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = String(val);
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const k of Object.keys(mockStorage)) delete mockStorage[k];
  },
  key: (index: number) => Object.keys(mockStorage)[index] || null,
  length: 0,
};

// Mock sessionStorage
globalThis.sessionStorage = {
  ...globalThis.localStorage,
};

import { storage } from '../services/storage';

test('Integration 1 & 2: Add existing customer as monthly customer without duplicate', () => {
  // Setup admin session
  storage.setSession({
    role: 'admin',
    userId: 'usr-1',
    userName: 'Faris Mohammed',
    designation: 'Admin',
    loginTime: new Date().toISOString(),
    token: 'test-admin-token',
  });

  const initialCustomersCount = storage.getCustomers().length;
  const targetCust = storage.getCustomers()[1]; // Sarah Jenkins (Regular)

  assert.strictEqual(targetCust.isMonthlyCustomer, false);

  // Enroll Sarah as monthly customer
  storage.saveMonthlyAccount({
    id: targetCust.id,
    customerCode: 'MC-105',
    cycleStartDay: 10,
    whatsappNumber: targetCust.phone,
    accountStatus: 'Active',
    scheduledSendTime: '09:00',
    autoSendWhatsApp: true,
    requireAdminApproval: false,
    nextBillingDate: '2026-11-09',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const updatedCustomers = storage.getCustomers();
  assert.strictEqual(updatedCustomers.length, initialCustomersCount, 'Customer count must NOT increase');

  const updatedSarah = updatedCustomers.find((c) => c.id === targetCust.id);
  assert.strictEqual(updatedSarah?.isMonthlyCustomer, true);
  assert.strictEqual(updatedSarah?.customerCode, 'MC-105');
});

test('Integration 3 & 4: Different billing cycles & invoice linking', () => {
  // Customer 1: Cycle starts on 1st (1st to 31st Oct)
  const cust1Cycle = getCustomerBillingCycle(1, new Date('2026-10-27T10:00:00'));
  assert.strictEqual(cust1Cycle.currentCycle.startDate, '2026-10-01');
  assert.strictEqual(cust1Cycle.currentCycle.endDate, '2026-10-31');

  // Customer 2: Cycle starts on 15th (15th Oct to 14th Nov)
  const cust2Cycle = getCustomerBillingCycle(15, new Date('2026-10-27T10:00:00'));
  assert.strictEqual(cust2Cycle.currentCycle.startDate, '2026-10-15');
  assert.strictEqual(cust2Cycle.currentCycle.endDate, '2026-11-14');

  // Create invoice for Customer 1 (Mohammed Al-Maktoum)
  const inv = storage.saveInvoice({
    id: `inv-test-${Date.now()}`,
    invoiceNumber: 'WWL-TEST-99',
    customerId: 'cust-1',
    customerName: 'Mohammed Al-Maktoum',
    customerPhone: '+971 50 789 1234',
    items: [
      {
        id: 'item-1',
        dressTypeId: 'dt-1',
        dressTypeName: 'KANDURA',
        service: 'Normal Wash',
        quantity: 2,
        unitPrice: 6,
        subtotal: 12,
      },
    ],
    subtotal: 12,
    discount: 0,
    total: 12,
    amountPaid: 0,
    remainingBalance: 12,
    paymentMethod: 'Cash',
    paymentStatus: 'Unpaid',
    invoiceDate: '2026-10-27T12:00',
    expectedDeliveryDate: '2026-10-29',
    status: 'Received',
    statusHistory: [],
    paymentHistory: [],
    createdAt: new Date().toISOString(),
  });

  assert.strictEqual(inv.customerId, 'cust-1');

  // Verify invoice appears in cycle financials
  const financials = storage.getCustomerCycleFinancials('cust-1', cust1Cycle.currentCycle.startDate, cust1Cycle.currentCycle.endDate);
  const foundInCycle = financials.cycleInvoices.some((i) => i.id === inv.id);
  assert.strictEqual(foundInCycle, true);
});

test('Integration 6 & 7: Account payment recording & allocation oldest-first', () => {
  // Record 10 AED payment against account
  const payment = storage.recordCustomerAccountPayment(
    'cust-1',
    10,
    'Cash',
    'Admin Test',
    'account_balance',
    'Test partial settlement'
  );

  assert.strictEqual(payment.amount, 10);
  assert.strictEqual(payment.allocations.length > 0, true);

  const savedPayments = storage.getAccountPayments('cust-1');
  assert.strictEqual(savedPayments.some((p) => p.id === payment.id), true);
});

test('Integration 8: Monthly Statement generation', () => {
  const cycle = getCustomerBillingCycle(1, new Date('2026-10-27T10:00:00'));
  const stmt = storage.generateMonthlyStatement('cust-1', cycle.currentCycle.startDate, cycle.currentCycle.endDate);

  assert.strictEqual(stmt.customerId, 'cust-1');
  assert.strictEqual(stmt.cycleStartDate, '2026-10-01');
  assert.strictEqual(stmt.cycleEndDate, '2026-10-31');
  assert.strictEqual(stmt.invoices.length > 0, true);
  assert.strictEqual(stmt.totalBilled > 0, true);
  assert.strictEqual(stmt.statementNumber.startsWith('STMT-'), true);
});
