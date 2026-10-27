import React from 'react';
import { useOnlineStatus } from '../../utils/usePWAInstall';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E05252] text-white text-xs font-semibold shadow-lg animate-bounce"
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode — Changes stay saved locally</span>
    </div>
  );
};
