import test from 'node:test';
import assert from 'node:assert/strict';

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

globalThis.sessionStorage = {
  ...globalThis.localStorage,
};

import { storage } from '../services/storage';
import { validateProofFile } from '../services/customerProofStorage';
import { formatStatementWhatsAppMessage } from '../services/whatsappService';
import { MonthlyStatement, MonthlyCustomerAccount, Customer } from '../types';

function setupAdminSession() {
  storage.setSession({
    role: 'admin',
    userId: 'usr-1',
    userName: 'Faris Mohammed',
    designation: 'Admin',
    loginTime: new Date().toISOString(),
    token: 'test-admin-token',
  });
}

test('Business Contact Numbers: Removes 02 440 3012 and provides 056 657 5169 & 055 720 2819', () => {
  setupAdminSession();
  const settings = storage.getSettings();

  // Must not have old landline
  assert.notEqual(settings.phone, '02 440 3012');
  assert.equal(settings.phone || '', '');

  // Must have both mobile numbers
  assert.equal(settings.mobile, '056 657 5169');
  assert.equal(settings.mobile2, '055 720 2819');
});

test('Business Contact Numbers: Cleans up old 02 440 3012 from existing localStorage state', () => {
  setupAdminSession();
  // Simulate legacy localStorage with old phone number
  const legacySettings = {
    businessName: 'WIN WHITE LAUNDRY',
    phone: '02 440 3012',
    mobile: '056 657 5169',
  };
  localStorage.setItem('wwl_settings_v2', JSON.stringify(legacySettings));

  const migrated = storage.getSettings();
  assert.notEqual(migrated.phone, '02 440 3012');
  assert.equal(migrated.mobile, '056 657 5169');
  assert.equal(migrated.mobile2, '055 720 2819');
});

test('Business Contact Numbers: WhatsApp statement format uses both mobiles and excludes 02 440 3012', () => {
  setupAdminSession();
  const settings = storage.getSettings();
  const dummyStatement: MonthlyStatement = {
    id: 'stmt-001',
    statementNumber: 'STMT-MC101-202610',
    customerId: 'cust-1',
    customerName: 'Ahmad Al Nuaimi',
    customerCode: 'MC-101',
    customerPhone: '+971501234567',
    whatsappNumber: '+971501234567',
    periodLabel: '01 Oct 2026 – 31 Oct 2026',
    cycleStartDate: '2026-10-01',
    cycleEndDate: '2026-10-31',
    generationDate: '2026-10-28',
    invoices: [],
    totalBilled: 150,
    paymentsReceivedInCycle: 50,
    previousOutstandingBalance: 0,
    currentCycleOutstanding: 100,
    totalAmountDue: 100,
    status: 'Finalized',
    deliveryStatus: 'Pending',
    createdAt: new Date().toISOString(),
  };

  const msg = formatStatementWhatsAppMessage(dummyStatement, settings);
  assert.ok(!msg.includes('02 440 3012'), 'Message must not contain old phone number');
  assert.ok(msg.includes('056 657 5169'), 'Message must contain primary mobile');
  assert.ok(msg.includes('055 720 2819'), 'Message must contain secondary mobile');
});

test('Customer Proof Validation: Accepts valid JPG, JPEG, PNG, and WebP files up to 8MB', () => {
  const validJpg = new File([new Uint8Array(100)], 'emirates_id.jpg', { type: 'image/jpeg' });
  const validPng = new File([new Uint8Array(100)], 'trade_license.png', { type: 'image/png' });
  const validWebp = new File([new Uint8Array(100)], 'doc.webp', { type: 'image/webp' });

  assert.equal(validateProofFile(validJpg).valid, true);
  assert.equal(validateProofFile(validPng).valid, true);
  assert.equal(validateProofFile(validWebp).valid, true);
});

test('Customer Proof Validation: Rejects invalid file types like PDF, EXE and oversized files', () => {
  const invalidPdf = new File([new Uint8Array(100)], 'contract.pdf', { type: 'application/pdf' });
  const invalidExe = new File([new Uint8Array(100)], 'program.exe', { type: 'application/x-msdownload' });
  // File over 8MB
  const largeFile = new File([new Uint8Array(9 * 1024 * 1024)], 'huge_photo.jpg', { type: 'image/jpeg' });

  assert.equal(validateProofFile(invalidPdf).valid, false);
  assert.equal(validateProofFile(invalidExe).valid, false);
  assert.equal(validateProofFile(largeFile).valid, false);
});

test('Monthly Customer: Saves and updates proof document alongside monthly customer account', () => {
  setupAdminSession();
  const customerId = 'cust-proof-test-1';

  // Create base customer
  const baseCust: Customer = {
    id: customerId,
    name: 'Saeed Al Ketbi',
    phone: '+971 52 345 6789',
    totalInvoices: 5,
    totalSpending: 250,
    outstandingBalance: 100,
    lastVisitDate: '2026-10-25',
    createdAt: new Date().toISOString(),
  };
  storage.saveCustomer(baseCust);

  // Add monthly account with proof document
  const sampleProofDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD...sample...';
  const newAccount: MonthlyCustomerAccount = {
    id: customerId,
    customerCode: 'MC-201',
    cycleStartDay: 15,
    whatsappNumber: '+971 52 345 6789',
    accountStatus: 'Active',
    scheduledSendTime: '09:00',
    autoSendWhatsApp: true,
    requireAdminApproval: false,
    nextBillingDate: '2026-11-15',
    notes: 'Villa 12',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    proofDocumentUrl: sampleProofDataUrl,
    proofDocumentName: 'emirates_id_saeed.jpg',
    proofDocumentType: 'image/jpeg',
    proofDocumentUploadedAt: new Date().toISOString(),
  };

  storage.saveMonthlyAccount(newAccount);

  // Verify monthly account record
  const fetchedAccount = storage.getMonthlyAccountByCustomerId(customerId);
  assert.ok(fetchedAccount);
  assert.equal(fetchedAccount?.proofDocumentUrl, sampleProofDataUrl);
  assert.equal(fetchedAccount?.proofDocumentName, 'emirates_id_saeed.jpg');
  assert.equal(fetchedAccount?.customerCode, 'MC-201');

  // Verify synced customer profile
  const fetchedCust = storage.getCustomers().find((c) => c.id === customerId);
  assert.ok(fetchedCust);
  assert.equal(fetchedCust?.proofDocumentUrl, sampleProofDataUrl);
  assert.equal(fetchedCust?.customerCode, 'MC-201');
  assert.equal(fetchedCust?.isMonthlyCustomer, true);

  // Update proof (replace with new document)
  const updatedProofUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...';
  storage.saveMonthlyAccount({
    ...fetchedAccount!,
    proofDocumentUrl: updatedProofUrl,
    proofDocumentName: 'trade_license_saeed.png',
    proofDocumentType: 'image/png',
  });

  const updatedAccount = storage.getMonthlyAccountByCustomerId(customerId);
  assert.equal(updatedAccount?.proofDocumentUrl, updatedProofUrl);
  assert.equal(updatedAccount?.proofDocumentName, 'trade_license_saeed.png');

  // Remove proof
  storage.saveMonthlyAccount({
    ...updatedAccount!,
    proofDocumentUrl: '',
    proofDocumentName: '',
    proofDocumentType: '',
  });

  const removedProofAccount = storage.getMonthlyAccountByCustomerId(customerId);
  assert.equal(removedProofAccount?.proofDocumentUrl, '');
});
