import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLineSubtotal,
  calculateInvoiceTotals,
  formatInvoiceNumber,
  formatAED,
  calculateProfitEstimate,
  isDateInPeriod,
} from './calculations';

test('calculateLineSubtotal correctly calculates quantity times unit price', () => {
  assert.equal(calculateLineSubtotal(3, 7.5), 22.5);
  assert.equal(calculateLineSubtotal(0, 10), 0);
  assert.equal(calculateLineSubtotal(5, 0), 0);
  assert.equal(calculateLineSubtotal(-2, 10), 0);
});

test('calculateInvoiceTotals calculates subtotals, discounts, and remaining balance', () => {
  const items = [
    { quantity: 2, unitPrice: 15 }, // 30
    { quantity: 1, unitPrice: 25 }, // 25
  ]; // subtotal = 55

  // Full payment, no discount
  const result1 = calculateInvoiceTotals(items, 0, 55);
  assert.equal(result1.subtotal, 55);
  assert.equal(result1.discount, 0);
  assert.equal(result1.total, 55);
  assert.equal(result1.amountPaid, 55);
  assert.equal(result1.remainingBalance, 0);
  assert.equal(result1.paymentStatus, 'Paid');

  // Partial payment with discount
  const result2 = calculateInvoiceTotals(items, 5, 20);
  assert.equal(result2.subtotal, 55);
  assert.equal(result2.discount, 5);
  assert.equal(result2.total, 50);
  assert.equal(result2.amountPaid, 20);
  assert.equal(result2.remainingBalance, 30);
  assert.equal(result2.paymentStatus, 'Partial');

  // Zero payment
  const result3 = calculateInvoiceTotals(items, 0, 0);
  assert.equal(result3.remainingBalance, 55);
  assert.equal(result3.paymentStatus, 'Unpaid');
});

test('formatInvoiceNumber formats with leading zeroes and prefix', () => {
  assert.equal(formatInvoiceNumber('WWL-', 1), 'WWL-0001');
  assert.equal(formatInvoiceNumber('WWL-', 42), 'WWL-0042');
  assert.equal(formatInvoiceNumber('WWL-2026-', 105), 'WWL-2026-0105');
});

test('formatAED formats AED currency correctly', () => {
  assert.equal(formatAED(12.5), 'AED 12.50');
  assert.equal(formatAED(0), 'AED 0.00');
  assert.equal(formatAED(null as any), 'AED 0.00');
});

test('calculateProfitEstimate calculates cash and accrual profits', () => {
  const res = calculateProfitEstimate(1000, 750, 400);
  assert.equal(res.accrualBasisProfit, 600); // 1000 - 400
  assert.equal(res.cashBasisProfit, 350); // 750 - 400
});

test('isDateInPeriod accurately matches dates for today and custom range', () => {
  const refDate = new Date(2026, 9, 25); // 2026-10-25
  assert.equal(isDateInPeriod('2026-10-25T10:00', 'today', undefined, undefined, refDate), true);
  assert.equal(isDateInPeriod('2026-10-24T10:00', 'today', undefined, undefined, refDate), false);
  assert.equal(isDateInPeriod('2026-10-24T10:00', 'yesterday', undefined, undefined, refDate), true);
  assert.equal(isDateInPeriod('2026-10-20', 'custom', '2026-10-15', '2026-10-25', refDate), true);
});
