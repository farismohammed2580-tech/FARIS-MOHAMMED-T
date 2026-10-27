import {
  DressType,
  Invoice,
  Customer,
  Expense,
  UserAccount,
  BusinessSettings,
  OrderStatus,
  ServiceType,
  PaymentRecord,
  PortalSession,
  MonthlyCustomerAccount,
  MonthlyStatement,
  AccountPaymentRecord,
  WhatsAppDeliveryLog,
  StatementInvoiceSummary,
} from '../types';
import { deleteReceiptImage } from './receiptStorage';
import {
  getCustomerBillingCycle,
  isInvoiceInCycle,
  generateStatementNumber,
  formatDubaiDateDisplay,
  getDubaiDate,
} from '../utils/billingCycle';

const STORAGE_KEYS = {
  DRESS_TYPES: 'wwl_dress_types_v2',
  INVOICES: 'wwl_invoices_v1',
  CUSTOMERS: 'wwl_customers_v1',
  EXPENSES: 'wwl_expenses_v1',
  SETTINGS: 'wwl_settings_v2',
  USERS: 'wwl_users_v1',
  CURRENT_USER: 'wwl_current_user_v1',
  SESSION: 'wwl_session_v1',
  MONTHLY_ACCOUNTS: 'wwl_monthly_accounts_v1',
  MONTHLY_STATEMENTS: 'wwl_monthly_statements_v1',
  MONTHLY_PAYMENTS: 'wwl_monthly_payments_v1',
  WHATSAPP_LOGS: 'wwl_whatsapp_logs_v1',
};

// Official WIN WHITE LAUNDRY 38-Item Catalogue faithfully transcribed from the original paper cash invoice
const INITIAL_DRESS_TYPES: DressType[] = [
  {
    id: 'dt-1',
    name: 'KANDURA',
    category: 'Traditional UAE',
    isActive: true,
    prices: {
      'Normal Wash': 6,
      'Dry Cleaning': 10,
      'Only Pressing': 3,
      'Only Wash': 3,
      'Washing + Ironing': 6,
      'Washing Only': 3,
      'Pressing Only': 3,
    },
  },
  {
    id: 'dt-2',
    name: 'GHUTRA',
    category: 'Traditional UAE',
    isActive: true,
    prices: {
      'Normal Wash': 4,
      'Dry Cleaning': 6,
      'Only Pressing': 3,
      'Only Wash': 3,
      'Washing + Ironing': 4,
      'Washing Only': 3,
      'Pressing Only': 3,
    },
  },
  {
    id: 'dt-3',
    name: 'SHIRT',
    category: 'Men',
    isActive: true,
    prices: {
      'Normal Wash': 3,
      'Dry Cleaning': 5,
      'Only Pressing': 2,
      'Only Wash': 2,
      'Washing + Ironing': 3,
      'Washing Only': 2,
      'Pressing Only': 2,
    },
  },
  {
    id: 'dt-4',
    name: 'T.SHIRT',
    category: 'General',
    isActive: true,
    prices: {
      'Normal Wash': 3,
      'Dry Cleaning': 5,
      'Only Pressing': 2,
      'Only Wash': 2,
      'Washing + Ironing': 3,
      'Washing Only': 2,
      'Pressing Only': 2,
    },
  },
  {
    id: 'dt-5',
    name: 'TROUSER',
    category: 'General',
    isActive: true,
    prices: {
      'Normal Wash': 4,
      'Dry Cleaning': 6,
      'Only Pressing': 2,
      'Only Wash': 2,
      'Washing + Ironing': 4,
      'Washing Only': 2,
      'Pressing Only': 2,
    },
  },
  {
    id: 'dt-6',
    name: 'SHORT',
    category: 'General',
    isActive: true,
    prices: {
      'Normal Wash': 3,
      'Dry Cleaning': 5,
      'Only Pressing': 2,
      'Only Wash': 2,
      'Washing + Ironing': 3,
      'Washing Only': 2,
      'Pressing Only': 2,
    },
  },
  {
    id: 'dt-7',
    name: 'JACKET',
    category: 'General',
    isActive: true,
    prices: {
      'Normal Wash': 10,
      'Dry Cleaning': 15,
      'Only Pressing': 5,
      'Only Wash': 5,
      'Washing + Ironing': 10,
      'Washing Only': 5,
      'Pressing Only': 5,
    },
  },
  {
    id: 'dt-8',
    name: 'OVER COAT',
    category: 'General',
    isActive: true,
    prices: {
      'Normal Wash': 12,
      'Dry Cleaning': 18,
      'Only Pressing': 7,
      'Only Wash': 7,
      'Washing + Ironing': 12,
      'Washing Only': 7,
      'Pressing Only': 7,
    },
  },
  {
    id: 'dt-9',
    name: 'TIE',
    category: 'Men',
    isActive: true,
    prices: {
      'Normal Wash': 2,
      'Dry Cleaning': 4,
      'Only Pressing': 1,
      'Only Wash': 1,
      'Washing + Ironing': 2,
      'Washing Only': 1,
      'Pressing Only': 1,
    },
  },
  {
    id: 'dt-10',
    name: 'ABAYA',
    category: 'Traditional UAE',
    isActive: true,
    prices: {
      'Normal Wash': 12,
      'Dry Cleaning': 20,
      'Only Pressing': 8,
      'Only Wash': 8,
      'Washing + Ironing': 12,
      'Washing Only': 8,
      'Pressing Only': 8,
    },
  },
  {
    id: 'dt-11',
    name: 'SHALL',
    category: 'Women',
    isActive: true,
    prices: {
      'Normal Wash': 3,
      'Dry Cleaning': 6,
      'Only Pressing': 2,
      'Only Wash': 2,
      'Washing + Ironing': 3,
      'Washing Only': 2,
      'Pressing Only': 2,
    },
  },
  {
    id: 'dt-12',
    name: 'LADIES DRESS',
    category: 'Women',
    isActive: true,
    prices: {
      'Normal Wash': 14,
      'Dry Cleaning': 20,
      'Only Pressing': 8,
      'Only Wash': 8,
      'Washing + Ironing': 14,
      'Washing Only': 8,
      'Pressing Only': 8,
    },
  },
  {
    id: 'dt-13',
    name: 'SKIRT',
    category: 'Women',
    isActive: true,
    prices: {
      'Normal Wash': 8,
      'Dry Cleaning': 15,
      'Only Pressing': 5,
      'Only Wash': 5,
      'Washing + Ironing': 8,
      'Washing Only': 5,
      'Pressing Only': 5,
    },
  },
  {
    id: 'dt-14',
    name: 'BLOUSE',
    category: 'Women',
    isActive: true,
    prices: {
      'Normal Wash': 5,
      'Dry Cleaning': 8,
      'Only Pressing': 3,
      'Only Wash': 3,
      'Washing + Ironing': 5,
      'Washing Only': 3,
      'Pressing Only': 3,
    },
  },
  {
    id: 'dt-15',
    name: 'SAREE',
    category: 'Women',
    isActive: true,
    prices: {
      'Normal Wash': 8,
      'Dry Cleaning': 14,
      'Only Pressing': 5,
      'Only Wash': 5,
      'Washing + Ironing': 8,
      'Washing Only': 5,
      'Pressing Only': 5,
    },
  },
  {
    id: 'dt-16',
    name: 'MAXI',
    category: 'Women',
    isActive: true,
    prices: {
      'Normal Wash': 12,
      'Dry Cleaning': 20,
      'Only Pressing': 6,
      'Only Wash': 6,
      'Washing + Ironing': 12,
      'Washing Only': 6,
      'Pressing Only': 6,
    },
  },
  {
    id: 'dt-17',
    name: 'PYJAMA',
    category: 'General',
    isActive: true,
    prices: {
      'Normal Wash': 6,
      'Dry Cleaning': 10,
      'Only Pressing': 4,
      'Only Wash': 4,
      'Washing + Ironing': 6,
      'Washing Only': 4,
      'Pressing Only': 4,
    },
  },
  {
    id: 'dt-18',
    name: 'U.WEAR',
    category: 'General',
    isActive: true,
    prices: {
      'Normal Wash': 2,
      'Dry Cleaning': 4,
      'Only Pressing': 1,
      'Only Wash': 1,
      'Washing + Ironing': 2,
      'Washing Only': 1,
      'Pressing Only': 1,
    },
  },
  {
    id: 'dt-19',
    name: 'LUNGI',
    category: 'Men',
    isActive: true,
    prices: {
      'Normal Wash': 4,
      'Dry Cleaning': 8,
      'Only Pressing': 2,
      'Only Wash': 2,
      'Washing + Ironing': 4,
      'Washing Only': 2,
      'Pressing Only': 2,
    },
  },
  {
    id: 'dt-20',
    name: 'IN.WEAR',
    category: 'General',
    isActive: true,
    prices: {
      'Normal Wash': 2,
      'Dry Cleaning': 4,
      'Only Pressing': 1,
      'Only Wash': 1,
      'Washing + Ironing': 2,
      'Washing Only': 1,
      'Pressing Only': 1,
    },
  },
  {
    id: 'dt-21',
    name: 'CAP',
    category: 'General',
    isActive: true,
    prices: {
      'Normal Wash': 2,
      'Dry Cleaning': 4,
      'Only Pressing': 2,
      'Only Wash': 2,
      'Washing + Ironing': 2,
      'Washing Only': 2,
      'Pressing Only': 2,
    },
  },
  {
    id: 'dt-22',
    name: 'SOCKS',
    category: 'General',
    isActive: true,
    prices: {
      'Normal Wash': 1,
      'Dry Cleaning': 2,
      'Only Pressing': 0,
      'Only Wash': 0,
      'Washing + Ironing': 1,
      'Washing Only': 0,
      'Pressing Only': 0,
    },
    unverifiedServices: ['Only Pressing', 'Only Wash'],
    notes: 'Unlisted rate on paper invoice (-) for pressing and wash only',
  },
  {
    id: 'dt-23',
    name: 'BABY CLOTHES',
    category: 'General',
    isActive: true,
    prices: {
      'Normal Wash': 3,
      'Dry Cleaning': 6,
      'Only Pressing': 2,
      'Only Wash': 2,
      'Washing + Ironing': 3,
      'Washing Only': 2,
      'Pressing Only': 2,
    },
  },
  {
    id: 'dt-24',
    name: 'SAFARI SUIT',
    category: 'Men',
    isActive: true,
    prices: {
      'Normal Wash': 14,
      'Dry Cleaning': 20,
      'Only Pressing': 8,
      'Only Wash': 8,
      'Washing + Ironing': 14,
      'Washing Only': 8,
      'Pressing Only': 8,
    },
  },
  {
    id: 'dt-25',
    name: 'BATH ROOM',
    category: 'Household',
    isActive: true,
    prices: {
      'Normal Wash': 8,
      'Dry Cleaning': 15,
      'Only Pressing': 0,
      'Only Wash': 0,
      'Washing + Ironing': 8,
      'Washing Only': 0,
      'Pressing Only': 0,
    },
    unverifiedServices: ['Only Pressing', 'Only Wash'],
    notes: 'Printed as BATH ROOB on invoice; Pressing/Wash only unlisted (-)',
  },
  {
    id: 'dt-26',
    name: 'TOWEL - B',
    category: 'Household',
    isActive: true,
    prices: {
      'Normal Wash': 5,
      'Dry Cleaning': 0,
      'Only Pressing': 0,
      'Only Wash': 0,
      'Washing + Ironing': 5,
      'Washing Only': 0,
      'Pressing Only': 0,
    },
    unverifiedServices: ['Dry Cleaning', 'Only Pressing', 'Only Wash'],
    notes: 'Large towel; only Normal Wash listed on paper invoice (AED 5)',
  },
  {
    id: 'dt-27',
    name: 'TOWEL - S',
    category: 'Household',
    isActive: true,
    prices: {
      'Normal Wash': 3,
      'Dry Cleaning': 0,
      'Only Pressing': 0,
      'Only Wash': 0,
      'Washing + Ironing': 3,
      'Washing Only': 0,
      'Pressing Only': 0,
    },
    unverifiedServices: ['Dry Cleaning', 'Only Pressing', 'Only Wash'],
    notes: 'Small towel; only Normal Wash listed on paper invoice (AED 3)',
  },
  {
    id: 'dt-28',
    name: 'BLANKET - B',
    category: 'Household',
    isActive: true,
    prices: {
      'Normal Wash': 20,
      'Dry Cleaning': 0,
      'Only Pressing': 0,
      'Only Wash': 0,
      'Washing + Ironing': 20,
      'Washing Only': 0,
      'Pressing Only': 0,
    },
    unverifiedServices: ['Dry Cleaning', 'Only Pressing', 'Only Wash'],
    notes: 'Big blanket; only Normal Wash listed on paper invoice (AED 20)',
  },
  {
    id: 'dt-29',
    name: 'BLANKET - S',
    category: 'Household',
    isActive: true,
    prices: {
      'Normal Wash': 15,
      'Dry Cleaning': 0,
      'Only Pressing': 0,
      'Only Wash': 0,
      'Washing + Ironing': 15,
      'Washing Only': 0,
      'Pressing Only': 0,
    },
    unverifiedServices: ['Dry Cleaning', 'Only Pressing', 'Only Wash'],
    notes: 'Small blanket; only Normal Wash listed on paper invoice (AED 15)',
  },
  {
    id: 'dt-30',
    name: 'BED COVER - B',
    category: 'Household',
    isActive: true,
    prices: {
      'Normal Wash': 20,
      'Dry Cleaning': 0,
      'Only Pressing': 0,
      'Only Wash': 0,
      'Washing + Ironing': 20,
      'Washing Only': 0,
      'Pressing Only': 0,
    },
    unverifiedServices: ['Dry Cleaning', 'Only Pressing', 'Only Wash'],
    notes: 'Big bed cover; only Normal Wash listed on paper invoice (AED 20)',
  },
  {
    id: 'dt-31',
    name: 'BED COVER - S',
    category: 'Household',
    isActive: true,
    prices: {
      'Normal Wash': 15,
      'Dry Cleaning': 0,
      'Only Pressing': 0,
      'Only Wash': 0,
      'Washing + Ironing': 15,
      'Washing Only': 0,
      'Pressing Only': 0,
    },
    unverifiedServices: ['Dry Cleaning', 'Only Pressing', 'Only Wash'],
    notes: 'Small bed cover; only Normal Wash listed on paper invoice (AED 15)',
  },
  {
    id: 'dt-32',
    name: 'BED SHEET',
    category: 'Household',
    isActive: true,
    prices: {
      'Normal Wash': 6,
      'Dry Cleaning': 6,
      'Only Pressing': 4,
      'Only Wash': 4,
      'Washing + Ironing': 6,
      'Washing Only': 4,
      'Pressing Only': 4,
    },
  },
  {
    id: 'dt-33',
    name: 'PILLOW CEASE',
    category: 'Household',
    isActive: true,
    prices: {
      'Normal Wash': 2,
      'Dry Cleaning': 2,
      'Only Pressing': 2,
      'Only Wash': 2,
      'Washing + Ironing': 2,
      'Washing Only': 2,
      'Pressing Only': 2,
    },
    notes: 'Original paper invoice spelling: PILLOW CEASE',
  },
  {
    id: 'dt-34',
    name: 'TABLE CLOTHE',
    category: 'Household',
    isActive: true,
    prices: {
      'Normal Wash': 0,
      'Dry Cleaning': 0,
      'Only Pressing': 0,
      'Only Wash': 0,
      'Washing + Ironing': 0,
      'Washing Only': 0,
      'Pressing Only': 0,
    },
    unverifiedServices: ['Normal Wash', 'Dry Cleaning', 'Only Pressing', 'Only Wash'],
    rateType: 'size',
    notes: 'Unlisted price on invoice (-) - rate depends on dimension or inspection',
  },
  {
    id: 'dt-35',
    name: 'CURTAIN',
    category: 'Household',
    isActive: true,
    prices: {
      'Normal Wash': 0,
      'Dry Cleaning': 0,
      'Only Pressing': 0,
      'Only Wash': 0,
      'Washing + Ironing': 0,
      'Washing Only': 0,
      'Pressing Only': 0,
    },
    unverifiedServices: ['Normal Wash', 'Dry Cleaning', 'Only Pressing', 'Only Wash'],
    rateType: 'size',
    notes: 'Marked "SIZE" on paper invoice - rate depends on window dimensions',
  },
  {
    id: 'dt-36',
    name: 'CARPET',
    category: 'Household',
    isActive: true,
    prices: {
      'Normal Wash': 0,
      'Dry Cleaning': 0,
      'Only Pressing': 0,
      'Only Wash': 0,
      'Washing + Ironing': 0,
      'Washing Only': 0,
      'Pressing Only': 0,
    },
    unverifiedServices: ['Normal Wash', 'Dry Cleaning', 'Only Pressing', 'Only Wash'],
    rateType: 'meter',
    notes: 'Marked "MTR" on paper invoice - rate calculated per square meter',
  },
  {
    id: 'dt-37',
    name: 'BAG',
    category: 'General',
    isActive: true,
    prices: {
      'Normal Wash': 0,
      'Dry Cleaning': 0,
      'Only Pressing': 0,
      'Only Wash': 0,
      'Washing + Ironing': 0,
      'Washing Only': 0,
      'Pressing Only': 0,
    },
    unverifiedServices: ['Normal Wash', 'Dry Cleaning', 'Only Pressing', 'Only Wash'],
    rateType: 'quote',
    notes: 'Unlisted price on invoice (-) - quote upon fabric and hardware inspection',
  },
  {
    id: 'dt-38',
    name: 'SHOE',
    category: 'General',
    isActive: true,
    prices: {
      'Normal Wash': 0,
      'Dry Cleaning': 0,
      'Only Pressing': 0,
      'Only Wash': 0,
      'Washing + Ironing': 0,
      'Washing Only': 0,
      'Pressing Only': 0,
    },
    unverifiedServices: ['Normal Wash', 'Dry Cleaning', 'Only Pressing', 'Only Wash'],
    rateType: 'quote',
    notes: 'Unlisted price on invoice (-) - quote upon material inspection',
  },
];

// Initial Business Settings - Exactly transcribed from the uploaded real paper cash invoice
const INITIAL_SETTINGS: BusinessSettings = {
  businessName: 'WIN WHITE LAUNDRY',
  businessType: 'Laundry Shop',
  tagline: 'Laundry Shop',
  branch: 'Tourist Club, Abu Dhabi',
  address: 'Zayed Street, Tourist Club, Behind Subaru Showroom, Abu Dhabi, U.A.E.',
  phone: '02 440 3012',
  mobile: '056 657 5169',
  poBox: '4575',
  email: 'winwhite1222@gmail.com',
  trnNumber: '100482910400003',
  invoicePrefix: 'No. ',
  nextInvoiceSequence: 51112,
  currency: 'AED',
  timezone: 'Asia/Dubai',
  expressServiceAvailable: true,
  expressServiceText: 'EXPRESS SERVICE 1 HOUR',
  freeDeliveryAvailable: true,
  freeDeliveryText: 'FREE HOME DELIVERY',
  rulesAndRegulations: [
    "1. The Laundry can't be Held Responsible for shrinkage or fastness of colour",
    "2. Any Claims must be reported within 24 hours from delivery of the articles.",
    "3. In case of loss of damage laundry will be liable for not more them three times cost cleaning the article.",
  ],
  customerNotice:
    "1. The Laundry can't be Held Responsible for shrinkage or fastness of colour\n2. Any Claims must be reported within 24 hours from delivery of the articles.\n3. In case of loss of damage laundry will be liable for not more them three times cost cleaning the article.",
  thankYouMessage: 'Thank you for visiting WIN WHITE LAUNDRY!',
  defaultPrintCopy: 'both',
  adminPin: '1234',
  staffPin: '4321',
  logoUrl: '',
};

// Initial Staff Accounts - Consolidated to single shared Staff Portal (PIN 4321)
const INITIAL_USERS: UserAccount[] = [
  {
    id: 'usr-1',
    name: 'Faris Mohammed',
    role: 'admin',
    pin: '1234',
    designation: 'Managing Director / Administrator',
    active: true,
  },
  {
    id: 'usr-shared-staff',
    name: 'Laundry Floor Staff',
    role: 'staff',
    pin: '4321',
    designation: 'Shared Floor Workstation Operator',
    active: true,
  },
  {
    id: 'usr-2',
    name: 'Tariq Al-Mansoor',
    role: 'staff',
    pin: '4321',
    designation: 'Steam Press & Dry Clean Specialist',
    active: true,
  },
  {
    id: 'usr-3',
    name: 'Rashid Khan',
    role: 'staff',
    pin: '4321',
    designation: 'Wash Plant & Intake Operator',
    active: true,
  },
  {
    id: 'usr-4',
    name: 'Imran Bashir',
    role: 'staff',
    pin: '4321',
    designation: 'Quality Control & Assembly Staff',
    active: true,
  },
];

// Initial Customers
const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Mohammed Al-Maktoum',
    phone: '+971 50 789 1234',
    address: 'Villa 14, Al Barsha South, Dubai',
    totalInvoices: 8,
    totalSpending: 620.0,
    outstandingBalance: 65.0,
    lastVisitDate: '2026-10-25',
    createdAt: '2026-06-10',
    isMonthlyCustomer: true,
    customerCode: 'MC-101',
    monthlyAccountId: 'cust-1',
  },
  {
    id: 'cust-2',
    name: 'Sarah Jenkins',
    phone: '+971 55 432 9876',
    address: 'Apt 1204, Marina Crown, Dubai Marina',
    totalInvoices: 5,
    totalSpending: 380.0,
    outstandingBalance: 0.0,
    lastVisitDate: '2026-10-24',
    createdAt: '2026-07-15',
    isMonthlyCustomer: false,
  },
  {
    id: 'cust-3',
    name: 'Ahmed Bin Salem',
    phone: '+971 52 901 3456',
    address: 'Executive Towers B, Business Bay, Dubai',
    totalInvoices: 12,
    totalSpending: 1140.0,
    outstandingBalance: 120.0,
    lastVisitDate: '2026-10-25',
    createdAt: '2026-05-02',
    isMonthlyCustomer: true,
    customerCode: 'MC-102',
    monthlyAccountId: 'cust-3',
  },
  {
    id: 'cust-4',
    name: 'Fatima Al-Zahra',
    phone: '+971 50 334 5566',
    address: 'Al Wasl Road, Jumeirah 2, Dubai',
    totalInvoices: 4,
    totalSpending: 295.0,
    outstandingBalance: 0.0,
    lastVisitDate: '2026-10-23',
    createdAt: '2026-08-20',
    isMonthlyCustomer: false,
  },
  {
    id: 'cust-5',
    name: 'David Miller',
    phone: '+971 56 123 7890',
    address: 'The Greens, Al Thanya St, Dubai',
    totalInvoices: 3,
    totalSpending: 145.0,
    outstandingBalance: 40.0,
    lastVisitDate: '2026-10-22',
    createdAt: '2026-09-05',
    isMonthlyCustomer: false,
  },
];

// Initial Monthly Customer Accounts (Custom Cycle examples: 1st-30th/31st vs 15th-14th)
const INITIAL_MONTHLY_ACCOUNTS: MonthlyCustomerAccount[] = [
  {
    id: 'cust-1',
    customerCode: 'MC-101',
    cycleStartDay: 1, // Standard month (1st to 30th/31st)
    whatsappNumber: '+971 50 789 1234',
    accountStatus: 'Active',
    scheduledSendTime: '09:00',
    autoSendWhatsApp: true,
    requireAdminApproval: false,
    nextBillingDate: '2026-10-31',
    notes: 'Villa 14, Al Barsha South - Standard monthly billing (1st - 31st)',
    createdAt: '2026-06-10',
    updatedAt: '2026-10-25',
  },
  {
    id: 'cust-3',
    customerCode: 'MC-102',
    cycleStartDay: 15, // Staggered cycle (15th to 14th of following month)
    whatsappNumber: '+971 52 901 3456',
    accountStatus: 'Active',
    scheduledSendTime: '10:00',
    autoSendWhatsApp: true,
    requireAdminApproval: true,
    nextBillingDate: '2026-11-14',
    notes: 'Executive Towers B, Business Bay - Staggered cycle (15th - 14th)',
    createdAt: '2026-05-02',
    updatedAt: '2026-10-25',
  },
];

// Initial Invoices
const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-1041',
    invoiceNumber: 'WWL-1041',
    customerId: 'cust-1',
    customerName: 'Mohammed Al-Maktoum',
    customerPhone: '+971 50 789 1234',
    items: [
      {
        id: 'item-1',
        dressTypeId: 'dt-1',
        dressTypeName: 'Kandura (Arabic Thobe)',
        service: 'Washing + Ironing',
        quantity: 5,
        unitPrice: 8.0,
        subtotal: 40.0,
      },
      {
        id: 'item-2',
        dressTypeId: 'dt-3',
        dressTypeName: 'Ghutra / Shemagh',
        service: 'Pressing Only',
        quantity: 5,
        unitPrice: 3.0,
        subtotal: 15.0,
      },
      {
        id: 'item-3',
        dressTypeId: 'dt-7',
        dressTypeName: 'Suit 2-Piece',
        service: 'Dry Cleaning',
        quantity: 1,
        unitPrice: 35.0,
        subtotal: 35.0,
      },
    ],
    subtotal: 90.0,
    discount: 5.0,
    total: 85.0,
    amountPaid: 20.0,
    remainingBalance: 65.0,
    paymentMethod: 'Cash',
    paymentStatus: 'Partial',
    invoiceDate: '2026-10-25T08:30',
    expectedDeliveryDate: '2026-10-27',
    status: 'In Progress',
    statusHistory: [
      {
        status: 'Received',
        timestamp: '2026-10-25T08:30:00',
        updatedBy: 'Faris Mohammed (Admin)',
        note: 'Garments received at counter',
      },
      {
        status: 'In Progress',
        timestamp: '2026-10-25T09:15:00',
        updatedBy: 'Rashid Khan (Staff)',
        note: 'Separated white thobes for delicate treatment',
      },
    ],
    paymentHistory: [
      {
        id: 'pay-1',
        invoiceId: 'inv-1041',
        amount: 20.0,
        paymentMethod: 'Cash',
        date: '2026-10-25T08:30:00',
        recordedBy: 'Faris Mohammed (Admin)',
        notes: 'Deposit paid at intake',
      },
    ],
    notes: 'Please apply medium starch to Kanduras',
    createdAt: '2026-10-25T08:30:00',
  },
  {
    id: 'inv-1042',
    invoiceNumber: 'WWL-1042',
    customerId: 'cust-2',
    customerName: 'Sarah Jenkins',
    customerPhone: '+971 55 432 9876',
    items: [
      {
        id: 'item-4',
        dressTypeId: 'dt-9',
        dressTypeName: 'Evening Dress / Gown',
        service: 'Dry Cleaning',
        quantity: 1,
        unitPrice: 45.0,
        subtotal: 45.0,
      },
      {
        id: 'item-5',
        dressTypeId: 'dt-4',
        dressTypeName: 'Formal Shirt',
        service: 'Washing + Ironing',
        quantity: 3,
        unitPrice: 6.0,
        subtotal: 18.0,
      },
    ],
    subtotal: 63.0,
    discount: 0.0,
    total: 63.0,
    amountPaid: 63.0,
    remainingBalance: 0.0,
    paymentMethod: 'Card',
    paymentStatus: 'Paid',
    invoiceDate: '2026-10-24T14:15',
    expectedDeliveryDate: '2026-10-26',
    status: 'Ready for Pickup',
    statusHistory: [
      {
        status: 'Received',
        timestamp: '2026-10-24T14:15:00',
        updatedBy: 'Faris Mohammed (Admin)',
      },
      {
        status: 'In Progress',
        timestamp: '2026-10-24T15:00:00',
        updatedBy: 'Tariq Al-Mansoor (Staff)',
      },
      {
        status: 'Ready for Pickup',
        timestamp: '2026-10-25T09:00:00',
        updatedBy: 'Imran Bashir (Staff)',
        note: 'Hung on velvet hangers and sealed in nylon bags',
      },
    ],
    paymentHistory: [
      {
        id: 'pay-2',
        invoiceId: 'inv-1042',
        amount: 63.0,
        paymentMethod: 'Card',
        date: '2026-10-24T14:15:00',
        recordedBy: 'Faris Mohammed (Admin)',
      },
    ],
    notes: 'Silk gown - handle gently',
    createdAt: '2026-10-24T14:15:00',
  },
  {
    id: 'inv-1043',
    invoiceNumber: 'WWL-1043',
    customerId: 'cust-3',
    customerName: 'Ahmed Bin Salem',
    customerPhone: '+971 52 901 3456',
    items: [
      {
        id: 'item-6',
        dressTypeId: 'dt-11',
        dressTypeName: 'Blanket / Heavy Comforter',
        service: 'Dry Cleaning',
        quantity: 2,
        unitPrice: 40.0,
        subtotal: 80.0,
      },
      {
        id: 'item-7',
        dressTypeId: 'dt-10',
        dressTypeName: 'Bedsheet Set (Double)',
        service: 'Washing + Ironing',
        quantity: 2,
        unitPrice: 16.0,
        subtotal: 32.0,
      },
      {
        id: 'item-8',
        dressTypeId: 'dt-5',
        dressTypeName: 'Trousers / Chinos / Jeans',
        service: 'Pressing Only',
        quantity: 2,
        unitPrice: 4.0,
        subtotal: 8.0,
      },
    ],
    subtotal: 120.0,
    discount: 0.0,
    total: 120.0,
    amountPaid: 0.0,
    remainingBalance: 120.0,
    paymentMethod: 'Cash',
    paymentStatus: 'Unpaid',
    invoiceDate: '2026-10-25T07:45',
    expectedDeliveryDate: '2026-10-28',
    status: 'Received',
    statusHistory: [
      {
        status: 'Received',
        timestamp: '2026-10-25T07:45:00',
        updatedBy: 'Rashid Khan (Staff)',
        note: 'Customer dropped off at morning intake',
      },
    ],
    paymentHistory: [],
    notes: 'Pay on delivery requested',
    createdAt: '2026-10-25T07:45:00',
  },
  {
    id: 'inv-1044',
    invoiceNumber: 'WWL-1044',
    customerId: 'cust-5',
    customerName: 'David Miller',
    customerPhone: '+971 56 123 7890',
    items: [
      {
        id: 'item-9',
        dressTypeId: 'dt-4',
        dressTypeName: 'Formal Shirt',
        service: 'Washing + Ironing',
        quantity: 5,
        unitPrice: 6.0,
        subtotal: 30.0,
      },
      {
        id: 'item-10',
        dressTypeId: 'dt-5',
        dressTypeName: 'Trousers / Chinos / Jeans',
        service: 'Washing + Ironing',
        quantity: 3,
        unitPrice: 7.0,
        subtotal: 21.0,
      },
    ],
    subtotal: 51.0,
    discount: 1.0,
    total: 50.0,
    amountPaid: 10.0,
    remainingBalance: 40.0,
    paymentMethod: 'Card',
    paymentStatus: 'Partial',
    invoiceDate: '2026-10-22T11:00',
    expectedDeliveryDate: '2026-10-24',
    status: 'Delivered',
    statusHistory: [
      {
        status: 'Received',
        timestamp: '2026-10-22T11:00:00',
        updatedBy: 'Faris Mohammed (Admin)',
      },
      {
        status: 'In Progress',
        timestamp: '2026-10-22T12:00:00',
        updatedBy: 'Tariq Al-Mansoor (Staff)',
      },
      {
        status: 'Ready for Pickup',
        timestamp: '2026-10-23T16:00:00',
        updatedBy: 'Imran Bashir (Staff)',
      },
      {
        status: 'Delivered',
        timestamp: '2026-10-24T18:30:00',
        updatedBy: 'Faris Mohammed (Admin)',
        note: 'Delivered to building reception; balance remaining AED 40.00',
      },
    ],
    paymentHistory: [
      {
        id: 'pay-3',
        invoiceId: 'inv-1044',
        amount: 10.0,
        paymentMethod: 'Card',
        date: '2026-10-22T11:00:00',
        recordedBy: 'Faris Mohammed (Admin)',
      },
    ],
    createdAt: '2026-10-22T11:00:00',
  },
];

// Initial Expenses
const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    date: '2026-10-25',
    category: 'Detergents & Chemicals',
    description: 'Eco friendly laundry liquid & stain remover refill (Ecolab Dubai)',
    amount: 185.0,
    paymentMethod: 'Card',
    recordedBy: 'Faris Mohammed (Admin)',
    createdAt: '2026-10-25T07:15:00',
  },
  {
    id: 'exp-2',
    date: '2026-10-24',
    category: 'Delivery & Fuel',
    description: 'ADNOC Van Fuel for Al Barsha & Marina delivery route',
    amount: 120.0,
    paymentMethod: 'Card',
    recordedBy: 'Faris Mohammed (Admin)',
    createdAt: '2026-10-24T09:30:00',
  },
  {
    id: 'exp-3',
    date: '2026-10-20',
    category: 'Electricity & Water',
    description: 'DEWA commercial utility payment for October',
    amount: 1250.0,
    paymentMethod: 'Other',
    recordedBy: 'Faris Mohammed (Admin)',
    createdAt: '2026-10-20T10:00:00',
  },
  {
    id: 'exp-4',
    date: '2026-10-15',
    category: 'Packaging & Hangers',
    description: '500x heavy duty wire hangers and customized garment polythene rolls',
    amount: 340.0,
    paymentMethod: 'Cash',
    recordedBy: 'Faris Mohammed (Admin)',
    createdAt: '2026-10-15T14:00:00',
  },
  {
    id: 'exp-5',
    date: '2026-10-01',
    category: 'Rent',
    description: 'Commercial shop rent instalment - Al Barsha 1 premises',
    amount: 4500.0,
    paymentMethod: 'Other',
    recordedBy: 'Faris Mohammed (Admin)',
    createdAt: '2026-10-01T09:00:00',
  },
];

class StorageService {
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(STORAGE_KEYS.DRESS_TYPES)) {
      localStorage.setItem(STORAGE_KEYS.DRESS_TYPES, JSON.stringify(INITIAL_DRESS_TYPES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CUSTOMERS)) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.INVOICES)) {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(INITIAL_INVOICES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.EXPENSES)) {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER)) {
      // Default to Admin logged in
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
    }
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error in storage listener', err);
      }
    });
  }

  // --- Role Authorization Guard ---
  public requireRole(requiredRole: 'admin' | 'staff'): void {
    const session = this.getSession();
    if (!session || !session.token) {
      throw new Error('Authentication required: No active session.');
    }
    if (requiredRole === 'admin' && session.role !== 'admin') {
      throw new Error('Access denied: Administrator privileges required for this operation.');
    }
  }

  // --- Dress Types ---
  public getDressTypes(): DressType[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DRESS_TYPES);
      const list: DressType[] = data ? JSON.parse(data) : INITIAL_DRESS_TYPES;
      return list.map((dt) => {
        const prices = { ...dt.prices };
        if (prices['Normal Wash'] === undefined) {
          prices['Normal Wash'] = prices['Washing + Ironing'] ?? 0;
        }
        if (prices['Only Pressing'] === undefined) {
          prices['Only Pressing'] = prices['Pressing Only'] ?? 0;
        }
        if (prices['Only Wash'] === undefined) {
          prices['Only Wash'] = prices['Washing Only'] ?? 0;
        }
        if (prices['Dry Cleaning'] === undefined) {
          prices['Dry Cleaning'] = 0;
        }
        return {
          ...dt,
          prices,
        };
      });
    } catch {
      return INITIAL_DRESS_TYPES;
    }
  }

  public saveDressType(dress: DressType): DressType {
    this.requireRole('admin');
    const list = this.getDressTypes();
    const index = list.findIndex((d) => d.id === dress.id);
    if (index >= 0) {
      list[index] = dress;
    } else {
      list.push(dress);
    }
    localStorage.setItem(STORAGE_KEYS.DRESS_TYPES, JSON.stringify(list));
    this.notify();
    return dress;
  }

  public deleteDressType(id: string): void {
    this.requireRole('admin');
    const list = this.getDressTypes().filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.DRESS_TYPES, JSON.stringify(list));
    this.notify();
  }

  // --- Invoices ---
  public getInvoices(): Invoice[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
      return data ? JSON.parse(data) : INITIAL_INVOICES;
    } catch {
      return INITIAL_INVOICES;
    }
  }

  public saveInvoice(invoice: Invoice): Invoice {
    this.requireRole('admin');
    const list = this.getInvoices();
    const index = list.findIndex((i) => i.id === invoice.id);
    if (index >= 0) {
      list[index] = invoice;
    } else {
      list.unshift(invoice); // Newest at top
    }
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(list));

    // Update customer stats
    this.updateCustomerAggregates(invoice.customerId);
    this.notify();
    return invoice;
  }

  public getNextInvoiceNumber(): string {
    const settings = this.getSettings();
    const prefix = settings.invoicePrefix !== undefined ? settings.invoicePrefix : 'No. ';
    const seq = settings.nextInvoiceSequence || 51112;
    const formatted = `${prefix}${seq}`;
    // Increment settings sequence
    settings.nextInvoiceSequence = seq + 1;
    this.saveSettings(settings);
    return formatted;
  }

  public updateOrderStatus(
    invoiceId: string,
    newStatus: OrderStatus,
    updatedBy: string,
    note?: string
  ): Invoice | null {
    // Both admin and staff can update status, but staff is strictly restricted to 'In Progress' or 'Ready for Pickup'
    const session = this.getSession();
    if (!session || !session.token) {
      throw new Error('Authentication required: Cannot update status without an active session.');
    }
    if (session.role === 'staff' && newStatus !== 'In Progress' && newStatus !== 'Ready for Pickup') {
      throw new Error('Access denied: Staff can only transition orders to "In Progress" or "Ready for Pickup".');
    }

    const list = this.getInvoices();
    const inv = list.find((i) => i.id === invoiceId);
    if (!inv) return null;

    inv.status = newStatus;
    inv.statusHistory.push({
      status: newStatus,
      timestamp: new Date().toISOString(),
      updatedBy,
      note,
    });

    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(list));
    this.notify();
    return inv;
  }

  public recordInvoicePayment(
    invoiceId: string,
    amount: number,
    paymentMethod: 'Cash' | 'Card' | 'Other',
    recordedBy: string,
    notes?: string
  ): Invoice | null {
    this.requireRole('admin');
    const list = this.getInvoices();
    const inv = list.find((i) => i.id === invoiceId);
    if (!inv) return null;

    const safeAmount = Math.max(0, Number(amount) || 0);
    inv.amountPaid = Number((inv.amountPaid + safeAmount).toFixed(2));
    inv.remainingBalance = Number(Math.max(0, inv.total - inv.amountPaid).toFixed(2));

    if (inv.remainingBalance <= 0) {
      inv.paymentStatus = 'Paid';
    } else {
      inv.paymentStatus = 'Partial';
    }

    const paymentRecord: PaymentRecord = {
      id: `pay-${Date.now()}`,
      invoiceId,
      amount: safeAmount,
      paymentMethod,
      date: new Date().toISOString(),
      recordedBy,
      notes,
    };

    inv.paymentHistory.push(paymentRecord);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(list));

    // Update customer outstanding balance
    this.updateCustomerAggregates(inv.customerId);
    this.notify();
    return inv;
  }

  // --- Customers ---
  public getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      const list: Customer[] = data ? JSON.parse(data) : INITIAL_CUSTOMERS;
      const accounts = this.getMonthlyAccounts();
      const accountMap = new Map(accounts.map((a) => [a.id, a]));
      return list.map((c) => {
        const ma = accountMap.get(c.id);
        if (ma) {
          return {
            ...c,
            isMonthlyCustomer: ma.accountStatus !== 'Inactive',
            customerCode: ma.customerCode,
            monthlyAccountId: ma.id,
          };
        }
        return c;
      });
    } catch {
      return INITIAL_CUSTOMERS;
    }
  }

  public saveCustomer(cust: Customer): Customer {
    const list = this.getCustomers();
    const index = list.findIndex((c) => c.id === cust.id);
    if (index >= 0) {
      list[index] = cust;
    } else {
      list.push(cust);
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(list));
    this.notify();
    return cust;
  }

  public findCustomerByPhone(phone: string): Customer | undefined {
    const cleanInput = phone.replace(/[^0-9]/g, '');
    if (!cleanInput) return undefined;
    return this.getCustomers().find((c) => {
      const cleanExisting = c.phone.replace(/[^0-9]/g, '');
      return cleanExisting === cleanInput || cleanExisting.endsWith(cleanInput) || cleanInput.endsWith(cleanExisting);
    });
  }

  public getOrCreateCustomer(name: string, phone: string, address?: string): Customer {
    const existing = this.findCustomerByPhone(phone);
    if (existing) {
      // update name if provided
      if (name && existing.name !== name) {
        existing.name = name;
      }
      if (address && !existing.address) {
        existing.address = address;
      }
      this.saveCustomer(existing);
      return existing;
    }

    const newCustomer: Customer = {
      id: `cust-${Date.now()}`,
      name: name.trim() || 'Guest Customer',
      phone: phone.trim(),
      address: address?.trim() || '',
      totalInvoices: 0,
      totalSpending: 0,
      outstandingBalance: 0,
      lastVisitDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString().slice(0, 10),
    };

    return this.saveCustomer(newCustomer);
  }

  private updateCustomerAggregates(customerId: string) {
    const customers = this.getCustomers();
    const cust = customers.find((c) => c.id === customerId);
    if (!cust) return;

    const invoices = this.getInvoices().filter((inv) => inv.customerId === customerId);
    cust.totalInvoices = invoices.length;
    cust.totalSpending = Number(invoices.reduce((sum, inv) => sum + inv.total, 0).toFixed(2));
    cust.outstandingBalance = Number(
      invoices.reduce((sum, inv) => sum + inv.remainingBalance, 0).toFixed(2)
    );
    if (invoices.length > 0) {
      const sorted = [...invoices].sort((a, b) => (b.invoiceDate > a.invoiceDate ? 1 : -1));
      cust.lastVisitDate = sorted[0].invoiceDate.slice(0, 10);
    }

    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  }

  // --- Monthly Customer Accounts ---
  public getMonthlyAccounts(): MonthlyCustomerAccount[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MONTHLY_ACCOUNTS);
      return data ? JSON.parse(data) : INITIAL_MONTHLY_ACCOUNTS;
    } catch {
      return INITIAL_MONTHLY_ACCOUNTS;
    }
  }

  public getMonthlyAccountByCustomerId(customerId: string): MonthlyCustomerAccount | undefined {
    return this.getMonthlyAccounts().find((a) => a.id === customerId);
  }

  public saveMonthlyAccount(account: MonthlyCustomerAccount): MonthlyCustomerAccount {
    this.requireRole('admin');
    const list = this.getMonthlyAccounts();
    const index = list.findIndex((a) => a.id === account.id);
    account.updatedAt = new Date().toISOString();
    if (index >= 0) {
      list[index] = account;
    } else {
      list.push(account);
    }
    localStorage.setItem(STORAGE_KEYS.MONTHLY_ACCOUNTS, JSON.stringify(list));

    // Also update customer profile flag
    const customers = this.getCustomers();
    const cust = customers.find((c) => c.id === account.id);
    if (cust) {
      cust.isMonthlyCustomer = account.accountStatus !== 'Inactive';
      cust.customerCode = account.customerCode;
      cust.monthlyAccountId = account.id;
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    }

    this.notify();
    return account;
  }

  public deleteMonthlyAccount(customerId: string): void {
    this.requireRole('admin');
    const list = this.getMonthlyAccounts().filter((a) => a.id !== customerId);
    localStorage.setItem(STORAGE_KEYS.MONTHLY_ACCOUNTS, JSON.stringify(list));

    // Update customer flag
    const customers = this.getCustomers();
    const cust = customers.find((c) => c.id === customerId);
    if (cust) {
      cust.isMonthlyCustomer = false;
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    }

    this.notify();
  }

  // --- Financial Aggregates per Billing Cycle ---
  public getCustomerCycleFinancials(
    customerId: string,
    cycleStartDate: string,
    cycleEndDate: string
  ): {
    cycleInvoices: Invoice[];
    olderInvoices: Invoice[];
    totalBilled: number;
    paymentsReceivedInCycle: number;
    previousOutstandingBalance: number;
    currentCycleOutstanding: number;
    totalAmountDue: number;
  } {
    const allInvoices = this.getInvoices().filter((inv) => inv.customerId === customerId);
    const startDay = cycleStartDate.slice(0, 10);
    const endDay = cycleEndDate.slice(0, 10);

    const cycleInvoices: Invoice[] = [];
    const olderInvoices: Invoice[] = [];

    for (const inv of allInvoices) {
      const invDay = inv.invoiceDate.slice(0, 10);
      if (invDay >= startDay && invDay <= endDay) {
        cycleInvoices.push(inv);
      } else if (invDay < startDay) {
        olderInvoices.push(inv);
      }
    }

    // Sort cycle invoices newest first
    cycleInvoices.sort((a, b) => (b.invoiceDate > a.invoiceDate ? 1 : -1));

    // Cycle total billed
    const totalBilled = Number(cycleInvoices.reduce((sum, inv) => sum + inv.total, 0).toFixed(2));
    const currentCycleOutstanding = Number(
      cycleInvoices.reduce((sum, inv) => sum + inv.remainingBalance, 0).toFixed(2)
    );
    const paymentsReceivedInCycle = Number((totalBilled - currentCycleOutstanding).toFixed(2));

    // Older outstanding balance from previous cycles
    const previousOutstandingBalance = Number(
      olderInvoices.reduce((sum, inv) => sum + inv.remainingBalance, 0).toFixed(2)
    );

    const totalAmountDue = Number(
      (previousOutstandingBalance + currentCycleOutstanding).toFixed(2)
    );

    return {
      cycleInvoices,
      olderInvoices,
      totalBilled,
      paymentsReceivedInCycle,
      previousOutstandingBalance,
      currentCycleOutstanding,
      totalAmountDue,
    };
  }

  // --- Account Payment Allocation & Ledger ---
  public getAccountPayments(customerId?: string): AccountPaymentRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MONTHLY_PAYMENTS);
      const list: AccountPaymentRecord[] = data ? JSON.parse(data) : [];
      if (customerId) {
        return list.filter((p) => p.customerId === customerId);
      }
      return list;
    } catch {
      return [];
    }
  }

  public recordCustomerAccountPayment(
    customerId: string,
    amount: number,
    paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'Other',
    recordedBy: string,
    targetInvoiceId?: string,
    notes?: string
  ): AccountPaymentRecord {
    this.requireRole('admin');
    const safeAmount = Math.max(0, Number(amount) || 0);
    if (safeAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    const customers = this.getCustomers();
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) {
      throw new Error('Customer not found.');
    }

    const monthlyAccount = this.getMonthlyAccountByCustomerId(customerId);
    const customerCode = monthlyAccount?.customerCode || customer.customerCode || 'MC';

    const allocations: Array<{ invoiceId: string; invoiceNumber: string; allocatedAmount: number }> = [];
    const allInvoices = this.getInvoices();

    if (targetInvoiceId && targetInvoiceId !== 'account_balance') {
      // Specific invoice payment
      const invoice = allInvoices.find((i) => i.id === targetInvoiceId && i.customerId === customerId);
      if (!invoice) {
        throw new Error('Specified invoice not found for this customer.');
      }
      const payableOnInvoice = Math.min(safeAmount, invoice.remainingBalance);
      this.recordInvoicePayment(
        invoice.id,
        payableOnInvoice,
        paymentMethod === 'Bank Transfer' ? 'Other' : paymentMethod,
        recordedBy,
        notes || 'Monthly account invoice payment'
      );
      allocations.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        allocatedAmount: payableOnInvoice,
      });
    } else {
      // Allocate across unpaid invoices: Oldest first
      const unpaidInvoices = allInvoices
        .filter((inv) => inv.customerId === customerId && inv.remainingBalance > 0)
        .sort((a, b) => (a.invoiceDate > b.invoiceDate ? 1 : -1));

      let remainingToAllocate = safeAmount;

      for (const invoice of unpaidInvoices) {
        if (remainingToAllocate <= 0) break;
        const alloc = Math.min(remainingToAllocate, invoice.remainingBalance);
        this.recordInvoicePayment(
          invoice.id,
          alloc,
          paymentMethod === 'Bank Transfer' ? 'Other' : paymentMethod,
          recordedBy,
          notes || 'Account balance settlement'
        );
        allocations.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          allocatedAmount: alloc,
        });
        remainingToAllocate = Number((remainingToAllocate - alloc).toFixed(2));
      }
    }

    // Save persistent payment record in account payment ledger
    const paymentRecord: AccountPaymentRecord = {
      id: `accpay-${Date.now()}`,
      customerId,
      customerCode,
      amount: safeAmount,
      paymentMethod,
      date: new Date().toISOString(),
      recordedBy,
      targetInvoiceId,
      notes,
      allocations,
      createdAt: new Date().toISOString(),
    };

    const paymentsList = this.getAccountPayments();
    paymentsList.unshift(paymentRecord);
    localStorage.setItem(STORAGE_KEYS.MONTHLY_PAYMENTS, JSON.stringify(paymentsList));

    this.updateCustomerAggregates(customerId);
    this.notify();
    return paymentRecord;
  }

  // --- Monthly Statements ---
  public getMonthlyStatements(customerId?: string): MonthlyStatement[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MONTHLY_STATEMENTS);
      const list: MonthlyStatement[] = data ? JSON.parse(data) : [];
      if (customerId) {
        return list.filter((s) => s.customerId === customerId);
      }
      return list;
    } catch {
      return [];
    }
  }

  public getStatementById(statementId: string): MonthlyStatement | undefined {
    return this.getMonthlyStatements().find((s) => s.id === statementId);
  }

  public saveMonthlyStatement(statement: MonthlyStatement): MonthlyStatement {
    this.requireRole('admin');
    const list = this.getMonthlyStatements();
    const index = list.findIndex((s) => s.id === statement.id);
    if (index >= 0) {
      list[index] = statement;
    } else {
      list.unshift(statement);
    }
    localStorage.setItem(STORAGE_KEYS.MONTHLY_STATEMENTS, JSON.stringify(list));
    this.notify();
    return statement;
  }

  public generateMonthlyStatement(
    customerId: string,
    cycleStartDate?: string,
    cycleEndDate?: string
  ): MonthlyStatement {
    this.requireRole('admin');
    const customer = this.getCustomers().find((c) => c.id === customerId);
    if (!customer) {
      throw new Error('Customer not found.');
    }

    const monthlyAccount = this.getMonthlyAccountByCustomerId(customerId);
    const cycleStartDay = monthlyAccount?.cycleStartDay || 1;
    const computedCycle = getCustomerBillingCycle(cycleStartDay);

    const start = cycleStartDate || computedCycle.currentCycle.startDate;
    const end = cycleEndDate || computedCycle.currentCycle.endDate;

    const financials = this.getCustomerCycleFinancials(customerId, start, end);
    const statementNumber = generateStatementNumber(
      monthlyAccount?.customerCode || customer.customerCode || 'MC',
      end
    );

    const invoiceSummaries: StatementInvoiceSummary[] = financials.cycleInvoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      itemsSummary: inv.items.map((it) => `${it.dressTypeName} x${it.quantity}`).join(', '),
      total: inv.total,
      amountPaid: inv.amountPaid,
      remainingBalance: inv.remainingBalance,
      paymentStatus: inv.paymentStatus,
    }));

    // Check if statement already generated for this cycle
    const existingStatements = this.getMonthlyStatements(customerId);
    const existing = existingStatements.find(
      (s) => s.cycleStartDate === start && s.cycleEndDate === end
    );

    const statement: MonthlyStatement = {
      id: existing ? existing.id : `stmt-${Date.now()}`,
      statementNumber: existing ? existing.statementNumber : statementNumber,
      customerId,
      customerCode: monthlyAccount?.customerCode || customer.customerCode || 'MC-100',
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      whatsappNumber: monthlyAccount?.whatsappNumber || customer.phone,
      cycleStartDate: start,
      cycleEndDate: end,
      periodLabel: `${formatDubaiDateDisplay(start)} – ${formatDubaiDateDisplay(end)}`,
      generationDate: new Date().toISOString(),
      invoices: invoiceSummaries,
      totalBilled: financials.totalBilled,
      paymentsReceivedInCycle: financials.paymentsReceivedInCycle,
      previousOutstandingBalance: financials.previousOutstandingBalance,
      currentCycleOutstanding: financials.currentCycleOutstanding,
      totalAmountDue: financials.totalAmountDue,
      status: financials.totalAmountDue <= 0 ? 'Finalized' : 'Finalized',
      deliveryStatus: existing ? existing.deliveryStatus : 'Pending',
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
    };

    return this.saveMonthlyStatement(statement);
  }

  // --- WhatsApp Schedule & Delivery Logs ---
  public getWhatsAppLogs(customerId?: string): WhatsAppDeliveryLog[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WHATSAPP_LOGS);
      const list: WhatsAppDeliveryLog[] = data ? JSON.parse(data) : [];
      if (customerId) {
        return list.filter((l) => l.customerId === customerId);
      }
      return list;
    } catch {
      return [];
    }
  }

  public saveWhatsAppLog(log: WhatsAppDeliveryLog): WhatsAppDeliveryLog {
    this.requireRole('admin');
    const list = this.getWhatsAppLogs();
    const index = list.findIndex((l) => l.id === log.id);
    if (index >= 0) {
      list[index] = log;
    } else {
      list.unshift(log);
    }
    localStorage.setItem(STORAGE_KEYS.WHATSAPP_LOGS, JSON.stringify(list));
    this.notify();
    return log;
  }

  public updateWhatsAppLog(id: string, updates: Partial<WhatsAppDeliveryLog>): WhatsAppDeliveryLog | null {
    this.requireRole('admin');
    const list = this.getWhatsAppLogs();
    const index = list.findIndex((l) => l.id === id);
    if (index < 0) return null;

    list[index] = {
      ...list[index],
      ...updates,
    };

    localStorage.setItem(STORAGE_KEYS.WHATSAPP_LOGS, JSON.stringify(list));
    this.notify();
    return list[index];
  }

  // --- Expenses ---
  public getExpenses(): Expense[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return data ? JSON.parse(data) : INITIAL_EXPENSES;
    } catch {
      return INITIAL_EXPENSES;
    }
  }

  public saveExpense(expense: Expense): Expense {
    this.requireRole('admin');
    const list = this.getExpenses();
    const index = list.findIndex((e) => e.id === expense.id);
    if (index >= 0) {
      list[index] = expense;
    } else {
      list.unshift(expense);
    }
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(list));
    this.notify();
    return expense;
  }

  public deleteExpense(id: string): void {
    this.requireRole('admin');
    const list = this.getExpenses().filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(list));
    try {
      deleteReceiptImage(id);
    } catch {
      // ignore
    }
    this.notify();
  }

  // --- Settings ---
  public getSettings(): BusinessSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...INITIAL_SETTINGS,
          ...parsed,
        };
      }
      return INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  }

  public saveSettings(settings: BusinessSettings): BusinessSettings {
    this.requireRole('admin');
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    this.notify();
    return settings;
  }

  // --- Users & Auth ---
  public getUsers(): UserAccount[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      return data ? JSON.parse(data) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  }

  public saveUser(user: UserAccount): UserAccount {
    this.requireRole('admin');
    const list = this.getUsers();
    const index = list.findIndex((u) => u.id === user.id);
    if (index >= 0) {
      list[index] = user;
    } else {
      list.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(list));
    this.notify();
    return user;
  }

  public getCurrentUser(): UserAccount {
    try {
      const session = this.getSession();
      if (session && this.validateSession(session)) {
        const found = this.getUsers().find((u) => u.id === session.userId);
        if (found) return found;
        return {
          id: session.userId,
          name: session.userName,
          role: session.role,
          designation: session.designation,
          active: true,
        };
      }
      // Return guest representation when not authenticated
      return {
        id: 'usr-guest',
        name: 'Guest User',
        role: 'staff',
        designation: 'Unauthenticated',
        active: false,
      };
    } catch {
      return {
        id: 'usr-guest',
        name: 'Guest User',
        role: 'staff',
        designation: 'Unauthenticated',
        active: false,
      };
    }
  }

  public setCurrentUser(user: UserAccount): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    this.notify();
  }

  // --- Session & Portal PIN Verification ---
  public getSession(): PortalSession | null {
    if (typeof sessionStorage === 'undefined') return null;
    try {
      const data = sessionStorage.getItem(STORAGE_KEYS.SESSION);
      if (data) {
        const parsed: PortalSession = JSON.parse(data);
        if (this.validateSession(parsed)) {
          return parsed;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  public validateSession(session: PortalSession | null): boolean {
    if (!session || !session.token || !session.role) {
      return false;
    }
    return session.role === 'admin' || session.role === 'staff';
  }

  public setSession(session: PortalSession | null): void {
    if (typeof sessionStorage === 'undefined') return;
    if (session && this.validateSession(session)) {
      sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
      // Sync currentUser
      const user = this.getUsers().find((u) => u.id === session.userId);
      if (user) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
      }
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.SESSION);
    }
    this.notify();
  }

  public logout(): void {
    this.setSession(null);
  }

  /**
   * Prototype PIN Verification with simulated realistic network delay.
   * Matches configured PINs in Settings (default Admin: 1234, Staff: 4321).
   */
  public async verifyPin(
    pin: string
  ): Promise<{ success: boolean; role?: 'admin' | 'staff'; user?: UserAccount; error?: string }> {
    const cleanPin = pin.trim();
    if (!cleanPin || cleanPin.length !== 4) {
      return { success: false, error: 'Please enter a 4-digit PIN.' };
    }

    // Simulated network authentication latency
    await new Promise((resolve) => setTimeout(resolve, 150));

    const settings = this.getSettings();
    const adminPin = (settings.adminPin || '1234').trim();
    const staffPin = (settings.staffPin || '4321').trim();

    const users = this.getUsers();

    if (cleanPin === adminPin) {
      const adminUser = users.find((u) => u.role === 'admin') || users[0];
      const session: PortalSession = {
        role: 'admin',
        userId: adminUser.id,
        userName: adminUser.name,
        designation: adminUser.designation,
        loginTime: new Date().toISOString(),
        token: `wwl-session-admin-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      };
      this.setSession(session);
      return { success: true, role: 'admin', user: adminUser };
    }

    if (cleanPin === staffPin) {
      // ONE unified shared staff session for all floor staff members
      const sharedStaffUser: UserAccount = {
        id: 'usr-shared-staff',
        name: 'Floor Operations Staff',
        role: 'staff',
        pin: staffPin,
        designation: 'Floor Processing & Tracking',
        active: true,
      };
      const session: PortalSession = {
        role: 'staff',
        userId: sharedStaffUser.id,
        userName: sharedStaffUser.name,
        designation: sharedStaffUser.designation,
        loginTime: new Date().toISOString(),
        token: `wwl-session-staff-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      };
      this.setSession(session);
      return { success: true, role: 'staff', user: sharedStaffUser };
    }

    return {
      success: false,
      error: 'Invalid PIN. Please try again.',
    };
  }

  // --- Reset to Initial Seed Data ---
  public resetToDefaultSeed(): void {
    localStorage.setItem(STORAGE_KEYS.DRESS_TYPES, JSON.stringify(INITIAL_DRESS_TYPES));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(INITIAL_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(INITIAL_CUSTOMERS));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(INITIAL_INVOICES));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
    localStorage.setItem(STORAGE_KEYS.MONTHLY_ACCOUNTS, JSON.stringify(INITIAL_MONTHLY_ACCOUNTS));
    localStorage.removeItem(STORAGE_KEYS.MONTHLY_STATEMENTS);
    localStorage.removeItem(STORAGE_KEYS.MONTHLY_PAYMENTS);
    localStorage.removeItem(STORAGE_KEYS.WHATSAPP_LOGS);
    this.logout();
    this.notify();
  }
}

export const storage = new StorageService();
