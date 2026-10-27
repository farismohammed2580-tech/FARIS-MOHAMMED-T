import React from 'react';
import { MonthlyStatement, BusinessSettings } from '../../types';
import { formatAED } from '../../utils/calculations';
import { formatDubaiDateDisplay } from '../../utils/billingCycle';
import { WinWhiteLogo } from '../common/WinWhiteLogo';
import { X, Printer, Share2, CheckCircle2 } from 'lucide-react';

interface StatementPrintModalProps {
  statement: MonthlyStatement;
  settings: BusinessSettings;
  onClose: () => void;
  onSendWhatsApp?: () => void;
}

export const StatementPrintModal: React.FC<StatementPrintModalProps> = ({
  statement,
  settings,
  onClose,
  onSendWhatsApp,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:rounded-none print:border-none border border-[#DDE8EA]">
        {/* Modal Controls (Hidden in Print) */}
        <div className="p-3.5 sm:p-4 bg-[#F4FAFB] border-b border-[#DDE8EA] flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#006D77] uppercase tracking-wider bg-white px-2 py-0.5 rounded-full border border-[#DDE8EA]">
              Monthly Account Statement
            </span>
            <span className="text-xs font-mono font-bold text-[#202729]">
              {statement.statementNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onSendWhatsApp && (
              <button
                type="button"
                onClick={onSendWhatsApp}
                className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer touch-target"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#006D77] hover:bg-[#00575F] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer touch-target"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statement</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white text-[#5A696D] hover:text-[#202729] border border-[#DDE8EA] transition cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Statement Document */}
        <div className="p-4 sm:p-8 overflow-y-auto print:p-0 print:overflow-visible space-y-6 text-[#202729] font-sans">
          {/* Header */}
          <div className="border-b-2 border-[#006D77] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <WinWhiteLogo logoUrl={settings.logoUrl} size={54} alt={settings.businessName} />
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-[#006D77] tracking-tight leading-none">
                  {settings.businessName || 'WIN WHITE LAUNDRY'}
                </h1>
                <p className="text-xs font-semibold text-[#5A696D] mt-0.5">
                  {settings.businessType || 'Laundry Shop'} • P.O. Box: {settings.poBox || '4575'}
                </p>
                <p className="text-[11px] text-[#5A696D] mt-0.5 leading-tight">
                  {settings.address || 'Zayed Street, Tourist Club, Behind Subaru Showroom, Abu Dhabi, U.A.E.'}
                </p>
                <p className="text-[11px] font-mono text-[#006D77] mt-0.5 font-bold">
                  Tel: {settings.phone || '02 440 3012'} | Mob: {settings.mobile || '056 657 5169'}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right bg-[#F4FAFB] p-3 rounded-xl border border-[#DDE8EA] sm:bg-transparent sm:border-0 sm:p-0">
              <span className="text-xs font-extrabold uppercase tracking-widest text-[#006D77] block">
                MONTHLY STATEMENT
              </span>
              <p className="text-sm font-mono font-bold text-[#202729] mt-0.5">
                {statement.statementNumber}
              </p>
              <p className="text-[11px] text-[#5A696D] mt-1">
                Issued: <strong>{formatDubaiDateDisplay(statement.generationDate)}</strong>
              </p>
              <p className="text-[11px] text-[#5A696D]">
                Billing Cycle: <strong>{statement.periodLabel}</strong>
              </p>
            </div>
          </div>

          {/* Customer & Account Details Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#F4FAFB] rounded-2xl border border-[#DDE8EA]">
            <div>
              <span className="text-[10px] font-bold text-[#5A696D] uppercase tracking-wider block">
                Account Holder
              </span>
              <p className="text-sm font-bold text-[#202729] mt-0.5">{statement.customerName}</p>
              <p className="text-xs font-mono text-[#006D77] font-semibold mt-0.5">
                Code: {statement.customerCode}
              </p>
              {statement.customerAddress && (
                <p className="text-[11px] text-[#5A696D] mt-0.5">{statement.customerAddress}</p>
              )}
            </div>

            <div className="sm:text-right">
              <span className="text-[10px] font-bold text-[#5A696D] uppercase tracking-wider block">
                Contact & WhatsApp
              </span>
              <p className="text-xs font-mono font-bold text-[#202729] mt-0.5">
                {statement.whatsappNumber || statement.customerPhone}
              </p>
              <p className="text-[11px] text-[#5A696D] mt-1">
                Currency: <strong>AED (UAE Dirhams)</strong>
              </p>
            </div>
          </div>

          {/* Invoices Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#202729] uppercase tracking-wider">
              Cycle Order Breakdown ({statement.invoices.length} Orders)
            </h3>

            {statement.invoices.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-[#DDE8EA] text-center text-xs text-[#5A696D]">
                No orders registered during this billing period.
              </div>
            ) : (
              <div className="border border-[#DDE8EA] rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-[#E5EFF1] text-[#202729] font-bold border-b border-[#DDE8EA]">
                    <tr>
                      <th className="py-2 px-3 text-left">Invoice No</th>
                      <th className="py-2 px-2 text-left">Date</th>
                      <th className="py-2 px-2 text-left hidden sm:table-cell">Garments Summary</th>
                      <th className="py-2 px-2 text-right">Total</th>
                      <th className="py-2 px-2 text-right">Paid</th>
                      <th className="py-2 px-3 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#DDE8EA]/80">
                    {statement.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#F4FAFB]/80">
                        <td className="py-2 px-3 font-mono font-bold text-[#006D77]">{inv.invoiceNumber}</td>
                        <td className="py-2 px-2 font-mono text-[#5A696D] whitespace-nowrap">
                          {formatDubaiDateDisplay(inv.invoiceDate)}
                        </td>
                        <td className="py-2 px-2 text-[#5A696D] truncate max-w-[180px] hidden sm:table-cell">
                          {inv.itemsSummary || 'Laundry service'}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-semibold">
                          {formatAED(inv.total)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-[#006D77]">
                          {formatAED(inv.amountPaid)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#9E3636]">
                          {formatAED(inv.remainingBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Statement Financial Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
            <div className="text-[11px] text-[#5A696D] space-y-1 max-w-sm">
              <p className="font-bold text-[#202729]">Payment Instructions:</p>
              <p>Settlement can be made via Cash, Card, or direct Bank Transfer upon delivery.</p>
              <p>For inquiries, please quote Account Code <strong>{statement.customerCode}</strong>.</p>
            </div>

            <div className="w-full sm:w-72 bg-[#F4FAFB] p-3.5 rounded-2xl border border-[#DDE8EA] space-y-2">
              <div className="flex justify-between text-xs text-[#5A696D]">
                <span>Total Billed (This Cycle):</span>
                <span className="font-mono font-bold text-[#202729]">{formatAED(statement.totalBilled)}</span>
              </div>
              <div className="flex justify-between text-xs text-[#5A696D]">
                <span>Payments Received in Cycle:</span>
                <span className="font-mono font-bold text-[#006D77]">
                  - {formatAED(statement.paymentsReceivedInCycle)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-[#5A696D] pt-1 border-t border-[#DDE8EA]">
                <span>Current Cycle Balance:</span>
                <span className="font-mono font-bold text-[#202729]">
                  {formatAED(statement.currentCycleOutstanding)}
                </span>
              </div>
              {statement.previousOutstandingBalance > 0 && (
                <div className="flex justify-between text-xs text-[#9E3636]">
                  <span>Prior Cycles Balance:</span>
                  <span className="font-mono font-bold">
                    + {formatAED(statement.previousOutstandingBalance)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-[#006D77] pt-2 border-t-2 border-[#006D77]">
                <span>TOTAL DUE:</span>
                <span className="font-mono">{formatAED(statement.totalAmountDue)}</span>
              </div>
            </div>
          </div>

          {/* Footer Notice */}
          <div className="pt-4 border-t border-[#DDE8EA] text-center text-[10px] text-[#5A696D] space-y-0.5">
            <p className="font-bold text-[#006D77]">WIN WHITE LAUNDRY – TOURIST CLUB, ABU DHABI</p>
            <p>Thank you for your continuous patronage and trust in our quality laundry service!</p>
          </div>
        </div>
      </div>
    </div>
  );
};
