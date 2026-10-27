import React, { useState, useEffect, useMemo } from 'react';
import { Invoice, UserAccount, BusinessSettings } from '../../types';
import { storage } from '../../services/storage';
import { formatAED, generateWhatsAppReminder } from '../../utils/calculations';
import {
  Search,
  CheckCircle2,
  MessageCircle,
  History,
  X,
  ExternalLink,
  Copy,
  Printer,
  DollarSign,
  Phone,
  Banknote,
} from 'lucide-react';
import { PrintInvoiceModal } from '../invoice/PrintInvoiceModal';

interface PendingPaymentsViewProps {
  currentUser: UserAccount;
  settings: BusinessSettings;
}

export const PendingPaymentsView: React.FC<PendingPaymentsViewProps> = ({
  currentUser,
  settings,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');

  // Settle Payment Modal
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Other'>('Cash');
  const [payNote, setPayNote] = useState('');

  // Payment History Modal
  const [historyInvoice, setHistoryInvoice] = useState<Invoice | null>(null);

  // WhatsApp Reminder Modal
  const [whatsappModalData, setWhatsappModalData] = useState<{
    invoice: Invoice;
    url: string;
    message: string;
  } | null>(null);

  // Toast
  const [toast, setToast] = useState<string | null>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const load = () => setInvoices(storage.getInvoices());
    load();
    return storage.subscribe(load);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Only invoices with outstanding balance > 0
  const pendingInvoices = useMemo(() => {
    const q = search.toLowerCase().trim();
    return invoices
      .filter((inv) => inv.remainingBalance > 0)
      .filter((inv) => {
        if (!q) return true;
        return (
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          inv.customerPhone.replace(/[^0-9]/g, '').includes(q)
        );
      })
      .sort((a, b) => (b.invoiceDate > a.invoiceDate ? 1 : -1));
  }, [invoices, search]);

  const totalOutstanding = useMemo(() => {
    return pendingInvoices.reduce((sum, i) => sum + i.remainingBalance, 0);
  }, [pendingInvoices]);

  const handleOpenPayModal = (inv: Invoice) => {
    setPayInvoice(inv);
    setPayAmount(inv.remainingBalance);
    setPaymentMethod('Cash');
    setPayNote('');
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payInvoice) return;

    if (payAmount <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }

    if (payAmount > payInvoice.remainingBalance) {
      alert('Payment amount cannot exceed the remaining balance.');
      return;
    }

    const updated = storage.recordInvoicePayment(
      payInvoice.id,
      payAmount,
      paymentMethod,
      `${currentUser.name} (${currentUser.role})`,
      payNote.trim() || undefined
    );

    if (updated) {
      showToast(
        `Received ${formatAED(payAmount)} for #${updated.invoiceNumber}. New balance: ${formatAED(
          updated.remainingBalance
        )}`
      );
    }

    setPayInvoice(null);
  };

  const handleOpenWhatsAppReminder = (inv: Invoice) => {
    const rem = generateWhatsAppReminder(
      inv.customerName,
      inv.customerPhone,
      inv.invoiceNumber,
      inv.remainingBalance,
      settings.businessName,
      settings.phone
    );
    setWhatsappModalData({
      invoice: inv,
      url: rem.url,
      message: rem.message,
    });
  };

  return (
    <div className="space-y-3.5">
      {/* Header & Total Outstanding Card */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-2.5">
        <div>
          <h1 className="text-base font-bold text-[#202729] tracking-tight">Pending Payments</h1>
          <p className="text-xs text-[#5A6B70] mt-0.5">
            Credit accounts and overdue laundry receivables in Dubai.
          </p>
        </div>

        <div className="bg-[#FCEEEE] border border-[#F4CECE] px-3.5 py-2.5 rounded-xl flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#9E3636]">
            Total Outstanding
          </span>
          <span className="text-base font-mono font-black text-[#9E3636]">
            {formatAED(totalOutstanding)}
          </span>
        </div>
      </div>

      {toast && (
        <div className="p-3 bg-[#E6F5F8] border border-[#BDE7EF] text-[#006D77] text-xs font-bold rounded-xl flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-[#006D77] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Search Bar & Counter */}
      <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[#5A6B70] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by customer, phone, or invoice #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729] focus:outline-hidden focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77]"
          />
        </div>

        <div className="flex justify-between items-center text-[11px] text-[#5A6B70] px-1">
          <span>Unsettled Invoices:</span>
          <strong className="text-[#9E3636] font-mono font-bold bg-[#FCEEEE] px-2 py-0.5 rounded-full border border-[#F4CECE]">
            {pendingInvoices.length}
          </strong>
        </div>
      </div>

      {/* Pending Balances List: 1-Column on Mobile, 2/3-Column Grid on Tablet */}
      <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3.5">
        {pendingInvoices.map((inv) => (
          <div
            key={inv.id}
            className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono font-black text-sm text-[#006D77]">
                  {inv.invoiceNumber}
                </span>
                <span className="block text-[10px] text-[#5A6B70] font-mono mt-0.5">
                  Issued: {inv.invoiceDate.slice(0, 10)}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold uppercase text-[#9E3636] block">
                  Due Balance
                </span>
                <span className="font-mono font-black text-sm text-[#9E3636]">
                  {formatAED(inv.remainingBalance)}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-[#202729]">{inv.customerName}</p>
              <div className="flex items-center gap-1 text-[11px] text-[#5A6B70] font-mono mt-0.5">
                <Phone className="w-3 h-3 text-[#5A6B70]" />
                <span>{inv.customerPhone}</span>
              </div>
            </div>

            <div className="bg-[#F4FAFB] p-2.5 rounded-xl border border-[#D4E7EC] flex justify-between items-center text-xs">
              <span className="text-[#5A6B70]">
                Total: <strong className="text-[#202729] font-mono">{formatAED(inv.total)}</strong>
              </span>
              <span className="text-[#5A6B70]">
                Paid: <strong className="text-[#006D77] font-mono">{formatAED(inv.amountPaid)}</strong>
              </span>
            </div>

            {/* Mobile Actions Grid */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleOpenPayModal(inv)}
                className="py-2 px-2 text-xs font-bold text-white bg-[#006D77] hover:bg-[#00575F] rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <Banknote className="w-3.5 h-3.5" />
                <span>Settle</span>
              </button>

              <button
                type="button"
                onClick={() => handleOpenWhatsAppReminder(inv)}
                className="py-2 px-2 text-xs font-bold text-[#1E7E34] bg-[#E8F5E9] hover:bg-[#C8E6C9] border border-[#C8E6C9] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setHistoryInvoice(inv)}
                className="py-2 px-2 text-xs font-bold text-[#202729] bg-[#F4FAFB] hover:bg-[#E6F5F8] border border-[#D4E7EC] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <History className="w-3.5 h-3.5 text-[#5A6B70]" />
                <span>Receipts</span>
              </button>

              <button
                type="button"
                onClick={() => setPrintInvoice(inv)}
                className="py-2 px-2 text-xs font-bold text-[#006D77] bg-[#E6F5F8] hover:bg-[#D4E7EC] border border-[#006D77]/20 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>
            </div>
          </div>
        ))}

        {pendingInvoices.length === 0 && (
          <div className="bg-white p-8 rounded-2xl border border-[#D4E7EC] text-center text-xs text-[#5A6B70]">
            No outstanding payments found. All client balances are settled!
          </div>
        )}
      </div>

      {/* Settle Payment Modal */}
      {payInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#D4E7EC] shadow-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#D4E7EC] pb-3">
              <h3 className="text-sm font-bold text-[#202729]">
                Record Payment for #{payInvoice.invoiceNumber}
              </h3>
              <button
                type="button"
                onClick={() => setPayInvoice(null)}
                className="text-[#5A6B70] hover:text-[#202729] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-3.5 text-xs">
              <div className="bg-[#F4FAFB] p-3 rounded-xl border border-[#D4E7EC] flex justify-between items-center">
                <div>
                  <span className="text-[#5A6B70] block">Customer:</span>
                  <span className="font-bold text-[#202729]">{payInvoice.customerName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[#9E3636] font-bold block">Remaining Due:</span>
                  <span className="font-mono font-black text-sm text-[#9E3636]">
                    {formatAED(payInvoice.remainingBalance)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#202729] mb-1">
                  Payment Amount (AED) <span className="text-[#9E3636]">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max={payInvoice.remainingBalance}
                    required
                    value={payAmount || ''}
                    onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 font-mono font-bold bg-[#E6F5F8] border border-[#006D77]/30 rounded-xl text-[#006D77] focus:ring-2 focus:ring-[#006D77]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setPayAmount(payInvoice.remainingBalance)}
                    className="px-3 py-2 bg-[#F4FAFB] border border-[#D4E7EC] hover:bg-[#E6F5F8] text-[#006D77] font-bold text-xs rounded-xl"
                  >
                    Full Balance
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#202729] mb-1.5">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'Card', 'Other'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        paymentMethod === method
                          ? 'bg-[#006D77] text-white border-[#006D77] shadow-xs'
                          : 'bg-[#F4FAFB] text-[#202729] border-[#D4E7EC] hover:bg-[#E6F5F8]'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#202729] mb-1">
                  Transaction Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paid at counter upon collection"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D4E7EC]">
                <button
                  type="button"
                  onClick={() => setPayInvoice(null)}
                  className="px-3 py-2 text-xs font-semibold text-[#202729] bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#006D77] hover:bg-[#00575F] rounded-xl shadow-xs"
                >
                  Confirm Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Reminder Modal */}
      {whatsappModalData && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#D4E7EC] shadow-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-[#D4E7EC] pb-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#1E7E34]" />
                <h3 className="text-sm font-bold text-[#202729]">
                  Send WhatsApp Reminder
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappModalData(null)}
                className="text-[#5A6B70] hover:text-[#202729] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-[#5A6B70]">
                Pre-formatted WhatsApp message for{' '}
                <strong className="text-[#202729]">{whatsappModalData.invoice.customerName}</strong> (
                {whatsappModalData.invoice.customerPhone}):
              </p>

              <div className="p-3 bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729] whitespace-pre-line font-mono text-[11px] leading-relaxed">
                {whatsappModalData.message}
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#D4E7EC]">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(whatsappModalData.message);
                    showToast('Reminder copied to clipboard!');
                  }}
                  className="flex-1 py-2.5 px-3 bg-[#F4FAFB] hover:bg-[#E6F5F8] border border-[#D4E7EC] text-[#202729] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#5A6B70]" />
                  <span>Copy Text</span>
                </button>

                <a
                  href={whatsappModalData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer text-center"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Modal */}
      {historyInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#D4E7EC] shadow-xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#D4E7EC] pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-[#006D77]" />
                <h3 className="text-sm font-bold text-[#202729]">
                  Receipts for #{historyInvoice.invoiceNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHistoryInvoice(null)}
                className="text-[#5A6B70] hover:text-[#202729] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 text-xs">
              {historyInvoice.paymentHistory.map((p) => (
                <div
                  key={p.id}
                  className="p-3 bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl flex justify-between items-center"
                >
                  <div>
                    <span className="font-bold text-[#006D77] block">
                      {p.paymentMethod} Payment
                    </span>
                    <span className="text-[10px] text-[#5A6B70]">
                      {new Date(p.date).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {p.notes && <p className="text-[10px] text-[#5A6B70] italic">"{p.notes}"</p>}
                  </div>
                  <span className="font-mono font-bold text-sm text-[#006D77]">
                    +{formatAED(p.amount)}
                  </span>
                </div>
              ))}

              {historyInvoice.paymentHistory.length === 0 && (
                <p className="text-[#5A6B70] text-center py-6">No payments received yet.</p>
              )}
            </div>

            <div className="pt-2 border-t border-[#D4E7EC] flex justify-end">
              <button
                type="button"
                onClick={() => setHistoryInvoice(null)}
                className="px-4 py-2 text-xs font-bold text-white bg-[#006D77] rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {printInvoice && (
        <PrintInvoiceModal
          invoice={printInvoice}
          settings={settings}
          isOpen={!!printInvoice}
          onClose={() => setPrintInvoice(null)}
        />
      )}
    </div>
  );
};
