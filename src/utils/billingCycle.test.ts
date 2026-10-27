import test from 'node:test';
import assert from 'node:assert';
import {
  getCustomerBillingCycle,
  isInvoiceInCycle,
  generateStatementNumber,
  formatDubaiDateDisplay,
  getDaysInMonth,
} from './billingCycle';

test('Billing Cycle: 1st of month (Customer A: 1st to 30th/31st)', () => {
  // Reference date: 27 October 2026
  const ref = new Date('2026-10-27T10:00:00+04:00');
  const cycle = getCustomerBillingCycle(1, ref);

  assert.strictEqual(cycle.currentCycle.startDate, '2026-10-01');
  assert.strictEqual(cycle.currentCycle.endDate, '2026-10-31');
  assert.strictEqual(cycle.previousCycle.startDate, '2026-09-01');
  assert.strictEqual(cycle.previousCycle.endDate, '2026-09-30');
  assert.strictEqual(cycle.nextBillingDate, '2026-10-31');
});

test('Billing Cycle: 15th of month (Customer B: 15th to 14th of following month)', () => {
  // Reference date: 27 October 2026 (day >= 15)
  const ref = new Date('2026-10-27T10:00:00+04:00');
  const cycle = getCustomerBillingCycle(15, ref);

  assert.strictEqual(cycle.currentCycle.startDate, '2026-10-15');
  assert.strictEqual(cycle.currentCycle.endDate, '2026-11-14');
  assert.strictEqual(cycle.previousCycle.startDate, '2026-09-15');
  assert.strictEqual(cycle.previousCycle.endDate, '2026-10-14');
  assert.strictEqual(cycle.nextBillingDate, '2026-11-14');
});

test('Billing Cycle: 15th of month when reference is early in month (e.g. 5 October)', () => {
  // Reference date: 5 October 2026 (day < 15)
  const ref = new Date('2026-10-05T10:00:00+04:00');
  const cycle = getCustomerBillingCycle(15, ref);

  assert.strictEqual(cycle.currentCycle.startDate, '2026-09-15');
  assert.strictEqual(cycle.currentCycle.endDate, '2026-10-14');
  assert.strictEqual(cycle.previousCycle.startDate, '2026-08-15');
  assert.strictEqual(cycle.previousCycle.endDate, '2026-09-14');
});

test('Billing Cycle: Year-end transition (e.g. 25 December to 24 January)', () => {
  const ref = new Date('2026-12-28T10:00:00+04:00');
  const cycle = getCustomerBillingCycle(25, ref);

  assert.strictEqual(cycle.currentCycle.startDate, '2026-12-25');
  assert.strictEqual(cycle.currentCycle.endDate, '2027-01-24');
  assert.strictEqual(cycle.previousCycle.startDate, '2026-11-25');
  assert.strictEqual(cycle.previousCycle.endDate, '2026-12-24');
});

test('isInvoiceInCycle matches dates accurately within boundaries', () => {
  const start = '2026-10-15';
  const end = '2026-11-14';

  assert.strictEqual(isInvoiceInCycle('2026-10-15T09:30', start, end), true);
  assert.strictEqual(isInvoiceInCycle('2026-10-27T14:00', start, end), true);
  assert.strictEqual(isInvoiceInCycle('2026-11-14T23:59', start, end), true);
  assert.strictEqual(isInvoiceInCycle('2026-10-14T23:59', start, end), false);
  assert.strictEqual(isInvoiceInCycle('2026-11-15T00:01', start, end), false);
});

test('generateStatementNumber creates clean unique code', () => {
  const stmtNum = generateStatementNumber('MC-101', '2026-10-31');
  assert.strictEqual(stmtNum, 'STMT-20261031-MC101');
});

test('formatDubaiDateDisplay formats dates in English', () => {
  assert.strictEqual(formatDubaiDateDisplay('2026-10-27'), '27 Oct 2026');
  assert.strictEqual(formatDubaiDateDisplay('2026-01-01'), '1 Jan 2026');
});
