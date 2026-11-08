import React, { useState, useEffect } from 'react';
import { 
  AppUser, 
  UserRole, 
  Language, 
  Member, 
  AppPermission, 
  ROLE_PERMISSIONS, 
  hasPermission 
} from '../types';
import { localDB } from '../services/storage';
import { 
  ShieldCheck, 
  UserCheck, 
  UserPlus, 
  Search, 
  Check, 
  X, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  RotateCcw, 
  Phone, 
  Mail, 
  Lock, 
  Unlock, 
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
  Palette
} from 'lucide-react';

interface Props {
  lang: Language;
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onNavigate?: (tab: string) => void;
  onOpenOrgSettings?: () => void;
}

export const UserManagementView: React.FC<Props> = ({
  lang,
  activeRole,
  onRoleChange,
  onNavigate,
  onOpenOrgSettings
}) => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');

  // Modals state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);

  // Form state for Map/Edit
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [formRole, setFormRole] = useState<UserRole>('committee');
  const [formUsername, setFormUsername] = useState('');
  const [formFullName, setFormFullName] = useState('');
  const [formFullNameTa, setFormFullNameTa] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formStatus, setFormStatus] = useState<'active' | 'suspended'>('active');

  const [notification, setNotification] = useState<string | null>(null);

  const canManageUsers = hasPermission(activeRole, 'manage_users');

  const loadData = async () => {
    const [uList, mList] = await Promise.all([
      localDB.getUsers(),
      localDB.getMembers()
    ]);
    setUsers(uList);
    setMembers(mList);
  };

  useEffect(() => {
    loadData();
    const unsub = localDB.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenMapModal = (memberToMap?: Member) => {
    setEditingUser(null);
    if (memberToMap) {
      setSelectedMemberId(memberToMap.id);
      setFormFullName(memberToMap.name);
      setFormFullNameTa(memberToMap.nameTa);
      setFormPhone(memberToMap.phone);
      setFormRole(memberToMap.role || 'member');
      setFormUsername(memberToMap.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 14));
      setFormEmail('');
      setFormNotes(`Mapped from member ${memberToMap.id} (${memberToMap.villageWard})`);
    } else {
      // Find first unmapped member or default to first member
      const mappedIds = new Set(users.map((u) => u.memberId).filter(Boolean));
      const firstUnmapped = members.find((m) => !mappedIds.has(m.id)) || members[0];
      if (firstUnmapped) {
        setSelectedMemberId(firstUnmapped.id);
        setFormFullName(firstUnmapped.name);
        setFormFullNameTa(firstUnmapped.nameTa);
        setFormPhone(firstUnmapped.phone);
        setFormRole(firstUnmapped.role || 'member');
        setFormUsername(firstUnmapped.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 14));
      } else {
        setSelectedMemberId('');
        setFormFullName('');
        setFormFullNameTa('');
        setFormPhone('');
        setFormRole('member');
        setFormUsername('');
      }
      setFormEmail('');
      setFormNotes('');
    }
    setFormStatus('active');
    setIsMapModalOpen(true);
  };

  const handleOpenEditUser = (user: AppUser) => {
    setEditingUser(user);
    setSelectedMemberId(user.memberId || '');
    setFormFullName(user.fullName);
    setFormFullNameTa(user.fullNameTa);
    setFormPhone(user.phone);
    setFormEmail(user.email || '');
    setFormRole(user.role);
    setFormUsername(user.username);
    setFormNotes(user.notes || '');
    setFormStatus(user.status);
    setIsMapModalOpen(true);
  };

  const handleMemberSelectChange = (mId: string) => {
    setSelectedMemberId(mId);
    const m = members.find((item) => item.id === mId);
    if (m) {
      setFormFullName(m.name);
      setFormFullNameTa(m.nameTa);
      setFormPhone(m.phone);
      setFormRole(m.role || 'member');
      if (!editingUser) {
        setFormUsername(m.name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 14));
        setFormNotes(`Mapped to village member: ${m.name} (${m.villageWard})`);
      }
    }
  };

  const handleSaveUserMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim() || !formUsername.trim()) {
      showToast(lang === 'ta' ? 'பெயர் மற்றும் பயனர் பெயர் தேவை' : 'Name and Username are required');
      return;
    }

    try {
      if (editingUser) {
        // Update existing user
        const updatedUser: AppUser = {
          ...editingUser,
          username: formUsername.trim().toLowerCase(),
          fullName: formFullName.trim(),
          fullNameTa: formFullNameTa.trim() || formFullName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim(),
          role: formRole,
          memberId: selectedMemberId || undefined,
          status: formStatus,
          notes: formNotes.trim()
        };
        await localDB.saveUser(updatedUser, activeRole);
        showToast(lang === 'ta' ? 'பயனாளர் விவரம் வெற்றிகரமாக புதுப்பிக்கப்பட்டது' : 'User account updated successfully');
      } else if (selectedMemberId) {
        // Map member to role
        await localDB.mapMemberToRole({
          memberId: selectedMemberId,
          role: formRole,
          username: formUsername.trim().toLowerCase(),
          phone: formPhone.trim(),
          email: formEmail.trim(),
          notes: formNotes.trim()
        }, activeRole);
        showToast(lang === 'ta' ? 'உறுப்பினருக்கு பொறுப்பு வெற்றிகரமாக ஒதுக்கப்பட்டது' : 'Member successfully mapped to role');
      } else {
        // Independent system user (e.g. external auditor or administrator)
        const newUser: AppUser = {
          id: 'usr_' + Date.now().toString(36),
          username: formUsername.trim().toLowerCase(),
          fullName: formFullName.trim(),
          fullNameTa: formFullNameTa.trim() || formFullName.trim(),
          phone: formPhone.trim(),
          email: formEmail.trim(),
          role: formRole,
          status: formStatus,
          createdAt: new Date().toISOString(),
          notes: formNotes.trim()
        };
        await localDB.saveUser(newUser, activeRole);
        showToast(lang === 'ta' ? 'புதிய கணக்கு வெற்றிகரமாக உருவாக்கப்பட்டது' : 'New user created successfully');
      }

      setIsMapModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Operation failed');
    }
  };

  const handleToggleStatus = async (user: AppUser) => {
    if (user.role === 'admin' && user.id === 'usr_admin') {
      showToast(lang === 'ta' ? 'முதன்மை நிர்வாகியை முடக்க முடியாது' : 'Cannot suspend primary Super Admin');
      return;
    }
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    const updated: AppUser = { ...user, status: newStatus };
    await localDB.saveUser(updated, activeRole);
    showToast(
      lang === 'ta' 
        ? `${user.fullName} அவர்களின் கணக்கு ${newStatus === 'active' ? 'செயலாக்கப்பட்டது' : 'முடக்கப்பட்டது'}`
        : `${user.fullName} marked as ${newStatus}`
    );
  };

  const handleDeleteUser = async (user: AppUser) => {
    if (user.role === 'admin' && user.id === 'usr_admin') {
      showToast(lang === 'ta' ? 'முதன்மை நிர்வாகியை நீக்க முடியாது' : 'Cannot delete root Super Admin');
      return;
    }
    const confirmMsg = lang === 'ta' 
      ? `@${user.username} (${user.fullName}) பயனாளர் கணக்கை நீக்க உறுதிப்படுத்துகிறீர்களா?`
      : `Are you sure you want to delete user account @${user.username} (${user.fullName})?`;
    if (window.confirm(confirmMsg)) {
      await localDB.deleteUser(user.id, activeRole);
      showToast(lang === 'ta' ? 'பயனாளர் கணக்கு நீக்கப்பட்டது' : 'User deleted successfully');
      await loadData();
    }
  };

  const handleSwitchToRole = (role: UserRole, user: AppUser) => {
    onRoleChange(role);
    showToast(
      lang === 'ta' 
        ? `பொறுப்பு '${getRoleBadge(role).labelTa}' என மாற்றப்பட்டது (@${user.username})` 
        : `Simulating role '${getRoleBadge(role).labelEn}' (@${user.username})`
    );
  };

  // Helper metadata for roles
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return {
          labelEn: 'Super Admin',
          labelTa: 'முதன்மை நிர்வாகி',
          bg: 'bg-purple-100 text-purple-900 border-purple-300',
          dot: 'bg-purple-600',
          descEn: 'Full RBAC authority & financial governance',
          descTa: 'முழு நிர்வாக உரிமை மற்றும் நிதி கட்டுப்பாடு'
        };
      case 'president':
        return {
          labelEn: 'President',
          labelTa: 'தலைவர்',
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          dot: 'bg-emerald-600',
          descEn: 'Executive approvals & trust representation',
          descTa: 'நிர்வாக ஒப்புதல்கள் மற்றும் தலைமை'
        };
      case 'treasurer':
        return {
          labelEn: 'Treasurer',
          labelTa: 'பொருளாளர்',
          bg: 'bg-blue-100 text-blue-900 border-blue-300',
          dot: 'bg-blue-600',
          descEn: 'Collections, payouts, remittance & ledger',
          descTa: 'சந்தா வசூல், வரவு-செலவு மற்றும் நிதி பட்டுவாடா'
        };
      case 'secretary':
        return {
          labelEn: 'General Secretary',
          labelTa: 'செயலாளர்',
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          dot: 'bg-amber-600',
          descEn: 'Member registry, user mapping & coordination',
          descTa: 'உறுப்பினர் சேர்க்கை, பொறுப்பு ஒதுக்கீடு'
        };
      case 'committee':
        return {
          labelEn: 'Committee Member',
          labelTa: 'செயற்குழு உறுப்பினர்',
          bg: 'bg-cyan-100 text-cyan-900 border-cyan-300',
          dot: 'bg-cyan-600',
          descEn: 'Welfare review and committee voting',
          descTa: 'நலத்திட்ட உதவி மதிப்பாய்வு மற்றும் வாக்குரிமை'
        };
      case 'auditor':
        return {
          labelEn: 'Honorary Auditor',
          labelTa: 'தணிக்கையாளர்',
          bg: 'bg-teal-100 text-teal-900 border-teal-300',
          dot: 'bg-teal-600',
          descEn: 'Read-only financial statements & ledger audit',
          descTa: 'தணிக்கை அறிக்கை மற்றும் நிதி சரிபார்ப்பு'
        };
      case 'member':
      default:
        return {
          labelEn: 'Contributing Member',
          labelTa: 'பொது உறுப்பினர்',
          bg: 'bg-stone-100 text-stone-800 border-stone-300',
          dot: 'bg-stone-500',
          descEn: 'Self pledge tracking and assistance requests',
          descTa: 'சந்தா விவரம் மற்றும் உதவிக் கோரிக்கை சமர்ப்பித்தல்'
        };
    }
  };

  const allPermissionsList: { id: AppPermission; nameEn: string; nameTa: string; descEn: string; descTa: string }[] = [
    { 
      id: 'manage_users', 
      nameEn: 'User & Role Management', 
      nameTa: 'பயனாளர் & பொறுப்பு நிர்வாகம்', 
      descEn: 'Assign roles to members, map permissions, edit credentials',
      descTa: 'உறுப்பினர்களுக்கு பொறுப்பு ஒதுக்குதல் மற்றும் பயனர் மேலாண்மை'
    },
    { 
      id: 'manage_branding', 
      nameEn: 'Organization Branding', 
      nameTa: 'அமைப்பின் அடையாளம் & லோகோ', 
      descEn: 'Customize community name, village title, and logo',
      descTa: 'அமைப்பின் பெயர், லோகோ மற்றும் தலைப்பு அமைப்புகள்'
    },
    { 
      id: 'record_payments', 
      nameEn: 'Record Collections', 
      nameTa: 'சந்தா வசூல் பதிவு', 
      descEn: 'Collect dues in INR or UAE Dirhams (AED) and issue receipts',
      descTa: 'உறுப்பினர்களிடம் சந்தா பெற்று ரசீது வழங்குதல்'
    },
    { 
      id: 'generate_remittance', 
      nameEn: 'AED Monthly Remittance', 
      nameTa: 'மாதாந்திர திர்காம்-ரூபாய் பரிமாற்றம்', 
      descEn: 'Generate monthly remittance payout converting AED pool to INR',
      descTa: 'வளைகுடா திர்காம் சந்தாவை மாற்று விகிதத்தில் இந்திய ரூபாயாக வரவு வைத்தல்'
    },
    { 
      id: 'create_assistance', 
      nameEn: 'Submit Welfare Request', 
      nameTa: 'நலத்திட்ட உதவி விண்ணப்பம்', 
      descEn: 'Apply for education, health, marriage or emergency relief',
      descTa: 'கல்வி, மருத்துவம், திருமணம் அல்லது நிவாரண உதவி கோரிக்கை'
    },
    { 
      id: 'review_assistance', 
      nameEn: 'Review & Vote Assistance', 
      nameTa: 'உதவிக் கோரிக்கை மதிப்பாய்வு', 
      descEn: 'Approve, request modification, or vote on welfare applications',
      descTa: 'விண்ணப்பங்களை பரிசீலித்து வாக்களித்தல் அல்லது ஒப்புதல் அளித்தல்'
    },
    { 
      id: 'disburse_payouts', 
      nameEn: 'Disburse Fund Payouts', 
      nameTa: 'நிதி பட்டுவாடா செய்தல்', 
      descEn: 'Authorize bank transfer, cash, or exchange house disbursals',
      descTa: 'ஒப்புதல் அளிக்கப்பட்ட நிதியை பயனாளிகளுக்கு வழங்குதல்'
    },
    { 
      id: 'view_ledger', 
      nameEn: 'View General Ledger', 
      nameTa: 'பொது நிதி பேரேடு பார்வை', 
      descEn: 'Inspect double-entry debit/credit ledger and balance',
      descTa: 'வரவு-செலவு பேரேடு மற்றும் நிதி இருப்பு விவரங்களை பார்வையிடல்'
    },
    { 
      id: 'export_audit', 
      nameEn: 'Export Financial Audits', 
      nameTa: 'தணிக்கை அறிக்கை பதிவிறக்கம்', 
      descEn: 'Export tamper-evident audit trails and transaction JSON/CSV',
      descTa: 'நிதி தணிக்கை அறிக்கைகள் மற்றும் பதிவுகளை ஏற்றுமதி செய்தல்'
    },
    { 
      id: 'view_reports', 
      nameEn: 'View Financial Analytics', 
      nameTa: 'நிதி செயல்திறன் அறிக்கைகள்', 
      descEn: 'Inspect collection trends, monthly collections vs disbursements',
      descTa: 'மாதாந்திர நிதி செயல்திறன் அட்டை மற்றும் வரைபடங்கள்'
    }
  ];

  const allRolesList: UserRole[] = [
    'admin',
    'president',
    'treasurer',
    'secretary',
    'committee',
    'auditor',
    'member'
  ];

  // Filtering users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.fullNameTa.includes(search) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase()));

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const activeCount = users.filter((u) => u.status === 'active').length;
  const mappedMembersCount = users.filter((u) => u.memberId).length;
  const executiveCount = users.filter((u) => ['admin', 'president', 'treasurer', 'secretary'].includes(u.role)).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm animate-fade-in border border-stone-700">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* RBAC Permission Banner if current role lacks manage_users */}
      {!canManageUsers && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">
                {lang === 'ta' 
                  ? 'பார்வை முறை: நிர்வாகி பொறுப்பு தேவை' 
                  : 'Read-Only Mode: Administrative Role Required'}
              </p>
              <p className="text-xs text-amber-800">
                {lang === 'ta' 
                  ? `நீங்கள் தற்போது '${getRoleBadge(activeRole).labelTa}' பொறுப்பில் உள்ளீர்கள். உறுப்பினர்-பொறுப்பு மாற்றங்களை செய்ய 'முதன்மை நிர்வாகி' அல்லது 'செயலாளர்' பொறுப்புக்கு மாறவும்.`
                  : `You are logged in as '${getRoleBadge(activeRole).labelEn}'. To assign roles and edit users, switch to 'Super Admin' or 'General Secretary'.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => onRoleChange('admin')}
            className="px-3.5 py-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 shadow-2xs"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{lang === 'ta' ? 'முதன்மை நிர்வாகிக்கு மாறுக' : 'Switch to Super Admin'}</span>
          </button>
        </div>
      )}

      {/* Header and Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-700 text-white shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                {lang === 'ta' ? 'பொறுப்பு & பயனாளர் நிர்வாகம் (RBAC)' : 'User Management & Role-Based Access Control'}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 font-medium">
                {lang === 'ta'
                  ? 'கிராம மற்றும் வளைகுடா உறுப்பினர்களுக்கு நிர்வாக பொறுப்புகளை ஒதுக்குதல் மற்றும் அதிகார மேலாண்மை'
                  : 'Map community members to administrative roles, enforce RBAC policies, and govern village fund permissions'}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          {activeRole === 'admin' && onOpenOrgSettings && (
            <button
              onClick={onOpenOrgSettings}
              className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center gap-2 shadow-2xs transition"
              title={lang === 'ta' ? 'அமைப்பின் லோகோ & தலைப்பு விவரங்களை மாற்றுக (முதன்மை நிர்வாகி மட்டும்)' : 'Customize Logo & Title Information (Super Admin Only)'}
            >
              <Palette className="w-4 h-4 text-emerald-400" />
              <span>{lang === 'ta' ? 'அமைப்பின் அடையாளம்' : 'Organization Branding'}</span>
            </button>
          )}

          <button
            onClick={() => setIsMatrixModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-bold text-xs flex items-center gap-2 shadow-2xs transition"
          >
            <Lock className="w-4 h-4 text-purple-700" />
            <span>{lang === 'ta' ? 'அதிகார வரைபடம் (Matrix)' : 'RBAC Matrix'}</span>
          </button>

          {canManageUsers && (
            <button
              onClick={() => handleOpenMapModal()}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>{lang === 'ta' ? 'உறுப்பினருக்கு பொறுப்பு ஒதுக்குக' : 'Map Member to Role'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>{lang === 'ta' ? 'மொத்த பயனாளர்கள்' : 'Total System Users'}</span>
            <UserCheck className="w-4 h-4 text-stone-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-stone-900">{users.length}</span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {activeCount} {lang === 'ta' ? 'செயலில்' : 'Active'}
            </span>
          </div>
        </div>

        {/* Mapped Members */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>{lang === 'ta' ? 'பொறுப்புள்ள உறுப்பினர்கள்' : 'Mapped Members'}</span>
            <span className="text-xs font-bold text-purple-700">
              {Math.round((mappedMembersCount / (members.length || 1)) * 100)}%
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-stone-900">{mappedMembersCount}</span>
            <span className="text-xs text-stone-500">
              / {members.length} {lang === 'ta' ? 'உறுப்பினர்கள்' : 'Total'}
            </span>
          </div>
        </div>

        {/* Executive Officers */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
            <span>{lang === 'ta' ? 'நிர்வாகப் பொறுப்பாளர்கள்' : 'Executive Officers'}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-900">{executiveCount}</span>
            <span className="text-[11px] text-stone-500">
              Admin, Pres, Treas, Sec
            </span>
          </div>
        </div>

        {/* Current Session RBAC Role */}
        <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white p-4 rounded-2xl shadow-sm border border-stone-800">
          <div className="flex items-center justify-between text-xs text-stone-300 font-medium">
            <span>{lang === 'ta' ? 'நடப்பு சிமுலேஷன் பொறுப்பு' : 'Active RBAC Role'}</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="mt-1">
            <div className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5">
              <span>{lang === 'ta' ? getRoleBadge(activeRole).labelTa : getRoleBadge(activeRole).labelEn}</span>
            </div>
            <p className="text-[10px] text-stone-300 mt-0.5 truncate">
              {ROLE_PERMISSIONS[activeRole]?.length || 0} {lang === 'ta' ? 'அதிகாரங்கள் அனுமதிக்கப்பட்டது' : 'authorized permissions'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'ta' ? 'பெயர், பயனர் பெயர், தொலைபேசி அல்லது மின்னஞ்சல் மூலம் தேடுக...' : 'Search by name, username, phone or email...'}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs sm:text-sm focus:outline-none focus:border-purple-600 focus:bg-white transition"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 self-start md:self-auto">
            <span className="text-xs text-stone-500 font-medium">
              {lang === 'ta' ? 'நிலை:' : 'Status:'}
            </span>
            <div className="flex bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs">
              {(['all', 'active', 'suspended'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md font-semibold capitalize transition ${
                    statusFilter === st ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {st === 'all' ? (lang === 'ta' ? 'அனைத்தும்' : 'All') : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Role Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-stone-500 font-medium shrink-0">
            {lang === 'ta' ? 'பொறுப்பு வகை:' : 'Role:'}
          </span>
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1 rounded-lg font-bold shrink-0 transition ${
              roleFilter === 'all'
                ? 'bg-purple-700 text-white shadow-2xs'
                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
            }`}
          >
            {lang === 'ta' ? 'அனைத்து பொறுப்புகளும்' : 'All Roles'} ({users.length})
          </button>
          {allRolesList.map((r) => {
            const count = users.filter((u) => u.role === r).length;
            const badge = getRoleBadge(r);
            return (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded-lg font-bold shrink-0 transition flex items-center gap-1.5 ${
                  roleFilter === r
                    ? 'bg-purple-700 text-white shadow-2xs'
                    : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                }`}
              >
                <span>{lang === 'ta' ? badge.labelTa : badge.labelEn}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${roleFilter === r ? 'bg-purple-900 text-white' : 'bg-stone-200 text-stone-800'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Users Table / Grid */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-stone-500 space-y-3">
            <UserCheck className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="font-semibold text-sm">
              {lang === 'ta' ? 'பொருந்தும் பயனாளர்கள் எவரும் இல்லை' : 'No users match your criteria'}
            </p>
            {canManageUsers && (
              <button
                onClick={() => handleOpenMapModal()}
                className="px-4 py-2 rounded-xl bg-purple-700 text-white text-xs font-bold hover:bg-purple-800 transition shadow-2xs"
              >
                {lang === 'ta' ? 'உறுப்பினரை இணைக்கவும்' : 'Map Member Now'}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 sm:px-6">{lang === 'ta' ? 'பயனாளர் & பெயர்' : 'User & Identity'}</th>
                  <th className="py-3 px-4">{lang === 'ta' ? 'அதிகாரப் பொறுப்பு (RBAC)' : 'Assigned Role'}</th>
                  <th className="py-3 px-4">{lang === 'ta' ? 'இணைக்கப்பட்ட உறுப்பினர்' : 'Mapped Member'}</th>
                  <th className="py-3 px-4">{lang === 'ta' ? 'தொடர்பு விவரம்' : 'Contact'}</th>
                  <th className="py-3 px-4">{lang === 'ta' ? 'நிலை' : 'Status'}</th>
                  <th className="py-3 px-4 sm:px-6 text-right">{lang === 'ta' ? 'செயல்கள்' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {filteredUsers.map((user) => {
                  const roleBadge = getRoleBadge(user.role);
                  const mappedMember = members.find((m) => m.id === user.memberId);
                  const isCurrentActive = activeRole === user.role;
                  const permCount = ROLE_PERMISSIONS[user.role]?.length || 0;

                  return (
                    <tr key={user.id} className="hover:bg-stone-50/80 transition group">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs ${
                            user.role === 'admin' ? 'bg-purple-700' :
                            user.role === 'president' ? 'bg-emerald-700' :
                            user.role === 'treasurer' ? 'bg-blue-700' :
                            user.role === 'secretary' ? 'bg-amber-600' :
                            user.role === 'auditor' ? 'bg-teal-700' :
                            'bg-stone-600'
                          }`}>
                            {user.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-extrabold text-stone-900 flex items-center gap-1.5">
                              <span>{lang === 'ta' ? user.fullNameTa : user.fullName}</span>
                              {user.role === 'admin' && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                  Super
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-stone-500 font-mono flex items-center gap-1">
                              <span>@{user.username}</span>
                              {user.notes && (
                                <span className="text-stone-400 font-sans hidden sm:inline" title={user.notes}>
                                  • {user.notes.slice(0, 30)}...
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Role */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${roleBadge.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${roleBadge.dot}`} />
                            <span>{lang === 'ta' ? roleBadge.labelTa : roleBadge.labelEn}</span>
                          </span>
                          <div className="text-[10px] text-stone-500 font-medium">
                            {permCount}/10 {lang === 'ta' ? 'அதிகாரங்கள்' : 'permissions'}
                          </div>
                        </div>
                      </td>

                      {/* Mapped Member */}
                      <td className="py-3.5 px-4">
                        {mappedMember ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-stone-800 flex items-center gap-1">
                              <span>{mappedMember.name}</span>
                              <span className="text-[10px] font-mono text-stone-400">({mappedMember.id})</span>
                            </div>
                            <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                              <span>{mappedMember.villageWard}</span>
                              <span className="font-semibold text-emerald-700">
                                • {mappedMember.currency === 'AED' ? `${mappedMember.monthlyPledge} AED` : `₹${mappedMember.monthlyPledge}`}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-stone-400 italic">
                            {lang === 'ta' ? 'இணைக்கப்படவில்லை (நேரடி கணக்கு)' : 'Direct Admin User (Unlinked)'}
                          </span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-xs text-stone-600">
                        <div className="space-y-0.5">
                          {user.phone && (
                            <div className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-stone-400" />
                              <span>{user.phone}</span>
                            </div>
                          )}
                          {user.email && (
                            <div className="flex items-center gap-1 text-[11px] text-stone-500 truncate max-w-[140px]">
                              <Mail className="w-3 h-3 text-stone-400" />
                              <span>{user.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold ${
                          user.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-red-50 text-red-800 border border-red-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'active' ? 'bg-emerald-600' : 'bg-red-600'}`} />
                          <span className="capitalize">{user.status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 sm:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Test / Simulate this Role */}
                          <button
                            onClick={() => handleSwitchToRole(user.role, user)}
                            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                              isCurrentActive
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                            title={lang === 'ta' ? 'இந்த பொறுப்பின் காட்சியை சோதிக்கவும்' : 'Simulate this role session'}
                          >
                            <UserCheck className="w-3.5 h-3.5 text-stone-600" />
                            <span className="hidden sm:inline">
                              {isCurrentActive ? (lang === 'ta' ? 'நடப்பு' : 'Active') : (lang === 'ta' ? 'சோதிக்க' : 'Test')}
                            </span>
                          </button>

                          {canManageUsers && (
                            <>
                              {/* Edit User Button */}
                              <button
                                onClick={() => handleOpenEditUser(user)}
                                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition"
                                title={lang === 'ta' ? 'பொறுப்பு & விவரம் மாற்றுக' : 'Edit role mapping'}
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              {/* Toggle Status Button */}
                              {user.id !== 'usr_admin' && (
                                <button
                                  onClick={() => handleToggleStatus(user)}
                                  className={`p-1.5 rounded-lg transition ${
                                    user.status === 'active' 
                                      ? 'text-stone-400 hover:text-amber-700 hover:bg-amber-50' 
                                      : 'text-red-500 hover:text-emerald-700 hover:bg-emerald-50'
                                  }`}
                                  title={user.status === 'active' ? 'Suspend account' : 'Activate account'}
                                >
                                  {user.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                </button>
                              )}

                              {/* Delete Button */}
                              {user.id !== 'usr_admin' && (
                                <button
                                  onClick={() => handleDeleteUser(user)}
                                  className="p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 transition"
                                  title={lang === 'ta' ? 'கணக்கை நீக்கு' : 'Delete user'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Member-to-Role Mapping & User Edit Modal */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 animate-scale-up space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-900 border border-purple-200">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-stone-900">
                    {editingUser 
                      ? (lang === 'ta' ? 'பொறுப்பு & பயனாளர் திருத்துதல்' : 'Edit User & Role Mapping')
                      : (lang === 'ta' ? 'உறுப்பினருக்கு பொறுப்பு ஒதுக்குதல்' : 'Map Member to RBAC Role')}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {lang === 'ta' ? 'பொறுப்பை மாற்றுவது கிராம நிதி பாதுகாப்பிற்கான அதிகாரங்களை உடனே இயக்கும்' : 'Assign governance roles and authorize capabilities'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMapModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUserMapping} className="space-y-4 text-xs sm:text-sm">
              {/* Select Member to Map */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  {lang === 'ta' ? '1. கிராம / வளைகுடா உறுப்பினரைத் தேர்வுசெய்க' : '1. Select Community Member (Optional / Link)'}
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => handleMemberSelectChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-stone-50 text-stone-900 font-medium focus:ring-2 focus:ring-purple-600 focus:bg-white focus:outline-none"
                >
                  <option value="">
                    {lang === 'ta' ? '-- சுயாதீன கணக்கு (உறுப்பினர் இணைப்பு இல்லை) --' : '-- Direct User (No Member Mapping) --'}
                  </option>
                  {members.map((m) => {
                    const alreadyMappedUser = users.find((u) => u.memberId === m.id && (!editingUser || u.id !== editingUser.id));
                    return (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.nameTa}) • {m.villageWard} • {m.currency === 'AED' ? `${m.monthlyPledge} AED` : `₹${m.monthlyPledge}`} {alreadyMappedUser ? `[@${alreadyMappedUser.username} - ${alreadyMappedUser.role}]` : ''}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-stone-500 mt-1">
                  {lang === 'ta'
                    ? 'உறுப்பினருடன் இணைத்தால், உறுப்பினரின் அட்டை பொறுப்பும் தானாகவே புதுப்பிக்கப்படும்.'
                    : 'Linking with a member automatically synchronizes their directory profile and badge.'}
                </p>
              </div>

              {/* Select Role */}
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                  {lang === 'ta' ? '2. அதிகாரப் பொறுப்பைத் தேர்ந்தெடுக்கவும் (RBAC Role)' : '2. Assign RBAC Role'}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {allRolesList.map((r) => {
                    const badge = getRoleBadge(r);
                    const isSelected = formRole === r;
                    return (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setFormRole(r)}
                        className={`text-left p-2.5 rounded-xl border transition flex items-start justify-between gap-2 ${
                          isSelected
                            ? 'bg-purple-50 border-purple-600 shadow-2xs'
                            : 'bg-stone-50/60 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="font-extrabold text-xs text-stone-900 flex items-center gap-1.5">
                            <span>{lang === 'ta' ? badge.labelTa : badge.labelEn}</span>
                            <span className="text-[10px] text-stone-400 font-normal">
                              ({ROLE_PERMISSIONS[r]?.length || 0} perms)
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-500 leading-tight">
                            {lang === 'ta' ? badge.descTa : badge.descEn}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-purple-700 text-white flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* User Account Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {lang === 'ta' ? 'பயனர் பெயர் (@username)' : 'Username (@username) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. muthu_pres"
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 font-mono text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {lang === 'ta' ? 'தொலைபேசி எண்' : 'Phone Number'}
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="98421 XXXXX"
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {lang === 'ta' ? 'முழுப் பெயர் (English) *' : 'Full Name (English) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="e.g. M. Muthukumar"
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {lang === 'ta' ? 'பெயர் (தமிழ்)' : 'Name (Tamil)'}
                  </label>
                  <input
                    type="text"
                    value={formFullNameTa}
                    onChange={(e) => setFormFullNameTa(e.target.value)}
                    placeholder="மு. முத்துக்குமார்"
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    {lang === 'ta' ? 'மின்னஞ்சல் முகவரி' : 'Email Address (Optional)'}
                  </label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="official@gramanidhi.org"
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Live Permission Preview */}
              <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-purple-950">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-700" />
                    <span>
                      {lang === 'ta' ? 'அளிக்கப்படும் அதிகாரங்கள் (Live Preview):' : 'Authorized Permissions for this Role:'}
                    </span>
                  </span>
                  <span className="font-mono text-purple-800">
                    {ROLE_PERMISSIONS[formRole]?.length || 0}/10
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-stone-700">
                  {allPermissionsList.map((perm) => {
                    const isAllowed = (ROLE_PERMISSIONS[formRole] || []).includes(perm.id);
                    return (
                      <div key={perm.id} className="flex items-center gap-1.5">
                        {isAllowed ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <X className="w-3.5 h-3.5 text-stone-300 shrink-0" />
                        )}
                        <span className={isAllowed ? 'font-semibold text-stone-900' : 'text-stone-400 line-through'}>
                          {lang === 'ta' ? perm.nameTa : perm.nameEn}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status & Notes */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-stone-700">
                    {lang === 'ta' ? 'கணக்கு நிலை:' : 'Account Status:'}
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="px-2.5 py-1 rounded-lg border border-stone-300 text-xs font-semibold bg-white"
                  >
                    <option value="active">{lang === 'ta' ? 'செயலில் (Active)' : 'Active'}</option>
                    <option value="suspended">{lang === 'ta' ? 'முடக்கப்பட்டது (Suspended)' : 'Suspended'}</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsMapModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50 transition text-xs"
                  >
                    {lang === 'ta' ? 'ரத்து' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold transition text-xs shadow-xs"
                  >
                    {editingUser ? (lang === 'ta' ? 'சேமிக்குக' : 'Save Changes') : (lang === 'ta' ? 'பொறுப்பை ஒதுக்குக' : 'Confirm Mapping')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RBAC Permissions Matrix Modal */}
      {isMatrixModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-stone-200 animate-scale-up space-y-5">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-900 border border-purple-200">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base sm:text-lg text-stone-900">
                    {lang === 'ta' ? 'முழு RBAC அதிகார வரைபடம் (Role Permissions Matrix)' : 'Comprehensive RBAC Permissions Matrix'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {lang === 'ta' ? '7 நிர்வாக பொறுப்புகள் மற்றும் 10 அதிகாரங்களின் ஒப்பீடு' : 'Cross-reference of 7 administrative roles vs 10 operational capabilities'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMatrixModalOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto border border-stone-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-900 text-white font-bold">
                  <tr>
                    <th className="py-3 px-4 min-w-[200px]">
                      {lang === 'ta' ? 'அதிகாரங்கள் / செயல்கள்' : 'Permissions / Capabilities'}
                    </th>
                    {allRolesList.map((r) => {
                      const b = getRoleBadge(r);
                      return (
                        <th key={r} className="py-3 px-2.5 text-center min-w-[90px]">
                          <div className="font-bold text-[11px] leading-tight">
                            {lang === 'ta' ? b.labelTa : b.labelEn}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {allPermissionsList.map((perm) => (
                    <tr key={perm.id} className="hover:bg-stone-50 transition">
                      <td className="py-3 px-4 bg-stone-50/50">
                        <div className="font-extrabold text-stone-900">
                          {lang === 'ta' ? perm.nameTa : perm.nameEn}
                        </div>
                        <div className="text-[10px] text-stone-500 leading-tight">
                          {lang === 'ta' ? perm.descTa : perm.descEn}
                        </div>
                      </td>
                      {allRolesList.map((r) => {
                        const isGranted = (ROLE_PERMISSIONS[r] || []).includes(perm.id);
                        return (
                          <td key={r} className="py-3 px-2.5 text-center">
                            {isGranted ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                                ✓
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-stone-100 text-stone-300">
                                –
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Matrix Footer */}
            <div className="flex items-center justify-between text-xs text-stone-500 pt-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300 inline-block" />
                <span>{lang === 'ta' ? 'அனுமதிக்கப்பட்டது' : 'Authorized'}</span>
                <span className="w-3 h-3 rounded-full bg-stone-100 inline-block ml-3" />
                <span>{lang === 'ta' ? 'அனுமதியில்லை' : 'Restricted'}</span>
              </div>
              <button
                onClick={() => setIsMatrixModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold transition"
              >
                {lang === 'ta' ? 'சரி' : 'Close Matrix'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
