import React from 'react';
import { UserAccount, BusinessSettings } from '../../types';
import { LogOut } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { WinWhiteLogo } from './WinWhiteLogo';

interface HeaderProps {
  currentUser: UserAccount;
  settings: BusinessSettings;
  onToggleMobileMenu?: () => void;
  activeRole: 'admin' | 'staff';
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  settings,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white border-b border-[#DDE8EA] h-14 sm:h-16 flex items-center justify-between px-3.5 sm:px-6 shadow-2xs">
      {/* Brand & Branch */}
      <div className="flex items-center gap-2.5 min-w-0">
        <WinWhiteLogo logoUrl={settings.logoUrl} size={34} alt={settings.businessName} />
        <div className="truncate">
          <span className="font-extrabold text-xs text-[#006D77] tracking-tight block truncate leading-tight">
            {settings.businessName || 'WIN WHITE LAUNDRY'}
          </span>
          <span className="text-[10px] text-[#5A696D] block truncate">
            {settings.branch || 'Tourist Club, Abu Dhabi'}
          </span>
        </div>
      </div>

      {/* Right: PWA Install, Role Badge & Logout */}
      <div className="flex items-center gap-2 shrink-0">
        <PWAInstallButton />

        {/* User Role Avatar */}
        <div
          className="w-7 h-7 rounded-full bg-[#006D77] text-white flex items-center justify-center font-bold text-xs shadow-2xs"
          title={`${currentUser.name} (${currentUser.role})`}
        >
          {currentUser.name ? currentUser.name.charAt(0) : 'A'}
        </div>

        {/* Logout Button */}
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#FDF0F0] hover:bg-[#fae2e2] border border-[#F8C3C3] text-[#A32727] transition active:scale-95 cursor-pointer touch-target"
          aria-label="Logout"
          title="Sign out of portal"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
