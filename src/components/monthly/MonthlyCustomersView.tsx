import React, { useState, useEffect, useMemo } from 'react';
import { Customer, MonthlyCustomerAccount, BusinessSettings, UserAccount } from '../../types';
import { storage } from '../../services/storage';
import { formatAED } from '../../utils/calculations';
import { getCustomerBillingCycle, formatDubaiDateDisplay } from '../../utils/billingCycle';
import { MonthlyCustomerDetailView } from './MonthlyCustomerDetailView';
import {
  Users,
  Search,
  Plus,
  Calendar,
  Phone,
  CreditCard,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  FileCheck,
} from 'lucide-react';
import { CustomerProofUpload } from './CustomerProofUpload';
import { saveCustomerProof } from '../../services/customerProofStorage';

interface MonthlyCustomersViewProps {
  settings: BusinessSettings;
  currentUser: UserAccount;
}

export const MonthlyCustomersView: React.FC<MonthlyCustomersViewProps> = ({
  settings,
  currentUser,
}) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [monthlyAccounts, setMonthlyAccounts] = useState<MonthlyCustomerAccount[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Add Monthly Customer Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<'existing' | 'new'>('existing');

  // Existing customer selection
  const [selectedExistingCustId, setSelectedExistingCustId] = useState<string>('');

  // New customer inputs
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('+971 5');
  const [newAddress, setNewAddress] = useState('');

  // Shared monthly account configuration
  const [customerCode, setCustomerCode] = useState('');
  const [cycleStartDay, setCycleStartDay] = useState<number>(1);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [accountStatus, setAccountStatus] = useState<'Active' | 'Paused' | 'Inactive'>('Active');
  const [scheduledSendTime, setScheduledSendTime] = useState('09:00');
  const [autoSendWhatsApp, setAutoSendWhatsApp] = useState(true);
  const [requireAdminApproval, setRequireAdminApproval] = useState(false);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Customer Proof document states
  const [proofDataUrl, setProofDataUrl] = useState<string | null>(null);
  const [proofFileName, setProofFileName] = useState<string | null>(null);
  const [proofFileType, setProofFileType] = useState<string | null>(null);

  const loadData = () => {
    setCustomers(storage.getCustomers());
    setMonthlyAccounts(storage.getMonthlyAccounts());
  };

  useEffect(() => {
    loadData();
    return storage.subscribe(loadData);
  }, []);

  // Map monthly accounts with their customer records
  const monthlyData = useMemo(() => {
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    return monthlyAccounts.map((account) => {
      const cust = customerMap.get(account.id);
      const cycleInfo = getCustomerBillingCycle(account.cycleStartDay);
      const financials = storage.getCustomerCycleFinancials(
        account.id,
        cycleInfo.currentCycle.startDate,
        cycleInfo.currentCycle.endDate
      );

      return {
        account,
        customer: cust || {
          id: account.id,
          name: 'Unknown Customer',
          phone: account.whatsappNumber,
          totalInvoices: 0,
          totalSpending: 0,
          outstandingBalance: 0,
          lastVisitDate: '',
          createdAt: '',
        },
        cycleInfo,
        financials,
      };
    });
  }, [customers, monthlyAccounts]);

  // Filtered by search query (name, phone, code)
  const filteredList = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return monthlyData;

    return monthlyData.filter((item) => {
      const nameMatch = item.customer.name.toLowerCase().includes(q);
      const codeMatch = (item.account.customerCode || '').toLowerCase().includes(q);
      const phoneClean = (item.account.whatsappNumber || item.customer.phone).replace(/[^0-9]/g, '');
      const searchClean = q.replace(/[^0-9]/g, '');
      const phoneMatch = searchClean ? phoneClean.includes(searchClean) : false;

      return nameMatch || codeMatch || phoneMatch;
    });
  }, [monthlyData, search]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalAccounts = monthlyAccounts.length;
    const activeAccounts = monthlyAccounts.filter((a) => a.accountStatus === 'Active').length;
    const totalBilledCycle = monthlyData.reduce((sum, item) => sum + item.financials.totalBilled, 0);
    const totalDue = monthlyData.reduce((sum, item) => sum + item.financials.totalAmountDue, 0);

    return { totalAccounts, activeAccounts, totalBilledCycle, totalDue };
  }, [monthlyAccounts, monthlyData]);

  // Existing non-monthly customers for the dropdown
  const availableExistingCustomers = useMemo(() => {
    const monthlyIds = new Set(monthlyAccounts.map((a) => a.id));
    return customers.filter((c) => !monthlyIds.has(c.id));
  }, [customers, monthlyAccounts]);

  // Open Add Modal with smart defaults
  const handleOpenAddModal = () => {
    const nextCodeNum = 101 + monthlyAccounts.length;
    setCustomerCode(`MC-${nextCodeNum}`);
    setCycleStartDay(1);
    setAccountStatus('Active');
    setScheduledSendTime('09:00');
    setAutoSendWhatsApp(true);
    setRequireAdminApproval(false);
    setNotes('');
    setErrorMessage(null);
    setProofDataUrl(null);
    setProofFileName(null);
    setProofFileType(null);

    if (availableExistingCustomers.length > 0) {
      setSelectedExistingCustId(availableExistingCustomers[0].id);
      setWhatsappNumber(availableExistingCustomers[0].phone);
      if (availableExistingCustomers[0].proofDocumentUrl) {
        setProofDataUrl(availableExistingCustomers[0].proofDocumentUrl);
        setProofFileName(availableExistingCustomers[0].proofDocumentName || 'Customer_Proof');
        setProofFileType(availableExistingCustomers[0].proofDocumentType || 'image/jpeg');
      }
      setAddMode('existing');
    } else {
      setAddMode('new');
      setNewName('');
      setNewPhone('+971 5');
      setNewAddress('');
      setWhatsappNumber('+971 5');
    }

    setIsAddModalOpen(true);
  };

  // Handle Existing Customer Change
  const handleExistingCustomerChange = (id: string) => {
    setSelectedExistingCustId(id);
    const found = customers.find((c) => c.id === id);
    if (found) {
      setWhatsappNumber(found.phone);
      if (found.proofDocumentUrl) {
        setProofDataUrl(found.proofDocumentUrl);
        setProofFileName(found.proofDocumentName || 'Customer_Proof');
        setProofFileType(found.proofDocumentType || 'image/jpeg');
      } else {
        setProofDataUrl(null);
        setProofFileName(null);
        setProofFileType(null);
      }
    }
  };

  // Submit Add Monthly Customer
  const handleSaveMonthlyCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let targetCustomerId = selectedExistingCustId;
    let targetPhone = whatsappNumber.trim();

    if (addMode === 'new') {
      if (!newName.trim()) {
        setErrorMessage('Please enter the customer name.');
        return;
      }
      if (!newPhone.trim() || newPhone.trim().length < 8) {
        setErrorMessage('Please enter a valid UAE phone number.');
        return;
      }

      // Check for phone duplicate
      const existing = storage.findCustomerByPhone(newPhone);
      if (existing) {
        targetCustomerId = existing.id;
      } else {
        const created = storage.getOrCreateCustomer(newName.trim(), newPhone.trim(), newAddress.trim());
        targetCustomerId = created.id;
      }
      if (!targetPhone) {
        targetPhone = newPhone.trim();
      }
    } else {
      if (!targetCustomerId) {
        setErrorMessage('Please select an existing customer.');
        return;
      }
    }

    const cleanCode = customerCode.trim() || `MC-${100 + monthlyAccounts.length + 1}`;
    const cycleRange = getCustomerBillingCycle(cycleStartDay);

    const targetCust = customers.find((c) => c.id === targetCustomerId);
    const resolvedPhone = targetPhone || targetCust?.phone || '';

    const newAccount: MonthlyCustomerAccount = {
      id: targetCustomerId,
      customerCode: cleanCode,
      cycleStartDay,
      whatsappNumber: resolvedPhone,
      accountStatus,
      scheduledSendTime,
      autoSendWhatsApp,
      requireAdminApproval,
      nextBillingDate: cycleRange.nextBillingDate,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      proofDocumentUrl: proofDataUrl || undefined,
      proofDocumentName: proofFileName || undefined,
      proofDocumentType: proofFileType || undefined,
      proofDocumentUploadedAt: proofDataUrl ? new Date().toISOString() : undefined,
    };

    try {
      storage.saveMonthlyAccount(newAccount);
      if (proofDataUrl) {
        saveCustomerProof(targetCustomerId, proofDataUrl, proofFileName || 'proof.jpg', proofFileType || 'image/jpeg');
      }
      setIsAddModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save monthly customer account.');
    }
  };

  // If viewing detailed account of a specific customer
  if (selectedCustomerId) {
    return (
      <MonthlyCustomerDetailView
        customerId={selectedCustomerId}
        settings={settings}
        currentUser={currentUser}
        onBack={() => setSelectedCustomerId(null)}
      />
    );
  }

  return (
    <div className="space-y-3.5 pb-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#D4E7EC] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-extrabold text-[#202729] tracking-tight">
              Monthly Customers
            </h1>
            <p className="text-[11px] text-[#5A6B70]">
              Recurring accounts, custom cycles & automated WhatsApp billing
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-3.5 py-2 bg-[#006D77] hover:bg-[#00575F] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer touch-target"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#5A6B70] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search monthly clients by name, code (MC-101), or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729] focus:outline-hidden focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77] transition"
          />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-white p-3 rounded-2xl border border-[#D4E7EC] shadow-2xs">
          <span className="text-[10px] font-bold text-[#5A696D] uppercase tracking-wider block">
            Monthly Accounts
          </span>
          <p className="text-lg font-black text-[#202729] mt-0.5 font-mono">
            {metrics.totalAccounts}
          </p>
          <span className="text-[10px] text-[#006D77] font-semibold block mt-0.5">
            {metrics.activeAccounts} Active
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-[#D4E7EC] shadow-2xs">
          <span className="text-[10px] font-bold text-[#5A696D] uppercase tracking-wider block">
            Active Cycles Billed
          </span>
          <p className="text-base font-extrabold text-[#202729] mt-0.5 font-mono">
            {formatAED(metrics.totalBilledCycle)}
          </p>
          <span className="text-[10px] text-[#5A696D] block mt-0.5">Current periods</span>
        </div>

        <div className="bg-[#E6F5F8] p-3 rounded-2xl border border-[#BDE7EF] shadow-2xs col-span-2 sm:col-span-2">
          <span className="text-[10px] font-bold text-[#006D77] uppercase tracking-wider block">
            Total Outstanding Balance
          </span>
          <p className="text-lg font-black text-[#006D77] mt-0.5 font-mono">
            {formatAED(metrics.totalDue)}
          </p>
          <span className="text-[10px] text-[#5A696D] block mt-0.5">
            Combined current cycle & previous receivables
          </span>
        </div>
      </div>

      {/* Monthly Customer List */}
      <div className="space-y-2">
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-[#D4E7EC] space-y-3">
            <Users className="w-8 h-8 text-[#5A6B70] mx-auto opacity-40" />
            <p className="text-xs text-[#5A696D]">
              {search ? 'No monthly customers match your search.' : 'No monthly customer accounts registered yet.'}
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2 bg-[#006D77] text-white text-xs font-bold rounded-xl shadow-2xs"
            >
              Add Monthly Customer
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredList.map(({ account, customer, cycleInfo, financials }) => (
              <div
                key={account.id}
                onClick={() => setSelectedCustomerId(account.id)}
                className="bg-white rounded-2xl p-4 border border-[#D4E7EC] shadow-xs hover:border-[#006D77] transition cursor-pointer active:scale-[0.99] touch-target space-y-2.5"
              >
                {/* Row 1: Name, Code, Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-extrabold text-[#202729] tracking-tight">
                        {customer.name}
                      </h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#E6F5F8] text-[#006D77] border border-[#BDE7EF]">
                        {account.customerCode}
                      </span>
                      {(account.proofDocumentUrl || customer.proofDocumentUrl) && (
                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[#E6F8EE] text-[#147D42] border border-[#B3E8C8]" title="Customer proof document attached">
                          <FileCheck className="w-2.5 h-2.5" />
                          Proof
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] font-mono text-[#5A6B70] mt-0.5">
                      {account.whatsappNumber || customer.phone}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        account.accountStatus === 'Active'
                          ? 'bg-[#E6F8EE] text-[#147D42]'
                          : account.accountStatus === 'Paused'
                          ? 'bg-[#FFF7E6] text-[#A66908]'
                          : 'bg-[#F4FAFB] text-[#5A696D]'
                      }`}
                    >
                      {account.accountStatus}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#5A696D]" />
                  </div>
                </div>

                {/* Row 2: Billing Cycle info */}
                <div className="flex items-center justify-between text-[11px] text-[#5A696D] bg-[#F4FAFB] p-2 rounded-xl border border-[#DDE8EA]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#006D77]" />
                    <span>Cycle: <strong>{cycleInfo.cycleSummary}</strong></span>
                  </div>
                  <div className="text-right">
                    <span>Next Close: <strong>{formatDubaiDateDisplay(cycleInfo.nextBillingDate)}</strong></span>
                  </div>
                </div>

                {/* Row 3: Financial Summary */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#D4E7EC]/60 text-xs">
                  <div>
                    <span className="text-[10px] text-[#5A696D] block">Cycle Billed</span>
                    <strong className="font-mono text-[#202729]">
                      {formatAED(financials.totalBilled)}
                    </strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-[#5A696D] block">Paid</span>
                    <strong className="font-mono text-[#006D77]">
                      {formatAED(financials.paymentsReceivedInCycle)}
                    </strong>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-[#5A696D] block">Total Due</span>
                    <strong
                      className={`font-mono font-bold ${
                        financials.totalAmountDue > 0 ? 'text-[#9E3636]' : 'text-[#006D77]'
                      }`}
                    >
                      {formatAED(financials.totalAmountDue)}
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Monthly Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-5 space-y-4 shadow-2xl border border-[#D4E7EC] my-auto">
            <div className="flex justify-between items-center border-b border-[#D4E7EC] pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-[#202729]">Add Monthly Customer</h3>
                <p className="text-[11px] text-[#5A6B70]">Set up recurring account & custom billing cycle</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#5A696D] hover:text-[#202729] font-bold p-1 cursor-pointer"
              >
                ×
              </button>
            </div>

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-[#FDF0F0] border border-[#F8C3C3] text-[#A32727] text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            {/* Mode Selector */}
            <div className="grid grid-cols-2 gap-2 bg-[#F4FAFB] p-1 rounded-xl border border-[#D4E7EC] text-xs font-bold">
              <button
                type="button"
                onClick={() => setAddMode('existing')}
                className={`py-1.5 rounded-lg transition cursor-pointer text-center ${
                  addMode === 'existing'
                    ? 'bg-[#006D77] text-white shadow-2xs'
                    : 'text-[#5A696D] hover:text-[#202729]'
                }`}
              >
                Select Existing Customer
              </button>
              <button
                type="button"
                onClick={() => setAddMode('new')}
                className={`py-1.5 rounded-lg transition cursor-pointer text-center ${
                  addMode === 'new'
                    ? 'bg-[#006D77] text-white shadow-2xs'
                    : 'text-[#5A696D] hover:text-[#202729]'
                }`}
              >
                Create New Customer
              </button>
            </div>

            <form onSubmit={handleSaveMonthlyCustomer} className="space-y-3">
              {addMode === 'existing' ? (
                <div>
                  <label className="block text-[11px] font-bold text-[#202729] mb-1">
                    Select Customer Database Profile *
                  </label>
                  {availableExistingCustomers.length === 0 ? (
                    <div className="p-2.5 rounded-xl bg-[#FFF7E6] border border-[#FFE1A6] text-[#A66908] text-xs">
                      All customers in your database are already enrolled as monthly accounts. Switch to &quot;Create New Customer&quot; above.
                    </div>
                  ) : (
                    <select
                      value={selectedExistingCustId}
                      onChange={(e) => handleExistingCustomerChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                    >
                      {availableExistingCustomers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.phone}) – {c.totalInvoices} Orders
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-[#202729] mb-1">
                      Customer Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Sultan Al-Nuaimi"
                      className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-bold text-[#202729] mb-1">
                        Phone / Mobile *
                      </label>
                      <input
                        type="text"
                        required
                        value={newPhone}
                        onChange={(e) => {
                          setNewPhone(e.target.value);
                          setWhatsappNumber(e.target.value);
                        }}
                        placeholder="+971 50 123 4567"
                        className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl font-mono text-[#202729]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#202729] mb-1">
                        Address / Villa
                      </label>
                      <input
                        type="text"
                        value={newAddress}
                        onChange={(e) => setNewAddress(e.target.value)}
                        placeholder="e.g. Tourist Club, Abu Dhabi"
                        className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Configuration */}
              <div className="pt-2 border-t border-[#D4E7EC] space-y-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-[#202729] mb-1">
                      Customer Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={customerCode}
                      onChange={(e) => setCustomerCode(e.target.value)}
                      placeholder="e.g. MC-101"
                      className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl font-mono text-[#202729]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#202729] mb-1">
                      Billing Cycle Start Day *
                    </label>
                    <select
                      value={cycleStartDay}
                      onChange={(e) => setCycleStartDay(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                    >
                      <option value={1}>Day 1 (1st to end of month)</option>
                      <option value={15}>Day 15 (15th to 14th)</option>
                      <option value={20}>Day 20 (20th to 19th)</option>
                      <option value={25}>Day 25 (25th to 24th)</option>
                      {Array.from({ length: 28 }, (_, i) => i + 1)
                        .filter((d) => ![1, 15, 20, 25].includes(d))
                        .map((d) => (
                          <option key={d} value={d}>
                            Day {d} (Day {d} to Day {d - 1 === 0 ? 30 : d - 1})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-[#202729] mb-1">
                      WhatsApp Number
                    </label>
                    <input
                      type="text"
                      required
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="+971 50 123 4567"
                      className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl font-mono text-[#202729]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#202729] mb-1">
                      Send Time (Dubai)
                    </label>
                    <input
                      type="time"
                      value={scheduledSendTime}
                      onChange={(e) => setScheduledSendTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl font-mono text-[#202729]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={autoSendWhatsApp}
                      onChange={(e) => setAutoSendWhatsApp(e.target.checked)}
                      className="w-4 h-4 text-[#006D77] rounded-sm"
                    />
                    <span className="font-semibold text-[#202729]">Enable Automated Statement WhatsApp</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={requireAdminApproval}
                      onChange={(e) => setRequireAdminApproval(e.target.checked)}
                      className="w-4 h-4 text-[#006D77] rounded-sm"
                    />
                    <span className="font-semibold text-[#202729]">Require Admin Approval Before Dispatch</span>
                  </label>
                </div>

                {/* Customer Proof / Verification Document Section */}
                <div className="pt-2 border-t border-[#D4E7EC]">
                  <CustomerProofUpload
                    label="Customer Proof / Documents (Optional)"
                    currentProofUrl={proofDataUrl}
                    currentFileName={proofFileName}
                    onProofChange={(url, name, type) => {
                      setProofDataUrl(url);
                      setProofFileName(name);
                      setProofFileType(type);
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#006D77] hover:bg-[#00575F] text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer touch-target"
                >
                  Save Monthly Customer
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 bg-white border border-[#D4E7EC] text-[#5A696D] text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
