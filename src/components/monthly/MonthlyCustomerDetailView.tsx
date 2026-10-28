import React, { useState, useEffect, useMemo } from 'react';
import {
  Customer,
  MonthlyCustomerAccount,
  Invoice,
  BusinessSettings,
  MonthlyStatement,
  AccountPaymentRecord,
  WhatsAppDeliveryLog,
  UserAccount,
} from '../../types';
import { storage } from '../../services/storage';
import { formatAED } from '../../utils/calculations';
import {
  getCustomerBillingCycle,
  formatDubaiDateDisplay,
  getDubaiDate,
} from '../../utils/billingCycle';
import {
  checkWhatsAppApiStatus,
  sendStatementViaWhatsApp,
  formatStatementWhatsAppMessage,
} from '../../services/whatsappService';
import { PrintInvoiceModal } from '../invoice/PrintInvoiceModal';
import { StatementPrintModal } from './StatementPrintModal';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Phone,
  MapPin,
  CreditCard,
  Receipt,
  FileText,
  Share2,
  Printer,
  Plus,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  ShieldAlert,
  Edit2,
  Check,
  ChevronRight,
  FileCheck,
  Eye,
  ShieldCheck,
  X,
} from 'lucide-react';
import { CustomerProofUpload } from './CustomerProofUpload';
import { saveCustomerProof, deleteCustomerProof } from '../../services/customerProofStorage';

interface MonthlyCustomerDetailViewProps {
  customerId: string;
  settings: BusinessSettings;
  currentUser: UserAccount;
  onBack: () => void;
}

export const MonthlyCustomerDetailView: React.FC<MonthlyCustomerDetailViewProps> = ({
  customerId,
  settings,
  currentUser,
  onBack,
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [account, setAccount] = useState<MonthlyCustomerAccount | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<AccountPaymentRecord[]>([]);
  const [statements, setStatements] = useState<MonthlyStatement[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppDeliveryLog[]>([]);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'statements' | 'whatsapp'>('invoices');

  // Cycle selection: 'current' | 'previous' | 'all'
  const [selectedCycleMode, setSelectedCycleMode] = useState<'current' | 'previous' | 'all'>('current');

  // Modals state
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);
  const [selectedStatementForPrint, setSelectedStatementForPrint] = useState<MonthlyStatement | null>(null);
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [isEditCycleModalOpen, setIsEditCycleModalOpen] = useState(false);

  // Record Payment form state
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Bank Transfer' | 'Other'>('Cash');
  const [paymentTargetInvoiceId, setPaymentTargetInvoiceId] = useState<string>('account_balance');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Edit Cycle form state
  const [editCycleStartDay, setEditCycleStartDay] = useState<number>(1);
  const [editAccountStatus, setEditAccountStatus] = useState<'Active' | 'Paused' | 'Inactive'>('Active');
  const [editWhatsappNumber, setEditWhatsappNumber] = useState<string>('');
  const [editScheduledTime, setEditScheduledTime] = useState<string>('09:00');
  const [editAutoSend, setEditAutoSend] = useState<boolean>(true);
  const [editRequireApproval, setEditRequireApproval] = useState<boolean>(false);
  const [editProofDataUrl, setEditProofDataUrl] = useState<string | null>(null);
  const [editProofFileName, setEditProofFileName] = useState<string | null>(null);
  const [editProofFileType, setEditProofFileType] = useState<string | null>(null);
  const [isBannerProofPreviewOpen, setIsBannerProofPreviewOpen] = useState<boolean>(false);

  // WhatsApp API status state
  const [apiStatus, setApiStatus] = useState<{
    configured: boolean;
    statusText: string;
    missingKeys: string[];
  }>({
    configured: false,
    statusText: 'Checking...',
    missingKeys: [],
  });

  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load data
  const loadData = () => {
    const cust = storage.getCustomers().find((c) => c.id === customerId);
    setCustomer(cust || null);

    const acc = storage.getMonthlyAccountByCustomerId(customerId);
    setAccount(acc || null);
    if (acc) {
      setEditCycleStartDay(acc.cycleStartDay);
      setEditAccountStatus(acc.accountStatus);
      setEditWhatsappNumber(acc.whatsappNumber);
      setEditScheduledTime(acc.scheduledSendTime);
      setEditAutoSend(acc.autoSendWhatsApp);
      setEditRequireApproval(acc.requireAdminApproval);
      setEditProofDataUrl(acc.proofDocumentUrl || cust?.proofDocumentUrl || null);
      setEditProofFileName(acc.proofDocumentName || cust?.proofDocumentName || null);
      setEditProofFileType(acc.proofDocumentType || cust?.proofDocumentType || null);
    } else if (cust) {
      setEditProofDataUrl(cust.proofDocumentUrl || null);
      setEditProofFileName(cust.proofDocumentName || null);
      setEditProofFileType(cust.proofDocumentType || null);
    }

    setInvoices(storage.getInvoices().filter((inv) => inv.customerId === customerId));
    setPayments(storage.getAccountPayments(customerId));
    setStatements(storage.getMonthlyStatements(customerId));
    setWhatsappLogs(storage.getWhatsAppLogs(customerId));
  };

  useEffect(() => {
    loadData();
    checkWhatsAppApiStatus().then((res) => {
      setApiStatus({
        configured: res.configured,
        statusText: res.statusText,
        missingKeys: res.missingKeys,
      });
    });

    return storage.subscribe(loadData);
  }, [customerId]);

  // Billing cycle computations
  const cycleInfo = useMemo(() => {
    const startDay = account?.cycleStartDay || 1;
    return getCustomerBillingCycle(startDay);
  }, [account?.cycleStartDay]);

  // Current active date range based on cycle selector
  const activeCycleRange = useMemo(() => {
    if (selectedCycleMode === 'previous') {
      return cycleInfo.previousCycle;
    }
    return cycleInfo.currentCycle;
  }, [selectedCycleMode, cycleInfo]);

  // Financial aggregates for active cycle
  const financials = useMemo(() => {
    return storage.getCustomerCycleFinancials(
      customerId,
      activeCycleRange.startDate,
      activeCycleRange.endDate
    );
  }, [customerId, activeCycleRange.startDate, activeCycleRange.endDate, invoices]);

  // Filtered invoices according to selected cycle mode
  const displayedInvoices = useMemo(() => {
    if (selectedCycleMode === 'all') {
      return [...invoices].sort((a, b) => (b.invoiceDate > a.invoiceDate ? 1 : -1));
    }
    return financials.cycleInvoices;
  }, [selectedCycleMode, invoices, financials.cycleInvoices]);

  // Handle Record Payment
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(paymentAmount);
    if (!amountNum || amountNum <= 0) {
      setPaymentError('Please enter a valid amount greater than 0.');
      return;
    }

    try {
      storage.recordCustomerAccountPayment(
        customerId,
        amountNum,
        paymentMethod,
        `${currentUser.name} (${currentUser.role})`,
        paymentTargetInvoiceId,
        paymentNotes
      );

      setNotificationMsg({
        text: `Payment of ${formatAED(amountNum)} recorded successfully!`,
        type: 'success',
      });
      setIsRecordPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentError(null);
      loadData();
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to record payment.');
    }
  };

  // Handle Save Cycle Settings
  const handleSaveCycleSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    try {
      const updatedCycle = getCustomerBillingCycle(editCycleStartDay);

      const updatedAccount: MonthlyCustomerAccount = {
        ...account,
        cycleStartDay: editCycleStartDay,
        accountStatus: editAccountStatus,
        whatsappNumber: editWhatsappNumber.trim() || customer?.phone || '',
        scheduledSendTime: editScheduledTime,
        autoSendWhatsApp: editAutoSend,
        requireAdminApproval: editRequireApproval,
        nextBillingDate: updatedCycle.nextBillingDate,
        proofDocumentUrl: editProofDataUrl || undefined,
        proofDocumentName: editProofFileName || undefined,
        proofDocumentType: editProofFileType || undefined,
        proofDocumentUploadedAt: editProofDataUrl ? (account.proofDocumentUploadedAt || new Date().toISOString()) : undefined,
      };

      storage.saveMonthlyAccount(updatedAccount);
      if (editProofDataUrl) {
        saveCustomerProof(customerId, editProofDataUrl, editProofFileName || 'proof.jpg', editProofFileType || 'image/jpeg');
      } else {
        deleteCustomerProof(customerId);
      }
      setNotificationMsg({
        text: 'Monthly account settings updated successfully.',
        type: 'success',
      });
      setIsEditCycleModalOpen(false);
      loadData();
    } catch (err: any) {
      setNotificationMsg({
        text: err.message || 'Failed to update settings.',
        type: 'error',
      });
    }
  };

  // Handle Generate Statement
  const handleGenerateStatement = () => {
    try {
      const stmt = storage.generateMonthlyStatement(
        customerId,
        activeCycleRange.startDate,
        activeCycleRange.endDate
      );
      setNotificationMsg({
        text: `Statement ${stmt.statementNumber} generated successfully!`,
        type: 'success',
      });
      loadData();
      setSelectedStatementForPrint(stmt);
    } catch (err: any) {
      setNotificationMsg({
        text: err.message || 'Failed to generate statement.',
        type: 'error',
      });
    }
  };

  // Handle Send Statement via WhatsApp
  const handleDispatchWhatsApp = async (stmt: MonthlyStatement) => {
    setIsProcessing(true);
    setNotificationMsg(null);

    try {
      const result = await sendStatementViaWhatsApp(stmt, settings, account || undefined);

      // Record log in persistent storage
      const logEntry: WhatsAppDeliveryLog = {
        id: `walog-${Date.now()}`,
        statementId: stmt.id,
        statementNumber: stmt.statementNumber,
        customerId,
        customerName: stmt.customerName,
        customerCode: stmt.customerCode,
        whatsappNumber: account?.whatsappNumber || stmt.whatsappNumber,
        statementPeriod: stmt.periodLabel,
        totalAmountDue: stmt.totalAmountDue,
        scheduledTime: new Date().toISOString(),
        attemptedAt: new Date().toISOString(),
        status: result.status,
        providerResponse: result.providerResponse || (result.messageId ? `Message ID: ${result.messageId}` : undefined),
        errorMessage: result.error,
        retriesCount: 0,
        approvedBy: currentUser.name,
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };

      storage.saveWhatsAppLog(logEntry);

      // Update statement delivery status
      stmt.deliveryStatus = result.status;
      if (result.success) {
        stmt.sentAt = new Date().toISOString();
        stmt.status = 'Sent';
      }
      storage.saveMonthlyStatement(stmt);

      if (result.status === 'Sent') {
        setNotificationMsg({
          text: `Statement ${stmt.statementNumber} sent successfully via Meta WhatsApp Business API!`,
          type: 'success',
        });
      } else if (result.status === 'Not Configured') {
        setNotificationMsg({
          text: 'Notice: WhatsApp Business Cloud API is not yet configured in server environment. Delivery logged as Not Configured.',
          type: 'error',
        });
      } else {
        setNotificationMsg({
          text: `WhatsApp delivery failed: ${result.error || 'Provider rejected request'}.`,
          type: 'error',
        });
      }

      loadData();
    } catch (err: any) {
      setNotificationMsg({
        text: `Error sending WhatsApp message: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!customer) {
    return (
      <div className="p-6 text-center space-y-4">
        <p className="text-xs text-[#5A696D]">Customer not found.</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 bg-[#006D77] text-white text-xs font-bold rounded-xl"
        >
          Return to Customer List
        </button>
      </div>
    );
  }

  const unpaidInvoices = invoices.filter((i) => i.remainingBalance > 0);

  return (
    <div className="space-y-3.5 pb-8">
      {/* Notifications */}
      {notificationMsg && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between shadow-2xs ${
            notificationMsg.type === 'success'
              ? 'bg-[#E6F5F8] border-[#BDE7EF] text-[#006D77]'
              : 'bg-[#FDF0F0] border-[#F8C3C3] text-[#A32727]'
          }`}
        >
          <div className="flex items-center gap-2">
            {notificationMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="font-semibold">{notificationMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotificationMsg(null)}
            className="p-1 font-bold cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Top Customer Account Banner */}
      <div className="bg-white rounded-2xl p-4 border border-[#D4E7EC] shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-xl bg-[#F4FAFB] hover:bg-[#E5EFF1] text-[#006D77] transition cursor-pointer"
              aria-label="Back to Monthly Customers"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-extrabold text-[#202729] tracking-tight">
                  {customer.name}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#E6F5F8] text-[#006D77] border border-[#BDE7EF]">
                  {account?.customerCode || customer.customerCode || 'MC-100'}
                </span>
              </div>
              <p className="text-[11px] text-[#5A6B70] flex items-center gap-2 mt-0.5">
                <span>{customer.phone}</span>
                {customer.address && <span>• {customer.address}</span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                account?.accountStatus === 'Active'
                  ? 'bg-[#E6F8EE] text-[#147D42] border border-[#B3E8C8]'
                  : account?.accountStatus === 'Paused'
                  ? 'bg-[#FFF7E6] text-[#A66908] border border-[#FFE1A6]'
                  : 'bg-[#F4FAFB] text-[#5A696D] border border-[#DDE8EA]'
              }`}
            >
              {account?.accountStatus || 'Active'}
            </span>
            <button
              type="button"
              onClick={() => setIsEditCycleModalOpen(true)}
              className="p-1.5 rounded-xl bg-[#F4FAFB] hover:bg-[#E5EFF1] text-[#5A696D] hover:text-[#006D77] border border-[#DDE8EA] transition cursor-pointer"
              title="Edit Billing Cycle & Proof Document"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Customer Proof Document Row in Banner */}
        <div className="pt-2 border-t border-[#D4E7EC] flex flex-wrap items-center justify-between gap-2 text-xs">
          {(account?.proofDocumentUrl || customer?.proofDocumentUrl) ? (
            <div className="flex items-center gap-2.5 bg-[#F4FAFB] px-3 py-1.5 rounded-xl border border-[#DDE8EA] w-full sm:w-auto">
              <div
                onClick={() => setIsBannerProofPreviewOpen(true)}
                className="w-7 h-7 rounded-lg overflow-hidden bg-white border border-[#D4E7EC] shrink-0 cursor-pointer shadow-2xs"
                title="Click to view full proof document"
              >
                <img
                  src={account?.proofDocumentUrl || customer?.proofDocumentUrl}
                  alt="Proof Document"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-[11px] text-[#202729] flex items-center gap-1">
                  <FileCheck className="w-3 h-3 text-[#006D77]" />
                  <span>{account?.proofDocumentName || customer?.proofDocumentName || 'Verification Proof'}</span>
                </span>
                <span className="text-[10px] text-[#5A6B70] block">
                  Private Document on File
                </span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
                <button
                  type="button"
                  onClick={() => setIsBannerProofPreviewOpen(true)}
                  className="px-2 py-0.5 bg-white hover:bg-[#E6F5F8] text-[#006D77] text-[10px] font-bold rounded-lg border border-[#BDE7EF] transition cursor-pointer"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditCycleModalOpen(true)}
                  className="px-2 py-0.5 bg-white hover:bg-[#E6F5F8] text-[#5A696D] text-[10px] font-bold rounded-lg border border-[#D4E7EC] transition cursor-pointer"
                >
                  Manage
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full bg-[#F4FAFB] px-3 py-1.5 rounded-xl border border-[#DDE8EA]">
              <span className="text-[11px] text-[#5A696D] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#5A696D]" />
                <span>No customer proof or registration documents attached yet.</span>
              </span>
              <button
                type="button"
                onClick={() => setIsEditCycleModalOpen(true)}
                className="text-[11px] font-bold text-[#006D77] hover:underline cursor-pointer"
              >
                + Attach Proof
              </button>
            </div>
          )}
        </div>

        {/* Cycle Tabs & Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D4E7EC]">
          <div className="flex bg-[#F4FAFB] p-0.5 rounded-xl border border-[#D4E7EC] text-xs font-bold">
            <button
              type="button"
              onClick={() => setSelectedCycleMode('current')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                selectedCycleMode === 'current'
                  ? 'bg-[#006D77] text-white shadow-2xs'
                  : 'text-[#5A696D] hover:text-[#202729]'
              }`}
            >
              Current Cycle
            </button>
            <button
              type="button"
              onClick={() => setSelectedCycleMode('previous')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                selectedCycleMode === 'previous'
                  ? 'bg-[#006D77] text-white shadow-2xs'
                  : 'text-[#5A696D] hover:text-[#202729]'
              }`}
            >
              Previous Cycle
            </button>
            <button
              type="button"
              onClick={() => setSelectedCycleMode('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                selectedCycleMode === 'all'
                  ? 'bg-[#006D77] text-white shadow-2xs'
                  : 'text-[#5A696D] hover:text-[#202729]'
              }`}
            >
              All Invoices
            </button>
          </div>

          <div className="text-[11px] font-mono text-[#5A696D] flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#006D77]" />
            <span>{activeCycleRange.label}</span>
          </div>
        </div>
      </div>

      {/* Account KPI Financial Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-[#D4E7EC] shadow-2xs">
          <span className="text-[10px] font-bold text-[#5A696D] uppercase tracking-wider block">
            Cycle Invoices
          </span>
          <p className="text-base font-extrabold text-[#202729] mt-0.5 font-mono">
            {financials.cycleInvoices.length} Orders
          </p>
          <span className="text-[10px] text-[#006D77] font-semibold block mt-0.5">
            Billed: {formatAED(financials.totalBilled)}
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-[#D4E7EC] shadow-2xs">
          <span className="text-[10px] font-bold text-[#5A696D] uppercase tracking-wider block">
            Paid in Cycle
          </span>
          <p className="text-base font-extrabold text-[#006D77] mt-0.5 font-mono">
            {formatAED(financials.paymentsReceivedInCycle)}
          </p>
          <span className="text-[10px] text-[#5A696D] block mt-0.5">
            Bal: {formatAED(financials.currentCycleOutstanding)}
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-[#D4E7EC] shadow-2xs">
          <span className="text-[10px] font-bold text-[#5A696D] uppercase tracking-wider block">
            Prior Cycles Balance
          </span>
          <p className="text-base font-extrabold text-[#9E3636] mt-0.5 font-mono">
            {formatAED(financials.previousOutstandingBalance)}
          </p>
          <span className="text-[10px] text-[#5A696D] block mt-0.5">Older receivables</span>
        </div>

        <div className="bg-[#E6F5F8] p-3 rounded-2xl border border-[#BDE7EF] shadow-2xs">
          <span className="text-[10px] font-bold text-[#006D77] uppercase tracking-wider block">
            Total Amount Due
          </span>
          <p className="text-lg font-black text-[#006D77] mt-0.5 font-mono">
            {formatAED(financials.totalAmountDue)}
          </p>
          <span className="text-[10px] text-[#5A696D] font-mono block mt-0.5">
            Close: {formatDubaiDateDisplay(cycleInfo.nextBillingDate)}
          </span>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setPaymentAmount(financials.totalAmountDue > 0 ? String(financials.totalAmountDue) : '');
            setIsRecordPaymentModalOpen(true);
          }}
          className="flex-1 min-w-[130px] py-2.5 px-3 bg-[#006D77] hover:bg-[#00575F] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer touch-target"
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Record Payment</span>
        </button>

        <button
          type="button"
          onClick={handleGenerateStatement}
          className="flex-1 min-w-[130px] py-2.5 px-3 bg-white hover:bg-[#F4FAFB] border border-[#D4E7EC] text-[#202729] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer touch-target"
        >
          <FileText className="w-3.5 h-3.5 text-[#006D77]" />
          <span>Generate Statement</span>
        </button>
      </div>

      {/* Section Tabs */}
      <div className="border-b border-[#D4E7EC] flex gap-4 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('invoices')}
          className={`pb-2.5 relative transition cursor-pointer ${
            activeTab === 'invoices' ? 'text-[#006D77] border-b-2 border-[#006D77]' : 'text-[#5A696D]'
          }`}
        >
          Invoices ({displayedInvoices.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payments')}
          className={`pb-2.5 relative transition cursor-pointer ${
            activeTab === 'payments' ? 'text-[#006D77] border-b-2 border-[#006D77]' : 'text-[#5A696D]'
          }`}
        >
          Payment History ({payments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('statements')}
          className={`pb-2.5 relative transition cursor-pointer ${
            activeTab === 'statements' ? 'text-[#006D77] border-b-2 border-[#006D77]' : 'text-[#5A696D]'
          }`}
        >
          Statements ({statements.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('whatsapp')}
          className={`pb-2.5 relative transition cursor-pointer ${
            activeTab === 'whatsapp' ? 'text-[#006D77] border-b-2 border-[#006D77]' : 'text-[#5A696D]'
          }`}
        >
          WhatsApp Schedule & Logs
        </button>
      </div>

      {/* TAB 1: Invoices */}
      {activeTab === 'invoices' && (
        <div className="space-y-2.5">
          {displayedInvoices.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-[#D4E7EC] text-[#5A696D] text-xs">
              No invoices found for this selection.
            </div>
          ) : (
            <div className="space-y-2">
              {displayedInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-2xs hover:border-[#006D77]/40 transition space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#006D77]">
                        {inv.invoiceNumber}
                      </span>
                      <span className="text-[11px] text-[#5A696D] font-mono">
                        {formatDubaiDateDisplay(inv.invoiceDate)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.paymentStatus === 'Paid'
                            ? 'bg-[#E6F8EE] text-[#147D42]'
                            : inv.paymentStatus === 'Partial'
                            ? 'bg-[#FFF7E6] text-[#A66908]'
                            : 'bg-[#FDF0F0] text-[#A32727]'
                        }`}
                      >
                        {inv.paymentStatus}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedInvoiceForPrint(inv)}
                        className="p-1 rounded-lg bg-[#F4FAFB] hover:bg-[#E5EFF1] text-[#006D77] transition cursor-pointer"
                        title="Print / View Invoice"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-[#5A696D] truncate">
                    {inv.items.map((it) => `${it.dressTypeName} x${it.quantity} (${it.service})`).join(', ')}
                  </p>

                  <div className="flex justify-between items-center pt-1 border-t border-[#D4E7EC]/60 text-xs">
                    <span className="text-[#5A696D]">
                      Paid: <strong className="font-mono text-[#006D77]">{formatAED(inv.amountPaid)}</strong>
                    </span>
                    <span className="text-[#5A696D]">
                      Remaining: <strong className="font-mono text-[#9E3636]">{formatAED(inv.remainingBalance)}</strong>
                    </span>
                    <span className="font-bold text-[#202729] font-mono">
                      Total: {formatAED(inv.total)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Payment History */}
      {activeTab === 'payments' && (
        <div className="space-y-2.5">
          {payments.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-[#D4E7EC] text-[#5A696D] text-xs">
              No payments recorded for this account yet.
            </div>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-2xs space-y-1.5"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#006D77] font-mono">
                        +{formatAED(p.amount)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#F4FAFB] text-[#5A696D] border border-[#DDE8EA]">
                        {p.paymentMethod}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-[#5A696D]">
                      {formatDubaiDateDisplay(p.date)}
                    </span>
                  </div>

                  <div className="text-[11px] text-[#5A696D]">
                    <span>Recorded by: <strong>{p.recordedBy}</strong></span>
                    {p.notes && <span className="block italic mt-0.5">{p.notes}</span>}
                  </div>

                  {p.allocations && p.allocations.length > 0 && (
                    <div className="pt-1.5 border-t border-[#D4E7EC]/60 text-[10px] text-[#5A696D] space-y-0.5">
                      <span className="font-bold text-[#202729]">Allocations:</span>
                      {p.allocations.map((a, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>Invoice {a.invoiceNumber}</span>
                          <span className="font-mono font-bold text-[#006D77]">{formatAED(a.allocatedAmount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Statements */}
      {activeTab === 'statements' && (
        <div className="space-y-2.5">
          {statements.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-[#D4E7EC] text-[#5A696D] text-xs space-y-3">
              <p>No statements generated for this account yet.</p>
              <button
                type="button"
                onClick={handleGenerateStatement}
                className="px-4 py-2 bg-[#006D77] text-white text-xs font-bold rounded-xl shadow-2xs"
              >
                Generate First Statement
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {statements.map((stmt) => (
                <div
                  key={stmt.id}
                  className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-2xs space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-mono font-bold text-xs text-[#006D77]">
                        {stmt.statementNumber}
                      </span>
                      <p className="text-[11px] text-[#5A696D] mt-0.5">{stmt.periodLabel}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black font-mono text-[#006D77] block">
                        {formatAED(stmt.totalAmountDue)}
                      </span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold mt-0.5 ${
                          stmt.deliveryStatus === 'Sent'
                            ? 'bg-[#E6F8EE] text-[#147D42]'
                            : stmt.deliveryStatus === 'Not Configured'
                            ? 'bg-[#FFF7E6] text-[#A66908]'
                            : 'bg-[#F4FAFB] text-[#5A696D]'
                        }`}
                      >
                        {stmt.deliveryStatus || 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-[#D4E7EC]/60 text-xs">
                    <span className="text-[11px] text-[#5A696D]">
                      {stmt.invoices.length} Orders | Billed: {formatAED(stmt.totalBilled)}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedStatementForPrint(stmt)}
                        className="px-2.5 py-1 rounded-lg bg-[#F4FAFB] hover:bg-[#E5EFF1] text-[#006D77] font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                      >
                        <Printer className="w-3 h-3" />
                        <span>View</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDispatchWhatsApp(stmt)}
                        disabled={isProcessing}
                        className="px-2.5 py-1 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center gap-1 shadow-2xs transition cursor-pointer disabled:opacity-50"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Send WhatsApp</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: WhatsApp Schedule & Logs */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-3.5">
          {/* API Connectivity Banner */}
          <div
            className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
              apiStatus.configured
                ? 'bg-[#E6F8EE] border-[#B3E8C8] text-[#147D42]'
                : 'bg-[#FFF7E6] border-[#FFE1A6] text-[#A66908]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold">
                {apiStatus.configured ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>Meta WhatsApp Business Cloud API: {apiStatus.statusText}</span>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase">
                {apiStatus.configured ? 'Operational' : 'Not Configured'}
              </span>
            </div>

            <p className="text-[11px] leading-relaxed">
              {apiStatus.configured
                ? 'Backend credentials are active. Statements will be dispatched directly to Meta WhatsApp Business API at scheduled times.'
                : 'WhatsApp Cloud API tokens (WHATSAPP_API_TOKEN, WHATSAPP_PHONE_NUMBER_ID) are not configured in environment variables. Schedules can be configured, and sending attempts will be logged with "Not Configured" status.'}
            </p>
          </div>

          {/* Current Schedule Summary */}
          <div className="bg-white rounded-2xl p-4 border border-[#D4E7EC] shadow-2xs space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-[#202729] uppercase tracking-wider">
                Automated WhatsApp Schedule
              </h3>
              <button
                type="button"
                onClick={() => setIsEditCycleModalOpen(true)}
                className="text-xs text-[#006D77] font-bold hover:underline cursor-pointer"
              >
                Configure
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs text-[#5A696D]">
              <div>
                <span>Target WhatsApp:</span>
                <strong className="block text-[#202729] font-mono mt-0.5">
                  {account?.whatsappNumber || customer.phone}
                </strong>
              </div>
              <div>
                <span>Cycle Closure & Send Day:</span>
                <strong className="block text-[#202729] mt-0.5">
                  Day {account?.cycleStartDay || 1} of each month
                </strong>
              </div>
              <div>
                <span>Scheduled Send Time:</span>
                <strong className="block text-[#202729] mt-0.5">
                  {account?.scheduledSendTime || '09:00'} (Asia/Dubai)
                </strong>
              </div>
              <div>
                <span>Admin Approval Mode:</span>
                <strong className="block text-[#202729] mt-0.5">
                  {account?.requireAdminApproval ? 'Required' : 'Automatic'}
                </strong>
              </div>
            </div>
          </div>

          {/* Delivery Logs */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#202729] uppercase tracking-wider">
              WhatsApp Delivery History ({whatsappLogs.length})
            </h3>

            {whatsappLogs.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center border border-[#D4E7EC] text-xs text-[#5A696D]">
                No delivery logs recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {whatsappLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-2xs space-y-1.5"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-xs text-[#006D77]">
                        {log.statementNumber}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === 'Sent'
                            ? 'bg-[#E6F8EE] text-[#147D42]'
                            : log.status === 'Not Configured'
                            ? 'bg-[#FFF7E6] text-[#A66908]'
                            : log.status === 'Awaiting Approval'
                            ? 'bg-[#E6F5F8] text-[#006D77]'
                            : 'bg-[#FDF0F0] text-[#A32727]'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-[#5A696D]">
                      <span>{log.statementPeriod}</span>
                      <span className="font-mono">{formatDubaiDateDisplay(log.scheduledTime)}</span>
                    </div>

                    {log.errorMessage && (
                      <p className="text-[10px] text-[#A32727] font-mono bg-[#FDF0F0] p-1.5 rounded-lg">
                        {log.errorMessage}
                      </p>
                    )}

                    {log.providerResponse && (
                      <p className="text-[10px] text-[#5A696D] font-mono truncate">
                        Response: {log.providerResponse}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isRecordPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-[#D4E7EC]">
            <div className="flex justify-between items-center border-b border-[#D4E7EC] pb-2.5">
              <h3 className="text-sm font-bold text-[#202729]">Record Account Payment</h3>
              <button
                type="button"
                onClick={() => setIsRecordPaymentModalOpen(false)}
                className="text-[#5A696D] hover:text-[#202729] font-bold p-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            {paymentError && (
              <div className="p-2.5 rounded-xl bg-[#FDF0F0] border border-[#F8C3C3] text-[#A32727] text-xs font-semibold">
                {paymentError}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#202729] mb-1">
                  Payment Amount (AED) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 150.00"
                  className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl font-mono text-[#202729] focus:outline-hidden focus:ring-2 focus:ring-[#006D77]/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#202729] mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {(['Cash', 'Card', 'Bank Transfer'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 rounded-xl font-bold transition cursor-pointer text-center ${
                        paymentMethod === method
                          ? 'bg-[#006D77] text-white shadow-2xs'
                          : 'bg-[#F4FAFB] border border-[#D4E7EC] text-[#5A696D]'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#202729] mb-1">
                  Payment Allocation
                </label>
                <select
                  value={paymentTargetInvoiceId}
                  onChange={(e) => setPaymentTargetInvoiceId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                >
                  <option value="account_balance">
                    Auto-Allocate across Unpaid Invoices (Oldest first)
                  </option>
                  {unpaidInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} – Bal: {formatAED(inv.remainingBalance)} (Date: {formatDubaiDateDisplay(inv.invoiceDate)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#202729] mb-1">
                  Reference / Notes (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Cheque #4920 or Counter Cash"
                  className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#006D77] hover:bg-[#00575F] text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer touch-target"
                >
                  Confirm Payment
                </button>
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentModalOpen(false)}
                  className="px-4 py-2.5 bg-white border border-[#D4E7EC] text-[#5A696D] text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Cycle Settings Modal */}
      {isEditCycleModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-[#D4E7EC]">
            <div className="flex justify-between items-center border-b border-[#D4E7EC] pb-2.5">
              <h3 className="text-sm font-bold text-[#202729]">Billing Cycle & WhatsApp</h3>
              <button
                type="button"
                onClick={() => setIsEditCycleModalOpen(false)}
                className="text-[#5A696D] hover:text-[#202729] font-bold p-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveCycleSettings} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-[#202729] mb-1">
                  Cycle Start Day (1 to 28)
                </label>
                <select
                  value={editCycleStartDay}
                  onChange={(e) => setEditCycleStartDay(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                >
                  <option value={1}>Day 1 (1st to end of month)</option>
                  <option value={15}>Day 15 (15th to 14th of next month)</option>
                  <option value={20}>Day 20 (20th to 19th of next month)</option>
                  <option value={25}>Day 25 (25th to 24th of next month)</option>
                  {Array.from({ length: 28 }, (_, i) => i + 1)
                    .filter((d) => ![1, 15, 20, 25].includes(d))
                    .map((d) => (
                      <option key={d} value={d}>
                        Day {d} (Day {d} to Day {d - 1 === 0 ? 30 : d - 1})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#202729] mb-1">
                  Account Status
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs">
                  {(['Active', 'Paused', 'Inactive'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setEditAccountStatus(status)}
                      className={`py-2 rounded-xl font-bold transition cursor-pointer text-center ${
                        editAccountStatus === status
                          ? 'bg-[#006D77] text-white shadow-2xs'
                          : 'bg-[#F4FAFB] border border-[#D4E7EC] text-[#5A696D]'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#202729] mb-1">
                  WhatsApp Number
                </label>
                <input
                  type="text"
                  required
                  value={editWhatsappNumber}
                  onChange={(e) => setEditWhatsappNumber(e.target.value)}
                  placeholder="+971 50 123 4567"
                  className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl font-mono text-[#202729]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#202729] mb-1">
                  Scheduled Send Time (Asia/Dubai)
                </label>
                <input
                  type="time"
                  value={editScheduledTime}
                  onChange={(e) => setEditScheduledTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl font-mono text-[#202729]"
                />
              </div>

              <div className="space-y-2 pt-1 border-t border-[#D4E7EC]">
                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={editAutoSend}
                    onChange={(e) => setEditAutoSend(e.target.checked)}
                    className="w-4 h-4 text-[#006D77] rounded-sm"
                  />
                  <span className="font-semibold text-[#202729]">Enable Automated Statement Sending</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs">
                  <input
                    type="checkbox"
                    checked={editRequireApproval}
                    onChange={(e) => setEditRequireApproval(e.target.checked)}
                    className="w-4 h-4 text-[#006D77] rounded-sm"
                  />
                  <span className="font-semibold text-[#202729]">Require Admin Approval Before Dispatch</span>
                </label>
              </div>

              {/* Customer Proof / Documents Section in Edit Modal */}
              <div className="pt-2 border-t border-[#D4E7EC]">
                <CustomerProofUpload
                  label="Customer Proof / Documents (Optional)"
                  currentProofUrl={editProofDataUrl}
                  currentFileName={editProofFileName}
                  onProofChange={(url, name, type) => {
                    setEditProofDataUrl(url);
                    setEditProofFileName(name);
                    setEditProofFileType(type);
                  }}
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#006D77] hover:bg-[#00575F] text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer touch-target"
                >
                  Save Settings
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditCycleModalOpen(false)}
                  className="px-4 py-2.5 bg-white border border-[#D4E7EC] text-[#5A696D] text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Document View Modal from Banner */}
      {isBannerProofPreviewOpen && (account?.proofDocumentUrl || customer?.proofDocumentUrl) && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#D4E7EC] overflow-hidden">
            <div className="flex items-center justify-between p-3.5 border-b border-[#D4E7EC] bg-[#F4FAFB]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#006D77]" />
                <div>
                  <h3 className="text-xs font-bold text-[#202729]">
                    {account?.proofDocumentName || customer?.proofDocumentName || 'Customer Proof Document'}
                  </h3>
                  <p className="text-[9.5px] text-[#5A696D]">Private Verification Document</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBannerProofPreviewOpen(false)}
                className="p-1 rounded-xl hover:bg-[#E5EFF1] text-[#202729] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 overflow-auto flex items-center justify-center bg-[#202729]/5 min-h-[250px] max-h-[60vh]">
              <img
                src={account?.proofDocumentUrl || customer?.proofDocumentUrl || ''}
                alt="Document Full Preview"
                className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-xs"
              />
            </div>

            <div className="p-3 bg-white border-t border-[#D4E7EC] flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#5A696D]">
                Restricted to authorized Admin session
              </span>
              <button
                type="button"
                onClick={() => setIsBannerProofPreviewOpen(false)}
                className="px-4 py-1.5 bg-[#006D77] text-white text-xs font-bold rounded-xl shadow-2xs hover:bg-[#00575F] cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Print Modal */}
      {selectedInvoiceForPrint && (
        <PrintInvoiceModal
          invoice={selectedInvoiceForPrint}
          settings={settings}
          isOpen={!!selectedInvoiceForPrint}
          onClose={() => setSelectedInvoiceForPrint(null)}
        />
      )}

      {/* Statement Print Modal */}
      {selectedStatementForPrint && (
        <StatementPrintModal
          statement={selectedStatementForPrint}
          settings={settings}
          onClose={() => setSelectedStatementForPrint(null)}
          onSendWhatsApp={() => handleDispatchWhatsApp(selectedStatementForPrint)}
        />
      )}
    </div>
  );
};
