export type WayFinderChartType = 'pie' | 'bar' | 'line' | 'none';

export type WayFinderKpiStatus = 'positive' | 'warning' | 'negative' | 'neutral';

export interface WayFinderKpiCard {
  id: string;
  label: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  status?: WayFinderKpiStatus;
}

export interface WayFinderChartSpec {
  type: WayFinderChartType;
  title: string;
  description?: string;
  dataKey: string;
  categoryKey: string;
  secondaryKey?: string;
  data: Array<Record<string, any>>;
  colors?: string[];
}

export interface WayFinderTableColumn {
  key: string;
  label: string;
  type?: 'text' | 'badge' | 'number' | 'currency' | 'link' | 'date';
}

export interface WayFinderTableSpec {
  columns: WayFinderTableColumn[];
  rows: Array<Record<string, any>>;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
}

export interface WayFinderAuditStamp {
  sourceCollection: string;
  recordsAnalyzed: number;
  portfolioScope: string;
  timestamp: string;
  provider: string;
  confidence: string;
}

export interface WayFinderQueryRequest {
  query: string;
  portfolioId?: string;
}

export interface WayFinderQueryResponse {
  success: boolean;
  query: string;
  title: string;
  intent: string;
  executiveSummary: string[];
  kpis: WayFinderKpiCard[];
  chart: WayFinderChartSpec;
  table: WayFinderTableSpec;
  audit: WayFinderAuditStamp;
  followUpSuggestions: string[];
  isFallback?: boolean;
  fallbackReason?: string;
  fallbackTitle?: string;
  failedModel?: string;
  errorCategory?: 'quota_exceeded' | 'high_demand' | 'auth_error' | 'network_error' | 'other';
}

// Aliases for legacy references
export type FpChartType = WayFinderChartType;
export type FpKpiStatus = WayFinderKpiStatus;
export type FpKpiCard = WayFinderKpiCard;
export type FpChartSpec = WayFinderChartSpec;
export type FpTableColumn = WayFinderTableColumn;
export type FpTableSpec = WayFinderTableSpec;
export type FpAuditStamp = WayFinderAuditStamp;
export type FpQueryRequest = WayFinderQueryRequest;
export type FpQueryResponse = WayFinderQueryResponse;
