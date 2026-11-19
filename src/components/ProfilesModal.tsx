import React, { useState } from 'react';
import { Bookmark, FolderOpen, Save, Trash2, X } from 'lucide-react';
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
}

export const ProfilesModal: React.FC<ProfilesModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  savedProfiles,
  onSaveProfile,
  onLoadConfig,
  onDeleteProfile,
}) => {
  const [profileName, setProfileName] = useState(currentConfig.hostname || 'SW-Template');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    onSaveProfile(profileName.trim());
    setProfileName('');
  };

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
                الگوهای آماده و پروفایل‌های ذخیره‌شده
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                ذخیره آفلاین کانفیگ‌ها در حافظه گوشی برای استفاده مجدد
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
              ذخیره کانفیگ فعلی در حافظه دستگاه
            </label>
            <div className="flex items-center gap-2">
              <input
                id="save-profile-name"
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="نام پروفایل (مثلاً طبقه دوم)"
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

          {/* Saved in localStorage */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              <span>پروفایل‌های ذخیره شده ({savedProfiles.length})</span>
            </h3>

            {savedProfiles.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                هنوز پروفایلی ذخیره نکرده‌اید.
              </p>
            ) : (
              <div className="space-y-2">
                {savedProfiles.map((prof) => (
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
        </div>
      </div>
    </div>
  );
};
