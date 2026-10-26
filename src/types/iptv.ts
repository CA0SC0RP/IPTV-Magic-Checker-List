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
