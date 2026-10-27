export type ServiceType =
  | 'Normal Wash'
  | 'Dry Cleaning'
  | 'Only Pressing'
  | 'Only Wash'
  // Legacy aliases for backward compatibility
  | 'Washing + Ironing'
  | 'Washing Only'
  | 'Pressing Only';

export const SERVICE_TYPES: ServiceType[] = [
  'Normal Wash',
  'Dry Cleaning',
  'Only Pressing',
  'Only Wash',
];

export interface DressType {
  id: string;
  name: string;
  category: 'Men' | 'Women' | 'Household' | 'Traditional UAE' | 'General';
  prices: Record<ServiceType, number>;
  isActive: boolean;
  notes?: string;
  unverifiedServices?: ServiceType[];
  rateType?: 'fixed' | 'size' | 'meter' | 'quote';
}

export interface InvoiceItem {
  id: string;
  dressTypeId: string;
  dressTypeName: string;
  service: ServiceType;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  specialInstructions?: string;
}

export type OrderStatus = 'Received' | 'In Progress' | 'Ready for Pickup' | 'Delivered';

export interface StatusHistoryEntry {
  status: OrderStatus;
  timestamp: string; // ISO string or formatted Dubai time
  updatedBy: string;
  note?: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: 'Cash' | 'Card' | 'Other';
  date: string;
  recordedBy: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  remainingBalance: number;
  paymentMethod: 'Cash' | 'Card' | 'Other';
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  invoiceDate: string; // YYYY-MM-DDTHH:mm
  expectedDeliveryDate: string; // YYYY-MM-DD
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  paymentHistory: PaymentRecord[];
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalInvoices: number;
  totalSpending: number;
  outstandingBalance: number;
  lastVisitDate: string;
  createdAt: string;
  isMonthlyCustomer?: boolean;
  customerCode?: string;
  monthlyAccountId?: string;
}

export type ExpenseCategory =
  | 'Rent'
  | 'Staff Salaries'
  | 'Electricity & Water'
  | 'Detergents & Chemicals'
  | 'Delivery & Fuel'
  | 'Maintenance & Repairs'
  | 'Packaging & Hangers'
  | 'Other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Rent',
  'Staff Salaries',
  'Electricity & Water',
  'Detergents & Chemicals',
  'Delivery & Fuel',
  'Maintenance & Repairs',
  'Packaging & Hangers',
  'Other',
];

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod: 'Cash' | 'Card' | 'Other';
  recordedBy: string;
  createdAt: string;
  receiptImageUrl?: string;
  receiptImageId?: string;
}

export type UserRole = 'admin' | 'staff';

export interface UserAccount {
  id: string;
  name: string;
  role: UserRole;
  pin?: string;
  designation: string;
  active: boolean;
}

export interface PortalSession {
  role: UserRole;
  userId: string;
  userName: string;
  designation: string;
  loginTime: string;
  token: string;
}

export interface BusinessSettings {
  businessName: string;
  businessType: string; // e.g. "Laundry Shop"
  tagline: string;
  branch: string;
  address: string;
  phone: string; // Landline Telephone
  mobile: string; // Mobile / WhatsApp
  poBox: string; // P.O. Box
  email: string;
  trnNumber: string; // UAE Tax Registration Number
  invoicePrefix: string;
  nextInvoiceSequence: number;
  currency: string;
  timezone: string;
  expressServiceAvailable: boolean;
  expressServiceText: string;
  freeDeliveryAvailable: boolean;
  freeDeliveryText: string;
  rulesAndRegulations: string[];
  customerNotice: string;
  thankYouMessage: string;
  defaultPrintCopy: 'both' | 'customer' | 'merchant';
  adminPin?: string;
  staffPin?: string;
  logoUrl?: string;
}

export type MonthlyAccountStatus = 'Active' | 'Paused' | 'Inactive';

export interface MonthlyCustomerAccount {
  id: string; // matches Customer.id
  customerCode: string; // e.g. "MC-101"
  cycleStartDay: number; // 1 to 28 (e.g. 1 means 1st to 30th/31st; 15 means 15th to 14th of next month)
  whatsappNumber: string; // e.g. "+971507891234"
  accountStatus: MonthlyAccountStatus;
  scheduledSendTime: string; // "09:00" in Asia/Dubai
  autoSendWhatsApp: boolean;
  requireAdminApproval: boolean;
  nextBillingDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatementInvoiceSummary {
  id: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO or YYYY-MM-DDTHH:mm
  itemsSummary: string; // e.g. "KANDURA x3, SHIRT x2"
  total: number;
  amountPaid: number;
  remainingBalance: number;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
}

export interface MonthlyStatement {
  id: string; // "stmt-..."
  statementNumber: string; // "STMT-YYYY-MM-MCXXX"
  customerId: string;
  customerCode: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  whatsappNumber: string;
  cycleStartDate: string; // "YYYY-MM-DD"
  cycleEndDate: string; // "YYYY-MM-DD"
  periodLabel: string; // e.g. "15 Sep 2026 – 14 Oct 2026"
  generationDate: string; // ISO string
  invoices: StatementInvoiceSummary[];
  totalBilled: number;
  paymentsReceivedInCycle: number;
  previousOutstandingBalance: number;
  currentCycleOutstanding: number;
  totalAmountDue: number; // previousOutstandingBalance + currentCycleOutstanding
  status: 'Draft' | 'Finalized' | 'Sent' | 'Overdue';
  deliveryStatus: 'Pending' | 'Scheduled' | 'Awaiting Approval' | 'Sent' | 'Failed' | 'Not Configured';
  deliveryNotes?: string;
  sentAt?: string;
  createdAt: string;
}

export interface AccountPaymentAllocation {
  invoiceId: string;
  invoiceNumber: string;
  allocatedAmount: number;
}

export interface AccountPaymentRecord {
  id: string;
  customerId: string;
  customerCode: string;
  amount: number;
  paymentMethod: 'Cash' | 'Card' | 'Bank Transfer' | 'Other';
  date: string; // ISO string
  recordedBy: string;
  targetInvoiceId?: string; // specific invoice ID or 'account_balance'
  targetInvoiceNumber?: string;
  notes?: string;
  allocations: AccountPaymentAllocation[];
  createdAt: string;
}

export interface WhatsAppDeliveryLog {
  id: string;
  statementId: string;
  statementNumber: string;
  customerId: string;
  customerName: string;
  customerCode: string;
  whatsappNumber: string;
  statementPeriod: string;
  totalAmountDue: number;
  scheduledTime: string; // ISO string in Asia/Dubai
  attemptedAt?: string;
  status: 'Scheduled' | 'Awaiting Approval' | 'Sent' | 'Failed' | 'Not Configured';
  providerResponse?: string;
  errorMessage?: string;
  retriesCount: number;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

