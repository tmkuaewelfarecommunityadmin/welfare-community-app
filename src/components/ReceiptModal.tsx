import React, { useRef } from 'react';
import { PaymentReceipt, Language, OrganizationInfo } from '../types';
import { X, Printer, Share2, CheckCircle2, ShieldCheck, Globe2 } from 'lucide-react';
import { getTranslation } from '../i18n/translations';
import { OrgLogo } from './OrgLogo';

interface Props {
  receipt: PaymentReceipt;
  lang: Language;
  onClose: () => void;
  orgInfo?: OrganizationInfo;
}

export const ReceiptModal: React.FC<Props> = ({ receipt, lang, onClose, orgInfo }) => {
  const t = getTranslation(lang);
  const printRef = useRef<HTMLDivElement>(null);
  const isAED = receipt.currency === 'AED';

  const handlePrint = () => {
    window.print();
  };

  const getAmountInWords = (num: number, l: Language, curr: string) => {
    if (curr === 'AED') {
      if (l === 'ta') {
        if (num === 25) return 'இருபத்தைந்து யு.ஏ.இ திர்காம் மட்டும்';
        if (num === 50) return 'ஐம்பது யு.ஏ.இ திர்காம் மட்டும்';
        if (num === 100) return 'நூறு யு.ஏ.இ திர்காம் மட்டும்';
        if (num === 200) return 'இருநூறு யு.ஏ.இ திர்காம் மட்டும்';
        return `${num} யு.ஏ.இ திர்காம் மட்டும்`;
      }
      if (num === 25) return 'Twenty Five UAE Dirhams Only';
      if (num === 50) return 'Fifty UAE Dirhams Only';
      if (num === 100) return 'One Hundred UAE Dirhams Only';
      if (num === 200) return 'Two Hundred UAE Dirhams Only';
      return `${num} UAE Dirhams Only`;
    }

    if (l === 'ta') {
      if (num === 200) return 'இருநூறு ரூபாய் மட்டும்';
      if (num === 250) return 'இருநூற்று ஐம்பது ரூபாய் மட்டும்';
      if (num === 300) return 'முந்நூறு ரூபாய் மட்டும்';
      if (num === 500) return 'ஐந்நூறு ரூபாய் மட்டும்';
      if (num === 1000) return 'ஆயிரம் ரூபாய் மட்டும்';
      return `${num} ரூபாய் மட்டும்`;
    }
    if (num === 200) return 'Two Hundred Rupees Only';
    if (num === 250) return 'Two Hundred Fifty Rupees Only';
    if (num === 300) return 'Three Hundred Rupees Only';
    if (num === 500) return 'Five Hundred Rupees Only';
    if (num === 1000) return 'One Thousand Rupees Only';
    return `${num} Rupees Only`;
  };

  const amountDisplay = isAED ? `${receipt.amount} AED` : `₹${receipt.amount.toLocaleString('en-IN')}`;
  const creditedINRDisplay = isAED ? `₹${(receipt.amountInINR || Math.round(receipt.amount * 22.8)).toLocaleString('en-IN')}` : null;

  const shareText = `*${t.appName} - ${t.villageName}*\n` +
    `*${t.receiptHeader}*\n` +
    `--------------------------------\n` +
    `${t.receiptNo}: ${receipt.receiptNumber}\n` +
    `${t.receivedFrom}: ${lang === 'ta' ? receipt.memberNameTa : receipt.memberName}\n` +
    `${t.amount}: ${amountDisplay} ${isAED ? `(Fund Credited: ${creditedINRDisplay})` : ''}\n` +
    `${t.filterByMonth}: ${receipt.month}\n` +
    `${t.paymentMethod}: ${receipt.method.toUpperCase()}\n` +
    `${t.refNo}: ${receipt.referenceNumber || 'N/A'}\n` +
    `${t.officer}: ${receipt.recordedBy}\n` +
    `--------------------------------\n` +
    `✓ Verified Village Record. நன்றி / Shukran / Thank you!`;

  const handleWhatsAppShare = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  const getMethodLabel = (m: string) => {
    if (m === 'exchange_house') return 'Exchange House (Al Ansari / UAE)';
    if (m === 'botim') return 'Botim Pay (UAE Online)';
    if (m === 'bank_transfer') return 'Bank Transfer / NEFT';
    if (m === 'upi') return 'UPI (GPay / PhonePe)';
    return 'Cash Handover';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-6">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-850 text-white">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-300" />
            <div>
              <h3 className="font-bold text-sm tracking-wide">
                {lang === 'ta' ? 'அதிகாரப்பூர்வ கிராம ரசீது' : 'Official Grama Receipt'}
              </h3>
              {isAED && (
                <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                  <Globe2 className="w-3 h-3" />
                  <span>UAE Gulf Chapter • د.إ</span>
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-emerald-100 hover:text-white hover:bg-emerald-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Voucher Container */}
        <div ref={printRef} className="p-6 bg-white text-stone-900 border-b border-stone-100 receipt-print-area">
          {/* Organization watermark header with custom logo */}
          <div className="text-center pb-4 border-b-2 border-stone-800 border-dashed">
            {orgInfo ? (
              <OrgLogo orgInfo={orgInfo} size="lg" className="mx-auto mb-2.5" />
            ) : (
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 font-bold text-lg mb-2">
                {isAED ? 'د.إ' : '₹'}
              </div>
            )}
            <h2 className="text-xl font-bold tracking-tight text-emerald-950 font-serif">
              {orgInfo ? (lang === 'ta' ? (orgInfo.nameTa || orgInfo.name) : (orgInfo.name || orgInfo.nameTa)) : t.villageName}
            </h2>
            <p className="text-xs text-stone-600 font-medium mt-0.5">
              {orgInfo 
                ? (lang === 'ta' 
                    ? `${orgInfo.subtitleTa || orgInfo.subtitle} • ${orgInfo.villageTa || orgInfo.village}, ${orgInfo.districtTa || orgInfo.district}` 
                    : `${orgInfo.subtitle || orgInfo.subtitleTa} • ${orgInfo.village || orgInfo.villageTa}, ${orgInfo.district || orgInfo.districtTa}`)
                : `${lang === 'ta' ? 'கிராம சமுதாய பொது நல நிதி மேலாண்மை' : 'Village Community Welfare Fund'} | ${t.district}`}
            </p>
            {orgInfo?.regNumber && (
              <p className="text-[10px] text-stone-500 font-mono mt-0.5">
                {orgInfo.regNumber}
              </p>
            )}
            <div className="mt-2 inline-block px-3 py-0.5 rounded-full bg-stone-100 text-[11px] font-bold tracking-wider text-stone-700 uppercase">
              {t.receiptHeader}
            </div>
          </div>

          {/* Receipt Meta */}
          <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-stone-200">
            <div>
              <span className="text-stone-500 block">{t.receiptNo}</span>
              <span className="font-mono font-bold text-stone-900 text-sm">{receipt.receiptNumber}</span>
            </div>
            <div className="text-right">
              <span className="text-stone-500 block">{t.date}</span>
              <span className="font-medium text-stone-800">
                {new Date(receipt.timestamp).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>

          {/* Content details table */}
          <div className="py-4 space-y-3 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-stone-100">
              <span className="text-stone-500">{t.receivedFrom}:</span>
              <span className="font-bold text-stone-900 text-sm">
                {lang === 'ta' ? receipt.memberNameTa : receipt.memberName}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-stone-100">
              <span className="text-stone-500">{t.filterByMonth}:</span>
              <span className="font-semibold text-emerald-800">{receipt.month}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-stone-100">
              <span className="text-stone-500">{t.currency}:</span>
              <span className="font-bold text-stone-800 uppercase">
                {isAED ? 'UAE Dirhams (AED د.إ)' : 'Indian Rupee (INR ₹)'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-stone-100">
              <span className="text-stone-500">{t.mode}:</span>
              <span className="font-medium text-stone-700">{getMethodLabel(receipt.method)}</span>
            </div>
            {receipt.referenceNumber && (
              <div className="flex justify-between items-center py-1 border-b border-stone-100">
                <span className="text-stone-500">{t.refNo}:</span>
                <span className="font-mono text-stone-700">{receipt.referenceNumber}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1 border-b border-stone-100">
              <span className="text-stone-500">{t.officer}:</span>
              <span className="font-medium text-stone-800">{receipt.recordedBy}</span>
            </div>

            {/* Big Amount Card */}
            <div className={`mt-4 p-4 rounded-xl border flex items-center justify-between ${
              isAED ? 'bg-amber-50/80 border-amber-300' : 'bg-emerald-50 border-emerald-200'
            }`}>
              <div>
                <span className={`text-[11px] font-semibold uppercase block tracking-wider ${
                  isAED ? 'text-amber-900' : 'text-emerald-800'
                }`}>
                  {t.amount} ({receipt.currency})
                </span>
                <span className="text-xs text-stone-600 italic block mt-0.5">
                  {getAmountInWords(receipt.amount, lang, receipt.currency)}
                </span>
                {isAED && (
                  <span className="text-[11px] font-bold text-emerald-800 block mt-1 font-mono">
                    Fund Credit: {creditedINRDisplay} (@ 1 AED ≈ ₹{receipt.exchangeRate || 22.80})
                  </span>
                )}
              </div>
              <div className={`text-2xl font-extrabold font-mono ${
                isAED ? 'text-amber-950' : 'text-emerald-900'
              }`}>
                {amountDisplay}
              </div>
            </div>
          </div>

          {/* Seal and Signatures */}
          <div className="pt-6 mt-2 flex items-end justify-between text-xs">
            {/* Visual Stamp */}
            <div className="border-2 border-dashed border-emerald-600/70 rounded-xl p-2.5 text-center text-emerald-800 transform -rotate-3 bg-emerald-50/50">
              <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-600 mb-0.5" />
              <div className="font-bold text-[10px] tracking-widest uppercase">{t.verifiedStamp}</div>
              <div className="text-[9px] text-stone-600 font-mono">
                {isAED ? 'UAE CHAPTER RECORD' : 'LOCAL VILLAGE RECORD'}
              </div>
            </div>

            <div className="text-right">
              <div className="w-28 border-b border-stone-400 mb-1"></div>
              <span className="text-[11px] text-stone-600 block">{lang === 'ta' ? 'பொருளாளர் கையொப்பம்' : 'Treasurer Signature'}</span>
              <span className="text-[10px] text-stone-500">{t.villageName}</span>
            </div>
          </div>
        </div>

        {/* Modal Action Buttons (hidden during printing via CSS) */}
        <div className="p-4 bg-stone-50 flex flex-wrap items-center justify-between gap-2 border-t border-stone-200">
          <div className="text-[11px] text-stone-500 flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${receipt.syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {receipt.syncStatus === 'synced' ? (lang === 'ta' ? 'ஒத்திசைக்கப்பட்டது' : 'Cloud Verified') : (lang === 'ta' ? 'உள்ளூரில் சேமிக்கப்பட்டது' : 'Stored Offline')}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsAppShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium shadow-xs transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? 'வாட்ஸ்அப்' : 'WhatsApp'}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-white text-xs font-medium shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.printReceipt}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
