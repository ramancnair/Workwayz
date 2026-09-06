export type FpChartType = 'pie' | 'bar' | 'line' | 'none';

export type FpKpiStatus = 'positive' | 'warning' | 'negative' | 'neutral';

export interface FpKpiCard {
  id: string;
  label: string;
  value: string | number;
  subtext?: string;
  badge?: string;
  status?: FpKpiStatus;
}

export interface FpChartSpec {
  type: FpChartType;
  title: string;
  description?: string;
  dataKey: string;
  categoryKey: string;
  secondaryKey?: string;
  data: Array<Record<string, any>>;
  colors?: string[];
}

export interface FpTableColumn {
  key: string;
  label: string;
  type?: 'text' | 'badge' | 'number' | 'currency' | 'link' | 'date';
}

export interface FpTableSpec {
  columns: FpTableColumn[];
  rows: Array<Record<string, any>>;
  defaultSortKey?: string;
  defaultSortDir?: 'asc' | 'desc';
}

export interface FpAuditStamp {
  sourceCollection: string;
  recordsAnalyzed: number;
  portfolioScope: string;
  timestamp: string;
  provider: string;
  confidence: string;
}

export interface FpQueryRequest {
  query: string;
  portfolioId?: string;
}

export interface FpQueryResponse {
  success: boolean;
  query: string;
  title: string;
  intent: string;
  executiveSummary: string[];
  kpis: FpKpiCard[];
  chart: FpChartSpec;
  table: FpTableSpec;
  audit: FpAuditStamp;
  followUpSuggestions: string[];
  errorMessage?: string;
}
