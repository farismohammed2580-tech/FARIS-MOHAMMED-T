/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PortalSession, UserRole } from '../types';

export type PortalRoute = 'pin' | 'admin' | 'staff';

export interface RouteGuardResult {
  allowed: boolean;
  targetPortal: PortalRoute;
  reason?: string;
  normalizedHash?: string;
}

/**
 * Parses current browser location (hash, pathname, search) to identify requested portal.
 */
export function parseRequestedPortal(locationHash: string, locationPath: string = '', locationSearch: string = ''): 'admin' | 'staff' | null {
  const hash = (locationHash || '').toLowerCase().replace(/^#\/?/, '');
  const path = (locationPath || '').toLowerCase();
  const search = (locationSearch || '').toLowerCase();

  // Check if staff floor portal is requested (excluding the admin 'staff-portal-mgmt' tab)
  if (
    hash === 'staff' ||
    hash === 'staff-portal' ||
    hash === 'staff-floor' ||
    path === '/staff' ||
    path.startsWith('/staff/') ||
    search.includes('portal=staff') ||
    search.includes('role=staff')
  ) {
    return 'staff';
  }

  // Check if admin portal is requested
  if (
    hash.startsWith('admin') ||
    hash === 'billing' ||
    hash === 'dashboard' ||
    hash === 'inventory' ||
    hash === 'reports' ||
    hash === 'customers' ||
    hash === 'order-tracking' ||
    hash === 'pending-payments' ||
    hash === 'expenses' ||
    hash === 'staff-portal-mgmt' ||
    hash === 'settings' ||
    path === '/admin' ||
    path.startsWith('/admin/') ||
    search.includes('portal=admin') ||
    search.includes('role=admin')
  ) {
    return 'admin';
  }

  return null;
}

/**
 * Validates whether an authenticated session can access the requested portal.
 * Strictly blocks unauthenticated users and restricts staff to the single shared staff portal.
 */
export function evaluateRouteGuard(
  session: PortalSession | null,
  requestedPortal: 'admin' | 'staff' | null
): RouteGuardResult {
  // RULE 1: Unauthenticated -> Strictly PIN entry screen
  if (!session || !session.token || !session.role) {
    return {
      allowed: false,
      targetPortal: 'pin',
      reason: 'Authentication required. Please enter your 4-digit PIN.',
      normalizedHash: '',
    };
  }

  // RULE 2: Staff User -> Strictly ONE shared Staff Portal
  if (session.role === 'staff') {
    if (requestedPortal === 'admin') {
      return {
        allowed: false,
        targetPortal: 'staff',
        reason: 'Access Denied: Staff accounts cannot access administrative functionality.',
        normalizedHash: '#staff',
      };
    }
    return {
      allowed: true,
      targetPortal: 'staff',
      normalizedHash: '#staff',
    };
  }

  // RULE 3: Admin User -> Can access Admin or inspect Staff
  if (session.role === 'admin') {
    if (requestedPortal === 'staff') {
      return {
        allowed: true,
        targetPortal: 'staff',
        normalizedHash: '#staff',
      };
    }
    return {
      allowed: true,
      targetPortal: 'admin',
      normalizedHash: '#admin',
    };
  }

  // Default fallback to PIN screen
  return {
    allowed: false,
    targetPortal: 'pin',
    reason: 'Invalid session.',
    normalizedHash: '',
  };
}
