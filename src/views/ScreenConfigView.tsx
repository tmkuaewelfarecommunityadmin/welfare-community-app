import React, { useState, useEffect } from 'react';
import { UserRole, Language } from '../types';
import { localDB } from '../services/storage';
import { 
  ShieldCheck, 
  Lock, 
  Check, 
  X, 
  Save, 
  RotateCcw, 
  Sparkles, 
  Monitor, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface Props {
  lang: Language;
  activeRole: UserRole;
  onNavigate: (tab: string) => void;
}

export interface ScreenDefinition {
  id: string;
  nameEn: string;
  nameTa: string;
  descEn: string;
  descTa: string;
  defaultRoles: UserRole[];
}

export const APP_SCREENS: ScreenDefinition[] = [
  {
    id: 'dashboard',
    nameEn: 'Dashboard & Overview',
    nameTa: 'முகப்பு & சுருக்கம்',
    descEn: 'Key financial metrics, collection summaries, and quick action widgets.',
    descTa: 'நிதி அளவீடுகள், வசூல் சுருக்கங்கள் மற்றும் விரைவான செயல்பாடுகள்.',
    defaultRoles: ['admin', 'treasurer', 'committee', 'member', 'auditor']
  },
  {
    id: 'contributions',
    nameEn: 'Contributions & Dues',
    nameTa: 'சந்தா & வரவுகள்',
    descEn: 'Member pledges, dues tracking, payment receipts, and collections.',
    descTa: 'உறுப்பினர் உறுதிமொழி, நிலுவை கண்காணிப்பு மற்றும் ரசீதுகள்.',
    defaultRoles: ['admin', 'treasurer', 'committee', 'member', 'auditor']
  },
  {
    id: 'assistance',
    nameEn: 'Welfare Assistance',
    nameTa: 'நலஉதவி கோரிக்கைகள்',
    descEn: 'Medical, education, and disaster relief assistance requests and voting.',
    descTa: 'மருத்துவ, கல்வி மற்றும் அவசர கால நலஉதவி கோரிக்கைகள்.',
    defaultRoles: ['admin', 'treasurer', 'committee', 'member', 'auditor']
  },
  {
    id: 'ledger',
    nameEn: 'Financial Ledger',
    nameTa: 'இரட்டை பதிவு பேரேடு',
    descEn: 'Immutable double-entry ledger with debits, credits, and running balances.',
    descTa: 'வரவு-செலவு இரட்டை பதிவு பேரேடு.',
    defaultRoles: ['admin', 'treasurer', 'auditor']
  },
  {
    id: 'members',
    nameEn: 'Members Directory',
    nameTa: 'உறுப்பினர்கள் பட்டியல்',
    descEn: 'Local and UAE Gulf chapter members directory.',
    descTa: 'உள்ளூர் மற்றும் வளைகுடா வாழ் உறுப்பினர்கள் விவரப் பட்டியல்.',
    defaultRoles: ['admin', 'treasurer', 'committee', 'auditor']
  },
  {
    id: 'users',
    nameEn: 'User Management & RBAC',
    nameTa: 'பயனாளர் & பொறுப்பு நிர்வாகம்',
    descEn: 'RBAC role assignment and member-to-user mapping.',
    descTa: 'பொறுப்புகளை ஒதுக்குதல் மற்றும் பயனர் மேலாண்மை.',
    defaultRoles: ['admin', 'treasurer']
  },
  {
    id: 'sync',
    nameEn: 'Offline Sync Center',
    nameTa: 'ஆஃப்லைன் ஒத்திசைவு மையம்',
    descEn: 'IndexedDB storage backups, JSON snapshots, and Excel-compatible CSV exports.',
    descTa: 'தரவுத்தள காப்புப்பிரதி மற்றும் எக்செல் CSV ஏற்றுமதி மையம்.',
    defaultRoles: ['admin', 'treasurer', 'auditor']
  },
  {
    id: 'audit',
    nameEn: 'Audit Trail',
    nameTa: 'தணிக்கைப் பதிவு',
    descEn: 'Immutable tamper-evident record of all governance and financial actions.',
    descTa: 'அனைத்து நிதி மற்றும் நிர்வாக நடவடிக்கைகளின் காலவரிசைப் பதிவு.',
    defaultRoles: ['admin', 'auditor']
  },
  {
    id: 'amendments',
    nameEn: 'Amendments & Approvals',
    nameTa: 'நிதித் திருத்த ஒப்புதல்கள்',
    descEn: 'Committee quorum approval workflows for modifying published financial data.',
    descTa: 'வெளியிடப்பட்ட நிதித் தரவுகளில் மாற்றங்கள் செய்ய செயற்குழு ஒப்புதல்.',
    defaultRoles: ['admin', 'treasurer', 'committee', 'member', 'auditor']
  },
  {
    id: 'screen_config',
    nameEn: 'Screen & Router Access',
    nameTa: 'திரை & ரூட்டர் அனுமதி மேலாண்மை',
    descEn: 'Super Admin screen-level and router-level access configuration.',
    descTa: 'நிர்வாகிக்கான திரை மற்றும் ரூட்டர் அனுமதி கட்டுப்பாட்டு அறை.',
    defaultRoles: ['admin']
  }
];

export const ALL_ROLES: UserRole[] = ['admin', 'treasurer', 'committee', 'member', 'auditor'];

export const ROLE_LABELS: Record<UserRole, { en: string; ta: string }> = {
  admin: { en: 'Super Admin', ta: 'முதன்மை நிர்வாகி' },
  treasurer: { en: 'Treasurer', ta: 'பொருளாளர்' },
  committee: { en: 'Committee', ta: 'செயற்குழு' },
  member: { en: 'Member', ta: 'சந்தாதாரர்' },
  auditor: { en: 'Auditor', ta: 'தணிக்கையாளர்' },
};

export const ScreenConfigView: React.FC<Props> = ({ lang, activeRole, onNavigate }) => {
  const [accessMap, setAccessMap] = useState<Record<string, UserRole[]>>(() => {
    const saved = localStorage.getItem('gramanidhi_screen_access');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    // Default initial map
    const map: Record<string, UserRole[]> = {};
    APP_SCREENS.forEach((s) => {
      map[s.id] = [...s.defaultRoles];
    });
    return map;
  });

  const [notification, setNotification] = useState<string | null>(null);

  const isAdmin = activeRole === 'admin';

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleToggle = (screenId: string, role: UserRole) => {
    if (!isAdmin) return;
    setAccessMap((prev) => {
      const currentRoles = prev[screenId] || [];
      const exists = currentRoles.includes(role);
      let updated: UserRole[];
      if (exists) {
        // Don't let admin lock themselves out of screen_config
        if (screenId === 'screen_config' && role === 'admin') {
          showToast(lang === 'ta' ? 'முதன்மை நிர்வாகிக்கு இந்த திரைக்கான அனுமதி எப்போதும் தேவை' : 'Super Admin must retain access to Screen Config');
          return prev;
        }
        updated = currentRoles.filter((r) => r !== role);
      } else {
        updated = [...currentRoles, role];
      }
      return {
        ...prev,
        [screenId]: updated
      };
    });
  };

  const handleSave = () => {
    localStorage.setItem('gramanidhi_screen_access', JSON.stringify(accessMap));
    window.dispatchEvent(new Event('storage'));
    showToast(lang === 'ta' ? 'திரை மற்றும் ரூட்டர் அணுகல் வெற்றிகரமாக சேமிக்கப்பட்டது!' : 'Screen & Router access configuration saved successfully!');
  };

  const handleReset = () => {
    const defaultMap: Record<string, UserRole[]> = {};
    APP_SCREENS.forEach((s) => {
      defaultMap[s.id] = [...s.defaultRoles];
    });
    setAccessMap(defaultMap);
    localStorage.setItem('gramanidhi_screen_access', JSON.stringify(defaultMap));
    window.dispatchEvent(new Event('storage'));
    showToast(lang === 'ta' ? 'அமைப்புகள் இயல்புநிலைக்கு மீட்டமைக்கப்பட்டன!' : 'Reset to default access configuration!');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-stone-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs sm:text-sm animate-fade-in border border-stone-700">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Super Admin Guard Banner */}
      {!isAdmin && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">
                {lang === 'ta' ? 'கண்காணிப்பு முறை: முதன்மை நிர்வாகி அனுமதி தேவை' : 'Read-Only Mode: Super Admin Access Required'}
              </p>
              <p className="text-xs text-amber-800">
                {lang === 'ta' 
                  ? 'திரை மற்றும் ரூட்டர் அனுமதி விதிகளை மாற்ற முதன்மை நிர்வாகி (Super Admin) கணக்கிற்கு மாறவும்.' 
                  : 'Switch to Super Admin account to modify screen-level and router-level access rules.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-purple-700 text-white shadow-md">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-xl font-black text-stone-900 tracking-tight">
                {lang === 'ta' ? 'திரை & ரூட்டர் அனுமதி மேலாண்மை (Super Admin)' : 'Screen & Router Access Configurator'}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 font-medium">
                {lang === 'ta' 
                  ? 'ஒவ்வொரு நிர்வாக பொறுப்புக்கும் எந்தெந்த திரைகள் மற்றும் ரூட்டர்கள் அனுமதிக்கப்பட வேண்டும் என்பதை நிர்வகிக்கவும்.' 
                  : 'Configure which user roles have access to each application screen and router tab.'}
              </p>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3.5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs flex items-center gap-1.5 transition"
              title="Reset to Defaults"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? 'இயல்புநிலை' : 'Reset Defaults'}</span>
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition"
            >
              <Save className="w-4 h-4" />
              <span>{lang === 'ta' ? 'மாற்றங்களை சேமிக்கவும்' : 'Save Access Rules'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Matrix Table Card */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-900 text-white font-bold">
              <tr>
                <th className="py-3.5 px-4 min-w-[240px]">
                  {lang === 'ta' ? 'திரை / ரூட்டர் தொகுதி' : 'Screen / Router Tab'}
                </th>
                {ALL_ROLES.map((r) => (
                  <th key={r} className="py-3.5 px-2 text-center min-w-[95px]">
                    <div className="font-bold text-[11px] leading-tight">
                      {lang === 'ta' ? ROLE_LABELS[r].ta : ROLE_LABELS[r].en}
                    </div>
                    <div className="text-[9px] font-mono text-stone-400 uppercase">
                      {r}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {APP_SCREENS.map((screen) => (
                <tr key={screen.id} className="hover:bg-stone-50/70 transition">
                  <td className="py-3.5 px-4 bg-stone-50/50">
                    <div className="font-extrabold text-stone-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      <span>{lang === 'ta' ? screen.nameTa : screen.nameEn}</span>
                    </div>
                    <div className="text-[10px] text-stone-500 leading-tight mt-0.5">
                      {lang === 'ta' ? screen.descTa : screen.descEn}
                    </div>
                    <div className="text-[9px] font-mono text-stone-400 mt-1">
                      ID: {screen.id}
                    </div>
                  </td>

                  {ALL_ROLES.map((role) => {
                    const allowedRoles = accessMap[screen.id] || [];
                    const isGranted = allowedRoles.includes(role);

                    return (
                      <td key={role} className="py-3.5 px-2 text-center">
                        <button
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => handleToggle(screen.id, role)}
                          className={`w-8 h-8 rounded-xl inline-flex items-center justify-center font-bold transition shadow-2xs ${
                            isGranted 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200' 
                              : 'bg-stone-100 text-stone-400 border border-stone-200 hover:bg-stone-200'
                          } ${!isAdmin ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                          title={isGranted ? 'Allowed (Click to revoke)' : 'Restricted (Click to grant)'}
                        >
                          {isGranted ? <Check className="w-4 h-4 text-emerald-700" /> : <X className="w-3.5 h-3.5 text-stone-400" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-xs text-purple-950 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">
            {lang === 'ta' ? 'ரூட்டர் & திரை அணுகல் பாதுகாப்பு குறிப்பு' : 'Router & Screen Access Enforcement Note'}
          </p>
          <p className="text-purple-900 mt-0.5">
            {lang === 'ta' 
              ? 'இந்த திரையில் நீங்கள் செய்யும் மாற்றங்கள் உடனடியாக நேவிகேஷன் மெனுவிலும் (Header Drawer) ரூட்டர் பாதுகாப்பிலும் (App Router Guards) நடைமுறைப்படுத்தப்படும்.' 
              : 'Changes saved here immediately update the navigation drawer menu items and router access guards across the application session.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export const canAccessScreen = (screenId: string, role: UserRole): boolean => {
  const saved = localStorage.getItem('gramanidhi_screen_access');
  if (saved) {
    try {
      const map = JSON.parse(saved);
      if (map[screenId] && Array.isArray(map[screenId])) {
        return map[screenId].includes(role);
      }
    } catch (e) {}
  }
  const screen = APP_SCREENS.find((s) => s.id === screenId);
  return screen ? screen.defaultRoles.includes(role) : true;
};

