import React, { useEffect, useState } from 'react';
import { 
  ContributionDue, 
  Member, 
  PaymentReceipt, 
  Language, 
  UserRole, 
  PaymentMethod, 
  Currency, 
  DEFAULT_AED_EXCHANGE_RATE,
  AedMonthlyPayout
} from '../types';
import { localDB } from '../services/storage';
import { getTranslation } from '../i18n/translations';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { 
  CreditCard, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  FileText, 
  AlertCircle, 
  Smartphone, 
  Banknote, 
  Building2,
  Calendar,
  Globe2,
  Coins,
  ArrowRightLeft,
  Printer,
  ShieldCheck
} from 'lucide-react';

interface Props {
  lang: Language;
  activeRole: UserRole;
  currentMemberId?: string;
  onViewReceipt: (receipt: PaymentReceipt) => void;
  openPaymentModalForMember?: string | null;
  onClearPaymentModalForMember?: () => void;
}

export const ContributionsView: React.FC<Props> = ({
  lang,
  activeRole,
  currentMemberId,
  onViewReceipt,
  openPaymentModalForMember,
  onClearPaymentModalForMember
}) => {
  const t = getTranslation(lang);
  const { isOnline } = useOnlineStatus();
  const currentMonthStr = new Date().toISOString().slice(0, 7); // "2026-11"

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [dues, setDues] = useState<ContributionDue[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<'all' | 'INR' | 'AED'>('all');

  // Record Payment Modal State (DOES NOT ask for conversion)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMemberId, setModalMemberId] = useState('');
  const [modalCurrency, setModalCurrency] = useState<Currency>('INR');
  const [modalAmount, setModalAmount] = useState<number>(200);
  const [modalMethod, setModalMethod] = useState<PaymentMethod>('cash');
  const [modalRef, setModalRef] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Monthly AED to INR Remittance Payout State (Admin adds conversion rate here)
  const [unremittedData, setUnremittedData] = useState<{
    totalCollectedAed: number;
    alreadyRemittedAed: number;
    unremittedAed: number;
    payments: PaymentReceipt[];
    payouts: AedMonthlyPayout[];
  }>({ totalCollectedAed: 0, alreadyRemittedAed: 0, unremittedAed: 0, payments: [], payouts: [] });
  const [aedPayouts, setAedPayouts] = useState<AedMonthlyPayout[]>([]);
  const [isRemittanceModalOpen, setIsRemittanceModalOpen] = useState(false);
  const [remitConversionRate, setRemitConversionRate] = useState<number>(DEFAULT_AED_EXCHANGE_RATE);
  const [remitProvider, setRemitProvider] = useState<string>('Al Ansari Exchange (Dubai)');
  const [remitRef, setRemitRef] = useState<string>('');
  const [remitNotes, setRemitNotes] = useState<string>('');
  const [selectedPayoutVoucher, setSelectedPayoutVoucher] = useState<AedMonthlyPayout | null>(null);
  const [isGeneratingRemit, setIsGeneratingRemit] = useState(false);

  const loadData = async () => {
    const mems = await localDB.getMembers();
    setMembers(mems);

    const ds = await localDB.getDues(selectedMonth);
    const pays = await localDB.getPayments();

    const effId = currentMemberId || mems[0]?.id;
    if (activeRole === 'member') {
      setDues(ds.filter((d) => d.memberId === effId));
      setPayments(pays.filter((p) => p.memberId === effId));
    } else {
      setDues(ds);
      setPayments(pays);
    }

    const remitInfo = await localDB.getUnremittedAedForMonth(selectedMonth);
    setUnremittedData(remitInfo);

    const allAedPayouts = await localDB.getAedMonthlyPayouts();
    setAedPayouts(allAedPayouts);
  };

  useEffect(() => {
    loadData();
    const unsub = localDB.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, [selectedMonth]);

  useEffect(() => {
    if (openPaymentModalForMember) {
      const m = members.find((mem) => mem.id === openPaymentModalForMember);
      if (m) {
        setModalMemberId(m.id);
        const curr = m.currency || 'INR';
        setModalCurrency(curr);
        setModalAmount(m.monthlyPledge);
        setModalMethod(curr === 'AED' ? 'exchange_house' : 'cash');
        setIsModalOpen(true);
      }
      onClearPaymentModalForMember?.();
    }
  }, [openPaymentModalForMember, members]);

  const handleOpenModal = (memberId?: string) => {
    if (memberId) {
      const m = members.find((mem) => mem.id === memberId);
      setModalMemberId(memberId);
      const curr = m?.currency || 'INR';
      setModalCurrency(curr);
      setModalAmount(m ? m.monthlyPledge : 200);
      setModalMethod(curr === 'AED' ? 'exchange_house' : 'cash');
    } else {
      const first = members[0];
      setModalMemberId(first?.id || '');
      const curr = first?.currency || 'INR';
      setModalCurrency(curr);
      setModalAmount(first?.monthlyPledge || 200);
      setModalMethod(curr === 'AED' ? 'exchange_house' : 'cash');
    }
    setModalRef('');
    setModalNotes('');
    setIsModalOpen(true);
  };

  const handleMemberChange = (id: string) => {
    setModalMemberId(id);
    const m = members.find((mem) => mem.id === id);
    if (m) {
      const curr = m.currency || 'INR';
      setModalCurrency(curr);
      setModalAmount(m.monthlyPledge);
      if (curr === 'AED' && (modalMethod === 'cash' || modalMethod === 'upi')) {
        setModalMethod('exchange_house');
      }
    }
  };

  // Recording payment: NO conversion requested! Pure amount in member's currency recorded.
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalMemberId || modalAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const receipt = await localDB.recordPayment({
        memberId: modalMemberId,
        month: selectedMonth,
        amount: Number(modalAmount),
        currency: modalCurrency,
        method: modalMethod,
        referenceNumber: modalRef.trim() || undefined,
        recordedBy: `${activeRole.toUpperCase()} (${isOnline ? 'Online' : 'Offline Field'})`,
        notes: modalNotes.trim() || undefined,
        isOffline: !isOnline
      });

      setIsModalOpen(false);
      onViewReceipt(receipt);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Monthly AED to INR Remittance Payout Generation
  const handleGenerateRemittance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (unremittedData.unremittedAed <= 0 || remitConversionRate <= 0) return;

    setIsGeneratingRemit(true);
    try {
      const payout = await localDB.generateAedMonthlyPayout({
        month: selectedMonth,
        totalAedAmount: unremittedData.unremittedAed,
        conversionRate: Number(remitConversionRate),
        remittanceProvider: remitProvider.trim() || 'Al Ansari Exchange',
        referenceNumber: remitRef.trim() || 'REMIT-' + Date.now().toString().slice(-6),
        notes: remitNotes.trim() || undefined,
        generatedBy: `${activeRole.toUpperCase()} (Treasurer)`,
        isOffline: !isOnline
      });

      setIsRemittanceModalOpen(false);
      setSelectedPayoutVoucher(payout);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to generate remittance payout');
    } finally {
      setIsGeneratingRemit(false);
    }
  };

  // Filter dues list
  const filteredDues = dues.filter((due) => {
    const matchesSearch = 
      due.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      due.memberNameTa.includes(searchQuery);

    if (!matchesSearch) return false;
    if (statusFilter === 'unpaid' && (due.status !== 'unpaid' && due.status !== 'partial')) return false;
    if (statusFilter === 'paid' && due.status !== 'paid') return false;
    if (currencyFilter !== 'all' && (due.currency || 'INR') !== currencyFilter) return false;

    return true;
  });

  const totalDuesINR = dues.reduce((sum, d) => {
    if (d.currency === 'AED') return sum + Math.round(d.amountDue * DEFAULT_AED_EXCHANGE_RATE);
    return sum + d.amountDue;
  }, 0);

  const totalCollectedINR = dues.reduce((sum, d) => {
    if (d.amountPaidINR) return sum + d.amountPaidINR;
    if (d.currency === 'AED') return sum + Math.round(d.amountPaid * DEFAULT_AED_EXCHANGE_RATE);
    return sum + d.amountPaid;
  }, 0);

  const totalAEDCollected = dues
    .filter((d) => d.currency === 'AED')
    .reduce((sum, d) => sum + d.amountPaid, 0);

  const totalINRCollected = dues
    .filter((d) => (d.currency || 'INR') === 'INR')
    .reduce((sum, d) => sum + d.amountPaid, 0);

  const paidCount = dues.filter((d) => d.status === 'paid').length;
  const unpaidCount = dues.length - paidCount;

  const canRecord = activeRole === 'admin' || activeRole === 'treasurer';
  const isAdmin = activeRole === 'admin' || activeRole === 'treasurer';

  const isMember = activeRole === 'member';
  const effMemberId = currentMemberId || members[0]?.id;
  const memberLifetimeTotal = payments
    .filter((p) => p.memberId === effMemberId)
    .reduce((sum, p) => sum + (p.amountInINR || (p.currency === 'AED' ? Math.round(p.amount * DEFAULT_AED_EXCHANGE_RATE) : p.amount)), 0);
  const memberDueObj = dues[0];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header & Month Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-stone-900">
              {lang === 'ta' ? 'மாதாந்திர சந்தா & வரவு மேலாண்மை' : 'Monthly Contributions & Dues'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              INR ₹ + UAE AED د.إ
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {lang === 'ta' 
              ? 'உள்ளூர் கிராம சந்தா (ரூபாய்) மற்றும் துபாய்/வளைகுடா வாழ் உறுப்பினர்களின் திர்காம் (AED) வரவுகளை பதிவு செய்யவும்.' 
              : 'Support for local village dues in INR and UAE Gulf diaspora contributions in AED with automatic conversion.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-300 rounded-xl px-3 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-stone-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-semibold text-stone-800 focus:outline-none cursor-pointer"
            >
              <option value="2026-11">November 2026</option>
              <option value="2026-10">October 2026</option>
              <option value="2026-09">September 2026</option>
            </select>
          </div>

          {canRecord && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition"
            >
              <Plus className="w-4 h-4" />
              <span>{t.recordPayment}</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {isMember ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-stone-500 uppercase">{lang === 'ta' ? 'மாதாந்திர சந்தா இலக்கு' : 'Monthly Pledge Target'}</span>
            <div className="text-xl font-bold text-stone-900 font-mono mt-1">
              {memberDueObj?.currency === 'AED' ? `${memberDueObj.amountDue} AED` : `₹${memberDueObj?.amountDue || 200}`}
            </div>
            <div className="text-[10px] text-stone-400 mt-0.5">{selectedMonth} due status</div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-stone-500 uppercase">{lang === 'ta' ? 'இதுவரை செலுத்திய மொத்தத் தொகை' : 'Total Contributed Till Now'}</span>
            <div className="text-xl font-bold text-emerald-800 font-mono mt-1">
              ₹{memberLifetimeTotal.toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              Lifetime verified contributions
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-stone-200 shadow-2xs">
            <span className="text-[11px] font-semibold text-stone-500 uppercase">{lang === 'ta' ? 'நடப்பு மாத நிலை' : 'Current Month Status'}</span>
            <div className="text-xl font-bold text-teal-800 mt-1">
              {memberDueObj?.status === 'paid' ? (lang === 'ta' ? 'செலுத்தப்பட்டது' : 'Paid') : (lang === 'ta' ? 'நிலுவை' : 'Pending')}
            </div>
            <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
              {memberDueObj?.status === 'paid' ? 'Thank you for contributing!' : 'Please clear dues'}
            </div>
          </div>
        </div>
      ) : (
        /* Multi-Currency Monthly Summary Cards */
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-stone-200">
            <span className="text-[11px] font-semibold text-stone-500 uppercase">{lang === 'ta' ? 'மொத்த இலக்கு மதிப்பு' : 'Total Target (INR)'}</span>
            <div className="text-xl font-bold text-stone-900 font-mono mt-1">₹{totalDuesINR.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-stone-400 mt-0.5">Base village ledger value</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-stone-200">
            <span className="text-[11px] font-semibold text-stone-500 uppercase">{lang === 'ta' ? 'வசூலான தொகை (ரூபாய்)' : 'Collected Total'}</span>
            <div className="text-xl font-bold text-emerald-800 font-mono mt-1">₹{totalCollectedINR.toLocaleString('en-IN')}</div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              ₹{totalINRCollected.toLocaleString('en-IN')} + {totalAEDCollected} AED
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-stone-200">
            <span className="text-[11px] font-semibold text-stone-500 uppercase">{t.uaeCollections}</span>
            <div className="text-xl font-bold text-amber-800 font-mono mt-1">{totalAEDCollected} AED</div>
            <div className="text-[10px] text-stone-500 mt-0.5">
              ≈ ₹{Math.round(totalAEDCollected * DEFAULT_AED_EXCHANGE_RATE).toLocaleString('en-IN')} INR
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-stone-200">
            <span className="text-[11px] font-semibold text-stone-500 uppercase">{lang === 'ta' ? 'நிலுவை நிலை' : 'Collection Status'}</span>
            <div className="text-xl font-bold text-teal-800 mt-1">{paidCount} {lang === 'ta' ? 'செலுத்தியோர்' : 'Paid'}</div>
            <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
              {unpaidCount} {lang === 'ta' ? 'உறுப்பினர்கள் நிலுவை' : 'members pending'}
            </div>
          </div>
        </div>
      )}

      {!isMember && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-emerald-500/10 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-600 text-white shadow-2xs">
                <Globe2 className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm sm:text-base text-stone-900">
                {lang === 'ta' ? 'துபாய்/வளைகுடா மாதாந்திர திர்காம் பரிமாற்றம் (AED → INR)' : 'UAE Chapter Monthly Dirham Remittance Pool (AED → INR)'}
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900 border border-amber-300">
                {selectedMonth}
              </span>
            </div>
            <p className="text-xs text-stone-600 max-w-2xl">
              {lang === 'ta'
                ? 'வளைகுடா உறுப்பினர்களின் மாதாந்திர சந்தாக்கள் திர்காமில் (AED) சேகரிக்கப்படுகின்றன. மாத இறுதியில் அல்லது தொகை அனுப்பப்படும்போது, நிர்வாகி அதிகாரப்பூர்வ பரிமாற்ற விகிதத்தை (Conversion Rate) பதிவு செய்து கிராம பொதுக் கணக்கில் வரவு வைப்பார்.'
                : 'Collections from UAE members are collected in Dirhams (AED) without conversion at receipt time. When remitted, the admin generates the monthly payout, entering the actual exchange house rate to credit the village fund in INR.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/80 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-amber-200 text-center min-w-[110px]">
              <span className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider block">
                {lang === 'ta' ? 'மொத்த வசூல்' : 'Total Collected'}
              </span>
              <span className="text-base font-bold text-stone-800 font-mono">
                {unremittedData.totalCollectedAed} AED
              </span>
            </div>

            <div className="bg-white/80 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-amber-300 text-center min-w-[110px]">
              <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider block">
                {lang === 'ta' ? 'அனுப்ப வேண்டியவை' : 'AED In Pool'}
              </span>
              <span className="text-base font-extrabold text-amber-900 font-mono">
                {unremittedData.unremittedAed} AED
              </span>
            </div>

            <div className="bg-white/80 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-emerald-200 text-center min-w-[110px]">
              <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block">
                {lang === 'ta' ? 'அனுப்பப்பட்டது' : 'Remitted to Fund'}
              </span>
              <span className="text-base font-bold text-emerald-800 font-mono">
                {unremittedData.alreadyRemittedAed} AED
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isAdmin && unremittedData.unremittedAed > 0 && (
                <button
                  onClick={() => {
                    setRemitConversionRate(DEFAULT_AED_EXCHANGE_RATE);
                    setRemitRef(`AL-ANSARI-${Date.now().toString().slice(-6)}`);
                    setIsRemittanceModalOpen(true);
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition w-full sm:w-auto"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>{lang === 'ta' ? 'மாதாந்திர வரவு உருவாக்குக (AED → INR)' : 'Generate Monthly Payout (AED → INR)'}</span>
                </button>
              )}

              {/* View Past Vouchers */}
              {aedPayouts.length > 0 && (
                <button
                  onClick={() => {
                    const currentMonthPayout = aedPayouts.find(p => p.month === selectedMonth) || aedPayouts[0];
                    setSelectedPayoutVoucher(currentMonthPayout);
                  }}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold text-xs transition"
                  title="View Remittance Vouchers"
                >
                  <FileText className="w-4 h-4 text-amber-700" />
                  <span>{lang === 'ta' ? 'பரிமாற்ற ரசீது' : 'Remittance Voucher'}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Informative message if 0 AED in pool */}
        {unremittedData.unremittedAed === 0 && unremittedData.totalCollectedAed > 0 && (
          <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center gap-2 text-xs text-emerald-800 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>
              {lang === 'ta' 
                ? 'இந்த மாதத்தின் அனைத்து வளைகுடா சந்தாக்களும் வெற்றிகரமாக இந்திய ரூபாயில் பரிமாற்றம் செய்யப்பட்டு கிராம பொது கணக்கில் வரவு வைக்கப்பட்டுள்ளன.' 
                : 'All UAE collections for this month have been remitted and officially credited to the Village Welfare General Ledger in INR.'}
            </span>
          </div>
        )}
      </div>
      )}

      {/* Search and Filters with Currency Filter */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Currency Filter */}
          <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs font-semibold">
            <button
              onClick={() => setCurrencyFilter('all')}
              className={`px-2.5 py-1 rounded-md transition ${
                currencyFilter === 'all' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setCurrencyFilter('INR')}
              className={`px-2.5 py-1 rounded-md transition ${
                currencyFilter === 'INR' ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              INR (₹)
            </button>
            <button
              onClick={() => setCurrencyFilter('AED')}
              className={`px-2.5 py-1 rounded-md transition ${
                currencyFilter === 'AED' ? 'bg-amber-700 text-white' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              UAE (AED)
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                statusFilter === 'all' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {lang === 'ta' ? 'அனைத்தும்' : 'All'}
            </button>
            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                statusFilter === 'unpaid' ? 'bg-amber-700 text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {lang === 'ta' ? 'நிலுவை' : 'Pending'}
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                statusFilter === 'paid' ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:bg-stone-100'
              }`}
            >
              {lang === 'ta' ? 'செலுத்தியோர்' : 'Paid'}
            </button>
          </div>
        </div>
      </div>

      {/* Dues List Table with Currency Badges */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">{lang === 'ta' ? 'உறுப்பினர் பெயர் & பகுதி' : 'Member & Location'}</th>
                <th className="p-3.5">{lang === 'ta' ? 'மாத சந்தா (அசல்)' : 'Pledge (Original)'}</th>
                <th className="p-3.5">{lang === 'ta' ? 'செலுத்தியது' : 'Paid'}</th>
                <th className="p-3.5">{lang === 'ta' ? 'கிராம நிதி மதிப்பு' : 'Fund Value (INR)'}</th>
                <th className="p-3.5">{lang === 'ta' ? 'நிலை' : 'Status'}</th>
                <th className="p-3.5 text-right">{lang === 'ta' ? 'நடவடிக்கை' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredDues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-400">
                    No members match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredDues.map((due) => {
                  const isPaid = due.status === 'paid';
                  const isPartial = due.status === 'partial';
                  const isAED = due.currency === 'AED';
                  const memberObj = members.find((m) => m.id === due.memberId);

                  const displayPaidINR = due.amountPaidINR 
                    ? due.amountPaidINR 
                    : (isAED ? Math.round(due.amountPaid * DEFAULT_AED_EXCHANGE_RATE) : due.amountPaid);

                  return (
                    <tr key={due.id} className="hover:bg-stone-50/70 transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900">
                            {lang === 'ta' ? due.memberNameTa : due.memberName}
                          </span>
                          {isAED && (
                            <span className="px-1.5 py-0.2 rounded font-bold text-[9px] bg-amber-100 text-amber-900 border border-amber-300">
                              UAE 🇦🇪
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-400">
                          {memberObj?.villageWard} • Due by {due.dueDate}
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-stone-700">
                        {isAED ? (
                          <div>
                            <span className="font-bold text-amber-900">{due.amountDue} AED</span>
                            <span className="text-[10px] text-stone-400 block font-sans">
                              ≈ ₹{Math.round(due.amountDue * DEFAULT_AED_EXCHANGE_RATE).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="font-bold text-stone-900">₹{due.amountDue}</span>
                            <span className="text-[10px] text-stone-400 block font-sans">
                              ≈ {(due.amountDue / DEFAULT_AED_EXCHANGE_RATE).toFixed(1)} AED
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 font-mono font-bold">
                        {due.amountPaid > 0 ? (
                          isAED ? (
                            <span className="text-amber-800">{due.amountPaid} AED</span>
                          ) : (
                            <span className="text-emerald-800">₹{due.amountPaid}</span>
                          )
                        ) : (
                          <span className="text-stone-300 font-normal">-</span>
                        )}
                      </td>

                      <td className="p-3.5 font-mono text-stone-700">
                        {isAED ? (
                          due.amountPaidINR ? (
                            <div>
                              <span className="font-bold text-emerald-800">₹{due.amountPaidINR.toLocaleString('en-IN')}</span>
                              <span className="text-[9px] text-emerald-700 font-sans block bg-emerald-50 px-1 py-0.2 rounded w-fit mt-0.5">
                                {lang === 'ta' ? 'அனுப்பப்பட்டது' : 'Remitted'}
                              </span>
                            </div>
                          ) : due.amountPaid > 0 ? (
                            <div>
                              <span className="font-semibold text-amber-800">{due.amountPaid} AED</span>
                              <span className="text-[9px] text-amber-800 font-sans block bg-amber-100 px-1 py-0.2 rounded w-fit mt-0.5">
                                {lang === 'ta' ? 'திர்காம் நிதியில் உள்ளது' : 'In AED Pool'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-stone-300 font-normal">-</span>
                          )
                        ) : (
                          due.amountPaid > 0 ? (
                            <span className="font-bold text-stone-800">₹{due.amountPaid.toLocaleString('en-IN')}</span>
                          ) : (
                            <span className="text-stone-300 font-normal">-</span>
                          )
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isPaid ? 'bg-emerald-100 text-emerald-800' :
                          isPartial ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                        }`}>
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {lang === 'ta' ? 'செலுத்தப்பட்டது' : 'PAID'}
                            </>
                          ) : isPartial ? (
                            <>
                              <Clock className="w-3 h-3 text-amber-600" />
                              {lang === 'ta' ? 'பகுதி வரவு' : 'PARTIAL'}
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              {lang === 'ta' ? 'நிலுவை' : 'UNPAID'}
                            </>
                          )}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        {canRecord && !isPaid ? (
                          <button
                            onClick={() => handleOpenModal(due.memberId)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition"
                          >
                            {lang === 'ta' ? 'வரவு வைக்க' : 'Record'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-stone-400 font-medium">
                            {lang === 'ta' ? 'முடிந்தது' : 'Completed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Dialog Modal with Multi-Currency & Live Converter */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-6">
            <div className="px-6 py-4 bg-emerald-850 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="font-bold text-sm tracking-wide">
                    {t.recordPayment}
                  </h3>
                  <p className="text-[10px] text-emerald-200">
                    Supports INR (₹) & UAE Dirhams (AED د.إ)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-emerald-200 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-6 space-y-4 text-xs">
              {!isOnline && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    {lang === 'ta' 
                      ? 'ஆஃப்லைன் முறை: ரசீது உடனடியாக உள்ளூரில் உருவாக்கப்பட்டு வரிசையில் வைக்கப்படும்.' 
                      : 'Offline Mode: Payment will be safely recorded in local IndexedDB and synced automatically.'}
                  </span>
                </div>
              )}

              {/* Select Member */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.selectMember}
                </label>
                <select
                  value={modalMemberId}
                  onChange={(e) => handleMemberChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {lang === 'ta' ? m.nameTa : m.name} ({m.villageWard}) — Pledge: {m.currency === 'AED' ? `${m.monthlyPledge} AED` : `₹${m.monthlyPledge}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency Selector (INR vs UAE Dirhams) */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.currency}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setModalCurrency('INR');
                      if (modalAmount < 100) setModalAmount(200);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
                      modalCurrency === 'INR'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-2xs'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <span>🇮🇳 {t.currency_inr}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setModalCurrency('AED');
                      if (modalAmount > 100) setModalAmount(50);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
                      modalCurrency === 'AED'
                        ? 'bg-amber-50 border-amber-600 text-amber-950 shadow-2xs'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <span>🇦🇪 {t.currency_aed}</span>
                  </button>
                </div>
              </div>

              {/* Amount and Month - NO EXCHANGE RATE ASKED! */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    {t.enterAmount} ({modalCurrency})
                  </label>
                  <input
                    type="number"
                    min="1"
                    step={modalCurrency === 'AED' ? '5' : '50'}
                    value={modalAmount}
                    onChange={(e) => setModalAmount(Number(e.target.value))}
                    required
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    {lang === 'ta' ? 'மாதம்' : 'Contribution Month'}
                  </label>
                  <input
                    type="text"
                    disabled
                    value={selectedMonth}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-100 text-stone-600 font-medium font-mono"
                  />
                </div>
              </div>

              {/* Informative Note: No conversion asked at payment record time */}
              {modalCurrency === 'AED' ? (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950">
                  <div className="flex items-center gap-2 font-bold text-xs text-amber-900 mb-0.5">
                    <span>🇦🇪</span>
                    <span>{lang === 'ta' ? 'வளைகுடா திர்காம் வரவு' : 'UAE Dirham Collection'}</span>
                    <span className="ml-auto text-[10px] bg-amber-200 px-1.5 py-0.5 rounded font-mono font-bold">
                      {modalAmount} AED
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {lang === 'ta' 
                      ? 'திர்காம் தொகை நேரடியாக AED ஆக பதிவு செய்யப்படுகிறது. இப்போது மாற்று விகிதம் தேவையில்லை. மாத இறுதியில் நிர்வாகி மொத்த திர்காம் பரிமாற்றத்தை (Monthly Remittance) இந்திய ரூபாயாக மாற்றும்போது துல்லியமான மாற்று விகிதம் சேர்க்கப்படும்.'
                      : 'Payment is registered in Dirhams directly. No exchange conversion is asked now. All AED collections accumulate into the monthly UAE pool, and the administrator will enter the conversion rate when generating the monthly remittance payout.'}
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-900 mb-0.5">
                    <span>🇮🇳</span>
                    <span>{lang === 'ta' ? 'கிராம சந்தா வரவு' : 'Local INR Payment'}</span>
                    <span className="ml-auto text-[10px] bg-emerald-200 px-1.5 py-0.5 rounded font-mono font-bold">
                      ₹{modalAmount}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    {lang === 'ta' 
                      ? 'உள்ளூர் உறுப்பினர் சந்தா நேரடியாக இந்திய ரூபாயில் கிராம பொது கணக்கில் பதிவு செய்யப்படும்.' 
                      : 'Local member dues are recorded directly in INR and will credit the village fund ledger.'}
                  </p>
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.paymentMethod}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMethod('cash')}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition text-[11px] ${
                      modalMethod === 'cash' ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold' : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t.cash}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalMethod('upi')}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition text-[11px] ${
                      modalMethod === 'upi' ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold' : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5 text-teal-600" />
                    <span>{t.upi}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalMethod('bank_transfer')}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition text-[11px] ${
                      modalMethod === 'bank_transfer' ? 'bg-emerald-50 border-emerald-600 text-emerald-900 font-bold' : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>{t.bank}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalMethod('exchange_house')}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition text-[11px] col-span-2 sm:col-span-1 ${
                      modalMethod === 'exchange_house' ? 'bg-amber-50 border-amber-600 text-amber-900 font-bold' : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <Globe2 className="w-3.5 h-3.5 text-amber-700" />
                    <span>Exchange House</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalMethod('botim')}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition text-[11px] col-span-2 sm:col-span-2 ${
                      modalMethod === 'botim' ? 'bg-amber-50 border-amber-600 text-amber-900 font-bold' : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-700" />
                    <span>Botim Pay / UAE Online</span>
                  </button>
                </div>
              </div>

              {/* Reference / UTR Number */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.refNo} ({modalMethod === 'exchange_house' ? 'Transfer Reference / Al Ansari No' : 'UTR / Reference'})
                </label>
                <input
                  type="text"
                  placeholder={modalCurrency === 'AED' ? 'e.g. AL-ANSARI-88412 or BOTIM-UAE-102' : 'e.g. UPI-9842109 or Bank UTR'}
                  value={modalRef}
                  onChange={(e) => setModalRef(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {t.notes}
                </label>
                <input
                  type="text"
                  placeholder={lang === 'ta' ? 'கூடுதல் விவரங்கள்...' : 'Any comments...'}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  className="w-full p-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs transition disabled:opacity-50"
                >
                  {isSubmitting ? (lang === 'ta' ? 'பதிவாகிறது...' : 'Recording...') : t.confirm}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Monthly AED to INR Remittance Payout Generator Modal (Admin adds conversion rate here) */}
      {isRemittanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-6 animate-scale-in">
            <div className="px-6 py-4 bg-gradient-to-r from-amber-700 to-amber-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-amber-600/60 border border-amber-400/40">
                  <ArrowRightLeft className="w-5 h-5 text-amber-200" />
                </span>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">
                    {lang === 'ta' ? 'மாதாந்திர திர்காம் பரிமாற்றம் (AED → INR)' : 'Generate Monthly AED → INR Remittance'}
                  </h3>
                  <p className="text-[10px] text-amber-200">
                    {lang === 'ta' ? 'வளைகுடா நிதியை அதிகாரப்பூர்வ மாற்று விகிதத்துடன் கிராம கணக்கில் வரவு வைத்தல்' : 'Settle monthly UAE diaspora dues into base INR village treasury'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRemittanceModalOpen(false)}
                className="text-amber-200 hover:text-white text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateRemittance} className="p-6 space-y-4 text-xs">
              {/* Pool Summary Box */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    {lang === 'ta' ? 'பரிமாற்றத்திற்குரிய மொத்த திர்காம்' : 'UAE Pool to Remit'}
                  </span>
                  <div className="text-xl font-extrabold text-amber-950 font-mono mt-0.5">
                    {unremittedData.unremittedAed} AED
                  </div>
                  <div className="text-[11px] text-stone-500 mt-0.5">
                    Month: <span className="font-semibold text-stone-700">{selectedMonth}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    {lang === 'ta' ? 'வரவு வைக்கப்படும் மதிப்பு' : 'Credit to Fund (INR)'}
                  </span>
                  <div className="text-xl font-black text-emerald-900 font-mono mt-0.5">
                    ₹{Math.round(unremittedData.unremittedAed * (remitConversionRate || DEFAULT_AED_EXCHANGE_RATE)).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-stone-500 mt-0.5">
                    @ ₹{remitConversionRate || DEFAULT_AED_EXCHANGE_RATE} per AED
                  </div>
                </div>
              </div>

              {/* Members included in this batch */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {lang === 'ta' ? 'இந்த தொகுப்பில் உள்ள சந்தா வரவுகள்' : 'Participating UAE Member Dues'}
                </label>
                <div className="max-h-28 overflow-y-auto rounded-xl border border-stone-200 p-2 space-y-1.5 bg-stone-50 text-[11px]">
                  {unremittedData.payments.filter(p => !p.remittancePayoutId).length === 0 ? (
                    <div className="text-stone-400 text-center py-2">No pending payments in pool</div>
                  ) : (
                    unremittedData.payments.filter(p => !p.remittancePayoutId).map((p) => {
                      const m = members.find(mem => mem.id === p.memberId);
                      return (
                        <div key={p.id} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-stone-200">
                          <span className="font-semibold text-stone-800">
                            {lang === 'ta' ? m?.nameTa || p.memberId : m?.name || p.memberId}
                          </span>
                          <span className="font-mono font-bold text-amber-900">
                            {p.amount} AED
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Conversion Rate Input (Admin Enters Rate Here) */}
              <div className="bg-amber-100/50 p-3.5 rounded-xl border border-amber-300">
                <label className="block font-bold text-stone-900 mb-1">
                  {lang === 'ta' ? 'பரிமாற்ற மாற்று விகிதம் (1 AED = ? INR)' : 'Actual Remittance Exchange Rate (1 AED = ? INR)'} *
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 font-bold text-stone-500">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max="100"
                      value={remitConversionRate}
                      onChange={(e) => setRemitConversionRate(Number(e.target.value))}
                      required
                      placeholder="e.g. 22.85"
                      className="w-full pl-7 pr-3 py-2 rounded-lg border border-amber-400 bg-white font-mono font-bold text-base text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setRemitConversionRate(DEFAULT_AED_EXCHANGE_RATE)}
                    className="px-2.5 py-2 text-[11px] rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 font-medium"
                  >
                    Reset (22.80)
                  </button>
                </div>
                <p className="text-[10px] text-stone-600 mt-1.5">
                  {lang === 'ta' 
                    ? 'அல் அன்சாரி / லூலு / வங்கி பரிமாற்ற ரசீதில் குறிப்பிடப்பட்டுள்ள துல்லியமான மாற்று விகிதத்தை உள்ளிடவும்.'
                    : 'Enter the exact conversion rate printed on your Al Ansari, Lulu, or bank remittance slip.'}
                </p>
              </div>

              {/* Remittance Provider & Reference */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    {lang === 'ta' ? 'பணப் பரிமாற்ற நிறுவனம் / வங்கி' : 'Remittance Provider'} *
                  </label>
                  <input
                    type="text"
                    value={remitProvider}
                    onChange={(e) => setRemitProvider(e.target.value)}
                    required
                    placeholder="e.g. Al Ansari Exchange, Lulu, Bank TT"
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    {lang === 'ta' ? 'ரசீது / பரிவர்த்தனை எண்' : 'Slip / TT Reference No'} *
                  </label>
                  <input
                    type="text"
                    value={remitRef}
                    onChange={(e) => setRemitRef(e.target.value)}
                    required
                    placeholder="e.g. ANSARI-TT-2026-9841"
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Remittance Notes */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {lang === 'ta' ? 'கூடுதல் குறிப்புகள் (விருப்பப்படி)' : 'Notes / Remarks (Optional)'}
                </label>
                <input
                  type="text"
                  value={remitNotes}
                  onChange={(e) => setRemitNotes(e.target.value)}
                  placeholder="e.g. Handed over by Dubai Chapter Lead at Bur Dubai branch"
                  className="w-full p-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsRemittanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingRemit || unremittedData.unremittedAed <= 0}
                  className="px-5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-bold shadow-xs transition disabled:opacity-50 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isGeneratingRemit 
                      ? (lang === 'ta' ? 'வரவு உருவாகிறது...' : 'Generating Remittance...') 
                      : (lang === 'ta' ? 'ரூபாயில் கிராம கணக்கில் வரவு வை' : 'Confirm & Credit Fund in INR')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Remittance Payout Voucher Modal */}
      {selectedPayoutVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-6 print:m-0 print:border-none print:shadow-none">
            {/* Voucher Header */}
            <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between print:bg-emerald-900">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-800 border border-emerald-700">
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                </span>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">
                    {lang === 'ta' ? 'அதிகாரப்பூர்வ வளைகுடா பரிமாற்ற ரசீது' : 'Official UAE Remittance Voucher'}
                  </h3>
                  <p className="text-[10px] text-emerald-250 font-mono">
                    {selectedPayoutVoucher.payoutNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPayoutVoucher(null)}
                className="text-emerald-300 hover:text-white text-base print:hidden"
              >
                ✕
              </button>
            </div>

            {/* Voucher Body */}
            <div className="p-6 space-y-4 text-xs">
              <div className="text-center pb-3 border-b border-stone-200">
                <h4 className="font-bold text-stone-900 text-sm">
                  {lang === 'ta' ? 'கிராம சமூக நல நிதி — வளைகுடா கிளை வரவு சான்றிதழ்' : 'Village Community Welfare Fund — UAE Chapter Remittance'}
                </h4>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Monthly Diaspora Dues Remittance into Base Village General Ledger
                </p>
              </div>

              {/* Voucher Meta Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-stone-50 border border-stone-200">
                <div>
                  <span className="text-[10px] font-semibold text-stone-500 uppercase block">Month</span>
                  <span className="font-bold text-stone-800">{selectedPayoutVoucher.month}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-stone-500 uppercase block">Date & Time</span>
                  <span className="font-mono text-stone-700">{selectedPayoutVoucher.generatedDate}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-stone-500 uppercase block">Provider</span>
                  <span className="font-semibold text-stone-800">{selectedPayoutVoucher.remittanceProvider}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-stone-500 uppercase block">Reference / TT No</span>
                  <span className="font-mono font-bold text-stone-800">{selectedPayoutVoucher.referenceNumber}</span>
                </div>
              </div>

              {/* Financial Settlement Highlight */}
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                    Gross UAE Dirhams Remitted
                  </span>
                  <div className="text-xl font-extrabold text-amber-950 font-mono">
                    {selectedPayoutVoucher.totalAedAmount} AED
                  </div>
                  <span className="text-[11px] text-stone-600 font-mono">
                    Exchange Rate: 1 AED = ₹{selectedPayoutVoucher.conversionRate}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Net INR Credited to Fund
                  </span>
                  <div className="text-2xl font-black text-emerald-900 font-mono">
                    ₹{selectedPayoutVoucher.generatedInrAmount.toLocaleString('en-IN')}
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold block">
                    Village Ledger Credited ✓
                  </span>
                </div>
              </div>

              {/* Member Contribution Breakdown */}
              {selectedPayoutVoucher.memberBreakdown && selectedPayoutVoucher.memberBreakdown.length > 0 && (
                <div>
                  <span className="block font-semibold text-stone-700 mb-1.5 text-[11px]">
                    {lang === 'ta' ? 'பங்களித்த உறுப்பினர்களின் விவரம்:' : 'Covered Member Contributions:'}
                  </span>
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-stone-200 divide-y divide-stone-100 text-[11px]">
                    {selectedPayoutVoucher.memberBreakdown.map((item, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between hover:bg-stone-50">
                        <span className="font-semibold text-stone-800">
                          {lang === 'ta' ? item.memberNameTa : item.memberName}
                        </span>
                        <div className="text-right font-mono">
                          <span className="font-bold text-amber-900">{item.aedAmount} AED</span>
                          <span className="text-stone-400 text-[10px] ml-2">→ ₹{item.inrEquivalent.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedPayoutVoucher.notes && (
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-stone-600 text-[11px]">
                  <span className="font-semibold text-stone-800">Notes: </span>
                  {selectedPayoutVoucher.notes}
                </div>
              )}

              <div className="pt-2 text-[10px] text-stone-400 text-center">
                Generated & Authorized by: <span className="font-semibold text-stone-700">{selectedPayoutVoucher.generatedBy}</span>
              </div>

              {/* Voucher Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-200 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 font-bold flex items-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4 text-stone-600" />
                  <span>{lang === 'ta' ? 'அச்சிடு / சேமி' : 'Print Voucher'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPayoutVoucher(null)}
                  className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold transition"
                >
                  {lang === 'ta' ? 'மூடுக' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
