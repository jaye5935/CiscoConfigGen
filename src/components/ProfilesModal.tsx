import React, { useRef, useState } from 'react';
import { Bookmark, Database, Download, FolderOpen, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { SavedProfile, SwitchConfigState } from '../types/cisco';
import { PRESET_CONFIGS } from '../utils/ciscoGenerator';
import { inputClassName } from './FormControls';

interface ProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: SwitchConfigState;
  savedProfiles: SavedProfile[];
  onSaveProfile: (name: string) => void;
  onLoadConfig: (config: SwitchConfigState) => void;
  onDeleteProfile: (id: string) => void;
  onImportProfiles: (profiles: SavedProfile[]) => Promise<void>;
}

export const ProfilesModal: React.FC<ProfilesModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  savedProfiles,
  onSaveProfile,
  onLoadConfig,
  onDeleteProfile,
  onImportProfiles,
}) => {
  const [profileName, setProfileName] = useState(currentConfig.hostname || 'SW-Template');
  const [searchQuery, setSearchQuery] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    onSaveProfile(profileName.trim());
    setProfileName('');
  };

  const handleExportDatabase = () => {
    const payload = JSON.stringify(savedProfiles, null, 2);
    const blob = new Blob([payload], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cisco-config-db-backup.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as SavedProfile[];
      if (!Array.isArray(parsed)) {
        setImportStatus('ساختار فایل پشتیبان معتبر نیست.');
        return;
      }
      await onImportProfiles(parsed);
      setImportStatus(`${parsed.length} پروفایل با موفقیت به دیتابیس محلی اضافه شد.`);
    } catch {
      setImportStatus('خطا در خواندن فایل پشتیبان JSON.');
    } finally {
      e.target.value = '';
    }
  };

  const filteredProfiles = savedProfiles.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.config.hostname.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profiles-modal-title"
    >
      <div className="w-full sm:max-w-lg max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-5 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 id="profiles-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                الگوها و دیتابیس محلی دستگاه
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                <span>ذخیره‌سازی آفلاین در دیتابیس IndexedDB گوشی</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="بستن"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-5 space-y-6">
          {/* Save current */}
          <form onSubmit={handleSave} className="space-y-2">
            <label htmlFor="save-profile-name" className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
              ذخیره کانفیگ فعلی در دیتابیس محلی
            </label>
            <div className="flex items-center gap-2">
              <input
                id="save-profile-name"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="نام پروفایل (مثلاً سوئیچ طبقه دوم)"
                className={inputClassName}
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                <Save className="w-4 h-4" />
                <span>ذخیره</span>
              </button>
            </div>
          </form>

          {/* Saved in IndexedDB */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 tabular-nums">
                <FolderOpen className="w-3.5 h-3.5" />
                <span>پروفایل‌های ذخیره‌شده ({savedProfiles.length})</span>
              </h3>
              <div className="flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>بازیابی</span>
                </button>
                {savedProfiles.length > 0 && (
                  <button
                    type="button"
                    onClick={handleExportDatabase}
                    className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>پشتیبان JSON</span>
                  </button>
                )}
              </div>
            </div>

            {importStatus && (
              <div className="text-xs text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 rounded-xl px-3 py-2">
                {importStatus}
              </div>
            )}

            {savedProfiles.length > 2 && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجو بر اساس نام یا Hostname..."
                  className={`${inputClassName} pr-9 text-xs`}
                />
              </div>
            )}

            {filteredProfiles.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                {savedProfiles.length === 0
                  ? 'هنوز پروفایلی در دیتابیس محلی ذخیره نکرده‌اید.'
                  : 'موردی با این جستجو پیدا نشد.'}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredProfiles.map((prof) => (
                  <div
                    key={prof.id}
                    className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onLoadConfig(structuredClone(prof.config));
                        onClose();
                      }}
                      className="flex-1 text-right cursor-pointer min-h-[40px]"
                    >
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{prof.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                        {prof.config.hostname} · {prof.config.vlans.length} VLAN · {prof.updatedAt}
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteProfile(prof.id)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                      aria-label="حذف پروفایل"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Factory Presets */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5" />
              <span>الگوهای استاندارد سیسکو</span>
            </h3>
            <div className="space-y-2">
              {(Object.keys(PRESET_CONFIGS) as Array<keyof typeof PRESET_CONFIGS>).map((key) => {
                const preset = PRESET_CONFIGS[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      onLoadConfig(structuredClone(preset.config));
                      onClose();
                    }}
                    className="w-full text-right p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-sky-400 dark:hover:border-sky-700 bg-slate-50/70 dark:bg-slate-950/60 transition-colors cursor-pointer"
                  >
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{preset.label}</div>
                    <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{preset.subtitle}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
