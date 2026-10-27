import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Expense, ExpenseCategory, EXPENSE_CATEGORIES, Invoice, UserAccount } from '../../types';
import { storage } from '../../services/storage';
import { formatAED, isDateInPeriod, calculateProfitEstimate } from '../../utils/calculations';
import { exportExpensesCSV } from '../../utils/export';
import {
  DollarSign,
  Plus,
  Trash2,
  Edit2,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  Calendar,
  CreditCard,
  Camera,
  Image as ImageIcon,
  Eye,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  FileText,
} from 'lucide-react';
import {
  validateReceiptFile,
  optimizeReceiptImage,
  saveReceiptImage,
  getReceiptImage,
  deleteReceiptImage,
} from '../../services/receiptStorage';

interface ExpensesViewProps {
  currentUser: UserAccount;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({ currentUser }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'month' | 'year' | 'custom'>('month');
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState<string>(() => new Date().toISOString().slice(0, 10));

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<ExpenseCategory>('Detergents & Chemicals');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'Other'>('Card');
  const [toast, setToast] = useState<string | null>(null);

  // Receipt Image State for Add/Edit Form
  const [receiptDataUrl, setReceiptDataUrl] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [isProcessingImage, setIsProcessingImage] = useState(false);

  // Lightbox / Image Viewer Modal State
  const [viewingReceipt, setViewingReceipt] = useState<{
    imageUrl: string;
    title: string;
    date: string;
    amount: number;
    fileName?: string;
  } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Persistent receipt cache map for expense list (id -> dataUrl)
  const [receiptCache, setReceiptCache] = useState<Record<string, string>>({});

  // Hidden file inputs for Camera and Gallery
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = () => {
      const exps = storage.getExpenses();
      setExpenses(exps);
      setInvoices(storage.getInvoices());

      // Hydrate receipt images from persistent IndexedDB if not already in URL
      exps.forEach(async (exp) => {
        if (exp.receiptImageUrl) {
          setReceiptCache((prev) => ({ ...prev, [exp.id]: exp.receiptImageUrl! }));
        } else if (exp.receiptImageId) {
          const stored = await getReceiptImage(exp.receiptImageId);
          if (stored) {
            setReceiptCache((prev) => ({ ...prev, [exp.id]: stored }));
          }
        }
      });
    };

    load();
    return storage.subscribe(load);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Filtered by selected date period
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => isDateInPeriod(e.date, period, customStart, customEnd));
  }, [expenses, period, customStart, customEnd]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => isDateInPeriod(i.invoiceDate, period, customStart, customEnd));
  }, [invoices, period, customStart, customEnd]);

  // Financial aggregates
  const financialSummary = useMemo(() => {
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalSales = filteredInvoices.reduce((sum, i) => sum + i.total, 0);
    const paymentsReceived = filteredInvoices.reduce((sum, i) => sum + i.amountPaid, 0);
    const outstandingPayments = filteredInvoices.reduce((sum, i) => sum + i.remainingBalance, 0);

    const profitData = calculateProfitEstimate(totalSales, paymentsReceived, totalExpenses);

    return {
      totalExpenses: Number(totalExpenses.toFixed(2)),
      totalSales: Number(totalSales.toFixed(2)),
      paymentsReceived: Number(paymentsReceived.toFixed(2)),
      outstandingPayments: Number(outstandingPayments.toFixed(2)),
      cashBasisProfit: profitData.cashBasisProfit,
      accrualBasisProfit: profitData.accrualBasisProfit,
    };
  }, [filteredExpenses, filteredInvoices]);

  const handleOpenAdd = () => {
    setEditingExpenseId(null);
    setDate(new Date().toISOString().slice(0, 10));
    setCategory('Detergents & Chemicals');
    setDescription('');
    setAmount(0);
    setPaymentMethod('Card');
    setReceiptDataUrl(null);
    setReceiptFileName('');
    setReceiptError(null);
    setIsProcessingImage(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = async (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setDate(exp.date);
    setCategory(exp.category);
    setDescription(exp.description);
    setAmount(exp.amount);
    setPaymentMethod(exp.paymentMethod);
    setReceiptError(null);
    setIsProcessingImage(false);

    // Load receipt image if attached
    const cachedUrl = receiptCache[exp.id] || exp.receiptImageUrl;
    if (cachedUrl) {
      setReceiptDataUrl(cachedUrl);
      setReceiptFileName('receipt_image.jpg');
    } else if (exp.receiptImageId) {
      const loaded = await getReceiptImage(exp.receiptImageId);
      setReceiptDataUrl(loaded);
      setReceiptFileName('receipt_image.jpg');
    } else {
      setReceiptDataUrl(null);
      setReceiptFileName('');
    }

    setIsModalOpen(true);
  };

  const handleDelete = (id: string, desc: string) => {
    if (confirm(`Are you sure you want to delete expense "${desc}"?`)) {
      storage.deleteExpense(id);
      deleteReceiptImage(id);
      setReceiptCache((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
      showToast('Expense entry deleted.');
    }
  };

  // Image Upload Handler with File Validation
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so user can pick the exact same file if re-trying
    e.target.value = '';
    setReceiptError(null);

    // Validate type and size
    const validation = validateReceiptFile(file);
    if (!validation.valid) {
      setReceiptError(validation.error || 'Invalid file.');
      return;
    }

    setIsProcessingImage(true);
    try {
      // Process and optimize image
      const optimizedUrl = await optimizeReceiptImage(file);
      setReceiptDataUrl(optimizedUrl);
      setReceiptFileName(file.name);
      setReceiptError(null);
    } catch (err: any) {
      console.error('Failed to process receipt image:', err);
      setReceiptError(err.message || 'Failed to process receipt image. Please try again.');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptDataUrl(null);
    setReceiptFileName('');
    setReceiptError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Please enter a valid expense amount greater than 0.');
      return;
    }
    if (!description.trim()) {
      alert('Please enter a description for this expense.');
      return;
    }

    const expenseId = editingExpenseId || `exp-${Date.now()}`;
    let savedReceiptUrl: string | undefined = undefined;

    if (receiptDataUrl) {
      // Persist to IndexedDB
      try {
        await saveReceiptImage(expenseId, receiptDataUrl, receiptFileName || 'receipt.jpg');
        savedReceiptUrl = receiptDataUrl;
        setReceiptCache((prev) => ({ ...prev, [expenseId]: receiptDataUrl }));
      } catch (err) {
        console.error('Failed to save receipt image permanently:', err);
        savedReceiptUrl = receiptDataUrl; // fallback
      }
    } else {
      // If user removed receipt while editing
      if (editingExpenseId) {
        await deleteReceiptImage(editingExpenseId);
        setReceiptCache((prev) => {
          const copy = { ...prev };
          delete copy[editingExpenseId];
          return copy;
        });
      }
    }

    const exp: Expense = {
      id: expenseId,
      date,
      category,
      description: description.trim(),
      amount,
      paymentMethod,
      recordedBy: `${currentUser.name} (${currentUser.role})`,
      createdAt: new Date().toISOString(),
      receiptImageUrl: savedReceiptUrl,
      receiptImageId: savedReceiptUrl ? expenseId : undefined,
    };

    storage.saveExpense(exp);
    setIsModalOpen(false);
    showToast(editingExpenseId ? 'Expense updated.' : 'Expense recorded with receipt.');
  };

  // Download Receipt Image
  const handleDownloadReceipt = (dataUrl: string, filename: string = 'receipt.jpg') => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const periodOptions = [
    { id: 'today', label: 'Today' },
    { id: 'yesterday', label: 'Yesterday' },
    { id: 'week', label: 'This Week' },
    { id: 'month', label: 'This Month' },
    { id: 'year', label: 'This Year' },
    { id: 'custom', label: 'Custom' },
  ] as const;

  return (
    <div className="space-y-3.5">
      {/* Hidden File Inputs for Camera and File Picker */}
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleFileSelected}
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileSelected}
        accept="image/jpeg,image/png,image/webp,image/jpg"
        capture="environment"
        className="hidden"
      />

      {/* Header */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-2.5">
        <div>
          <h1 className="text-base font-bold text-[#202729] tracking-tight">Shop Expenses & Profit</h1>
          <p className="text-xs text-[#5A6B70] mt-0.5">
            Detergents, rent, electricity, bills, and operating receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportExpensesCSV(filteredExpenses)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-[#202729] bg-[#F4FAFB] hover:bg-[#E6F5F8] border border-[#D4E7EC] rounded-xl transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#5A6B70]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-[#006D77] hover:bg-[#00575F] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Record Cost</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className="p-3 bg-[#E6F5F8] border border-[#BDE7EF] text-[#006D77] text-xs font-bold rounded-xl flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-[#006D77] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Period Filter Buttons */}
      <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs space-y-2">
        <div className="flex flex-wrap items-center gap-1">
          {periodOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPeriod(opt.id)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                period === opt.id
                  ? 'bg-[#006D77] text-white shadow-xs'
                  : 'bg-[#F4FAFB] text-[#202729] border border-[#D4E7EC] hover:bg-[#E6F5F8]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 pt-1">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border border-[#D4E7EC] rounded-xl bg-[#F4FAFB]"
            />
            <span className="text-xs text-[#5A6B70]">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="flex-1 px-2 py-1 text-xs border border-[#D4E7EC] rounded-xl bg-[#F4FAFB]"
            />
          </div>
        )}
      </div>

      {/* Profit & Expense Summary Cards: 2x2 on Mobile, 4-Cols on Tablet */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 md:gap-3.5">
        <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
          <span className="text-[10px] font-bold text-[#5A6B70] uppercase tracking-wider block">
            Expenses
          </span>
          <span className="text-sm font-mono font-black text-[#9E3636] block mt-1 truncate">
            {formatAED(financialSummary.totalExpenses)}
          </span>
          <span className="text-[10px] text-[#5A6B70] mt-0.5 block truncate">
            {filteredExpenses.length} entries
          </span>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
          <span className="text-[10px] font-bold text-[#5A6B70] uppercase tracking-wider block">
            Billed Sales
          </span>
          <span className="text-sm font-mono font-black text-[#202729] block mt-1 truncate">
            {formatAED(financialSummary.totalSales)}
          </span>
          <span className="text-[10px] text-[#5A6B70] mt-0.5 block truncate">
            {filteredInvoices.length} invoices
          </span>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
          <span className="text-[10px] font-bold text-[#006D77] uppercase tracking-wider block">
            Cash In
          </span>
          <span className="text-sm font-mono font-black text-[#006D77] block mt-1 truncate">
            {formatAED(financialSummary.paymentsReceived)}
          </span>
          <span className="text-[10px] text-[#5A6B70] mt-0.5 block truncate">Collected</span>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs">
          <span className="text-[10px] font-bold text-[#5A6B70] uppercase tracking-wider block">
            Net Profit
          </span>
          <span
            className={`text-sm font-mono font-black block mt-1 truncate ${
              financialSummary.cashBasisProfit >= 0 ? 'text-[#006D77]' : 'text-[#9E3636]'
            }`}
          >
            {formatAED(financialSummary.cashBasisProfit)}
          </span>
          <span className="text-[10px] text-[#5A6B70] mt-0.5 block truncate">Cash basis</span>
        </div>
      </div>

      {/* Expense Cards: 1-Column on Mobile, 2/3-Column on Tablet */}
      <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3.5">
        {filteredExpenses.map((exp) => {
          const attachedImage = receiptCache[exp.id] || exp.receiptImageUrl;

          return (
            <div
              key={exp.id}
              className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-2.5"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F5F8] text-[#006D77]">
                      {exp.category}
                    </span>
                    {attachedImage && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#D4E7EC] text-[#006D77] flex items-center gap-1">
                        <FileText className="w-2.5 h-2.5" />
                        <span>Receipt</span>
                      </span>
                    )}
                  </div>
                  <span className="block text-[10px] text-[#5A6B70] font-mono mt-1">
                    {exp.date} • {exp.paymentMethod}
                  </span>
                </div>

                <span className="font-mono font-black text-sm text-[#9E3636]">
                  -{formatAED(exp.amount)}
                </span>
              </div>

              <p className="text-xs font-semibold text-[#202729]">{exp.description}</p>
              <p className="text-[10px] text-[#5A6B70]">By: {exp.recordedBy}</p>

              {/* Attached Receipt Thumbnail and Quick View Bar */}
              {attachedImage && (
                <div className="p-2 bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl flex items-center justify-between gap-2.5">
                  <div
                    onClick={() => {
                      setViewingReceipt({
                        imageUrl: attachedImage,
                        title: exp.description,
                        date: exp.date,
                        amount: exp.amount,
                      });
                      setZoomLevel(1);
                    }}
                    className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                  >
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-[#D4E7EC] shrink-0 relative group">
                      <img
                        src={attachedImage}
                        alt="Receipt preview"
                        className="w-full h-full object-cover group-hover:scale-105 transition"
                      />
                      <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Eye className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-[#006D77] block truncate">
                        Attached Receipt
                      </span>
                      <span className="text-[10px] text-[#5A6B70] block truncate">
                        Tap thumbnail to view full image
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setViewingReceipt({
                        imageUrl: attachedImage,
                        title: exp.description,
                        date: exp.date,
                        amount: exp.amount,
                      });
                      setZoomLevel(1);
                    }}
                    className="px-2.5 py-1.5 bg-white hover:bg-[#E6F5F8] border border-[#D4E7EC] text-[#006D77] text-xs font-bold rounded-lg flex items-center gap-1 shrink-0 cursor-pointer active:scale-95 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D4E7EC]">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(exp)}
                  className="py-1.5 px-3 bg-[#F4FAFB] hover:bg-[#E6F5F8] border border-[#D4E7EC] text-[#202729] text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#5A6B70]" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(exp.id, exp.description)}
                  className="py-1.5 px-3 bg-[#FCEEEE] hover:bg-[#F9DADA] text-[#9E3636] text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          );
        })}

        {filteredExpenses.length === 0 && (
          <div className="bg-white p-8 rounded-2xl border border-[#D4E7EC] text-center text-xs text-[#5A6B70]">
            No expenses recorded for this period.
          </div>
        )}
      </div>

      {/* Add / Edit Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-3 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full border border-[#D4E7EC] shadow-2xl p-4.5 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#D4E7EC] pb-3">
              <h3 className="text-sm font-bold text-[#202729]">
                {editingExpenseId ? 'Edit Shop Expense' : 'Record New Expense'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#5A6B70] hover:text-[#202729] p-1.5 rounded-lg hover:bg-[#F4FAFB]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#202729] mb-1">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#202729] mb-1">Expense Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full px-3 py-2 bg-white border border-[#D4E7EC] rounded-xl text-[#202729]"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#202729] mb-1">
                  Description / Purpose <span className="text-[#9E3636]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 20L Liquid Laundry Detergent + Fabric Softener"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#202729] mb-1">
                  Amount in AED <span className="text-[#9E3636]">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  placeholder="0.00"
                  value={amount || ''}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 font-mono font-bold bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                />
              </div>

              <div>
                <label className="block font-bold text-[#202729] mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'Card', 'Other'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        paymentMethod === method
                          ? 'bg-[#006D77] text-white border-[#006D77]'
                          : 'bg-[#F4FAFB] text-[#202729] border-[#D4E7EC]'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Receipt / Image Section */}
              <div className="pt-2 border-t border-[#D4E7EC] space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-[#202729]">
                    Upload Receipt / Image <span className="text-[11px] font-normal text-[#5A6B70]">(Optional)</span>
                  </label>
                  {receiptDataUrl && (
                    <span className="text-[10px] font-bold text-[#006D77] bg-[#E6F5F8] px-2 py-0.5 rounded-full">
                      ✓ Attached
                    </span>
                  )}
                </div>

                {/* Validation Error Feedback */}
                {receiptError && (
                  <div className="p-2.5 bg-[#FCEEEE] border border-[#F5C2C2] text-[#9E3636] text-[11px] rounded-xl flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{receiptError}</span>
                  </div>
                )}

                {/* Active Image Preview & Action Controls */}
                {receiptDataUrl ? (
                  <div className="p-3 bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div
                        onClick={() => {
                          setViewingReceipt({
                            imageUrl: receiptDataUrl,
                            title: description || 'New Expense Receipt',
                            date,
                            amount: amount || 0,
                          });
                          setZoomLevel(1);
                        }}
                        className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-[#D4E7EC] shrink-0 cursor-pointer relative group"
                        title="Click to preview full receipt"
                      >
                        <img
                          src={receiptDataUrl}
                          alt="Receipt preview"
                          className="w-full h-full object-cover group-hover:scale-105 transition"
                        />
                        <div className="absolute inset-0 bg-black/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <Eye className="w-4 h-4 text-white" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-[#202729] block truncate">
                          {receiptFileName || 'Receipt Photo'}
                        </span>
                        <span className="text-[10px] text-[#5A6B70] block mt-0.5">
                          Format: JPG, JPEG, PNG, or WebP
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setViewingReceipt({
                              imageUrl: receiptDataUrl,
                              title: description || 'New Expense Receipt',
                              date,
                              amount: amount || 0,
                            });
                            setZoomLevel(1);
                          }}
                          className="text-[11px] font-bold text-[#006D77] hover:underline mt-1 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Full Image</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        className="flex-1 py-1.5 px-2 bg-white hover:bg-[#E6F5F8] border border-[#D4E7EC] text-[#202729] text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition"
                      >
                        <RefreshCw className="w-3 h-3 text-[#5A6B70]" />
                        <span>Replace</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="flex-1 py-1.5 px-2 bg-white hover:bg-[#E6F5F8] border border-[#D4E7EC] text-[#202729] text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition"
                      >
                        <Camera className="w-3 h-3 text-[#5A6B70]" />
                        <span>Retake</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRemoveReceipt}
                        className="py-1.5 px-2.5 bg-[#FCEEEE] hover:bg-[#F9DADA] text-[#9E3636] text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Dual Action Buttons: Camera & Gallery */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={isProcessingImage}
                        onClick={() => cameraInputRef.current?.click()}
                        className="py-2.5 px-3 bg-[#F4FAFB] hover:bg-[#E6F5F8] border border-dashed border-[#006D77]/40 hover:border-[#006D77] text-[#006D77] rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition"
                      >
                        <Camera className="w-5 h-5 text-[#006D77]" />
                        <span className="text-[11px] font-bold">Take Photo</span>
                        <span className="text-[9px] text-[#5A6B70]">Camera</span>
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingImage}
                        onClick={() => galleryInputRef.current?.click()}
                        className="py-2.5 px-3 bg-[#F4FAFB] hover:bg-[#E6F5F8] border border-dashed border-[#006D77]/40 hover:border-[#006D77] text-[#006D77] rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer active:scale-95 transition"
                      >
                        <ImageIcon className="w-5 h-5 text-[#006D77]" />
                        <span className="text-[11px] font-bold">Choose File</span>
                        <span className="text-[9px] text-[#5A6B70]">Gallery / Drive</span>
                      </button>
                    </div>

                    {isProcessingImage && (
                      <div className="p-2 text-center text-xs text-[#006D77] font-semibold flex items-center justify-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing & optimizing receipt image...</span>
                      </div>
                    )}

                    <p className="text-[10px] text-[#5A6B70] text-center">
                      Supported: JPG, JPEG, PNG, WebP (Max 8MB). Stored persistently.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#D4E7EC]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-[#202729] bg-[#F4FAFB] hover:bg-[#E6F5F8] border border-[#D4E7EC] rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessingImage}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#006D77] hover:bg-[#00575F] rounded-xl shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {editingExpenseId ? 'Update Expense' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Full-Screen Receipt Viewer Modal */}
      {viewingReceipt && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex flex-col z-50 animate-fadeIn p-3 sm:p-4">
          {/* Lightbox Header */}
          <div className="flex items-center justify-between text-white pb-3 border-b border-white/20">
            <div className="min-w-0 pr-3">
              <h4 className="text-sm font-bold text-white truncate">
                {viewingReceipt.title || 'Expense Receipt'}
              </h4>
              <p className="text-xs text-white/70">
                {viewingReceipt.date} • -{formatAED(viewingReceipt.amount)}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setZoomLevel((prev) => (prev >= 2.5 ? 1 : prev + 0.5))}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
                title="Zoom"
              >
                {zoomLevel > 1 ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => handleDownloadReceipt(viewingReceipt.imageUrl, 'win_white_receipt.jpg')}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
                title="Download image"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Lightbox Image Container */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-2 min-h-0">
            <div
              className="transition-transform duration-200 flex items-center justify-center max-w-full max-h-full"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <img
                src={viewingReceipt.imageUrl}
                alt={viewingReceipt.title || 'Full Receipt'}
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-2xl bg-white"
              />
            </div>
          </div>

          {/* Lightbox Footer Actions */}
          <div className="pt-3 border-t border-white/20 flex items-center justify-between text-white text-xs">
            <span className="text-white/70 text-[11px]">
              {zoomLevel > 1 ? `Zoom: ${Math.round(zoomLevel * 100)}%` : 'Persistent Receipt Record'}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadReceipt(viewingReceipt.imageUrl, 'win_white_receipt.jpg')}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="px-4 py-1.5 bg-[#006D77] hover:bg-[#00575F] text-white rounded-xl font-bold transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
