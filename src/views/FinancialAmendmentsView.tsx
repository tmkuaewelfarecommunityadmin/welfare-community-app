import React, { useEffect, useState } from 'react';
import { FinancialAmendmentRequest, Language, UserRole } from '../types';
import { localDB } from '../services/storage';
import { getTranslation } from '../i18n/translations';
import { 
  ShieldCheck, 
  FileEdit, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Plus, 
  Check, 
  X, 
  AlertCircle, 
  Sparkles,
  Lock,
  FileText
} from 'lucide-react';

interface Props {
  lang: Language;
  activeRole: UserRole;
}

export const FinancialAmendmentsView: React.FC<Props> = ({ lang, activeRole }) => {
  const t = getTranslation(lang);
  const [amendments, setAmendments] = useState<FinancialAmendmentRequest[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form state for new request
  const [targetType, setTargetType] = useState<'payment' | 'due' | 'ledger' | 'monthly_remittance'>('payment');
  const [targetId, setTargetId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reason, setReason] = useState('');
  const [proposedAmount, setProposedAmount] = useState<number>(0);
  const [proposedNotes, setProposedNotes] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'approved'>('all');
  const [notification, setNotification] = useState<string | null>(null);

  const loadData = async () => {
    const list = await localDB.getFinancialAmendments();
    setAmendments(list);
  };

  useEffect(() => {
    loadData();
    const unsub = localDB.subscribe(() => {
      loadData();
    });
    return () => unsub();
  }, []);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetId.trim() || !reason.trim()) {
      alert('Please fill in target ID and reason for amendment.');
      return;
    }

    try {
      await localDB.createFinancialAmendment(
        {
          targetType,
          targetId: targetId.trim(),
          month,
          requestedBy: `${activeRole.toUpperCase()} User`,
          requestedRole: activeRole,
          reason: reason.trim(),
          proposedChanges: {
            amount: proposedAmount > 0 ? proposedAmount : undefined,
            notes: proposedNotes.trim() || undefined
          }
        },
        `${activeRole.toUpperCase()}`
      );

      setIsModalOpen(false);
      setTargetId('');
      setReason('');
      setProposedAmount(0);
      setProposedNotes('');
      setNotification(lang === 'ta' ? 'திருத்தக் கோரிக்கை வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!' : 'Amendment request submitted for committee review!');
      setTimeout(() => setNotification(null), 4000);
      loadData();
    } catch (err: any) {
      alert('Failed to submit amendment request: ' + err.message);
    }
  };

  const handleReview = async (id: string, decision: 'approve' | 'reject') => {
    try {
      await localDB.reviewFinancialAmendment(
        id,
        decision,
        activeRole,
        `${activeRole.toUpperCase()} Member`,
        reviewComment.trim()
      );
      setReviewComment('');
      setNotification(lang === 'ta' ? 'மதிப்பாய்வு பதிவு செய்யப்பட்டது!' : 'Review vote recorded successfully!');
      setTimeout(() => setNotification(null), 4000);
      loadData();
    } catch (err: any) {
      alert('Review failed: ' + err.message);
    }
  };

  const handleApply = async (id: string) => {
    if (!confirm(lang === 'ta' ? 'இந்தத் திருத்தத்தை நடைமுறைப்படுத்தவா?' : 'Apply this approved financial amendment to the ledger?')) return;
    try {
      await localDB.applyFinancialAmendment(id, `${activeRole.toUpperCase()}`);
      setNotification(lang === 'ta' ? 'திருத்தம் வெற்றிகரமாக நடைமுறைப்படுத்தப்பட்டது!' : 'Financial amendment applied successfully!');
      setTimeout(() => setNotification(null), 4000);
      loadData();
    } catch (err: any) {
      alert('Failed to apply amendment: ' + err.message);
    }
  };

  const canReview = ['admin', 'president', 'treasurer', 'secretary', 'committee', 'auditor'].includes(activeRole);
  const canApply = ['admin', 'treasurer', 'president'].includes(activeRole);

  const filteredAmendments = amendments.filter((a) => {
    if (activeTab === 'pending') return a.status === 'submitted' || a.status === 'under_review';
    if (activeTab === 'approved') return a.status === 'approved' || a.status === 'applied';
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {notification && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-stone-900">
              {lang === 'ta' ? 'நிதித் திருத்தங்கள் & செயற்குழு ஒப்புதல்கள்' : 'Financial Amendments & Committee Approvals'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
              {lang === 'ta' ? 'பாதுகாப்பான திருத்தம்' : 'GOVERNANCE-CONTROLLED'}
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {lang === 'ta'
              ? 'வெளியிடப்பட்ட நிதிப் பதிவுகள் மற்றும் லெட்ஜர் மாற்றங்களுக்கு செயற்குழு மற்றும் நிர்வாகிகளின் ஒப்புதல் பெறும் முறை.'
              : 'Multi-role review workflow requiring committee quorum approval before modifying published financial records.'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ta' ? 'புதிய திருத்தக் கோரிக்கை' : 'Request Amendment'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-xl border border-stone-200 w-fit text-xs font-bold">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'all' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
        >
          {lang === 'ta' ? 'அனைத்து கோரிக்கைகளும்' : 'All Requests'} ({amendments.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'pending' ? 'bg-amber-600 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
        >
          {lang === 'ta' ? 'மதிப்பாய்வில் உள்ளவை' : 'Pending Review'}
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-3 py-1.5 rounded-lg transition ${activeTab === 'approved' ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:bg-stone-100'}`}
        >
          {lang === 'ta' ? 'ஒப்புதல் / நிறைவேற்றப்பட்டவை' : 'Approved / Applied'}
        </button>
      </div>

      {/* Amendments List */}
      <div className="space-y-4">
        {filteredAmendments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-2">
            <FileEdit className="w-10 h-10 text-stone-400 mx-auto" />
            <h4 className="font-bold text-stone-800 text-xs">
              {lang === 'ta' ? 'கோரிக்கைகள் ஏதுமில்லை' : 'No Financial Amendment Requests'}
            </h4>
            <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
              {lang === 'ta'
                ? 'வெளியிடப்பட்ட பதிவுகளில் திருத்தம் தேவைப்பட்டால் மேலே உள்ள பொத்தானைக் கொண்டு கோரிக்கை சமர்ப்பிக்கவும்.'
                : 'All financial records are verified. Use "Request Amendment" above to propose changes requiring committee quorum.'}
            </p>
          </div>
        ) : (
          filteredAmendments.map((req) => {
            const approvalsCount = req.reviews.filter((r) => r.decision === 'approve').length;
            const isApproved = req.status === 'approved';
            const isApplied = req.status === 'applied';

            return (
              <div key={req.id} className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-mono text-xs font-bold">
                      {req.id.slice(0, 10)}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-stone-900 uppercase">
                          Target: {req.targetType} ({req.targetId})
                        </h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                          req.status === 'applied' ? 'bg-teal-100 text-teal-800' :
                          req.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Month: {req.month} • Requested by: <strong className="text-stone-700">{req.requestedBy}</strong> ({req.requestedRole})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-stone-100 text-stone-700 border border-stone-200">
                      Approvals: {approvalsCount} / 2 required
                    </span>
                  </div>
                </div>

                {/* Reason & Proposed Changes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <span className="font-bold text-stone-700 uppercase text-[10px] block">Justification / Reason</span>
                    <p className="text-stone-800 leading-relaxed">{req.reason}</p>
                  </div>

                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
                    <span className="font-bold text-stone-700 uppercase text-[10px] block">Proposed Changes</span>
                    <pre className="text-[11px] font-mono text-stone-800 bg-white p-2 rounded border border-stone-200 overflow-x-auto">
                      {JSON.stringify(req.proposedChanges, null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Reviews / Voting Trail */}
                {req.reviews.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-stone-100 text-xs">
                    <span className="font-bold text-stone-700 uppercase text-[10px] block">Committee Review Trail</span>
                    <div className="space-y-1.5">
                      {req.reviews.map((rev, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${rev.decision === 'approve' ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                            <strong className="text-stone-900">{rev.reviewerName}</strong>
                            <span className="text-stone-400 font-mono text-[10px]">({rev.reviewerRole})</span>
                            <span className="text-stone-600 italic">"{rev.comment}"</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            rev.decision === 'approve' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {rev.decision}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions: Review or Apply */}
                <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-stone-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>Requires committee quorum (2 approvals) before application</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {canReview && req.status !== 'applied' && req.status !== 'rejected' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleReview(req.id, 'approve')}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReview(req.id, 'reject')}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}

                    {canApply && isApproved && (
                      <button
                        type="button"
                        onClick={() => handleApply(req.id)}
                        className="px-4 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition shadow-sm flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Apply to Ledger</span>
                      </button>
                    )}

                    {isApplied && (
                      <span className="text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200">
                        ✓ Applied & Audited
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for Requesting New Amendment */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-6">
            <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm tracking-wide">
                  {lang === 'ta' ? 'நிதித் திருத்தக் கோரிக்கை சமர்ப்பிக்க' : 'Request Financial Record Amendment'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Target Record Type</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="payment">Payment Receipt</option>
                  <option value="due">Monthly Due</option>
                  <option value="ledger">Ledger Entry</option>
                  <option value="monthly_remittance">Monthly AED Remittance</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Target Record ID (e.g. RCP-89012 or txn ID)</label>
                <input
                  type="text"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="Enter exact record ID or receipt number"
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50 font-mono focus:outline-none focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Month (YYYY-MM)</label>
                <input
                  type="text"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  placeholder="2026-11"
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50 font-mono focus:outline-none focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Proposed Corrected Amount (INR/AED)</label>
                  <input
                    type="number"
                    value={proposedAmount}
                    onChange={(e) => setProposedAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50 font-mono focus:outline-none focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Proposed Notes / Correction</label>
                  <input
                    type="text"
                    value={proposedNotes}
                    onChange={(e) => setProposedNotes(e.target.value)}
                    placeholder="Corrected description..."
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Justification / Reason for Modification *</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Explain why this published record needs adjustment (audited for committee review)..."
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:outline-none focus:bg-white resize-none"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs"
                >
                  Submit for Committee Vote
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
