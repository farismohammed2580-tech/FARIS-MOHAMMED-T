import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRequestedPortal, evaluateRouteGuard } from './routes';
import { PortalSession } from '../types';

/**
 * Pure PIN verification function for unit testing and validation logic
 */
export function verifyPortalPin(
  pin: string,
  configuredAdminPin: string = '1234',
  configuredStaffPin: string = '4321'
): { success: boolean; role?: 'admin' | 'staff'; error?: string } {
  const cleanPin = (pin || '').trim();

  if (!cleanPin || cleanPin.length !== 4 || !/^\d{4}$/.test(cleanPin)) {
    return { success: false, error: 'Please enter a 4-digit PIN.' };
  }

  if (cleanPin === configuredAdminPin.trim()) {
    return { success: true, role: 'admin' };
  }

  if (cleanPin === configuredStaffPin.trim()) {
    return { success: true, role: 'staff' };
  }

  return { success: false, error: 'Invalid PIN. Please try again.' };
}

/**
 * Pure Role-Based Access Control gate checker
 */
export function canAccessResource(
  role: 'admin' | 'staff' | undefined,
  resource: 'billing' | 'customers' | 'dashboard' | 'reports' | 'expenses' | 'settings' | 'staff-portal-mgmt' | 'order-tracking' | 'status-update'
): boolean {
  if (!role) return false;

  // Admin has access to all resources
  if (role === 'admin') return true;

  // Staff is strictly restricted to order tracking and status updates
  if (role === 'staff') {
    return resource === 'order-tracking' || resource === 'status-update';
  }

  return false;
}

test('PIN 1234 verifies successfully as Admin role', () => {
  const result = verifyPortalPin('1234');
  assert.equal(result.success, true);
  assert.equal(result.role, 'admin');
  assert.equal(result.error, undefined);
});

test('PIN 4321 verifies successfully as Staff role', () => {
  const result = verifyPortalPin('4321');
  assert.equal(result.success, true);
  assert.equal(result.role, 'staff');
  assert.equal(result.error, undefined);
});

test('Incorrect PIN returns "Invalid PIN. Please try again."', () => {
  const result = verifyPortalPin('9999');
  assert.equal(result.success, false);
  assert.equal(result.role, undefined);
  assert.equal(result.error, 'Invalid PIN. Please try again.');
});

test('Incomplete or malformed PINs return validation error', () => {
  assert.equal(verifyPortalPin('12').success, false);
  assert.equal(verifyPortalPin('').success, false);
  assert.equal(verifyPortalPin('abcd').success, false);
});

test('Custom configured PINs in Settings are respected', () => {
  const customAdmin = '7788';
  const customStaff = '9900';
  assert.equal(verifyPortalPin('7788', customAdmin, customStaff).role, 'admin');
  assert.equal(verifyPortalPin('9900', customAdmin, customStaff).role, 'staff');
  assert.equal(verifyPortalPin('1234', customAdmin, customStaff).success, false);
});

test('Role-Based Access Control correctly restricts staff from admin features', () => {
  // Staff cannot access billing, customers, expenses, reports, or settings
  assert.equal(canAccessResource('staff', 'billing'), false);
  assert.equal(canAccessResource('staff', 'customers'), false);
  assert.equal(canAccessResource('staff', 'expenses'), false);
  assert.equal(canAccessResource('staff', 'reports'), false);
  assert.equal(canAccessResource('staff', 'settings'), false);

  // Staff can access order tracking and status updates
  assert.equal(canAccessResource('staff', 'order-tracking'), true);
  assert.equal(canAccessResource('staff', 'status-update'), true);

  // Admin can access everything
  assert.equal(canAccessResource('admin', 'billing'), true);
  assert.equal(canAccessResource('admin', 'expenses'), true);
  assert.equal(canAccessResource('admin', 'settings'), true);
  assert.equal(canAccessResource('admin', 'order-tracking'), true);
});

test('URL Parser correctly identifies requested portals from hash, path, and search', () => {
  assert.equal(parseRequestedPortal('#staff'), 'staff');
  assert.equal(parseRequestedPortal('#/staff'), 'staff');
  assert.equal(parseRequestedPortal('', '/staff'), 'staff');
  assert.equal(parseRequestedPortal('', '', '?portal=staff'), 'staff');

  assert.equal(parseRequestedPortal('#admin'), 'admin');
  assert.equal(parseRequestedPortal('#billing'), 'admin');
  assert.equal(parseRequestedPortal('#reports'), 'admin');
  assert.equal(parseRequestedPortal('', '/admin'), 'admin');
  assert.equal(parseRequestedPortal('', '', '?portal=admin'), 'admin');

  assert.equal(parseRequestedPortal(''), null);
});

test('Unauthenticated user is strictly blocked from staff and admin URLs', () => {
  // If session is null, navigating to #staff or #admin must target 'pin'
  const staffAttempt = evaluateRouteGuard(null, 'staff');
  assert.equal(staffAttempt.allowed, false);
  assert.equal(staffAttempt.targetPortal, 'pin');

  const adminAttempt = evaluateRouteGuard(null, 'admin');
  assert.equal(adminAttempt.allowed, false);
  assert.equal(adminAttempt.targetPortal, 'pin');
});

test('Staff user navigating to admin route is blocked and returned to shared staff portal', () => {
  const staffSession: PortalSession = {
    role: 'staff',
    userId: 'usr-shared-staff',
    userName: 'Floor Operations Staff',
    designation: 'Floor Processing',
    loginTime: new Date().toISOString(),
    token: 'token-staff-123',
  };

  const adminRouteAttempt = evaluateRouteGuard(staffSession, 'admin');
  assert.equal(adminRouteAttempt.allowed, false);
  assert.equal(adminRouteAttempt.targetPortal, 'staff');
  assert.equal(adminRouteAttempt.normalizedHash, '#staff');

  const staffRouteAttempt = evaluateRouteGuard(staffSession, 'staff');
  assert.equal(staffRouteAttempt.allowed, true);
  assert.equal(staffRouteAttempt.targetPortal, 'staff');
});

test('Admin user has access to Admin portal', () => {
  const adminSession: PortalSession = {
    role: 'admin',
    userId: 'usr-1',
    userName: 'Faris Mohammed',
    designation: 'Administrator',
    loginTime: new Date().toISOString(),
    token: 'token-admin-123',
  };

  const adminAttempt = evaluateRouteGuard(adminSession, 'admin');
  assert.equal(adminAttempt.allowed, true);
  assert.equal(adminAttempt.targetPortal, 'admin');
});
