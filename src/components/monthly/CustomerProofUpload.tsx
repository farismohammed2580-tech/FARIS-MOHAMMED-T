import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Camera,
  Eye,
  RefreshCw,
  Trash2,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  X,
  ExternalLink,
} from 'lucide-react';
import { validateProofFile, optimizeProofImage } from '../../services/customerProofStorage';

interface CustomerProofUploadProps {
  label?: string;
  currentProofUrl?: string | null;
  currentFileName?: string | null;
  onProofChange: (
    dataUrl: string | null,
    fileName: string | null,
    mimeType: string | null
  ) => void;
  disabled?: boolean;
}

export const CustomerProofUpload: React.FC<CustomerProofUploadProps> = ({
  label = 'Customer Proof / Documents (Optional)',
  currentProofUrl,
  currentFileName,
  onProofChange,
  disabled = false,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File | undefined) => {
    if (!file) return;
    setErrorMessage(null);

    const validation = validateProofFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid file.');
      return;
    }

    setIsProcessing(true);
    try {
      const optimizedDataUrl = await optimizeProofImage(file);
      onProofChange(optimizedDataUrl, file.name, file.type || 'image/jpeg');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to process document image.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onProofChange(null, null, null);
    setErrorMessage(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-bold text-[#202729]">
          {label}
        </label>
        {currentProofUrl && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[#006D77] bg-[#E6F5F8] px-2 py-0.5 rounded-full border border-[#BDE7EF]">
            <CheckCircle2 className="w-3 h-3 text-[#006D77]" />
            Proof Attached
          </span>
        )}
      </div>

      {/* Hidden native file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        disabled={disabled || isProcessing}
        onChange={(e) => handleFileProcess(e.target.files?.[0])}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        capture="environment"
        className="hidden"
        disabled={disabled || isProcessing}
        onChange={(e) => handleFileProcess(e.target.files?.[0])}
      />

      {/* Error message */}
      {errorMessage && (
        <div className="flex items-center gap-2 p-2 bg-[#FDE8E8] text-[#9E3636] rounded-xl text-[11px] border border-[#F8B4B4]">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="ml-auto font-bold cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Display Card: Preview or Empty Upload state */}
      {currentProofUrl ? (
        <div className="bg-[#F4FAFB] p-3 rounded-2xl border border-[#D4E7EC] space-y-2.5">
          <div className="flex items-center gap-3">
            {/* Thumbnail Preview with View overlay */}
            <div
              onClick={() => setIsFullPreviewOpen(true)}
              className="relative w-14 h-14 rounded-xl border border-[#D4E7EC] bg-white overflow-hidden shrink-0 cursor-pointer group shadow-2xs"
              title="Click to view full document"
            >
              <img
                src={currentProofUrl}
                alt="Customer Proof"
                className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
              />
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                <Eye className="w-4 h-4" />
              </div>
            </div>

            {/* Document metadata & actions */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#202729] truncate">
                {currentFileName || 'Customer_Proof_Document'}
              </p>
              <p className="text-[10px] text-[#5A696D] mt-0.5">
                Saved in private authenticated store
              </p>
              <div className="flex items-center gap-1.5 mt-2">
                <button
                  type="button"
                  onClick={() => setIsFullPreviewOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#E6F5F8] text-[#006D77] border border-[#BDE7EF] rounded-lg text-[10px] font-bold transition cursor-pointer"
                >
                  <Eye className="w-3 h-3" />
                  <span>View</span>
                </button>
                <button
                  type="button"
                  disabled={disabled || isProcessing}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#E6F5F8] text-[#202729] border border-[#D4E7EC] rounded-lg text-[10px] font-bold transition cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className="w-3 h-3 text-[#5A696D]" />
                  <span>Replace</span>
                </button>
                <button
                  type="button"
                  disabled={disabled || isProcessing}
                  onClick={handleRemove}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#FCEEEE] hover:bg-[#F9DADA] text-[#9E3636] border border-[#F4CECE] rounded-lg text-[10px] font-bold transition cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-dashed border-[#BDE7EF] bg-[#F4FAFB] rounded-2xl p-3 text-center space-y-2">
          <p className="text-[11px] text-[#5A696D]">
            Attach Emirates ID, Trade License, agreement, or registration proof.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              disabled={disabled || isProcessing}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#006D77] hover:bg-[#00575F] text-white rounded-xl text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Processing...' : 'Upload Image'}</span>
            </button>
            <button
              type="button"
              disabled={disabled || isProcessing}
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#E6F5F8] text-[#006D77] border border-[#006D77]/30 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Take Photo</span>
            </button>
          </div>
          <p className="text-[9.5px] text-[#5A696D]">
            Supports JPG, JPEG, PNG, and WebP (up to 8 MB)
          </p>
        </div>
      )}

      {/* Privacy Notice */}
      <div className="flex items-start gap-1.5 text-[10px] text-[#5A696D] bg-[#F4FAFB] p-2 rounded-xl border border-[#D4E7EC]">
        <ShieldCheck className="w-3.5 h-3.5 text-[#006D77] shrink-0 mt-0.5" />
        <span>
          <strong>Privacy Boundary:</strong> Documents remain strictly private to authorized Admin accounts in this prototype. No public document links are generated.
        </span>
      </div>

      {/* Full Document View Modal */}
      {isFullPreviewOpen && currentProofUrl && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-[#D4E7EC] overflow-hidden">
            <div className="flex items-center justify-between p-3.5 border-b border-[#D4E7EC] bg-[#F4FAFB]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#006D77]" />
                <div>
                  <h3 className="text-xs font-bold text-[#202729]">
                    {currentFileName || 'Customer Proof Document'}
                  </h3>
                  <p className="text-[9.5px] text-[#5A696D]">Private Document Preview</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFullPreviewOpen(false)}
                className="p-1 rounded-xl hover:bg-[#E5EFF1] text-[#202729] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 overflow-auto flex items-center justify-center bg-[#202729]/5 min-h-[250px] max-h-[60vh]">
              <img
                src={currentProofUrl}
                alt="Document Full Preview"
                className="max-w-full max-h-[55vh] object-contain rounded-xl shadow-xs"
              />
            </div>

            <div className="p-3 bg-white border-t border-[#D4E7EC] flex items-center justify-between gap-2">
              <span className="text-[10px] text-[#5A696D]">
                Restricted to authorized Admin session
              </span>
              <button
                type="button"
                onClick={() => setIsFullPreviewOpen(false)}
                className="px-4 py-1.5 bg-[#006D77] text-white text-xs font-bold rounded-xl shadow-2xs hover:bg-[#00575F] cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
