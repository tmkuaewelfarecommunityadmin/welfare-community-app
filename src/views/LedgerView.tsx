import React, { useEffect, useState } from 'react';
import { LedgerEntry, Language, UserRole } from '../types';
import { localDB } from '../services/storage';
import { getTranslation } from '../i18n/translations';
import { 
  BookOpen, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  Filter, 
  CheckCircle2, 
  ShieldCheck,
  Search
} from 'lucide-react';

interface Props {
  lang: Language;
  activeRole: UserRole;
}

export const LedgerView: React.FC<Props> = ({ lang, activeRole }) => {
  const t = getTranslation(lang);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [search, setSearch] = useState('');

  const loadLedger = async () => {
    const list = await localDB.getLedger();
    setEntries(list);
  };

  useEffect(() => {
    loadLedger();
    const unsub = localDB.subscribe(() => {
      loadLedger();
    });
    return () => unsub();
  }, []);

  const totalCredits = entries
    .filter((e) => e.type === 'credit')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalDebits = entries
    .filter((e) => e.type === 'debit')
    .reduce((sum, e) => sum + e.amount, 0);

  const currentBalance = entries.length > 0 ? entries[0].balanceAfter : 0;

  const filteredEntries = entries.filter((e) => {
    if (typeFilter !== 'all' && e.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchText = 
        e.description.toLowerCase().includes(q) ||
        e.descriptionTa.includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.referenceId.toLowerCase().includes(q);
      if (!matchText) return false;
    }
    return true;
  });

  const exportCSV = () => {
    const headers = ['Date', 'Type', 'Category', 'Description', 'Reference', 'Amount (INR)', 'Balance After (INR)', 'Entered By', 'Sync Status'];
    const rows = entries.map((e) => [
      `"${new Date(e.date).toLocaleString('en-IN')}"`,
      `"${e.type.toUpperCase()}"`,
      `"${e.category}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      `"${e.referenceId}"`,
      e.amount,
      e.balanceAfter,
      `"${e.enteredBy}"`,
      `"${e.syncStatus}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `GramaNidhi_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-stone-900">
              {lang === 'ta' ? 'கிராம வரவு-செலவு பொது பேரேடு' : 'Community Fund Double-Entry Ledger'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              AUDIT READY
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {lang === 'ta' 
              ? 'இருப்பு தொகையில் எந்த திருத்தமும் செய்ய முடியாது; அனைத்து பதிவுகளும் நேரடி வரவு/பற்று அடிப்படையில் கணக்கிடப்படுகின்றன.' 
              : 'Immutable record where every rupee in and out balances with transparent audit trail.'}
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs shadow-xs transition"
        >
          <Download className="w-4 h-4" />
          <span>{t.exportCSV}</span>
        </button>
      </div>

      {/* Financial Health Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white border border-stone-200">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="uppercase font-semibold tracking-wider">{lang === 'ta' ? 'நடப்பு பேரேட்டு இருப்பு' : 'Current Ledger Balance'}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-black text-emerald-900 font-mono">
            ₹{currentBalance.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Verified balanced ledger</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-stone-200">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="uppercase font-semibold tracking-wider">{lang === 'ta' ? 'மொத்த வரவுகள் (+)' : 'Total Cumulative Credits (+)'}</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-teal-800 font-mono">
            ₹{totalCredits.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Corpus & Member Dues</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-stone-200">
          <div className="flex items-center justify-between text-xs text-stone-500 mb-1">
            <span className="uppercase font-semibold tracking-wider">{lang === 'ta' ? 'மொத்த பற்று செலவுகள் (-)' : 'Total Welfare Payouts (-)'}</span>
            <ArrowDownRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-900 font-mono">
            ₹{totalDebits.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Medical, Education & Relief</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'ta' ? 'விளக்கம் அல்லது குறிப்பு எண் மூலம் தேட...' : 'Search by description or reference...'}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              typeFilter === 'all' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {lang === 'ta' ? 'அனைத்தும்' : 'All'}
          </button>
          <button
            onClick={() => setTypeFilter('credit')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              typeFilter === 'credit' ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {lang === 'ta' ? 'வரவு (+)' : 'Credits (+)'}
          </button>
          <button
            onClick={() => setTypeFilter('debit')}
            className={`px-3 py-1 rounded-lg font-medium transition ${
              typeFilter === 'debit' ? 'bg-rose-700 text-white' : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            {lang === 'ta' ? 'பற்று (-)' : 'Debits (-)'}
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">{lang === 'ta' ? 'தேதி' : 'Date'}</th>
                <th className="p-3.5">{lang === 'ta' ? 'விவரம் / வகை' : 'Category & Details'}</th>
                <th className="p-3.5">{lang === 'ta' ? 'குறிப்பு எண்' : 'Reference'}</th>
                <th className="p-3.5 text-right">{lang === 'ta' ? 'வரவு / பற்று (₹)' : 'Credit / Debit (₹)'}</th>
                <th className="p-3.5 text-right">{lang === 'ta' ? 'இருப்பு (₹)' : 'Balance (₹)'}</th>
                <th className="p-3.5 text-center">{lang === 'ta' ? 'நிலை' : 'Sync'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-stone-400">
                    No ledger entries found.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const isCredit = entry.type === 'credit';

                  return (
                    <tr key={entry.id} className="hover:bg-stone-50/70 transition">
                      <td className="p-3.5 whitespace-nowrap text-stone-600 font-mono text-[11px]">
                        {new Date(entry.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                        <div className="text-[10px] text-stone-400">
                          {new Date(entry.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-stone-900">
                          {lang === 'ta' ? entry.categoryTa : entry.category}
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5">
                          {lang === 'ta' ? entry.descriptionTa : entry.description}
                        </p>
                      </td>

                      <td className="p-3.5 whitespace-nowrap font-mono text-[11px] text-stone-600">
                        {entry.referenceId}
                        <div className="text-[10px] text-stone-400">{entry.enteredBy}</div>
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap font-mono font-bold">
                        {isCredit ? (
                          <span className="text-emerald-700">+₹{entry.amount.toLocaleString('en-IN')}</span>
                        ) : (
                          <span className="text-rose-700">-₹{entry.amount.toLocaleString('en-IN')}</span>
                        )}
                        {entry.originalCurrency === 'AED' && (
                          <span className="text-[10px] text-amber-800 block font-normal">
                            ({entry.originalAmount} AED{entry.exchangeRate ? ` @ ₹${entry.exchangeRate}` : ''})
                          </span>
                        )}
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap font-mono font-extrabold text-stone-900">
                        ₹{entry.balanceAfter.toLocaleString('en-IN')}
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          entry.syncStatus === 'synced' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {entry.syncStatus === 'synced' ? 'Synced' : 'Offline'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
