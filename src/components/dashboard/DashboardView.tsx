import React, { useState, useEffect, useMemo } from 'react';
import { Invoice, Expense, BusinessSettings } from '../../types';
import { storage } from '../../services/storage';
import { calculateDashboardMetrics, formatAED } from '../../utils/calculations';
import {
  TrendingUp,
  CreditCard,
  AlertCircle,
  PackageCheck,
  Clock,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Printer,
  ShoppingBag,
} from 'lucide-react';
import { PrintInvoiceModal } from '../invoice/PrintInvoiceModal';

interface DashboardViewProps {
  settings: BusinessSettings;
  onNavigateTo: (tabId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ settings, onNavigateTo }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);

  useEffect(() => {
    const load = () => {
      setInvoices(storage.getInvoices());
      setExpenses(storage.getExpenses());
    };
    load();
    return storage.subscribe(load);
  }, []);

  const metrics = useMemo(() => {
    return calculateDashboardMetrics(invoices, expenses);
  }, [invoices, expenses]);

  // Orders ready for pickup
  const readyOrders = useMemo(() => {
    return invoices.filter((i) => i.status === 'Ready for Pickup').slice(0, 5);
  }, [invoices]);

  // Recent invoices (top 6)
  const recentInvoices = useMemo(() => {
    return [...invoices]
      .sort((a, b) => (b.invoiceDate > a.invoiceDate ? 1 : -1))
      .slice(0, 6);
  }, [invoices]);

  return (
    <div className="space-y-3.5">
      {/* Welcome & Overview Header */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-[#202729] tracking-tight">Executive Dashboard</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F5F8] text-[#006D77] border border-[#006D77]/20">
              Live
            </span>
          </div>
          <p className="text-xs text-[#5A6B70] mt-0.5">
            Operational workflow for {settings.businessName}.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigateTo('billing')}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#006D77] hover:bg-[#00575F] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>New Invoice (Billing)</span>
        </button>
      </div>

      {/* 8 Summary Cards: 2-Column on Mobile, 4-Column on Tablet */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3.5">
        {/* 1. Today's Sales */}
        <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[#5A6B70] uppercase tracking-wider">
              Today's Sales
            </span>
            <div className="p-1 rounded-lg bg-[#E6F5F8] text-[#006D77]">
              <TrendingUp className="w-3 h-3" />
            </div>
          </div>
          <p className="text-sm font-black text-[#202729] font-mono mt-1.5 truncate">
            {formatAED(metrics.todaySales)}
          </p>
          <p className="text-[10px] text-[#5A6B70] mt-0.5 truncate">Total billed</p>
        </div>

        {/* 2. Payments Received Today */}
        <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[#006D77] uppercase tracking-wider">
              Payments In
            </span>
            <div className="p-1 rounded-lg bg-[#E6F5F8] text-[#006D77]">
              <CreditCard className="w-3 h-3" />
            </div>
          </div>
          <p className="text-sm font-black text-[#006D77] font-mono mt-1.5 truncate">
            {formatAED(metrics.todayPaymentsReceived)}
          </p>
          <p className="text-[10px] text-[#5A6B70] mt-0.5 truncate">Cash & Card</p>
        </div>

        {/* 3. Outstanding Balances */}
        <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[#9E3636] uppercase tracking-wider">
              Receivables
            </span>
            <div className="p-1 rounded-lg bg-[#FCEEEE] text-[#9E3636]">
              <AlertCircle className="w-3 h-3" />
            </div>
          </div>
          <p className="text-sm font-black text-[#9E3636] font-mono mt-1.5 truncate">
            {formatAED(metrics.outstandingCustomerBalances)}
          </p>
          <button
            type="button"
            onClick={() => onNavigateTo('pending-payments')}
            className="text-[10px] text-[#006D77] hover:underline font-bold mt-0.5 inline-flex items-center gap-0.5 cursor-pointer"
          >
            <span>Unpaid bills</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* 4. Orders Received Today */}
        <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[#5A6B70] uppercase tracking-wider">
              Intake Today
            </span>
            <div className="p-1 rounded-lg bg-[#F4FAFB] text-[#202729]">
              <PackageCheck className="w-3 h-3" />
            </div>
          </div>
          <p className="text-base font-black text-[#202729] font-mono mt-1.5">
            {metrics.ordersReceivedToday}
          </p>
          <p className="text-[10px] text-[#5A6B70] mt-0.5 truncate">Bookings logged</p>
        </div>

        {/* 5. Orders In Progress */}
        <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[#0369A1] uppercase tracking-wider">
              In Progress
            </span>
            <div className="p-1 rounded-lg bg-[#E0F2FE] text-[#0369A1]">
              <Clock className="w-3 h-3" />
            </div>
          </div>
          <p className="text-base font-black text-[#202729] font-mono mt-1.5">
            {metrics.ordersInProgress}
          </p>
          <button
            type="button"
            onClick={() => onNavigateTo('order-tracking')}
            className="text-[10px] text-[#0369A1] hover:underline font-bold mt-0.5 inline-flex items-center gap-0.5 cursor-pointer"
          >
            <span>Wash & Press</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* 6. Orders Ready for Pickup */}
        <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[#006D77] uppercase tracking-wider">
              Ready Pickup
            </span>
            <div className="p-1 rounded-lg bg-[#E6F5F8] text-[#006D77]">
              <CheckCircle2 className="w-3 h-3" />
            </div>
          </div>
          <p className="text-base font-black text-[#006D77] font-mono mt-1.5">
            {metrics.ordersReadyForPickup}
          </p>
          <p className="text-[10px] text-[#5A6B70] mt-0.5 truncate">On hanger / ready</p>
        </div>

        {/* 7. Orders Delivered Today */}
        <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[#006D77] uppercase tracking-wider">
              Delivered
            </span>
            <div className="p-1 rounded-lg bg-[#E6F5F8] text-[#006D77]">
              <CheckCircle2 className="w-3 h-3" />
            </div>
          </div>
          <p className="text-base font-black text-[#202729] font-mono mt-1.5">
            {metrics.ordersDeliveredToday}
          </p>
          <p className="text-[10px] text-[#5A6B70] mt-0.5 truncate">Handed to clients</p>
        </div>

        {/* 8. Today's Expenses */}
        <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-[#5A6B70] uppercase tracking-wider">
              Expenses
            </span>
            <div className="p-1 rounded-lg bg-[#F4FAFB] text-[#5A6B70]">
              <DollarSign className="w-3 h-3" />
            </div>
          </div>
          <p className="text-sm font-black text-[#202729] font-mono mt-1.5 truncate">
            {formatAED(metrics.todayExpenses)}
          </p>
          <button
            type="button"
            onClick={() => onNavigateTo('expenses')}
            className="text-[10px] text-[#006D77] hover:underline font-bold mt-0.5 inline-flex items-center gap-0.5 cursor-pointer"
          >
            <span>Expense book</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>

      {/* Responsive Section Grid: 2-Column on Tablet, Stacked on Mobile */}
      <div className="space-y-3.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 md:items-start">
        {/* Ready For Pickup Urgent Orders */}
        <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-3">
        <div className="flex justify-between items-center border-b border-[#D4E7EC] pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#006D77] animate-pulse"></span>
            <h2 className="text-xs font-bold text-[#202729]">Garments Ready For Pickup</h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTo('order-tracking')}
            className="text-[11px] text-[#006D77] hover:underline font-bold cursor-pointer"
          >
            See All ({metrics.ordersReadyForPickup})
          </button>
        </div>

        <div className="space-y-2">
          {readyOrders.map((inv) => (
            <div
              key={inv.id}
              className="p-2.5 rounded-xl border border-[#D4E7EC] bg-[#F4FAFB]/70 flex justify-between items-center"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-[#006D77]">{inv.invoiceNumber}</span>
                  <span className="font-bold text-xs text-[#202729]">{inv.customerName}</span>
                </div>
                <p className="text-[10px] text-[#5A6B70] font-mono mt-0.5">{inv.customerPhone}</p>
                <p className="text-[10px] text-[#5A6B70] mt-0.5">
                  {inv.items.reduce((s, it) => s + it.quantity, 0)} items • Due: {inv.expectedDeliveryDate}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono font-bold text-[#202729] block">
                  {formatAED(inv.total)}
                </span>
                {inv.remainingBalance > 0 ? (
                  <span className="text-[10px] text-[#9E3636] font-bold block">
                    Due: {formatAED(inv.remainingBalance)}
                  </span>
                ) : (
                  <span className="text-[10px] text-[#006D77] font-bold block">Paid</span>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedInvoiceForPrint(inv)}
                  className="mt-1 p-1 text-[#5A6B70] hover:text-[#006D77] rounded-lg transition inline-flex items-center gap-1 text-[10px] cursor-pointer"
                  title="Print Invoice"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          ))}

          {readyOrders.length === 0 && (
            <div className="py-6 text-center text-[#5A6B70] text-xs">
              No orders currently waiting for pickup.
            </div>
          )}
        </div>
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-3">
        <div className="flex justify-between items-center border-b border-[#D4E7EC] pb-2">
          <h2 className="text-xs font-bold text-[#202729]">Recent Customer Invoices</h2>
          <button
            type="button"
            onClick={() => onNavigateTo('order-tracking')}
            className="text-[11px] text-[#006D77] hover:underline font-bold cursor-pointer"
          >
            All Invoices
          </button>
        </div>

        {/* Mobile Single-Column Cards for Recent Invoices */}
        <div className="space-y-2">
          {recentInvoices.map((inv) => (
            <div
              key={inv.id}
              className="p-2.5 rounded-xl border border-[#D4E7EC] bg-[#F4FAFB]/70 space-y-1.5"
            >
              <div className="flex justify-between items-center">
                <span className="font-mono font-black text-xs text-[#006D77]">
                  {inv.invoiceNumber}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E6F5F8] text-[#006D77]">
                    {inv.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedInvoiceForPrint(inv)}
                    className="p-1 text-[#5A6B70] hover:text-[#006D77] cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#202729]">{inv.customerName}</span>
                <span className="font-mono font-bold text-[#202729]">{formatAED(inv.total)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-[#5A6B70]">
                <span>{inv.invoiceDate.slice(0, 10)}</span>
                <span
                  className={`font-bold ${
                    inv.paymentStatus === 'Paid'
                      ? 'text-[#006D77]'
                      : inv.paymentStatus === 'Partial'
                      ? 'text-[#B45309]'
                      : 'text-[#9E3636]'
                  }`}
                >
                  {inv.paymentStatus}
                </span>
              </div>
            </div>
          ))}

          {recentInvoices.length === 0 && (
            <div className="py-6 text-center text-xs text-[#5A6B70]">
              No invoices recorded yet.
            </div>
          )}
        </div>
      </div>
    </div>

      {/* Print Modal */}
      {selectedInvoiceForPrint && (
        <PrintInvoiceModal
          invoice={selectedInvoiceForPrint}
          settings={settings}
          isOpen={!!selectedInvoiceForPrint}
          onClose={() => setSelectedInvoiceForPrint(null)}
        />
      )}
    </div>
  );
};
