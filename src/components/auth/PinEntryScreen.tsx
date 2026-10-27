import React, { useState, useEffect, useCallback } from 'react';
import { storage } from '../../services/storage';
import { BusinessSettings, PortalSession } from '../../types';
import {
  Lock,
  CornerDownLeft,
  AlertCircle,
  Loader2,
  Building2,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { PWAInstallButton } from '../common/PWAInstallButton';
import { WinWhiteLogo } from '../common/WinWhiteLogo';

interface PinEntryScreenProps {
  settings: BusinessSettings;
  onAuthenticated: (session: PortalSession) => void;
}

export const PinEntryScreen: React.FC<PinEntryScreenProps> = ({ settings, onAuthenticated }) => {
  const [pin, setPin] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isShake, setIsShake] = useState<boolean>(false);

  // Handle digit entry
  const handleDigit = useCallback(
    (digit: string) => {
      if (isLoading) return;
      setErrorMessage(null);
      setPin((prev) => {
        if (prev.length >= 4) return prev;
        return prev + digit;
      });
    },
    [isLoading]
  );

  // Handle backspace / clear
  const handleBackspace = useCallback(() => {
    if (isLoading) return;
    setErrorMessage(null);
    setPin((prev) => prev.slice(0, -1));
  }, [isLoading]);

  // Handle full clear
  const handleClear = useCallback(() => {
    if (isLoading) return;
    setErrorMessage(null);
    setPin('');
  }, [isLoading]);

  // Handle submit/verification
  const handleSubmit = useCallback(async () => {
    if (isLoading) return;

    if (pin.length !== 4) {
      setErrorMessage('Please enter all 4 digits of your portal PIN.');
      setIsShake(true);
      setTimeout(() => setIsShake(false), 500);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await storage.verifyPin(pin);

      if (result.success && result.role) {
        const session = storage.getSession();
        if (session) {
          onAuthenticated(session);
        }
      } else {
        setErrorMessage(result.error || 'Invalid PIN. Please try again.');
        setPin(''); // Clear PIN after unsuccessful attempt
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);
      }
    } catch {
      setErrorMessage('Verification failed. Please try again.');
      setPin('');
    } finally {
      setIsLoading(false);
    }
  }, [pin, isLoading, onAuthenticated]);

  // Listen to physical keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        handleClear();
      } else if (e.key === 'Enter') {
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDigit, handleBackspace, handleClear, handleSubmit]);

  return (
    <div className="min-h-screen sm:min-h-0 flex-1 w-full bg-[#F4FAFB] flex flex-col justify-between items-center p-3.5 sm:p-6 font-sans select-none">
      {/* Top Mobile / Tablet Bar */}
      <div className="w-full max-w-sm sm:max-w-xl md:max-w-3xl flex justify-between items-center text-xs text-[#5A696D] py-1.5 px-1 sm:px-4">
        <div className="flex items-center gap-1.5 font-semibold text-[#006D77] truncate">
          <Building2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{settings.branch || 'Abu Dhabi, U.A.E.'}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton />
          <span className="font-mono text-[10px] text-[#006D77] bg-[#E6F5F8] px-2 py-0.5 rounded border border-[#BDE7EF] font-bold">
            POS TERMINAL
          </span>
        </div>
      </div>

      {/* Center PIN Terminal Card */}
      <div className="w-full max-w-xs sm:max-w-md md:max-w-lg bg-white rounded-3xl border border-[#DDE8EA] shadow-sm sm:shadow-md p-5 sm:p-8 flex flex-col items-center my-auto">
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="mb-2">
            <WinWhiteLogo logoUrl={settings.logoUrl} size={68} alt={settings.businessName} />
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#006D77] font-sans">
            {settings.businessName || 'WIN WHITE LAUNDRY'}
          </h1>
          <p className="text-[10px] font-bold tracking-widest text-white bg-[#006D77] px-2.5 py-0.5 rounded-full uppercase mt-1">
            ABU DHABI • LAUNDRY SHOP
          </p>
          <div className="flex items-center gap-1 mt-2 text-[11px] text-[#5A696D] bg-[#F4FAFB] px-3 py-1 rounded-full border border-[#DDE8EA]">
            <Lock className="w-3 h-3 text-[#006D77]" />
            <span>Enter 4-Digit Security PIN</span>
          </div>
        </div>

        {/* 4-Digit Indicator Dots */}
        <div
          className={`flex items-center justify-center gap-3.5 my-2 transition-transform ${
            isShake ? 'animate-bounce text-[#A32727]' : ''
          }`}
          aria-live="polite"
        >
          {[0, 1, 2, 3].map((index) => {
            const hasDigit = pin.length > index;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-all duration-200 border-2 ${
                  hasDigit
                    ? 'bg-[#006D77] border-[#004D54] scale-110 shadow-xs'
                    : 'bg-[#F4FAFB] border-[#DDE8EA]'
                }`}
              />
            );
          })}
        </div>

        {/* Error / Status Feedback Box */}
        <div className="h-8 my-1 flex items-center justify-center w-full">
          {errorMessage ? (
            <div
              className="text-[11px] font-semibold text-[#A32727] bg-[#FDF0F0] border border-[#F8C3C3] px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs"
              role="alert"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#A32727]" />
              <span>{errorMessage}</span>
            </div>
          ) : (
            <span className="text-[10px] text-[#5A696D]">
              {pin.length > 0 ? `${pin.length} of 4 digits entered` : 'Tap keypad below to authenticate'}
            </span>
          )}
        </div>

        {/* On-screen Numeric Keypad with large touch targets */}
        <div className="w-full max-w-xs sm:max-w-sm mx-auto grid grid-cols-3 gap-2 sm:gap-2.5 mt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLoading}
              onClick={() => handleDigit(digit)}
              className="h-12 sm:h-13 bg-white hover:bg-[#F4FAFB] active:bg-[#E6F7FD] active:text-[#006D77] active:scale-95 border border-[#DDE8EA] text-[#202729] text-xl font-bold font-mono rounded-2xl transition shadow-2xs flex items-center justify-center disabled:opacity-50 select-none cursor-pointer touch-target"
              aria-label={`Digit ${digit}`}
            >
              {digit}
            </button>
          ))}

          {/* Row 4: Clear Button, 0, Enter Button */}
          <button
            type="button"
            disabled={isLoading || pin.length === 0}
            onClick={handleClear}
            className="h-12 sm:h-13 bg-white hover:bg-[#FDF0F0] active:scale-95 border border-[#DDE8EA] hover:border-[#F8C3C3] text-[#5A696D] hover:text-[#A32727] text-xs font-bold rounded-2xl transition shadow-2xs flex flex-col items-center justify-center disabled:opacity-40 select-none cursor-pointer touch-target"
            aria-label="Clear PIN"
          >
            <RotateCcw className="w-3.5 h-3.5 mb-0.5" />
            <span className="text-[9px] uppercase tracking-wider">Clear</span>
          </button>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => handleDigit('0')}
            className="h-12 sm:h-13 bg-white hover:bg-[#F4FAFB] active:bg-[#E6F7FD] active:text-[#006D77] active:scale-95 border border-[#DDE8EA] text-[#202729] text-xl font-bold font-mono rounded-2xl transition shadow-2xs flex items-center justify-center disabled:opacity-50 select-none cursor-pointer touch-target"
            aria-label="Digit 0"
          >
            0
          </button>

          <button
            type="button"
            disabled={isLoading || pin.length !== 4}
            onClick={handleSubmit}
            className="h-12 sm:h-13 bg-[#006D77] hover:bg-[#00565E] active:scale-95 border border-[#004D54] text-white font-bold rounded-2xl transition shadow-xs flex flex-col items-center justify-center disabled:opacity-40 disabled:bg-[#EDF3F4] disabled:text-[#5A696D] disabled:border-[#DDE8EA] disabled:cursor-not-allowed select-none cursor-pointer touch-target"
            aria-label="Enter PIN"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CornerDownLeft className="w-4 h-4 mb-0.5" />
                <span className="text-[9px] uppercase tracking-wider">Enter</span>
              </>
            )}
          </button>
        </div>

        {/* Prototype Credentials Quick Reference */}
        <div className="w-full max-w-xs sm:max-w-sm mx-auto mt-4 pt-3 border-t border-[#DDE8EA] text-center">
          <div className="p-2 rounded-2xl bg-[#F4FAFB] border border-[#DDE8EA] text-[10px] text-[#202729] space-y-1">
            <p className="font-bold text-[#006D77] flex items-center justify-center gap-1">
              <KeyRound className="w-3 h-3 text-[#70D0F5]" />
              <span>Quick Access Keys:</span>
            </p>
            <div className="flex justify-center gap-2 text-xs font-mono font-bold mt-0.5">
              <button
                type="button"
                onClick={() => setPin('1234')}
                className="bg-white px-2.5 py-1 rounded-xl border border-[#DDE8EA] text-[#006D77] cursor-pointer hover:bg-[#E6F7FD] active:scale-95 transition shadow-2xs"
                title="Click to fill Admin PIN 1234"
              >
                Admin: 1234
              </button>
              <button
                type="button"
                onClick={() => setPin('4321')}
                className="bg-white px-2.5 py-1 rounded-xl border border-[#DDE8EA] text-[#006D77] cursor-pointer hover:bg-[#E6F7FD] active:scale-95 transition shadow-2xs"
                title="Click to fill Staff PIN 4321"
              >
                Staff: 4321
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="text-center text-[#5A696D] text-[10px] py-1">
        <p>WIN WHITE LAUNDRY • Abu Dhabi, U.A.E.</p>
      </footer>
    </div>
  );
};
