/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { UserAccount, BusinessSettings, Invoice, PortalSession } from './types';
import { storage } from './services/storage';
import { NavTabId, NAV_ITEMS } from './components/common/Sidebar';
import { Header } from './components/common/Header';

// The 10 Admin Views in exact order
import { BillingView } from './components/billing/BillingView';
import { DressTypesView } from './components/inventory/DressTypesView';
import { DashboardView } from './components/dashboard/DashboardView';
import { SalesReportsView } from './components/reports/SalesReportsView';
import { CustomersView } from './components/customers/CustomersView';
import { MonthlyCustomersView } from './components/monthly/MonthlyCustomersView';
import { OrderTrackingView } from './components/tracking/OrderTrackingView';
import { PendingPaymentsView } from './components/payments/PendingPaymentsView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { StaffManagementView } from './components/staff/StaffManagementView';
import { SettingsView } from './components/settings/SettingsView';

// Dedicated Single Shared Staff Floor Workstation
import { StaffPortalView } from './components/staff/StaffPortalView';

// PIN Entry Screen
import { PinEntryScreen } from './components/auth/PinEntryScreen';
import { parseRequestedPortal, evaluateRouteGuard } from './utils/routes';
import { ShieldAlert } from 'lucide-react';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { OfflineIndicator } from './components/common/OfflineIndicator';

export default function App() {
  // Session State - validated from sessionStorage
  const [session, setSession] = useState<PortalSession | null>(() => storage.getSession());

  // Navigation State - Default to 'billing' as required
  const [activeTab, setActiveTab] = useState<NavTabId>('billing');

  // Portal Mode: 'admin' or 'staff-portal'
  const [portalMode, setPortalMode] = useState<'admin' | 'staff-portal'>('admin');

  // Business settings & User Account
  const [settings, setSettings] = useState<BusinessSettings>(() => storage.getSettings());
  const [currentUser, setCurrentUser] = useState<UserAccount>(() => storage.getCurrentUser());
  const [invoices, setInvoices] = useState<Invoice[]>(() => storage.getInvoices());
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Sync state from storage
  useEffect(() => {
    const handleStorageChange = () => {
      setSettings(storage.getSettings());
      setCurrentUser(storage.getCurrentUser());
      setInvoices(storage.getInvoices());
      setSession(storage.getSession());
    };
    return storage.subscribe(handleStorageChange);
  }, []);

  // Synchronize and enforce route guard whenever URL or session changes
  const syncRouteWithSession = useCallback(() => {
    const currentSession = storage.getSession();
    const requested = parseRequestedPortal(
      window.location.hash,
      window.location.pathname,
      window.location.search
    );

    const guard = evaluateRouteGuard(currentSession, requested);

    if (guard.targetPortal === 'pin') {
      if (window.location.hash) {
        try {
          window.history.replaceState(null, '', window.location.pathname);
        } catch {
          // ignore in restricted iframe
        }
      }
      setSession(null);
    } else if (guard.targetPortal === 'staff') {
      setPortalMode('staff-portal');
      if (window.location.hash !== '#staff') {
        try {
          window.location.hash = '#staff';
        } catch {
          // ignore
        }
      }
    } else if (guard.targetPortal === 'admin') {
      setPortalMode('admin');

      const cleanHash = window.location.hash.toLowerCase().replace(/^#\/?/, '');
      const validTab = NAV_ITEMS.find((it) => it.id === cleanHash);
      if (validTab) {
        setActiveTab(validTab.id);
      }
    }
  }, []);

  // Listen to browser navigation (hashchange, popstate)
  useEffect(() => {
    syncRouteWithSession();

    const handleLocationChange = () => {
      syncRouteWithSession();
    };

    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);

    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [syncRouteWithSession]);

  // Handle successful PIN authentication
  const handleAuthenticated = (newSession: PortalSession) => {
    storage.setSession(newSession);
    setSession(newSession);
    setCurrentUser(storage.getCurrentUser());

    if (newSession.role === 'admin') {
      setPortalMode('admin');
      setActiveTab('billing'); // Default to billing as required
      try {
        window.location.hash = '#billing';
      } catch {
        // ignore
      }
    } else {
      setPortalMode('staff-portal');
      try {
        window.location.hash = '#staff';
      } catch {
        // ignore
      }
    }
  };

  // Handle logout: clear active session, wipe credentials, return to PIN screen
  const handleLogout = () => {
    storage.logout();
    setSession(null);
    setCurrentUser(storage.getCurrentUser());
    setPortalMode('admin');
    setActiveTab('billing');
    try {
      window.history.replaceState(null, '', window.location.pathname);
      window.location.hash = '';
    } catch {
      // ignore
    }
  };

  // Handle changing admin tabs
  const handleTabChange = (tabId: NavTabId) => {
    setActiveTab(tabId);
    try {
      window.location.hash = `#${tabId}`;
    } catch {
      // ignore
    }
  };

  // Pending payments count
  const pendingCount = invoices.filter((i) => i.remainingBalance > 0).length;

  // --- SCREEN 1: No Active Session -> Display PIN Entry Screen ---
  if (!session || !storage.validateSession(session)) {
    return (
      <div className="min-h-screen bg-[#F4FAFB] sm:bg-[#E5EFF1] flex flex-col justify-center items-center p-0 sm:p-3 md:p-4 lg:p-6 font-sans antialiased">
        <div className="w-full max-w-[430px] sm:max-w-none sm:w-full min-h-screen sm:min-h-[calc(100vh-2rem)] sm:rounded-2xl md:rounded-3xl bg-[#F4FAFB] sm:shadow-xl overflow-hidden flex flex-col relative transition-all">
          <OfflineIndicator />
          <PinEntryScreen
            settings={settings}
            onAuthenticated={handleAuthenticated}
          />
        </div>
      </div>
    );
  }

  // --- ROLE CHECK: Staff attempting to access admin pages directly ---
  const isStaffUser = session.role === 'staff';
  const isAdminUser = session.role === 'admin';

  if (isStaffUser && portalMode === 'admin') {
    return (
      <div className="min-h-screen bg-[#F4FAFB] sm:bg-[#E5EFF1] flex flex-col items-center justify-center p-0 sm:p-4 font-sans">
        <div className="w-full max-w-[430px] sm:max-w-md bg-white rounded-3xl border border-[#F8C3C3] p-6 shadow-sm text-center space-y-4 m-auto">
          <OfflineIndicator />
          <div className="w-14 h-14 mx-auto rounded-full bg-[#FDF0F0] text-[#A32727] flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-[#202729]">Access Restricted</h2>
          <p className="text-xs text-[#5A696D] leading-relaxed">
            Staff credentials only permit access to the <strong>Floor Order Tracking Workstation</strong>. Administrative functions require Admin authorization.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setPortalMode('staff-portal');
                window.location.hash = '#staff';
              }}
              className="w-full py-3 bg-[#006D77] hover:bg-[#00565E] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer touch-target"
            >
              Return to Staff Workstation
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2.5 bg-[#F4FAFB] hover:bg-[#DDE8EA] text-[#202729] text-xs font-bold rounded-xl transition cursor-pointer touch-target border border-[#DDE8EA]"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- SCREEN 2: Single Shared Staff Portal Workstation ---
  if (portalMode === 'staff-portal') {
    return (
      <div className="min-h-screen bg-[#F4FAFB] sm:bg-[#E5EFF1] flex flex-col items-center p-0 sm:p-3 md:p-4 lg:p-6 font-sans antialiased text-[#202729]">
        <div className="w-full max-w-[430px] sm:max-w-none sm:w-full min-h-screen sm:min-h-[calc(100vh-2rem)] sm:rounded-2xl md:rounded-3xl bg-[#F4FAFB] sm:shadow-xl overflow-hidden flex flex-col transition-all">
          <OfflineIndicator />
          <main className="flex-1 p-3.5 sm:p-5 md:p-6">
            <StaffPortalView
              currentUser={currentUser}
              settings={settings}
              isInspectionFromAdmin={isAdminUser}
              onSwitchToAdmin={() => {
                if (isAdminUser) {
                  setPortalMode('admin');
                  window.location.hash = `#${activeTab}`;
                } else {
                  handleLogout();
                }
              }}
              onLogout={handleLogout}
            />
          </main>
        </div>
      </div>
    );
  }

  // --- SCREEN 3: Full Admin Portal (Mobile Phone & Responsive Tablet Interface) ---
  return (
    <div className="min-h-screen bg-[#F4FAFB] sm:bg-[#E5EFF1] flex flex-col items-center p-0 sm:p-3 md:p-4 lg:p-6 font-sans antialiased text-[#202729] selection:bg-[#70D0F5] selection:text-[#004D54]">
      <div className="w-full max-w-[430px] sm:max-w-none sm:w-full min-h-screen sm:min-h-[calc(100vh-2rem)] sm:rounded-2xl md:rounded-3xl bg-[#F4FAFB] sm:shadow-xl overflow-hidden flex flex-col relative transition-all">
        <OfflineIndicator />

        {/* Compact Mobile / Tablet Header */}
        <Header
          currentUser={currentUser}
          settings={settings}
          activeRole={currentUser.role}
          onLogout={handleLogout}
        />

        {/* Active View, with pb-24 sm:pb-28 so fixed bottom navigation never obscures content */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 pb-24 sm:pb-28 overflow-y-auto">
          {activeTab === 'billing' && (
            <BillingView
              currentUser={currentUser}
              settings={settings}
              initialInvoice={editingInvoice}
              onCancelEdit={() => setEditingInvoice(null)}
              onInvoiceCreated={() => {
                setEditingInvoice(null);
              }}
            />
          )}

          {activeTab === 'inventory' && <DressTypesView />}

          {activeTab === 'dashboard' && (
            <DashboardView
              settings={settings}
              onNavigateTo={(tabId) => handleTabChange(tabId as NavTabId)}
            />
          )}

          {activeTab === 'reports' && <SalesReportsView />}

          {activeTab === 'customers' && <CustomersView settings={settings} />}
          {activeTab === 'monthly-customers' && (
            <MonthlyCustomersView settings={settings} currentUser={currentUser} />
          )}

          {activeTab === 'order-tracking' && (
            <OrderTrackingView
              currentUser={currentUser}
              settings={settings}
              onEditInvoice={(inv) => {
                setEditingInvoice(inv);
                handleTabChange('billing');
              }}
            />
          )}

          {activeTab === 'pending-payments' && (
            <PendingPaymentsView currentUser={currentUser} settings={settings} />
          )}

          {activeTab === 'expenses' && <ExpensesView currentUser={currentUser} />}

          {activeTab === 'staff-portal-mgmt' && <StaffManagementView />}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onSettingsUpdated={(newSettings) => setSettings(newSettings)}
              onNavigateTo={(tabId) => handleTabChange(tabId as NavTabId)}
            />
          )}
        </main>

        {/* Fixed Mobile Bottom Navigation */}
        <MobileBottomNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          pendingCount={pendingCount}
          onLogout={handleLogout}
        />
      </div>
    </div>
  );
}
