import React, { useEffect, useState } from 'react';
import { Download, Share, X, Smartphone, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPwaBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if already running as installed standalone PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isAppleDevice);

    // Capture Android / Chrome PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  if (isStandalone || dismissed) return null;
  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
      {/* Floating Bottom / Top Install Banner */}
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-bounce-short">
        <div className="rounded-2xl border border-orange-500/40 bg-carbon-900/95 p-4 shadow-2xl shadow-black/80 backdrop-blur-xl flex items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white grid place-items-center shrink-0 shadow-md shadow-orange-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Install FieldLedger App</p>
              <p className="text-[11px] text-slate-300">Fast launch with a persistent field-data cache</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInstallClick}
              className="rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs px-3.5 py-2 shadow-md shadow-orange-500/20 transition-all shrink-0"
            >
              Install
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-carbon-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Step-by-Step Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-sm rounded-3xl border border-carbon-700 bg-carbon-900 p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-4 border-b border-carbon-800">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-orange-500 text-white grid place-items-center font-bold">
                  <Download className="w-4 h-4" />
                </span>
                <h4 className="font-bold text-sm text-white">Install on iPhone / iPad</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 my-5 text-xs text-slate-200">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-carbon-950 border border-carbon-800">
                <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold grid place-items-center shrink-0">1</span>
                <div>
                  <p className="font-bold text-white flex items-center gap-1.5">
                    Tap the Share button <Share className="w-3.5 h-3.5 text-blue-400 inline" />
                  </p>
                  <p className="text-slate-400 mt-0.5">In the bottom Safari toolbar.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-carbon-950 border border-carbon-800">
                <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold grid place-items-center shrink-0">2</span>
                <div>
                  <p className="font-bold text-white">Select "Add to Home Screen"</p>
                  <p className="text-slate-400 mt-0.5">Scroll down and tap the plus icon.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-carbon-950 border border-carbon-800">
                <span className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 font-bold grid place-items-center shrink-0">3</span>
                <div>
                  <p className="font-bold text-white">Tap "Add" in Top Right</p>
                    <p className="text-slate-400 mt-0.5">FieldLedger will appear as a full-screen app on your home screen.</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold py-3 text-xs shadow-lg shadow-orange-500/25"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
};
