export type SecretType = 'scrypt' | 'secret' | 'password';

export interface UserAccount {
  id: string;
  username: string;
  privilege: number;
  secretType: SecretType;
  password: string;
}

export interface VlanConfig {
  id: string;
  vlanId: number;
  name: string;
  state: 'active' | 'suspend';
}

export type PortMode = 'access' | 'trunk' | 'shutdown';
export type PortMediaType = 'FastEthernet' | 'GigabitEthernet' | 'TenGigabitEthernet' | 'Port-channel';
export type ViolationMode = 'restrict' | 'shutdown' | 'protect';

export interface PortGroupConfig {
  id: string;
  portType: PortMediaType;
  slotPrefix: string;
  portNumbers: string;
  interfaceRange?: string;
  mode: PortMode;
  description: string;
  accessVlan: number;
  voiceVlan?: number;
  nativeVlan: number;
  allowedVlans: string;
  portFast: boolean;
  bpduGuard: boolean;
  portSecurity: boolean;
  maxMac: number;
  violation: ViolationMode;
  stickyMac: boolean;
  stormControl: boolean;
  dhcpTrust: boolean;
}

export interface HardeningConfig {
  servicePasswordEncryption: boolean;
  noIpDomainLookup: boolean;
  minPasswordLengthEnabled: boolean;
  minPasswordLength: number;
  loginBlockEnabled: boolean;
  loginBlockSeconds: number;
  loginBlockAttempts: number;
  loginBlockWithin: number;
  aaaNewModel: boolean;
  sshEnabled: boolean;
  sshVersion: 2;
  rsaModulus: 2048 | 4096;
  sshTimeout: number;
  sshRetries: number;
  disableTelnet: boolean;
  vtyAclEnabled: boolean;
  vtyAllowedNetwork: string;
  vtyAllowedMask: string;
  execTimeoutMinutes: number;
  loggingSynchronous: boolean;
  disableHttp: boolean;
  disableHttps: boolean;
  disableCdpGlobal: boolean;
  disableLldpGlobal: boolean;
  disableExtraBanners: boolean;
  disableSmartInstall: boolean;
  disableUnnecessaryServices: boolean;
  rapidPvst: boolean;
  globalPortFastDefault: boolean;
  globalBpduGuardDefault: boolean;
  globalLoopGuard: boolean;
  shutdownVlan1: boolean;
  dhcpSnooping: boolean;
  dhcpSnoopingVlans: string;
  dynamicArpInspection: boolean;
  daiVlans: string;
  serviceTimestamps: boolean;
  loggingBuffered: boolean;
  syslogServer: string;
  ntpServer: string;
  iranTimezone: boolean;
}

export interface ManagementConfig {
  enabled: boolean;
  vlanId: number;
  ipAddress: string;
  subnetMask: string;
  defaultGateway: string;
}

export interface SwitchConfigState {
  hostname: string;
  domainName: string;
  enableSecret: string;
  enableAlgorithm: 'scrypt' | 'secret';
  bannerMotd: string;
  users: UserAccount[];
  vlans: VlanConfig[];
  management: ManagementConfig;
  portGroups: PortGroupConfig[];
  hardening: HardeningConfig;
}

export interface ConfigWarning {
  id: string;
  level: 'warning' | 'error';
  message: string;
}

export interface SavedProfile {
  id: string;
  name: string;
  updatedAt: string;
  config: SwitchConfigState;
}
