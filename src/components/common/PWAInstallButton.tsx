import React, { useState } from 'react';
import { usePWAInstall } from '../../utils/usePWAInstall';
import { Download, Share2, X, Smartphone } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#70D0F5] hover:bg-[#52c3ef] text-[#004D54] text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer ${className}`}
        title="Install WIN WHITE LAUNDRY App"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#E6F7FD] hover:bg-[#d6f0fb] text-[#006D77] border border-[#70D0F5]/50 text-xs font-bold transition active:scale-95 cursor-pointer ${className}`}
          title="Install on iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-[#DDE8EA] space-y-4 text-[#202729]">
              <div className="flex items-center justify-between border-b border-[#DDE8EA] pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#006D77] text-white flex items-center justify-center font-black text-xs">
                    WW
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#006D77]">Install on iPhone / iPad</h3>
                    <p className="text-[10px] text-[#5A696D]">Add to Home Screen for fullscreen mobile experience</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 text-[#5A696D] hover:text-[#202729] rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-[#202729]">
                <div className="flex items-start gap-2.5 p-2.5 bg-[#F4FAFB] rounded-xl border border-[#DDE8EA]">
                  <span className="w-5 h-5 rounded-full bg-[#006D77] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    1
                  </span>
                  <p className="leading-snug">
                    Tap the <strong>Share</strong> button <Share2 className="w-3.5 h-3.5 inline text-[#006D77] -mt-0.5" /> at the bottom of Safari toolbar.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 bg-[#F4FAFB] rounded-xl border border-[#DDE8EA]">
                  <span className="w-5 h-5 rounded-full bg-[#006D77] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    2
                  </span>
                  <p className="leading-snug">
                    Scroll down and select <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 bg-[#F4FAFB] rounded-xl border border-[#DDE8EA]">
                  <span className="w-5 h-5 rounded-full bg-[#006D77] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                    3
                  </span>
                  <p className="leading-snug">
                    Tap <strong>Add</strong> in the top-right corner. The app will launch like a native mobile app!
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-2.5 rounded-xl bg-[#006D77] hover:bg-[#00565E] text-white text-xs font-bold transition cursor-pointer"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  const [showFallbackGuide, setShowFallbackGuide] = useState(false);

  // Generic fallback install prompt on supported browsers
  return (
    <>
      <button
        type="button"
        onClick={() => setShowFallbackGuide(true)}
        className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#E6F7FD] hover:bg-[#d6f0fb] text-[#006D77] border border-[#70D0F5]/50 text-xs font-bold transition cursor-pointer ${className}`}
        title="Install App"
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>Install App</span>
      </button>

      {showFallbackGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-[#DDE8EA] space-y-4 text-[#202729]">
            <div className="flex items-center justify-between border-b border-[#DDE8EA] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#006D77] text-white flex items-center justify-center font-black text-xs">
                  WW
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#006D77]">Install App</h3>
                  <p className="text-[10px] text-[#5A696D]">Add WIN WHITE LAUNDRY to your Home Screen</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFallbackGuide(false)}
                className="p-1 text-[#5A696D] hover:text-[#202729] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-[#202729] leading-relaxed p-3 bg-[#F4FAFB] rounded-xl border border-[#DDE8EA]">
              To install WIN WHITE LAUNDRY, open your browser menu (⋮ in Chrome/Edge, or Share in Safari) and select <strong>"Add to Home Screen"</strong> or <strong>"Install App"</strong>.
            </div>

            <button
              type="button"
              onClick={() => setShowFallbackGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#006D77] hover:bg-[#00565E] text-white text-xs font-bold transition cursor-pointer"
            >
              Got It
            </button>
          </div>
        </div>
      )}
    </>
  );
};
