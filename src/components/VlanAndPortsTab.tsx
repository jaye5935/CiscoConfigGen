import React, { useEffect, useState } from 'react';
import { Download, Network, Plus, Trash2 } from 'lucide-react';
import {
  PortGroupConfig,
  PortMediaType,
  PortMode,
  SwitchConfigState,
  ViolationMode,
  VlanConfig,
} from '../types/cisco';
import { formatInterfaceCommand, generateVlanConfigFile } from '../utils/ciscoGenerator';
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

interface VlanItemRowProps {
  vlan: VlanConfig;
  onUpdate: (id: string, patch: Partial<VlanConfig>) => void;
  onRemove: (id: string) => void;
}

const VlanItemRow: React.FC<VlanItemRowProps> = ({ vlan, onUpdate, onRemove }) => {
  const [idText, setIdText] = useState(String(vlan.vlanId));

  useEffect(() => {
    setIdText(String(vlan.vlanId));
  }, [vlan.vlanId]);

  const handleIdChange = (raw: string) => {
    setIdText(raw);
    if (raw.trim() === '') return;
    const num = Number(raw);
    if (!Number.isNaN(num) && num >= 2 && num <= 4094) {
      onUpdate(vlan.id, { vlanId: Math.floor(num) });
    }
  };

  const handleIdBlur = () => {
    const num = Number(idText);
    const clamped = Number.isNaN(num) ? vlan.vlanId : Math.min(4094, Math.max(2, Math.floor(num)));
    setIdText(String(clamped));
    if (clamped !== vlan.vlanId) {
      onUpdate(vlan.id, { vlanId: clamped });
    }
  };

  return (
    <div className="grid grid-cols-12 gap-2.5 items-end p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50">
      <div className="col-span-4 sm:col-span-3">
        <FieldLabel label="شناسه VLAN" />
        <input
          type="number"
          min={2}
          max={4094}
          dir="ltr"
          value={idText}
          onChange={(e) => handleIdChange(e.target.value)}
          onBlur={handleIdBlur}
          className={`${inputClassName} font-mono tabular-nums text-left`}
        />
      </div>

      <div className="col-span-8 sm:col-span-5">
        <FieldLabel label="نام VLAN" />
        <input
          type="text"
          dir="ltr"
          value={vlan.name}
          onChange={(e) => onUpdate(vlan.id, { name: e.target.value })}
          placeholder="نام VLAN (مثلاً SALES)"
          className={`${inputClassName} font-mono text-left`}
        />
      </div>

      <div className="col-span-9 sm:col-span-3">
        <FieldLabel label="وضعیت" />
        <select
          value={vlan.state}
          onChange={(e) =>
            onUpdate(vlan.id, { state: e.target.value as 'active' | 'suspend' })
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
          onClick={() => onRemove(vlan.id)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
          aria-label="حذف VLAN"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const VlanAndPortsTab: React.FC<VlanAndPortsTabProps> = ({ config, onChange }) => {
  const [vlanIdInput, setVlanIdInput] = useState('');
  const [vlanNameInput, setVlanNameInput] = useState('');

  const handleDownloadVlansFile = () => {
    const content = generateVlanConfigFile(config);
    const safeName = (config.hostname.trim() || 'cisco-switch').replace(/[^a-zA-Z0-9_-]/g, '_');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}-vlans.cfg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const findNextFreeVlanId = (existingIds: Set<number>): number => {
    for (let id = 10; id <= 4090; id += 10) {
      if (!existingIds.has(id)) return id;
    }
    for (let id = 2; id <= 4094; id++) {
      if (!existingIds.has(id)) return id;
    }
    return 100;
  };

  const makeUid = (suffix: string | number) =>
    `vlan-${Date.now()}-${suffix}-${Math.random().toString(36).slice(2, 6)}`;

  const addEmptyVlanRow = () => {
    onChange((prev) => {
      const existingIds = new Set(prev.vlans.map((v) => v.vlanId));
      const nextId = findNextFreeVlanId(existingIds);
      const newVlan: VlanConfig = {
        id: makeUid(nextId),
        vlanId: nextId,
        name: '',
        state: 'active',
      };
      return {
        ...prev,
        vlans: [...prev.vlans, newVlan].sort((a, b) => a.vlanId - b.vlanId),
      };
    });
  };

  const addCustomVlans = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = vlanIdInput.trim();
    if (!raw) return;

    const idsToAdd: number[] = [];
    raw.split(',').forEach((chunk) => {
      const part = chunk.trim();
      if (!part) return;
      if (part.includes('-')) {
        const [a, b] = part.split('-').map((n) => Number(n.trim()));
        if (!Number.isNaN(a) && !Number.isNaN(b)) {
          const start = Math.max(2, Math.min(a, b));
          const end = Math.min(4094, Math.max(a, b));
          for (let id = start; id <= end && idsToAdd.length < 200; id++) {
            idsToAdd.push(id);
          }
        }
      } else {
        const id = Number(part);
        if (!Number.isNaN(id) && id >= 2 && id <= 4094) {
          idsToAdd.push(Math.floor(id));
        }
      }
    });

    if (idsToAdd.length === 0) return;

    const userProvidedName = vlanNameInput.trim();

    onChange((prev) => {
      const existingIds = new Set(prev.vlans.map((v) => v.vlanId));
      const newItems: VlanConfig[] = [];
      idsToAdd.forEach((id) => {
        if (!existingIds.has(id)) {
          existingIds.add(id);
          newItems.push({
            id: makeUid(id),
            vlanId: id,
            name: userProvidedName,
            state: 'active',
          });
        }
      });
      if (newItems.length === 0) return prev;
      return {
        ...prev,
        vlans: [...prev.vlans, ...newItems].sort((a, b) => a.vlanId - b.vlanId),
      };
    });

    setVlanIdInput('');
    setVlanNameInput('');
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
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {config.vlans.length} VLAN تعریف شده · امکان افزودن تعداد نامحدود VLAN (2 تا 4094)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownloadVlansFile}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              title="دانلود فایل مستقل VLANها برای آپلود روی سوئیچ"
            >
              <Download className="w-4 h-4" />
              <span>دانلود فایل VLAN (.cfg)</span>
            </button>
            <button
              type="button"
              onClick={addEmptyVlanRow}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن ردیف خالی</span>
            </button>
          </div>
        </div>

        {/* Custom VLAN ID + Name Adder */}
        <form
          onSubmit={addCustomVlans}
          className="mb-4 pb-4 border-b border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
        >
          <div className="sm:col-span-5">
            <FieldLabel label="شناسه یا بازه VLAN" hint="مثلاً 10 یا 100-105 یا 10,20,30" />
            <input
              type="text"
              dir="ltr"
              value={vlanIdInput}
              onChange={(e) => setVlanIdInput(e.target.value)}
              placeholder="10 یا 100-105"
              className={`${inputClassName} font-mono tabular-nums text-left text-xs`}
            />
          </div>
          <div className="sm:col-span-5">
            <FieldLabel label="نام VLAN" hint="نام دلخواه شما" />
            <input
              type="text"
              dir="ltr"
              value={vlanNameInput}
              onChange={(e) => setVlanNameInput(e.target.value)}
              placeholder="مثلاً IT_LAN"
              className={`${inputClassName} font-mono text-left text-xs`}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full min-h-[44px] px-4 rounded-xl bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              افزودن
            </button>
          </div>
        </form>

        {config.vlans.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center">
            <Network className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">هنوز VLANی تعریف نشده است</p>
          </div>
        ) : (
          <div className="space-y-3">
            {config.vlans.map((vlan) => (
              <VlanItemRow
                key={vlan.id}
                vlan={vlan}
                onUpdate={updateVlan}
                onRemove={removeVlan}
              />
            ))}

            <button
              type="button"
              onClick={addEmptyVlanRow}
              className="w-full min-h-[44px] rounded-xl border border-dashed border-sky-300 dark:border-sky-800 text-sky-700 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن VLAN جدید</span>
            </button>
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
