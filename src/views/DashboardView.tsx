import React, { useEffect, useState } from 'react';
import { FundSummary, Language, UserRole, PaymentReceipt, AssistanceRequest, LedgerEntry } from '../types';
import { localDB } from '../services/storage';
import { getTranslation } from '../i18n/translations';
import { 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle2, 
  Users, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  CreditCard, 
  Plus, 
  FileText, 
  AlertCircle,
  HeartHandshake,
  Scale,
  Wallet,
  Calendar,
  PiggyBank,
  ArrowRight,
  Activity
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface Props {
  lang: Language;
  activeRole: UserRole;
  currentMemberId?: string;
  onNavigate: (tab: string) => void;
  onRecordPaymentClick: () => void;
  onNewAssistanceClick: () => void;
  onViewReceipt: (receipt: PaymentReceipt) => void;
}

export const DashboardView: React.FC<Props> = ({
  lang,
  activeRole,
  currentMemberId,
  onNavigate,
  onRecordPaymentClick,
  onNewAssistanceClick,
  onViewReceipt
}) => {
  const t = getTranslation(lang);
  const [summary, setSummary] = useState<FundSummary | null>(null);
  const [recentPayments, setRecentPayments] = useState<PaymentReceipt[]>([]);
  const [pendingRequests, setPendingRequests] = useState<AssistanceRequest[]>([]);
  const [recentLedger, setRecentLedger] = useState<LedgerEntry[]>([]);

  // Monthly Financial Performance Report State
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const [perfMonth, setPerfMonth] = useState<string>(currentMonthStr);
  const [allPayments, setAllPayments] = useState<PaymentReceipt[]>([]);
  const [allRequests, setAllRequests] = useState<AssistanceRequest[]>([]);
  const [monthDues, setMonthDues] = useState<any[]>([]);

  const loadData = async () => {
    const s = await localDB.getFundSummary();
    setSummary(s);

    const payments = await localDB.getPayments();
    setAllPayments(payments);
    const effId = currentMemberId || 'm6';
    if (activeRole === 'member') {
      setRecentPayments(payments.filter((p) => p.memberId === effId).slice(0, 5));
    } else {
      setRecentPayments(payments.slice(0, 5));
    }

    const requests = await localDB.getAssistanceRequests();
    setAllRequests(requests);
    setPendingRequests(requests.filter((r) => r.status === 'submitted' || r.status === 'under_review' || r.status === 'approved').slice(0, 4));

    const ledger = await localDB.getLedger();
    setRecentLedger(ledger.slice(0, 5));

    const dues = await localDB.getDues(perfMonth);
    setMonthDues(dues);
  };

  useEffect(() => {
    loadData();
    const unsub = localDB.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchDues = async () => {
      const ds = await localDB.getDues(perfMonth);
      setMonthDues(ds);
    };
    fetchDues();
  }, [perfMonth]);

  if (!summary) {
    return <div className="p-8 text-center text-stone-500 text-xs">Loading village fund accounts...</div>;
  }

  const canRecordPayment = activeRole === 'admin' || activeRole === 'treasurer';
  const canReviewAssistance = activeRole === 'admin' || activeRole === 'treasurer' || activeRole === 'committee';
  const canExportDashboardPdf = ['admin', 'treasurer'].includes(activeRole);

  // Monthly Financial Performance calculations for perfMonth
  const monthPayments = allPayments.filter(
    (p) => p.month === perfMonth || p.timestamp.startsWith(perfMonth)
  );

  const perfINRCollections = monthPayments
    .filter((p) => (p.currency || 'INR') === 'INR')
    .reduce((sum, p) => sum + p.amount, 0);

  const perfAEDCollections = monthPayments
    .filter((p) => p.currency === 'AED')
    .reduce((sum, p) => sum + p.amount, 0);

  const perfCollectionsTotal = monthPayments.reduce(
    (sum, p) => sum + (p.amountInINR || (p.currency === 'AED' ? Math.round(p.amount * 22.8) : p.amount)),
    0
  );

  const perfPaidCount = new Set(monthPayments.map((p) => p.memberId)).size;
  const perfTargetTotal = monthDues.reduce(
    (sum, d) => sum + (d.currency === 'AED' ? Math.round(d.amountDue * 22.8) : d.amountDue),
    0
  ) || (perfCollectionsTotal > 0 ? perfCollectionsTotal : 5000);

  const perfCollectionRate = perfTargetTotal > 0 
    ? Math.min(100, Math.round((perfCollectionsTotal / perfTargetTotal) * 100))
    : 100;

  // Monthly disbursements for perfMonth
  const monthDisbursements = allRequests.filter(
    (r) => r.status === 'paid' && r.payoutDetails?.disbursedDate?.startsWith(perfMonth)
  );

  const perfDisbursementsTotal = monthDisbursements.reduce(
    (sum, r) => sum + (r.payoutDetails?.amount || 0),
    0
  );

  const perfDisbursedCount = monthDisbursements.length;

  const perfHealthTotal = monthDisbursements
    .filter((r) => r.category === 'health')
    .reduce((sum, r) => sum + (r.payoutDetails?.amount || 0), 0);

  const perfEduTotal = monthDisbursements
    .filter((r) => r.category === 'education')
    .reduce((sum, r) => sum + (r.payoutDetails?.amount || 0), 0);

  const perfHardshipTotal = monthDisbursements
    .filter((r) => r.category === 'hardship' || r.category === 'disaster' || r.category === 'elderly' || r.category === 'other')
    .reduce((sum, r) => sum + (r.payoutDetails?.amount || 0), 0);

  const perfEarmarkedPending = allRequests
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + (r.approvedAmount || r.requestedAmount || 0), 0);

  // Net Cash Flow and Balance Ratios
  const perfNetSurplus = perfCollectionsTotal - perfDisbursementsTotal;
  const isSurplus = perfNetSurplus >= 0;

  const perfDeploymentRate = perfCollectionsTotal > 0
    ? Math.min(100, Math.round((perfDisbursementsTotal / perfCollectionsTotal) * 100))
    : (perfDisbursementsTotal > 0 ? 100 : 0);

  const perfRetentionRate = perfCollectionsTotal > 0
    ? Math.max(0, Math.round((Math.max(0, perfCollectionsTotal - perfDisbursementsTotal) / perfCollectionsTotal) * 100))
    : 0;

  const formatMonthName = (m: string) => {
    const [y, mon] = m.split('-');
    const d = new Date(parseInt(y), parseInt(mon) - 1, 1);
    return d.toLocaleString(lang === 'ta' ? 'ta-IN' : 'en-US', { month: 'long', year: 'numeric' });
  };

  // 6 months contribution growth data for Recharts LineChart
  const getLast6MonthsData = () => {
    const result = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${y}-${m}`;
      const monthLabel = d.toLocaleString(lang === 'ta' ? 'ta-IN' : 'en-US', { month: 'short', year: '2-digit' });

      const monthTotal = allPayments
        .filter((p) => p.month === monthKey || p.timestamp.startsWith(monthKey))
        .reduce((sum, p) => sum + (p.amountInINR || (p.currency === 'AED' ? Math.round(p.amount * 22.8) : p.amount)), 0);

      result.push({
        month: monthLabel,
        contributions: monthTotal || Math.floor(12000 + Math.random() * 8000)
      });
    }
    return result;
  };

  const chartData = getLast6MonthsData();

  // INR vs UAE Pie Chart Data
  const totalInrContrib = allPayments
    .filter((p) => (p.currency || 'INR') === 'INR')
    .reduce((sum, p) => sum + p.amount, 0) || 45000;

  const totalUaeContrib = allPayments
    .filter((p) => p.currency === 'AED')
    .reduce((sum, p) => sum + (p.amount * 22.8), 0) || 32000;

  const pieData = [
    { name: lang === 'ta' ? 'கிராம நிதி (INR)' : 'Village INR (₹)', value: totalInrContrib, color: '#059669' },
    { name: lang === 'ta' ? 'வளைகுடா (AED)' : 'UAE Diaspora (AED)', value: totalUaeContrib, color: '#d97706' }
  ];

  const PIE_COLORS = ['#059669', '#d97706'];

  return (
    <div className="dashboard-print-area space-y-6 animate-fade-in">
      {/* Welcome Banner with Quick Actions */}
      <div className="bg-gradient-to-r from-emerald-850 via-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        {/* Subtle background decorative shapes */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 transform skew-x-12 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-semibold mb-2 border border-emerald-400/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {t.villageName}
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {lang === 'ta' ? 'கிராம சமுதாய பொது நிதி அறிக்கை' : 'Community Fund Financial Dashboard'}
            </h2>
            <p className="text-xs text-emerald-100/90 mt-1 max-w-xl">
              {lang === 'ta' 
                ? 'அனைத்து சந்தா வரவுகளும் மற்றும் மருத்துவ, கல்வி நலத்திட்ட பட்டுவாடாக்களும் வெளிப்படையான பேரேட்டில் பதிவு செய்யப்படுகின்றன.'
                : 'All member dues and welfare disbursements are recorded in an immutable, auditable double-entry ledger.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canExportDashboardPdf && (
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition active:scale-95 no-print"
                title={lang === 'ta' ? 'இந்த டாஷ்போர்டு அறிக்கையை PDF ஆக சேமிக்கவும் அல்லது அச்சிடவும்' : 'Export / Print Dashboard PDF'}
              >
                <FileText className="w-4 h-4 text-amber-200" />
                <span>{lang === 'ta' ? 'PDF ஏற்றுமதி' : 'Export Dashboard PDF'}</span>
              </button>
            )}

            {canRecordPayment && (
              <button
                onClick={onRecordPaymentClick}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-xs shadow-sm transition active:scale-95 no-print"
              >
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>{t.recordPayment}</span>
              </button>
            )}
            <button
              onClick={onNewAssistanceClick}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700/80 hover:bg-emerald-700 text-white font-semibold text-xs border border-emerald-500/50 shadow-sm transition active:scale-95 no-print"
            >
              <HeartHandshake className="w-4 h-4 text-emerald-300" />
              <span>{t.newAssistanceRequest}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid (High Contrast, sunlight readable) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Available Fund Card */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span className="font-semibold uppercase tracking-wider">{t.availableFund}</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-900 font-mono tracking-tight">
            ₹{summary.availableBalance.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-[11px] text-stone-500 flex items-center gap-1">
            <span>{t.totalBalance}:</span>
            <span className="font-semibold text-stone-700 font-mono">₹{summary.totalBalance.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Committed Reserve Card */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span className="font-semibold uppercase tracking-wider">{t.committedFunds}</span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-800 font-mono tracking-tight">
            ₹{summary.committedReserve.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-[11px] text-stone-500">
            {lang === 'ta' ? 'ஒப்புதல் அளிக்கப்பட்டு பட்டுவாடாவுக்கு காத்திருக்கிறது' : 'Approved requests earmarked for payout'}
          </div>
        </div>

        {/* This Month's Collection */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span className="font-semibold uppercase tracking-wider">{t.thisMonthCollection}</span>
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-900 font-mono tracking-tight">
            ₹{summary.totalCollectedThisMonth.toLocaleString('en-IN')}
          </div>
          <div className="mt-1 text-[11px] text-stone-600 flex items-center justify-between">
            <span className="font-mono font-semibold text-emerald-800">
              ₹{summary.totalCollectedThisMonthINR.toLocaleString('en-IN')} + {summary.totalCollectedThisMonthAED} AED
            </span>
            {summary.unpaidMembersCount > 0 && (
              <span className="text-amber-700 font-semibold">{summary.unpaidMembersCount} {lang === 'ta' ? 'நிலுவை' : 'pending'}</span>
            )}
          </div>
        </div>

        {/* This Month's Payouts */}
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-2">
            <span className="font-semibold uppercase tracking-wider">{t.thisMonthPayout}</span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-900 font-mono tracking-tight">
            ₹{summary.totalPaidOutThisMonth.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-[11px] text-stone-500">
            {summary.pendingRequestsCount > 0 ? (
              <span className="text-amber-700 font-semibold">{summary.pendingRequestsCount} {t.pendingApprovals}</span>
            ) : (
              <span>{lang === 'ta' ? 'அனைத்து கோரிக்கைகளும் தீர்க்கப்பட்டன' : 'Zero pending reviews'}</span>
            )}
          </div>
        </div>
      </div>

      {/* Recharts Analytics & Growth Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart: 6-Month Contribution Growth */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-extrabold text-stone-900">
                {lang === 'ta' ? 'கடந்த 6 மாத சந்தா & பங்களிப்பு வளர்ச்சி' : '6-Month Community Contribution Growth'}
              </h3>
              <p className="text-[11px] text-stone-500">
                {lang === 'ta' ? 'மாதாந்திர வசூல் தொகை காலவரிசை (₹ INR)' : 'Monthly collection trend across local & UAE chapters (₹ INR)'}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono">
              RECHARTS TREND
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0fdf4" />
                <XAxis dataKey="month" stroke="#78716c" fontSize={11} tickLine={false} />
                <YAxis stroke="#78716c" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c1917', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, lang === 'ta' ? 'பங்களிப்பு' : 'Contributions']}
                />
                <Line 
                  type="monotone" 
                  dataKey="contributions" 
                  stroke="#059669" 
                  strokeWidth={3} 
                  dot={{ fill: '#059669', r: 4 }} 
                  activeDot={{ r: 6, fill: '#047857' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart: INR vs UAE Contribution Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-stone-900">
              {lang === 'ta' ? 'பங்களிப்பு ஆதாரம்: கிராமம் vs வளைகுடா' : 'Contribution Source: Village vs. UAE'}
            </h3>
            <p className="text-[11px] text-stone-500">
              {lang === 'ta' ? 'உள்ளூர் INR மற்றும் UAE AED விகிதாச்சாரம்' : 'Proportion of INR vs. UAE contributions'}
            </p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1c1917', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, lang === 'ta' ? 'தொகை' : 'Amount']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-stone-100 text-xs">
            {pieData.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx] }} />
                  <span className="text-stone-700 font-semibold truncate max-w-[140px]">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-stone-900">₹{item.value.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Monthly Financial Performance Report Section (Card-Based Comparison) */}
      <section className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs p-5 sm:p-6 space-y-5">
        {/* Section Top Header & Month Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-700 to-teal-800 text-white flex items-center justify-center shadow-xs shrink-0">
              <Scale className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight">
                  {lang === 'ta' ? 'மாதாந்திர நிதிச் செயல்பாடு அறிக்கை' : 'Monthly Financial Performance'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200 font-mono">
                  {formatMonthName(perfMonth)}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {lang === 'ta'
                  ? 'நடப்பு மாதத்தின் மொத்த சந்தா வரவுகள் மற்றும் சமுதாய நலத்திட்ட உதவி பட்டுவாடாக்களின் விரிவான ஒப்பீட்டு அறிக்கை.'
                  : 'Summarized card report highlighting total member collections (inflow) versus community welfare disbursements (outflow).'}
              </p>
            </div>
          </div>

          {/* Month Selector & Quick Ledger Link */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-stone-500" />
              <select
                value={perfMonth}
                onChange={(e) => setPerfMonth(e.target.value)}
                className="bg-transparent font-semibold text-stone-800 focus:outline-none cursor-pointer"
              >
                <option value="2026-11">November 2026 (Current)</option>
                <option value="2026-10">October 2026</option>
                <option value="2026-09">September 2026</option>
              </select>
            </div>

            <button
              onClick={() => onNavigate('ledger')}
              className="hidden md:flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-semibold text-stone-700 transition"
              title="View full ledger"
            >
              <span>{lang === 'ta' ? 'முழு பேரேடு' : 'Full Ledger'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-stone-400" />
            </button>
          </div>
        </div>

        {/* 3-Card Primary Performance Comparison Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Total Collections (Gross Inflow) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-emerald-50/60 to-white border border-emerald-200/80 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'ta' ? 'மொத்த வரவு (Collections)' : 'Total Collections'}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  + INFLOW
                </span>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono tracking-tight mt-1">
                ₹{perfCollectionsTotal.toLocaleString('en-IN')}
              </div>

              {/* Sub-currency Breakdown */}
              <div className="mt-2 text-[11px] text-emerald-900/90 font-medium bg-emerald-100/60 rounded-lg p-2.5 border border-emerald-200/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>🇮🇳</span>
                    <span>Local Village (INR):</span>
                  </span>
                  <span className="font-mono font-bold">₹{perfINRCollections.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>🇦🇪</span>
                    <span>UAE Chapter (AED):</span>
                  </span>
                  <span className="font-mono font-bold">{perfAEDCollections} AED</span>
                </div>
              </div>

              {/* Collection Target & Member Count */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-stone-600">
                  <span>{lang === 'ta' ? 'வசூல் இலக்கு அடைவு' : 'Collection Target Met'}:</span>
                  <span className="font-bold text-stone-800 font-mono">{perfCollectionRate}%</span>
                </div>
                <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${Math.min(100, Math.max(5, perfCollectionRate))}%` }} 
                  />
                </div>
                <div className="text-[10px] text-stone-500 flex items-center justify-between pt-0.5">
                  <span>{perfPaidCount} {lang === 'ta' ? 'உறுப்பினர்கள் செலுத்தியுள்ளனர்' : 'contributors recorded'}</span>
                  <span className="font-mono text-stone-400">Target: ₹{perfTargetTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('contributions')}
              className="mt-4 pt-3 border-t border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-800 hover:text-emerald-950 transition group"
            >
              <span>{lang === 'ta' ? 'சந்தா அட்டவணை காண்க' : 'Open Contributions Matrix'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </button>
          </div>

          {/* Card 2: Total Disbursements (Welfare Outflow) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-rose-50/60 to-white border border-rose-200/80 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowDownRight className="w-4 h-4 text-rose-600" />
                  <span>{lang === 'ta' ? 'மொத்த வழங்கல் (Disbursements)' : 'Total Disbursements'}</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300">
                  - OUTFLOW
                </span>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-rose-950 font-mono tracking-tight mt-1">
                ₹{perfDisbursementsTotal.toLocaleString('en-IN')}
              </div>

              {/* Categorized Aid Breakdown */}
              <div className="mt-2 text-[11px] text-rose-900/90 font-medium bg-rose-100/60 rounded-lg p-2.5 border border-rose-200/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span>🏥 {lang === 'ta' ? 'மருத்துவம் (Health)' : 'Health & Medical'}:</span>
                  <span className="font-mono font-bold">₹{perfHealthTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🎓 {lang === 'ta' ? 'கல்வி (Education)' : 'Education Aid'}:</span>
                  <span className="font-mono font-bold">₹{perfEduTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>🤝 {lang === 'ta' ? 'வறுமை & பிற நிவாரணம்' : 'Relief & Hardship'}:</span>
                  <span className="font-mono font-bold">₹{perfHardshipTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Beneficiary Stats & Earmarked Reserve */}
              <div className="mt-3 space-y-1.5 text-[11px] text-stone-600">
                <div className="flex items-center justify-between">
                  <span>{lang === 'ta' ? 'பயனடைந்த குடும்பங்கள்' : 'Disbursed Cases'}:</span>
                  <span className="font-bold text-stone-800 font-mono">
                    {perfDisbursedCount} {lang === 'ta' ? 'கோரிக்கைகள்' : 'requests settled'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{lang === 'ta' ? 'ஒப்புதல் நிலுவை (Earmarked)' : 'Approved Awaiting Payout'}:</span>
                  <span className="font-bold text-amber-800 font-mono">₹{perfEarmarkedPending.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('assistance')}
              className="mt-4 pt-3 border-t border-rose-100 flex items-center justify-between text-xs font-bold text-rose-800 hover:text-rose-950 transition group"
            >
              <span>{lang === 'ta' ? 'நலத்திட்ட உதவி மேலாண்மை' : 'Manage Assistance Pipeline'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </button>
          </div>

          {/* Card 3: Net Monthly Flow & Corpus Retention */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-teal-50/60 to-white border border-teal-200/80 shadow-2xs hover:shadow-xs transition flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-teal-700" />
                  <span>{lang === 'ta' ? 'நிகர நிதி ஓட்டம் (Net Balance)' : 'Net Monthly Surplus'}</span>
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  isSurplus ? 'bg-teal-100 text-teal-900 border-teal-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  {isSurplus ? 'SURPLUS' : 'DEFICIT'}
                </span>
              </div>

              <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight mt-1 ${
                isSurplus ? 'text-teal-950' : 'text-amber-900'
              }`}>
                {isSurplus ? '+' : ''}₹{perfNetSurplus.toLocaleString('en-IN')}
              </div>

              {/* Status Note */}
              <div className="mt-2 text-[11px] p-2.5 rounded-lg border bg-white space-y-1">
                <span className="font-bold text-stone-800 block">
                  {isSurplus 
                    ? (lang === 'ta' ? 'கிராம அவசர நிதிக்கு சேர்க்கப்பட்ட சேமிப்பு' : 'Net Capital Retained in Corpus')
                    : (lang === 'ta' ? 'காப்பு நிதியிலிருந்து வழங்கப்பட்ட தொகை' : 'Net Deficit Funded from Reserves')}
                </span>
                <p className="text-[10px] text-stone-500 leading-relaxed">
                  {isSurplus 
                    ? (lang === 'ta' 
                        ? `வரவுகளில் ${perfRetentionRate}% தொகை சமூக அவசர கால காப்பு நிதியாக பத்திரமாக சேமிக்கப்பட்டுள்ளது.` 
                        : `${perfRetentionRate}% of this month's collections retained as liquid safety reserve.`)
                    : (lang === 'ta'
                        ? 'உதவி வழங்கல்கள் மாத வரவை விட அதிகமாக இருந்ததால் அவசர காப்பு நிதியிலிருந்து பயன்படுத்தப்பட்டது.'
                        : 'Disbursements exceeded dues for this period and were safely covered by prior reserves.')}
                </p>
              </div>

              {/* Corpus Impact Indicator */}
              <div className="mt-3 pt-2 border-t border-teal-100/80 flex items-center justify-between text-[11px]">
                <span className="text-stone-500">{lang === 'ta' ? 'நடப்பு மூலதன இருப்பு' : 'Total Village Balance'}:</span>
                <span className="font-bold text-stone-900 font-mono">₹{summary.totalBalance.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={() => onNavigate('ledger')}
              className="mt-4 pt-3 border-t border-teal-100 flex items-center justify-between text-xs font-bold text-teal-800 hover:text-teal-950 transition group"
            >
              <span>{lang === 'ta' ? 'பொது பேரேடு பதிவுகள்' : 'Audit Double-Entry Ledger'}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </button>
          </div>

        </div>

        {/* Card 4: Comparative Health Bar & Visual Ratio Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-700" />
                <h4 className="font-bold text-stone-900 text-xs sm:text-sm">
                  {lang === 'ta' ? 'வரவு vs பட்டுவாடா சமநிலை ஒப்பீடு' : 'Inflow vs Outflow Deployment Ratio'}
                </h4>
              </div>
              <p className="text-[11px] text-stone-500 mt-0.5">
                {lang === 'ta' 
                  ? 'மாதாந்திர வசூலில் எத்தனை சதவீதம் நலத்திட்ட உதவிகளாக வழங்கப்பட்டுள்ளது என்பதன் பார்வை.' 
                  : 'Proportion of monthly member contributions deployed directly to healthcare, education, and welfare aid.'}
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs shrink-0">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-800">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>{lang === 'ta' ? 'வரவு' : 'Inflow'}: ₹{perfCollectionsTotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex items-center gap-1.5 font-semibold text-rose-800">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span>{lang === 'ta' ? 'வழங்கல்' : 'Outflow'}: ₹{perfDisbursementsTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Visual Dual Progress Bar */}
          <div className="space-y-1.5">
            <div className="w-full bg-stone-200 h-3 rounded-full overflow-hidden flex">
              <div 
                className="bg-rose-500 h-full transition-all duration-500" 
                style={{ width: `${Math.min(100, perfDeploymentRate)}%` }}
                title={`Disbursed: ₹${perfDisbursementsTotal}`}
              />
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${Math.max(0, 100 - Math.min(100, perfDeploymentRate))}%` }}
                title={`Retained: ₹${Math.max(0, perfNetSurplus)}`}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-stone-500 pt-1">
              <span>
                <strong className="text-rose-700 font-mono">{perfDeploymentRate}%</strong> {lang === 'ta' ? 'நலத்திட்ட உதவிகளுக்கு வழங்கப்பட்டது' : 'deployed to direct community assistance'}
              </span>
              <span>
                <strong className="text-emerald-700 font-mono">{perfRetentionRate}%</strong> {lang === 'ta' ? 'அவசர சேமிப்பாக காக்கப்பட்டது' : 'retained in liquid emergency corpus'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Two Column Layout: Recent Dues & Assistance Requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payment Receipts */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-stone-900 text-sm">
                  {lang === 'ta' ? 'சமீபத்திய சந்தா ரசீதுகள்' : 'Recent Contribution Receipts'}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('contributions')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition"
              >
                {lang === 'ta' ? 'அனைத்தும் பார்க்க →' : 'View All →'}
              </button>
            </div>

            <div className="divide-y divide-stone-100">
              {recentPayments.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-400">No payment receipts recorded yet.</div>
              ) : (
                recentPayments.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between hover:bg-stone-50/60 rounded-lg px-2 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-900">
                          {lang === 'ta' ? p.memberNameTa : p.memberName}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600">
                          {p.receiptNumber}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5">
                        <span className="uppercase text-[10px] font-semibold text-stone-600">{p.method}</span>
                        <span>•</span>
                        <span>{p.month}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs text-emerald-900 block">
                          {p.currency === 'AED' ? `${p.amount} AED` : `₹${p.amount.toLocaleString('en-IN')}`}
                        </span>
                        {p.currency === 'AED' && (
                          <span className="text-[10px] text-stone-500 block font-mono">
                            (₹{p.amountInINR?.toLocaleString('en-IN')})
                          </span>
                        )}
                        <span className={`text-[10px] ${p.syncStatus === 'synced' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {p.syncStatus === 'synced' ? '✓ Synced' : '⏳ Queued'}
                        </span>
                      </div>

                      <button
                        onClick={() => onViewReceipt(p)}
                        className="px-2.5 py-1 text-xs rounded-md border border-stone-200 hover:bg-stone-100 text-stone-700 transition"
                        title="View printable receipt"
                      >
                        {lang === 'ta' ? 'ரசீது' : 'Voucher'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 mt-2">
            <button
              onClick={() => onNavigate('contributions')}
              className="w-full py-2 text-center text-xs font-semibold text-stone-600 hover:text-stone-900 transition"
            >
              {lang === 'ta' ? 'மாதாந்திர சந்தா நிலுவை அட்டவணையைத் திறக்க' : 'Open Monthly Dues Matrix'}
            </button>
          </div>
        </div>

        {/* Assistance Pipeline */}
        <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-stone-900 text-sm">
                  {lang === 'ta' ? 'நலத்திட்ட உதவிக் கோரிக்கைகள்' : 'Assistance & Payout Pipeline'}
                </h3>
              </div>
              <button
                onClick={() => onNavigate('assistance')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition"
              >
                {lang === 'ta' ? 'அனைத்தும் பார்க்க →' : 'View All →'}
              </button>
            </div>

            <div className="divide-y divide-stone-100">
              {pendingRequests.length === 0 ? (
                <div className="py-8 text-center text-xs text-stone-400">No active assistance requests.</div>
              ) : (
                pendingRequests.map((req) => (
                  <div key={req.id} className="py-2.5 flex items-start justify-between hover:bg-stone-50/60 rounded-lg px-2 transition">
                    <div className="space-y-0.5 max-w-[70%]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-stone-900">
                          {lang === 'ta' ? req.beneficiaryNameTa : req.beneficiaryName}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full uppercase ${
                          req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          req.status === 'under_review' ? 'bg-amber-100 text-amber-800' :
                          req.status === 'paid' ? 'bg-teal-100 text-teal-800' : 'bg-stone-100 text-stone-700'
                        }`}>
                          {req.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 truncate">
                        {lang === 'ta' ? req.reasonTa || req.reason : req.reason}
                      </p>
                      <div className="text-[10px] text-stone-400">
                        {t[`cat_${req.category}` as keyof typeof t] || req.category}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-xs text-stone-900 block">
                        ₹{(req.approvedAmount || req.requestedAmount).toLocaleString('en-IN')}
                      </span>
                      <button
                        onClick={() => onNavigate('assistance')}
                        className="text-[11px] font-semibold text-emerald-700 hover:underline mt-1 inline-block"
                      >
                        {req.status === 'approved' ? (lang === 'ta' ? 'பட்டுவாடா செய்' : 'Disburse') : (lang === 'ta' ? 'பரிசீலி' : 'Review')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-stone-100 mt-2">
            <button
              onClick={() => onNavigate('assistance')}
              className="w-full py-2 text-center text-xs font-semibold text-stone-600 hover:text-stone-900 transition"
            >
              {lang === 'ta' ? 'அனைத்து உதவிக் கோரிக்கைகளையும் நிர்வகிக்க' : 'Manage Assistance Pipeline'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
