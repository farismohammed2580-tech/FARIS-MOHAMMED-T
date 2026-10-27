import React, { useState, useEffect } from 'react';
import { UserAccount, UserRole } from '../../types';
import { storage } from '../../services/storage';
import {
  Plus,
  ShieldCheck,
  CheckCircle2,
  X,
  Briefcase,
  KeyRound,
  UserCheck,
  UserX,
} from 'lucide-react';

interface StaffManagementViewProps {
  onOpenStaffPortal?: () => void;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('staff');
  const [pin, setPin] = useState('4321');
  const [designation, setDesignation] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const load = () => setUsers(storage.getUsers());
    load();
    return storage.subscribe(load);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleOpenAdd = () => {
    setName('');
    setRole('staff');
    setPin('4321');
    setDesignation('Laundry Floor Specialist');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newUser: UserAccount = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      role,
      pin: role === 'staff' ? '4321' : (pin.trim() || '1234'),
      designation: designation.trim() || 'Floor Staff',
      active: true,
    };

    storage.saveUser(newUser);
    setIsModalOpen(false);
    showToast(`Staff account for ${newUser.name} created successfully.`);
  };

  const handleToggleActive = (user: UserAccount) => {
    const updated = { ...user, active: !user.active };
    storage.saveUser(updated);
    showToast(`User ${user.name} is now ${updated.active ? 'Active' : 'Inactive'}.`);
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-white rounded-2xl p-4 border border-[#D4E7EC] shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-base font-bold text-[#202729]">Staff Accounts</h1>
            <p className="text-[11px] text-[#607173] mt-0.5">
              Authorized floor operators & roles
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#006D77] hover:bg-[#00555D] active:scale-95 text-white text-xs font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Staff</span>
          </button>
        </div>

        <div className="p-2.5 bg-[#E6F5F8] border border-[#70D0F5]/40 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#006D77] font-medium text-[11px]">
            <KeyRound className="w-3.5 h-3.5 shrink-0" />
            <span>Shared Floor Access</span>
          </div>
          <span className="font-mono font-bold text-xs bg-white text-[#006D77] px-2 py-0.5 rounded-lg border border-[#70D0F5]/50">
            PIN 4321
          </span>
        </div>
      </div>

      {toast && (
        <div className="p-3 bg-[#E6F5F8] border border-[#70D0F5]/50 text-[#006D77] text-xs rounded-xl flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-[#006D77] shrink-0" />
          <span className="font-medium text-[11px]">{toast}</span>
        </div>
      )}

      {/* Role Explainer Cards: Stacked on Mobile, 2-Column on Tablet */}
      <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-3">
        <div className="bg-white rounded-xl p-3 border border-[#D4E7EC] shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-[#006D77]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider">Admin Role (PIN 1234)</h3>
          </div>
          <p className="text-[11px] text-[#607173] leading-relaxed">
            Full access to Billing, Pricing, Financial reports, Expenses, Customer records, and Admin Settings.
          </p>
        </div>

        <div className="bg-white rounded-xl p-3 border border-[#D4E7EC] shadow-2xs space-y-1">
          <div className="flex items-center gap-1.5 text-[#006D77]">
            <Briefcase className="w-3.5 h-3.5" />
            <h3 className="text-[11px] font-bold uppercase tracking-wider">Shared Staff Role (PIN 4321)</h3>
          </div>
          <p className="text-[11px] text-[#607173] leading-relaxed">
            Floor operations only: order search, garment checklist inspection, updating status to In Progress or Ready for Pickup. No financial or settings access.
          </p>
        </div>
      </div>

      {/* Staff Account Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-[#202729]">Registered Operators</span>
          <span className="text-[11px] font-semibold text-[#607173] bg-[#E6F5F8] px-2 py-0.5 rounded-full">
            {users.length} Total
          </span>
        </div>

        {users.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center border border-[#D4E7EC] text-xs text-[#607173]">
            No staff accounts registered.
          </div>
        ) : (
          <div className="space-y-2.5 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3.5">
            {users.map((u) => (
            <div
              key={u.id}
              className="bg-white rounded-xl p-3.5 border border-[#D4E7EC] shadow-2xs space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold text-[#202729]">{u.name}</h4>
                  <p className="text-[11px] text-[#607173]">{u.designation || 'Floor Operator'}</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    u.role === 'admin'
                      ? 'bg-[#E6F5F8] text-[#006D77] border border-[#70D0F5]/40'
                      : 'bg-[#F4FAFB] text-[#607173] border border-[#D4E7EC]'
                  }`}
                >
                  {u.role}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#F4FAFB] text-xs">
                <div className="flex items-center gap-1.5 text-[11px] text-[#607173]">
                  <span>Access PIN:</span>
                  <span className="font-mono font-bold text-[#202729] bg-[#F4FAFB] px-1.5 py-0.5 rounded border border-[#D4E7EC]">
                    {u.role === 'staff' ? '4321' : '1234'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      u.active
                        ? 'bg-[#E6F5F8] text-[#006D77] border border-[#70D0F5]/40'
                        : 'bg-[#F4FAFB] text-[#8C989A] border border-[#D4E7EC]'
                    }`}
                  >
                    {u.active ? (
                      <>
                        <UserCheck className="w-2.5 h-2.5" />
                        <span>Active</span>
                      </>
                    ) : (
                      <>
                        <UserX className="w-2.5 h-2.5" />
                        <span>Inactive</span>
                      </>
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(u)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-[#006D77] bg-[#E6F5F8] hover:bg-[#d4eff4] rounded-lg transition"
                  >
                    {u.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Add Staff Modal (Mobile-Optimized) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#202729]/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-[430px] p-5 border border-[#D4E7EC] max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#D4E7EC] pb-3 mb-4">
              <h2 className="text-sm font-bold text-[#202729]">Add Staff Operator</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#607173] hover:text-[#202729] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#202729] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Al-Mansoor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729] focus:ring-1 focus:ring-[#006D77]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202729] mb-1">
                  Department / Designation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Laundry Floor Specialist"
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729] focus:ring-1 focus:ring-[#006D77]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#202729] mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-2.5 py-2 text-xs bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                  >
                    <option value="staff">Staff (Floor Only)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#202729] mb-1">Station PIN</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono bg-[#F4FAFB] border border-[#D4E7EC] rounded-xl text-[#202729]"
                    placeholder="4-digit PIN"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[#D4E7EC]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 text-xs font-medium text-[#607173] bg-[#F4FAFB] hover:bg-[#E6F5F8] rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-[#006D77] hover:bg-[#00555D] rounded-xl shadow-xs transition"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

