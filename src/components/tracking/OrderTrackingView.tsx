import React, { useState, useEffect, useMemo } from 'react';
import {
  Invoice,
  InvoiceItem,
  OrderStatus,
  UserAccount,
  BusinessSettings,
  PackingPreference,
  ItemPackingPreference,
} from '../../types';
import { storage } from '../../services/storage';
import {
  Search,
  CheckCircle2,
  Clock,
  Printer,
  History,
  X,
  User,
  Calendar,
  Layers,
  Phone,
  Package,
} from 'lucide-react';
import { PrintInvoiceModal } from '../invoice/PrintInvoiceModal';

interface OrderTrackingViewProps {
  currentUser: UserAccount;
  settings: BusinessSettings;
  onEditInvoice?: (invoice: Invoice) => void;
}

export const OrderTrackingView: React.FC<OrderTrackingViewProps> = ({
  currentUser,
  settings,
  onEditInvoice,
}) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Detail / Status History Modal
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);
  const [printModalInvoice, setPrintModalInvoice] = useState<Invoice | null>(null);

  // Status Change Dialog
  const [statusChangeInvoice, setStatusChangeInvoice] = useState<Invoice | null>(null);
  const [newSelectedStatus, setNewSelectedStatus] = useState<OrderStatus>('In Progress');
  const [newSelectedPacking, setNewSelectedPacking] = useState<PackingPreference>('Fold');
  const [statusItems, setStatusItems] = useState<InvoiceItem[]>([]);
  const [statusNote, setStatusNote] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      setInvoices(storage.getInvoices());
    };
    load();
    return storage.subscribe(load);
  }, []);

  const activeInvoice = useMemo(() => {
    if (!activeInvoiceId) return null;
    return invoices.find((i) => i.id === activeInvoiceId) || null;
  }, [invoices, activeInvoiceId]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const filteredInvoices = useMemo(() => {
    const q = search.toLowerCase().trim();
    return invoices.filter((inv) => {
      const matchQuery =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q) ||
        inv.customerPhone.replace(/[^0-9]/g, '').includes(q);

      const matchStatus = statusFilter === 'All' || inv.status === statusFilter;

      return matchQuery && matchStatus;
    });
  }, [invoices, search, statusFilter]);

  const handleOpenStatusModal = (inv: Invoice) => {
    setStatusChangeInvoice(inv);
    setNewSelectedStatus(inv.status);
    setNewSelectedPacking(inv.packingPreference || 'Fold');
    setStatusItems(inv.items.map((it) => ({ ...it })));
    setStatusNote('');
  };

  const handleToggleItemPacking = (idx: number, pref: ItemPackingPreference) => {
    setStatusItems((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], packingPreference: pref };
      return copy;
    });
  };

  const handleConfirmStatusChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusChangeInvoice) return;

    const itemsToSave: InvoiceItem[] = statusItems.map((it) => ({
      ...it,
      packingPreference:
        newSelectedPacking === 'Mixed'
          ? (it.packingPreference || 'Fold')
          : (newSelectedPacking === 'Hanging' ? 'Hanging' : 'Fold'),
    }));

    const statusNoteText = statusNote.trim()
      ? `${statusNote.trim()} [Packing: ${newSelectedPacking.toUpperCase()}]`
      : `Packing: ${newSelectedPacking.toUpperCase()}`;

    const updated = storage.updateOrderStatus(
      statusChangeInvoice.id,
      newSelectedStatus,
      `${currentUser.name} (${currentUser.role})`,
      statusNoteText
    );

    if (updated) {
      updated.packingPreference = newSelectedPacking;
      updated.items = itemsToSave;
      storage.saveInvoice(updated);
      showToast(
        `Invoice ${updated.invoiceNumber} updated (${newSelectedStatus}, Packing: ${newSelectedPacking})`
      );
    }

    setStatusChangeInvoice(null);
  };

  const statusList: Array<OrderStatus | 'All'> = [
    'All',
    'Received',
    'In Progress',
    'Ready for Pickup',
    'Delivered',
  ];

  const getStatusBadgeClass = (status: OrderStatus) => {
    switch (status) {
      case 'Delivered':
        return 'bg-[#E6F5F8] text-[#006D77] border border-[#006D77]/30';
      case 'Ready for Pickup':
        return 'bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]';
      case 'In Progress':
        return 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]';
      default:
        return 'bg-[#F4FAFB] text-[#5A6B70] border border-[#D4E7EC]';
    }
  };

  return (
    <div className="space-y-3 pb-2">
      {/* Mobile Header Card */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs flex justify-between items-center gap-2">
        <div>
          <h1 className="text-base font-bold text-[#202729] tracking-tight">Order Tracking</h1>
          <p className="text-[11px] text-[#5A6B70]">Intake to collection journey</p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#202729] bg-[#F4FAFB] px-2.5 py-1 rounded-xl border border-[#D4E7EC]">
          <User className="w-3 h-3 text-[#006D77]" />
          <span className="font-bold">{currentUser.name}</span>
        </div>
      </div>

      {successToast && (
        <div className="p-3 bg-[#E6F5F8] border border-[#BDE7EF] text-[#006D77] text-xs font-bold rounded-xl flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-[#006D77] shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 text-[#5A6B70] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by invoice # (e.g. 1041), name, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729] focus:outline-hidden focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77]"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-1">
          {statusList.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#006D77] text-white shadow-xs'
                  : 'bg-[#F4FAFB] text-[#202729] border border-[#D4E7EC] hover:bg-[#E6F5F8]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List: 1-Column on Mobile, 2/3-Column Grid on Tablet */}
      <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3.5">
        {filteredInvoices.map((inv) => {
          const totalGarments = inv.items.reduce((s, it) => s + it.quantity, 0);

          return (
            <div
              key={inv.id}
              className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-2.5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-mono font-black text-xs text-[#006D77]">
                    {inv.invoiceNumber}
                  </span>
                  <span className="block text-[10px] text-[#5A6B70] font-mono mt-0.5">
                    Date: {inv.invoiceDate.slice(0, 10)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider font-mono border ${
                      (inv.packingPreference || 'Fold') === 'Hanging'
                        ? 'bg-[#E0F2FE] text-[#0369A1] border-[#BAE6FD]'
                        : (inv.packingPreference || 'Fold') === 'Mixed'
                        ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                        : 'bg-[#F4FAFB] text-[#006D77] border-[#006D77]/30'
                    }`}
                  >
                    PACKING: {(inv.packingPreference || 'Fold').toUpperCase()}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${getStatusBadgeClass(
                      inv.status
                    )}`}
                  >
                    {inv.status}
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

              <div className="bg-[#F4FAFB] p-2.5 rounded-xl border border-[#D4E7EC] text-xs space-y-1">
                <div className="flex justify-between items-center text-[#202729]">
                  <span className="font-bold flex items-center gap-1 text-[11px]">
                    <Layers className="w-3.5 h-3.5 text-[#006D77]" />
                    {totalGarments} Garments:
                  </span>
                  <span className="font-mono text-[10px] text-[#5A6B70]">
                    Due: {inv.expectedDeliveryDate}
                  </span>
                </div>
                <p className="text-[10px] text-[#5A6B70] truncate">
                  {inv.items
                    .map((it) => {
                      const tag =
                        inv.packingPreference === 'Mixed'
                          ? ` [${(it.packingPreference || 'Fold').toUpperCase()}]`
                          : '';
                      return `${it.dressTypeName}${tag} (${it.service}) x${it.quantity}`;
                    })
                    .join(', ')}
                </p>
              </div>

              {/* Action Buttons for Mobile Card */}
              <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleOpenStatusModal(inv)}
                  className="py-2 px-1 text-xs font-bold text-white bg-[#006D77] hover:bg-[#00575F] rounded-xl text-center shadow-xs cursor-pointer"
                >
                  Status
                </button>
                {onEditInvoice ? (
                  <button
                    type="button"
                    onClick={() => onEditInvoice(inv)}
                    className="py-2 px-1 text-xs font-bold text-[#006D77] bg-[#E6F8EE] hover:bg-[#D1F3DE] border border-[#B3E8C8] rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>Edit</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => setActiveInvoiceId(inv.id)}
                  className="py-2 px-1 text-xs font-bold text-[#202729] bg-[#F4FAFB] hover:bg-[#E6F5F8] border border-[#D4E7EC] rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-[#5A6B70]" />
                  <span>Audit</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintModalInvoice(inv)}
                  className="py-2 px-1 text-xs font-bold text-[#006D77] bg-[#E6F5F8] hover:bg-[#D4E7EC] border border-[#006D77]/20 rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredInvoices.length === 0 && (
          <div className="bg-white p-8 rounded-2xl border border-[#D4E7EC] text-center text-xs text-[#5A6B70]">
            No orders match the search criteria.
          </div>
        )}
      </div>

      {/* Status Update Modal */}
      {statusChangeInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-[#D4E7EC] shadow-xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-[#D4E7EC] pb-2.5">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#006D77]" />
                <h3 className="text-xs font-bold text-[#202729]">
                  Status: #{statusChangeInvoice.invoiceNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setStatusChangeInvoice(null)}
                className="text-[#5A6B70] hover:text-[#202729] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmStatusChange} className="space-y-3 text-xs">
              <div>
                <p className="text-[#5A6B70] text-[11px] mb-2">
                  Customer: <strong className="text-[#202729]">{statusChangeInvoice.customerName}</strong>
                </p>
                <label className="block font-bold text-[#202729] mb-1">
                  Select Production Stage:
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['Received', 'In Progress', 'Ready for Pickup', 'Delivered'] as OrderStatus[]).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setNewSelectedStatus(st)}
                        className={`p-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                          newSelectedStatus === st
                            ? 'bg-[#006D77] text-white border-[#006D77] shadow-xs'
                            : 'bg-[#F4FAFB] text-[#202729] border-[#D4E7EC] hover:bg-[#E6F5F8]'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Packing Preference Selection */}
              <div>
                <label className="block font-bold text-[#202729] mb-1">
                  Packing Preference:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['Fold', 'Hanging', 'Mixed'] as PackingPreference[]).map((pref) => (
                    <button
                      key={pref}
                      type="button"
                      onClick={() => {
                        setNewSelectedPacking(pref);
                        if (pref === 'Fold' || pref === 'Hanging') {
                          setStatusItems((prev) =>
                            prev.map((it) => ({ ...it, packingPreference: pref }))
                          );
                        }
                      }}
                      className={`p-2 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                        newSelectedPacking === pref
                          ? 'bg-[#006D77] text-white border-[#006D77] shadow-xs'
                          : 'bg-[#F4FAFB] text-[#202729] border-[#D4E7EC] hover:bg-[#E6F5F8]'
                      }`}
                    >
                      {pref}
                    </button>
                  ))}
                </div>

                {newSelectedPacking === 'Mixed' && (
                  <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto p-2 bg-[#F8FCFD] border border-[#D4E7EC] rounded-xl">
                    <span className="block text-[10px] font-bold text-[#92400E] uppercase">
                      Mixed Order Item Instructions:
                    </span>
                    {statusItems.map((it, idx) => (
                      <div
                        key={it.id || idx}
                        className="flex items-center justify-between text-[11px] bg-white p-1.5 rounded-lg border border-[#D4E7EC]"
                      >
                        <span className="font-medium text-[#202729] truncate pr-2">
                          {it.dressTypeName} x{it.quantity}
                        </span>
                        <div className="inline-flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleItemPacking(idx, 'Fold')}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              (it.packingPreference || 'Fold') === 'Fold'
                                ? 'bg-[#006D77] text-white'
                                : 'bg-[#F4FAFB] text-[#5A6B70] border border-[#D4E7EC]'
                            }`}
                          >
                            Fold
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleItemPacking(idx, 'Hanging')}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              it.packingPreference === 'Hanging'
                                ? 'bg-[#006D77] text-white'
                                : 'bg-[#F4FAFB] text-[#5A6B70] border border-[#D4E7EC]'
                            }`}
                          >
                            Hanging
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-[#202729] mb-1">
                  Floor Note (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bagged on rack 3"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D4E7EC]">
                <button
                  type="button"
                  onClick={() => setStatusChangeInvoice(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#202729] bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#006D77] hover:bg-[#00575F] rounded-xl shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {activeInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-[#D4E7EC] shadow-xl p-4 space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#D4E7EC] pb-2.5">
              <div className="flex items-center gap-1.5">
                <History className="w-4 h-4 text-[#006D77]" />
                <h3 className="text-xs font-bold text-[#202729]">
                  Audit: #{activeInvoice.invoiceNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveInvoiceId(null)}
                className="text-[#5A6B70] hover:text-[#202729] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prominent Packing Banner in Audit Modal */}
            <div className="p-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl flex items-center justify-between text-xs">
              <span className="font-bold text-[#92400E]">Packing Requirement:</span>
              <span className="font-mono font-black text-xs text-[#92400E] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#FDE68A]">
                {(activeInvoice.packingPreference || 'Fold').toUpperCase()}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {activeInvoice.statusHistory.map((h, i) => (
                <div
                  key={i}
                  className="p-2.5 rounded-xl bg-[#F4FAFB] border border-[#D4E7EC] space-y-0.5"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-[#006D77]">{h.status}</span>
                    <span className="text-[9px] text-[#5A6B70] font-mono">
                      {new Date(h.timestamp).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#202729]">
                    By: <strong>{h.updatedBy}</strong>
                  </p>
                  {h.note && <p className="text-[10px] text-[#5A6B70] italic">"{h.note}"</p>}
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-[#D4E7EC] flex justify-end">
              <button
                type="button"
                onClick={() => setActiveInvoiceId(null)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#006D77] rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {printModalInvoice && (
        <PrintInvoiceModal
          invoice={printModalInvoice}
          settings={settings}
          isOpen={!!printModalInvoice}
          onClose={() => setPrintModalInvoice(null)}
        />
      )}
    </div>
  );
};
