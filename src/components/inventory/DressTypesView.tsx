import React, { useState, useEffect } from 'react';
import { DressType, ServiceType, SERVICE_TYPES } from '../../types';
import { storage } from '../../services/storage';
import { formatAED } from '../../utils/calculations';
import { Plus, Edit2, Search, CheckCircle2, X } from 'lucide-react';

export const DressTypesView: React.FC = () => {
  const [dressTypes, setDressTypes] = useState<DressType[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Modal / Form state for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<DressType['category']>('General');
  const [prices, setPrices] = useState<Record<string, number>>({
    'Normal Wash': 6,
    'Dry Cleaning': 10,
    'Only Pressing': 3,
    'Only Wash': 3,
    'Washing + Ironing': 6,
    'Washing Only': 3,
    'Pressing Only': 3,
  });
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const load = () => setDressTypes(storage.getDressTypes());
    load();
    return storage.subscribe(load);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setCategory('General');
    setPrices({
      'Normal Wash': 6,
      'Dry Cleaning': 10,
      'Only Pressing': 3,
      'Only Wash': 3,
      'Washing + Ironing': 6,
      'Washing Only': 3,
      'Pressing Only': 3,
    });
    setNotes('');
    setIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dt: DressType) => {
    setEditingId(dt.id);
    setName(dt.name);
    setCategory(dt.category);
    setPrices({ ...dt.prices });
    setNotes(dt.notes || '');
    setIsActive(dt.isActive);
    setIsModalOpen(true);
  };

  const handleToggleActive = (dt: DressType) => {
    const updated = { ...dt, isActive: !dt.isActive };
    storage.saveDressType(updated);
    showToast(`${dt.name} marked as ${updated.isActive ? 'Active' : 'Inactive'}`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const savedItem: DressType = {
      id: editingId || `dt-${Date.now()}`,
      name: name.trim(),
      category,
      prices,
      isActive,
      notes: notes.trim() || undefined,
    };

    storage.saveDressType(savedItem);
    setIsModalOpen(false);
    showToast(`Dress type "${savedItem.name}" saved successfully`);
  };

  const filtered = dressTypes.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || d.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', 'Traditional UAE', 'Men', 'Women', 'Household', 'General'];

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-2.5">
        <div>
          <h1 className="text-base font-bold text-[#202729] tracking-tight">Garment Catalog & Rates</h1>
          <p className="text-xs text-[#5A6B70] mt-0.5">
            Configure rates for Washing, Dry Cleaning, and Pressing.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#006D77] hover:bg-[#00575F] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Garment</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 bg-[#E6F5F8] border border-[#BDE7EF] text-[#006D77] text-xs font-bold rounded-xl flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-[#006D77] shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-3 border border-[#D4E7EC] shadow-xs space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-[#5A6B70] absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search garment (e.g. Kandura, Abaya, Suit)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729] focus:outline-hidden focus:ring-2 focus:ring-[#006D77]/20 focus:border-[#006D77]"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-[#006D77] text-white shadow-xs'
                  : 'bg-[#F4FAFB] text-[#202729] border border-[#D4E7EC] hover:bg-[#E6F5F8]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Garment Cards: 1-Column on Mobile, 2/3-Column Grid on Tablet */}
      <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3.5">
        {filtered.map((dt) => (
          <div
            key={dt.id}
            className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-3"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-[#202729]">{dt.name}</h3>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E6F5F8] text-[#006D77] mt-1">
                  {dt.category}
                </span>
                {dt.notes && <p className="text-[10px] text-[#5A6B70] mt-0.5">{dt.notes}</p>}
              </div>

              <button
                type="button"
                onClick={() => handleToggleActive(dt)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  dt.isActive
                    ? 'bg-[#E6F5F8] text-[#006D77] border border-[#006D77]/20'
                    : 'bg-[#F4FAFB] text-[#5A6B70] border border-[#D4E7EC]'
                }`}
              >
                {dt.isActive ? 'Active' : 'Inactive'}
              </button>
            </div>

            {/* Rates Grid matching 4 service columns from invoice */}
            <div className="grid grid-cols-2 gap-2 bg-[#F4FAFB] p-2.5 rounded-xl border border-[#D4E7EC] text-xs">
              <div>
                <span className="text-[10px] text-[#5A6B70] block">Normal Wash:</span>
                <span className="font-mono font-bold text-[#202729]">
                  {(dt.prices['Normal Wash'] ?? dt.prices['Washing + Ironing'] ?? 0) > 0 ? (
                    formatAED(dt.prices['Normal Wash'] ?? dt.prices['Washing + Ironing'])
                  ) : (
                    <span className="text-[#B91C1C] text-[10px] font-semibold">Custom / Unlisted</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#5A6B70] block">Dry Cleaning:</span>
                <span className="font-mono font-bold text-[#202729]">
                  {(dt.prices['Dry Cleaning'] ?? 0) > 0 ? (
                    formatAED(dt.prices['Dry Cleaning'])
                  ) : dt.rateType === 'size' ? (
                    <span className="text-[#006D77] text-[10px] font-semibold">By Size</span>
                  ) : (
                    <span className="text-[#5A6B70] text-[10px]">Unlisted (-)</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#5A6B70] block">Only Pressing:</span>
                <span className="font-mono font-bold text-[#202729]">
                  {(dt.prices['Only Pressing'] ?? dt.prices['Pressing Only'] ?? 0) > 0 ? (
                    formatAED(dt.prices['Only Pressing'] ?? dt.prices['Pressing Only'])
                  ) : (
                    <span className="text-[#5A6B70] text-[10px]">Unlisted (-)</span>
                  )}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#5A6B70] block">Only Wash:</span>
                <span className="font-mono font-bold text-[#202729]">
                  {(dt.prices['Only Wash'] ?? dt.prices['Washing Only'] ?? 0) > 0 ? (
                    formatAED(dt.prices['Only Wash'] ?? dt.prices['Washing Only'])
                  ) : (
                    <span className="text-[#5A6B70] text-[10px]">Unlisted (-)</span>
                  )}
                </span>
              </div>
            </div>

            {/* Verification Alert if item has unlisted / uncertain prices on paper invoice */}
            {(dt.unverifiedServices && dt.unverifiedServices.length > 0) || (dt.prices['Normal Wash'] === 0 && dt.prices['Dry Cleaning'] === 0) ? (
              <div className="px-2 py-1 bg-[#FDF2F2] border border-[#FECACA] rounded-lg text-[10px] text-[#B91C1C] font-medium flex items-center justify-between">
                <span>⚠️ Note: {dt.notes || 'Uncertain on paper invoice; editable'}</span>
              </div>
            ) : null}

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => handleOpenEdit(dt)}
                className="py-1.5 px-3 bg-[#E6F5F8] hover:bg-[#D4E7EC] border border-[#006D77]/20 text-[#006D77] text-xs font-bold rounded-xl flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Rates</span>
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="bg-white p-8 rounded-2xl border border-[#D4E7EC] text-center text-xs text-[#5A6B70]">
            No garments match your search.
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-5 sm:p-6 border border-[#D4E7EC]">
            <div className="flex justify-between items-center border-b border-[#D4E7EC] pb-3 mb-4">
              <h2 className="text-sm font-bold text-[#202729]">
                {editingId ? 'Edit Garment Rates' : 'Add New Garment Type'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#5A6B70] hover:text-[#202729] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#202729] mb-1">
                    Garment Name <span className="text-[#9E3636]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Silk Kandura / Heavy Blazer"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#202729] mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as DressType['category'])}
                    className="w-full px-3 py-2 bg-white border border-[#D4E7EC] rounded-xl text-[#202729]"
                  >
                    <option value="Traditional UAE">Traditional UAE</option>
                    <option value="Men">Men</option>
                    <option value="Women">Women</option>
                    <option value="Household">Household</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              {/* Service Pricing Grid */}
              <div className="bg-[#F4FAFB] p-3 rounded-xl border border-[#D4E7EC] space-y-2.5">
                <p className="font-bold text-[#202729]">Service Pricing (AED):</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {SERVICE_TYPES.map((st) => (
                    <div key={st}>
                      <label className="block text-[11px] font-bold text-[#5A6B70] mb-0.5">{st}</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        required
                        value={prices[st] ?? 0}
                        onChange={(e) =>
                          setPrices((prev) => ({
                            ...prev,
                            [st]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 font-mono font-bold bg-white border border-[#D4E7EC] rounded-lg text-[#202729]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#202729] mb-1">Special Handling Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Silk fabric requires delicate steam press"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#D4E7EC]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-[#202729] bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#006D77] hover:bg-[#00575F] rounded-xl shadow-xs"
                >
                  Save Garment Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
