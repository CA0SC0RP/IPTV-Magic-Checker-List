export type AccountStatus =
  | 'ACTIVE'
  | 'EXPIRED'
  | 'AUTH_FAILED'
  | 'BANNED'
  | 'DISABLED'
  | 'CONNECTION_ERROR'
  | 'UNKNOWN'
  | 'DATA_ABSENT';

export interface CheckResult {
  id: string;
  host: string;
  username: string;
  password?: string;
  status: AccountStatus;
  statusLabel: string;
  statusColor: string;
  latencyMs: number;
  expDate?: string | null;
  expTimestamp?: number | null;
  daysRemaining?: number | null;
  isUnlimited?: boolean;
  isTrial?: boolean;
  activeCons?: number | string | null;
  maxCons?: number | string | null;
  allowedFormats?: string[];
  serverTime?: string | null;
  timezone?: string | null;
  serverUrl?: string | null;
  serverPort?: string | null;
  missingFields: string[];
  errorDetails?: string;
  rawSample?: any;
  checkedAt: string;
}

export interface AccountInput {
  host: string;
  username: string;
  password?: string;
  rawLine?: string;
}

export interface AccessDiagnosis {
  geoLockStatus: 'OPEN_WORLD' | 'GEO_RESTRICTED' | 'SATURATED_BLOCKED' | 'UNKNOWN' | 'OFFLINE';
  geoLockLabel: string;
  geoLockColor: 'emerald' | 'amber' | 'rose' | 'blue' | 'purple';
  country: string;
  flag: string;
  region: string;
  timezone: string;
  connectionState: 'AVAILABLE' | 'SATURATED' | 'UNLIMITED';
  activeCons: number;
  maxCons: number | null;
  isSaturated: boolean;
  connectionsSummary: string;
  geoExplanation: string;
  wafDetected?: boolean;
  testedStreamId?: string | number;
  testedFormat?: string;
  latencyMs?: number;
  httpStatus?: number;
  recommendations: string[];
}

export interface SavedAccount {
  id: string;
  host: string;
  username: string;
  password?: string;
  expDate?: string | null;
  daysRemaining?: number | null;
  isUnlimited?: boolean;
  status?: AccountStatus;
  statusLabel?: string;
  timezone?: string | null;
  country?: string;
  flag?: string;
  geoLockStatus?: 'OPEN_WORLD' | 'GEO_RESTRICTED' | 'SATURATED_BLOCKED' | 'UNKNOWN';
  isSaturated?: boolean;
  savedAt: string;
}

