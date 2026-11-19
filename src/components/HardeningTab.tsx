import React from 'react';
import { HardeningConfig, SwitchConfigState } from '../types/cisco';
import { getHardeningSummary, subnetMaskToWildcard } from '../utils/ciscoGenerator';
import { FieldLabel, ToggleRow, inputClassName } from './FormControls';

interface HardeningTabProps {
  config: SwitchConfigState;
  onChange: (updater: (prev: SwitchConfigState) => SwitchConfigState) => void;
}

export const HardeningTab: React.FC<HardeningTabProps> = ({ config, onChange }) => {
  const h = config.hardening;
  const summary = getHardeningSummary(h);

  const updateHardening = (patch: Partial<HardeningConfig>) => {
    onChange((prev) => ({
      ...prev,
      hardening: { ...prev.hardening, ...patch },
    }));
  };

  const applyHardeningLevel = (level: 'baseline' | 'recommended' | 'cis_strict') => {
    if (level === 'baseline') {
      updateHardening({
        servicePasswordEncryption: true,
        noIpDomainLookup: true,
        minPasswordLengthEnabled: false,
        loginBlockEnabled: false,
        aaaNewModel: false,
        sshEnabled: true,
        rsaModulus: 2048,
        disableTelnet: true,
        vtyAclEnabled: false,
        execTimeoutMinutes: 10,
        loggingSynchronous: true,
        disableHttp: true,
        disableHttps: true,
        disableCdpGlobal: true,
        disableLldpGlobal: false,
        disableExtraBanners: true,
        disableSmartInstall: true,
        disableUnnecessaryServices: false,
        rapidPvst: true,
        globalPortFastDefault: false,
        globalBpduGuardDefault: false,
        globalLoopGuard: false,
        shutdownVlan1: true,
        dhcpSnooping: false,
        dynamicArpInspection: false,
        serviceTimestamps: true,
        loggingBuffered: true,
      });
    } else if (level === 'recommended') {
      updateHardening({
        servicePasswordEncryption: true,
        noIpDomainLookup: true,
        minPasswordLengthEnabled: true,
        minPasswordLength: 10,
        loginBlockEnabled: true,
        loginBlockSeconds: 120,
        loginBlockAttempts: 3,
        loginBlockWithin: 60,
        aaaNewModel: false,
        sshEnabled: true,
        rsaModulus: 2048,
        sshTimeout: 60,
        sshRetries: 3,
        disableTelnet: true,
        vtyAclEnabled: true,
        execTimeoutMinutes: 5,
        loggingSynchronous: true,
        disableHttp: true,
        disableHttps: true,
        disableCdpGlobal: true,
        disableLldpGlobal: false,
        disableExtraBanners: true,
        disableSmartInstall: true,
        disableUnnecessaryServices: true,
        rapidPvst: true,
        globalPortFastDefault: true,
        globalBpduGuardDefault: true,
        globalLoopGuard: false,
        shutdownVlan1: true,
        dhcpSnooping: true,
        dynamicArpInspection: false,
        serviceTimestamps: true,
        loggingBuffered: true,
      });
    } else {
      updateHardening({
        servicePasswordEncryption: true,
        noIpDomainLookup: true,
        minPasswordLengthEnabled: true,
        minPasswordLength: 12,
        loginBlockEnabled: true,
        loginBlockSeconds: 300,
        loginBlockAttempts: 3,
        loginBlockWithin: 60,
        aaaNewModel: true,
        sshEnabled: true,
        rsaModulus: 4096,
        sshTimeout: 30,
        sshRetries: 2,
        disableTelnet: true,
        vtyAclEnabled: true,
        execTimeoutMinutes: 3,
        loggingSynchronous: true,
        disableHttp: true,
        disableHttps: true,
        disableCdpGlobal: true,
        disableLldpGlobal: true,
        disableExtraBanners: true,
        disableSmartInstall: true,
        disableUnnecessaryServices: true,
        rapidPvst: true,
        globalPortFastDefault: true,
        globalBpduGuardDefault: true,
        globalLoopGuard: true,
        shutdownVlan1: true,
        dhcpSnooping: true,
        dynamicArpInspection: true,
        serviceTimestamps: true,
        loggingBuffered: true,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Hardening Summary & Quick Profiles */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">سطح هاردینگ سیسکو (Hardening)</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {summary.active} مورد از {summary.total} کنترل امنیتی فعال است
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => applyHardeningLevel('baseline')}
            className="min-h-[44px] px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-sky-400 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            پایه سریع
          </button>
          <button
            type="button"
            onClick={() => applyHardeningLevel('recommended')}
            className="min-h-[44px] px-2.5 py-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/40 hover:border-sky-500 text-xs font-semibold text-sky-700 dark:text-sky-300 transition-colors cursor-pointer"
          >
            پیشنهادی استاندارد
          </button>
          <button
            type="button"
            onClick={() => applyHardeningLevel('cis_strict')}
            className="min-h-[44px] px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-sky-400 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
          >
            حداکثری (CIS)
          </button>
        </div>
      </section>

      {/* Management Plane & SSH */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
          ۱. امنیت مدیریت و پروتکل SSH
        </h3>

        <ToggleRow
          id="h-ssh"
          label="فعال‌سازی SSH نسخه ۲ و تولید کلید RSA"
          description="رمزنگاری نشست‌های مدیریتی و جایگزینی امن برای Telnet"
          cliHint={`ip ssh version 2 · rsa modulus ${h.rsaModulus}`}
          checked={h.sshEnabled}
          onChange={(checked) => updateHardening({ sshEnabled: checked })}
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <FieldLabel label="طول کلید RSA" />
              <select
                value={h.rsaModulus}
                onChange={(e) =>
                  updateHardening({ rsaModulus: Number(e.target.value) === 4096 ? 4096 : 2048 })
                }
                className={inputClassName}
              >
                <option value={2048}>2048 bit (استاندارد)</option>
                <option value={4096}>4096 bit (حداکثری)</option>
              </select>
            </div>
            <div>
              <FieldLabel label="تایم‌اوت SSH (ثانیه)" />
              <input
                type="number"
                min={10}
                max={120}
                dir="ltr"
                value={h.sshTimeout}
                onChange={(e) => updateHardening({ sshTimeout: Number(e.target.value) || 60 })}
                className={`${inputClassName} font-mono tabular-nums text-left`}
              />
            </div>
            <div>
              <FieldLabel label="تعداد تلاش مجدد" />
              <input
                type="number"
                min={1}
                max={5}
                dir="ltr"
                value={h.sshRetries}
                onChange={(e) => updateHardening({ sshRetries: Number(e.target.value) || 3 })}
                className={`${inputClassName} font-mono tabular-nums text-left`}
              />
            </div>
          </div>
        </ToggleRow>

        <ToggleRow
          id="h-no-telnet"
          label="مسدودسازی Telnet (فقط SSH روی VTY)"
          description="بستن پروتکل غیرامن Telnet روی تمام خطوط مجازی"
          cliHint="line vty 0 15 -> transport input ssh"
          checked={h.disableTelnet}
          onChange={(checked) => updateHardening({ disableTelnet: checked })}
        />

        <ToggleRow
          id="h-vty-acl"
          label="محدودسازی دسترسی VTY با ACL مدیریت"
          description="تنها آی‌پی‌ها و ساب‌نت‌های مجاز شبکه مدیریت امکان اتصال SSH خواهند داشت"
          cliHint={`access-list 10 permit ${h.vtyAllowedNetwork} ${subnetMaskToWildcard(h.vtyAllowedMask)}`}
          checked={h.vtyAclEnabled}
          onChange={(checked) => updateHardening({ vtyAclEnabled: checked })}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel label="شبکه مجاز (Network IP)" />
              <input
                type="text"
                dir="ltr"
                value={h.vtyAllowedNetwork}
                onChange={(e) => updateHardening({ vtyAllowedNetwork: e.target.value })}
                placeholder="192.168.99.0"
                className={`${inputClassName} font-mono tabular-nums text-left`}
              />
            </div>
            <div>
              <FieldLabel label="Subnet Mask" hint={`Wildcard: ${subnetMaskToWildcard(h.vtyAllowedMask)}`} />
              <input
                type="text"
                dir="ltr"
                value={h.vtyAllowedMask}
                onChange={(e) => updateHardening({ vtyAllowedMask: e.target.value })}
                placeholder="255.255.255.0"
                className={`${inputClassName} font-mono tabular-nums text-left`}
              />
            </div>
          </div>
        </ToggleRow>

        <ToggleRow
          id="h-timeout"
          label="قطع خودکار نشست غیرفعال (Exec-Timeout)"
          description="بستن خودکار کنسول و SSH در صورت عدم فعالیت مهندس شبکه"
          cliHint={`exec-timeout ${h.execTimeoutMinutes} 0 · logging synchronous`}
          checked={h.execTimeoutMinutes > 0}
          onChange={(checked) => updateHardening({ execTimeoutMinutes: checked ? 5 : 0 })}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <FieldLabel label="زمان انتظار (دقیقه)" />
              <input
                type="number"
                min={1}
                max={60}
                dir="ltr"
                value={h.execTimeoutMinutes}
                onChange={(e) => updateHardening({ execTimeoutMinutes: Math.max(1, Number(e.target.value) || 5) })}
                className={`${inputClassName} font-mono tabular-nums text-left`}
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => updateHardening({ loggingSynchronous: !h.loggingSynchronous })}
                className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-semibold cursor-pointer ${
                  h.loggingSynchronous
                    ? 'border-sky-600 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {h.loggingSynchronous ? 'Logging Synchronous: فعال' : 'Logging Synchronous: غیرفعال'}
              </button>
            </div>
          </div>
        </ToggleRow>
      </section>

      {/* Credentials & Services */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
          ۲. سیاست رمز عبور و بستن سرویس‌های اضافه
        </h3>

        <ToggleRow
          id="h-pass-enc"
          label="رمزنگاری تمام پسوردهای متنی (Service Password Encryption)"
          description="جلوگیری از نمایش رمزهای ساده در خروجی show running-config"
          cliHint="service password-encryption"
          checked={h.servicePasswordEncryption}
          onChange={(checked) => updateHardening({ servicePasswordEncryption: checked })}
        />

        <ToggleRow
          id="h-min-len"
          label="اجبار حداقل طول رمز عبور"
          description="الزام سیستم به پذیرش رمزهای دارای طول ایمن"
          cliHint={`security passwords min-length ${h.minPasswordLength}`}
          checked={h.minPasswordLengthEnabled}
          onChange={(checked) => updateHardening({ minPasswordLengthEnabled: checked })}
        >
          <div>
            <FieldLabel label="حداقل تعداد کاراکتر" />
            <input
              type="number"
              min={6}
              max={32}
              dir="ltr"
              value={h.minPasswordLength}
              onChange={(e) =>
                updateHardening({ minPasswordLength: Math.min(32, Math.max(6, Number(e.target.value) || 10)) })
              }
              className={`${inputClassName} max-w-[180px] font-mono tabular-nums text-left`}
            />
          </div>
        </ToggleRow>

        <ToggleRow
          id="h-login-block"
          label="مقابله با حمله Brute-Force (Login Block)"
          description="مسدودسازی موقت ورود در صورت تکرار رمز اشتباه"
          cliHint={`login block-for ${h.loginBlockSeconds} attempts ${h.loginBlockAttempts} within ${h.loginBlockWithin}`}
          checked={h.loginBlockEnabled}
          onChange={(checked) => updateHardening({ loginBlockEnabled: checked })}
        >
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <FieldLabel label="مدت قفل (ثانیه)" />
              <input
                type="number"
                dir="ltr"
                value={h.loginBlockSeconds}
                onChange={(e) => updateHardening({ loginBlockSeconds: Number(e.target.value) || 120 })}
                className={`${inputClassName} font-mono tabular-nums text-left`}
              />
            </div>
            <div>
              <FieldLabel label="تعداد خطا" />
              <input
                type="number"
                dir="ltr"
                value={h.loginBlockAttempts}
                onChange={(e) => updateHardening({ loginBlockAttempts: Number(e.target.value) || 3 })}
                className={`${inputClassName} font-mono tabular-nums text-left`}
              />
            </div>
            <div>
              <FieldLabel label="بازه (ثانیه)" />
              <input
                type="number"
                dir="ltr"
                value={h.loginBlockWithin}
                onChange={(e) => updateHardening({ loginBlockWithin: Number(e.target.value) || 60 })}
                className={`${inputClassName} font-mono tabular-nums text-left`}
              />
            </div>
          </div>
        </ToggleRow>

        <ToggleRow
          id="h-aaa"
          label="احراز هویت ساختاریافته AAA (Local)"
          description="فعال‌سازی مدل AAA با تکیه بر پایگاه‌داده کاربران محلی"
          cliHint="aaa new-model · aaa authentication login default local"
          checked={h.aaaNewModel}
          onChange={(checked) => updateHardening({ aaaNewModel: checked })}
        />

        <ToggleRow
          id="h-http"
          label="غیرفعال‌سازی وب‌سرور HTTP و HTTPS سوئیچ"
          description="بستن پنل وب داخلی سوئیچ برای کاهش سطح حمله"
          cliHint="no ip http server · no ip http secure-server"
          checked={h.disableHttp && h.disableHttps}
          onChange={(checked) => updateHardening({ disableHttp: checked, disableHttps: checked })}
        />

        <ToggleRow
          id="h-unnecessary"
          label="بستن سرویس‌های قدیمی و غیرایمن IOS"
          description="غیرفعال‌سازی PAD، Source Routing، Finger و Small Servers"
          cliHint="no service pad · no ip source-route · no ip finger · no ip bootp server"
          checked={h.disableUnnecessaryServices}
          onChange={(checked) => updateHardening({ disableUnnecessaryServices: checked })}
        />

        <ToggleRow
          id="h-cdp"
          label="غیرفعال‌سازی CDP به صورت سراسری"
          description="جلوگیری از افشای مدل دستگاه و IP مدیریت از طریق پروتکل کشف سیسکو"
          cliHint="no cdp run"
          checked={h.disableCdpGlobal}
          onChange={(checked) => updateHardening({ disableCdpGlobal: checked })}
        />

        <ToggleRow
          id="h-lldp"
          label="غیرفعال‌سازی LLDP به صورت سراسری"
          description="جلوگیری از افشای اطلاعات همسایگی لایه ۲"
          cliHint="no lldp run"
          checked={h.disableLldpGlobal}
          onChange={(checked) => updateHardening({ disableLldpGlobal: checked })}
        />

        <ToggleRow
          id="h-extra-banners"
          label="غیرفعال‌سازی بنرهای اضافی سیسکو"
          description="حذف بنرهای Exec، Incoming و Login اضافی جهت جلوگیری از نمایش اطلاعات سیستم"
          cliHint="no banner exec · no banner incoming · no banner login"
          checked={h.disableExtraBanners}
          onChange={(checked) => updateHardening({ disableExtraBanners: checked })}
        />

        <ToggleRow
          id="h-smart-install"
          label="غیرفعال‌سازی قابلیت Smart Install"
          description="بستن سرویس Smart Install (پورت TCP 4786) برای جلوگیری از آسیب‌پذیری‌های بحرانی و دسترسی غیرمجاز"
          cliHint="no vstack"
          checked={h.disableSmartInstall}
          onChange={(checked) => updateHardening({ disableSmartInstall: checked })}
        />

        <ToggleRow
          id="h-domain-lookup"
          label="غیرفعال‌سازی جستجوی DNS در CLI"
          description="جلوگیری از قفل شدن ترمینال هنگام تایپ اشتباه دستورات"
          cliHint="no ip domain-lookup"
          checked={h.noIpDomainLookup}
          onChange={(checked) => updateHardening({ noIpDomainLookup: checked })}
        />
      </section>

      {/* Layer 2 Security */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
          ۳. هاردینگ لایه ۲ (STP, DHCP Snooping, ARP)
        </h3>

        <ToggleRow
          id="h-rapid-pvst"
          label="حالت سریع Spanning-Tree (Rapid-PVST)"
          description="همگرایی بسیار سریع‌تر شبکه در زمان قطع و وصل لینک‌ها"
          cliHint="spanning-tree mode rapid-pvst"
          checked={h.rapidPvst}
          onChange={(checked) => updateHardening({ rapidPvst: checked })}
        />

        <ToggleRow
          id="h-bpdu"
          label="فعال‌سازی سراسری PortFast و BPDU Guard"
          description="جلوگیری از اتصال سوئیچ‌های غیرمجاز و ایجاد Loop روی پورت‌های Access"
          cliHint="spanning-tree portfast default · spanning-tree portfast bpduguard default"
          checked={h.globalPortFastDefault && h.globalBpduGuardDefault}
          onChange={(checked) =>
            updateHardening({ globalPortFastDefault: checked, globalBpduGuardDefault: checked })
          }
        />

        <ToggleRow
          id="h-loopguard"
          label="محافظت در برابر حلقه یک‌طرفه (Loop Guard)"
          description="پیشگیری از لوپ شدن لینک‌های فیبر یا Trunk در شرایط خطای سخت‌افزاری"
          cliHint="spanning-tree loopguard default"
          checked={h.globalLoopGuard}
          onChange={(checked) => updateHardening({ globalLoopGuard: checked })}
        />

        <ToggleRow
          id="h-shutdown-vlan1"
          label="خاموش‌سازی رابط پیش‌فرض VLAN 1"
          description="بستن رابط مجازی پیش‌فرض Vlan1 و حذف آدرس IP آن برای جلوگیری از دسترسی ناخواسته"
          cliHint="interface Vlan1 -> no ip address · shutdown"
          checked={h.shutdownVlan1}
          onChange={(checked) => updateHardening({ shutdownVlan1: checked })}
        />

        <ToggleRow
          id="h-dhcp-snoop"
          label="محافظت از DHCP (DHCP Snooping)"
          description="مسدود کردن سرورهای جعلی Rogue DHCP و ساخت جدول اعتماد IP-MAC"
          cliHint={`ip dhcp snooping · ip dhcp snooping vlan ${h.dhcpSnoopingVlans || '...'}`}
          checked={h.dhcpSnooping}
          onChange={(checked) => updateHardening({ dhcpSnooping: checked })}
        >
          <div>
            <FieldLabel label="VLANهای تحت پوشش (با کاما جدا کنید)" hint="خالی = همه VLANهای تعریف‌شده" />
            <input
              type="text"
              dir="ltr"
              value={h.dhcpSnoopingVlans}
              onChange={(e) => updateHardening({ dhcpSnoopingVlans: e.target.value })}
              placeholder="10,20"
              className={`${inputClassName} font-mono tabular-nums text-left`}
            />
          </div>
        </ToggleRow>

        <ToggleRow
          id="h-dai"
          label="بازرسی پویای ARP (Dynamic ARP Inspection)"
          description="مقابله با حملات ARP Spoofing و Man-in-the-Middle در شبکه محلی"
          cliHint={`ip arp inspection vlan ${h.daiVlans || '...'} · validate src-mac dst-mac ip`}
          checked={h.dynamicArpInspection}
          onChange={(checked) => updateHardening({ dynamicArpInspection: checked })}
        >
          <div>
            <FieldLabel label="VLANهای تحت بازرسی ARP" hint="نیازمند فعال بودن DHCP Snooping" />
            <input
              type="text"
              dir="ltr"
              value={h.daiVlans}
              onChange={(e) => updateHardening({ daiVlans: e.target.value })}
              placeholder="10,20"
              className={`${inputClassName} font-mono tabular-nums text-left`}
            />
          </div>
        </ToggleRow>
      </section>

      {/* Logging & NTP */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-2">
          ۴. ثبت وقایع (Logging) و همگام‌سازی زمان (NTP)
        </h3>

        <ToggleRow
          id="h-timestamps"
          label="ثبت دقیق تاریخ و ساعت در لاگ‌ها"
          description="افزودن مهر زمانی میلی‌ثانیه‌ای به تمام پیام‌های خطا و رویدادها"
          cliHint="service timestamps log datetime msec localtime show-timezone"
          checked={h.serviceTimestamps}
          onChange={(checked) => updateHardening({ serviceTimestamps: checked })}
        />

        <ToggleRow
          id="h-logbuf"
          label="ذخیره لاگ‌ها در حافظه داخلی سوئیچ"
          description="نگهداری رویدادهای سطح Informational در بافر ۳۲ کیلوبایتی"
          cliHint="logging buffered 32768 informational"
          checked={h.loggingBuffered}
          onChange={(checked) => updateHardening({ loggingBuffered: checked })}
        />

        <ToggleRow
          id="h-irst"
          label="منطقه زمانی رسمی ایران (IRST +3:30)"
          description="تنظیم ساعت سیستم سوئیچ بر مبنای وقت استاندارد ایران"
          cliHint="clock timezone IRST 3 30"
          checked={h.iranTimezone}
          onChange={(checked) => updateHardening({ iranTimezone: checked })}
        />

        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel label="آدرس سرور Syslog (اختیاری)" />
            <input
              type="text"
              dir="ltr"
              value={h.syslogServer}
              onChange={(e) => updateHardening({ syslogServer: e.target.value })}
              placeholder="192.168.99.250"
              className={`${inputClassName} font-mono tabular-nums text-left`}
            />
          </div>
          <div>
            <FieldLabel label="آدرس سرور NTP (اختیاری)" />
            <input
              type="text"
              dir="ltr"
              value={h.ntpServer}
              onChange={(e) => updateHardening({ ntpServer: e.target.value })}
              placeholder="192.168.99.1"
              className={`${inputClassName} font-mono tabular-nums text-left`}
            />
          </div>
        </div>
      </section>
    </div>
  );
};
