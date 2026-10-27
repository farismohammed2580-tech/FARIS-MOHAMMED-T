import React from 'react';
import {
  Receipt,
  Shirt,
  LayoutDashboard,
  BarChart3,
  Users,
  CalendarCheck,
  Clock,
  AlertCircle,
  DollarSign,
  Briefcase,
  Settings,
  ExternalLink,
} from 'lucide-react';
import { BusinessSettings } from '../../types';

export type NavTabId =
  | 'billing'
  | 'inventory'
  | 'dashboard'
  | 'reports'
  | 'customers'
  | 'monthly-customers'
  | 'order-tracking'
  | 'pending-payments'
  | 'expenses'
  | 'staff-portal-mgmt'
  | 'settings';

interface SidebarProps {
  activeTab: NavTabId;
  onTabChange: (tabId: NavTabId) => void;
  settings: BusinessSettings;
  pendingCount?: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onLogout: () => void;
}

// Navigation items in specified order
export const NAV_ITEMS: Array<{
  id: NavTabId;
  label: string;
  order: number;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}> = [
  { id: 'billing', label: '1. Billing', order: 1, icon: Receipt },
  { id: 'inventory', label: '2. Inventory / Dress Types', order: 2, icon: Shirt },
  { id: 'dashboard', label: '3. Dashboard', order: 3, icon: LayoutDashboard },
  { id: 'reports', label: '4. Sales & Reports', order: 4, icon: BarChart3 },
  { id: 'customers', label: '5. Customers', order: 5, icon: Users },
  { id: 'monthly-customers', label: '6. Monthly Accounts', order: 6, icon: CalendarCheck },
  { id: 'order-tracking', label: '7. Order Tracking', order: 7, icon: Clock },
  { id: 'pending-payments', label: '8. Pending Payments', order: 8, icon: AlertCircle },
  { id: 'expenses', label: '9. Expenses', order: 9, icon: DollarSign },
  { id: 'staff-portal-mgmt', label: '10. Staff Portal Management', order: 10, icon: Briefcase },
  { id: 'settings', label: '11. Settings', order: 11, icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  settings,
  pendingCount = 0,
  isOpenMobile,
  onCloseMobile,
  onLogout,
}) => {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[#283A31]/30 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container - Primary Teal & Sky Blue Theme */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white text-[#202729] flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        } border-r border-[#DDE8EA] shadow-xs`}
      >
        {/* Logo / Brand Header */}
        <div className="p-4 border-b border-[#DDE8EA] bg-[#F4FAFB] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {settings.logoUrl ? (
              <div className="w-10 h-10 rounded-xl bg-white p-1 border border-[#DDE8EA] flex items-center justify-center shrink-0 shadow-2xs overflow-hidden">
                <img
                  src={settings.logoUrl}
                  alt={settings.businessName}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[#006D77] text-white flex items-center justify-center font-black tracking-tight text-sm shadow-xs shrink-0">
                WW
              </div>
            )}
            <div className="truncate">
              <span className="font-extrabold text-sm text-[#006D77] tracking-wider block font-sans truncate">
                {settings.businessName || 'WIN WHITE'}
              </span>
              <span className="text-[10px] text-[#70D0F5] font-bold uppercase tracking-widest block -mt-0.5 truncate bg-[#006D77] px-1.5 py-0.2 rounded w-fit text-white">
                LAUNDRY • DUBAI
              </span>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] font-bold text-[#5A696D] uppercase tracking-wider">
            Admin Navigation
          </p>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isPending = item.id === 'pending-payments' && pendingCount > 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onTabChange(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-[#E6F7FD] text-[#006D77] font-bold border-l-4 border-[#006D77] shadow-2xs'
                    : 'text-[#202729] hover:bg-[#F4FAFB]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#006D77]' : 'text-[#5A696D]'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {isPending && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#FEF7EA] text-[#99600D] border border-[#F5DEB4]">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Logout & Info */}
        <div className="p-3 border-t border-[#DDE8EA] bg-[#F4FAFB] space-y-2">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-white hover:bg-[#FDF0F0] text-[#5A696D] hover:text-[#A32727] border border-[#DDE8EA] hover:border-[#F8C3C3] text-xs font-semibold transition cursor-pointer"
            title="Sign out of portal session"
          >
            <span>Sign Out Session</span>
            <span>⎋</span>
          </button>

          <div className="px-2 pt-0.5 text-[10px] text-[#5A696D] flex justify-between font-mono">
            <span>AED (Dirham)</span>
            <span>Asia/Dubai GST</span>
          </div>
        </div>
      </aside>
    </>
  );
};
