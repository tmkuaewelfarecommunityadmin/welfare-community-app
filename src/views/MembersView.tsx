import React, { useEffect, useState } from 'react';
import { Member, UserRole, Language, Currency, DEFAULT_AED_EXCHANGE_RATE } from '../types';
import { localDB } from '../services/storage';
import { getTranslation } from '../i18n/translations';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  CreditCard,
  CheckCircle2,
  Globe2
} from 'lucide-react';

interface Props {
  lang: Language;
  activeRole: UserRole;
  onPayForMember: (memberId: string) => void;
}

export const MembersView: React.FC<Props> = ({ lang, activeRole, onPayForMember }) => {
  const t = getTranslation(lang);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [chapterFilter, setChapterFilter] = useState<'all' | 'local' | 'gulf'>('all');

  // Add Member Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [nameTa, setNameTa] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [ward, setWard] = useState('Ward 1 - North Street');
  const [gulfCity, setGulfCity] = useState('Dubai');
  const [role, setRole] = useState<UserRole>('member');
  const [pledge, setPledge] = useState<number>(200);

  const loadMembers = async () => {
    const list = await localDB.getMembers();
    setMembers(list);
  };

  useEffect(() => {
    loadMembers();
    const unsub = localDB.subscribe(() => {
      loadMembers();
    });
    return () => unsub();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const isGulf = currency === 'AED';
    const locationStr = isGulf ? `UAE - ${gulfCity}` : ward;

    const newMember: Member = {
      id: 'm_' + Date.now(),
      name: name.trim(),
      nameTa: nameTa.trim() || name.trim(),
      phone: phone.trim() || (isGulf ? '+971 50 XXXXXXX' : '98400 00000'),
      villageWard: locationStr,
      status: 'active',
      role,
      currency,
      monthlyPledge: Number(pledge),
      isGulfMember: isGulf,
      gulfCity: isGulf ? gulfCity : undefined,
      joinedDate: new Date().toISOString().slice(0, 10),
      avatarSeed: name.toLowerCase().replace(/\s+/g, '_')
    };

    await localDB.saveMember(newMember, activeRole);
    setIsAddOpen(false);
    setName('');
    setNameTa('');
    setPhone('');
    setPledge(200);
    setCurrency('INR');
  };

  const filteredMembers = members.filter((m) => {
    if (roleFilter !== 'all' && m.role !== roleFilter) return false;
    if (chapterFilter === 'gulf' && m.currency !== 'AED') return false;
    if (chapterFilter === 'local' && m.currency === 'AED') return false;
    
    if (search) {
      const q = search.toLowerCase();
      const match = 
        m.name.toLowerCase().includes(q) ||
        m.nameTa.includes(q) ||
        m.phone.includes(q) ||
        m.villageWard.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const canAddMember = activeRole === 'admin' || activeRole === 'president' || activeRole === 'secretary';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-stone-900">
              {lang === 'ta' ? 'கிராம சமுதாய உறுப்பினர்கள் விவரக் கையேடு' : 'Community Member Registry'}
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              LOCAL & GULF CHAPTERS
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            {lang === 'ta' 
              ? 'உள்ளூர் கிராம உறுப்பினர்கள் (ரூபாய்) மற்றும் வளைகுடா வாழ் உறுப்பினர்களின் (AED) விபரப் பட்டியல்.' 
              : 'Members directory supporting both local INR contributors and UAE AED diaspora members.'}
          </p>
        </div>

        {canAddMember && (
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t.addNewMember}</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-stone-200 text-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-200 focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Chapter Filter */}
          <div className="flex items-center bg-stone-100 p-0.5 rounded-lg border border-stone-200 font-semibold text-xs">
            <button
              onClick={() => setChapterFilter('all')}
              className={`px-2.5 py-1 rounded-md transition ${
                chapterFilter === 'all' ? 'bg-stone-900 text-white' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              All Members
            </button>
            <button
              onClick={() => setChapterFilter('local')}
              className={`px-2.5 py-1 rounded-md transition ${
                chapterFilter === 'local' ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Village INR (₹)
            </button>
            <button
              onClick={() => setChapterFilter('gulf')}
              className={`px-2.5 py-1 rounded-md transition ${
                chapterFilter === 'gulf' ? 'bg-amber-700 text-white' : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              UAE Chapter (AED)
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-stone-500 font-medium">{lang === 'ta' ? 'பொறுப்பு:' : 'Role:'}</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-stone-700 focus:outline-none"
            >
              <option value="all">{lang === 'ta' ? 'அனைத்தும்' : 'All Roles'}</option>
              <option value="admin">Super Admin</option>
              <option value="president">President</option>
              <option value="treasurer">Treasurer</option>
              <option value="secretary">Secretary</option>
              <option value="committee">Committee</option>
              <option value="member">Member</option>
              <option value="auditor">Auditor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Members Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMembers.map((member) => {
          const isAED = member.currency === 'AED';

          return (
            <div
              key={member.id}
              className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs hover:border-emerald-600/30 transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center text-sm font-mono border ${
                      isAED ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}>
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-stone-900 text-sm">
                          {lang === 'ta' ? member.nameTa : member.name}
                        </h3>
                        {isAED && (
                          <span className="px-1.5 py-0.2 rounded font-bold text-[9px] bg-amber-100 text-amber-900 border border-amber-300">
                            UAE 🇦🇪
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {lang === 'ta' ? member.name : member.nameTa}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    member.role === 'admin' ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                    member.role === 'president' || member.role === 'treasurer' ? 'bg-amber-100 text-amber-900' :
                    member.role === 'secretary' || member.role === 'committee' ? 'bg-teal-100 text-teal-900' : 
                    member.role === 'auditor' ? 'bg-cyan-100 text-cyan-900' : 'bg-stone-100 text-stone-700'
                  }`}>
                    {member.role}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-stone-600 mb-4 bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-stone-400" />
                    <span className="truncate">{member.villageWard}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-stone-400" />
                    <span>Member since {member.joinedDate}</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-500 uppercase font-semibold block">
                    {lang === 'ta' ? 'மாதாந்திர சந்தா (இரு நாணயம்)' : 'Monthly Pledge (Dual Currency)'}
                  </span>
                  {isAED ? (
                    <div className="mt-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-amber-950 text-sm">
                          {member.monthlyPledge} AED
                        </span>
                        <span className="text-stone-300 font-bold">/</span>
                        <span className="font-mono font-bold text-emerald-900 text-xs bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          ₹{Math.round(member.monthlyPledge * DEFAULT_AED_EXCHANGE_RATE).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <span className="text-[9px] text-amber-800 font-medium">
                        {lang === 'ta' ? 'வளைகுடா திர்காம் & நிகர ரூபாய்' : 'UAE Dirham & Net INR'}
                      </span>
                    </div>
                  ) : (
                    <div className="mt-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-emerald-950 text-sm">
                          ₹{member.monthlyPledge.toLocaleString('en-IN')}
                        </span>
                        <span className="text-stone-300 font-bold">/</span>
                        <span className="font-mono font-bold text-amber-900 text-xs bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {(member.monthlyPledge / DEFAULT_AED_EXCHANGE_RATE).toFixed(1)} AED
                        </span>
                      </div>
                      <span className="text-[9px] text-emerald-800 font-medium">
                        {lang === 'ta' ? 'உள்ளூர் ரூபாய் & நிகர திர்காம்' : 'Village INR & Net Dirham'}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => onPayForMember(member.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs border border-emerald-200 transition shrink-0"
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                  <span>{lang === 'ta' ? 'சந்தா வரவு' : 'Record Due'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Member Modal with Currency selection */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-6">
            <div className="px-6 py-4 bg-emerald-850 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-sm tracking-wide">
                  {t.addNewMember}
                </h3>
              </div>
              <button onClick={() => setIsAddOpen(false)} className="text-emerald-200 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Full Name (English)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. S. Syed Ibrahim or K. Murugesan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">உறுப்பினர் பெயர் (தமிழ்)</label>
                <input
                  type="text"
                  placeholder="உதா: செ. சையது இப்ராஹிம்"
                  value={nameTa}
                  onChange={(e) => setNameTa(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Currency & Chapter Selector */}
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Membership Chapter & Currency
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrency('INR');
                      setPledge(200);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
                      currency === 'INR'
                        ? 'bg-emerald-50 border-emerald-600 text-emerald-950 shadow-2xs'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <span>🇮🇳 Local Village (INR ₹)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrency('AED');
                      setPledge(50);
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold transition ${
                      currency === 'AED'
                        ? 'bg-amber-50 border-amber-600 text-amber-950 shadow-2xs'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <span>🇦🇪 UAE Chapter (AED د.إ)</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder={currency === 'AED' ? '+971 50 XXXXXXX' : '98421 XXXXX'}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Monthly Pledge ({currency})
                  </label>
                  <input
                    type="number"
                    min="5"
                    step={currency === 'AED' ? '5' : '50'}
                    required
                    value={pledge}
                    onChange={(e) => setPledge(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-stone-300 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {currency === 'AED' ? (
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">UAE City / Emirate</label>
                    <select
                      value={gulfCity}
                      onChange={(e) => setGulfCity(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-300 bg-white"
                    >
                      <option value="Dubai">Dubai</option>
                      <option value="Abu Dhabi">Abu Dhabi</option>
                      <option value="Sharjah">Sharjah</option>
                      <option value="Ajman">Ajman</option>
                      <option value="Ras Al Khaimah">Ras Al Khaimah</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Village Ward</label>
                    <select
                      value={ward}
                      onChange={(e) => setWard(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-300 bg-white"
                    >
                      <option value="Ward 1 - North Street">Ward 1 - North Street</option>
                      <option value="Ward 2 - Middle Street">Ward 2 - Middle Street</option>
                      <option value="Ward 3 - East Colony">Ward 3 - East Colony</option>
                      <option value="Ward 4 - South Garden">Ward 4 - South Garden</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Assigned Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 bg-white"
                  >
                    <option value="member">Member</option>
                    <option value="committee">Committee Member</option>
                    <option value="secretary">Secretary</option>
                    <option value="treasurer">Treasurer</option>
                    <option value="president">President</option>
                    <option value="admin">Super Admin</option>
                    <option value="auditor">Auditor</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-50"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs"
                >
                  {lang === 'ta' ? 'உறுப்பினரைச் சேர்க்க' : 'Enroll Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
