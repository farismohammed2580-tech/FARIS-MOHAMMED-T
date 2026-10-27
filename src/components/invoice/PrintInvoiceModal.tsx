import React, { useState } from 'react';
import { Invoice, BusinessSettings } from '../../types';
import { formatAED } from '../../utils/calculations';
import { Printer, X, Building2, Phone, ShieldCheck, Share2, MessageCircle, Download } from 'lucide-react';
import { WinWhiteLogo } from '../common/WinWhiteLogo';

interface PrintInvoiceModalProps {
  invoice: Invoice | null;
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  invoice,
  settings,
  isOpen,
  onClose,
}) => {
  const [copyMode, setCopyMode] = useState<'both' | 'customer' | 'merchant'>('both');
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  // WhatsApp Share Handler
  const handleWhatsAppShare = () => {
    const cleanPhone = invoice.customerPhone.replace(/[^0-9]/g, '');
    const dateFormatted = new Date(invoice.invoiceDate).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const itemsSummary = invoice.items
      .map((it) => `• ${it.dressTypeName} (${it.service}) x${it.quantity}: ${formatAED(it.subtotal)}`)
      .join('\n');

    const msg = `*WIN WHITE LAUNDRY - ABU DHABI*\n*Cash Invoice #${invoice.invoiceNumber}*\n\n` +
      `Dear ${invoice.customerName},\n` +
      `Thank you for trusting WIN WHITE LAUNDRY (Tourist Club, Abu Dhabi).\n\n` +
      `*Order Summary:*\n${itemsSummary}\n\n` +
      `*Total Amount:* ${formatAED(invoice.total)}\n` +
      `*Paid:* ${formatAED(invoice.amountPaid)}\n` +
      `*Remaining Balance:* ${formatAED(invoice.remainingBalance)}\n` +
      `*Receiving Date:* ${dateFormatted}\n` +
      `*Delivery Date:* ${invoice.expectedDeliveryDate}\n` +
      `*Status:* ${invoice.status}\n\n` +
      `Tel: ${settings.phone || '02 440 3012'} | Mob: ${settings.mobile || '056 657 5169'}\n` +
      `Zayed Street, Tourist Club, Behind Subaru Showroom, Abu Dhabi, U.A.E.\n` +
      `Email: ${settings.email || 'winwhite1222@gmail.com'}`;

    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Native Web Share or Clipboard Fallback
  const handleNativeShare = async () => {
    const shareText = `WIN WHITE LAUNDRY Cash Invoice #${invoice.invoiceNumber} for ${invoice.customerName}. Total: ${formatAED(invoice.total)}, Balance: ${formatAED(invoice.remainingBalance)}. Ready Date: ${invoice.expectedDeliveryDate}. Tel: 02 440 3012.`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Invoice #${invoice.invoiceNumber} - WIN WHITE LAUNDRY`,
          text: shareText,
        });
        return;
      } catch {
        // Fallback or user cancelled
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedNotification('Invoice summary copied to clipboard!');
      setTimeout(() => setCopiedNotification(null), 3000);
    } catch {
      handlePrint();
    }
  };

  const renderSingleInvoiceCopy = (copyType: 'CUSTOMER COPY' | 'MERCHANT COPY') => {
    const isCustomer = copyType === 'CUSTOMER COPY';
    const dateObj = new Date(invoice.invoiceDate);
    const formattedDate = dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const formattedTime = dateObj.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const rules = settings.rulesAndRegulations && settings.rulesAndRegulations.length > 0
      ? settings.rulesAndRegulations
      : [
          "1. The Laundry can't be Held Responsible for shrinkage or fastness of colour",
          "2. Any Claims must be reported within 24 hours from delivery of the articles.",
          "3. In case of loss of damage laundry will be liable for not more them three times cost cleaning the article.",
        ];

    return (
      <div
        className="bg-white border-2 border-[#B91C1C]/40 rounded-2xl p-3 sm:p-5 text-[#202729] text-xs shadow-xs page-copy print:border-2 print:border-[#B91C1C] print:shadow-none print:m-0 print:p-6 mb-4 print:mb-0 print:break-after-page relative"
      >
        {/* Top Reference Bar: Copy indicator & TRN */}
        <div className="flex justify-between items-center border-b border-[#F0D5D5] pb-2 mb-2 gap-2 text-[10px]">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                isCustomer
                  ? 'bg-[#FDF2F2] text-[#B91C1C] border border-[#FECACA]'
                  : 'bg-[#F4FAFB] text-[#006D77] border border-[#BDE7EF]'
              }`}
            >
              {copyType}
            </span>
            <span className="font-mono font-bold text-[#B91C1C]">
              No. {invoice.invoiceNumber.replace(/^No\.\s*/i, '')}
            </span>
          </div>
          <div className="text-right font-mono text-[#5A696D]">
            <span>TRN: {settings.trnNumber || '100482910400003'}</span>
          </div>
        </div>

        {/* Invoice Top Header - Directly modeled after the real paper invoice */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center border-b-2 border-[#B91C1C] pb-3 mb-3">
          {/* Left: Business Name & Full Coordinates */}
          <div className="sm:col-span-5 space-y-0.5">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-[#B91C1C] leading-none uppercase">
              {settings.businessName || 'WIN WHITE LAUNDRY'}
            </h1>
            <p className="text-[10px] font-bold text-[#5A6B70] uppercase">
              {settings.businessType || 'Laundry Shop'}
            </p>
            <div className="text-[9.5px] text-[#4A5557] space-y-0.5 pt-0.5 leading-snug">
              <p>
                <span className="font-semibold text-[#202729]">Tel. :</span> {settings.phone || '02 440 3012'}
              </p>
              <p>
                <span className="font-semibold text-[#202729]">Mob.:</span> {settings.mobile || '056 657 5169'}
              </p>
              <p>
                <span className="font-semibold text-[#202729]">P.O. Box:</span> {settings.poBox || '4575'}
              </p>
              <p className="truncate" title={settings.address}>
                {settings.address || 'Zayed Street, Tourist Club, Behind Subaru Showroom, Abu Dhabi, U.A.E.'}
              </p>
              <p>
                <span className="font-semibold text-[#202729]">E-mail:</span> {settings.email || 'winwhite1222@gmail.com'}
              </p>
            </div>
          </div>

          {/* Center: Official Circular Red Logo + CASH INVOICE Title (English Only) */}
          <div className="sm:col-span-3 flex flex-col items-center justify-center text-center my-1 sm:my-0">
            <WinWhiteLogo logoUrl={settings.logoUrl} size={54} alt={settings.businessName} />
            <div className="mt-1">
              <span className="inline-block bg-[#B91C1C] text-white text-[11px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded shadow-2xs">
                CASH INVOICE
              </span>
            </div>
          </div>

          {/* Right: Express Service & Free Home Delivery Badges */}
          <div className="sm:col-span-4 flex flex-col items-start sm:items-end justify-center space-y-1.5">
            {settings.expressServiceAvailable !== false && (
              <div className="bg-[#FDF2F2] border border-[#FECACA] px-2.5 py-1 rounded-lg text-left sm:text-right w-full sm:w-auto">
                <span className="block font-black text-[10px] text-[#B91C1C] uppercase tracking-wide">
                  ⚡ {settings.expressServiceText || 'EXPRESS SERVICE 1 HOUR'}
                </span>
              </div>
            )}
            {settings.freeDeliveryAvailable !== false && (
              <div className="bg-[#E6F5F8] border border-[#BDE7EF] px-2.5 py-1 rounded-lg text-left sm:text-right w-full sm:w-auto">
                <span className="block font-bold text-[9.5px] text-[#006D77] uppercase tracking-wide">
                  🚚 {settings.freeDeliveryText || 'FREE HOME DELIVERY'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Customer & Invoice Metadata Box */}
        <div className="bg-[#F4FAFB] border border-[#DDE8EA] rounded-xl p-2.5 mb-3 text-xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-[9px] uppercase font-bold text-[#5A6B70] block">Invoice No.</span>
              <span className="font-mono font-bold text-[#B91C1C] text-xs">
                No. {invoice.invoiceNumber.replace(/^No\.\s*/i, '')}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-[#5A6B70] block">Date & Time</span>
              <span className="font-mono font-semibold text-[#202729] text-[11px]">
                {formattedDate} {formattedTime}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-[#5A6B70] block">Mr. / M/s</span>
              <span className="font-bold text-[#202729] text-xs truncate block" title={invoice.customerName}>
                {invoice.customerName}
              </span>
            </div>
            <div>
              <span className="text-[9px] uppercase font-bold text-[#5A6B70] block">Phone / Mobile</span>
              <span className="font-mono font-bold text-[#202729] text-xs">
                {invoice.customerPhone}
              </span>
            </div>
          </div>
        </div>

        {/* Itemized Garments Table (ENGLISH ONLY) */}
        <div className="border border-[#DDE8EA] rounded-xl overflow-hidden mb-3">
          <table className="w-full text-left border-collapse text-[10.5px]">
            <thead>
              <tr className="bg-[#FDF2F2] border-b border-[#FECACA] text-[#B91C1C] font-bold text-[10px] uppercase">
                <th className="py-2 px-2.5 w-7 text-center">#</th>
                <th className="py-2 px-2.5">Description</th>
                <th className="py-2 px-2">Service</th>
                <th className="py-2 px-2 text-center w-10">Qty</th>
                <th className="py-2 px-2 text-right w-16">Unit (Dhs.)</th>
                <th className="py-2 px-2.5 text-right w-20">Amount (Dhs.)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAEAEA] text-[10.5px]">
              {invoice.items.map((item, idx) => (
                <tr key={item.id || idx} className="hover:bg-[#FAF9F6]">
                  <td className="py-2 px-2.5 text-center font-mono text-[#5A6B70]">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-2.5 font-bold text-[#202729] uppercase">
                    {item.dressTypeName}
                    {item.specialInstructions && (
                      <span className="block text-[9px] text-[#B91C1C] font-normal normal-case">
                        Note: {item.specialInstructions}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 font-medium">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9.5px] bg-[#E6F5F8] text-[#006D77] border border-[#BDE7EF] font-semibold">
                      {item.service}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center font-mono font-black text-[#202729]">
                    {item.quantity}
                  </td>
                  <td className="py-2 px-2 text-right font-mono text-[#5A6B70]">
                    {item.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono font-bold text-[#202729]">
                    {item.subtotal.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Totals & Status Section */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-3 items-start">
          {/* Left: Payment info & Receiving/Delivery dates */}
          <div className="sm:col-span-7 bg-[#F4FAFB] border border-[#DDE8EA] rounded-xl p-3 space-y-2 text-xs">
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-[#DDE8EA]">
              <div>
                <span className="text-[9.5px] text-[#5A6B70] uppercase font-bold block">Receiving Date</span>
                <span className="font-mono font-bold text-[#202729] text-[11px]">
                  {formattedDate}
                </span>
              </div>
              <div>
                <span className="text-[9.5px] text-[#5A6B70] uppercase font-bold block">Delivery Date</span>
                <span className="font-mono font-bold text-[#B91C1C] text-[11px]">
                  {invoice.expectedDeliveryDate || 'Prompt Delivery'}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#5A6B70]">Payment Method:</span>
              <span className="font-bold text-[#202729] bg-white px-2 py-0.5 rounded border border-[#DDE8EA]">
                {invoice.paymentMethod}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px]">
              <span className="text-[#5A6B70]">Payment Settlement:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                  invoice.paymentStatus === 'Paid'
                    ? 'bg-[#E6F5F8] text-[#006D77] border border-[#BDE7EF]'
                    : invoice.paymentStatus === 'Partial'
                    ? 'bg-[#FEF7EA] text-[#99600D] border border-[#F5DEB4]'
                    : 'bg-[#FDF2F2] text-[#B91C1C] border border-[#FECACA]'
                }`}
              >
                {invoice.paymentStatus}
              </span>
            </div>

            {invoice.notes && (
              <div className="pt-1.5 border-t border-[#DDE8EA] text-[10.5px] text-[#5A6B70]">
                <span className="font-bold text-[#202729]">Special Instructions: </span>
                {invoice.notes}
              </div>
            )}
          </div>

          {/* Right: Totals Box modeled after the Dhs./Fils total box on paper invoice */}
          <div className="sm:col-span-5 bg-[#FAF9F6] border-2 border-[#B91C1C]/30 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex justify-between text-[#5A6B70]">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-[#202729]">
                Dhs. {invoice.subtotal.toFixed(2)}
              </span>
            </div>

            {invoice.discount > 0 && (
              <div className="flex justify-between text-[#006D77] font-medium">
                <span>Discount:</span>
                <span className="font-mono font-bold">-Dhs. {invoice.discount.toFixed(2)}</span>
              </div>
            )}

            {/* Main TOTAL AMOUNT Banner matching red print on invoice */}
            <div className="flex justify-between items-center bg-[#B91C1C] text-white p-2 rounded-lg font-black text-sm">
              <span className="uppercase tracking-wider">TOTAL AMOUNT:</span>
              <span className="font-mono text-base">Dhs. {invoice.total.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-[#5A6B70] pt-1 border-t border-[#DDE8EA]">
              <span>Amount Paid:</span>
              <span className="font-mono font-bold text-[#006D77]">
                Dhs. {invoice.amountPaid.toFixed(2)}
              </span>
            </div>

            <div className="flex justify-between text-xs font-bold pt-1 border-t border-dashed border-[#DDE8EA]">
              <span className="text-[#202729]">Balance Due:</span>
              <span
                className={`font-mono text-sm font-black ${
                  invoice.remainingBalance > 0 ? 'text-[#B91C1C]' : 'text-[#006D77]'
                }`}
              >
                Dhs. {invoice.remainingBalance.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Original English Rules & Regulations (Directly Transcribed from Reference Invoice) */}
        <div className="border-t-2 border-[#B91C1C]/40 pt-2.5 mt-2">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-2 bg-[#FDF2F2]/60 border border-[#FECACA] rounded-xl p-2.5 text-[9.5px] text-[#4A5557] leading-relaxed">
            <div className="space-y-1 flex-1">
              {rules.map((rule, rIdx) => (
                <p key={rIdx} className="text-[#202729] font-medium">
                  {rule}
                </p>
              ))}
            </div>
            <div className="shrink-0 font-bold text-[#B91C1C] text-[10px] uppercase sm:border-l sm:border-[#FECACA] sm:pl-3 self-center sm:self-auto">
              Rules & Regulations Apply
            </div>
          </div>

          {/* Footer Thank You & Signature Line */}
          <div className="flex justify-between items-end mt-3 pt-1 text-[10px] text-[#5A6B70]">
            <div>
              <p className="font-bold text-[#B91C1C]">
                {settings.thankYouMessage || 'Thank you for visiting WIN WHITE LAUNDRY!'}
              </p>
              <p className="text-[9px] text-[#5A6B70] mt-0.5">
                WIN WHITE LAUNDRY • Abu Dhabi, U.A.E. • Tel: {settings.phone || '02 440 3012'}
              </p>
            </div>
            <div className="text-right">
              <div className="w-28 sm:w-36 border-b border-[#202729] mb-1"></div>
              <p className="text-[#202729] text-[9.5px] font-semibold">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex justify-center p-2 print:p-0 print:bg-white print:static print:overflow-visible">
      <div className="relative bg-[#F4FAFB] rounded-2xl shadow-2xl max-w-[430px] md:max-w-2xl lg:max-w-3xl w-full my-auto flex flex-col max-h-[96vh] border border-[#DDE8EA] print:max-h-none print:shadow-none print:my-0 print:rounded-none print:bg-white print:w-full print:border-none">
        <div className="p-3 bg-white border-b border-[#DDE8EA] rounded-t-2xl space-y-2 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#E6F7FD] text-[#006D77] rounded-xl border border-[#70D0F5]/50">
              <Printer className="w-4 h-4 text-[#006D77]" />
            </div>
            <div>
              <h2 className="font-bold text-sm sm:text-base text-[#202729]">
                Invoice #{invoice.invoiceNumber}
              </h2>
              <p className="text-[10px] sm:text-xs text-[#5A696D] truncate max-w-[200px] sm:max-w-none">
                {invoice.customerName} • {formatAED(invoice.total)}
              </p>
            </div>
          </div>

          {/* Actions & Copy Selector */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Copy Selector */}
            <div className="inline-flex rounded-xl border border-[#DDE8EA] bg-[#F4FAFB] p-0.5 text-xs text-[#202729]">
              <button
                type="button"
                onClick={() => setCopyMode('both')}
                className={`px-2 sm:px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                  copyMode === 'both' ? 'bg-[#006D77] text-white shadow-2xs font-bold' : 'hover:bg-[#E6F7FD]'
                }`}
              >
                Both
              </button>
              <button
                type="button"
                onClick={() => setCopyMode('customer')}
                className={`px-2 sm:px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                  copyMode === 'customer' ? 'bg-[#006D77] text-white shadow-2xs font-bold' : 'hover:bg-[#E6F7FD]'
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => setCopyMode('merchant')}
                className={`px-2 sm:px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-[11px] ${
                  copyMode === 'merchant' ? 'bg-[#006D77] text-white shadow-2xs font-bold' : 'hover:bg-[#E6F7FD]'
                }`}
              >
                Merchant
              </button>
            </div>

            {/* WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer touch-target"
              title="Share invoice with customer via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            {/* Mobile Native Share */}
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-[#E6F7FD] hover:bg-[#d6f0fb] text-[#006D77] border border-[#70D0F5]/50 text-xs font-bold rounded-xl transition active:scale-95 cursor-pointer touch-target"
              title="Share or Copy Invoice Summary"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>

            {/* Browser Print / PDF Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#006D77] hover:bg-[#00565E] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer touch-target"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#5A696D] hover:text-[#202729] hover:bg-[#F4FAFB] rounded-xl transition cursor-pointer touch-target"
              aria-label="Close invoice preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Copied alert */}
        {copiedNotification && (
          <div className="bg-[#E6F7FD] text-[#006D77] border-b border-[#70D0F5]/50 px-4 py-1.5 text-xs font-bold text-center">
            {copiedNotification}
          </div>
        )}

        {/* Scrollable Printable Document Area */}
        <div className="p-3 sm:p-6 overflow-y-auto flex-1 bg-[#F4FAFB] print:p-0 print:overflow-visible print:bg-white">
          <div className="max-w-[740px] mx-auto print:max-w-none print:w-full">
            {(copyMode === 'both' || copyMode === 'customer') && renderSingleInvoiceCopy('CUSTOMER COPY')}

            {copyMode === 'both' && (
              <div className="print:hidden border-t-2 border-dashed border-[#DDE8EA] my-3 text-center">
                <span className="bg-[#E6F7FD] text-[#006D77] text-[10px] px-3 py-0.5 rounded-full font-medium border border-[#70D0F5]/40">
                  ✂ Cut along line or prints on separate page
                </span>
              </div>
            )}

            {(copyMode === 'both' || copyMode === 'merchant') && renderSingleInvoiceCopy('MERCHANT COPY')}
          </div>
        </div>
      </div>
    </div>
  );
};
