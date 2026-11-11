import React, { useState } from 'react';
import { UserRole, Language, OrganizationInfo } from '../types';
import { getTranslation } from '../i18n/translations';
import { PWAInstallButton } from './PWAInstallButton';
import { HeaderDrawer } from './HeaderDrawer';
import { OrgLogo } from './OrgLogo';
import { 
  Menu, 
  Sparkles, 
  UserCheck,
  ChevronRight,
  Edit3
} from 'lucide-react';

interface Props {
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

export const Navbar: React.FC<Props> = ({
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
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const roles: { role: UserRole; labelEn: string; labelTa: string }[] = [
    { role: 'admin', labelEn: 'Super Admin', labelTa: 'முதன்மை நிர்வாகி' },
    { role: 'treasurer', labelEn: 'Treasurer', labelTa: 'பொருளாளர்' },
    { role: 'committee', labelEn: 'Committee', labelTa: 'செயற்குழு' },
    { role: 'member', labelEn: 'Member', labelTa: 'சந்தாதாரர்' },
    { role: 'auditor', labelEn: 'Auditor', labelTa: 'தணிக்கையாளர்' },
  ];

  const currentRoleObj = roles.find((r) => r.role === activeRole) || roles[0];

  const tabLabels: Record<string, string> = {
    dashboard: t.dashboard,
    contributions: activeRole === 'member'
      ? (lang === 'ta' ? 'எனது சந்தா & பங்களிப்பு' : 'My Contributions & Dues')
      : t.contributions,
    assistance: t.assistance,
    ledger: t.ledger,
    members: t.members,
    users: lang === 'ta' ? 'பொறுப்பு & பயனாளர் நிர்வாகம்' : 'User Management & RBAC',
    sync: t.syncCenter,
    audit: t.auditLogs,
    amendments: lang === 'ta' ? 'நிதித் திருத்த ஒப்புதல்கள்' : 'Amendments & Approvals',
  };

  const currentTabLabel = tabLabels[activeTab] || t.dashboard;

  return (
    <>
      <header className="sticky top-0 z-40 bg-white border-b border-stone-200 shadow-xs">
        {/* Clean, Single-Row Header Bar without ugly scroll links */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
          
          {/* Logo and Organization Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button 
              type="button"
              onClick={() => onTabChange('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none min-w-0 cursor-pointer"
              title="Go to Dashboard"
            >
              <OrgLogo orgInfo={orgInfo} size="md" className="group-hover:scale-105 transition-transform" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h1 className="text-base sm:text-lg font-extrabold text-stone-900 tracking-tight leading-tight truncate">
                    {lang === 'ta' ? (orgInfo.nameTa || orgInfo.name) : (orgInfo.name || orgInfo.nameTa)}
                  </h1>
                  {orgInfo.headerBadge && (
                    <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                      {orgInfo.headerBadge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500 font-medium truncate max-w-[180px] sm:max-w-xs md:max-w-md">
                  {lang === 'ta' 
                    ? `${orgInfo.villageTa || orgInfo.village} • ${orgInfo.districtTa || orgInfo.district}` 
                    : `${orgInfo.village || orgInfo.villageTa} • ${orgInfo.district || orgInfo.districtTa}`}
                </p>
              </div>
            </button>

            {/* Quick Edit Branding Button (Super Admin Only) */}
            {activeRole === 'admin' && (
              <button
                type="button"
                onClick={onOpenOrgSettings}
                className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 transition shrink-0"
                title={lang === 'ta' ? 'அமைப்பின் லோகோ & தலைப்பு விவரங்களை மாற்றுக (முதன்மை நிர்வாகி மட்டும்)' : 'Customize Logo & Title Information (Super Admin Only)'}
                aria-label="Customize branding and logo"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Current Active Section Badge (Breadcrumb) */}
            <div className="hidden lg:flex items-center gap-1.5 pl-3 border-l border-stone-200 text-xs text-stone-600 shrink-0">
              <ChevronRight className="w-3.5 h-3.5 text-stone-400" />
              <span className="font-bold text-emerald-900 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {currentTabLabel}
              </span>
            </div>
          </div>

          {/* Right Header Controls with Prominent Three-Dot Menu Button */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Quick Architecture Blueprint Button (Desktop - Admins & Executives) */}
            {activeRole !== 'member' && (
              <button
                onClick={onOpenAnalysis}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold border border-amber-300 shadow-2xs transition"
                title="Architecture Review & Suggestions"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>{t.techAnalysis}</span>
              </button>
            )}

            {/* Quick Language Toggle */}
            <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs">
              <button
                onClick={() => onLanguageChange('ta')}
                className={`px-2 py-1 rounded-md font-semibold text-[11px] sm:text-xs transition ${
                  lang === 'ta' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                தமிழ்
              </button>
              <button
                onClick={() => onLanguageChange('en')}
                className={`px-2 py-1 rounded-md font-semibold text-[11px] sm:text-xs transition ${
                  lang === 'en' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                EN
              </button>
            </div>

            {/* Active Role Quick Pill (Opens Drawer for switching) */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-medium transition"
              title="Click to view and switch roles in drawer"
            >
              <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span className="font-semibold text-xs">
                {lang === 'ta' ? currentRoleObj.labelTa : currentRoleObj.labelEn}
              </span>
            </button>

            {/* Install PWA Button (Desktop) */}
            <div className="hidden sm:block">
              <PWAInstallButton lang={lang} />
            </div>

            {/* The Dedicated Three Horizontal Lines Menu Button to Open Full Navigation Drawer */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 sm:p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-800 transition flex items-center justify-center border border-stone-300 shadow-2xs hover:shadow-xs group"
              title={lang === 'ta' ? 'அமைப்புகள் & மெனு' : 'Menu & Settings'}
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5 text-stone-700 group-hover:text-stone-900 transition" />
            </button>

          </div>
        </div>
      </header>

      {/* Slide-out Drawer */}
      <HeaderDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        lang={lang}
        onLanguageChange={onLanguageChange}
        activeRole={activeRole}
        onRoleChange={onRoleChange}
        activeTab={activeTab}
        onTabChange={onTabChange}
        onOpenAnalysis={onOpenAnalysis}
        orgInfo={orgInfo}
        onOpenOrgSettings={onOpenOrgSettings}
        authEmail={authEmail}
        onLogout={onLogout}
      />
    </>
  );
};
