import { ConfigWarning, HardeningConfig, PortGroupConfig, SwitchConfigState } from '../types/cisco';

export function isValidIpv4(ip: string): boolean {
  const parts = ip.trim().split('.');
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^\d+$/.test(part)) return false;
    const num = Number(part);
    return num >= 0 && num <= 255;
  });
}

export function formatInterfaceCommand(pg: PortGroupConfig): string | null {
  if (pg.portType && pg.portNumbers && pg.portNumbers.trim()) {
    const cleaned = pg.portNumbers.trim().replace(/\s+/g, '');
    const prefix = `${pg.portType}${pg.slotPrefix ?? ''}`;
    if (/^\d+$/.test(cleaned)) {
      return `interface ${prefix}${cleaned}`;
    }
    const parts = cleaned
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => (/^[a-zA-Z]/.test(part) ? part : `${prefix}${part}`));
    if (parts.length === 0) return null;
    return `interface range ${parts.join(' , ')}`;
  }

  const legacy = pg.interfaceRange?.trim();
  if (!legacy) return null;
  if (legacy.includes('-') || legacy.includes(',')) {
    return `interface range ${legacy}`;
  }
  return `interface ${legacy}`;
}

export function subnetMaskToWildcard(mask: string): string {
  if (!isValidIpv4(mask)) return '0.0.0.255';
  return mask
    .trim()
    .split('.')
    .map((octet) => 255 - Number(octet))
    .join('.');
}

export function generateStrongPassword(length = 14): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*-_';
  const all = upper + lower + digits + symbols;

  const chars: string[] = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  for (let i = chars.length; i < length; i++) {
    chars.push(all[Math.floor(Math.random() * all.length)]);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export function getHardeningSummary(hardening: HardeningConfig): { active: number; total: number } {
  const checks = [
    hardening.servicePasswordEncryption,
    hardening.noIpDomainLookup,
    hardening.minPasswordLengthEnabled,
    hardening.loginBlockEnabled,
    hardening.sshEnabled && hardening.disableTelnet,
    hardening.vtyAclEnabled,
    hardening.execTimeoutMinutes > 0 && hardening.loggingSynchronous,
    hardening.disableHttp && hardening.disableHttps,
    hardening.disableCdpGlobal,
    hardening.disableExtraBanners,
    hardening.disableSmartInstall,
    hardening.disableUnnecessaryServices,
    hardening.rapidPvst,
    hardening.globalPortFastDefault && hardening.globalBpduGuardDefault,
    hardening.shutdownVlan1,
    hardening.dhcpSnooping,
    hardening.dynamicArpInspection,
    hardening.serviceTimestamps && hardening.loggingBuffered,
  ];
  return {
    active: checks.filter(Boolean).length,
    total: checks.length,
  };
}

export function validateSwitchConfig(state: SwitchConfigState): ConfigWarning[] {
  const warnings: ConfigWarning[] = [];
  const hostname = state.hostname.trim();

  if (!hostname) {
    warnings.push({
      id: 'hostname-empty',
      level: 'error',
      message: 'نام دستگاه (Hostname) نباید خالی باشد.',
    });
  } else if (!/^[a-zA-Z0-9_-]+$/.test(hostname)) {
    warnings.push({
      id: 'hostname-chars',
      level: 'warning',
      message: 'در Hostname فقط از حروف انگلیسی، اعداد، خط تیره (-) و زیرخط (_) استفاده کنید.',
    });
  }

  if (!state.enableSecret.trim()) {
    warnings.push({
      id: 'enable-empty',
      level: 'warning',
      message: 'رمز Enable Secret تنظیم نشده است؛ برای امنیت دسترسی Privileged رمز تعیین کنید.',
    });
  }

  if (state.users.length === 0) {
    warnings.push({
      id: 'no-users',
      level: 'warning',
      message: 'هیچ کاربری تعریف نشده است. برای ورود SSH حداقل یک کاربر مدیر بسازید.',
    });
  } else {
    const emptyPassUser = state.users.find((u) => !u.username.trim() || !u.password.trim());
    if (emptyPassUser) {
      warnings.push({
        id: 'user-incomplete',
        level: 'error',
        message: 'نام کاربری یا رمز عبور یکی از کاربران خالی است.',
      });
    }
    if (state.hardening.minPasswordLengthEnabled) {
      const shortUser = state.users.find(
        (u) => u.password.trim().length > 0 && u.password.trim().length < state.hardening.minPasswordLength
      );
      if (shortUser) {
        warnings.push({
          id: 'user-short-pass',
          level: 'warning',
          message: `طول رمز کاربر «${shortUser.username || 'جدید'}» کمتر از حداقل تعیین‌شده (${state.hardening.minPasswordLength} کاراکتر) است.`,
        });
      }
    }
  }

  if (state.hardening.sshEnabled && !state.domainName.trim()) {
    warnings.push({
      id: 'ssh-domain',
      level: 'error',
      message: 'برای تولید کلید RSA و فعال‌سازی SSH، فیلد Domain Name الزامی است.',
    });
  }

  if (state.management.enabled) {
    if (!isValidIpv4(state.management.ipAddress) || !isValidIpv4(state.management.subnetMask)) {
      warnings.push({
        id: 'mgmt-ip',
        level: 'error',
        message: 'آدرس IP یا Subnet Mask رابط مدیریت (SVI) معتبر نیست.',
      });
    }
    if (state.management.defaultGateway.trim() && !isValidIpv4(state.management.defaultGateway)) {
      warnings.push({
        id: 'mgmt-gw',
        level: 'error',
        message: 'آدرس Default Gateway معتبر نیست.',
      });
    }
    if (state.management.vlanId === 1) {
      warnings.push({
        id: 'mgmt-vlan1',
        level: 'warning',
        message: state.hardening.shutdownVlan1
          ? 'رابط مدیریت روی VLAN 1 تنظیم شده و همزمان گزینه Shutdown برای Vlan1 فعال است؛ برای اعمال خاموش‌سازی، VLAN مدیریت را تغییر دهید.'
          : 'استفاده از VLAN 1 برای مدیریت توصیه نمی‌شود؛ بهتر است یک VLAN مجزا (مثلاً 99) انتخاب کنید.',
      });
    }
  }

  if (state.hardening.vtyAclEnabled) {
    if (!isValidIpv4(state.hardening.vtyAllowedNetwork) || !isValidIpv4(state.hardening.vtyAllowedMask)) {
      warnings.push({
        id: 'vty-acl-ip',
        level: 'error',
        message: 'رنج شبکه مجاز در ACL دسترسی VTY معتبر نیست.',
      });
    }
  }

  return warnings;
}

export function generateCiscoCli(state: SwitchConfigState): string {
  const lines: string[] = [];
  const h = state.hardening;

  lines.push('! ==========================================================');
  lines.push(`! Cisco IOS Switch Configuration - ${state.hostname.trim() || 'Switch'}`);
  lines.push('! Generated by CiscoSaz');
  lines.push('! ==========================================================');
  lines.push('configure terminal');
  lines.push('!');

  // 1. Hostname & Domain
  lines.push('! --- 1. Basic System Identity ---');
  if (state.hostname.trim()) {
    lines.push(`hostname ${state.hostname.trim()}`);
  }
  if (state.domainName.trim()) {
    lines.push(`ip domain-name ${state.domainName.trim()}`);
  }
  if (h.noIpDomainLookup) {
    lines.push('no ip domain-lookup');
  }
  if (h.iranTimezone) {
    lines.push('clock timezone IRST 3 30');
  }
  lines.push('!');

  // 2. Passwords, Enable & Users
  lines.push('! --- 2. Credentials & Access Security ---');
  if (h.servicePasswordEncryption) {
    lines.push('service password-encryption');
  }
  if (h.minPasswordLengthEnabled) {
    lines.push(`security passwords min-length ${h.minPasswordLength}`);
  }
  if (h.loginBlockEnabled) {
    lines.push(
      `login block-for ${h.loginBlockSeconds} attempts ${h.loginBlockAttempts} within ${h.loginBlockWithin}`
    );
  }
  if (state.enableSecret.trim()) {
    if (state.enableAlgorithm === 'scrypt') {
      lines.push(`enable algorithm-type scrypt secret ${state.enableSecret.trim()}`);
    } else {
      lines.push(`enable secret ${state.enableSecret.trim()}`);
    }
  }

  if (h.aaaNewModel) {
    lines.push('aaa new-model');
    lines.push('aaa authentication login default local');
    lines.push('aaa authorization exec default local');
  }

  state.users.forEach((user) => {
    const uname = user.username.trim();
    const pass = user.password.trim();
    if (!uname || !pass) return;
    const priv = Math.min(15, Math.max(0, Number(user.privilege) || 15));
    if (user.secretType === 'scrypt') {
      lines.push(`username ${uname} privilege ${priv} algorithm-type scrypt secret ${pass}`);
    } else if (user.secretType === 'secret') {
      lines.push(`username ${uname} privilege ${priv} secret ${pass}`);
    } else {
      lines.push(`username ${uname} privilege ${priv} password ${pass}`);
    }
  });
  lines.push('!');

  // 3. Banner
  if (state.bannerMotd.trim() || h.disableExtraBanners) {
    lines.push('! --- 3. Banner Security ---');
    if (h.disableExtraBanners) {
      lines.push('no banner exec');
      lines.push('no banner incoming');
      lines.push('no banner login');
    }
    if (state.bannerMotd.trim()) {
      lines.push('banner motd ^C');
      state.bannerMotd
        .trim()
        .split('\n')
        .forEach((line) => lines.push(line.replace(/\^C/g, '')));
      lines.push('^C');
    }
    lines.push('!');
  }

  // 4. SSH & Service Hardening
  lines.push('! --- 4. Management Plane & Service Hardening ---');
  if (h.sshEnabled) {
    lines.push(`crypto key generate rsa general-keys modulus ${h.rsaModulus}`);
    lines.push(`ip ssh version ${h.sshVersion}`);
    lines.push(`ip ssh time-out ${h.sshTimeout}`);
    lines.push(`ip ssh authentication-retries ${h.sshRetries}`);
  }
  if (h.disableHttp) {
    lines.push('no ip http server');
  }
  if (h.disableHttps) {
    lines.push('no ip http secure-server');
  }
  if (h.disableCdpGlobal) {
    lines.push('no cdp run');
  }
  if (h.disableLldpGlobal) {
    lines.push('no lldp run');
  }
  if (h.disableSmartInstall) {
    lines.push('no vstack');
  }
  if (h.disableUnnecessaryServices) {
    lines.push('no service pad');
    lines.push('no ip source-route');
    lines.push('no ip finger');
    lines.push('no service tcp-small-servers');
    lines.push('no service udp-small-servers');
    lines.push('no ip bootp server');
  }
  if (h.vtyAclEnabled && isValidIpv4(h.vtyAllowedNetwork) && isValidIpv4(h.vtyAllowedMask)) {
    const wildcard = subnetMaskToWildcard(h.vtyAllowedMask);
    lines.push(`access-list 10 remark Allow_Management_Subnet`);
    lines.push(`access-list 10 permit ${h.vtyAllowedNetwork.trim()} ${wildcard}`);
    lines.push('access-list 10 deny any log');
  }
  lines.push('!');

  // 5. VLANs
  const validVlans = state.vlans.filter((v) => v.vlanId >= 1 && v.vlanId <= 4094);
  if (validVlans.length > 0) {
    lines.push('! --- 5. VLAN Database ---');
    validVlans.forEach((vlan) => {
      if (vlan.vlanId === 1) return;
      lines.push(`vlan ${vlan.vlanId}`);
      if (vlan.name.trim()) {
        lines.push(` name ${vlan.name.trim().replace(/\s+/g, '_')}`);
      }
      if (vlan.state === 'suspend') {
        lines.push(' state suspend');
      } else {
        lines.push(' state active');
      }
    });
    lines.push('exit');
    lines.push('!');
  }

  // 6. Layer 2 Hardening (STP, DHCP Snooping, DAI)
  const hasL2Hardening =
    h.rapidPvst || h.globalPortFastDefault || h.globalBpduGuardDefault || h.globalLoopGuard || h.dhcpSnooping || h.dynamicArpInspection;
  if (hasL2Hardening) {
    lines.push('! --- 6. Layer 2 Security & Spanning-Tree ---');
    if (h.rapidPvst) {
      lines.push('spanning-tree mode rapid-pvst');
    }
    if (h.globalPortFastDefault) {
      lines.push('spanning-tree portfast default');
    }
    if (h.globalBpduGuardDefault) {
      lines.push('spanning-tree portfast bpduguard default');
    }
    if (h.globalLoopGuard) {
      lines.push('spanning-tree loopguard default');
    }
    if (h.dhcpSnooping) {
      lines.push('ip dhcp snooping');
      lines.push('no ip dhcp snooping information option');
      const snoopVlans = h.dhcpSnoopingVlans.trim() || validVlans.map((v) => v.vlanId).join(',');
      if (snoopVlans) {
        lines.push(`ip dhcp snooping vlan ${snoopVlans}`);
      }
    }
    if (h.dynamicArpInspection) {
      const daiVlans = h.daiVlans.trim() || validVlans.map((v) => v.vlanId).join(',');
      if (daiVlans) {
        lines.push(`ip arp inspection vlan ${daiVlans}`);
      }
      lines.push('ip arp inspection validate src-mac dst-mac ip');
    }
    lines.push('!');
  }

  // 7. Management SVI & Default Gateway & Shutdown Vlan1
  const shouldShutdownVlan1 =
    h.shutdownVlan1 && !(state.management.enabled && state.management.vlanId === 1);
  const hasMgmtSvi =
    state.management.enabled &&
    isValidIpv4(state.management.ipAddress) &&
    isValidIpv4(state.management.subnetMask);

  if (shouldShutdownVlan1 || hasMgmtSvi) {
    lines.push('! --- 7. Management SVI, Vlan1 Shutdown & Routing ---');
    if (shouldShutdownVlan1) {
      lines.push('interface Vlan1');
      lines.push(' no ip address');
      lines.push(' shutdown');
      lines.push('exit');
    }
    if (hasMgmtSvi) {
      lines.push(`interface Vlan${state.management.vlanId}`);
      lines.push(' description Management_SVI');
      lines.push(` ip address ${state.management.ipAddress.trim()} ${state.management.subnetMask.trim()}`);
      lines.push(' no ip redirects');
      lines.push(' no ip proxy-arp');
      lines.push(' no shutdown');
      lines.push('exit');
      if (state.management.defaultGateway.trim() && isValidIpv4(state.management.defaultGateway)) {
        lines.push(`ip default-gateway ${state.management.defaultGateway.trim()}`);
      }
    }
    lines.push('!');
  }

  // 8. Interfaces
  if (state.portGroups.length > 0) {
    lines.push('! --- 8. Interface Configurations ---');
    state.portGroups.forEach((pg) => {
      const ifaceCmd = formatInterfaceCommand(pg);
      if (!ifaceCmd) return;
      lines.push(ifaceCmd);
      if (pg.description.trim()) {
        lines.push(` description ${pg.description.trim()}`);
      }

      if (pg.mode === 'shutdown') {
        lines.push(' switchport mode access');
        lines.push(` switchport access vlan ${pg.accessVlan || 999}`);
        lines.push(' switchport nonegotiate');
        lines.push(' shutdown');
      } else if (pg.mode === 'access') {
        lines.push(' switchport mode access');
        lines.push(` switchport access vlan ${pg.accessVlan}`);
        if (pg.voiceVlan && pg.voiceVlan > 0) {
          lines.push(` switchport voice vlan ${pg.voiceVlan}`);
        }
        lines.push(' switchport nonegotiate');
        if (pg.portFast) {
          lines.push(' spanning-tree portfast');
        }
        if (pg.bpduGuard) {
          lines.push(' spanning-tree bpduguard enable');
        }
        if (pg.portSecurity) {
          lines.push(' switchport port-security');
          lines.push(` switchport port-security maximum ${pg.maxMac}`);
          lines.push(` switchport port-security violation ${pg.violation}`);
          if (pg.stickyMac) {
            lines.push(' switchport port-security mac-address sticky');
          }
        }
        if (pg.stormControl) {
          lines.push(' storm-control broadcast level 20.00');
          lines.push(' storm-control multicast level 20.00');
        }
        lines.push(' no shutdown');
      } else if (pg.mode === 'trunk') {
        lines.push(' switchport trunk encapsulation dot1q');
        lines.push(' switchport mode trunk');
        lines.push(` switchport trunk native vlan ${pg.nativeVlan}`);
        if (pg.allowedVlans.trim()) {
          lines.push(` switchport trunk allowed vlan ${pg.allowedVlans.trim()}`);
        }
        lines.push(' switchport nonegotiate');
        if (pg.dhcpTrust && h.dhcpSnooping) {
          lines.push(' ip dhcp snooping trust');
        }
        if (pg.dhcpTrust && h.dynamicArpInspection) {
          lines.push(' ip arp inspection trust');
        }
        lines.push(' no shutdown');
      }
      lines.push('exit');
      lines.push('!');
    });
  }

  // 9. Console & VTY Lines
  lines.push('! --- 9. Console & VTY Lines ---');
  lines.push('line console 0');
  lines.push(` exec-timeout ${h.execTimeoutMinutes} 0`);
  if (h.loggingSynchronous) {
    lines.push(' logging synchronous');
  }
  if (!h.aaaNewModel) {
    lines.push(' login local');
  }
  lines.push('exit');
  lines.push('!');

  lines.push('line vty 0 15');
  lines.push(` exec-timeout ${h.execTimeoutMinutes} 0`);
  if (h.loggingSynchronous) {
    lines.push(' logging synchronous');
  }
  if (!h.aaaNewModel) {
    lines.push(' login local');
  }
  if (h.disableTelnet && h.sshEnabled) {
    lines.push(' transport input ssh');
  } else if (h.sshEnabled) {
    lines.push(' transport input ssh telnet');
  }
  if (h.vtyAclEnabled && isValidIpv4(h.vtyAllowedNetwork) && isValidIpv4(h.vtyAllowedMask)) {
    lines.push(' access-class 10 in');
  }
  lines.push('exit');
  lines.push('!');

  // 10. Logging & NTP
  if (h.serviceTimestamps || h.loggingBuffered || h.syslogServer.trim() || h.ntpServer.trim()) {
    lines.push('! --- 10. Logging & NTP ---');
    if (h.serviceTimestamps) {
      lines.push('service timestamps debug datetime msec localtime show-timezone');
      lines.push('service timestamps log datetime msec localtime show-timezone');
    }
    if (h.loggingBuffered) {
      lines.push('logging buffered 32768 informational');
    }
    if (h.syslogServer.trim() && isValidIpv4(h.syslogServer)) {
      lines.push(`logging host ${h.syslogServer.trim()}`);
      lines.push('logging trap informational');
    }
    if (h.ntpServer.trim() && isValidIpv4(h.ntpServer)) {
      lines.push(`ntp server ${h.ntpServer.trim()}`);
    }
    lines.push('!');
  }

  lines.push('end');
  lines.push('write memory');

  return lines.join('\n');
}

export function expandPortInterfaces(pg: PortGroupConfig): string[] {
  const result: string[] = [];
  const prefix =
    pg.portType && pg.portNumbers?.trim()
      ? `${pg.portType}${pg.slotPrefix ?? ''}`
      : '';
  const rawNums = pg.portType && pg.portNumbers?.trim()
    ? pg.portNumbers.trim().replace(/\s+/g, '')
    : pg.interfaceRange?.trim() ?? '';

  if (!rawNums) return result;

  if (!prefix) {
    return [rawNums];
  }

  rawNums.split(',').forEach((segment) => {
    const part = segment.trim();
    if (!part) return;
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const a = Number(rangeMatch[1]);
      const b = Number(rangeMatch[2]);
      const start = Math.min(a, b);
      const end = Math.max(a, b);
      for (let i = start; i <= end && result.length < 128; i++) {
        result.push(`${prefix}${i}`);
      }
    } else if (/^\d+$/.test(part)) {
      result.push(`${prefix}${part}`);
    } else {
      result.push(/^[a-zA-Z]/.test(part) ? part : `${prefix}${part}`);
    }
  });

  return result;
}

export function generateStartupConfigFile(state: SwitchConfigState): string {
  const lines: string[] = [];
  const h = state.hardening;

  lines.push('!');
  lines.push(`! Cisco IOS Startup Configuration File (config.text) - ${state.hostname.trim() || 'Switch'}`);
  lines.push('! Upload command: copy tftp://<SERVER_IP>/config.text startup-config');
  lines.push('!');
  lines.push('version 15.2');
  if (h.disableUnnecessaryServices) {
    lines.push('no service pad');
  }
  if (h.serviceTimestamps) {
    lines.push('service timestamps debug datetime msec localtime show-timezone');
    lines.push('service timestamps log datetime msec localtime show-timezone');
  }
  if (h.servicePasswordEncryption) {
    lines.push('service password-encryption');
  }
  if (h.disableUnnecessaryServices) {
    lines.push('no service tcp-small-servers');
    lines.push('no service udp-small-servers');
  }
  lines.push('!');
  if (state.hostname.trim()) {
    lines.push(`hostname ${state.hostname.trim()}`);
  }
  lines.push('!');
  lines.push('boot-start-marker');
  lines.push('boot-end-marker');
  lines.push('!');

  if (h.loggingBuffered) {
    lines.push('logging buffered 32768 informational');
  }
  if (state.enableSecret.trim()) {
    if (state.enableAlgorithm === 'scrypt') {
      lines.push(`enable algorithm-type scrypt secret ${state.enableSecret.trim()}`);
    } else {
      lines.push(`enable secret ${state.enableSecret.trim()}`);
    }
  }
  if (h.minPasswordLengthEnabled) {
    lines.push(`security passwords min-length ${h.minPasswordLength}`);
  }
  if (h.loginBlockEnabled) {
    lines.push(
      `login block-for ${h.loginBlockSeconds} attempts ${h.loginBlockAttempts} within ${h.loginBlockWithin}`
    );
  }
  lines.push('!');

  if (h.aaaNewModel) {
    lines.push('aaa new-model');
    lines.push('aaa authentication login default local');
    lines.push('aaa authorization exec default local');
    lines.push('!');
  }

  state.users.forEach((user) => {
    const uname = user.username.trim();
    const pass = user.password.trim();
    if (!uname || !pass) return;
    const priv = Math.min(15, Math.max(0, Number(user.privilege) || 15));
    if (user.secretType === 'scrypt') {
      lines.push(`username ${uname} privilege ${priv} algorithm-type scrypt secret ${pass}`);
    } else if (user.secretType === 'secret') {
      lines.push(`username ${uname} privilege ${priv} secret ${pass}`);
    } else {
      lines.push(`username ${uname} privilege ${priv} password ${pass}`);
    }
  });
  if (state.users.length > 0) {
    lines.push('!');
  }

  if (h.iranTimezone) {
    lines.push('clock timezone IRST 3 30');
  }
  if (h.noIpDomainLookup) {
    lines.push('no ip domain-lookup');
  }
  if (state.domainName.trim()) {
    lines.push(`ip domain-name ${state.domainName.trim()}`);
  }
  if (h.disableUnnecessaryServices) {
    lines.push('no ip source-route');
    lines.push('no ip finger');
    lines.push('no ip bootp server');
  }
  lines.push('!');

  const validVlans = state.vlans.filter((v) => v.vlanId >= 1 && v.vlanId <= 4094);
  if (h.dhcpSnooping) {
    const snoopVlans = h.dhcpSnoopingVlans.trim() || validVlans.map((v) => v.vlanId).join(',');
    if (snoopVlans) {
      lines.push(`ip dhcp snooping vlan ${snoopVlans}`);
    }
    lines.push('no ip dhcp snooping information option');
    lines.push('ip dhcp snooping');
  }
  if (h.dynamicArpInspection) {
    const daiVlans = h.daiVlans.trim() || validVlans.map((v) => v.vlanId).join(',');
    if (daiVlans) {
      lines.push(`ip arp inspection vlan ${daiVlans}`);
    }
    lines.push('ip arp inspection validate src-mac dst-mac ip');
  }
  if (h.rapidPvst) {
    lines.push('spanning-tree mode rapid-pvst');
  }
  if (h.globalPortFastDefault) {
    lines.push('spanning-tree portfast default');
  }
  if (h.globalBpduGuardDefault) {
    lines.push('spanning-tree portfast bpduguard default');
  }
  if (h.globalLoopGuard) {
    lines.push('spanning-tree loopguard default');
  }
  if (h.disableCdpGlobal) {
    lines.push('no cdp run');
  }
  if (h.disableLldpGlobal) {
    lines.push('no lldp run');
  }
  if (h.disableSmartInstall) {
    lines.push('no vstack');
  }
  lines.push('!');

  // VLANs inside startup-config
  validVlans.forEach((vlan) => {
    if (vlan.vlanId === 1) return;
    lines.push(`vlan ${vlan.vlanId}`);
    if (vlan.name.trim()) {
      lines.push(` name ${vlan.name.trim().replace(/\s+/g, '_')}`);
    }
    lines.push(vlan.state === 'suspend' ? ' state suspend' : ' state active');
    lines.push('!');
  });

  // Physical Interfaces (expanded individually for startup-config compatibility)
  state.portGroups.forEach((pg) => {
    const ifaces = expandPortInterfaces(pg);
    ifaces.forEach((ifaceName) => {
      lines.push(`interface ${ifaceName}`);
      if (pg.description.trim()) {
        lines.push(` description ${pg.description.trim()}`);
      }
      if (pg.mode === 'shutdown') {
        lines.push(` switchport access vlan ${pg.accessVlan || 999}`);
        lines.push(' switchport mode access');
        lines.push(' switchport nonegotiate');
        lines.push(' shutdown');
      } else if (pg.mode === 'access') {
        lines.push(` switchport access vlan ${pg.accessVlan}`);
        lines.push(' switchport mode access');
        if (pg.voiceVlan && pg.voiceVlan > 0) {
          lines.push(` switchport voice vlan ${pg.voiceVlan}`);
        }
        lines.push(' switchport nonegotiate');
        if (pg.portSecurity) {
          lines.push(` switchport port-security maximum ${pg.maxMac}`);
          if (pg.stickyMac) {
            lines.push(' switchport port-security mac-address sticky');
          }
          lines.push(` switchport port-security violation ${pg.violation}`);
          lines.push(' switchport port-security');
        }
        if (pg.stormControl) {
          lines.push(' storm-control broadcast level 20.00');
          lines.push(' storm-control multicast level 20.00');
        }
        if (pg.portFast) {
          lines.push(' spanning-tree portfast');
        }
        if (pg.bpduGuard) {
          lines.push(' spanning-tree bpduguard enable');
        }
      } else if (pg.mode === 'trunk') {
        lines.push(` switchport trunk native vlan ${pg.nativeVlan}`);
        if (pg.allowedVlans.trim()) {
          lines.push(` switchport trunk allowed vlan ${pg.allowedVlans.trim()}`);
        }
        lines.push(' switchport trunk encapsulation dot1q');
        lines.push(' switchport mode trunk');
        lines.push(' switchport nonegotiate');
        if (pg.dhcpTrust && h.dhcpSnooping) {
          lines.push(' ip dhcp snooping trust');
        }
        if (pg.dhcpTrust && h.dynamicArpInspection) {
          lines.push(' ip arp inspection trust');
        }
      }
      lines.push('!');
    });
  });

  // SVI Interfaces
  const shouldShutdownVlan1 =
    h.shutdownVlan1 && !(state.management.enabled && state.management.vlanId === 1);
  if (shouldShutdownVlan1) {
    lines.push('interface Vlan1');
    lines.push(' no ip address');
    lines.push(' shutdown');
    lines.push('!');
  }
  if (
    state.management.enabled &&
    isValidIpv4(state.management.ipAddress) &&
    isValidIpv4(state.management.subnetMask)
  ) {
    lines.push(`interface Vlan${state.management.vlanId}`);
    lines.push(' description Management_SVI');
    lines.push(` ip address ${state.management.ipAddress.trim()} ${state.management.subnetMask.trim()}`);
    lines.push(' no ip redirects');
    lines.push(' no ip proxy-arp');
    lines.push('!');
  }

  if (
    state.management.enabled &&
    state.management.defaultGateway.trim() &&
    isValidIpv4(state.management.defaultGateway)
  ) {
    lines.push(`ip default-gateway ${state.management.defaultGateway.trim()}`);
  }
  if (h.disableHttp) {
    lines.push('no ip http server');
  }
  if (h.disableHttps) {
    lines.push('no ip http secure-server');
  }
  if (h.sshEnabled) {
    lines.push(`ip ssh time-out ${h.sshTimeout}`);
    lines.push(`ip ssh authentication-retries ${h.sshRetries}`);
    lines.push(`ip ssh version ${h.sshVersion}`);
  }
  lines.push('!');

  if (h.vtyAclEnabled && isValidIpv4(h.vtyAllowedNetwork) && isValidIpv4(h.vtyAllowedMask)) {
    const wildcard = subnetMaskToWildcard(h.vtyAllowedMask);
    lines.push('access-list 10 remark Allow_Management_Subnet');
    lines.push(`access-list 10 permit ${h.vtyAllowedNetwork.trim()} ${wildcard}`);
    lines.push('access-list 10 deny any log');
    lines.push('!');
  }

  if (h.syslogServer.trim() && isValidIpv4(h.syslogServer)) {
    lines.push(`logging trap informational`);
    lines.push(`logging host ${h.syslogServer.trim()}`);
  }
  if (h.ntpServer.trim() && isValidIpv4(h.ntpServer)) {
    lines.push(`ntp server ${h.ntpServer.trim()}`);
  }

  if (h.disableExtraBanners) {
    lines.push('no banner exec');
    lines.push('no banner incoming');
    lines.push('no banner login');
  }
  if (state.bannerMotd.trim()) {
    lines.push('banner motd ^C');
    state.bannerMotd
      .trim()
      .split('\n')
      .forEach((line) => lines.push(line.replace(/\^C/g, '')));
    lines.push('^C');
  }
  lines.push('!');

  lines.push('line con 0');
  lines.push(` exec-timeout ${h.execTimeoutMinutes} 0`);
  if (h.loggingSynchronous) {
    lines.push(' logging synchronous');
  }
  if (!h.aaaNewModel) {
    lines.push(' login local');
  }
  lines.push('line vty 0 4');
  if (h.vtyAclEnabled && isValidIpv4(h.vtyAllowedNetwork) && isValidIpv4(h.vtyAllowedMask)) {
    lines.push(' access-class 10 in');
  }
  lines.push(` exec-timeout ${h.execTimeoutMinutes} 0`);
  if (h.loggingSynchronous) {
    lines.push(' logging synchronous');
  }
  if (!h.aaaNewModel) {
    lines.push(' login local');
  }
  if (h.disableTelnet && h.sshEnabled) {
    lines.push(' transport input ssh');
  } else if (h.sshEnabled) {
    lines.push(' transport input ssh telnet');
  }
  lines.push('line vty 5 15');
  if (h.vtyAclEnabled && isValidIpv4(h.vtyAllowedNetwork) && isValidIpv4(h.vtyAllowedMask)) {
    lines.push(' access-class 10 in');
  }
  lines.push(` exec-timeout ${h.execTimeoutMinutes} 0`);
  if (h.loggingSynchronous) {
    lines.push(' logging synchronous');
  }
  if (!h.aaaNewModel) {
    lines.push(' login local');
  }
  if (h.disableTelnet && h.sshEnabled) {
    lines.push(' transport input ssh');
  } else if (h.sshEnabled) {
    lines.push(' transport input ssh telnet');
  }
  lines.push('!');
  lines.push('end');

  return lines.join('\n');
}

export function generateVlanConfigFile(state: SwitchConfigState): string {
  const lines: string[] = [];
  const validVlans = state.vlans.filter((v) => v.vlanId >= 2 && v.vlanId <= 4094);

  lines.push('!');
  lines.push(`! Cisco IOS VLAN Configuration File - ${state.hostname.trim() || 'Switch'}`);
  lines.push('! Upload command: copy tftp://<SERVER_IP>/vlans.cfg running-config');
  lines.push('!');

  if (validVlans.length === 0) {
    lines.push('! No custom VLANs defined (VLAN 2-4094)');
  } else {
    validVlans.forEach((vlan) => {
      lines.push(`vlan ${vlan.vlanId}`);
      if (vlan.name.trim()) {
        lines.push(` name ${vlan.name.trim().replace(/\s+/g, '_')}`);
      }
      lines.push(vlan.state === 'suspend' ? ' state suspend' : ' state active');
      lines.push('!');
    });
  }

  lines.push('end');
  return lines.join('\n');
}

export function generateVerificationCommands(state: SwitchConfigState): string {
  const cmds: string[] = [
    '! --- دستورات بررسی و عیب‌یابی پس از اعمال کانفیگ ---',
    'show running-config',
    'show vlan brief',
    'show interfaces status',
    'show interfaces trunk',
  ];

  if (state.hardening.sshEnabled) {
    cmds.push('show ip ssh');
    cmds.push('show ssh');
  }
  if (state.hardening.dhcpSnooping) {
    cmds.push('show ip dhcp snooping');
    cmds.push('show ip dhcp snooping binding');
  }
  if (state.hardening.dynamicArpInspection) {
    cmds.push('show ip arp inspection');
  }
  if (state.hardening.rapidPvst) {
    cmds.push('show spanning-tree summary');
  }
  if (state.portGroups.some((pg) => pg.mode === 'access' && pg.portSecurity)) {
    cmds.push('show port-security');
  }
  if (state.management.enabled) {
    cmds.push(`show ip interface brief | include Vlan${state.management.vlanId}`);
  }
  if (state.hardening.ntpServer.trim()) {
    cmds.push('show ntp status');
  }
  if (state.hardening.disableSmartInstall) {
    cmds.push('show vstack config');
  }
  cmds.push('show logging');

  return cmds.join('\n');
}

export const PRESET_CONFIGS: Record<'standard' | 'high_security' | 'core', { label: string; subtitle: string; config: SwitchConfigState }> = {
  standard: {
    label: 'سوئیچ دسترسی استاندارد',
    subtitle: 'مناسب شعب و طبقات اداری با SSH و VLANهای پایه',
    config: {
      hostname: 'SW-ACCESS-FL1',
      domainName: 'corp.local',
      enableSecret: 'En@ble#2026!',
      enableAlgorithm: 'secret',
      bannerMotd:
        'WARNING: Authorized access only. All activities on this Cisco switch are logged and monitored.',
      users: [
        {
          id: 'u-1',
          username: 'netadmin',
          privilege: 15,
          secretType: 'secret',
          password: 'Adm!n#Switch99',
        },
        {
          id: 'u-2',
          username: 'monitor',
          privilege: 1,
          secretType: 'secret',
          password: 'Mon!tor#Read11',
        },
      ],
      vlans: [
        { id: 'v-10', vlanId: 10, name: 'DATA_USERS', state: 'active' },
        { id: 'v-20', vlanId: 20, name: 'VOICE_IP', state: 'active' },
        { id: 'v-99', vlanId: 99, name: 'MGMT', state: 'active' },
        { id: 'v-999', vlanId: 999, name: 'BLACKHOLE', state: 'active' },
      ],
      management: {
        enabled: true,
        vlanId: 99,
        ipAddress: '192.168.99.10',
        subnetMask: '255.255.255.0',
        defaultGateway: '192.168.99.1',
      },
      portGroups: [
        {
          id: 'pg-1',
          portType: 'GigabitEthernet',
          slotPrefix: '1/0/',
          portNumbers: '1-20',
          mode: 'access',
          description: 'User_Workstations_and_Phones',
          accessVlan: 10,
          voiceVlan: 20,
          nativeVlan: 99,
          allowedVlans: '10,20,99',
          portFast: true,
          bpduGuard: true,
          portSecurity: true,
          maxMac: 2,
          violation: 'restrict',
          stickyMac: false,
          stormControl: true,
          dhcpTrust: false,
        },
        {
          id: 'pg-2',
          portType: 'GigabitEthernet',
          slotPrefix: '1/0/',
          portNumbers: '21-22',
          mode: 'shutdown',
          description: 'Unused_Ports_Disabled',
          accessVlan: 999,
          nativeVlan: 99,
          allowedVlans: '',
          portFast: false,
          bpduGuard: false,
          portSecurity: false,
          maxMac: 1,
          violation: 'shutdown',
          stickyMac: false,
          stormControl: false,
          dhcpTrust: false,
        },
        {
          id: 'pg-3',
          portType: 'GigabitEthernet',
          slotPrefix: '1/0/',
          portNumbers: '23-24',
          mode: 'trunk',
          description: 'Uplink_to_Core_Switch',
          accessVlan: 10,
          nativeVlan: 99,
          allowedVlans: '10,20,99',
          portFast: false,
          bpduGuard: false,
          portSecurity: false,
          maxMac: 2,
          violation: 'restrict',
          stickyMac: false,
          stormControl: false,
          dhcpTrust: true,
        },
      ],
      hardening: {
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
        sshVersion: 2,
        rsaModulus: 2048,
        sshTimeout: 60,
        sshRetries: 3,
        disableTelnet: true,
        vtyAclEnabled: true,
        vtyAllowedNetwork: '192.168.99.0',
        vtyAllowedMask: '255.255.255.0',
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
        dhcpSnoopingVlans: '10,20',
        dynamicArpInspection: false,
        daiVlans: '10,20',
        serviceTimestamps: true,
        loggingBuffered: true,
        syslogServer: '',
        ntpServer: '',
        iranTimezone: true,
      },
    },
  },
  high_security: {
    label: 'هاردینگ حداکثری (CIS)',
    subtitle: 'فعال‌سازی کامل امنیت لایه ۲، DAI، Scrypt و AAA',
    config: {
      hostname: 'SW-SEC-EDGE01',
      domainName: 'sec.internal',
      enableSecret: 'C!$c0Hard#2026!9',
      enableAlgorithm: 'scrypt',
      bannerMotd:
        'UNAUTHORIZED ACCESS TO THIS NETWORK DEVICE IS STRICTLY PROHIBITED.\nAll sessions are authenticated, encrypted, and audited.',
      users: [
        {
          id: 'u-hs-1',
          username: 'secadmin',
          privilege: 15,
          secretType: 'scrypt',
          password: 'Sec!Adm#9021@Strong',
        },
      ],
      vlans: [
        { id: 'v-10', vlanId: 10, name: 'CORP_LAN', state: 'active' },
        { id: 'v-50', vlanId: 50, name: 'SERVERS', state: 'active' },
        { id: 'v-99', vlanId: 99, name: 'NET_MGMT', state: 'active' },
        { id: 'v-999', vlanId: 999, name: 'UNUSED_BLACKHOLE', state: 'active' },
      ],
      management: {
        enabled: true,
        vlanId: 99,
        ipAddress: '10.99.0.15',
        subnetMask: '255.255.255.0',
        defaultGateway: '10.99.0.1',
      },
      portGroups: [
        {
          id: 'pg-hs-1',
          portType: 'GigabitEthernet',
          slotPrefix: '1/0/',
          portNumbers: '1-16',
          mode: 'access',
          description: 'Secured_Endpoints',
          accessVlan: 10,
          nativeVlan: 99,
          allowedVlans: '10,50,99',
          portFast: true,
          bpduGuard: true,
          portSecurity: true,
          maxMac: 1,
          violation: 'shutdown',
          stickyMac: true,
          stormControl: true,
          dhcpTrust: false,
        },
        {
          id: 'pg-hs-2',
          portType: 'GigabitEthernet',
          slotPrefix: '1/0/',
          portNumbers: '17-22',
          mode: 'shutdown',
          description: 'Unused_Ports',
          accessVlan: 999,
          nativeVlan: 99,
          allowedVlans: '',
          portFast: false,
          bpduGuard: false,
          portSecurity: false,
          maxMac: 1,
          violation: 'shutdown',
          stickyMac: false,
          stormControl: false,
          dhcpTrust: false,
        },
        {
          id: 'pg-hs-3',
          portType: 'GigabitEthernet',
          slotPrefix: '1/0/',
          portNumbers: '23-24',
          mode: 'trunk',
          description: 'Trusted_Core_Uplink',
          accessVlan: 10,
          nativeVlan: 99,
          allowedVlans: '10,50,99',
          portFast: false,
          bpduGuard: false,
          portSecurity: false,
          maxMac: 2,
          violation: 'restrict',
          stickyMac: false,
          stormControl: false,
          dhcpTrust: true,
        },
      ],
      hardening: {
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
        sshVersion: 2,
        rsaModulus: 4096,
        sshTimeout: 30,
        sshRetries: 2,
        disableTelnet: true,
        vtyAclEnabled: true,
        vtyAllowedNetwork: '10.99.0.0',
        vtyAllowedMask: '255.255.255.0',
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
        dhcpSnoopingVlans: '10,50',
        dynamicArpInspection: true,
        daiVlans: '10,50',
        serviceTimestamps: true,
        loggingBuffered: true,
        syslogServer: '10.99.0.250',
        ntpServer: '10.99.0.254',
        iranTimezone: true,
      },
    },
  },
  core: {
    label: 'سوئیچ توزیع / Core',
    subtitle: 'تمرکز بر Trunkهای سرور، NTP/Syslog و Rapid-PVST',
    config: {
      hostname: 'SW-CORE-01',
      domainName: 'datacenter.local',
      enableSecret: 'C0reSw!tch#88',
      enableAlgorithm: 'secret',
      bannerMotd: 'Core Distribution Switch - Authorized Network Engineers Only.',
      users: [
        {
          id: 'u-c-1',
          username: 'coreadmin',
          privilege: 15,
          secretType: 'secret',
          password: 'C0re@Admin#774',
        },
      ],
      vlans: [
        { id: 'v-10', vlanId: 10, name: 'USERS', state: 'active' },
        { id: 'v-20', vlanId: 20, name: 'VOICE', state: 'active' },
        { id: 'v-50', vlanId: 50, name: 'SERVERS_PROD', state: 'active' },
        { id: 'v-60', vlanId: 60, name: 'STORAGE', state: 'active' },
        { id: 'v-99', vlanId: 99, name: 'MGMT', state: 'active' },
      ],
      management: {
        enabled: true,
        vlanId: 99,
        ipAddress: '172.16.99.2',
        subnetMask: '255.255.255.0',
        defaultGateway: '172.16.99.1',
      },
      portGroups: [
        {
          id: 'pg-c-1',
          portType: 'TenGigabitEthernet',
          slotPrefix: '1/0/',
          portNumbers: '1-8',
          mode: 'trunk',
          description: 'Downlinks_to_Access_Switches',
          accessVlan: 10,
          nativeVlan: 99,
          allowedVlans: '10,20,50,99',
          portFast: false,
          bpduGuard: false,
          portSecurity: false,
          maxMac: 2,
          violation: 'restrict',
          stickyMac: false,
          stormControl: false,
          dhcpTrust: true,
        },
        {
          id: 'pg-c-2',
          portType: 'GigabitEthernet',
          slotPrefix: '1/0/',
          portNumbers: '1-12',
          mode: 'access',
          description: 'Server_Farm_Ports',
          accessVlan: 50,
          nativeVlan: 99,
          allowedVlans: '50',
          portFast: true,
          bpduGuard: true,
          portSecurity: false,
          maxMac: 2,
          violation: 'restrict',
          stickyMac: false,
          stormControl: true,
          dhcpTrust: false,
        },
      ],
      hardening: {
        servicePasswordEncryption: true,
        noIpDomainLookup: true,
        minPasswordLengthEnabled: true,
        minPasswordLength: 10,
        loginBlockEnabled: true,
        loginBlockSeconds: 120,
        loginBlockAttempts: 4,
        loginBlockWithin: 60,
        aaaNewModel: true,
        sshEnabled: true,
        sshVersion: 2,
        rsaModulus: 2048,
        sshTimeout: 60,
        sshRetries: 3,
        disableTelnet: true,
        vtyAclEnabled: true,
        vtyAllowedNetwork: '172.16.99.0',
        vtyAllowedMask: '255.255.255.0',
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
        globalPortFastDefault: false,
        globalBpduGuardDefault: false,
        globalLoopGuard: true,
        shutdownVlan1: true,
        dhcpSnooping: false,
        dhcpSnoopingVlans: '10,20',
        dynamicArpInspection: false,
        daiVlans: '10,20',
        serviceTimestamps: true,
        loggingBuffered: true,
        syslogServer: '172.16.99.50',
        ntpServer: '172.16.99.1',
        iranTimezone: true,
      },
    },
  },
};
