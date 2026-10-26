'use client';

import React from 'react';
import { AlertTriangle, Sparkles, RefreshCw, Cpu, Zap, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { WayFinderQueryResponse, FpQueryResponse } from '@/types/wayfinder-dashboard';
import { WayFinderModelSelector } from './WayFinderModelSelector';

export interface WayFinderFallbackAlertProps {
  response: WayFinderQueryResponse;
  selectedModel: string;
  onModelChange: (newModel: string) => void;
  onRetry: (modelToUse?: string) => void;
  isLoading?: boolean;
}

export function WayFinderFallbackAlert({
  response,
  selectedModel,
  onModelChange,
  onRetry,
  isLoading = false,
}: WayFinderFallbackAlertProps) {
  if (!response?.isFallback) return null;

  const category = response.errorCategory || 'other';
  const failedModel = response.failedModel || selectedModel || 'AI Model';

  const is503 = category === 'high_demand';
  const is429 = category === 'quota_exceeded';

  const defaultTitle = is429
    ? 'AI Quota Exceeded (HTTP 429)'
    : is503
    ? 'AI Service High Demand / No Capacity (HTTP 503)'
    : 'AI Service Notice (Operating on Local Heuristic Engine)';

  const title = response.fallbackTitle || defaultTitle;
  const reason =
    response.fallbackReason ||
    'The AI service is temporarily unavailable. This report was synthesized using the failsafe local heuristic engine.';

  const handleQuickSwitch = (model: string) => {
    onModelChange(model);
    onRetry(model);
  };

  return (
    <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent p-4 sm:p-5 shadow-sm space-y-3.5 transition-all">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
            <AlertTriangle className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-bold text-sm sm:text-base text-amber-200 tracking-tight flex items-center gap-1.5">
                {title}
              </h4>
              <Badge
                variant="outline"
                className="border-amber-500/40 bg-amber-500/20 text-amber-300 font-mono text-[10px] px-2 py-0"
              >
                {is429 ? 'HTTP 429 Quota' : is503 ? 'HTTP 503 Unavailable' : 'Local Heuristic Mode'}
              </Badge>
              {failedModel && (
                <Badge
                  variant="outline"
                  className="border-border/80 bg-background/60 text-muted-foreground font-mono text-[10px] px-2 py-0"
                >
                  Model: {failedModel}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-foreground/90 mt-1 leading-relaxed max-w-4xl">
              {reason}
            </p>
          </div>
        </div>

        {/* Failsafe Heuristic Badge */}
        <div className="shrink-0 flex items-center gap-1.5 self-start sm:self-auto px-2.5 py-1 rounded-md bg-background/50 border border-border text-[11px] text-muted-foreground">
          <Info className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>Local Engine Active (Zero Hallucination)</span>
        </div>
      </div>

      {/* Action Row: Model Switcher & Quick Buttons */}
      <div className="pt-2 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-amber-300/90 flex items-center gap-1">
            <Zap className="h-3.5 w-3.5 text-amber-400" /> Switch Model & Restore AI:
          </span>

          {/* Quick Switch Candidates */}
          {failedModel !== 'gemini-3.5-flash' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickSwitch('gemini-3.5-flash')}
              disabled={isLoading}
              className="h-7 px-2.5 text-xs bg-card/80 border-primary/40 hover:bg-primary hover:text-primary-foreground font-medium gap-1.5 cursor-pointer shadow-2xs"
            >
              <Sparkles className="h-3 w-3 text-primary group-hover:text-primary-foreground" />
              Switch to Gemini 3.5 Flash
            </Button>
          )}

          {failedModel !== 'gemini-3.8-flash' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickSwitch('gemini-3.8-flash')}
              disabled={isLoading}
              className="h-7 px-2.5 text-xs bg-card/80 border-border hover:bg-accent font-medium gap-1.5 cursor-pointer shadow-2xs"
            >
              <Cpu className="h-3 w-3 text-muted-foreground" />
              Switch to Gemini 3.8 Flash
            </Button>
          )}

          {failedModel !== 'gemini-flash-latest' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleQuickSwitch('gemini-flash-latest')}
              disabled={isLoading}
              className="h-7 px-2.5 text-xs bg-card/80 border-border hover:bg-accent font-medium gap-1.5 cursor-pointer shadow-2xs"
            >
              <Cpu className="h-3 w-3 text-muted-foreground" />
              Switch to Flash Latest
            </Button>
          )}
        </div>

        {/* Custom Selector Dropdown & Retry */}
        <div className="flex items-center gap-2">
          <WayFinderModelSelector
            selectedModel={selectedModel}
            onModelChange={(newModel) => {
              onModelChange(newModel);
              onRetry(newModel);
            }}
            className="h-7 text-xs bg-background/80"
          />

          <Button
            size="sm"
            variant="default"
            onClick={() => onRetry()}
            disabled={isLoading}
            className="h-7 px-3 text-xs gap-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}

// Backwards-compatible aliases
export const FpFallbackAlert = WayFinderFallbackAlert;
export type FpFallbackAlertProps = WayFinderFallbackAlertProps;
