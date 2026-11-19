import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowGuide(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        title="نصب به عنوان اپلیکیشن اندروید و آفلاین"
      >
        {isInstallable ? <Download className="w-4 h-4 text-sky-600 dark:text-sky-400" /> : <Smartphone className="w-4 h-4 text-sky-600 dark:text-sky-400" />}
        <span>نصب اپ</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-title"
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
            <div className="flex items-center justify-between gap-4 mb-3">
              <h3 id="pwa-install-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                نصب روی گوشی اندروید و آیفون
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                aria-label="بستن"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed list-decimal list-inside">
                <li>در نوار پایین مرورگر Safari دکمه <strong>Share</strong> را بزنید.</li>
                <li>به پایین اسکرول کرده و گزینه <strong>Add to Home Screen</strong> را انتخاب کنید.</li>
                <li>دکمه <strong>Add</strong> را بزنید تا اپ به صورت آفلاین روی گوشی نصب شود.</li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed list-decimal list-inside">
                <li>صفحه را مستقیم در مرورگر <strong>Google Chrome</strong> گوشی اندرویدی باز کنید.</li>
                <li>منوی سه نقطه بالای مرورگر (<strong>⋮</strong>) را لمس کنید.</li>
                <li>گزینه <strong>Install app</strong> یا <strong>Add to Home screen</strong> را انتخاب کنید تا اپلیکیشن بدون نیاز به اینترنت اجرا شود.</li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-lg">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>حالت آفلاین فعال است — تولید کانفیگ بدون نیاز به اینترنت کار می‌کند</span>
    </div>
  );
};
