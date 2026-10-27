import React, { useState, useEffect, useMemo } from 'react';
import { Customer, Invoice, BusinessSettings } from '../../types';
import { storage } from '../../services/storage';
import { formatAED } from '../../utils/calculations';
import { exportCustomersCSV } from '../../utils/export';
import {
  Search,
  Download,
  Plus,
  Printer,
  X,
  History,
  AlertCircle,
  Phone,
  MapPin,
} from 'lucide-react';
import { PrintInvoiceModal } from '../invoice/PrintInvoiceModal';

interface CustomersViewProps {
  settings: BusinessSettings;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ settings }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');

  // Selected customer for history modal
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedInvoiceForPrint, setSelectedInvoiceForPrint] = useState<Invoice | null>(null);

  // Add customer modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('+971 5');
  const [newAddress, setNewAddress] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      setCustomers(storage.getCustomers());
      setInvoices(storage.getInvoices());
    };
    load();
    return storage.subscribe(load);
  }, []);

  const filteredCustomers = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.replace(/[^0-9]/g, '').includes(q)
    );
  }, [customers, search]);

  const customerInvoices = useMemo(() => {
    if (!selectedCustomer) return [];
    return invoices
      .filter((inv) => inv.customerId === selectedCustomer.id)
      .sort((a, b) => (b.invoiceDate > a.invoiceDate ? 1 : -1));
  }, [invoices, selectedCustomer]);

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMsg('Please enter customer name');
      return;
    }
    if (!newPhone.trim() || newPhone.trim().length < 8) {
      setErrorMsg('Please enter a valid UAE phone number');
      return;
    }

    const existing = storage.findCustomerByPhone(newPhone);
    if (existing) {
      setErrorMsg(`A customer with phone ${newPhone} already exists (${existing.name}).`);
      return;
    }

    storage.getOrCreateCustomer(newName.trim(), newPhone.trim(), newAddress.trim());
    setIsAddModalOpen(false);
    setNewName('');
    setNewPhone('+971 5');
    setNewAddress('');
    setErrorMsg(null);
  };

  return (
    <div className="space-y-3 pb-2">
      {/* Mobile Header */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-2.5">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-base font-bold text-[#202729] tracking-tight">Customer Database</h1>
            <p className="text-[11px] text-[#5A6B70]">Patron contact records & orders</p>
          </div>
          <span className="text-[11px] font-mono text-[#006D77] font-bold bg-[#E6F5F8] px-2 py-0.5 rounded-full">
            {filteredCustomers.length} clients
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => exportCustomersCSV(customers)}
            className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-[#202729] bg-[#F4FAFB] hover:bg-[#E6F5F8] border border-[#D4E7EC] rounded-xl transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#5A6B70]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-1.5 py-2 bg-[#006D77] hover:bg-[#00575F] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-[#5A6B70] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or phone (e.g. Sarah, 050)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729] focus:outline-hidden focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77]"
          />
        </div>
      </div>

      {/* Customer Cards: 1-Column on Mobile, 2/3-Column Grid on Tablet */}
      <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3.5">
        {filteredCustomers.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-2.5"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xs font-bold text-[#202729]">{c.name}</h3>
                <a
                  href={`tel:${c.phone}`}
                  className="flex items-center gap-1 text-[11px] font-mono text-[#006D77] font-semibold mt-0.5"
                >
                  <Phone className="w-3 h-3 text-[#006D77]" />
                  <span>{c.phone}</span>
                </a>
              </div>

              <span className="text-[10px] font-bold bg-[#E6F5F8] text-[#006D77] px-2 py-0.5 rounded-full">
                {c.totalInvoices} Orders
              </span>
            </div>

            {c.address && (
              <p className="text-[11px] text-[#5A6B70] flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#5A6B70] shrink-0" />
                <span className="truncate">{c.address}</span>
              </p>
            )}

            <div className="flex justify-between items-center pt-2 border-t border-[#D4E7EC] text-xs">
              <div>
                <span className="text-[9px] text-[#5A6B70] font-bold uppercase block">
                  Outstanding Due
                </span>
                <span
                  className={`font-mono font-black text-xs ${
                    c.outstandingBalance > 0 ? 'text-[#9E3636]' : 'text-[#006D77]'
                  }`}
                >
                  {formatAED(c.outstandingBalance)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(c)}
                className="py-1.5 px-3 bg-[#E6F5F8] hover:bg-[#D4E7EC] border border-[#006D77]/20 text-[#006D77] text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>Orders</span>
              </button>
            </div>
          </div>
        ))}

        {filteredCustomers.length === 0 && (
          <div className="bg-white p-8 rounded-2xl border border-[#D4E7EC] text-center text-xs text-[#5A6B70]">
            No customers found matching "{search}".
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-[#D4E7EC] shadow-xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-[#D4E7EC] pb-2.5">
              <h3 className="text-xs font-bold text-[#202729]">Register New Customer</h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-[#5A6B70] hover:text-[#202729] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-[#FCEEEE] border border-[#F4CECE] text-[#9E3636] text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#202729] mb-1">
                  Customer Full Name <span className="text-[#9E3636]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mariam Al-Suwaidi"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#202729] mb-1">
                  UAE Mobile Number <span className="text-[#9E3636]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+971 50 123 4567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#202729] mb-1">
                  Address in Dubai (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Villa 14, Springs 7"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D4E7EC]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#202729] bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#006D77] hover:bg-[#00575F] rounded-xl shadow-xs"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Invoices History Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-[#D4E7EC] shadow-xl p-4 space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-start border-b border-[#D4E7EC] pb-2.5">
              <div>
                <h3 className="text-xs font-bold text-[#202729]">
                  Orders: {selectedCustomer.name}
                </h3>
                <p className="text-[11px] text-[#5A6B70] font-mono mt-0.5">
                  {selectedCustomer.phone} • {customerInvoices.length} invoices
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="text-[#5A6B70] hover:text-[#202729] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
              {customerInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="p-2.5 bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl space-y-1"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-black text-xs text-[#006D77]">{inv.invoiceNumber}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#E6F5F8] text-[#006D77]">
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#5A6B70] truncate">
                    {inv.items.map((i) => `${i.dressTypeName} x${i.quantity}`).join(', ')}
                  </p>
                  <div className="flex justify-between items-center pt-1 border-t border-[#D4E7EC]/60">
                    <span className="font-mono font-bold text-xs text-[#202729]">{formatAED(inv.total)}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedInvoiceForPrint(inv)}
                      className="p-1 text-[#006D77] hover:bg-[#E6F5F8] rounded-lg cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {customerInvoices.length === 0 && (
                <div className="py-6 text-center text-xs text-[#5A6B70]">
                  No orders recorded yet.
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#D4E7EC] flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-[#006D77] rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
