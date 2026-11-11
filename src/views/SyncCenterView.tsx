import React, { useEffect, useState, useRef } from 'react';
import { SyncMutation, Language, UserRole } from '../types';
import { localDB } from '../services/storage';
import { getTranslation } from '../i18n/translations';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Database, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Layers,
  ArrowRight,
  FileSpreadsheet,
  FileJson,
  FolderDown,
  Check,
  FileText
} from 'lucide-react';

interface Props {
  lang: Language;
  activeRole: UserRole;
}

export const SyncCenterView: React.FC<Props> = ({ lang, activeRole }) => {
  const t = getTranslation(lang);
  const { isOnline, isSimulatedOffline, isSyncing, pendingCount, lastSyncedAt, lastError, toggleSimulatedOffline, syncNow } = useOnlineStatus();
  
  const [queue, setQueue] = useState<SyncMutation[]>([]);
  const [storageStats, setStorageStats] = useState({
    members: 0,
    dues: 0,
    payments: 0,
    assistance: 0,
    ledger: 0,
    audit: 0
  });
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Offline Financial Export State
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [selectedCsvType, setSelectedCsvType] = useState<'ledger' | 'payments' | 'assistance' | 'members'>('ledger');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const totalLocalRecords = 
    storageStats.members + 
    storageStats.dues + 
    storageStats.payments + 
    storageStats.assistance + 
    storageStats.ledger + 
    storageStats.audit;

  const loadQueue = async () => {
    const list = await localDB.getSyncQueue();
    setQueue(list);

    const m = await localDB.getMembers();
    const d = await localDB.getDues();
    const p = await localDB.getPayments();
    const a = await localDB.getAssistanceRequests();
    const l = await localDB.getLedger();
    const au = await localDB.getAuditLogs();

    setStorageStats({
      members: m.length,
      dues: d.length,
      payments: p.length,
      assistance: a.length,
      ledger: l.length,
      audit: au.length
    });
  };

  useEffect(() => {
    loadQueue();
    const unsub = localDB.subscribe(() => {
      loadQueue();
    });
    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    setSyncFeedback(lang === 'ta' ? 'ஒத்திசைவு தொடங்குகிறது...' : 'Starting sync batch...');
    const result = await syncNow();
    if (result.syncedCount > 0) {
      setSyncFeedback(
        lang === 'ta' 
          ? `வெற்றிகரமாக ${result.syncedCount} பதிவுகள் ஒத்திசைக்கப்பட்டன!` 
          : `Successfully synchronized ${result.syncedCount} queued mutations!`
      );
    } else {
      setSyncFeedback(lang === 'ta' ? 'காத்திருக்கும் பதிவுகள் ஏதுமில்லை.' : 'Queue was empty or already up-to-date.');
    }
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    setExportSuccess(null);
    const dateStr = new Date().toISOString().slice(0, 10);

    try {
      if (exportFormat === 'json') {
        const json = await localDB.exportAllData();
        const filename = `GramaNidhi_Full_Offline_Backup_${dateStr}.json`;
        triggerDownload(json, filename, 'application/json;charset=utf-8');
        await localDB.addAuditLog(
          activeRole,
          'MANUAL_BACKUP_JSON',
          'முழுத் தரவு JSON காப்புப் பிரதி எடுக்கப்பட்டது',
          `Manual offline backup exported as JSON (${totalLocalRecords} records across all collections)`,
          `முழு கிராம நிதித் தரவு JSON கோப்பாக கைமுறையாக பதிவிறக்கப்பட்டது (${totalLocalRecords} பதிவுகள்)`
        );
        setExportSuccess(lang === 'ta' ? `முழு காப்புப் பிரதி JSON கோப்பாக பதிவிறக்கப்பட்டது (${filename})` : `Full offline backup downloaded as JSON (${filename})`);
      } else {
        let csvContent = '';
        let filename = '';
        let desc = '';

        switch (selectedCsvType) {
          case 'ledger':
            csvContent = await localDB.exportLedgerToCSV();
            filename = `GramaNidhi_General_Ledger_${dateStr}.csv`;
            desc = `General Ledger spreadsheet (${storageStats.ledger} entries)`;
            break;
          case 'payments':
            csvContent = await localDB.exportPaymentsToCSV();
            filename = `GramaNidhi_Collections_Receipts_${dateStr}.csv`;
            desc = `Collections & Dues Receipts spreadsheet (${storageStats.payments} records)`;
            break;
          case 'assistance':
            csvContent = await localDB.exportAssistanceToCSV();
            filename = `GramaNidhi_Welfare_Disbursements_${dateStr}.csv`;
            desc = `Welfare Disbursements spreadsheet (${storageStats.assistance} requests)`;
            break;
          case 'members':
            csvContent = await localDB.exportMembersToCSV();
            filename = `GramaNidhi_Members_Directory_${dateStr}.csv`;
            desc = `Members Directory spreadsheet (${storageStats.members} members)`;
            break;
        }

        triggerDownload(csvContent, filename, 'text/csv;charset=utf-8;');
        await localDB.addAuditLog(
          activeRole,
          'FINANCIAL_DATA_EXPORT_CSV',
          'நிதித் தரவு CSV எக்செல் வடிவில் எடுக்கப்பட்டது',
          `Exported ${desc}`,
          `${desc} எக்செல்/CSV வடிவில் பதிவிறக்கம் செய்யப்பட்டது`
        );
        setExportSuccess(lang === 'ta' ? `${filename} வெற்றிகரமாக பதிவிறக்கப்பட்டது!` : `${filename} downloaded successfully!`);
      }
    } catch (err: any) {
      console.error(err);
      alert('Export failed: ' + err.message);
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportSuccess(null), 5000);
    }
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        await localDB.importAllData(text);
        alert(lang === 'ta' ? 'காப்புப் பிரதி வெற்றிகரமாக மீட்டெடுக்கப்பட்டது!' : 'Database restored successfully!');
      } catch (err: any) {
        alert('Invalid backup file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleResetDb = async () => {
    if (confirm(lang === 'ta' ? 'மாதிரி பதிவுகளை மீண்டும் மீட்டமைக்கவா?' : 'Reset to default seed village data?')) {
      await localDB.resetToSeed();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-stone-900">
              {lang === 'ta' ? 'ஆஃப்லைன் அவுட்பாக்ஸ் & ஒத்திசைவு மையம்' : 'Offline Engine & Sync Center'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              LOCAL-FIRST
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {lang === 'ta'
              ? 'இணையம் இல்லாத கிராமப்புற வயல்வெளிகளிலும் தடையின்றி இயங்கும் உள்ளூர் IndexedDB சேமிப்பகம் & ஒத்திசைவு வரிசை.'
              : 'Local-first architecture that guarantees zero data loss in remote rural areas with seamless cloud catchup.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sync Trigger */}
          <button
            onClick={handleManualSync}
            disabled={isSyncing || !isOnline || pendingCount === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? t.syncing : t.syncNow}</span>
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* Network State & Simulator Banner */}
      <div className={`p-5 rounded-2xl border transition ${
        isOnline ? 'bg-emerald-50/50 border-emerald-200' : 'bg-amber-50/70 border-amber-300'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
              isOnline ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
            }`}>
              {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-stone-900 text-sm">
                  {isOnline ? t.online : t.offline}
                </h3>
                {isSimulatedOffline && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                    SIMULATED OFFLINE
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-600 mt-1 max-w-xl">
                {isOnline
                  ? (lang === 'ta' ? 'அனைத்து புதிய பரிவர்த்தனைகளும் நிகழ்நேரத்தில் சரிபார்க்கப்பட்டு ஒத்திசைக்கப்படும்.' : 'Device is connected. Background sync automatically flushes queued field mutations every 15s.')
                  : (lang === 'ta' ? 'நீங்கள் தற்போது ஆஃப்லைனில் உள்ளீர்கள். புதிய வரவுகள் மற்றும் உதவிகள் உள்ளூர் சாதனத்தில் உடனடியாக சேமிக்கப்படும்; இணையம் வந்தவுடன் தானாக ஒத்திசைக்கப்படும்.' : 'Operating disconnected. You can safely record door-to-door dues and approve requests; they are stored locally and will sync once back online.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={toggleSimulatedOffline}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                isSimulatedOffline 
                  ? 'bg-emerald-700 hover:bg-emerald-800 text-white' 
                  : 'bg-white border border-stone-300 hover:bg-stone-50 text-stone-800'
              }`}
            >
              {isSimulatedOffline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isSimulatedOffline ? t.simulateOnline : t.simulateOffline}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Outbox Mutation Queue & How Idempotency Works */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Queue List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-700" />
              <h3 className="font-bold text-stone-900 text-sm">
                {t.syncQueueTitle}
              </h3>
            </div>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
              {queue.length} {lang === 'ta' ? 'பதிவுகள்' : 'items'}
            </span>
          </div>

          {queue.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-stone-800 text-xs">
                {lang === 'ta' ? 'அவுட்பாக்ஸ் வரிசை காலியாக உள்ளது' : 'Outbox Queue Clean'}
              </h4>
              <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                {lang === 'ta'
                  ? 'அனைத்து உள்ளூர் பரிவர்த்தனைகளும் சர்வரில் வெற்றிகரமாக ஒத்திசைக்கப்பட்டுள்ளன. "ஆஃப்லைனில் சோதிக்க" பொத்தானை அழுத்தி புதிய சந்தா பதிவு செய்து வரிசையைச் சோதிக்கலாம்.'
                  : 'All local field transactions are fully synchronized. Click "Simulate Offline" above and record a payment to see it queued in real-time.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
              {queue.map((m) => (
                <div key={m.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-stone-100 px-1.5 py-0.5 rounded text-stone-600">
                        {m.id.slice(0, 12)}...
                      </span>
                      <span className="font-bold text-stone-900 uppercase text-[11px]">
                        {m.operation} {m.entity}
                      </span>
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.2 rounded-full border border-amber-200">
                        {m.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-500 mt-1">
                      {m.entity === 'payment' && (
                        <span>
                          Payment: {m.payload.receiptNumber} — ₹{m.payload.amount} from {m.payload.memberName}
                        </span>
                      )}
                      {m.entity === 'assistance_request' && (
                        <span>
                          Assistance: {m.payload.beneficiaryName} — ₹{m.payload.requestedAmount} ({m.payload.category})
                        </span>
                      )}
                      {m.entity === 'approval' && (
                        <span>
                          Approval decision for Req: {m.payload.requestId} by {m.payload.reviewerName}
                        </span>
                      )}
                      {m.entity === 'payout' && (
                        <span>
                          Payout: {m.payload.payout?.payoutId} — ₹{m.payload.payout?.amount} to {m.payload.payout?.recipientName}
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] text-stone-400 mt-0.5">
                      Enqueued: {new Date(m.timestamp).toLocaleTimeString()} • Retries: {m.retries}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-emerald-700 font-semibold">Idempotency Guarded</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Technical Explanation Card */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-3 text-xs">
            <div className="flex items-center gap-2 text-stone-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>How Seamless Sync Works</span>
            </div>
            
            <p className="text-stone-600 text-[11px] leading-relaxed">
              When a treasurer collects dues in remote spots with no cell reception:
            </p>

            <div className="space-y-2 text-[11px] text-stone-700">
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <strong>1. Client-Side Idempotency:</strong> Every entry receives a cryptographic UUID and local receipt number immediately.
              </div>
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <strong>2. Optimistic Ledger:</strong> Running balances update on-screen instantly so the treasurer never overspends.
              </div>
              <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                <strong>3. Automated Reconnection Flush:</strong> As soon as the mobile catches 3G/4G or Wi-Fi, the outbox replays actions in chronological order.
              </div>
            </div>
          </div>

          {/* Local Storage Health */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-stone-900">
                <Database className="w-4 h-4 text-emerald-700" />
                <span>{t.dbHealth}</span>
              </div>
              <span className="text-[11px] font-mono font-bold text-emerald-800">
                {totalLocalRecords} records
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600">
              <div className="p-2 bg-stone-50 rounded-lg">Members: <strong>{storageStats.members}</strong></div>
              <div className="p-2 bg-stone-50 rounded-lg">Monthly Dues: <strong>{storageStats.dues}</strong></div>
              <div className="p-2 bg-stone-50 rounded-lg">Receipts: <strong>{storageStats.payments}</strong></div>
              <div className="p-2 bg-stone-50 rounded-lg">Ledger Rows: <strong>{storageStats.ledger}</strong></div>
              <div className="p-2 bg-stone-50 rounded-lg">Assistance: <strong>{storageStats.assistance}</strong></div>
              <div className="p-2 bg-stone-50 rounded-lg">Audit Logs: <strong>{storageStats.audit}</strong></div>
            </div>

            {/* Zero Cost Self-Hosted Backup & Restore */}
            <div className="pt-2 border-t border-stone-100 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleRestoreFile}
                  accept=".json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold text-xs transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{t.restoreDatabase}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetDb}
                  className="px-3 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-600 text-xs transition"
                  title="Reset Demo Data"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Offline Financial Data Export & Manual Backup Workbench */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 flex-shrink-0">
              <FolderDown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-stone-900">
                  {lang === 'ta' ? 'ஆஃப்லைன் நிதித் தரவு ஏற்றுமதி & காப்புப் பிரதி' : 'Offline Financial Data Export & Manual Backup'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {lang === 'ta' ? 'இணையம் தேவையில்லை' : '100% OFFLINE'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-1 max-w-2xl">
                {lang === 'ta'
                  ? 'உங்கள் சாதனத்தின் உள்ளூர் சேமிப்பகத்தில் (IndexedDB) உள்ள நிதிப் பதிவேடுகள், சந்தா ரசீதுகள் மற்றும் உறுப்பினர் விபரங்களை எக்செல் (CSV) அல்லது முழு கணினி காப்புப் பிரதியாக (JSON) உடனடி பதிவிறக்கம் செய்யலாம். பென்டிரைவ் அல்லது தனி கணினியில் பாதுகாப்பாக சேமிக்கலாம்.'
                  : 'Instantly download manual copies of all financial books, receipts, and member registers directly from device storage (IndexedDB). Zero internet required — ideal for weekly offline ledger preservation and external USB backups.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <span className="text-xs font-mono text-stone-600 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
              {totalLocalRecords} {lang === 'ta' ? 'உள்ளூர் பதிவுகள்' : 'records in IndexedDB'}
            </span>
          </div>
        </div>

        {/* Live Export Success Feedback */}
        {exportSuccess && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between gap-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{exportSuccess}</span>
            </div>
            <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded font-mono">
              Saved to Downloads
            </span>
          </div>
        )}

        {/* Format Selector Tabs */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
            {lang === 'ta' ? '1. காப்புப் பிரதி வடிவத்தைத் தேர்ந்தெடுக்கவும் (Format)' : '1. Select Backup Format'}
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* JSON Option */}
            <button
              type="button"
              onClick={() => setExportFormat('json')}
              className={`p-4 rounded-xl border text-left transition relative flex items-start gap-3.5 ${
                exportFormat === 'json'
                  ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                  : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50'
              }`}
            >
              <div className={`p-2 rounded-lg ${exportFormat === 'json' ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'}`}>
                <FileJson className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-900">
                    {lang === 'ta' ? 'முழு கணினி காப்புப் பிரதி (.json)' : 'Full System Database Snapshot (.json)'}
                  </span>
                  {exportFormat === 'json' && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  {lang === 'ta'
                    ? 'அனைத்து 9 அட்டவணைகள் (உறுப்பினர்கள், சந்தா, ரசீதுகள், லெட்ஜர், தணிக்கை). வேறொரு கணினியில் மீண்டும் மீட்டெடுக்க சிறந்தது.'
                    : 'Complete disaster recovery snapshot of all 9 stores. Can be re-imported into any new device or browser.'}
                </p>
                <div className="mt-2 text-[11px] font-mono text-emerald-800 font-semibold">
                  All {totalLocalRecords} records included
                </div>
              </div>
            </button>

            {/* CSV Option */}
            <button
              type="button"
              onClick={() => setExportFormat('csv')}
              className={`p-4 rounded-xl border text-left transition relative flex items-start gap-3.5 ${
                exportFormat === 'csv'
                  ? 'border-emerald-600 bg-emerald-50/40 ring-1 ring-emerald-600'
                  : 'border-stone-200 bg-stone-50/50 hover:bg-stone-50'
              }`}
            >
              <div className={`p-2 rounded-lg ${exportFormat === 'csv' ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-700'}`}>
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-stone-900">
                    {lang === 'ta' ? 'எக்செல் / விரிதாள் அறிக்கைகள் (.csv)' : 'Excel / Spreadsheet Reports (.csv)'}
                  </span>
                  {exportFormat === 'csv' && <Check className="w-4 h-4 text-emerald-600" />}
                </div>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                  {lang === 'ta'
                    ? 'Microsoft Excel & Google Sheets-ல் திறக்கக்கூடிய விரிதாள். UTF-8 BOM தமிழ் எழுத்துரு பிழையின்றி தெளிவாக தெரியும்.'
                    : 'Universal spreadsheet format with UTF-8 BOM encoding. Opens flawlessly in Microsoft Excel with Tamil font support.'}
                </p>
                <div className="mt-2 text-[11px] font-mono text-emerald-800 font-semibold">
                  Audited financial ledgers & receipts
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* CSV Sub-options */}
        {exportFormat === 'csv' && (
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-stone-800 uppercase tracking-wider block">
              {lang === 'ta' ? '2. விரிதாள் தொகுப்பைத் தேர்ந்தெடுக்கவும்' : '2. Select Financial Dataset to Export'}
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Ledger */}
              <button
                type="button"
                onClick={() => setSelectedCsvType('ledger')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  selectedCsvType === 'ledger'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-stone-900">
                      {lang === 'ta' ? 'பொது வரவு-செலவு லெட்ஜர்' : 'General Ledger'}
                    </span>
                    {selectedCsvType === 'ledger' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-stone-500">
                    {lang === 'ta' ? 'இரட்டைப் பதிவு, இருப்புத் தொகை (INR & AED)' : 'Double-entry debits, credits, running balance'}
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-mono font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded w-fit">
                  {storageStats.ledger} {lang === 'ta' ? 'வரிசைகள்' : 'rows'}
                </div>
              </button>

              {/* Payments */}
              <button
                type="button"
                onClick={() => setSelectedCsvType('payments')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  selectedCsvType === 'payments'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-stone-900">
                      {lang === 'ta' ? 'சந்தா & வரவு ரசீதுகள்' : 'Collections & Receipts'}
                    </span>
                    {selectedCsvType === 'payments' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-stone-500">
                    {lang === 'ta' ? 'ரசீது எண், உறுப்பினர் பெயர், வார்டு, செலுத்திய முறை' : 'Receipt #, member name, ward, cash/UPI'}
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-mono font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded w-fit">
                  {storageStats.payments} {lang === 'ta' ? 'ரசீதுகள்' : 'receipts'}
                </div>
              </button>

              {/* Assistance */}
              <button
                type="button"
                onClick={() => setSelectedCsvType('assistance')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  selectedCsvType === 'assistance'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-stone-900">
                      {lang === 'ta' ? 'நலத்திட்ட உதவிகள்' : 'Welfare Assistance'}
                    </span>
                    {selectedCsvType === 'assistance' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-stone-500">
                    {lang === 'ta' ? 'மருத்துவம்/கல்வி உதவிகள், ஒப்புதல், பட்டுவாடா' : 'Emergency aid, beneficiary details, status'}
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-mono font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded w-fit">
                  {storageStats.assistance} {lang === 'ta' ? 'கோரிக்கைகள்' : 'requests'}
                </div>
              </button>

              {/* Members */}
              <button
                type="button"
                onClick={() => setSelectedCsvType('members')}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                  selectedCsvType === 'members'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-1 ring-emerald-600'
                    : 'border-stone-200 hover:bg-stone-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-stone-900">
                      {lang === 'ta' ? 'உறுப்பினர்கள் விபரம்' : 'Members Directory'}
                    </span>
                    {selectedCsvType === 'members' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] text-stone-500">
                    {lang === 'ta' ? 'தந்தை பெயர், தொலைபேசி, வார்டு, AED வாக்குறுதி' : 'Contact directory, ward, AED monthly pledge'}
                  </p>
                </div>
                <div className="mt-3 text-[10px] font-mono font-bold text-stone-700 bg-stone-100 px-2 py-0.5 rounded w-fit">
                  {storageStats.members} {lang === 'ta' ? 'உறுப்பினர்கள்' : 'members'}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Action Button & Security Assurance */}
        <div className="pt-4 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-stone-500 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
            <span>
              {lang === 'ta'
                ? 'அனைத்து தரவுகளும் உங்கள் உலாவி IndexedDB-ல் இருந்து நேரடியாக ஏற்றுமதி செய்யப்படுகிறது.'
                : '100% local export generated directly from browser IndexedDB. Zero cloud latency.'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleExportData}
            disabled={isExporting}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
          >
            {isExporting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {isExporting
                ? (lang === 'ta' ? 'ஏற்றுமதி செய்யப்படுகிறது...' : 'Exporting...')
                : exportFormat === 'json'
                ? (lang === 'ta' ? 'முழு JSON காப்புப் பிரதியை பதிவிறக்கு' : 'Download Complete Backup (.json)')
                : (lang === 'ta' ? 'தேர்ந்தெடுத்த CSV விரிதாளை பதிவிறக்கு' : `Download ${selectedCsvType.toUpperCase()} (.csv)`)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
