import React, { useState, useEffect, useMemo } from 'react';
import { Invoice, UserAccount, BusinessSettings } from '../../types';
import { storage } from '../../services/storage';
import {
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Shirt,
  Check,
  ChevronLeft,
  Calendar,
  Layers,
} from 'lucide-react';
import { WinWhiteLogo } from '../common/WinWhiteLogo';

interface StaffPortalViewProps {
  currentUser: UserAccount;
  settings: BusinessSettings;
  onSwitchToAdmin?: () => void;
  onLogout: () => void;
  isInspectionFromAdmin?: boolean;
}

export const StaffPortalView: React.FC<StaffPortalViewProps> = ({
  currentUser,
  settings,
  onSwitchToAdmin,
  onLogout,
  isInspectionFromAdmin = false,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Received' | 'In Progress' | 'Ready for Pickup'>('All');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [mobileDetailView, setMobileDetailView] = useState(false);

  useEffect(() => {
    const load = () => {
      setInvoices(storage.getInvoices());
    };
    load();
    return storage.subscribe(load);
  }, []);

  const selectedInvoice = useMemo(() => {
    if (!selectedInvoiceId) return null;
    return invoices.find((i) => i.id === selectedInvoiceId) || null;
  }, [invoices, selectedInvoiceId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const staffFilteredInvoices = useMemo(() => {
    const q = search.toLowerCase().trim();
    return invoices
      .filter((inv) => inv.status !== 'Delivered')
      .filter((inv) => {
        const matchesQuery =
          !q ||
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          inv.customerPhone.replace(/[^0-9]/g, '').includes(q);

        const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => (a.invoiceDate > b.invoiceDate ? 1 : -1));
  }, [invoices, search, statusFilter]);

  const handleSelectInvoice = (id: string) => {
    setSelectedInvoiceId(id);
    setMobileDetailView(true);
  };

  const handleUpdateStatus = (newStatus: 'In Progress' | 'Ready for Pickup', note?: string) => {
    if (!selectedInvoice || isUpdating) return;

    setIsUpdating(true);
    try {
      const updated = storage.updateOrderStatus(
        selectedInvoice.id,
        newStatus,
        `${currentUser.name} (Floor Staff)`,
        note || `Floor status updated to ${newStatus}`
      );

      if (updated) {
        setSelectedInvoiceId(updated.id);
        showToast(`Order #${updated.invoiceNumber} is now marked as "${newStatus}"!`);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="bg-[#F4FAFB] flex flex-col rounded-2xl overflow-hidden border border-[#D4E7EC] shadow-xs">
      {/* Top Mobile Station Header */}
      <div className="bg-white border-b border-[#D4E7EC] p-3 flex justify-between items-center gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <WinWhiteLogo logoUrl={settings.logoUrl} size={36} alt={settings.businessName} />
          <div className="truncate">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs font-bold text-[#202729] tracking-tight truncate">
                Staff Workstation
              </h1>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#E6F5F8] text-[#006D77] border border-[#006D77]/20 shrink-0">
                Floor
              </span>
            </div>
            <p className="text-[10px] text-[#5A6B70] truncate">
              Floor Operations • {settings.branch || 'Abu Dhabi'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isInspectionFromAdmin && onSwitchToAdmin && (
            <button
              type="button"
              onClick={onSwitchToAdmin}
              className="px-2.5 py-1 bg-[#E6F5F8] hover:bg-[#D4E7EC] border border-[#006D77]/20 text-[#006D77] text-[11px] font-bold rounded-lg transition cursor-pointer"
            >
              Admin
            </button>
          )}

          <button
            type="button"
            onClick={onLogout}
            className="px-2.5 py-1 bg-[#FCEEEE] hover:bg-[#F9DADA] border border-[#F4CECE] text-[#9E3636] text-[11px] font-bold rounded-lg transition active:scale-95 cursor-pointer shadow-2xs"
            aria-label="Logout"
            title="Sign out of staff workstation"
          >
            Exit
          </button>
        </div>
      </div>

      {/* Confirmation Toast */}
      {toastMessage && (
        <div className="bg-[#E6F5F8] text-[#006D77] border-b border-[#BDE7EF] px-3.5 py-2 text-xs font-bold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#006D77]" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-[#5A6B70] hover:text-[#202729] font-bold p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Single-Column Mobile Content */}
      <div className="p-3 space-y-3">
        {!mobileDetailView || !selectedInvoice ? (
          /* Floor Work Queue Screen */
          <div className="space-y-3">
            {/* Top Search & Filter Bar */}
            <div className="bg-white p-3 rounded-2xl border border-[#D4E7EC] shadow-xs space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-[#5A6B70] absolute left-3 top-2.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Scan or type Invoice # (e.g. 1041)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729] focus:outline-hidden focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77]"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                {(['All', 'Received', 'In Progress', 'Ready for Pickup'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`py-1.5 px-1 rounded-xl font-bold text-center transition cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#006D77] text-white shadow-xs'
                        : 'bg-[#F4FAFB] text-[#202729] border border-[#D4E7EC] hover:bg-[#E6F5F8]'
                    }`}
                  >
                    {st === 'Ready for Pickup' ? 'Ready' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Orders List: 1-Column on Mobile, 2/3-Column on Tablet */}
            <div className="bg-white rounded-2xl border border-[#D4E7EC] shadow-xs p-2.5 md:p-4 space-y-2 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3">
              {staffFilteredInvoices.map((inv) => {
                const totalPieces = inv.items.reduce((s, it) => s + it.quantity, 0);

                return (
                  <div
                    key={inv.id}
                    onClick={() => handleSelectInvoice(inv.id)}
                    className="p-3 rounded-xl cursor-pointer transition hover:bg-[#F4FAFB] border border-[#D4E7EC]"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-[#202729]">
                          {inv.invoiceNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            inv.status === 'Ready for Pickup'
                              ? 'bg-[#E6F5F8] text-[#006D77] border border-[#006D77]/30'
                              : inv.status === 'In Progress'
                              ? 'bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]'
                              : 'bg-[#F4FAFB] text-[#5A6B70] border border-[#D4E7EC]'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>

                      <span className="text-[11px] font-bold text-[#006D77] bg-[#E6F5F8] px-2 py-0.5 rounded-md font-mono">
                        {totalPieces} Pcs
                      </span>
                    </div>

                    <p className="text-xs font-bold text-[#202729] mt-1">{inv.customerName}</p>

                    <div className="flex justify-between items-center text-[10px] text-[#5A6B70] mt-1.5">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#5A6B70]" />
                        Due: {inv.expectedDeliveryDate}
                      </span>
                      <span className="text-[#006D77] font-bold flex items-center gap-0.5">
                        Inspect <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}

              {staffFilteredInvoices.length === 0 && (
                <div className="py-12 text-center text-[#5A6B70] text-xs">
                  No active floor laundry orders match your filter.
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Garment Inspection & Status Action View */
          <div className="bg-white rounded-2xl border border-[#D4E7EC] shadow-xs p-3.5 space-y-3.5">
            {/* Back to Queue Button */}
            <div className="flex items-center justify-between pb-2 border-b border-[#D4E7EC]">
              <button
                type="button"
                onClick={() => setMobileDetailView(false)}
                className="flex items-center gap-1 text-xs font-bold text-[#006D77] py-1.5 px-2.5 rounded-lg bg-[#E6F5F8]"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back to Orders Queue</span>
              </button>
              <span className="text-[11px] font-mono text-[#5A6B70]">
                #{selectedInvoice.invoiceNumber}
              </span>
            </div>

            {/* Invoice Banner */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <h2 className="text-base font-black text-[#202729] font-mono">
                  #{selectedInvoice.invoiceNumber}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    selectedInvoice.status === 'Ready for Pickup'
                      ? 'bg-[#E6F5F8] text-[#006D77] border border-[#006D77]/30'
                      : selectedInvoice.status === 'In Progress'
                      ? 'bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]'
                      : 'bg-[#F4FAFB] text-[#5A6B70] border border-[#D4E7EC]'
                  }`}
                >
                  {selectedInvoice.status}
                </span>
              </div>
              <p className="text-xs text-[#5A6B70]">
                Customer: <strong className="text-[#202729]">{selectedInvoice.customerName}</strong> • Phone:{' '}
                <span className="font-mono">{selectedInvoice.customerPhone}</span>
              </p>
              <p className="text-[11px] text-[#5A6B70]">
                Target Completion: <strong className="text-[#202729] font-mono">{selectedInvoice.expectedDeliveryDate}</strong>
              </p>
            </div>

            {/* Special Garment Instructions if any */}
            {selectedInvoice.notes && (
              <div className="p-2.5 bg-[#FAF4E8] border border-[#EEDCB7] rounded-xl text-xs text-[#96681A]">
                <span className="font-bold">Special Customer Note: </span>
                {selectedInvoice.notes}
              </div>
            )}

            {/* Garment Line Items Inspection Checklist */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#202729] uppercase tracking-wider flex items-center gap-1.5">
                <Shirt className="w-3.5 h-3.5 text-[#006D77]" />
                <span>Garments Breakdown ({selectedInvoice.items.length} types)</span>
              </h3>

              <div className="border border-[#D4E7EC] rounded-xl overflow-hidden divide-y divide-[#D4E7EC]">
                {selectedInvoice.items.map((item, idx) => (
                  <div key={item.id || idx} className="p-2.5 bg-white flex justify-between items-center gap-2">
                    <div className="flex-1 min-w-0 pr-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[#202729] text-xs">
                          {item.dressTypeName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#E6F5F8] text-[#006D77] border border-[#006D77]/20">
                          {item.service}
                        </span>
                      </div>
                      {item.specialInstructions && (
                        <span className="block text-[10px] text-[#96681A] mt-0.5">
                          Note: {item.specialInstructions}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-black text-xs text-[#006D77] bg-[#E6F5F8] px-2 py-0.5 rounded-lg">
                        {item.quantity} pcs
                      </span>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-[#006D77] font-semibold">
                        <Check className="w-3 h-3" /> Checked
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Action Buttons for Floor Staff */}
            <div className="bg-[#F4FAFB] border border-[#D4E7EC] rounded-2xl p-3 space-y-2.5">
              <p className="text-xs font-bold text-[#202729]">Update Production Status:</p>
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={isUpdating || selectedInvoice.status === 'In Progress'}
                  onClick={() =>
                    handleUpdateStatus('In Progress', 'Garments placed in washing/pressing line')
                  }
                  className="w-full py-3 px-4 bg-[#0369A1] hover:bg-[#0284C7] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                  <span>Mark as In Progress</span>
                </button>

                <button
                  type="button"
                  disabled={isUpdating || selectedInvoice.status === 'Ready for Pickup'}
                  onClick={() =>
                    handleUpdateStatus('Ready for Pickup', 'Ironed, inspected, bagged and tagged')
                  }
                  className="w-full py-3 px-4 bg-[#006D77] hover:bg-[#00575F] disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Mark as Ready for Pickup</span>
                </button>
              </div>

              <div className="text-[10px] text-[#5A6B70] flex items-center gap-1 pt-1">
                <ShieldAlert className="w-3.5 h-3.5 text-[#5A6B70] shrink-0" />
                <span>
                  Staff restriction: Delivery & billing handled exclusively at counter.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
