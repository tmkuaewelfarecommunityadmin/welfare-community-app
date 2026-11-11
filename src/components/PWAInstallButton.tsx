import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, CheckCircle2 } from 'lucide-react';
import { Language } from '../types';

interface Props {
  lang: Language;
}

export const PWAInstallButton: React.FC<Props> = ({ lang }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-full border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>{lang === 'ta' ? 'செயலி நிறுவப்பட்டது' : 'App Installed'}</span>
      </div>
    );
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
        title="Install to Home Screen"
      >
        <Download className="w-3.5 h-3.5" />
        <span>{lang === 'ta' ? 'செயலியை நிறுவு' : 'Install PWA'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium shadow-xs transition-colors"
        >
          <Smartphone className="w-3.5 h-3.5 text-stone-500" />
          <span>{lang === 'ta' ? 'iPhone-இல் நிறுவு' : 'Install on iOS'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-stone-100">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                    GN
                  </div>
                  <h3 className="text-base font-bold text-stone-900">
                    {lang === 'ta' ? 'iPhone / iPad இல் நிறுவுதல்' : 'Install on iPhone / iPad'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-md text-stone-400 hover:text-stone-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-xs text-stone-600">
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                  <p>
                    {lang === 'ta' 
                      ? 'Safari உலாவியின் கீழ் உள்ள பகிர் (Share) பொத்தானைத் தட்டவும்.' 
                      : 'Tap the Share button in the Safari bottom toolbar.'}
                  </p>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-stone-50 border border-stone-200">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                  <p>
                    {lang === 'ta'
                      ? 'கீழே உருட்டி "முகப்புத் திரையில் சேர்" (Add to Home Screen) என்பதைத் தேர்வு செய்யவும்.'
                      : 'Scroll down and tap "Add to Home Screen".'}
                  </p>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">✓</span>
                  <p>
                    {lang === 'ta'
                      ? 'இப்போது செயலி இணையம் இல்லாதபோதும் நேரடியாக உங்கள் முகப்புத் திரையிலிருந்து இயங்கும்!'
                      : 'The app will now open instantly in standalone full-screen mode even with no internet!'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-stone-900 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 transition"
              >
                {lang === 'ta' ? 'புரிந்தது' : 'Done'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
