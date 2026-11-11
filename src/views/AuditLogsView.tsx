import React, { useEffect, useState } from 'react';
import { AuditLog, Language, UserRole } from '../types';
import { localDB } from '../services/storage';
import { getTranslation } from '../i18n/translations';
import { ShieldCheck, Search, Clock, Cpu } from 'lucide-react';

interface Props {
  lang: Language;
  activeRole: UserRole;
}

export const AuditLogsView: React.FC<Props> = ({ lang, activeRole }) => {
  const t = getTranslation(lang);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');

  const loadLogs = async () => {
    const list = await localDB.getAuditLogs();
    setLogs(list);
  };

  useEffect(() => {
    loadLogs();
    const unsub = localDB.subscribe(() => {
      loadLogs();
    });
    return () => unsub();
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.actor.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.actionTa.includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.detailsTa.includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-stone-900">
              {lang === 'ta' ? 'அதிகாரப்பூர்வ கிராம தணிக்கைப் பதிவு' : 'Village Governance & Audit Trail'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-800 border border-stone-200">
              IMMUTABLE
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {lang === 'ta' 
              ? 'நிதி வரவுகள், உதவி ஒப்புதல்கள், பட்டுவாடாக்கள் மற்றும் உறுப்பினர் மாற்றங்கள் அனைத்தின் காலவரிசைப் பதிவு.' 
              : 'Tamper-evident record of financial actions, committee decisions, and sync events.'}
          </p>
        </div>

        <div className="relative w-full sm:w-72 text-xs">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === 'ta' ? 'தணிக்கைப் பதிவுகளில் தேட...' : 'Search audit records...'}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-stone-200 focus:outline-none focus:border-emerald-600"
          />
        </div>
      </div>

      {/* Audit Log Timeline Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">{lang === 'ta' ? 'நேரம்' : 'Timestamp'}</th>
                <th className="p-3.5">{lang === 'ta' ? 'நடவடிக்கை' : 'Action'}</th>
                <th className="p-3.5">{lang === 'ta' ? 'நிர்வாகி / உறுப்பினர்' : 'Actor / Initiator'}</th>
                <th className="p-3.5">{lang === 'ta' ? 'விவரம்' : 'Event Details'}</th>
                <th className="p-3.5">{lang === 'ta' ? 'சாதனம் / தளம்' : 'Device Origin'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-stone-400">
                    No audit records match the search.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/70 transition">
                    <td className="p-3.5 whitespace-nowrap text-stone-600 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                      <div className="text-[10px] text-stone-400">
                        {new Date(log.timestamp).toLocaleTimeString('en-IN')}
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-bold text-stone-900 block">
                        {lang === 'ta' ? log.actionTa : log.action}
                      </span>
                      <span className="text-[10px] font-mono text-stone-400 uppercase">
                        {log.action}
                      </span>
                    </td>

                    <td className="p-3.5 whitespace-nowrap font-medium text-stone-800">
                      {log.actor}
                    </td>

                    <td className="p-3.5 text-stone-600 max-w-md">
                      {lang === 'ta' ? log.detailsTa || log.details : log.details}
                    </td>

                    <td className="p-3.5 whitespace-nowrap text-[11px] font-mono text-stone-500">
                      {log.ipOrDevice}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
