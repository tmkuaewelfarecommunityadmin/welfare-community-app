import React, { useEffect } from 'react';
import { UserRole, Language, OrganizationInfo } from '../types';
import { getTranslation } from '../i18n/translations';
import { PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { OrgLogo } from './OrgLogo';
import { 
  X, 
  Globe, 
  UserCheck, 
  Sparkles, 
  LayoutDashboard, 
  CreditCard, 
  HeartHandshake, 
  BookOpen, 
  Users, 
  RefreshCw, 
  ShieldCheck, 
  Check, 
  Wifi, 
  WifiOff, 
  ChevronRight,
  Info,
  Building,
  Edit3,
  FileEdit,
  Monitor
} from 'lucide-react';
import { canAccessScreen } from '../views/ScreenConfigView';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  activeRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenAnalysis: () => void;
  orgInfo: OrganizationInfo;
  onOpenOrgSettings: () => void;
  authEmail?: string;
  onLogout?: () => void;
}

export const HeaderDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  lang,
  onLanguageChange,
  activeRole,
  onRoleChange,
  activeTab,
  onTabChange,
  onOpenAnalysis,
  orgInfo,
  onOpenOrgSettings,
  authEmail,
  onLogout
}) => {
  const t = getTranslation(lang);
  const { isOnline, pendingCount } = useOnlineStatus();

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const roles: { role: UserRole; labelEn: string; labelTa: string; descEn: string; descTa: string }[] = [
    { 
      role: 'admin', 
      labelEn: 'Super Admin', 
      labelTa: 'முதன்மை நிர்வாகி',
      descEn: 'Full RBAC authority, user & role mapping, branding, and ledger controls',
      descTa: 'முழு நிர்வாக உரிமை, பொறுப்பு ஒதுக்கீடு மற்றும் அனைத்து நிதி செயல்பாடுகள்'
    },
    { 
      role: 'treasurer', 
      labelEn: 'Treasurer', 
      labelTa: 'பொருளாளர்',
      descEn: 'Field collections, cash/UPI receipts, ledger & payouts',
      descTa: 'சந்தா வரவு ரசீதுகள், பேரேடு மற்றும் நிதி வழங்கல்'
    },
    { 
      role: 'committee', 
      labelEn: 'Committee Member', 
      labelTa: 'செயற்குழு உறுப்பினர்',
      descEn: 'Review and vote on welfare assistance requests',
      descTa: 'உதவிக் கோரிக்கைகளை பரிசீலித்து வாக்களித்தல்'
    },
    { 
      role: 'member', 
      labelEn: 'Contributing Member', 
      labelTa: 'சந்தாதாரர்',
      descEn: 'View own payment dues and community fund ledger',
      descTa: 'சொந்த சந்தா நிலை மற்றும் பொது நிதி இருப்பு பார்வை'
    },
    { 
      role: 'auditor', 
      labelEn: 'Honorary Auditor', 
      labelTa: 'தணிக்கையாளர்',
      descEn: 'Read-only financial statements and audit verification',
      descTa: 'தணிக்கை அறிக்கை மற்றும் வரவு-செலவு சரிபார்ப்பு'
    },
  ];

  const allNavItems = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { 
      id: 'contributions', 
      label: activeRole === 'member'
        ? (lang === 'ta' ? 'எனது சந்தா & நிலுவைகள்' : 'My Contributions & Dues')
        : t.contributions, 
      icon: CreditCard 
    },
    { id: 'assistance', label: t.assistance, icon: HeartHandshake },
    { id: 'ledger', label: t.ledger, icon: BookOpen },
    { id: 'members', label: t.members, icon: Users },
    { id: 'users', label: lang === 'ta' ? 'பொறுப்பு & பயனாளர் நிர்வாகம்' : 'User Management & RBAC', icon: UserCheck },
    { id: 'sync', label: t.syncCenter, icon: RefreshCw },
    { id: 'audit', label: t.auditLogs, icon: ShieldCheck },
    { id: 'amendments', label: lang === 'ta' ? 'நிதித் திருத்த ஒப்புதல்கள்' : 'Amendments & Approvals', icon: FileEdit },
    { id: 'screen_config', label: lang === 'ta' ? 'திரை அனுமதி மேலாண்மை' : 'Screen Access Config', icon: Monitor },
  ];

  const navItems = allNavItems.filter((item) => canAccessScreen(item.id, activeRole));

  const handleNavClick = (tabId: string) => {
    onTabChange(tabId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop with blur and fade */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col transform transition ease-in-out duration-300">
          
          {/* Drawer Header */}
          <div className="px-5 py-4 bg-stone-900 text-white flex items-center justify-between border-b border-stone-800">
            <div className="flex items-center gap-2.5 min-w-0">
              <OrgLogo orgInfo={orgInfo} size="sm" />
              <div className="min-w-0">
                <h2 className="font-extrabold text-sm sm:text-base leading-tight truncate">
                  {lang === 'ta' ? (orgInfo.nameTa || orgInfo.name) : (orgInfo.name || orgInfo.nameTa)}
                </h2>
                <p className="text-[11px] text-stone-400 truncate">
                  {lang === 'ta' 
                    ? `${orgInfo.villageTa || orgInfo.village} • ${orgInfo.districtTa || orgInfo.district}` 
                    : `${orgInfo.village || orgInfo.villageTa} • ${orgInfo.district || orgInfo.districtTa}`}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition shrink-0"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-stone-700">
            
            {/* Authenticated Gmail Member Badge */}
            {authEmail && (
              <div className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/70 flex items-center justify-between gap-3 shadow-2xs">
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                    {lang === 'ta' ? 'சரிபார்க்கப்பட்ட ஜிமெயில்' : 'Verified Gmail Session'}
                  </span>
                  <div className="font-extrabold text-stone-900 text-xs sm:text-sm truncate">
                    {authEmail}
                  </div>
                  <span className="text-[10px] text-stone-500 font-semibold block capitalize">
                    {activeRole === 'admin' ? 'Super Administrator' : activeRole}
                  </span>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition shrink-0 shadow-2xs cursor-pointer"
                    title="Sign out of Gmail session"
                  >
                    {lang === 'ta' ? 'வெளியேறு' : 'Sign Out'}
                  </button>
                )}
              </div>
            )}

            {/* Quick Status / Offline Banner */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${
              isOnline ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-4 h-4 text-emerald-700" />
                ) : (
                  <WifiOff className="w-4 h-4 text-amber-700" />
                )}
                <span className="font-bold">
                  {isOnline ? t.online : t.offline}
                </span>
              </div>

              {pendingCount > 0 ? (
                <span className="font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 text-[10px]">
                  {pendingCount} {lang === 'ta' ? 'வரிசையில்' : 'queued'}
                </span>
              ) : (
                <span className="text-[10px] font-semibold text-emerald-700">
                  ✓ {lang === 'ta' ? 'ஒத்திசைக்கப்பட்டது' : 'Synced'}
                </span>
              )}
            </div>

            {/* Organization Identity & Custom Logo Card */}
            <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-white hover:border-emerald-300 transition flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <OrgLogo orgInfo={orgInfo} size="md" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                    {lang === 'ta' ? 'அமைப்பின் அடையாளம்' : 'Organization Branding'}
                  </span>
                  <div className="font-bold text-stone-900 truncate">
                    {lang === 'ta' ? (orgInfo.nameTa || orgInfo.name) : (orgInfo.name || orgInfo.nameTa)}
                  </div>
                  <span className="text-[10px] text-stone-500 truncate block">
                    {orgInfo.regNumber || 'Self-Governed Fund'}
                  </span>
                </div>
              </div>

              {activeRole === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenOrgSettings();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0 shadow-2xs"
                  title={lang === 'ta' ? 'அமைப்பின் லோகோ & தலைப்பு விவரங்களை மாற்றுக (முதன்மை நிர்வாகி மட்டும்)' : 'Customize Logo & Title Information (Super Admin Only)'}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{lang === 'ta' ? 'மாற்றுக' : 'Customize'}</span>
                </button>
              )}
            </div>

            {/* Multi-Currency Support Badge */}
            <div className="p-3 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">🇮🇳 🇦🇪</span>
                <div>
                  <span className="font-bold text-stone-900 block leading-tight">
                    INR (₹) & UAE Dirhams (AED د.إ)
                  </span>
                  <span className="text-[10px] text-stone-500">
                    {lang === 'ta' ? 'வளைகுடா உறுப்பினர்களுக்கான நேரடி ஆதரவு' : 'Supported with automatic conversion'}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold bg-white px-2 py-0.5 rounded border border-stone-200 text-stone-700">
                1 AED ≈ ₹22.80
              </span>
            </div>

            {/* Language Selection Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                <Globe className="w-3.5 h-3.5 text-stone-400" />
                <span>{lang === 'ta' ? 'மொழி தேர்வு / Language' : 'Display Language'}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-xl border border-stone-200">
                <button
                  onClick={() => onLanguageChange('ta')}
                  className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                    lang === 'ta'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  {lang === 'ta' && <Check className="w-3.5 h-3.5" />}
                  <span>தமிழ் (Tamil)</span>
                </button>

                <button
                  onClick={() => onLanguageChange('en')}
                  className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition ${
                    lang === 'en'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60'
                  }`}
                >
                  {lang === 'en' && <Check className="w-3.5 h-3.5" />}
                  <span>English</span>
                </button>
              </div>
            </div>

            {/* Architecture Review & Suggestions Card (Administrators & Executives) */}
            {activeRole !== 'member' && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>{lang === 'ta' ? 'கட்டமைப்பு திருத்தங்கள் & பரிந்துரைகள்' : 'Architecture & Optimizations'}</span>
                </div>

                <div 
                  onClick={() => {
                    onClose();
                    onOpenAnalysis();
                  }}
                  className="p-3.5 rounded-xl border border-amber-300 bg-amber-50/70 hover:bg-amber-100/70 transition cursor-pointer flex items-center justify-between group shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-amber-950 flex items-center gap-1.5">
                      <span>{t.techAnalysis}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200 text-amber-900">
                        Report
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-900/80">
                      {lang === 'ta' 
                        ? 'பூஜ்ஜிய செலவு, ஆஃப்லைன் அணுகல், மற்றும் சீரான ஒத்திசைவு ஒப்பீட்டு அறிக்கை.' 
                        : 'Detailed analysis of Zero-Cost PWA, Rural Offline Field Sync, and optimizations.'}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-700 group-hover:translate-x-0.5 transition" />
                </div>
              </div>
            )}

            {/* Navigation Links */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                <LayoutDashboard className="w-3.5 h-3.5 text-stone-400" />
                <span>{lang === 'ta' ? 'பிரிவுகள் / Navigation' : 'Application Views'}</span>
              </div>

              <div className="space-y-1 bg-stone-50 p-1.5 rounded-xl border border-stone-200">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition font-medium ${
                        isActive
                          ? 'bg-emerald-700 text-white font-bold shadow-2xs'
                          : 'text-stone-700 hover:bg-white hover:text-stone-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-200' : 'text-stone-400'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role Switcher Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{lang === 'ta' ? 'நிர்வாகப் பொறுப்பை மாற்றுக' : 'Active Role Simulator'}</span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 lowercase">
                  ({roles.find((r) => r.role === activeRole)?.labelEn})
                </span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {roles.map((r) => {
                  const isCurrent = activeRole === r.role;

                  return (
                    <button
                      key={r.role}
                      onClick={() => {
                        onRoleChange(r.role);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl border transition flex items-start justify-between gap-2 ${
                        isCurrent
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-2xs'
                          : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <span>{lang === 'ta' ? r.labelTa : r.labelEn}</span>
                          <span className="text-[10px] text-stone-400 font-normal">
                            ({lang === 'ta' ? r.labelEn : r.labelTa})
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-500 leading-tight">
                          {lang === 'ta' ? r.descTa : r.descEn}
                        </p>
                      </div>

                      {isCurrent && (
                        <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Install PWA Button / Guide */}
            <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
              <div className="font-bold text-stone-900 text-xs flex items-center justify-between">
                <span>{lang === 'ta' ? 'மொபைல் செயலி நிறுவல்' : 'PWA Mobile App'}</span>
                <PWAInstallButton lang={lang} />
              </div>
              <p className="text-[11px] text-stone-500 leading-tight">
                {lang === 'ta' 
                  ? 'ஆப் ஸ்டோர் கட்டணமின்றி நேரடியாக உங்கள் மொபைல் திரையில் நிறுவலாம்.' 
                  : 'Install with ₹0 store fees directly to your home screen for instant offline access.'}
              </p>
            </div>

          </div>

          {/* Drawer Footer */}
          <div className="p-4 bg-stone-100 border-t border-stone-200 flex items-center justify-end text-[11px] text-stone-500">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-semibold transition"
            >
              {lang === 'ta' ? 'மூடுக' : 'Close'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
