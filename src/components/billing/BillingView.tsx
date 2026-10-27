import React, { useState, useEffect, useMemo } from 'react';
import {
  Customer,
  DressType,
  Invoice,
  InvoiceItem,
  ServiceType,
  SERVICE_TYPES,
  BusinessSettings,
  UserAccount,
} from '../../types';
import { storage } from '../../services/storage';
import {
  calculateLineSubtotal,
  calculateInvoiceTotals,
  formatAED,
  getDubaiCurrentDateTime,
} from '../../utils/calculations';
import {
  Plus,
  Trash2,
  Save,
  Printer,
  Search,
  User,
  Phone,
  Calendar,
  Banknote,
  Receipt,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Minus,
  MapPin,
} from 'lucide-react';
import { PrintInvoiceModal } from '../invoice/PrintInvoiceModal';

interface BillingViewProps {
  currentUser: UserAccount;
  settings: BusinessSettings;
  onInvoiceCreated?: (invoice: Invoice) => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  currentUser,
  settings,
  onInvoiceCreated,
}) => {
  // Master data
  const [dressTypes, setDressTypes] = useState<DressType[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  // Customer form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('+971 5');
  const [customerAddress, setCustomerAddress] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Line items state
  const [items, setItems] = useState<
    Array<{
      id: string;
      dressTypeId: string;
      dressTypeName: string;
      service: ServiceType;
      quantity: number;
      unitPrice: number;
      subtotal: number;
      notes?: string;
    }>
  >([]);

  // Dates and Financials
  const [invoiceDate, setInvoiceDate] = useState(() => getDubaiCurrentDateTime().isoDate);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2); // Default 2 days for standard turnaround
    return d.toISOString().slice(0, 10);
  });
  const [discount, setDiscount] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Other'>('Cash');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // UI States
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessInvoice, setSaveSuccessInvoice] = useState<Invoice | null>(null);
  const [printModalInvoice, setPrintModalInvoice] = useState<Invoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load master data
  useEffect(() => {
    const loadData = () => {
      setDressTypes(storage.getDressTypes().filter((d) => d.isActive));
      setCustomers(storage.getCustomers());
    };
    loadData();
    return storage.subscribe(loadData);
  }, []);

  // Initialize with 1 default empty item row once dress types are ready
  useEffect(() => {
    if (items.length === 0 && dressTypes.length > 0) {
      const defaultDress = dressTypes[0];
      const defaultService: ServiceType = 'Normal Wash';
      const defaultPrice = defaultDress.prices[defaultService] || defaultDress.prices['Washing + Ironing'] || 0;
      setItems([
        {
          id: `item-${Date.now()}`,
          dressTypeId: defaultDress.id,
          dressTypeName: defaultDress.name,
          service: defaultService,
          quantity: 1,
          unitPrice: defaultPrice,
          subtotal: defaultPrice,
        },
      ]);
    }
  }, [dressTypes, items.length]);

  // Customer Autocomplete Filter with Code, Phone and Name Matching
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return [];
    const q = customerSearchQuery.toLowerCase().trim();
    const cleanSearchPhone = q.replace(/[^0-9]/g, '');
    return customers.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const codeMatch = c.customerCode ? c.customerCode.toLowerCase().includes(q) : false;
      const cleanPhone = c.phone.replace(/[^0-9]/g, '');
      const phoneMatch = cleanSearchPhone ? cleanPhone.includes(cleanSearchPhone) : false;
      return nameMatch || codeMatch || phoneMatch;
    });
  }, [customers, customerSearchQuery]);

  const handleSelectCustomer = (c: Customer) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerAddress(c.address || '');
    setSelectedCustomerId(c.id);
    setSelectedCustomer(c);
    setCustomerSearchQuery('');
    setShowCustomerDropdown(false);
  };

  // Add a line item
  const handleAddItem = () => {
    if (dressTypes.length === 0) return;
    const defaultDress = dressTypes[0];
    const defaultService: ServiceType = 'Normal Wash';
    const defaultPrice = defaultDress.prices[defaultService] || defaultDress.prices['Washing + Ironing'] || 0;

    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        dressTypeId: defaultDress.id,
        dressTypeName: defaultDress.name,
        service: defaultService,
        quantity: 1,
        unitPrice: defaultPrice,
        subtotal: defaultPrice,
      },
    ]);
  };

  // Remove a line item
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setErrorMessage('At least one item is required on the invoice.');
      setTimeout(() => setErrorMessage(null), 3000);
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Update item field
  const handleItemChange = (
    index: number,
    field: 'dressTypeId' | 'service' | 'quantity' | 'unitPrice' | 'notes',
    value: any
  ) => {
    setItems((prev) => {
      const updated = [...prev];
      const current = { ...updated[index] };

      if (field === 'dressTypeId') {
        const selected = dressTypes.find((d) => d.id === value);
        if (selected) {
          current.dressTypeId = selected.id;
          current.dressTypeName = selected.name;
          current.unitPrice = selected.prices[current.service] || 0;
          current.subtotal = calculateLineSubtotal(current.quantity, current.unitPrice);
        }
      } else if (field === 'service') {
        current.service = value;
        const dress = dressTypes.find((d) => d.id === current.dressTypeId);
        if (dress) {
          current.unitPrice = dress.prices[value as ServiceType] || 0;
          current.subtotal = calculateLineSubtotal(current.quantity, current.unitPrice);
        }
      } else if (field === 'quantity') {
        const qty = Math.max(1, parseInt(value, 10) || 1);
        current.quantity = qty;
        current.subtotal = calculateLineSubtotal(qty, current.unitPrice);
      } else if (field === 'unitPrice') {
        const price = Math.max(0, parseFloat(value) || 0);
        current.unitPrice = price;
        current.subtotal = calculateLineSubtotal(current.quantity, price);
      } else if (field === 'notes') {
        current.notes = value;
      }

      updated[index] = current;
      return updated;
    });
  };

  // Stepper helper for mobile
  const handleStepQuantity = (index: number, delta: number) => {
    const current = items[index];
    if (!current) return;
    const newQty = Math.max(1, current.quantity + delta);
    handleItemChange(index, 'quantity', newQty);
  };

  // Calculate totals
  const totals = useMemo(() => {
    return calculateInvoiceTotals(items, discount, amountPaid);
  }, [items, discount, amountPaid]);

  // Reset form
  const handleResetForm = () => {
    setCustomerName('');
    setCustomerPhone('+971 5');
    setCustomerAddress('');
    setSelectedCustomerId(null);
    setSelectedCustomer(null);
    setDiscount(0);
    setAmountPaid(0);
    setSpecialInstructions('');
    setInvoiceDate(getDubaiCurrentDateTime().isoDate);
    const d = new Date();
    d.setDate(d.getDate() + 2);
    setExpectedDeliveryDate(d.toISOString().slice(0, 10));

    if (dressTypes.length > 0) {
      const defaultDress = dressTypes[0];
      const defaultService: ServiceType = 'Normal Wash';
      const defaultPrice = defaultDress.prices[defaultService] || defaultDress.prices['Washing + Ironing'] || 0;
      setItems([
        {
          id: `item-${Date.now()}`,
          dressTypeId: defaultDress.id,
          dressTypeName: defaultDress.name,
          service: defaultService,
          quantity: 1,
          unitPrice: defaultPrice,
          subtotal: defaultPrice,
        },
      ]);
    }
  };

  // Save invoice handler
  const handleSaveInvoice = (andPrint: boolean = false): Invoice | null => {
    if (isSaving) return null;

    if (!customerName.trim()) {
      setErrorMessage('Please enter customer name.');
      return null;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 8) {
      setErrorMessage('Please enter a valid UAE mobile number.');
      return null;
    }
    if (items.length === 0) {
      setErrorMessage('Please add at least one line item.');
      return null;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      let customer: Customer;
      if (selectedCustomerId) {
        const existing = customers.find((c) => c.id === selectedCustomerId);
        if (existing) {
          existing.name = customerName.trim();
          existing.phone = customerPhone.trim();
          if (customerAddress.trim()) existing.address = customerAddress.trim();
          storage.saveCustomer(existing);
          customer = existing;
        } else {
          customer = storage.getOrCreateCustomer(
            customerName.trim(),
            customerPhone.trim(),
            customerAddress.trim()
          );
        }
      } else {
        customer = storage.getOrCreateCustomer(
          customerName.trim(),
          customerPhone.trim(),
          customerAddress.trim()
        );
      }

      const invoiceNumber = storage.getNextInvoiceNumber();

      const invoiceItems: InvoiceItem[] = items.map((it) => ({
        id: it.id,
        dressTypeId: it.dressTypeId,
        dressTypeName: it.dressTypeName,
        service: it.service,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        subtotal: it.subtotal,
        specialInstructions: it.notes,
      }));

      const initialPayment =
        totals.amountPaid > 0
          ? [
              {
                id: `pay-${Date.now()}`,
                invoiceId: `inv-${Date.now()}`,
                amount: totals.amountPaid,
                paymentMethod,
                date: new Date().toISOString(),
                recordedBy: `${currentUser.name} (${currentUser.role})`,
                notes: 'Paid at counter',
              },
            ]
          : [];

      const newInvoice: Invoice = {
        id: `inv-${Date.now()}`,
        invoiceNumber,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        items: invoiceItems,
        subtotal: totals.subtotal,
        discount: totals.discount,
        total: totals.total,
        amountPaid: totals.amountPaid,
        remainingBalance: totals.remainingBalance,
        paymentMethod,
        paymentStatus: totals.paymentStatus,
        invoiceDate,
        expectedDeliveryDate,
        status: 'Received',
        statusHistory: [
          {
            status: 'Received',
            timestamp: new Date().toISOString(),
            updatedBy: `${currentUser.name} (${currentUser.role})`,
            note: 'Order registered at counter',
          },
        ],
        paymentHistory: initialPayment,
        notes: specialInstructions,
        createdAt: new Date().toISOString(),
      };

      storage.saveInvoice(newInvoice);

      setSaveSuccessInvoice(newInvoice);
      if (onInvoiceCreated) {
        onInvoiceCreated(newInvoice);
      }

      if (andPrint) {
        setPrintModalInvoice(newInvoice);
      }

      setTimeout(() => {
        setIsSaving(false);
      }, 500);

      return newInvoice;
    } catch (err: any) {
      console.error('Error saving invoice', err);
      setErrorMessage(err.message || 'Failed to save invoice.');
      setIsSaving(false);
      return null;
    }
  };

  return (
    <div className="space-y-3.5 pb-2">
      {/* Top Mobile Title & Action Buttons */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-2.5">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-base font-bold text-[#202729] tracking-tight">New Laundry Invoice</h1>
            <p className="text-[11px] text-[#5A6B70]">Counter intake & billing POS</p>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F5F8] text-[#006D77] border border-[#006D77]/20">
            Intake
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={handleResetForm}
            className="flex items-center justify-center gap-1 py-2 text-xs font-bold text-[#5A6B70] bg-[#F4FAFB] hover:bg-[#E6F5F8] border border-[#D4E7EC] rounded-xl transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveInvoice(false)}
            className="flex items-center justify-center gap-1 py-2 text-xs font-bold text-white bg-[#006D77] hover:bg-[#00575F] disabled:opacity-50 rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save'}</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveInvoice(true)}
            className="flex items-center justify-center gap-1 py-2 text-xs font-bold text-[#006D77] bg-[#E6F5F8] hover:bg-[#D4E7EC] border border-[#006D77]/30 disabled:opacity-50 rounded-xl shadow-2xs transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Error or Success Banners */}
      {errorMessage && (
        <div className="p-3 rounded-xl bg-[#FCEEEE] border border-[#F4CECE] text-[#9E3636] text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-[#9E3636]" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[#9E3636] hover:text-[#7F2626] font-bold p-1 cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {saveSuccessInvoice && (
        <div className="p-3.5 rounded-xl bg-[#E6F5F8] border border-[#BDE7EF] text-[#202729] text-xs space-y-2 shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#006D77] shrink-0" />
            <span>
              Invoice <strong>{saveSuccessInvoice.invoiceNumber}</strong> saved for{' '}
              <strong>{saveSuccessInvoice.customerName}</strong>! (Total: {formatAED(saveSuccessInvoice.total)})
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPrintModalInvoice(saveSuccessInvoice)}
              className="flex-1 py-2 bg-[#006D77] text-white rounded-xl text-xs font-bold hover:bg-[#00575F] flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSaveSuccessInvoice(null);
                handleResetForm();
              }}
              className="flex-1 py-2 bg-white border border-[#D4E7EC] text-[#202729] rounded-xl text-xs font-bold hover:bg-[#F4FAFB] cursor-pointer text-center"
            >
              New Order
            </button>
          </div>
        </div>
      )}

      {/* Responsive Layout: 2-Column on Tablet (md:), Sequential Flow on Mobile */}
      <div className="space-y-3.5 md:space-y-0 md:grid md:grid-cols-12 md:gap-4 md:items-start">
        {/* Left Column (Tablet): Customer Details & Garments */}
        <div className="space-y-3.5 md:col-span-7 lg:col-span-8">
          {/* Section 1: Customer Information */}
          <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-[#D4E7EC] pb-2">
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-[#006D77]" />
            <h2 className="text-xs font-bold text-[#202729] uppercase tracking-wider">Customer Details</h2>
          </div>
          <span className="text-[10px] text-[#5A6B70]">Auto-search / add</span>
        </div>

        {/* Quick search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#5A6B70] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by customer name, code (MC-101), or mobile..."
            value={customerSearchQuery}
            onChange={(e) => {
              setCustomerSearchQuery(e.target.value);
              setShowCustomerDropdown(true);
            }}
            onFocus={() => setShowCustomerDropdown(true)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729] focus:outline-hidden focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77] transition"
          />

          {/* Autocomplete dropdown */}
          {showCustomerDropdown && filteredCustomers.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#D4E7EC] rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto divide-y divide-[#D4E7EC]/70">
              {filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  className="p-2.5 hover:bg-[#E6F5F8] cursor-pointer flex justify-between items-center transition"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-bold text-[#202729] truncate">{c.name}</p>
                      {c.isMonthlyCustomer ? (
                        <span className="px-1.5 py-0.2 rounded-md bg-[#E6F8EE] text-[#147D42] border border-[#B3E8C8] text-[9px] font-bold">
                          ★ Monthly ({c.customerCode || 'MC'})
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded-md bg-[#F4FAFB] text-[#5A696D] border border-[#DDE8EA] text-[9px]">
                          Regular Client
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-[#5A6B70] mt-0.5">{c.phone}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[10px] bg-[#E6F5F8] text-[#006D77] px-2 py-0.5 rounded-full font-bold">
                      {c.totalInvoices} Orders
                    </span>
                    {c.outstandingBalance > 0 && (
                      <span className="block text-[10px] text-[#9E3636] font-bold mt-0.5 font-mono">
                        Bal: {formatAED(c.outstandingBalance)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Customer Monthly Status Badge */}
        {selectedCustomer && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#F4FAFB] border border-[#D4E7EC] text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#006D77]" />
              <span className="font-semibold text-[#202729]">
                Linked: <strong>{selectedCustomer.name}</strong>
              </span>
              {selectedCustomer.isMonthlyCustomer ? (
                <span className="px-2 py-0.5 rounded-full bg-[#E6F8EE] text-[#147D42] border border-[#B3E8C8] text-[10px] font-bold">
                  ★ Monthly Account ({selectedCustomer.customerCode || 'MC'})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-white text-[#5A696D] border border-[#DDE8EA] text-[10px]">
                  Regular Client
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedCustomerId(null);
                setSelectedCustomer(null);
              }}
              className="text-[10px] text-[#5A696D] hover:text-[#9E3636] font-bold cursor-pointer"
            >
              Clear Link
            </button>
          </div>
        )}

        {/* Customer Inputs: Single Column on Mobile, 2-Column on Tablet */}
        <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-3">
          <div>
            <label className="block text-[11px] font-bold text-[#202729] mb-1">
              Customer Name <span className="text-[#9E3636]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rashid Al-Nuaimi"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setSelectedCustomerId(null);
              }}
              className="w-full px-3 py-2 text-xs bg-white border border-[#D4E7EC] rounded-xl text-[#202729] focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#202729] mb-1">
              UAE Mobile Number <span className="text-[#9E3636]">*</span>
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-[#5A6B70] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="tel"
                required
                placeholder="+971 50 123 4567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-mono bg-white border border-[#D4E7EC] rounded-xl text-[#202729] focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77]"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-[#202729] mb-1">
              Customer Address (Optional)
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-[#5A6B70] absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="e.g. Zayed Street, Tourist Club, Abu Dhabi"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#D4E7EC] rounded-xl text-[#202729] focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Garment Items (Strictly Mobile Cards) */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-3">
        <div className="flex justify-between items-center border-b border-[#D4E7EC] pb-2">
          <div className="flex items-center gap-1.5">
            <Receipt className="w-4 h-4 text-[#006D77]" />
            <h2 className="text-xs font-bold text-[#202729] uppercase tracking-wider">Garments ({items.length})</h2>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-[#006D77] bg-[#E6F5F8] hover:bg-[#D4E7EC] rounded-xl border border-[#006D77]/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Item</span>
          </button>
        </div>

        {/* Mobile Garment Cards */}
        <div className="space-y-2.5">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="bg-[#F8FCFD] border border-[#D4E7EC] rounded-xl p-3 space-y-2 relative"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-[#006D77] bg-[#E6F5F8] px-2 py-0.5 rounded-md font-mono">
                  #{index + 1}
                </span>

                <button
                  type="button"
                  onClick={() => handleRemoveItem(index)}
                  className="p-1 text-[#5A6B70] hover:text-[#9E3636] hover:bg-[#FCEEEE] rounded-lg transition cursor-pointer"
                  title="Remove item"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Garment Selector & Service Selector: Stacked on Mobile, 2-Column on Tablet */}
              <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[#5A6B70] mb-0.5">
                    Garment Type
                  </label>
                  <select
                    value={item.dressTypeId}
                    onChange={(e) => handleItemChange(index, 'dressTypeId', e.target.value)}
                    className="w-full py-1.5 px-2.5 text-xs bg-white border border-[#D4E7EC] rounded-xl text-[#202729] font-medium"
                  >
                    {dressTypes.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.category})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#5A6B70] mb-0.5">
                    Service
                  </label>
                  <select
                    value={item.service}
                    onChange={(e) =>
                      handleItemChange(index, 'service', e.target.value as ServiceType)
                    }
                    className="w-full py-1.5 px-2.5 text-xs bg-white border border-[#D4E7EC] rounded-xl text-[#202729] font-medium"
                  >
                    {SERVICE_TYPES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stepper + Unit Price + Subtotal */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-[#D4E7EC]/70 items-center">
                <div>
                  <span className="block text-[10px] font-bold text-[#5A6B70] mb-0.5">Quantity</span>
                  <div className="flex items-center bg-white border border-[#D4E7EC] rounded-xl overflow-hidden h-8">
                    <button
                      type="button"
                      onClick={() => handleStepQuantity(index, -1)}
                      className="w-7 h-full flex items-center justify-center text-[#5A6B70] hover:bg-[#F4FAFB] active:bg-[#E6F5F8] cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="flex-1 text-center font-mono font-bold text-xs text-[#202729]">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStepQuantity(index, 1)}
                      className="w-7 h-full flex items-center justify-center text-[#006D77] hover:bg-[#F4FAFB] active:bg-[#E6F5F8] cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="block text-[10px] font-bold text-[#5A6B70] mb-0.5">Rate (AED)</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                    className="w-full py-1 px-1.5 text-right text-xs font-mono bg-white border border-[#D4E7EC] rounded-xl text-[#202729] h-8"
                  />
                </div>

                <div className="text-right">
                  <span className="block text-[10px] font-bold text-[#5A6B70] mb-0.5">Subtotal</span>
                  <span className="block font-mono font-black text-xs text-[#006D77] leading-8">
                    {formatAED(item.subtotal)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center pt-1">
          <button
            type="button"
            onClick={handleAddItem}
            className="text-xs text-[#006D77] font-bold flex items-center gap-1 py-1 px-2 rounded-lg bg-[#E6F5F8] border border-[#006D77]/20 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add another item</span>
          </button>

          <p className="text-xs text-[#5A6B70] font-medium">
            Total Pieces: <strong className="text-[#202729] font-mono">{items.reduce((s, it) => s + it.quantity, 0)}</strong>
          </p>
        </div>

        {/* Special Instructions */}
        <div className="pt-2 border-t border-[#D4E7EC]">
          <label className="block text-[10px] font-bold text-[#202729] mb-1">
            Special Notes / Instructions
          </label>
          <input
            type="text"
            placeholder="e.g. Medium starch on Kanduras; stain on sleeve"
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
          />
        </div>
      </div>
    </div>

    {/* Right Column (Tablet): Turnaround Dates & Payment Settlement */}
    <div className="space-y-3.5 md:col-span-5 lg:col-span-4 md:sticky md:top-20">
      {/* Section 3: Schedule & Dates */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-2.5">
        <h3 className="text-xs font-bold text-[#202729] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#D4E7EC] pb-2">
          <Calendar className="w-3.5 h-3.5 text-[#006D77]" />
          <span>Dates & Turnaround</span>
        </h3>

        <div className="space-y-2">
          <div>
            <label className="block text-[10px] font-bold text-[#5A6B70] mb-0.5">
              Invoice Date & Time (Dubai)
            </label>
            <input
              type="datetime-local"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#5A6B70] mb-0.5">
              Expected Ready Date
            </label>
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Order Summary & Settlement */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-3">
        <h3 className="text-xs font-bold text-[#202729] uppercase tracking-wider flex items-center gap-1.5 border-b border-[#D4E7EC] pb-2">
          <Banknote className="w-3.5 h-3.5 text-[#006D77]" />
          <span>Payment & Settlement</span>
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between text-[#5A6B70]">
            <span>Items Subtotal:</span>
            <span className="font-mono font-bold text-[#202729]">{formatAED(totals.subtotal)}</span>
          </div>

          {/* Discount Input */}
          <div className="flex justify-between items-center pt-1 border-t border-[#D4E7EC]">
            <span className="text-[#202729] font-bold">Discount (AED):</span>
            <div className="w-24">
              <input
                type="number"
                min="0"
                step="1"
                placeholder="0.00"
                value={discount || ''}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full px-2 py-1 text-right text-xs font-mono bg-[#F4FAFB] border border-[#D4E7EC] rounded-lg text-[#202729]"
              />
            </div>
          </div>

          {/* Grand Total */}
          <div className="flex justify-between items-baseline pt-2 border-t-2 border-[#D4E7EC] text-xs font-bold text-[#202729]">
            <span>Grand Total:</span>
            <span className="text-base text-[#006D77] font-mono font-black">{formatAED(totals.total)}</span>
          </div>

          {/* Amount Paid Input */}
          <div className="pt-2 border-t border-[#D4E7EC] space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#202729]">Amount Paid Now:</span>
              <div className="w-28">
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 text-right text-xs font-mono font-bold bg-[#E6F5F8] border border-[#006D77]/30 rounded-lg text-[#006D77]"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Quick Paid Shortcuts */}
            <div className="flex justify-end gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setAmountPaid(0)}
                className="px-2.5 py-1 text-[11px] font-bold bg-[#F4FAFB] hover:bg-[#D4E7EC] text-[#5A6B70] rounded-lg border border-[#D4E7EC] cursor-pointer"
              >
                Unpaid
              </button>
              <button
                type="button"
                onClick={() => setAmountPaid(totals.total)}
                className="px-2.5 py-1 text-[11px] font-bold bg-[#E6F5F8] hover:bg-[#D4E7EC] text-[#006D77] rounded-lg border border-[#006D77]/30 cursor-pointer"
              >
                Full Paid
              </button>
            </div>
          </div>

          {/* Remaining Balance */}
          <div className="flex justify-between items-center pt-2 border-t border-dashed border-[#D4E7EC]">
            <span className="text-xs font-bold text-[#202729]">Remaining Balance:</span>
            <span
              className={`text-sm font-mono font-black ${
                totals.remainingBalance > 0 ? 'text-[#9E3636]' : 'text-[#006D77]'
              }`}
            >
              {formatAED(totals.remainingBalance)}
            </span>
          </div>
        </div>

        {/* Payment Method */}
        <div className="pt-2 border-t border-[#D4E7EC]">
          <label className="block text-[10px] font-bold text-[#202729] mb-1">
            Payment Method
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['Cash', 'Card', 'Other'] as const).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`py-2 text-xs font-bold rounded-xl border transition cursor-pointer ${
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

        {/* Action Buttons */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveInvoice(false)}
            className="w-full py-3 px-4 bg-[#006D77] hover:bg-[#00575F] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Invoice'}</span>
          </button>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => handleSaveInvoice(true)}
            className="w-full py-3 px-4 bg-[#E6F5F8] hover:bg-[#D4E7EC] border border-[#006D77]/30 disabled:opacity-50 text-[#006D77] text-xs font-bold rounded-xl shadow-2xs flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Save & Print / WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  </div>

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
