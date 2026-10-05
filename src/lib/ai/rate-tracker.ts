import { calculateStepCost } from './cost-calculator';

export interface RequestRecord {
  timestamp: number;
  tokens: number;
}

export interface RateUtilization {
  currentRpm: number;
  limitRpm: number;
  percentRpm: number;
  currentTpm: number;
  limitTpm: number;
  percentTpm: number;
  lastPromptTokens: number;
  lastCompletionTokens: number;
  lastTotalTokens: number;
  lastCostUsd: number;
  lastModelCalls: number;
  lastToolCalls: number;
  lastToolsUsed: string[];
  status: 'safe' | 'warning' | 'critical';
  updatedAt: string;
}

// In-memory sliding window request log (last 60 seconds)
const requestLog: RequestRecord[] = [];

let lastPromptTokens = 0;
let lastCompletionTokens = 0;
let lastTotalTokens = 0;
let lastCostUsd = 0;
let lastModelCalls = 1;
let lastToolCalls = 0;
let lastToolsUsed: string[] = [];

// Configurable limits (defaults to Google Gemini Flash free tier, or pay-as-you-go)
const RPM_LIMIT = parseInt(process.env.AI_RPM_LIMIT || '15', 10);
const TPM_LIMIT = parseInt(process.env.AI_TPM_LIMIT || '1000000', 10);

/**
 * Purges request records older than 60 seconds from the in-memory window.
 */
function pruneOldRecords(now: number) {
  const windowStart = now - 60 * 1000;
  while (requestLog.length > 0 && requestLog[0].timestamp < windowStart) {
    requestLog.shift();
  }
}

/**
 * Records a completed AI request and its token consumption in the rolling 60-second window.
 */
export function recordRequestUsage(
  promptTokens: number = 0,
  completionTokens: number = 0,
  modelName: string = 'gemini-3.8-flash',
  modelCalls: number = 1,
  toolCalls: number = 0,
  toolsUsed: string[] = []
): RateUtilization {
  const now = Date.now();
  pruneOldRecords(now);

  const totalTokens = promptTokens + completionTokens;
  const calls = Math.max(1, modelCalls);
  for (let i = 0; i < calls; i++) {
    requestLog.push({ timestamp: now, tokens: Math.round(totalTokens / calls) });
  }

  lastPromptTokens = promptTokens;
  lastCompletionTokens = completionTokens;
  lastTotalTokens = totalTokens;
  lastModelCalls = modelCalls;
  lastToolCalls = toolCalls;
  lastToolsUsed = toolsUsed;

  const cost = calculateStepCost({ promptTokens, completionTokens }, modelName);
  lastCostUsd = cost.totalCostUsd;

  return getRateUtilization();
}

/**
 * Returns the current rolling 60-second RPM and TPM metrics.
 */
export function getRateUtilization(): RateUtilization {
  const now = Date.now();
  pruneOldRecords(now);

  const currentRpm = requestLog.length;
  const currentTpm = requestLog.reduce((sum, r) => sum + r.tokens, 0);

  const percentRpm = Number(((currentRpm / RPM_LIMIT) * 100).toFixed(1));
  const percentTpm = Number(((currentTpm / TPM_LIMIT) * 100).toFixed(2));

  let status: RateUtilization['status'] = 'safe';
  if (percentRpm >= 85 || percentTpm >= 85) {
    status = 'critical';
  } else if (percentRpm >= 60 || percentTpm >= 60) {
    status = 'warning';
  }

  return {
    currentRpm,
    limitRpm: RPM_LIMIT,
    percentRpm,
    currentTpm,
    limitTpm: TPM_LIMIT,
    percentTpm,
    lastPromptTokens,
    lastCompletionTokens,
    lastTotalTokens,
    lastCostUsd,
    lastModelCalls,
    lastToolCalls,
    lastToolsUsed,
    status,
    updatedAt: new Date().toISOString(),
  };
}
