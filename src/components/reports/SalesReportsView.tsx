import React, { useState, useEffect, useMemo } from 'react';
import { Invoice, ServiceType, SERVICE_TYPES } from '../../types';
import { storage } from '../../services/storage';
import { formatAED, isDateInPeriod } from '../../utils/calculations';
import { exportSalesSummaryCSV, exportInvoicesCSV } from '../../utils/export';
import {
  Download,
  CreditCard,
  AlertCircle,
  FileText,
  PieChart,
  Layers,
  Calendar,
} from 'lucide-react';

export const SalesReportsView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const load = () => setInvoices(storage.getInvoices());
    load();
    return storage.subscribe(load);
  }, []);

  // Filter invoices for current selected period
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => isDateInPeriod(inv.invoiceDate, period, customStart, customEnd));
  }, [invoices, period, customStart, customEnd]);

  // Compute key reporting metrics
  const reportMetrics = useMemo(() => {
    let totalSales = 0;
    let paymentsReceived = 0;
    let outstandingBalances = 0;

    const serviceBreakdown: Record<string, { count: number; totalAED: number }> = {
      'Normal Wash': { count: 0, totalAED: 0 },
      'Dry Cleaning': { count: 0, totalAED: 0 },
      'Only Pressing': { count: 0, totalAED: 0 },
      'Only Wash': { count: 0, totalAED: 0 },
      'Washing + Ironing': { count: 0, totalAED: 0 },
      'Washing Only': { count: 0, totalAED: 0 },
      'Pressing Only': { count: 0, totalAED: 0 },
    };

    const dailyMap: Record<string, { date: string; sales: number; paid: number; count: number }> = {};

    filteredInvoices.forEach((inv) => {
      totalSales += inv.total;
      paymentsReceived += inv.amountPaid;
      outstandingBalances += inv.remainingBalance;

      inv.items.forEach((item) => {
        if (serviceBreakdown[item.service]) {
          serviceBreakdown[item.service].count += item.quantity;
          serviceBreakdown[item.service].totalAED += item.subtotal;
        }
      });

      const day = inv.invoiceDate.slice(0, 10);
      if (!dailyMap[day]) {
        dailyMap[day] = { date: day, sales: 0, paid: 0, count: 0 };
      }
      dailyMap[day].sales += inv.total;
      dailyMap[day].paid += inv.amountPaid;
      dailyMap[day].count += 1;
    });

    const dailyList = Object.values(dailyMap).sort((a, b) => (b.date > a.date ? 1 : -1));

    return {
      totalSales: Number(totalSales.toFixed(2)),
      paymentsReceived: Number(paymentsReceived.toFixed(2)),
      outstandingBalances: Number(outstandingBalances.toFixed(2)),
      invoicesCount: filteredInvoices.length,
      serviceBreakdown,
      dailyList,
    };
  }, [filteredInvoices]);

  const periodLabels: Record<string, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
    custom: `Custom (${customStart} to ${customEnd})`,
  };

  const handleExport = () => {
    exportSalesSummaryCSV(periodLabels[period], {
      totalSales: reportMetrics.totalSales,
      paymentsReceived: reportMetrics.paymentsReceived,
      outstandingBalances: reportMetrics.outstandingBalances,
      invoicesCount: reportMetrics.invoicesCount,
      serviceBreakdown: reportMetrics.serviceBreakdown,
    });
  };

  return (
    <div className="space-y-3.5">
      {/* Header & Export */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-2.5">
        <div>
          <h1 className="text-base font-bold text-[#202729] tracking-tight">Sales & Revenue Reports</h1>
          <p className="text-xs text-[#5A6B70] mt-0.5">
            Turnover, collections, and service volume metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportInvoicesCSV(filteredInvoices)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-[#202729] bg-[#F4FAFB] hover:bg-[#E6F5F8] border border-[#D4E7EC] rounded-xl transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#5A6B70]" />
            <span>Invoices CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#006D77] hover:bg-[#00575F] rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Full Report</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector Bar */}
      <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs space-y-2">
        <div className="flex flex-wrap items-center gap-1">
          {(['today', 'yesterday', 'week', 'month', 'year', 'custom'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                period === p
                  ? 'bg-[#006D77] text-white shadow-xs'
                  : 'bg-[#F4FAFB] text-[#202729] border border-[#D4E7EC] hover:bg-[#E6F5F8]'
              }`}
            >
              {p === 'week' ? 'Week' : p === 'month' ? 'Month' : p === 'year' ? 'Year' : p}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 text-xs pt-1">
            <span className="text-[#5A6B70] font-bold text-[10px]">From:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="flex-1 px-2 py-1 bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-xs font-mono text-[#202729]"
            />
            <span className="text-[#5A6B70] font-bold text-[10px]">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="flex-1 px-2 py-1 bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-xs font-mono text-[#202729]"
            />
          </div>
        )}
      </div>

      {/* 4 Core Financial Stat Cards: 2x2 on Mobile, 4-Cols on Tablet */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3.5">
        {/* Total Invoiced Sales */}
        <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
          <div className="flex justify-between items-center text-[#5A6B70]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Invoiced Sales</span>
            <FileText className="w-3.5 h-3.5 text-[#006D77]" />
          </div>
          <p className="text-sm font-black text-[#202729] font-mono mt-1.5 truncate">
            {formatAED(reportMetrics.totalSales)}
          </p>
          <p className="text-[10px] text-[#5A6B70] mt-0.5 truncate">{periodLabels[period]}</p>
        </div>

        {/* Payments Collected */}
        <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
          <div className="flex justify-between items-center text-[#006D77]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Cash Collected</span>
            <CreditCard className="w-3.5 h-3.5" />
          </div>
          <p className="text-sm font-black text-[#006D77] font-mono mt-1.5 truncate">
            {formatAED(reportMetrics.paymentsReceived)}
          </p>
          <p className="text-[10px] text-[#5A6B70] mt-0.5 truncate">Collected</p>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
          <div className="flex justify-between items-center text-[#9E3636]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Unsettled</span>
            <AlertCircle className="w-3.5 h-3.5" />
          </div>
          <p className="text-sm font-black text-[#9E3636] font-mono mt-1.5 truncate">
            {formatAED(reportMetrics.outstandingBalances)}
          </p>
          <p className="text-[10px] text-[#5A6B70] mt-0.5 truncate">Pending collection</p>
        </div>

        {/* Invoices Count */}
        <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
          <div className="flex justify-between items-center text-[#5A6B70]">
            <span className="text-[10px] font-bold uppercase tracking-wider">Invoices</span>
            <Layers className="w-3.5 h-3.5 text-[#006D77]" />
          </div>
          <p className="text-sm font-black text-[#202729] font-mono mt-1.5">
            {reportMetrics.invoicesCount}
          </p>
          <p className="text-[10px] text-[#5A6B70] mt-0.5 truncate">Orders logged</p>
        </div>
      </div>

      {/* Responsive Section Grid: 2-Column on Tablet, Stacked on Mobile */}
      <div className="space-y-3.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 md:items-start">
        {/* Service Breakdown */}
        <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-3">
        <div className="flex items-center gap-2 border-b border-[#D4E7EC] pb-2">
          <PieChart className="w-4 h-4 text-[#006D77]" />
          <h2 className="text-xs font-bold text-[#202729]">Service-Wise Sales Analysis</h2>
        </div>

        <div className="space-y-2.5">
          {SERVICE_TYPES.map((st) => {
            const data = reportMetrics.serviceBreakdown[st] || { count: 0, totalAED: 0 };
            const percent =
              reportMetrics.totalSales > 0
                ? Math.round((data.totalAED / reportMetrics.totalSales) * 100)
                : 0;

            return (
              <div key={st} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-[#202729] text-[11px]">{st}</span>
                  <span className="font-mono font-bold text-[#006D77] text-[11px]">
                    {formatAED(data.totalAED)}{' '}
                    <span className="text-[10px] text-[#5A6B70]">({percent}%)</span>
                  </span>
                </div>

                <div className="w-full bg-[#F4FAFB] h-1.5 rounded-full overflow-hidden border border-[#D4E7EC]">
                  <div
                    className="bg-[#006D77] h-full rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-[#5A6B70]">
                  <span>{data.count} pieces processed</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-3">
        <div className="flex justify-between items-center border-b border-[#D4E7EC] pb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#006D77]" />
            <h2 className="text-xs font-bold text-[#202729]">Daily Breakdown</h2>
          </div>
          <span className="text-[10px] text-[#5A6B70]">{reportMetrics.dailyList.length} days</span>
        </div>

        <div className="space-y-2">
          {reportMetrics.dailyList.map((d) => (
            <div
              key={d.date}
              className="p-2.5 bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl flex justify-between items-center"
            >
              <div>
                <span className="font-mono font-bold text-xs text-[#202729]">{d.date}</span>
                <span className="block text-[10px] text-[#5A6B70]">{d.count} invoices</span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-xs text-[#202729] block">
                  Sales: {formatAED(d.sales)}
                </span>
                <span className="font-mono text-[11px] text-[#006D77] block">
                  Paid: {formatAED(d.paid)}
                </span>
              </div>
            </div>
          ))}

          {reportMetrics.dailyList.length === 0 && (
            <div className="py-6 text-center text-xs text-[#5A6B70]">
              No transactions recorded in this period.
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  );
};
