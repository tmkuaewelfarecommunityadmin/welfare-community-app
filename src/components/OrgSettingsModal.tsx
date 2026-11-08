import React, { useState, useRef } from 'react';
import { OrganizationInfo, PresetEmblemIcon, Language } from '../types';
import { OrgLogo } from './OrgLogo';
import { 
  Upload, 
  Trash2, 
  Check, 
  RotateCcw, 
  Building, 
  Sparkles,
  Phone,
  Mail,
  FileBadge,
  Eye,
  Camera
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  currentInfo: OrganizationInfo;
  onSave: (info: OrganizationInfo) => Promise<void>;
}

export const OrgSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  lang,
  currentInfo,
  onSave
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<OrganizationInfo>({ ...currentInfo });
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const presetColors = [
    { label: 'Emerald Forest', value: '#15803d' },
    { label: 'Deep Teal', value: '#0f766e' },
    { label: 'Royal Amber', value: '#b45309' },
    { label: 'Sapphire Navy', value: '#1e3a8a' },
    { label: 'Rich Indigo', value: '#4338ca' },
    { label: 'Ruby Maroon', value: '#991b1b' },
    { label: 'Classic Slate', value: '#334155' }
  ];

  const presetIcons: { id: PresetEmblemIcon; labelEn: string; labelTa: string }[] = [
    { id: 'rupee', labelEn: '₹ Rupee', labelTa: '₹ ரூபாய்' },
    { id: 'shield', labelEn: 'Shield & Trust', labelTa: 'பாதுகாப்பு & நம்பிக்கை' },
    { id: 'tree', labelEn: 'Village Tree', labelTa: 'கிராமத்து மரம்' },
    { id: 'handshake', labelEn: 'Welfare Hands', labelTa: 'உதவிக்கரங்கள்' },
    { id: 'building', labelEn: 'Panchayat / Hall', labelTa: 'கிராம சபை' },
    { id: 'globe', labelEn: 'Global / Gulf', labelTa: 'உலக / வளைகுடா' }
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert(lang === 'ta' ? 'தயவுசெய்து படக் கோப்பை மட்டும் தேர்ந்தெடுக்கவும்.' : 'Please select an image file (PNG, JPG, SVG, WebP).');
      return;
    }

    // Limit to 2MB before client-side resize
    if (file.size > 2 * 1024 * 1024) {
      alert(lang === 'ta' ? 'படத்தின் அளவு 2MB-க்கு குறைவாக இருக்க வேண்டும்.' : 'Image size should be less than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        // Create an image to resize down to crisp icon if needed
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 256;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedDataUrl = canvas.toDataURL('image/png');
            setFormData(prev => ({
              ...prev,
              logoType: 'custom_image',
              logoDataUrl: optimizedDataUrl
            }));
          } else {
            setFormData(prev => ({
              ...prev,
              logoType: 'custom_image',
              logoDataUrl: dataUrl
            }));
          }
        };
        img.src = dataUrl;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveCustomLogo = () => {
    setFormData(prev => ({
      ...prev,
      logoType: 'preset_icon',
      logoDataUrl: undefined
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 700);
    } catch (err: any) {
      alert('Failed to save settings: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-stone-200 overflow-hidden my-6 animate-scale-in">
        {/* Header */}
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-emerald-800 border border-emerald-700">
              <Building className="w-5 h-5 text-emerald-300" />
            </span>
            <div>
              <h3 className="font-bold text-sm tracking-wide">
                {lang === 'ta' ? 'அமைப்பின் லோகோ & தலைப்பு விவரங்கள்' : 'Organization Identity & Header Branding'}
              </h3>
              <p className="text-[10px] text-emerald-250">
                {lang === 'ta' ? 'உங்கள் அமைப்பின் லோகோ, பெயர், முகவரி மற்றும் ரசீது தலைப்பை அமைக்கவும்' : 'Customize your own logo, organization title, sub-info, and receipt header'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-emerald-200 hover:text-white text-base font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs max-h-[80vh] overflow-y-auto">
          {/* Live Preview Box */}
          <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
            <div className="flex items-center justify-between text-stone-500 font-bold uppercase tracking-wider text-[10px]">
              <div className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-700" />
                <span>{lang === 'ta' ? 'தலைப்பு நேரடி முன்னோட்டம்' : 'Live Header Preview'}</span>
              </div>
              <span className="text-emerald-700 text-[10px] lowercase font-medium">As seen in navigation bar</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-stone-200 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <OrgLogo orgInfo={formData} size="md" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-extrabold text-stone-900 truncate">
                      {lang === 'ta' ? (formData.nameTa || formData.name) : (formData.name || formData.nameTa)}
                    </h2>
                    {formData.headerBadge && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                        {formData.headerBadge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 font-medium truncate">
                    {lang === 'ta' 
                      ? `${formData.villageTa || formData.village} • ${formData.districtTa || formData.district}` 
                      : `${formData.village || formData.villageTa} • ${formData.district || formData.districtTa}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Logo Upload & Preset Choice */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-stone-200 pb-2">
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-700" />
                <span>{lang === 'ta' ? '1. அமைப்பின் லோகோ (Logo)' : '1. Organization Logo'}</span>
              </h4>
              {formData.logoType === 'custom_image' && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                  Custom Logo Active ✓
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              {/* Upload Own Logo Box */}
              <div className="p-4 rounded-xl border-2 border-dashed border-stone-300 hover:border-emerald-500 bg-stone-50/50 transition flex flex-col items-center justify-center text-center space-y-2.5">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                />

                <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                  <OrgLogo orgInfo={formData} size="lg" />
                  <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white">
                    <Upload className="w-5 h-5" />
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-2xs transition flex items-center gap-1.5 mx-auto"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{lang === 'ta' ? 'சொந்த லோகோ பதிவேற்றவும்' : 'Upload Your Logo'}</span>
                  </button>
                  <p className="text-[10px] text-stone-500 mt-1">PNG, JPG, SVG, WebP (Max 2MB)</p>
                </div>

                {formData.logoType === 'custom_image' && (
                  <button
                    type="button"
                    onClick={handleRemoveCustomLogo}
                    className="text-[11px] text-rose-600 hover:text-rose-700 flex items-center gap-1 font-semibold pt-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{lang === 'ta' ? 'லோகோவை அகற்று' : 'Remove Custom Logo'}</span>
                  </button>
                )}
              </div>

              {/* Or Select Preset Emblem & Color */}
              <div className="space-y-3 p-3.5 rounded-xl border border-stone-200 bg-white">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1.5">
                    {lang === 'ta' ? 'அல்லது மாதிரி சின்னத்தைத் தேர்ந்தெடுக்கவும்:' : 'Or Select a Preset Emblem:'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {presetIcons.map((icon) => (
                      <button
                        key={icon.id}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            logoType: 'preset_icon',
                            presetIcon: icon.id
                          }));
                        }}
                        className={`p-2 rounded-lg border text-center transition flex flex-col items-center justify-center gap-1 ${
                          formData.logoType === 'preset_icon' && formData.presetIcon === icon.id
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-bold shadow-2xs'
                            : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        <span className="text-xs">{icon.id === 'rupee' ? '₹' : icon.id === 'shield' ? '🛡️' : icon.id === 'tree' ? '🌳' : icon.id === 'handshake' ? '🤝' : icon.id === 'building' ? '🏛️' : '🌐'}</span>
                        <span className="text-[10px] truncate w-full">{lang === 'ta' ? icon.labelTa : icon.labelEn}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background color swatches */}
                <div>
                  <label className="block font-semibold text-stone-700 mb-1.5">
                    {lang === 'ta' ? 'சின்னத்தின் பின்னணி நிறம்:' : 'Emblem Background Color:'}
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {presetColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, logoBgColor: color.value }))}
                        className={`w-6 h-6 rounded-full border-2 transition flex items-center justify-center ${
                          formData.logoBgColor === color.value ? 'scale-110 border-stone-900 shadow-xs' : 'border-white hover:scale-105'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.label}
                      >
                        {formData.logoBgColor === color.value && <Check className="w-3 h-3 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Organization Name & Subtitle */}
          <div className="space-y-3">
            <div className="border-b border-stone-200 pb-1.5">
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700" />
                <span>{lang === 'ta' ? '2. அமைப்பின் பெயர் & தலைப்பு விவரங்கள்' : '2. Organization Name & Title Details'}</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Organization Name (English) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. GramaNidhi / Melavalavu Welfare Society"
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  அமைப்பின் பெயர் (தமிழ்) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nameTa}
                  onChange={(e) => setFormData({ ...formData, nameTa: e.target.value })}
                  placeholder="எ.கா: கிராமநிதி / மேலவளவு கிராம நல நிதியம்"
                  className="w-full p-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold font-tamil"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Subtitle / Mission Tagline (English)
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                  placeholder="e.g. Village Community Fund & UAE Chapter"
                  className="w-full p-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  துணைத் தலைப்பு (தமிழ்)
                </label>
                <input
                  type="text"
                  value={formData.subtitleTa}
                  onChange={(e) => setFormData({ ...formData, subtitleTa: e.target.value })}
                  placeholder="எ.கா: கிராம மக்கள் நல நிதி & வளைகுடா கிளை"
                  className="w-full p-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-tamil"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Village Location & Jurisdiction */}
          <div className="space-y-3">
            <div className="border-b border-stone-200 pb-1.5">
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <FileBadge className="w-4 h-4 text-emerald-700" />
                <span>{lang === 'ta' ? '3. கிராமம், மாவட்டம் & பதிவு விவரங்கள்' : '3. Village, District & Registration Details'}</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Village / Ward (English)
                </label>
                <input
                  type="text"
                  value={formData.village}
                  onChange={(e) => setFormData({ ...formData, village: e.target.value })}
                  placeholder="e.g. Melavalavu Village, Ward 4"
                  className="w-full p-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  கிராமம் / வார்டு (தமிழ்)
                </label>
                <input
                  type="text"
                  value={formData.villageTa}
                  onChange={(e) => setFormData({ ...formData, villageTa: e.target.value })}
                  placeholder="எ.கா: மேலவளவு கிராமம், வார்டு 4"
                  className="w-full p-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-tamil"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  District & State (English)
                </label>
                <input
                  type="text"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="e.g. Madurai Dist, Tamil Nadu"
                  className="w-full p-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  மாவட்டம் & மாநிலம் (தமிழ்)
                </label>
                <input
                  type="text"
                  value={formData.districtTa}
                  onChange={(e) => setFormData({ ...formData, districtTa: e.target.value })}
                  placeholder="எ.கா: மதுரை மாவட்டம், தமிழ்நாடு"
                  className="w-full p-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-tamil"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Registration / Trust No. (Optional)
                </label>
                <input
                  type="text"
                  value={formData.regNumber}
                  onChange={(e) => setFormData({ ...formData, regNumber: e.target.value })}
                  placeholder="e.g. Reg. No: 142/2018 or Trust ID"
                  className="w-full p-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Header Tagline Badge (e.g. OFFLINE-FIRST, ESTD. 2018)
                </label>
                <input
                  type="text"
                  value={formData.headerBadge}
                  onChange={(e) => setFormData({ ...formData, headerBadge: e.target.value })}
                  placeholder="e.g. OFFLINE-FIRST, REGISTERED TRUST"
                  className="w-full p-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-mono font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Contact & Helpline */}
          <div className="space-y-3">
            <div className="border-b border-stone-200 pb-1.5">
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-700" />
                <span>{lang === 'ta' ? '4. தொடர்பு எண் & மின்னஞ்சல் (ரசீதில் அச்சிடப்பட)' : '4. Official Contact & Helpline (Printed on Receipts)'}</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>Contact Phone / WhatsApp</span>
                </label>
                <input
                  type="text"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="e.g. +91 98421 76540"
                  className="w-full p-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  <span>Official Email Address</span>
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="e.g. treasury@gramanidhi.org"
                  className="w-full p-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  name: 'GramaNidhi',
                  nameTa: 'கிராமநிதி',
                  subtitle: 'Village Community Welfare Fund',
                  subtitleTa: 'கிராம பொது நல நிதியம்',
                  village: 'Melavalavu Village',
                  villageTa: 'மேலவளவு கிராமம்',
                  district: 'Madurai Dist',
                  districtTa: 'மதுரை மாவட்டம்',
                  regNumber: 'Reg. No: 142/2018',
                  contactPhone: '+91 98421 76540',
                  contactEmail: 'contact@gramanidhi.org',
                  headerBadge: 'OFFLINE-FIRST',
                  logoType: 'preset_icon',
                  presetIcon: 'rupee',
                  logoBgColor: '#15803d',
                });
              }}
              className="px-3.5 py-2 rounded-xl border border-stone-300 text-stone-600 hover:bg-stone-50 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{lang === 'ta' ? 'இயல்பு நிலைக்கு மீட்டமை' : 'Reset Defaults'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-bold transition"
              >
                {lang === 'ta' ? 'ரத்து' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
                    <span>{lang === 'ta' ? 'சேமிக்கப்பட்டது!' : 'Saved!'}</span>
                  </>
                ) : (
                  <span>
                    {isSaving 
                      ? (lang === 'ta' ? 'சேமிக்கப்படுகிறது...' : 'Saving...') 
                      : (lang === 'ta' ? 'சேமித்து செயல்படுத்துக' : 'Save & Apply')}
                  </span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
