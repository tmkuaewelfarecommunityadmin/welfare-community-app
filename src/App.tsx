/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Language, UserRole, PaymentReceipt, OrganizationInfo, DEFAULT_ORG_INFO, AuthSession } from './types';
import { localDB } from './services/storage';
import { authService } from './services/auth';
import { testFirestoreConnection } from './services/firebase';
import { getTranslation } from './i18n/translations';
import { Navbar } from './components/Navbar';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ReceiptModal } from './components/ReceiptModal';
import { ArchitectureAnalysisModal } from './components/ArchitectureAnalysisModal';
import { OrgSettingsModal } from './components/OrgSettingsModal';

import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { ContributionsView } from './views/ContributionsView';
import { AssistanceView } from './views/AssistanceView';
import { LedgerView } from './views/LedgerView';
import { MembersView } from './views/MembersView';
import { UserManagementView } from './views/UserManagementView';
import { SyncCenterView } from './views/SyncCenterView';
import { AuditLogsView } from './views/AuditLogsView';
import { FinancialAmendmentsView } from './views/FinancialAmendmentsView';
import { ScreenConfigView, canAccessScreen } from './views/ScreenConfigView';

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('gramanidhi_lang') as Language) || 'ta';
  });

  const [activeRole, setActiveRole] = useState<UserRole>(() => {
    return (localStorage.getItem('gramanidhi_role') as UserRole) || 'treasurer';
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);
  const [showAnalysisModal, setShowAnalysisModal] = useState<boolean>(false);

  // Quick action states
  const [isNewAssistanceOpen, setIsNewAssistanceOpen] = useState(false);
  const [paymentModalMemberId, setPaymentModalMemberId] = useState<string | null>(null);

  // Organization Branding & Logo state
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo>(DEFAULT_ORG_INFO);
  const [showOrgSettings, setShowOrgSettings] = useState<boolean>(false);

  useEffect(() => {
    localStorage.setItem('gramanidhi_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('gramanidhi_role', activeRole);
  }, [activeRole]);

  useEffect(() => {
    testFirestoreConnection();
  }, []);

  useEffect(() => {
    const loadOrg = async () => {
      const info = await localDB.getOrganizationInfo();
      setOrgInfo(info);
      const titleName = lang === 'ta' ? (info.nameTa || info.name) : (info.name || info.nameTa);
      const titleLoc = lang === 'ta' ? (info.villageTa || info.village) : (info.village || info.villageTa);
      document.title = `${titleName} - ${titleLoc}`;
    };
    loadOrg();
    const unsub = localDB.subscribe(() => {
      loadOrg();
    });
    return () => unsub();
  }, [lang]);

  const handleSaveOrgInfo = async (newInfo: OrganizationInfo) => {
    await localDB.saveOrganizationInfo(newInfo);
    setOrgInfo(newInfo);
    const titleName = lang === 'ta' ? (newInfo.nameTa || newInfo.name) : (newInfo.name || newInfo.nameTa);
    const titleLoc = lang === 'ta' ? (newInfo.villageTa || newInfo.village) : (newInfo.village || newInfo.villageTa);
    document.title = `${titleName} - ${titleLoc}`;
  };

  const t = getTranslation(lang);

  const handlePayForMember = (memberId: string) => {
    setPaymentModalMemberId(memberId);
    setActiveTab('contributions');
  };

  const handleRecordPaymentFromDash = () => {
    setPaymentModalMemberId('m1');
    setActiveTab('contributions');
  };

  const handleNewAssistanceFromDash = () => {
    setActiveTab('assistance');
    setIsNewAssistanceOpen(true);
  };

  // Authentication Session (Google / Gmail Verified)
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => authService.getSession());

  useEffect(() => {
    const unsub = authService.subscribe((sess) => {
      setAuthSession(sess);
      if (sess?.user?.role) {
        setActiveRole(sess.user.role);
      }
    });
    return () => unsub();
  }, []);

  const handleLoginSuccess = (role: UserRole) => {
    setActiveRole(role);
  };

  const handleLogout = () => {
    authService.logout();
    setAuthSession(null);
  };

  // If user is not authenticated with an allowed Gmail address, show LoginView
  if (!authSession) {
    return (
      <LoginView
        lang={lang}
        onLanguageChange={setLang}
        orgInfo={orgInfo}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // Current Member ID resolution for logged-in user or active role
  const [currentMemberId, setCurrentMemberId] = useState<string>('m6');

  useEffect(() => {
    if (authSession?.user?.memberId) {
      setCurrentMemberId(authSession.user.memberId);
    } else {
      localDB.getMembers().then((mems) => {
        if (activeRole === 'member') {
          const m = mems.find((x) => x.role === 'member') || mems[0];
          if (m) setCurrentMemberId(m.id);
        } else {
          const m = mems.find((x) => x.role === activeRole) || mems[0];
          if (m) setCurrentMemberId(m.id);
        }
      });
    }
  }, [authSession, activeRole]);

  // Guard role permissions strictly with dynamic screen access
  useEffect(() => {
    if (!canAccessScreen(activeTab, activeRole)) {
      setActiveTab('dashboard');
    }
  }, [activeRole, activeTab]);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col text-stone-900 font-sans selection:bg-emerald-200">
      {/* Offline Status & Sync Alert Bar */}
      <OfflineIndicator lang={lang} />

      {/* Main App Navigation Bar */}
      <Navbar
        lang={lang}
        onLanguageChange={setLang}
        activeRole={activeRole}
        onRoleChange={setActiveRole}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAnalysis={() => setShowAnalysisModal(true)}
        orgInfo={orgInfo}
        onOpenOrgSettings={() => {
          if (activeRole === 'admin') {
            setShowOrgSettings(true);
          }
        }}
        authEmail={authSession.email}
        onLogout={handleLogout}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            lang={lang}
            activeRole={activeRole}
            currentMemberId={currentMemberId}
            onNavigate={setActiveTab}
            onRecordPaymentClick={handleRecordPaymentFromDash}
            onNewAssistanceClick={handleNewAssistanceFromDash}
            onViewReceipt={setSelectedReceipt}
          />
        )}

        {activeTab === 'contributions' && (
          <ContributionsView
            lang={lang}
            activeRole={activeRole}
            currentMemberId={currentMemberId}
            onViewReceipt={setSelectedReceipt}
            openPaymentModalForMember={paymentModalMemberId}
            onClearPaymentModalForMember={() => setPaymentModalMemberId(null)}
          />
        )}

        {activeTab === 'assistance' && (
          <AssistanceView
            lang={lang}
            activeRole={activeRole}
            isCreateModalOpen={isNewAssistanceOpen}
            onCloseCreateModal={() => setIsNewAssistanceOpen(false)}
          />
        )}

        {activeTab === 'ledger' && (
          <LedgerView
            lang={lang}
            activeRole={activeRole}
          />
        )}

        {activeTab === 'members' && (
          <MembersView
            lang={lang}
            activeRole={activeRole}
            onPayForMember={handlePayForMember}
          />
        )}

        {activeTab === 'users' && (
          <UserManagementView
            lang={lang}
            activeRole={activeRole}
            onRoleChange={setActiveRole}
            onNavigate={setActiveTab}
            onOpenOrgSettings={() => {
              if (activeRole === 'admin') {
                setShowOrgSettings(true);
              }
            }}
          />
        )}

        {activeTab === 'sync' && (
          <SyncCenterView
            lang={lang}
            activeRole={activeRole}
          />
        )}

        {activeTab === 'audit' && (
          <AuditLogsView
            lang={lang}
            activeRole={activeRole}
          />
        )}

        {activeTab === 'amendments' && (
          <FinancialAmendmentsView
            lang={lang}
            activeRole={activeRole}
          />
        )}

        {activeTab === 'screen_config' && (
          <ScreenConfigView
            lang={lang}
            activeRole={activeRole}
            onNavigate={setActiveTab}
          />
        )}
      </main>

      {/* Digital & Printable Receipt Modal */}
      {selectedReceipt && (
        <ReceiptModal
          receipt={selectedReceipt}
          lang={lang}
          orgInfo={orgInfo}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

      {/* Architecture Review & Suggestions Modal */}
      {showAnalysisModal && (
        <ArchitectureAnalysisModal
          lang={lang}
          onClose={() => setShowAnalysisModal(false)}
        />
      )}

      {/* Organization Branding & Custom Logo Modal - Super Admin Only */}
      {activeRole === 'admin' && (
        <OrgSettingsModal
          isOpen={showOrgSettings}
          onClose={() => setShowOrgSettings(false)}
          lang={lang}
          currentInfo={orgInfo}
          onSave={handleSaveOrgInfo}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 mt-12 py-6 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-stone-800">
              {lang === 'ta' ? (orgInfo.nameTa || orgInfo.name) : (orgInfo.name || orgInfo.nameTa)}
            </span>
            <span>•</span>
            <span>
              {lang === 'ta' 
                ? `${orgInfo.villageTa || orgInfo.village} (${orgInfo.districtTa || orgInfo.district})` 
                : `${orgInfo.village || orgInfo.villageTa} (${orgInfo.district || orgInfo.districtTa})`}
            </span>
            {orgInfo.regNumber && (
              <>
                <span>•</span>
                <span className="font-mono text-stone-400 text-[10px]">{orgInfo.regNumber}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setShowOrgSettings(true)}
              className="text-emerald-800 hover:underline font-semibold"
            >
              {lang === 'ta' ? 'லோகோ & தலைப்பை மாற்று' : 'Customize Logo & Title'}
            </button>
            <span>•</span>
            <button
              onClick={() => setShowAnalysisModal(true)}
              className="text-stone-600 hover:underline font-medium"
            >
              {lang === 'ta' ? 'கட்டமைப்பு திருத்தங்கள்' : 'Architecture Blueprint'}
            </button>
            <span>•</span>
            <span>Local-First PWA • 100% Offline Capable</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
