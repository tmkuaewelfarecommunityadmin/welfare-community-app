import React, { useEffect, useState } from 'react';
import { 
  AssistanceRequest, 
  AssistanceCategory, 
  AssistancePriority, 
  Language, 
  UserRole, 
  PaymentMethod,
  Currency,
  DEFAULT_AED_EXCHANGE_RATE
} from '../types';
import { localDB } from '../services/storage';
import { getTranslation } from '../i18n/translations';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { 
  HeartHandshake, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  AlertTriangle,
  ArrowUpRight,
  Filter,
  DollarSign,
  Coins,
  ArrowRightLeft,
  Info
} from 'lucide-react';

interface Props {
  lang: Language;
  activeRole: UserRole;
  isCreateModalOpen?: boolean;
  onCloseCreateModal?: () => void;
}

export const AssistanceView: React.FC<Props> = ({
  lang,
  activeRole,
  isCreateModalOpen: propCreateOpen,
  onCloseCreateModal
}) => {
  const t = getTranslation(lang);
  const { isOnline } = useOnlineStatus();
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [availableFund, setAvailableFund] = useState(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'under_review' | 'approved' | 'paid'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Create Request Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [benName, setBenName] = useState('');
  const [benNameTa, setBenNameTa] = useState('');
  const [benPhone, setBenPhone] = useState('');
  const [category, setCategory] = useState<AssistanceCategory>('health');
  const [createCurrency, setCreateCurrency] = useState<Currency>('INR');
  const [amount, setAmount] = useState<number>(5000); // in INR
  const [createAedAmount, setCreateAedAmount] = useState<number>(250); // in AED
  const [createPeriodRate, setCreatePeriodRate] = useState<number>(DEFAULT_AED_EXCHANGE_RATE);
  const [priority, setPriority] = useState<AssistancePriority>('urgent');
  const [reason, setReason] = useState('');
  const [reasonTa, setReasonTa] = useState('');

  // Review & Approval Modal State
  const [reviewReq, setReviewReq] = useState<AssistanceRequest | null>(null);
  const [approvalAmount, setApprovalAmount] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState('');

  // Payout Execution Modal State (Supports Manual AED + Period Exchange Rate)
  const [payoutReq, setPayoutReq] = useState<AssistanceRequest | null>(null);
  const [payoutCurrency, setPayoutCurrency] = useState<Currency>('INR');
  const [payoutInrAmount, setPayoutInrAmount] = useState<number>(5000);
  const [payoutAedAmount, setPayoutAedAmount] = useState<number>(250);
  const [payoutPeriodRate, setPayoutPeriodRate] = useState<number>(DEFAULT_AED_EXCHANGE_RATE);
  const [payoutMethod, setPayoutMethod] = useState<PaymentMethod>('bank_transfer');
  const [payoutRef, setPayoutRef] = useState('');
  const [recipientConfirmed, setRecipientConfirmed] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');

  const loadData = async () => {
    const list = await localDB.getAssistanceRequests();
    setRequests(list);
    const summary = await localDB.getFundSummary();
    setAvailableFund(summary.availableBalance);
  };

  useEffect(() => {
    loadData();
    const unsub = localDB.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (propCreateOpen !== undefined) {
      setIsCreateOpen(propCreateOpen);
    }
  }, [propCreateOpen]);

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    onCloseCreateModal?.();
  };

  const openPayoutModal = (req: AssistanceRequest) => {
    setPayoutReq(req);
    const isAed = req.currency === 'AED';
    setPayoutCurrency(isAed ? 'AED' : 'INR');
    
    const approvedInr = req.approvedAmount || req.requestedAmount;
    setPayoutInrAmount(approvedInr);
    
    const periodRate = req.exchangeRate || DEFAULT_AED_EXCHANGE_RATE;
    setPayoutPeriodRate(periodRate);
    
    const aedVal = req.originalApprovedAmount || req.originalRequestedAmount || Math.round(approvedInr / periodRate);
    setPayoutAedAmount(aedVal);
    
    setPayoutMethod(isAed ? 'exchange_house' : 'bank_transfer');
    setPayoutRef('');
    setRecipientConfirmed(req.beneficiaryName);
    setPayoutNotes(isAed ? `UAE Diaspora remittance via exchange house for ${req.category}` : '');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!benName || !reason) return;

    const finalInr = createCurrency === 'AED'
      ? Math.round(createAedAmount * createPeriodRate)
      : Number(amount);

    if (finalInr <= 0) return;

    try {
      await localDB.saveAssistanceRequest(
        {
          beneficiaryName: benName.trim(),
          beneficiaryNameTa: benNameTa.trim() || benName.trim(),
          beneficiaryPhone: benPhone.trim() || 'N/A',
          category,
          currency: createCurrency,
          originalRequestedAmount: createCurrency === 'AED' ? Number(createAedAmount) : finalInr,
          exchangeRate: createCurrency === 'AED' ? Number(createPeriodRate) : 1,
          requestedAmount: finalInr,
          reason: reason.trim(),
          reasonTa: reasonTa.trim() || reason.trim(),
          priority,
          status: 'under_review',
          submittedBy: `${activeRole.toUpperCase()} Member`
        },
        activeRole,
        !isOnline
      );

      // Reset
      setBenName('');
      setBenNameTa('');
      setBenPhone('');
      setAmount(5000);
      setCreateCurrency('INR');
      setCreateAedAmount(250);
      setCreatePeriodRate(DEFAULT_AED_EXCHANGE_RATE);
      setReason('');
      setReasonTa('');
      handleCloseCreate();
    } catch (err: any) {
      alert(err.message || 'Failed to submit request');
    }
  };

  const handleApprove = async () => {
    if (!reviewReq) return;
    try {
      await localDB.approveAssistance(
        reviewReq.id,
        approvalAmount,
        activeRole,
        `Committee Officer (${activeRole})`,
        reviewComment,
        !isOnline
      );
      setReviewReq(null);
    } catch (err: any) {
      alert(err.message || 'Error approving request');
    }
  };

  const handleReject = async () => {
    if (!reviewReq) return;
    try {
      await localDB.rejectAssistance(
        reviewReq.id,
        activeRole,
        `Committee Officer (${activeRole})`,
        reviewComment,
        !isOnline
      );
      setReviewReq(null);
    } catch (err: any) {
      alert(err.message || 'Error rejecting request');
    }
  };

  const handleExecutePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutReq) return;

    // Calculate final registered INR payout amount
    const finalINR = payoutCurrency === 'AED'
      ? Math.round(payoutAedAmount * payoutPeriodRate)
      : Number(payoutInrAmount);

    try {
      await localDB.disbursePayout({
        requestId: payoutReq.id,
        amount: finalINR, // registered in INR
        currency: payoutCurrency,
        originalAmount: payoutCurrency === 'AED' ? Number(payoutAedAmount) : finalINR,
        exchangeRate: payoutCurrency === 'AED' ? Number(payoutPeriodRate) : undefined,
        disbursedBy: `${activeRole.toUpperCase()} (Treasurer)`,
        paymentMethod: payoutMethod,
        referenceNumber: payoutRef.trim() || (payoutCurrency === 'AED' ? 'AL-ANSARI-' + Date.now().toString().slice(-6) : 'REF-' + Date.now().toString().slice(-6)),
        recipientName: recipientConfirmed.trim() || payoutReq.beneficiaryName,
        notes: payoutNotes.trim(),
        isOffline: !isOnline
      });
      setPayoutReq(null);
    } catch (err: any) {
      alert(err.message || 'Failed to disburse payout');
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
    return true;
  });

  const canApprove = activeRole === 'admin' || activeRole === 'president' || activeRole === 'secretary' || activeRole === 'committee' || activeRole === 'treasurer';
  const canDisburse = activeRole === 'admin' || activeRole === 'treasurer' || activeRole === 'president';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-stone-900">
            {lang === 'ta' ? 'நலத்திட்ட உதவி & நிதி பட்டுவாடா' : 'Community Assistance & Payouts'}
          </h2>
          <p className="text-xs text-stone-500">
            {lang === 'ta' 
              ? 'மருத்துவம், கல்வி, வறுமை நிவாரணக் கோரிக்கைகளை பரிசீலித்து பட்டுவாடா செய்யவும்.' 
              : 'Review emergency medical, education, and hardship grants with committee sign-off.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-stone-500 block uppercase font-semibold">{t.availableFund}</span>
            <span className="font-mono font-bold text-emerald-900 text-sm">₹{availableFund.toLocaleString('en-IN')}</span>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newAssistanceRequest}</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200 text-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'all' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {lang === 'ta' ? 'அனைத்தும்' : 'All'}
          </button>
          <button
            onClick={() => setStatusFilter('under_review')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'under_review' ? 'bg-amber-700 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {lang === 'ta' ? 'பரிசீலனையில்' : 'Under Review'}
          </button>
          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'approved' ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {lang === 'ta' ? 'ஒப்புதல் பெற்றவை (பட்டுவாடாவுக்கு தயார்)' : 'Approved (Ready to Pay)'}
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              statusFilter === 'paid' ? 'bg-teal-700 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {lang === 'ta' ? 'வழங்கப்பட்டவை' : 'Paid & Closed'}
          </button>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-stone-700 focus:outline-none"
        >
          <option value="all">{t.allCategories}</option>
          <option value="health">{t.cat_health}</option>
          <option value="education">{t.cat_education}</option>
          <option value="hardship">{t.cat_hardship}</option>
          <option value="elderly">{t.cat_elderly}</option>
          <option value="disaster">{t.cat_disaster}</option>
        </select>
      </div>

      {/* Requests Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredRequests.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl border border-stone-200 p-12 text-center text-stone-400 text-xs">
            No assistance requests found in this view.
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isApproved = req.status === 'approved';
            const isReview = req.status === 'under_review';
            const isPaid = req.status === 'paid';
            const isRejected = req.status === 'rejected';

            return (
              <div 
                key={req.id} 
                className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs flex flex-col justify-between hover:border-emerald-600/40 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-stone-100 text-stone-700">
                        {t[`cat_${req.category}` as keyof typeof t] || req.category}
                      </span>
                      {req.currency === 'AED' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                          <span>🇦🇪</span>
                          <span>{req.originalRequestedAmount} AED</span>
                        </span>
                      )}
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      isApproved ? 'bg-emerald-100 text-emerald-800' :
                      isReview ? 'bg-amber-100 text-amber-800' :
                      isPaid ? 'bg-teal-100 text-teal-800' :
                      isRejected ? 'bg-rose-100 text-rose-800' : 'bg-stone-100 text-stone-700'
                    }`}>
                      {req.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="font-bold text-stone-900 text-sm">
                    {lang === 'ta' ? req.beneficiaryNameTa : req.beneficiaryName}
                  </h3>
                  <div className="text-[11px] text-stone-500 mb-2">
                    {req.beneficiaryPhone} • {new Date(req.submittedDate).toLocaleDateString()}
                  </div>

                  <p className="text-xs text-stone-600 line-clamp-3 mb-3 leading-relaxed bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                    {lang === 'ta' ? req.reasonTa || req.reason : req.reason}
                  </p>

                  {/* Financial amount box */}
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 mb-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase block font-semibold">
                        {isApproved || isPaid ? (lang === 'ta' ? 'ஒப்புதல் தொகை (INR)' : 'Approved Grant (INR)') : (lang === 'ta' ? 'கோரிய தொகை (INR)' : 'Requested (INR)')}
                      </span>
                      <span className="font-mono font-extrabold text-emerald-950 text-base">
                        ₹{(req.approvedAmount || req.requestedAmount).toLocaleString('en-IN')}
                      </span>
                      {req.currency === 'AED' && (
                        <span className="text-[10px] text-amber-800 block font-medium">
                          {req.originalRequestedAmount} AED @ rate ₹{req.exchangeRate || DEFAULT_AED_EXCHANGE_RATE}
                        </span>
                      )}
                    </div>

                    {req.priority === 'urgent' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-800">
                        {t.priority_urgent}
                      </span>
                    )}
                  </div>

                  {/* Review committee note if any */}
                  {req.reviews.length > 0 && (
                    <div className="text-[11px] text-stone-500 italic mb-2 border-l-2 border-emerald-500 pl-2">
                      "{req.reviews[req.reviews.length - 1].comment}" — {req.reviews[req.reviews.length - 1].reviewerName}
                    </div>
                  )}

                  {/* Payout Details if Paid */}
                  {isPaid && req.payoutDetails && (
                    <div className={`text-[10px] font-mono p-2.5 rounded-xl border mb-2 space-y-1 ${
                      req.payoutDetails.currency === 'AED'
                        ? 'bg-amber-50/80 border-amber-200 text-amber-950'
                        : 'bg-teal-50 border-teal-200 text-teal-900'
                    }`}>
                      {req.payoutDetails.currency === 'AED' ? (
                        <>
                          <div className="font-bold flex items-center justify-between text-amber-900 font-sans">
                            <span className="flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-amber-700" />
                              <span>{lang === 'ta' ? 'வளைகுடா வழி பட்டுவாடா' : 'UAE Chapter Payout'}:</span>
                            </span>
                            <span className="font-mono font-bold bg-amber-200/60 px-1.5 py-0.5 rounded">
                              {req.payoutDetails.originalAmount} AED @ ₹{req.payoutDetails.exchangeRate || DEFAULT_AED_EXCHANGE_RATE}
                            </span>
                          </div>
                          <div className="text-emerald-900 font-sans font-bold">
                            {lang === 'ta' ? 'பேரேட்டில் பற்று' : 'Registered in Ledger'}: ₹{req.payoutDetails.amount.toLocaleString('en-IN')} INR
                          </div>
                        </>
                      ) : (
                        <div className="font-bold font-sans text-teal-900">
                          {lang === 'ta' ? 'வழங்கப்பட்டது' : 'Disbursed'}: ₹{req.payoutDetails.amount.toLocaleString('en-IN')} INR
                        </div>
                      )}
                      <div className="text-[10px] text-stone-500">
                        Ref: {req.payoutDetails.referenceNumber} ({req.payoutDetails.paymentMethod.toUpperCase()})
                      </div>
                      <div className="text-[10px] text-stone-500">
                        By: {req.payoutDetails.disbursedBy} • To: {req.payoutDetails.recipientName}
                      </div>
                      {req.payoutDetails.notes && (
                        <div className="text-[10px] text-stone-500 italic border-t border-stone-200/50 pt-0.5">
                          "{req.payoutDetails.notes}"
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-stone-100 mt-2 flex items-center justify-between gap-2">
                  {isReview && canApprove && (
                    <button
                      onClick={() => {
                        setReviewReq(req);
                        setApprovalAmount(req.requestedAmount);
                        setReviewComment('');
                      }}
                      className="w-full py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition"
                    >
                      {lang === 'ta' ? 'பரிசீலனை & ஒப்புதல்' : 'Review & Decide'}
                    </button>
                  )}

                  {isApproved && canDisburse && (
                    <button
                      onClick={() => openPayoutModal(req)}
                      className="w-full py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition"
                    >
                      {lang === 'ta' ? 'நிதி பட்டுவாடா செய்க' : 'Execute Payout'}
                    </button>
                  )}

                  {isPaid && (
                    <div className="w-full text-center py-1.5 text-xs font-semibold text-teal-800 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                      <span>{lang === 'ta' ? 'வழங்கப்பட்டது' : 'Disbursed'}</span>
                    </div>
                  )}

                  {isRejected && (
                    <div className="w-full text-center py-1.5 text-xs font-semibold text-rose-800 flex items-center justify-center gap-1">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>{lang === 'ta' ? 'நிராகரிக்கப்பட்டது' : 'Rejected'}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Assistance Request Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-6">
            <div className="px-6 py-4 bg-emerald-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm tracking-wide">
                  {t.newAssistanceRequest}
                </h3>
              </div>
              <button onClick={handleCloseCreate} className="text-emerald-200 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">{t.beneficiaryName} (English)</label>
                  <input
                    type="text"
                    required
                    value={benName}
                    onChange={(e) => setBenName(e.target.value)}
                    placeholder="e.g. S. Karuppasamy"
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">{t.beneficiaryName} (தமிழ்)</label>
                  <input
                    type="text"
                    value={benNameTa}
                    onChange={(e) => setBenNameTa(e.target.value)}
                    placeholder="உதா: செ. கருப்பசாமி"
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">{t.beneficiaryPhone}</label>
                  <input
                    type="tel"
                    value={benPhone}
                    onChange={(e) => setBenPhone(e.target.value)}
                    placeholder="98421 XXXXX"
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">{lang === 'ta' ? 'உதவி பிரிவு' : 'Category'}</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AssistanceCategory)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="health">{t.cat_health}</option>
                    <option value="education">{t.cat_education}</option>
                    <option value="hardship">{t.cat_hardship}</option>
                    <option value="elderly">{t.cat_elderly}</option>
                    <option value="disaster">{t.cat_disaster}</option>
                  </select>
                </div>
              </div>

              {/* Currency Selection for Request */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">{t.currency}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateCurrency('INR')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      createCurrency === 'INR'
                        ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <span>₹</span>
                    <span>{lang === 'ta' ? 'இந்திய ரூபாய் (INR)' : 'Indian Rupee (INR)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreateCurrency('AED')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                      createCurrency === 'AED'
                        ? 'bg-amber-700 border-amber-700 text-white shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <span>🇦🇪</span>
                    <span>{lang === 'ta' ? 'யு.ஏ.இ திர்காம் (AED)' : 'UAE Dirham (AED)'}</span>
                  </button>
                </div>
              </div>

              {createCurrency === 'AED' ? (
                <div className="space-y-2.5 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-amber-950 mb-1">{t.payoutInAed} (د.إ)</label>
                      <input
                        type="number"
                        min="25"
                        step="25"
                        required
                        value={createAedAmount}
                        onChange={(e) => setCreateAedAmount(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-amber-300 bg-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-amber-950 mb-1">{t.periodExchangeRate}</label>
                      <input
                        type="number"
                        min="1"
                        step="0.05"
                        required
                        value={createPeriodRate}
                        onChange={(e) => setCreatePeriodRate(Number(e.target.value))}
                        className="w-full p-2 rounded-xl border border-amber-300 bg-white font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-white border border-amber-200 flex items-center justify-between text-xs">
                    <span className="text-stone-600 font-semibold">{t.registeredInLedger}:</span>
                    <span className="font-mono font-extrabold text-emerald-900 text-sm">
                      ₹{Math.round(createAedAmount * createPeriodRate).toLocaleString('en-IN')} INR
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 pt-1">
                    <label className="block font-semibold text-stone-700 mb-0.5">{t.urgencyPriority}</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as AssistancePriority)}
                      className="w-full p-2 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                    >
                      <option value="urgent">{t.priority_urgent}</option>
                      <option value="high">{t.priority_high}</option>
                      <option value="normal">{t.priority_normal}</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">{t.enterAmount} (₹ INR)</label>
                    <input
                      type="number"
                      min="500"
                      step="500"
                      required
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-stone-300 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">{t.urgencyPriority}</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as AssistancePriority)}
                      className="w-full p-2.5 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="urgent">{t.priority_urgent}</option>
                      <option value="high">{t.priority_high}</option>
                      <option value="normal">{t.priority_normal}</option>
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-stone-700 mb-1">{t.reasonDescription} (English)</label>
                <textarea
                  rows={2}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why assistance is required and doctors/marksheet notes..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">{t.reasonDescription} (தமிழ் விளக்கம்)</label>
                <textarea
                  rows={2}
                  value={reasonTa}
                  onChange={(e) => setReasonTa(e.target.value)}
                  placeholder="மருத்துவ சிகிச்சை அல்லது கல்லூரி கட்டணம் பற்றிய விவரங்கள்..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={handleCloseCreate}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs transition"
                >
                  {lang === 'ta' ? 'கோரிக்கையைச் சமர்ப்பிக்க' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Committee Review & Approval Modal */}
      {reviewReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-6">
            <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm tracking-wide">
                {lang === 'ta' ? 'குழு பரிசீலனை & முடிவு' : 'Committee Review Assessment'}
              </h3>
              <button onClick={() => setReviewReq(null)} className="text-stone-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="text-stone-500 block">{t.beneficiaryName}</span>
                <span className="font-bold text-stone-900 text-sm">
                  {lang === 'ta' ? reviewReq.beneficiaryNameTa : reviewReq.beneficiaryName}
                </span>
                <p className="text-stone-600 mt-1 italic bg-stone-50 p-2.5 rounded-lg border border-stone-100">
                  {lang === 'ta' ? reviewReq.reasonTa || reviewReq.reason : reviewReq.reason}
                </p>
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="text-emerald-900">{t.availableFund}:</span>
                  <span className="font-mono font-bold text-emerald-950">₹{availableFund.toLocaleString('en-IN')}</span>
                </div>
                <div className="text-[10px] text-emerald-800">
                  {approvalAmount > availableFund ? (
                    <span className="text-rose-600 font-bold">⚠️ Warning: Amount exceeds available fund balance!</span>
                  ) : (
                    <span>✓ Fund reserve is sufficient for this grant.</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {lang === 'ta' ? 'ஒப்புதல் அளிக்கப்படும் தொகை (₹)' : 'Approved Grant Amount (₹)'}
                </label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={approvalAmount}
                  onChange={(e) => setApprovalAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-stone-300 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  {lang === 'ta' ? 'குழுவின் கருத்துரை' : 'Committee Remarks / Decision Notes'}
                </label>
                <textarea
                  rows={2}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Verified hospital estimation / Marks verified..."
                  className="w-full p-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-4 py-2 rounded-xl border border-rose-300 text-rose-700 font-semibold hover:bg-rose-50 transition"
                >
                  {t.reject}
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs transition"
                >
                  {t.approve}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payout Execution Modal (Manual AED Amount + Period Exchange Rate -> Register in INR) */}
      {payoutReq && (() => {
        const calculatedInr = payoutCurrency === 'AED'
          ? Math.round(payoutAedAmount * payoutPeriodRate)
          : Number(payoutInrAmount);
        const exceedsFund = calculatedInr > availableFund;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-6">
              <div className="px-6 py-4 bg-teal-850 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-teal-300" />
                  <div>
                    <h3 className="font-bold text-sm tracking-wide">
                      {lang === 'ta' ? 'நலத்திட்ட நிதி பட்டுவாடா' : 'Execute Assistance Disbursement'}
                    </h3>
                    <p className="text-[11px] text-teal-200">
                      {lang === 'ta' 
                        ? 'வளைகுடா திர்காம் (AED) அல்லது உள்ளூர் ரூபாயில் பட்டுவாடா பதிவு' 
                        : 'Disburse aid via Gulf AED Remittance or direct INR'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setPayoutReq(null)} className="text-teal-200 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleExecutePayout} className="p-6 space-y-4 text-xs">
                {/* Beneficiary & Approved Grant Summary */}
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-stone-500 uppercase block font-semibold">{t.beneficiaryName}</span>
                      <span className="font-bold text-stone-900 text-sm">
                        {lang === 'ta' ? payoutReq.beneficiaryNameTa : payoutReq.beneficiaryName}
                      </span>
                      <div className="text-[11px] text-stone-500">{payoutReq.beneficiaryPhone} • {payoutReq.category.toUpperCase()}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-500 uppercase block font-semibold">
                        {lang === 'ta' ? 'ஒப்புதல் தொகை' : 'Approved Grant'}
                      </span>
                      <span className="font-mono font-extrabold text-emerald-900 text-base">
                        ₹{(payoutReq.approvedAmount || payoutReq.requestedAmount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  {payoutReq.currency === 'AED' && (
                    <div className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded border border-amber-200 flex items-center justify-between">
                      <span>{lang === 'ta' ? 'ஆரம்பத்தில் கோரிய திர்காம்' : 'Originally Requested in AED'}:</span>
                      <span className="font-mono font-bold">{payoutReq.originalRequestedAmount} AED @ rate {payoutReq.exchangeRate || DEFAULT_AED_EXCHANGE_RATE}</span>
                    </div>
                  )}
                </div>

                {/* Currency Mode Selection */}
                <div>
                  <label className="block font-bold text-stone-800 mb-1.5">
                    {t.payoutCurrency}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPayoutCurrency('INR');
                        setPayoutMethod('bank_transfer');
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        payoutCurrency === 'INR'
                          ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <span>₹</span>
                      <span>{lang === 'ta' ? 'இந்திய ரூபாய் (INR ₹)' : 'Indian Rupee (INR ₹)'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPayoutCurrency('AED');
                        setPayoutMethod('exchange_house');
                      }}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        payoutCurrency === 'AED'
                          ? 'bg-amber-700 border-amber-700 text-white shadow-xs'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <span>🇦🇪</span>
                      <span>{lang === 'ta' ? 'யு.ஏ.இ திர்காம் (AED د.إ)' : 'UAE Dirham (AED د.إ)'}</span>
                    </button>
                  </div>
                </div>

                {/* AED Mode: Manual AED Amount + Period Exchange Rate -> Computed INR */}
                {payoutCurrency === 'AED' ? (
                  <div className="space-y-3 bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-bold text-amber-950 mb-1">
                          {t.payoutInAed} (د.إ)
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          required
                          value={payoutAedAmount}
                          onChange={(e) => setPayoutAedAmount(Number(e.target.value))}
                          placeholder="e.g. 250 or 500"
                          className="w-full p-2.5 rounded-xl border border-amber-300 bg-white font-mono font-bold text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-[10px] text-amber-800 mt-0.5 block">
                          {lang === 'ta' ? 'அக்காலகட்ட திர்காம் மதிப்பு' : 'Enter AED amount for that period'}
                        </span>
                      </div>

                      <div>
                        <label className="block font-bold text-amber-950 mb-1">
                          {t.periodExchangeRate}
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="0.05"
                          required
                          value={payoutPeriodRate}
                          onChange={(e) => setPayoutPeriodRate(Number(e.target.value))}
                          placeholder="e.g. 22.80"
                          className="w-full p-2.5 rounded-xl border border-amber-300 bg-white font-mono font-bold text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-[10px] text-amber-800 mt-0.5 block">
                          {lang === 'ta' ? 'அக்காலகட்ட மாற்று விகிதம் (1 AED)' : 'Rate during that transaction period'}
                        </span>
                      </div>
                    </div>

                    {/* Live Period Conversion Banner */}
                    <div className="p-3 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-900 font-semibold flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5 text-amber-700" />
                          <span>{t.aedConversionLive}:</span>
                        </span>
                        <span className="font-mono font-bold text-amber-950">
                          {payoutAedAmount} AED × ₹{payoutPeriodRate}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-amber-100">
                        <span className="font-bold text-stone-900 text-xs">
                          {t.registeredInLedger}:
                        </span>
                        <span className="font-mono text-base font-black text-emerald-800">
                          ₹{calculatedInr.toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div className="text-[10px] text-stone-500 leading-relaxed flex items-start gap-1 pt-0.5 border-t border-stone-100">
                        <Info className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          {lang === 'ta'
                            ? `கிராம பொதுப் பேரேட்டில் ₹${calculatedInr.toLocaleString('en-IN')} ரூபாயாகப் பற்று வைக்கப்படும். அசல் ${payoutAedAmount} AED தொகை மற்றும் ₹${payoutPeriodRate} மாற்று விகிதம் தணிக்கைக்காகப் பாதுகாக்கப்படும்.`
                            : `Village fund ledger will debit ₹${calculatedInr.toLocaleString('en-IN')} INR for balanced double-entry accounting. The original ${payoutAedAmount} AED and period exchange rate (₹${payoutPeriodRate}) are permanently stored in the audit trail.`}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">
                      {lang === 'ta' ? 'வழங்கப்படும் ரூபாய் தொகை (INR ₹)' : 'Disbursement Amount (INR ₹)'}
                    </label>
                    <input
                      type="number"
                      min="100"
                      step="100"
                      required
                      value={payoutInrAmount}
                      onChange={(e) => setPayoutInrAmount(Number(e.target.value))}
                      className="w-full p-2.5 rounded-xl border border-stone-300 font-mono font-bold text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                )}

                {/* Available Balance Verification Check */}
                <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                  exceedsFund ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-stone-50 border-stone-200 text-stone-700'
                }`}>
                  <span className="font-medium">{t.availableFund}:</span>
                  <span className="font-mono font-bold">₹{availableFund.toLocaleString('en-IN')}</span>
                </div>
                {exceedsFund && (
                  <p className="text-[11px] text-rose-600 font-bold">
                    ⚠️ {lang === 'ta' ? 'இருப்பு தொகையை விட அதிக தொகை பட்டுவாடா செய்ய முடியாது!' : 'Warning: Payout amount exceeds available uncommitted fund balance!'}
                  </p>
                )}

                {/* Payment Method */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">{t.paymentMethod}</label>
                  <select
                    value={payoutMethod}
                    onChange={(e) => setPayoutMethod(e.target.value as PaymentMethod)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {payoutCurrency === 'AED' ? (
                      <>
                        <option value="exchange_house">{t.exchange_house}</option>
                        <option value="botim">{t.botim}</option>
                        <option value="bank_transfer">{t.bank} (Direct Remittance to Indian Bank)</option>
                        <option value="cash">{t.cash}</option>
                      </>
                    ) : (
                      <>
                        <option value="bank_transfer">{t.bank} (NEFT / IMPS)</option>
                        <option value="upi">{t.upi}</option>
                        <option value="cash">{t.cash}</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Reference Number / Remittance Slip */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">{t.refNo} / Remittance Code</label>
                  <input
                    type="text"
                    required
                    placeholder={payoutCurrency === 'AED' ? 'e.g. AL-ANSARI-99120 or BOTIM-UAE-8812' : 'e.g. NEFT-991024 or UPI-291039'}
                    value={payoutRef}
                    onChange={(e) => setPayoutRef(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Confirmed Recipient */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    {lang === 'ta' ? 'பணம் பெற்றுக் கொண்ட நபர் பெயர்' : 'Recipient / Nominee Confirmed Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={recipientConfirmed}
                    onChange={(e) => setRecipientConfirmed(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Notes & Period Remarks */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    {lang === 'ta' ? 'பரிவர்த்தனை காலகட்டக் குறிப்பு / ஆவணம்' : 'Period Remittance Remarks / Audit Notes'}
                  </label>
                  <input
                    type="text"
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
                    placeholder={payoutCurrency === 'AED' ? 'e.g. Sponsoring member sent AED from Dubai Deira branch' : 'e.g. Hospital bill direct transfer'}
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Modal Footer */}
                <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setPayoutReq(null)}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50 transition"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={exceedsFund || calculatedInr <= 0}
                    className="px-5 py-2.5 rounded-xl bg-teal-850 hover:bg-teal-900 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold shadow-xs transition flex items-center gap-1.5"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>
                      {lang === 'ta' 
                        ? `பட்டுவாடா பதிவு செய்க (₹${calculatedInr.toLocaleString('en-IN')})` 
                        : `Register Payout (₹${calculatedInr.toLocaleString('en-IN')})`}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
