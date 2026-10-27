import React, { useState } from 'react';
import { NavTabId } from './Sidebar';
import {
  Receipt,
  LayoutDashboard,
  Clock,
  Users,
  Grid,
  X,
  Shirt,
  BarChart3,
  CalendarCheck,
  AlertCircle,
  DollarSign,
  Briefcase,
  Settings,
  LogOut,
  ChevronRight,
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: NavTabId;
  onTabChange: (tabId: NavTabId) => void;
  pendingCount?: number;
  onLogout: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  pendingCount = 0,
  onLogout,
}) => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // The 4 direct bottom tabs
  const PRIMARY_TABS: Array<{
    id: NavTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { id: 'billing', label: 'Billing', icon: Receipt },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'order-tracking', label: 'Tracking', icon: Clock },
    { id: 'customers', label: 'Clients', icon: Users },
  ];

  // The items placed in the "More" section
  const MORE_ITEMS: Array<{
    id: NavTabId;
    label: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    {
      id: 'monthly-customers',
      label: 'Monthly Accounts',
      subtitle: 'Cycle billing, statements & WhatsApp',
      icon: CalendarCheck,
    },
    {
      id: 'reports',
      label: 'Sales & Profit Reports',
      subtitle: 'Daily gross, expenses, cash vs card',
      icon: BarChart3,
    },
    {
      id: 'pending-payments',
      label: 'Pending Balances',
      subtitle: 'Customer receivables & collections',
      icon: AlertCircle,
      badge: pendingCount,
    },
    {
      id: 'inventory',
      label: 'Inventory & Dress Types',
      subtitle: 'AED rates & service price catalog',
      icon: Shirt,
    },
    {
      id: 'expenses',
      label: 'Expenses Ledger',
      subtitle: 'Shop rent, DEWA, chemicals, fuel',
      icon: DollarSign,
    },
    {
      id: 'staff-portal-mgmt',
      label: 'Staff Portal Management',
      subtitle: 'Floor workstation settings & roster',
      icon: Briefcase,
    },
    {
      id: 'settings',
      label: 'Business & Logo Settings',
      subtitle: 'TRN VAT, shop logo, invoice prefix',
      icon: Settings,
    },
  ];

  const isMoreTabActive = MORE_ITEMS.some((item) => item.id === activeTab);

  const handleSelectTab = (tabId: NavTabId) => {
    onTabChange(tabId);
    setIsMoreOpen(false);
  };

  return (
    <>
      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#DDE8EA] shadow-lg mobile-bottom-nav"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 6px)' }}
      >
        <div className="grid grid-cols-5 h-14 sm:h-16 max-w-[430px] sm:max-w-none sm:w-full mx-auto w-full px-1 sm:px-6">
          {PRIMARY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-0.5 relative transition active:scale-95 cursor-pointer touch-target ${
                  isActive ? 'text-[#006D77] font-bold' : 'text-[#5A696D] hover:text-[#202729]'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 w-8 h-1 bg-[#006D77] rounded-b-full shadow-xs" />
                )}
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-[#006D77]' : ''}`} />
                <span className="text-[10px] tracking-tight leading-none mt-0.5">{tab.label}</span>
              </button>
            );
          })}

          {/* 5th Tab: "More" */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 relative transition active:scale-95 cursor-pointer touch-target ${
              isMoreTabActive || isMoreOpen ? 'text-[#006D77] font-bold' : 'text-[#5A696D] hover:text-[#202729]'
            }`}
          >
            {(isMoreTabActive || isMoreOpen) && (
              <span className="absolute top-0 w-8 h-1 bg-[#006D77] rounded-b-full shadow-xs" />
            )}
            <div className="relative">
              <Grid className={`w-5 h-5 transition-transform ${isMoreTabActive ? 'scale-110 text-[#006D77]' : ''}`} />
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-[#E05252] text-white text-[9px] font-bold flex items-center justify-center">
                  {pendingCount > 9 ? '9+' : pendingCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight leading-none mt-0.5">More</span>
          </button>
        </div>
      </nav>

      {/* "More" Bottom Sheet Drawer */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end">
          {/* Backdrop click to close */}
          <div className="flex-1" onClick={() => setIsMoreOpen(false)} />

          {/* Sheet Container: mobile max-w-[430px], tablet max-w-2xl / max-w-3xl */}
          <div
            className="bg-white rounded-t-3xl border-t border-[#DDE8EA] shadow-2xl max-h-[85vh] max-w-[430px] sm:max-w-2xl md:max-w-3xl w-full mx-auto flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}
          >
            {/* Grab Handle */}
            <div className="w-12 h-1 bg-[#DDE8EA] rounded-full mx-auto mt-2.5 mb-1" />

            {/* Header */}
            <div className="px-5 py-3 border-b border-[#DDE8EA] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#006D77]">More Management Views</h3>
                <p className="text-[11px] text-[#5A696D]">Financials, catalogs, floor management & settings</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-1.5 rounded-full bg-[#F4FAFB] text-[#5A696D] hover:text-[#202729] hover:bg-[#DDE8EA] transition"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable list of items: 1-col on mobile, 2-col on tablet */}
            <div className="overflow-y-auto divide-y divide-[#DDE8EA]/60 md:divide-y-0 md:grid md:grid-cols-2 md:gap-2 p-2 md:p-4">
              {MORE_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl transition text-left cursor-pointer ${
                      isActive ? 'bg-[#E6F7FD] text-[#006D77]' : 'hover:bg-[#F4FAFB] text-[#202729]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                          isActive ? 'bg-[#006D77] text-white' : 'bg-[#E6F7FD] text-[#006D77]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs">{item.label}</div>
                        <div className="text-[11px] text-[#5A696D]">{item.subtitle}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-[#FDF0E2] text-[#B85D00] text-[10px] font-bold">
                          {item.badge} pending
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-[#8C9BA0]" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Logout Action Inside Sheet */}
            <div className="p-3 border-t border-[#DDE8EA] bg-[#F4FAFB]">
              <button
                type="button"
                onClick={() => {
                  setIsMoreOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FDF0F0] text-[#A32727] font-bold text-xs hover:bg-[#fae2e2] transition active:scale-98 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out Admin Session</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
