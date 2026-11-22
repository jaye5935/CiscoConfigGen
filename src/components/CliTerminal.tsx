import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Copy, Download, FileCode2, Share2, Terminal } from 'lucide-react';
import { SwitchConfigState } from '../types/cisco';
import {
  generateCiscoCli,
  generateStartupConfigFile,
  generateVerificationCommands,
  generateVlanConfigFile,
  validateSwitchConfig,
} from '../utils/ciscoGenerator';

interface CliTerminalProps {
  config: SwitchConfigState;
}

type OutputMode = 'config' | 'startup' | 'vlan' | 'verify';

export const CliTerminal: React.FC<CliTerminalProps> = ({ config }) => {
  const [viewMode, setViewMode] = useState<OutputMode>('config');
  const [copied, setCopied] = useState(false);

  const cliText = useMemo(() => {
    switch (viewMode) {
      case 'startup':
        return generateStartupConfigFile(config);
      case 'vlan':
        return generateVlanConfigFile(config);
      case 'verify':
        return generateVerificationCommands(config);
      case 'config':
      default:
        return generateCiscoCli(config);
    }
  }, [config, viewMode]);

  const warnings = useMemo(() => validateSwitchConfig(config), [config]);
  const lines = useMemo(() => cliText.split('\n'), [cliText]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cliText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = cliText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const triggerDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = (asConfigText = false) => {
    const safeName = (config.hostname.trim() || 'cisco-switch').replace(/[^a-zA-Z0-9_-]/g, '_');
    if (viewMode === 'startup') {
      triggerDownload(asConfigText ? 'config.text' : `${safeName}-startup.cfg`, cliText);
    } else if (viewMode === 'vlan') {
      triggerDownload(`${safeName}-vlans.cfg`, cliText);
    } else if (viewMode === 'verify') {
      triggerDownload(`${safeName}-verify.txt`, cliText);
    } else {
      triggerDownload(`${safeName}-config.cfg`, cliText);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Cisco Config - ${config.hostname || 'Switch'}`,
          text: cliText,
        });
      } catch {
        // User cancelled share sheet
      }
    } else {
      await handleCopy();
    }
  };

  const renderLineColor = (line: string) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('!')) {
      return 'text-slate-500';
    }
    if (
      trimmed.startsWith('interface ') ||
      trimmed.startsWith('vlan ') ||
      trimmed.startsWith('line ') ||
      trimmed === 'configure terminal' ||
      trimmed === 'end' ||
      trimmed === 'write memory'
    ) {
      return 'text-sky-400 font-semibold';
    }
    if (trimmed.startsWith('no ') || trimmed.includes('deny ') || trimmed === 'shutdown') {
      return 'text-amber-300';
    }
    if (
      trimmed.startsWith('hostname ') ||
      trimmed.startsWith('username ') ||
      trimmed.startsWith('enable ') ||
      trimmed.startsWith('ip ssh ') ||
      trimmed.startsWith('crypto ')
    ) {
      return 'text-emerald-300';
    }
    return 'text-slate-100';
  };

  const modeTabs: Array<{ id: OutputMode; label: string }> = [
    { id: 'config', label: 'کانفیگ CLI' },
    { id: 'startup', label: 'فایل سوییچ' },
    { id: 'vlan', label: 'فایل VLAN' },
    { id: 'verify', label: 'دستورات تست' },
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* Validation notices */}
      {warnings.length > 0 && (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-900/70 bg-amber-50/80 dark:bg-amber-950/30 p-3.5 space-y-1.5">
          {warnings.map((w) => (
            <div
              key={w.id}
              className={`flex items-start gap-2 text-xs leading-relaxed ${
                w.level === 'error'
                  ? 'text-rose-700 dark:text-rose-300 font-medium'
                  : 'text-amber-800 dark:text-amber-300'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Terminal Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950 text-slate-100 overflow-hidden shadow-lg">
        {/* Terminal Header */}
        <div className="flex flex-col gap-2 px-3.5 py-2.5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="text-[11px] text-slate-400 tabular-nums">
                {lines.length} خط
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleShare}
                className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                title="اشتراک‌گذاری"
                aria-label="اشتراک‌گذاری کانفیگ"
              >
                <Share2 className="w-4 h-4" />
              </button>

              {viewMode === 'startup' && (
                <button
                  type="button"
                  onClick={() => handleDownload(true)}
                  className="min-h-[38px] px-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-sky-700/70 bg-sky-950/60 hover:bg-sky-900/60 text-xs font-medium text-sky-300 transition-colors cursor-pointer whitespace-nowrap"
                  title="دانلود استاندارد با نام config.text برای فلش سوئیچ"
                >
                  <FileCode2 className="w-4 h-4" />
                  <span>config.text</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDownload(false)}
                className="min-h-[38px] px-2.5 flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
                title="دانلود فایل کانفیگ"
              >
                <Download className="w-4 h-4" />
                <span>{viewMode === 'verify' ? '.txt' : '.cfg'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className={`min-h-[38px] px-3 flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-sky-600 hover:bg-sky-500 text-white'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'کپی شد' : 'کپی'}</span>
              </button>
            </div>
          </div>

          {/* 4-Mode Segmented Switcher */}
          <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-800/90">
            {modeTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setViewMode(tab.id)}
                className={`min-h-[34px] px-1.5 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap truncate ${
                  viewMode === tab.id
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Tip Strip for File Modes */}
        {(viewMode === 'startup' || viewMode === 'vlan') && (
          <div className="px-3.5 py-2 border-b border-slate-800 bg-slate-900/50 text-[11px] text-slate-300 flex flex-wrap items-center justify-between gap-2">
            <span>
              {viewMode === 'startup'
                ? 'فایل استاندارد Startup-Config برای آپلود مستقیم روی سوئیچ:'
                : 'فایل مستقل VLANها برای آپلود یا اعمال روی سوئیچ:'}
            </span>
            <code dir="ltr" className="font-mono text-sky-400 text-[11px]">
              {viewMode === 'startup'
                ? 'copy tftp: startup-config'
                : 'copy tftp: running-config'}
            </code>
          </div>
        )}

        {/* Code Area (strictly LTR) */}
        <div
          dir="ltr"
          className="cli-scroll overflow-x-auto max-h-[60vh] lg:max-h-[calc(100vh-16rem)] overflow-y-auto p-3.5 text-left font-mono text-[12px] leading-relaxed"
        >
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-900/70">
                  <td className="select-none pr-3 text-right text-[11px] text-slate-600 tabular-nums align-top w-8">
                    {idx + 1}
                  </td>
                  <td className={`whitespace-pre align-top ${renderLineColor(line)}`}>{line || ' '}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
