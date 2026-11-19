import React from 'react';
import { Network, Plus, Trash2 } from 'lucide-react';
import {
  PortGroupConfig,
  PortMediaType,
  PortMode,
  SwitchConfigState,
  ViolationMode,
  VlanConfig,
} from '../types/cisco';
import { formatInterfaceCommand } from '../utils/ciscoGenerator';
import { FieldLabel, inputClassName } from './FormControls';

const PORT_TYPES: Array<{
  value: PortMediaType;
  short: string;
  label: string;
  defaultSlot: string;
}> = [
  { value: 'FastEthernet', short: 'Fa', label: 'FastEthernet', defaultSlot: '0/' },
  { value: 'GigabitEthernet', short: 'Gi', label: 'GigabitEthernet', defaultSlot: '1/0/' },
  { value: 'TenGigabitEthernet', short: 'Te', label: 'TenGigabit', defaultSlot: '1/0/' },
  { value: 'Port-channel', short: 'Po', label: 'Port-channel', defaultSlot: '' },
];

interface VlanAndPortsTabProps {
  config: SwitchConfigState;
  onChange: (updater: (prev: SwitchConfigState) => SwitchConfigState) => void;
}

const COMMON_VLANS: Array<{ vlanId: number; name: string; label: string }> = [
  { vlanId: 10, name: 'DATA_USERS', label: 'کاربران (10)' },
  { vlanId: 20, name: 'VOICE_IP', label: 'تلفن تحت شبکه (20)' },
  { vlanId: 30, name: 'GUEST_WIFI', label: 'مهمان (30)' },
  { vlanId: 50, name: 'SERVERS', label: 'سرورها (50)' },
  { vlanId: 99, name: 'MGMT', label: 'مدیریت (99)' },
  { vlanId: 999, name: 'BLACKHOLE', label: 'پورت غیرفعال (999)' },
];

export const VlanAndPortsTab: React.FC<VlanAndPortsTabProps> = ({ config, onChange }) => {
  const addVlan = (preset?: { vlanId: number; name: string }) => {
    const existingIds = new Set(config.vlans.map((v) => v.vlanId));
    let nextId = preset?.vlanId ?? 10;
    if (!preset) {
      while (existingIds.has(nextId) && nextId < 4094) {
        nextId += 10;
      }
    } else if (existingIds.has(preset.vlanId)) {
      return;
    }

    const newVlan: VlanConfig = {
      id: `vlan-${Date.now()}-${nextId}`,
      vlanId: nextId,
      name: preset?.name ?? `VLAN_${nextId}`,
      state: 'active',
    };

    onChange((prev) => ({
      ...prev,
      vlans: [...prev.vlans, newVlan].sort((a, b) => a.vlanId - b.vlanId),
    }));
  };

  const updateVlan = (id: string, patch: Partial<VlanConfig>) => {
    onChange((prev) => ({
      ...prev,
      vlans: prev.vlans.map((v) => (v.id === id ? { ...v, ...patch } : v)),
    }));
  };

  const removeVlan = (id: string) => {
    onChange((prev) => ({
      ...prev,
      vlans: prev.vlans.filter((v) => v.id !== id),
    }));
  };

  const addPortGroup = (mode: PortMode, singlePort = false) => {
    const firstVlan = config.vlans.find((v) => v.vlanId !== 999)?.vlanId ?? 10;
    const newPg: PortGroupConfig = {
      id: `pg-${Date.now()}`,
      portType: singlePort ? 'FastEthernet' : 'GigabitEthernet',
      slotPrefix: singlePort ? '0/' : '1/0/',
      portNumbers: singlePort
        ? '1'
        : mode === 'trunk'
        ? '23-24'
        : mode === 'shutdown'
        ? '21-22'
        : '1-12',
      mode,
      description: singlePort
        ? 'Workstation_Port_01'
        : mode === 'trunk'
        ? 'Uplink_Trunk'
        : mode === 'shutdown'
        ? 'Unused_Ports'
        : 'Access_Ports',
      accessVlan: mode === 'shutdown' ? 999 : firstVlan,
      voiceVlan: undefined,
      nativeVlan: config.management.vlanId || 99,
      allowedVlans: config.vlans.map((v) => v.vlanId).join(',') || '10,99',
      portFast: mode === 'access',
      bpduGuard: mode === 'access',
      portSecurity: mode === 'access',
      maxMac: 2,
      violation: 'restrict',
      stickyMac: false,
      stormControl: mode === 'access',
      dhcpTrust: mode === 'trunk',
    };

    onChange((prev) => ({
      ...prev,
      portGroups: [...prev.portGroups, newPg],
    }));
  };

  const updatePortGroup = (id: string, patch: Partial<PortGroupConfig>) => {
    onChange((prev) => ({
      ...prev,
      portGroups: prev.portGroups.map((pg) => (pg.id === id ? { ...pg, ...patch } : pg)),
    }));
  };

  const removePortGroup = (id: string) => {
    onChange((prev) => ({
      ...prev,
      portGroups: prev.portGroups.filter((pg) => pg.id !== id),
    }));
  };

  return (
    <div className="space-y-6">
      {/* VLANs Section */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">ساخت و مدیریت VLANها</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              تعریف شناسه، نام و وضعیت هر VLAN جهت جداسازی ترافیک شبکه
            </p>
          </div>
          <button
            type="button"
            onClick={() => addVlan()}
            className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن VLAN</span>
          </button>
        </div>

        {/* Quick presets */}
        <div className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-2">
            افزودن سریع VLANهای پرکاربرد:
          </div>
          <div className="flex flex-wrap gap-2">
            {COMMON_VLANS.map((preset) => {
              const exists = config.vlans.some((v) => v.vlanId === preset.vlanId);
              return (
                <button
                  key={preset.vlanId}
                  type="button"
                  disabled={exists}
                  onClick={() => addVlan(preset)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                    exists
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-sky-400 hover:text-sky-700 dark:hover:text-sky-300 cursor-pointer'
                  }`}
                >
                  + {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {config.vlans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center">
            <Network className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">هنوز VLANی تعریف نشده است</p>
          </div>
        ) : (
          <div className="space-y-3">
            {config.vlans.map((vlan) => (
              <div
                key={vlan.id}
                className="grid grid-cols-12 gap-2.5 items-end p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50"
              >
                <div className="col-span-4 sm:col-span-3">
                  <FieldLabel label="شناسه VLAN" />
                  <input
                    type="number"
                    min={2}
                    max={4094}
                    dir="ltr"
                    value={vlan.vlanId}
                    onChange={(e) =>
                      updateVlan(vlan.id, {
                        vlanId: Math.min(4094, Math.max(1, Number(e.target.value) || 1)),
                      })
                    }
                    className={`${inputClassName} font-mono tabular-nums text-left`}
                  />
                </div>

                <div className="col-span-8 sm:col-span-5">
                  <FieldLabel label="نام VLAN" />
                  <input
                    type="text"
                    dir="ltr"
                    value={vlan.name}
                    onChange={(e) => updateVlan(vlan.id, { name: e.target.value })}
                    placeholder="USERS"
                    className={`${inputClassName} font-mono text-left`}
                  />
                </div>

                <div className="col-span-9 sm:col-span-3">
                  <FieldLabel label="وضعیت" />
                  <select
                    value={vlan.state}
                    onChange={(e) =>
                      updateVlan(vlan.id, { state: e.target.value as 'active' | 'suspend' })
                    }
                    className={inputClassName}
                  >
                    <option value="active">فعال (Active)</option>
                    <option value="suspend">معلق (Suspend)</option>
                  </select>
                </div>

                <div className="col-span-3 sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeVlan(vlan.id)}
                    className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                    aria-label="حذف VLAN"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Management SVI */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">آی‌پی مدیریت سوئیچ (SVI)</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              آدرس‌دهی رابط مجازی مدیریت جهت اتصال SSH و مانیتورینگ
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={config.management.enabled}
            onClick={() =>
              onChange((prev) => ({
                ...prev,
                management: { ...prev.management, enabled: !prev.management.enabled },
              }))
            }
            className="relative inline-flex shrink-0 items-center min-h-[44px] px-1 cursor-pointer"
          >
            <span
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                config.management.enabled ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                  config.management.enabled ? '-translate-x-6' : '-translate-x-1'
                }`}
              />
            </span>
          </button>
        </div>

        {config.management.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <FieldLabel label="VLAN مدیریت" />
              <input
                type="number"
                min={1}
                max={4094}
                dir="ltr"
                value={config.management.vlanId}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    management: { ...prev.management, vlanId: Number(e.target.value) || 99 },
                  }))
                }
                className={`${inputClassName} font-mono tabular-nums text-left`}
              />
            </div>

            <div>
              <FieldLabel label="آدرس IP سوئیچ" />
              <input
                type="text"
                dir="ltr"
                value={config.management.ipAddress}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    management: { ...prev.management, ipAddress: e.target.value },
                  }))
                }
                placeholder="192.168.99.10"
                className={`${inputClassName} font-mono tabular-nums text-left`}
              />
            </div>

            <div>
              <FieldLabel label="Subnet Mask" />
              <input
                type="text"
                dir="ltr"
                value={config.management.subnetMask}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    management: { ...prev.management, subnetMask: e.target.value },
                  }))
                }
                placeholder="255.255.255.0"
                className={`${inputClassName} font-mono tabular-nums text-left`}
              />
            </div>

            <div>
              <FieldLabel label="Default Gateway" />
              <input
                type="text"
                dir="ltr"
                value={config.management.defaultGateway}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    management: { ...prev.management, defaultGateway: e.target.value },
                  }))
                }
                placeholder="192.168.99.1"
                className={`${inputClassName} font-mono tabular-nums text-left`}
              />
            </div>
          </div>
        )}
      </section>

      {/* Port Range Assignments */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">پیکربندی پورت‌ها (Interfaces)</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              تخصیص پورت‌های Access، Trunk و خاموش‌سازی پورت‌های بدون استفاده
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addPortGroup('access', true)}
              className="min-h-[40px] px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold cursor-pointer"
            >
              + تک پورت (Fa/Gi)
            </button>
            <button
              type="button"
              onClick={() => addPortGroup('access')}
              className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              + بازه Access
            </button>
            <button
              type="button"
              onClick={() => addPortGroup('trunk')}
              className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              + Trunk
            </button>
            <button
              type="button"
              onClick={() => addPortGroup('shutdown')}
              className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              + Shutdown
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {config.portGroups.map((pg, idx) => {
            const previewCmd = formatInterfaceCommand(pg);
            return (
            <div
              key={pg.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-slate-900 dark:text-slate-100">پورت / بازه {idx + 1}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {pg.mode === 'access'
                      ? 'حالت Access'
                      : pg.mode === 'trunk'
                      ? 'حالت Trunk'
                      : 'غیرفعال (Shutdown)'}
                  </span>
                  {previewCmd && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span dir="ltr" className="font-mono text-[11px] text-sky-700 dark:text-sky-400">
                        {previewCmd}
                      </span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removePortGroup(pg.id)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                  aria-label="حذف بازه پورت"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Port Type Selector */}
              <div>
                <FieldLabel label="نوع پورت (Interface Type)" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800">
                  {PORT_TYPES.map((pt) => {
                    const active = (pg.portType ?? 'GigabitEthernet') === pt.value;
                    return (
                      <button
                        key={pt.value}
                        type="button"
                        onClick={() => {
                          let nextSlot = pg.slotPrefix ?? '1/0/';
                          if (pt.value === 'Port-channel') {
                            nextSlot = '';
                          } else if (pt.value === 'FastEthernet' && (nextSlot === '1/0/' || nextSlot === '')) {
                            nextSlot = '0/';
                          } else if (
                            (pt.value === 'GigabitEthernet' || pt.value === 'TenGigabitEthernet') &&
                            (nextSlot === '' || pg.portType === 'FastEthernet')
                          ) {
                            nextSlot = pt.defaultSlot;
                          }
                          updatePortGroup(pg.id, {
                            portType: pt.value,
                            slotPrefix: nextSlot,
                          });
                        }}
                        className={`min-h-[40px] px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                          active
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        <span dir="ltr" className="font-mono font-bold text-sky-600 dark:text-sky-400">
                          {pt.short}
                        </span>
                        <span className="truncate">{pt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-4">
                  <FieldLabel label="اسلات / ماژول" hint="مثلاً 0/ یا 1/0/" />
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      dir="ltr"
                      value={pg.slotPrefix ?? ''}
                      onChange={(e) => updatePortGroup(pg.id, { slotPrefix: e.target.value })}
                      placeholder="0/ یا 1/0/"
                      className={`${inputClassName} font-mono tabular-nums text-left`}
                    />
                    <div className="flex flex-wrap gap-1">
                      {['0/', '1/0/', '1/1/', ''].map((slot) => (
                        <button
                          key={slot || 'none'}
                          type="button"
                          onClick={() => updatePortGroup(pg.id, { slotPrefix: slot })}
                          className={`px-2 py-1 rounded-lg text-[11px] font-mono border cursor-pointer ${
                            (pg.slotPrefix ?? '') === slot
                              ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 font-semibold'
                              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {slot || 'بدون اسلات'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sm:col-span-4">
                  <FieldLabel label="شماره پورت یا بازه" hint="تک پورت: 5 | بازه: 1-20" />
                  <input
                    type="text"
                    dir="ltr"
                    value={pg.portNumbers ?? ''}
                    onChange={(e) => updatePortGroup(pg.id, { portNumbers: e.target.value })}
                    placeholder="1 یا 1-24 یا 1,3,5-8"
                    className={`${inputClassName} font-mono tabular-nums text-left`}
                  />
                </div>

                <div className="sm:col-span-4">
                  <FieldLabel label="حالت پورت" />
                  <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800">
                    {(['access', 'trunk', 'shutdown'] as PortMode[]).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => updatePortGroup(pg.id, { mode: m })}
                        className={`min-h-[38px] rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                          pg.mode === m
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-sm'
                            : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {m === 'access' ? 'Access' : m === 'trunk' ? 'Trunk' : 'Shutdown'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-12">
                  <FieldLabel label="توضیحات پورت (Description)" hint="برای مستندسازی نام دستگاه یا کاربر" />
                  <input
                    type="text"
                    dir="ltr"
                    value={pg.description}
                    onChange={(e) => updatePortGroup(pg.id, { description: e.target.value })}
                    placeholder="HR_PC_01 یا Uplink_Core"
                    className={`${inputClassName} font-mono text-left`}
                  />
                </div>

                {pg.mode === 'access' && (
                  <>
                    <div>
                      <FieldLabel label="Data VLAN" />
                      <input
                        type="number"
                        min={1}
                        max={4094}
                        dir="ltr"
                        value={pg.accessVlan}
                        onChange={(e) =>
                          updatePortGroup(pg.id, { accessVlan: Number(e.target.value) || 10 })
                        }
                        className={`${inputClassName} font-mono tabular-nums text-left`}
                      />
                    </div>
                    <div>
                      <FieldLabel label="Voice VLAN (اختیاری)" />
                      <input
                        type="number"
                        min={0}
                        max={4094}
                        dir="ltr"
                        value={pg.voiceVlan ?? ''}
                        onChange={(e) =>
                          updatePortGroup(pg.id, {
                            voiceVlan: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                        placeholder="مثلاً 20"
                        className={`${inputClassName} font-mono tabular-nums text-left`}
                      />
                    </div>
                  </>
                )}

                {pg.mode === 'shutdown' && (
                  <div className="sm:col-span-2">
                    <FieldLabel label="VLAN قرنطینه / Blackhole" />
                    <input
                      type="number"
                      min={1}
                      max={4094}
                      dir="ltr"
                      value={pg.accessVlan}
                      onChange={(e) =>
                        updatePortGroup(pg.id, { accessVlan: Number(e.target.value) || 999 })
                      }
                      className={`${inputClassName} font-mono tabular-nums text-left`}
                    />
                  </div>
                )}

                {pg.mode === 'trunk' && (
                  <>
                    <div>
                      <FieldLabel label="Native VLAN" />
                      <input
                        type="number"
                        min={1}
                        max={4094}
                        dir="ltr"
                        value={pg.nativeVlan}
                        onChange={(e) =>
                          updatePortGroup(pg.id, { nativeVlan: Number(e.target.value) || 99 })
                        }
                        className={`${inputClassName} font-mono tabular-nums text-left`}
                      />
                    </div>
                    <div>
                      <FieldLabel label="Allowed VLANs" />
                      <input
                        type="text"
                        dir="ltr"
                        value={pg.allowedVlans}
                        onChange={(e) => updatePortGroup(pg.id, { allowedVlans: e.target.value })}
                        placeholder="10,20,99"
                        className={`${inputClassName} font-mono tabular-nums text-left`}
                      />
                    </div>
                  </>
                )}
              </div>

              {pg.mode === 'access' && (
                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'portFast', label: 'PortFast' },
                      { key: 'bpduGuard', label: 'BPDU Guard' },
                      { key: 'portSecurity', label: 'Port Security' },
                      { key: 'stormControl', label: 'Storm Control' },
                    ].map((opt) => {
                      const active = Boolean(pg[opt.key as keyof PortGroupConfig]);
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          onClick={() =>
                            updatePortGroup(pg.id, { [opt.key]: !active } as Partial<PortGroupConfig>)
                          }
                          className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                            active
                              ? 'border-sky-600 bg-sky-600 text-white'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>

                  {pg.portSecurity && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <FieldLabel label="حداکثر MAC مجاز" />
                        <input
                          type="number"
                          min={1}
                          max={64}
                          dir="ltr"
                          value={pg.maxMac}
                          onChange={(e) =>
                            updatePortGroup(pg.id, { maxMac: Math.max(1, Number(e.target.value) || 1) })
                          }
                          className={`${inputClassName} font-mono tabular-nums text-left`}
                        />
                      </div>
                      <div>
                        <FieldLabel label="واکنش تخلف (Violation)" />
                        <select
                          value={pg.violation}
                          onChange={(e) =>
                            updatePortGroup(pg.id, { violation: e.target.value as ViolationMode })
                          }
                          className={inputClassName}
                        >
                          <option value="restrict">restrict (مسدود + لاگ)</option>
                          <option value="shutdown">shutdown (خاموش کردن پورت)</option>
                          <option value="protect">protect (فقط مسدود)</option>
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => updatePortGroup(pg.id, { stickyMac: !pg.stickyMac })}
                          className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                            pg.stickyMac
                              ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300'
                              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {pg.stickyMac ? 'Sticky MAC: فعال' : 'Sticky MAC: غیرفعال'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {pg.mode === 'trunk' && (
                <div className="pt-2 border-t border-slate-200/70 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => updatePortGroup(pg.id, { dhcpTrust: !pg.dhcpTrust })}
                    className={`min-h-[40px] px-3.5 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      pg.dhcpTrust
                        ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {pg.dhcpTrust ? 'پورت مورد اعتماد (DHCP / ARP Trust): فعال' : 'پورت مورد اعتماد (Trust): غیرفعال'}
                  </button>
                </div>
              )}
            </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
