import React, { useState } from 'react';
import { Eye, EyeOff, KeyRound, Plus, RefreshCw, ShieldAlert, Trash2, UserPlus } from 'lucide-react';
import { SecretType, SwitchConfigState, UserAccount } from '../types/cisco';
import { generateStrongPassword } from '../utils/ciscoGenerator';
import { FieldLabel, inputClassName } from './FormControls';

interface BasicAndUsersTabProps {
  config: SwitchConfigState;
  onChange: (updater: (prev: SwitchConfigState) => SwitchConfigState) => void;
}

export const BasicAndUsersTab: React.FC<BasicAndUsersTabProps> = ({ config, onChange }) => {
  const [showEnableSecret, setShowEnableSecret] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddUser = () => {
    const newUser: UserAccount = {
      id: `user-${Date.now()}`,
      username: `admin${config.users.length + 1}`,
      privilege: 15,
      secretType: 'secret',
      password: generateStrongPassword(12),
    };
    onChange((prev) => ({
      ...prev,
      users: [...prev.users, newUser],
    }));
  };

  const handleUpdateUser = (id: string, patch: Partial<UserAccount>) => {
    onChange((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }));
  };

  const handleRemoveUser = (id: string) => {
    onChange((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== id),
    }));
  };

  return (
    <div className="space-y-6">
      {/* System Identity */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">هویت دستگاه و رمز Enable</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            تنظیم نام سوئیچ، دامنه شبکه برای کلید SSH و رمز دسترسی Privileged
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel htmlFor="hostname" label="نام سوئیچ (Hostname)" hint="بدون فاصله" />
            <input
              id="hostname"
              type="text"
              dir="ltr"
              value={config.hostname}
              onChange={(e) => onChange((prev) => ({ ...prev, hostname: e.target.value }))}
              placeholder="SW-ACCESS-01"
              className={`${inputClassName} font-mono text-left`}
            />
          </div>

          <div>
            <FieldLabel htmlFor="domain-name" label="نام دامنه (Domain Name)" hint="الزامی برای SSH" />
            <input
              id="domain-name"
              type="text"
              dir="ltr"
              value={config.domainName}
              onChange={(e) => onChange((prev) => ({ ...prev, domainName: e.target.value }))}
              placeholder="corp.local"
              className={`${inputClassName} font-mono text-left`}
            />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-7">
              <FieldLabel htmlFor="enable-secret" label="رمز Enable Secret" hint="دسترسی سطح مدیر" />
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    id="enable-secret"
                    type={showEnableSecret ? 'text' : 'password'}
                    dir="ltr"
                    value={config.enableSecret}
                    onChange={(e) => onChange((prev) => ({ ...prev, enableSecret: e.target.value }))}
                    placeholder="StrongEnableSecret!"
                    className={`${inputClassName} font-mono text-left pl-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEnableSecret((v) => !v)}
                    className="absolute left-1 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                    aria-label={showEnableSecret ? 'مخفی کردن رمز' : 'نمایش رمز'}
                  >
                    {showEnableSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChange((prev) => ({ ...prev, enableSecret: generateStrongPassword(14) }))
                  }
                  className="min-h-[44px] min-w-[44px] px-3 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
                  title="ساخت رمز تصادفی قوی"
                >
                  <RefreshCw className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                  <span className="hidden sm:inline">تصادفی</span>
                </button>
              </div>
            </div>

            <div className="sm:col-span-5">
              <FieldLabel label="الگوریتم هش Enable" />
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, enableAlgorithm: 'secret' }))}
                  className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap px-2 ${
                    config.enableAlgorithm === 'secret'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Secret (Type 5)
                </button>
                <button
                  type="button"
                  onClick={() => onChange((prev) => ({ ...prev, enableAlgorithm: 'scrypt' }))}
                  className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap px-2 ${
                    config.enableAlgorithm === 'scrypt'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Scrypt (Type 9)
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Local Users */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">کاربران محلی (Local Users)</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              ساخت نام کاربری، تعیین سطح دسترسی (Privilege) و رمز عبور امن
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddUser}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>افزودن کاربر</span>
          </button>
        </div>

        {config.users.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center">
            <KeyRound className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">هنوز کاربری تعریف نشده است</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              برای ورود با SSH روی سوئیچ حداقل یک کاربر با سطح دسترسی 15 بسازید.
            </p>
            <button
              type="button"
              onClick={handleAddUser}
              className="mt-4 inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ساخت اولین کاربر</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {config.users.map((user, index) => {
              const isVisible = !!visiblePasswords[user.id];
              return (
                <div key={user.id} className="py-4 first:pt-1 last:pb-1 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      <span className="font-bold text-slate-800 dark:text-slate-200">کاربر {index + 1}</span>
                      <span aria-hidden="true">·</span>
                      <span>سطح {user.privilege}</span>
                      <span aria-hidden="true">·</span>
                      <span>{user.privilege === 15 ? 'مدیر کل' : user.privilege === 1 ? 'فقط مشاهده' : 'سفارشی'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveUser(user.id)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                      aria-label="حذف کاربر"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-4">
                      <FieldLabel label="نام کاربری (Username)" />
                      <input
                        type="text"
                        dir="ltr"
                        value={user.username}
                        onChange={(e) => handleUpdateUser(user.id, { username: e.target.value })}
                        placeholder="netadmin"
                        className={`${inputClassName} font-mono text-left`}
                      />
                    </div>

                    <div className="sm:col-span-4">
                      <FieldLabel label="سطح دسترسی (Privilege)" />
                      <select
                        value={user.privilege}
                        onChange={(e) => handleUpdateUser(user.id, { privilege: Number(e.target.value) })}
                        className={inputClassName}
                      >
                        <option value={15}>15 — مدیر کامل (Full Admin)</option>
                        <option value={1}>1 — کاربر عادی (Read-Only)</option>
                        <option value={7}>7 — اپراتور سطح میانی</option>
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <FieldLabel label="نوع رمزنگاری" />
                      <select
                        value={user.secretType}
                        onChange={(e) =>
                          handleUpdateUser(user.id, { secretType: e.target.value as SecretType })
                        }
                        className={inputClassName}
                      >
                        <option value="secret">secret (هش MD5 / Type 5)</option>
                        <option value="scrypt">scrypt (امن‌تر / Type 9)</option>
                        <option value="password">password (Type 7 - ضعیف)</option>
                      </select>
                    </div>

                    <div className="sm:col-span-12">
                      <FieldLabel label="رمز عبور کاربر" />
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type={isVisible ? 'text' : 'password'}
                            dir="ltr"
                            value={user.password}
                            onChange={(e) => handleUpdateUser(user.id, { password: e.target.value })}
                            placeholder="رمز عبور قوی..."
                            className={`${inputClassName} font-mono text-left pl-11`}
                          />
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="absolute left-1 top-1/2 -translate-y-1/2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                            aria-label={isVisible ? 'مخفی کردن رمز' : 'نمایش رمز'}
                          >
                            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateUser(user.id, { password: generateStrongPassword(14) })
                          }
                          className="min-h-[44px] px-3.5 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer shrink-0"
                        >
                          <RefreshCw className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                          <span>تولید رمز</span>
                        </button>
                      </div>
                      {user.secretType === 'password' && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                          <span>رمز Type 7 قابل رمزگشایی است؛ در محیط عملیاتی از secret یا scrypt استفاده کنید.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Login Banner */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">مدیریت بنرها (Banner MOTD)</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              نمایش اخطار قانونی پیش از ورود و غیرفعال‌سازی بنرهای اضافی
            </p>
          </div>
          <div className="flex items-center gap-2">
            {config.bannerMotd.trim() && (
              <button
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, bannerMotd: '' }))}
                className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
              >
                حذف متن
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  bannerMotd:
                    'WARNING: Authorized Personnel Only. Unauthorized access is strictly prohibited and logged.',
                }))
              }
              className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              درج متن استاندارد
            </button>
          </div>
        </div>

        <textarea
          rows={3}
          dir="ltr"
          value={config.bannerMotd}
          onChange={(e) => onChange((prev) => ({ ...prev, bannerMotd: e.target.value }))}
          placeholder="WARNING: Authorized access only..."
          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-3.5 text-xs font-mono text-left text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
        />

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <label htmlFor="basic-extra-banners" className="flex-1 cursor-pointer select-none">
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              غیرفعال‌سازی بنرهای اضافی (Exec / Incoming / Login)
            </div>
            <div dir="ltr" className="mt-0.5 text-right sm:text-left font-mono text-[11px] text-sky-700 dark:text-sky-400">
              no banner exec · no banner incoming · no banner login
            </div>
          </label>
          <button
            id="basic-extra-banners"
            type="button"
            role="switch"
            aria-checked={config.hardening.disableExtraBanners}
            onClick={() =>
              onChange((prev) => ({
                ...prev,
                hardening: {
                  ...prev.hardening,
                  disableExtraBanners: !prev.hardening.disableExtraBanners,
                },
              }))
            }
            className="relative inline-flex shrink-0 items-center min-h-[44px] px-1 cursor-pointer"
          >
            <span
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                config.hardening.disableExtraBanners ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  config.hardening.disableExtraBanners ? '-translate-x-6' : '-translate-x-1'
                }`}
              />
            </span>
          </button>
        </div>
      </section>
    </div>
  );
};
