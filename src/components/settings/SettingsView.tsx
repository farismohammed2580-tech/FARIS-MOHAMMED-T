import React, { useState, useEffect, useRef } from 'react';
import { BusinessSettings } from '../../types';
import { storage } from '../../services/storage';
import { validateLogoFile, processLogoFile } from '../../utils/logo';
import {
  Save,
  Building2,
  FileText,
  Printer,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  Upload,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  AlertCircle,
  Info,
} from 'lucide-react';

interface SettingsViewProps {
  settings: BusinessSettings;
  onSettingsUpdated: (newSettings: BusinessSettings) => void;
  onNavigateTo: (tabId: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSettingsUpdated,
}) => {
  const [formData, setFormData] = useState<BusinessSettings>(settings);
  const [toast, setToast] = useState<string | null>(null);

  // Logo management state
  const [pendingLogoUrl, setPendingLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [logoSuccess, setLogoSuccess] = useState<string | null>(null);
  const [isProcessingLogo, setIsProcessingLogo] = useState<boolean>(false);
  const [showRemoveLogoConfirm, setShowRemoveLogoConfirm] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFormData(settings);
    setPendingLogoUrl(null);
  }, [settings]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const showLogoSuccessMsg = (msg: string) => {
    setLogoSuccess(msg);
    setTimeout(() => setLogoSuccess(null), 4000);
  };

  const handleChange = (field: keyof BusinessSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle file selection with validation
  const handleLogoFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    setLogoSuccess(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const validation = validateLogoFile(file);

    if (!validation.valid) {
      setLogoError(validation.error || 'Invalid file. Please select a PNG, JPG, JPEG, or WebP image under 5 MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessingLogo(true);
    try {
      const processedDataUrl = await processLogoFile(file);
      setPendingLogoUrl(processedDataUrl);
      showToast('Logo selected! Click "Save Logo" to apply it across all portals.');
    } catch (err: any) {
      setLogoError(err?.message || 'Failed to process selected image file.');
    } finally {
      setIsProcessingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Save the pending logo
  const handleSaveLogo = () => {
    if (!pendingLogoUrl) return;
    try {
      const updated = storage.saveSettings({
        ...formData,
        logoUrl: pendingLogoUrl,
      });
      setFormData(updated);
      setPendingLogoUrl(null);
      setLogoError(null);
      onSettingsUpdated(updated);
      showLogoSuccessMsg('Business logo successfully saved and synced across all portals, invoices, and printouts.');
    } catch (err: any) {
      setLogoError(err?.message || 'Failed to save business logo to settings database.');
    }
  };

  // Remove existing or pending logo
  const handleRemoveLogo = () => {
    setShowRemoveLogoConfirm(true);
  };

  const executeRemoveLogo = () => {
    try {
      const updated = storage.saveSettings({
        ...formData,
        logoUrl: '',
      });
      setFormData(updated);
      setPendingLogoUrl(null);
      setLogoError(null);
      setShowRemoveLogoConfirm(false);
      onSettingsUpdated(updated);
      showLogoSuccessMsg('Business logo removed. Default WIN WHITE LAUNDRY brand mark restored.');
    } catch (err: any) {
      setLogoError(err?.message || 'Failed to remove business logo.');
      setShowRemoveLogoConfirm(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const toSave: BusinessSettings = {
      ...formData,
      logoUrl: pendingLogoUrl !== null ? pendingLogoUrl : (formData.logoUrl || ''),
    };
    const updated = storage.saveSettings(toSave);
    setFormData(updated);
    setPendingLogoUrl(null);
    onSettingsUpdated(updated);
    showToast('Business configuration saved successfully.');
  };

  const handleResetData = () => {
    setShowResetConfirm(true);
  };

  const executeResetData = () => {
    storage.resetToDefaultSeed();
    const s = storage.getSettings();
    setFormData(s);
    setPendingLogoUrl(null);
    setShowResetConfirm(false);
    onSettingsUpdated(s);
    showToast('Prototype data reset to initial Dubai demo state.');
  };

  return (
    <div className="space-y-3.5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-2.5">
        <div>
          <h1 className="text-base font-bold text-[#202729] tracking-tight">System & Business Settings</h1>
          <p className="text-xs text-[#5A6B70] mt-0.5">
            Configure shop coordinates in Dubai, UAE TRN tax number, and legal notices.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#006D77] hover:bg-[#00575F] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save All Settings</span>
        </button>
      </div>

      {toast && (
        <div className="p-3 bg-[#E6F5F8] border border-[#BDE7EF] text-[#006D77] text-xs font-bold rounded-xl flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-[#006D77] shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Hidden File Input for Logo Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
        onChange={handleLogoFileSelect}
        className="hidden"
        id="business-logo-upload"
        aria-label="Upload Business Logo"
      />

      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Business Logo Section */}
        <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-[#D4E7EC] pb-2">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#006D77]" />
              <h2 className="text-xs font-bold text-[#202729]">Business Logo</h2>
            </div>
            <span className="text-[10px] text-[#5A6B70] font-bold bg-[#F4FAFB] px-2 py-0.5 rounded-full border border-[#D4E7EC]">
              Max 5 MB
            </span>
          </div>

          {/* Logo Alerts */}
          {logoError && (
            <div className="p-2.5 bg-[#FCEEEE] border border-[#F4CECE] rounded-xl text-xs font-semibold text-[#9E3636] flex items-center gap-2 shadow-2xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#9E3636]" />
              <span>{logoError}</span>
            </div>
          )}

          {logoSuccess && (
            <div className="p-2.5 bg-[#E6F5F8] border border-[#BDE7EF] rounded-xl text-xs font-bold text-[#006D77] flex items-center gap-2 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#006D77]" />
              <span>{logoSuccess}</span>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {/* Logo Preview Container */}
            <div className="w-full flex flex-col items-center">
              <div className="w-full h-32 rounded-2xl bg-[#F4FAFB] border-2 border-dashed border-[#D4E7EC] flex items-center justify-center p-3 overflow-hidden relative group">
                {pendingLogoUrl ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <img
                      src={pendingLogoUrl}
                      alt="Selected logo preview"
                      className="max-h-full max-w-full object-contain"
                    />
                    <span className="absolute top-2 right-2 bg-[#FAF4E8] text-[#96681A] border border-[#EEDCB7] text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
                      Unsaved
                    </span>
                  </div>
                ) : formData.logoUrl ? (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <img
                      src={formData.logoUrl}
                      alt={formData.businessName || 'Business Logo'}
                      className="max-h-full max-w-full object-contain"
                    />
                    <span className="absolute top-2 right-2 bg-[#E6F5F8] text-[#006D77] border border-[#006D77]/20 text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs">
                      Active Logo
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-2">
                    <div className="w-12 h-12 rounded-xl bg-[#006D77] text-white flex items-center justify-center font-black tracking-tight text-lg shadow-2xs border border-[#00575F] mb-1.5">
                      WW
                    </div>
                    <span className="font-bold text-[11px] text-[#202729] leading-tight">
                      WIN WHITE LAUNDRY
                    </span>
                    <span className="text-[9px] text-[#5A6B70] mt-0.5">
                      Default Text Placeholder
                    </span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-[#5A6B70] mt-1.5 text-center">
                Maintains original proportions (object-fit: contain)
              </span>
            </div>

            {/* Logo Controls & Guidance */}
            <div className="flex-1 space-y-3 w-full">
              <p className="text-xs text-[#202729] leading-relaxed">
                Upload your official shop logo to appear on the <strong>Admin Header/Sidebar</strong>, <strong>PIN Entry Screen</strong>, <strong>Staff Workstation</strong>, and both <strong>Customer & Merchant Invoices</strong>.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                {!pendingLogoUrl && !formData.logoUrl && (
                  <button
                    type="button"
                    disabled={isProcessingLogo}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-[#006D77] hover:bg-[#00575F] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isProcessingLogo ? 'Processing Image...' : 'Upload Logo'}</span>
                  </button>
                )}

                {pendingLogoUrl && (
                  <>
                    <button
                      type="button"
                      onClick={handleSaveLogo}
                      className="flex items-center gap-2 px-4 py-2 bg-[#006D77] hover:bg-[#00575F] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Logo</span>
                    </button>

                    <button
                      type="button"
                      disabled={isProcessingLogo}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#F4FAFB] hover:bg-[#E6F5F8] text-[#202729] text-xs font-bold rounded-xl border border-[#D4E7EC] transition cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#5A6B70]" />
                      <span>Replace Logo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPendingLogoUrl(null)}
                      className="px-3 py-2 text-xs font-semibold text-[#5A6B70] hover:text-[#202729] transition cursor-pointer"
                    >
                      Cancel Preview
                    </button>
                  </>
                )}

                {!pendingLogoUrl && formData.logoUrl && (
                  <>
                    <button
                      type="button"
                      disabled={isProcessingLogo}
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-[#006D77] hover:bg-[#00575F] text-white text-xs font-bold rounded-xl shadow-2xs transition active:scale-95 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Replace Logo</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-[#FCEEEE] hover:bg-[#F9DADA] border border-[#F4CECE] text-[#9E3636] text-xs font-bold rounded-xl transition active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Logo</span>
                    </button>
                  </>
                )}
              </div>

              {/* Format & Storage notice */}
              <div className="pt-2 border-t border-[#D4E7EC] space-y-1 text-[11px] text-[#5A6B70]">
                <div className="flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-[#006D77] shrink-0 mt-0.5" />
                  <span>
                    <strong>File Constraints:</strong> Supported formats include PNG, JPG, JPEG, and WebP (up to 5 MB). Transparent backgrounds are recommended.
                  </span>
                </div>
                <div className="flex items-start gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-[#5A6B70] shrink-0 mt-0.5" />
                  <span>
                    <strong>Storage Architecture:</strong> In this prototype deployment, your logo is stored in the persistent business settings database (<code className="font-mono text-[10px] bg-[#F4FAFB] px-1 py-0.5 rounded">wwl_settings</code>).
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Business Identity & Contact */}
        <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-[#D4E7EC] pb-2">
            <Building2 className="w-4 h-4 text-[#006D77]" />
            <h2 className="text-xs font-bold text-[#202729]">Identity & Contact</h2>
          </div>

          <div className="space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-3">
            <div>
              <label className="block text-xs font-bold text-[#202729] mb-1">
                Business Trade Name
              </label>
              <input
                type="text"
                required
                value={formData.businessName}
                onChange={(e) => handleChange('businessName', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl font-bold text-[#202729]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202729] mb-1">
                Tagline / Service Subtitle
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202729] mb-1">
                Branch Location & Address (Dubai, UAE)
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202729] mb-1">
                UAE Tax Registration Number (TRN)
              </label>
              <input
                type="text"
                value={formData.trnNumber}
                onChange={(e) => handleChange('trnNumber', e.target.value)}
                className="w-full px-3 py-2 text-xs font-mono bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                placeholder="100xxxxxxxxx00003"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#202729] mb-1">
                  Business Mobile 1
                </label>
                <input
                  type="tel"
                  value={formData.mobile}
                  onChange={(e) => handleChange('mobile', e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                  placeholder="056 657 5169"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202729] mb-1">
                  Business Mobile 2
                </label>
                <input
                  type="tel"
                  value={formData.mobile2 || ''}
                  onChange={(e) => handleChange('mobile2', e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                  placeholder="055 720 2819"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Invoicing & Localization */}
        <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-[#D4E7EC] pb-2">
            <FileText className="w-4 h-4 text-[#006D77]" />
            <h2 className="text-xs font-bold text-[#202729]">Invoicing Format</h2>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#202729] mb-1">
                  Prefix
                </label>
                <input
                  type="text"
                  value={formData.invoicePrefix}
                  onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202729] mb-1">
                  Next Number
                </label>
                <input
                  type="number"
                  min="1000"
                  value={formData.nextInvoiceSequence}
                  onChange={(e) => handleChange('nextInvoiceSequence', parseInt(e.target.value, 10) || 1000)}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-[#202729] mb-1">Currency</label>
                <input
                  type="text"
                  readOnly
                  value={formData.currency}
                  className="w-full px-2.5 py-2 text-xs font-bold font-mono bg-[#E6F5F8] border border-[#D4E7EC] rounded-xl text-[#006D77]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202729] mb-1">Timezone</label>
                <input
                  type="text"
                  readOnly
                  value={formData.timezone}
                  className="w-full px-2.5 py-2 text-xs font-mono bg-[#E6F5F8] border border-[#D4E7EC] rounded-xl text-[#006D77]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Legal Disclaimers & Print Preferences */}
        <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-[#D4E7EC] pb-2">
            <Printer className="w-4 h-4 text-[#006D77]" />
            <h2 className="text-xs font-bold text-[#202729]">Printing & Terms</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#202729] mb-1">
                Customer Notice (Printed on Invoice)
              </label>
              <textarea
                rows={3}
                required
                value={formData.customerNotice}
                onChange={(e) => handleChange('customerNotice', e.target.value)}
                className="w-full p-2.5 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
              />
            </div>

            {/* Garment Responsibility Notice (30-Day Limit Notice) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-[#202729]">
                  Garment Responsibility Notice (30-Day Collection Limit)
                </label>
                <span className="text-[10px] text-[#006D77] font-bold">Printed on All Invoices</span>
              </div>
              <textarea
                rows={2}
                value={formData.garmentResponsibilityNotice || ''}
                onChange={(e) => handleChange('garmentResponsibilityNotice', e.target.value)}
                placeholder="IMPORTANT NOTICE: Win White Laundry accepts responsibility for garments for a maximum period of 30 days from the agreed collection date, subject to applicable law."
                className="w-full p-2.5 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729] font-medium"
              />
              <p className="text-[10px] text-[#5A6B70] mt-0.5 leading-snug">
                Transparent consumer notice printed at the bottom of all customer receipts regarding maximum 30-day garment storage responsibility, subject to applicable UAE consumer protection laws.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202729] mb-1">
                Footer Thank-You Message
              </label>
              <input
                type="text"
                value={formData.thankYouMessage}
                onChange={(e) => handleChange('thankYouMessage', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202729] mb-1">
                Default Print Output
              </label>
              <select
                value={formData.defaultPrintCopy}
                onChange={(e) => handleChange('defaultPrintCopy', e.target.value as any)}
                className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
              >
                <option value="both">Both Copies (Customer + Merchant)</option>
                <option value="customer">Customer Copy Only</option>
                <option value="merchant">Merchant Copy Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Security & Access PINs */}
        <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-[#D4E7EC] pb-2">
            <ShieldCheck className="w-4 h-4 text-[#006D77]" />
            <h2 className="text-xs font-bold text-[#202729]">Portal Security & Access PINs</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#202729] mb-1">
                Admin Portal 4-Digit PIN
              </label>
              <input
                type="password"
                maxLength={4}
                required
                value={formData.adminPin || '1234'}
                onChange={(e) => handleChange('adminPin', e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                placeholder="1234"
              />
              <span className="text-[10px] text-[#5A6B70] mt-1 block">
                Default: 1234 (full admin access)
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202729] mb-1">
                Floor Staff Portal 4-Digit PIN
              </label>
              <input
                type="password"
                maxLength={4}
                required
                value={formData.staffPin || '4321'}
                onChange={(e) => handleChange('staffPin', e.target.value.replace(/[^0-9]/g, ''))}
                className="w-full px-3 py-2 text-xs font-mono font-bold bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                placeholder="4321"
              />
              <span className="text-[10px] text-[#5A6B70] mt-1 block">
                Default: 4321 (restricted floor tracking)
              </span>
            </div>
          </div>
        </div>

        {/* Section 5: Reset Demo Data */}
        <div className="bg-white rounded-2xl p-3.5 border border-[#D4E7EC] shadow-xs space-y-2.5">
          <div>
            <h3 className="text-xs font-bold text-[#202729]">Prototype Demonstration Data</h3>
            <p className="text-[11px] text-[#5A6B70] mt-0.5">
              Reset database back to initial Dubai sample data.
            </p>
          </div>

          <button
            type="button"
            onClick={handleResetData}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-bold text-[#9E3636] bg-[#FCEEEE] hover:bg-[#F9DADA] rounded-xl border border-[#F4CECE] transition cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </form>

      {/* Remove Logo Confirmation Modal */}
      {showRemoveLogoConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-3 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-[#D4E7EC] shadow-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-[#202729]">Remove Business Logo</h4>
            <p className="text-xs text-[#5A6B70] leading-relaxed">
              Are you sure you want to remove the business logo? The default WIN WHITE LAUNDRY text mark will be restored across all screens and printed receipts.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#D4E7EC]">
              <button
                type="button"
                onClick={() => setShowRemoveLogoConfirm(false)}
                className="px-3.5 py-2 rounded-xl border border-[#D4E7EC] text-xs font-bold text-[#5A6B70] hover:bg-[#F4FAFB] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeRemoveLogo}
                className="px-4 py-2 rounded-xl bg-[#9E3636] hover:bg-[#852C2C] text-white text-xs font-bold cursor-pointer transition active:scale-95"
              >
                Remove Logo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Demo Data Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-3 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-[#D4E7EC] shadow-2xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-[#9E3636]">Reset Demonstration Data</h4>
            <p className="text-xs text-[#5A6B70] leading-relaxed">
              Are you sure you want to restore the initial Dubai prototype demonstration dataset? Any newly created invoices or expenses will be restored to initial sample data.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[#D4E7EC]">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-2 rounded-xl border border-[#D4E7EC] text-xs font-bold text-[#5A6B70] hover:bg-[#F4FAFB] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeResetData}
                className="px-4 py-2 rounded-xl bg-[#9E3636] hover:bg-[#852C2C] text-white text-xs font-bold cursor-pointer transition active:scale-95"
              >
                Reset Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
