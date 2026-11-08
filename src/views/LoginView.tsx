import React, { useState, useEffect } from 'react';
import { Language, OrganizationInfo, UserRole } from '../types';
import { authService } from '../services/auth';
import { OrgLogo } from '../components/OrgLogo';
import {
  ShieldCheck,
  Lock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Globe,
  Users,
  Sparkles,
  Mail,
  UserCheck
} from 'lucide-react';

interface Props {
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  orgInfo: OrganizationInfo;
  onLoginSuccess: (role: UserRole) => void;
}

export const LoginView: React.FC<Props> = ({
  lang,
  onLanguageChange,
  orgInfo,
  onLoginSuccess
}) => {
  const [emailInput, setEmailInput] = useState('smdfaizel@gmail.com');
  const [allowedList, setAllowedList] = useState<{ email: string; name: string; role: UserRole; username: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<string | null>(null);

  useEffect(() => {
    authService.getAllowedEmails().then((list) => {
      setAllowedList(list);
    });
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessUser(null);

    try {
      const result = await authService.signInWithGoogle();
      if (result.success && result.session) {
        setSuccessUser(`${result.session.user.fullName} (${result.session.user.role})`);
        setTimeout(() => {
          onLoginSuccess(result.session!.user.role);
        }, 600);
      } else {
        setErrorMsg(result.error || 'Authentication failed. Email not authorized.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Sign-In failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAuthenticate = async (emailToVerify: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessUser(null);

    try {
      const result = await authService.verifyAndLogin(emailToVerify);
      if (result.success && result.session) {
        setSuccessUser(`${result.session.user.fullName} (${result.session.user.role})`);
        setTimeout(() => {
          onLoginSuccess(result.session!.user.role);
        }, 600);
      } else {
        setErrorMsg(result.error || 'Authentication failed. Email not authorized.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return lang === 'ta' ? 'முதன்மை நிர்வாகி' : 'Super Admin';
      case 'president':
        return lang === 'ta' ? 'தலைவர்' : 'President';
      case 'treasurer':
        return lang === 'ta' ? 'பொருளாளர்' : 'Treasurer';
      case 'secretary':
        return lang === 'ta' ? 'செயலாளர்' : 'General Secretary';
      case 'committee':
        return lang === 'ta' ? 'செயற்குழு உறுப்பினர்' : 'Committee';
      case 'auditor':
        return lang === 'ta' ? 'தணிக்கையாளர்' : 'Auditor';
      case 'member':
      default:
        return lang === 'ta' ? 'சந்தாதாரர்' : 'Member';
    }
  };

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col justify-between selection:bg-emerald-200">
      {/* Top Bar with Language Toggle */}
      <header className="px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-stone-200 bg-white">
        <div className="flex items-center gap-2.5">
          <OrgLogo orgInfo={orgInfo} size="sm" />
          <span className="font-extrabold text-sm sm:text-base text-stone-900 tracking-tight">
            {lang === 'ta' ? (orgInfo.nameTa || orgInfo.name) : (orgInfo.name || orgInfo.nameTa)}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs">
            <button
              onClick={() => onLanguageChange('ta')}
              className={`px-2.5 py-1 rounded-md font-bold text-xs transition ${lang === 'ta' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
            >
              தமிழ்
            </button>
            <button
              onClick={() => onLanguageChange('en')}
              className={`px-2.5 py-1 rounded-md font-bold text-xs transition ${lang === 'en' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-stone-600 hover:text-stone-900'
                }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="max-w-xl w-full bg-white rounded-3xl border border-stone-200 shadow-xl p-6 sm:p-8 space-y-6 animate-scale-up">

          {/* Header & Logo */}
          <div className="text-center space-y-2">
            <div className="inline-block p-1 bg-stone-50 rounded-2xl border border-stone-200 shadow-2xs">
              <OrgLogo orgInfo={orgInfo} size="lg" />
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                {lang === 'ta' ? 'கிராம சமுதாய பொது நிதி' : 'Community Welfare Trust'}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 font-medium">
                {lang === 'ta'
                  ? `${orgInfo.villageTa || orgInfo.village} • ${orgInfo.districtTa || orgInfo.district}`
                  : `${orgInfo.village || orgInfo.villageTa} • ${orgInfo.district || orgInfo.districtTa}`}
              </p>
            </div>

            {/* Restricted Access Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-900 border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
              <span>
                {lang === 'ta'
                  ? 'ஜிமெயில் சரிபார்க்கப்பட்ட உறுப்பினர்களுக்கு மட்டும்'
                  : 'Verified Gmail Members Only • RBAC Protected'}
              </span>
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-900 space-y-1.5 text-xs animate-shake">
              <div className="flex items-center gap-2 font-bold text-sm text-red-950">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{lang === 'ta' ? 'அனுமதி மறுக்கப்பட்டது (Access Denied)' : 'Authentication Failed'}</span>
              </div>
              <p className="leading-relaxed text-red-800">
                {errorMsg}
              </p>
              <div className="pt-1 text-[11px] text-red-700 font-medium">
                {lang === 'ta'
                  ? 'உங்களின் ஜிமெயில் முகவரியை சேர்க்க முதன்மை நிர்வாகி (smdfaizel@gmail.com) அவர்களை தொடர்பு கொள்ளவும்.'
                  : 'To request access, please contact Super Admin (smdfaizel@gmail.com) with your member ID.'}
              </div>
            </div>
          )}

          {/* Success Flash */}
          {successUser && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center gap-2.5 text-xs sm:text-sm animate-fade-in font-bold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                {lang === 'ta' ? 'சரிபார்க்கப்பட்டது: வருக ' : 'Authorized: Welcome '} {successUser}!
              </span>
            </div>
          )}

          {/* Google Sign-In Action */}
          <div className="space-y-4">
            {/* Primary Google Login Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-stone-50 active:bg-stone-100 border-2 border-stone-300 hover:border-stone-400 text-stone-800 font-extrabold text-sm sm:text-base flex items-center justify-center gap-3 transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {/* Google Official G Logo SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>
                {isLoading
                  ? (lang === 'ta' ? 'சரிபார்க்கிறது...' : 'Verifying with Google...')
                  : (lang === 'ta' ? 'ஜிமெயில் மூலம் உள்நுழைக' : 'Sign in with Google / Gmail')}
              </span>
            </button>

            {/* Email Address Input for Verification */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-xs font-bold text-stone-700">
                {lang === 'ta' ? 'சரிபார்க்க வேண்டிய ஜிமெயில் முகவரி:' : 'Enter Gmail Address to verify:'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-stone-300 text-xs sm:text-sm font-medium focus:ring-2 focus:ring-purple-600 focus:outline-none bg-stone-50"
                />
                <button
                  type="button"
                  onClick={() => handleAuthenticate(emailInput)}
                  disabled={isLoading || !emailInput.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition disabled:opacity-50"
                >
                  {lang === 'ta' ? 'சரிபார்' : 'Verify'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-stone-400 border-t border-stone-200 bg-white">
        <span>GramaNidhi • Transparent Rural Welfare & Diaspora Remittance Platform</span>
      </footer>
    </div>
  );
};
