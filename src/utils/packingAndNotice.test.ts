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
import { Invoice, InvoiceItem } from '../types';

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

test('Garment Responsibility Notice: provides default 30-day notice in business settings', () => {
  setupAdminSession();
  const settings = storage.getSettings();
  assert.ok(settings.garmentResponsibilityNotice);
  assert.match(
    settings.garmentResponsibilityNotice,
    /Win White Laundry accepts responsibility for garments for a maximum period of 30 days/
  );
  assert.match(settings.garmentResponsibilityNotice, /agreed collection date/);
});

test('Garment Responsibility Notice: allows authorized updating of the notice in settings', () => {
  setupAdminSession();
  const currentSettings = storage.getSettings();
  const updatedNotice =
    'IMPORTANT NOTICE: Win White Laundry accepts responsibility for garments for up to 30 days. Unclaimed items handled as per UAE regulations.';
  const saved = storage.saveSettings({
    ...currentSettings,
    garmentResponsibilityNotice: updatedNotice,
  });
  assert.equal(saved.garmentResponsibilityNotice, updatedNotice);

  const reloaded = storage.getSettings();
  assert.equal(reloaded.garmentResponsibilityNotice, updatedNotice);
});

test('Packing Preference: saves an invoice with Fold packing preference', () => {
  setupAdminSession();
  const now = new Date().toISOString();
  const invoiceData: Invoice = {
    id: 'inv-test-001',
    invoiceNumber: 'INV-TEST-001',
    customerId: 'cust-1',
    customerName: 'Ahmad Al Nuaimi',
    customerPhone: '0501234567',
    items: [
      {
        id: 'item-1',
        dressTypeId: 'dt-1',
        dressTypeName: 'KANDURA',
        service: 'Normal Wash',
        quantity: 2,
        unitPrice: 6,
        subtotal: 12,
        packingPreference: 'Fold',
      },
    ],
    subtotal: 12,
    discount: 0,
    total: 12,
    amountPaid: 0,
    remainingBalance: 12,
    paymentMethod: 'Cash',
    paymentStatus: 'Unpaid',
    invoiceDate: '2026-10-28T10:00',
    expectedDeliveryDate: '2026-10-29',
    status: 'Received',
    statusHistory: [],
    paymentHistory: [],
    createdAt: now,
    packingPreference: 'Fold',
  };

  const savedInvoice = storage.saveInvoice(invoiceData);
  assert.equal(savedInvoice.id, 'inv-test-001');
  assert.equal(savedInvoice.packingPreference, 'Fold');
  assert.equal(savedInvoice.items[0].packingPreference, 'Fold');

  const fetched = storage.getInvoices().find((i) => i.id === savedInvoice.id);
  assert.equal(fetched?.packingPreference, 'Fold');
});

test('Packing Preference: saves an invoice with Hanging packing preference', () => {
  setupAdminSession();
  const now = new Date().toISOString();
  const invoiceData: Invoice = {
    id: 'inv-test-002',
    invoiceNumber: 'INV-TEST-002',
    customerId: 'cust-2',
    customerName: 'Fatima Al Mansoori',
    customerPhone: '0559876543',
    items: [
      {
        id: 'item-1',
        dressTypeId: 'dt-10',
        dressTypeName: 'ABAYA',
        service: 'Dry Cleaning',
        quantity: 1,
        unitPrice: 20,
        subtotal: 20,
        packingPreference: 'Hanging',
      },
    ],
    subtotal: 20,
    discount: 0,
    total: 20,
    amountPaid: 20,
    remainingBalance: 0,
    paymentMethod: 'Card',
    paymentStatus: 'Paid',
    invoiceDate: '2026-10-28T11:00',
    expectedDeliveryDate: '2026-10-30',
    status: 'Ready for Pickup',
    statusHistory: [],
    paymentHistory: [],
    createdAt: now,
    packingPreference: 'Hanging',
  };

  const savedInvoice = storage.saveInvoice(invoiceData);
  assert.equal(savedInvoice.packingPreference, 'Hanging');
  assert.equal(savedInvoice.items[0].packingPreference, 'Hanging');
});

test('Packing Preference: saves an invoice with Mixed packing preference and per-item preferences', () => {
  setupAdminSession();
  const now = new Date().toISOString();
  const items: InvoiceItem[] = [
    {
      id: 'item-1',
      dressTypeId: 'dt-3',
      dressTypeName: 'SHIRT',
      service: 'Only Pressing',
      quantity: 3,
      unitPrice: 2,
      subtotal: 6,
      packingPreference: 'Hanging',
    },
    {
      id: 'item-2',
      dressTypeId: 'dt-30',
      dressTypeName: 'BED SHEET',
      service: 'Normal Wash',
      quantity: 2,
      unitPrice: 6,
      subtotal: 12,
      packingPreference: 'Fold',
    },
    {
      id: 'item-3',
      dressTypeId: 'dt-7',
      dressTypeName: 'JACKET',
      service: 'Dry Cleaning',
      quantity: 1,
      unitPrice: 15,
      subtotal: 15,
      packingPreference: 'Hanging',
    },
  ];

  const invoiceData: Invoice = {
    id: 'inv-test-003',
    invoiceNumber: 'INV-TEST-003',
    customerId: 'cust-3',
    customerName: 'Sultan Al Dhaheri',
    customerPhone: '0567778899',
    items,
    subtotal: 33,
    discount: 0,
    total: 33,
    amountPaid: 0,
    remainingBalance: 33,
    paymentMethod: 'Cash',
    paymentStatus: 'Unpaid',
    invoiceDate: '2026-10-28T12:00',
    expectedDeliveryDate: '2026-10-30',
    status: 'In Progress',
    statusHistory: [],
    paymentHistory: [],
    createdAt: now,
    packingPreference: 'Mixed',
  };

  const saved = storage.saveInvoice(invoiceData);
  assert.equal(saved.packingPreference, 'Mixed');
  assert.equal(saved.items[0].packingPreference, 'Hanging');
  assert.equal(saved.items[1].packingPreference, 'Fold');
  assert.equal(saved.items[2].packingPreference, 'Hanging');
});

test('Packing Preference: updates an existing invoice packing preference and preserves it upon reopening', () => {
  setupAdminSession();
  const now = new Date().toISOString();
  const original: Invoice = {
    id: 'inv-test-004',
    invoiceNumber: 'INV-TEST-004',
    customerId: 'cust-4',
    customerName: 'Khalid',
    customerPhone: '0500001122',
    items: [
      {
        id: 'item-1',
        dressTypeId: 'dt-5',
        dressTypeName: 'TROUSER',
        service: 'Normal Wash',
        quantity: 2,
        unitPrice: 4,
        subtotal: 8,
        packingPreference: 'Fold',
      },
    ],
    subtotal: 8,
    discount: 0,
    total: 8,
    amountPaid: 0,
    remainingBalance: 8,
    paymentMethod: 'Cash',
    paymentStatus: 'Unpaid',
    invoiceDate: '2026-10-28T13:00',
    expectedDeliveryDate: '2026-10-29',
    status: 'Received',
    statusHistory: [],
    paymentHistory: [],
    createdAt: now,
    packingPreference: 'Fold',
  };

  const saved = storage.saveInvoice(original);
  assert.equal(saved.packingPreference, 'Fold');

  // Update to Hanging
  const updated = storage.saveInvoice({
    ...saved,
    packingPreference: 'Hanging',
    items: saved.items.map((item) => ({ ...item, packingPreference: 'Hanging' })),
  });

  assert.equal(updated.packingPreference, 'Hanging');
  assert.equal(updated.items[0].packingPreference, 'Hanging');

  // Reload from storage
  const reloaded = storage.getInvoices().find((i) => i.id === saved.id);
  assert.equal(reloaded?.packingPreference, 'Hanging');
});

test('Packing Preference: safely handles legacy invoices where packingPreference was undefined', () => {
  setupAdminSession();
  const legacyInvoice: Invoice = {
    id: 'legacy-invoice-101',
    invoiceNumber: 'INV-51112',
    customerId: 'cust-5',
    customerName: 'Old Customer',
    customerPhone: '0501112233',
    items: [
      {
        id: 'item-old',
        dressTypeId: 'dt-2',
        dressTypeName: 'GHUTRA',
        service: 'Normal Wash',
        quantity: 1,
        unitPrice: 4,
        subtotal: 4,
      },
    ],
    subtotal: 4,
    discount: 0,
    total: 4,
    amountPaid: 4,
    remainingBalance: 0,
    paymentMethod: 'Cash',
    paymentStatus: 'Paid',
    invoiceDate: '2026-10-20T10:00',
    expectedDeliveryDate: '2026-10-21',
    status: 'Delivered',
    statusHistory: [],
    paymentHistory: [],
    createdAt: new Date().toISOString(),
  };

  const existingInvoices = storage.getInvoices();
  localStorage.setItem('wwl_invoices_v1', JSON.stringify([...existingInvoices, legacyInvoice]));

  const retrieved = storage.getInvoices().find((i) => i.id === 'legacy-invoice-101');
  assert.ok(retrieved);
  const displayPreference = retrieved?.packingPreference || 'Fold';
  assert.equal(displayPreference, 'Fold');
});
