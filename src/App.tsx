import { useEffect, useMemo, useState } from 'react';
import {
  FolderOpen,
  Moon,
  Network,
  RotateCcw,
  ShieldCheck,
  Sun,
  Terminal,
  UserCog,
} from 'lucide-react';
import { BasicAndUsersTab } from './components/BasicAndUsersTab';
import { CliTerminal } from './components/CliTerminal';
import { HardeningTab } from './components/HardeningTab';
import { OfflineIndicator, PWAInstallButton } from './components/PWAInstallButton';
import { ProfilesModal } from './components/ProfilesModal';
import { VlanAndPortsTab } from './components/VlanAndPortsTab';
import { SavedProfile, SwitchConfigState } from './types/cisco';
import { getHardeningSummary, PRESET_CONFIGS } from './utils/ciscoGenerator';

type ActiveTab = 'basic' | 'vlan' | 'hardening' | 'cli';

const STORAGE_KEY_CURRENT = 'ciscosaz_current_config_v6';
const STORAGE_KEY_PROFILES = 'ciscosaz_saved_profiles_v1';
const STORAGE_KEY_THEME = 'ciscosaz_theme_v1';

export default function App() {
  const [config, setConfig] = useState<SwitchConfigState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (saved) {
        const parsed = JSON.parse(saved) as SwitchConfigState;
        return {
          ...structuredClone(PRESET_CONFIGS.standard.config),
          ...parsed,
          hardening: {
            ...PRESET_CONFIGS.standard.config.hardening,
            ...(parsed.hardening ?? {}),
          },
        };
      }
    } catch {
      // ignore parse errors
    }
    return structuredClone(PRESET_CONFIGS.standard.config);
  });

  const [savedProfiles, setSavedProfiles] = useState<SavedProfile[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
      if (raw) {
        return JSON.parse(raw) as SavedProfile[];
      }
    } catch {
      // ignore parse errors
    }
    return [];
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('basic');
  const [isProfilesOpen, setIsProfilesOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_THEME);
      if (stored === 'dark') return true;
      if (stored === 'light') return false;
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem(STORAGE_KEY_THEME, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(STORAGE_KEY_THEME, 'light');
    }
  }, [isDark]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(config));
    } catch {
      // ignore quota errors
    }
  }, [config]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(savedProfiles));
    } catch {
      // ignore quota errors
    }
  }, [savedProfiles]);

  const hardeningSummary = useMemo(
    () => getHardeningSummary(config.hardening),
    [config.hardening]
  );

  const handleSaveProfile = (name: string) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fa-IR');
    const newProfile: SavedProfile = {
      id: `prof-${Date.now()}`,
      name,
      updatedAt: dateStr,
      config: structuredClone(config),
    };
    setSavedProfiles((prev) => [newProfile, ...prev]);
  };

  const handleDeleteProfile = (id: string) => {
    setSavedProfiles((prev) => prev.filter((p) => p.id !== id));
  };

  const handleReset = () => {
    setConfig(structuredClone(PRESET_CONFIGS.standard.config));
  };

  const desktopTab = activeTab === 'cli' ? 'basic' : activeTab;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 h-[52px] lg:h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Brand Title */}
          <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
            سیسکو ساز
          </span>

          {/* Zone 2: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                desktopTab === 'basic'
                  ? 'border-sky-600 text-sky-700 dark:text-sky-400 font-semibold'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              هویت و کاربران
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vlan')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                desktopTab === 'vlan'
                  ? 'border-sky-600 text-sky-700 dark:text-sky-400 font-semibold'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              شبکه و VLAN
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('hardening')}
              className={`py-1.5 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                desktopTab === 'hardening'
                  ? 'border-sky-600 text-sky-700 dark:text-sky-400 font-semibold'
                  : 'border-transparent hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              هاردینگ سیسکو
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="py-1.5 border-b-2 border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              بازنشانی
            </button>
          </nav>

          {/* Zone 3: Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsDark((d) => !d)}
              className="min-h-[40px] min-w-[40px] lg:min-h-[44px] lg:min-w-[44px] flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              aria-label={isDark ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک'}
              title={isDark ? 'حالت روشن' : 'حالت تاریک'}
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <PWAInstallButton />

            <button
              type="button"
              onClick={() => setIsProfilesOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 min-h-[40px] lg:min-h-[44px] px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4" />
              <span>الگوها</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 pb-24 lg:py-6">
        {/* Clean unboxed metadata summary strip */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            <span dir="ltr" className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {config.hostname.trim() || 'Switch'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{config.users.length} کاربر</span>
            <span aria-hidden="true">·</span>
            <span>{config.vlans.length} VLAN</span>
            <span aria-hidden="true">·</span>
            <span>
              {hardeningSummary.active}/{hardeningSummary.total} کنترل امنیتی
            </span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="lg:hidden inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 min-h-[36px] px-2 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>پیش‌فرض</span>
          </button>
        </div>

        {/* Responsive 2-Column Workspace on Desktop, Single Tabbed Flow on Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Configuration Form Column */}
          <div className={`lg:col-span-7 ${activeTab === 'cli' ? 'hidden lg:block' : 'block'}`}>
            {/* Desktop section switcher pills/segmented */}
            <div className="hidden lg:grid grid-cols-3 gap-1 p-1 mb-5 rounded-xl bg-slate-200/70 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`min-h-[42px] rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  desktopTab === 'basic'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <UserCog className="w-4 h-4" />
                <span>هویت و کاربران</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vlan')}
                className={`min-h-[42px] rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  desktopTab === 'vlan'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Network className="w-4 h-4" />
                <span>VLAN و پورت‌ها</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('hardening')}
                className={`min-h-[42px] rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                  desktopTab === 'hardening'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>هاردینگ سیسکو</span>
              </button>
            </div>

            {desktopTab === 'basic' && <BasicAndUsersTab config={config} onChange={setConfig} />}
            {desktopTab === 'vlan' && <VlanAndPortsTab config={config} onChange={setConfig} />}
            {desktopTab === 'hardening' && <HardeningTab config={config} onChange={setConfig} />}
          </div>

          {/* Live CLI Output Column (sticky on desktop, dedicated tab on mobile) */}
          <div
            className={`lg:col-span-5 lg:sticky lg:top-20 ${
              activeTab === 'cli' ? 'block' : 'hidden lg:block'
            }`}
          >
            <CliTerminal config={config} />
          </div>
        </div>
      </main>

      {/* Mobile Bottom Thumb-Zone Navigation Bar */}
      <nav
        aria-label="منوی اصلی موبایل"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 pb-safe"
      >
        <div className="grid grid-cols-4 h-16 items-center">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`flex flex-col items-center justify-center min-h-[48px] transition-colors cursor-pointer ${
              activeTab === 'basic'
                ? 'text-sky-600 dark:text-sky-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <UserCog className="w-5 h-5" />
            <span className="mt-1 text-[11px] font-semibold tracking-tight whitespace-nowrap">
              کاربر و نام
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vlan')}
            className={`flex flex-col items-center justify-center min-h-[48px] transition-colors cursor-pointer ${
              activeTab === 'vlan'
                ? 'text-sky-600 dark:text-sky-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Network className="w-5 h-5" />
            <span className="mt-1 text-[11px] font-semibold tracking-tight whitespace-nowrap">
              VLAN و پورت
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('hardening')}
            className={`flex flex-col items-center justify-center min-h-[48px] transition-colors cursor-pointer ${
              activeTab === 'hardening'
                ? 'text-sky-600 dark:text-sky-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span className="mt-1 text-[11px] font-semibold tracking-tight whitespace-nowrap">
              هاردینگ
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cli')}
            className={`flex flex-col items-center justify-center min-h-[48px] transition-colors cursor-pointer ${
              activeTab === 'cli'
                ? 'text-sky-600 dark:text-sky-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <Terminal className="w-5 h-5" />
            <span className="mt-1 text-[11px] font-semibold tracking-tight whitespace-nowrap">
              خروجی CLI
            </span>
          </button>
        </div>
      </nav>

      {/* Saved Profiles & Presets Modal */}
      <ProfilesModal
        isOpen={isProfilesOpen}
        onClose={() => setIsProfilesOpen(false)}
        currentConfig={config}
        savedProfiles={savedProfiles}
        onSaveProfile={handleSaveProfile}
        onLoadConfig={setConfig}
        onDeleteProfile={handleDeleteProfile}
      />

      {/* Offline Connectivity Banner */}
      <OfflineIndicator />
    </div>
  );
}
