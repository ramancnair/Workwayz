'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Check, ChevronDown, Cpu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface ModelOption {
  id: string;
  name: string;
  tag?: string;
  description?: string;
}

export const CUSTOMER_GEMINI_METADATA: Record<string, { name: string; tag?: string; description?: string }> = {
  'gemini-3.8-flash': {
    name: 'Gemini 3.8 Flash',
    tag: 'Latest & Recommended',
    description: 'Fastest reasoning model with multimodal capabilities',
  },
  'gemini-flash-latest': {
    name: 'Gemini Flash Latest',
    tag: 'Production',
    description: 'Canonical production release for low-latency tasks',
  },
  'gemini-3.7-flash': {
    name: 'Gemini 3.7 Flash',
    tag: 'Fast & Versatile',
    description: 'High-throughput model with hybrid reasoning',
  },
  'gemini-3.6-flash': {
    name: 'Gemini 3.6 Flash',
    tag: 'Stable',
    description: 'Reliable, proven Flash production model',
  },
  'gemini-3.5-flash': {
    name: 'Gemini 3.5 Flash',
    tag: 'High Quota',
    description: 'Standard model with generous rate limits',
  },
  'gemini-flash-lite-latest': {
    name: 'Gemini Flash-Lite Latest',
    tag: 'Cost Effective',
    description: 'Ultra-lightweight production model for real-time analytics',
  },
  'gemini-3.5-flash-lite': {
    name: 'Gemini 3.5 Flash-Lite',
    tag: 'Ultra Fast',
    description: 'Low-latency lightweight model for quick summaries',
  },
  'gemini-pro-latest': {
    name: 'Gemini Pro Latest',
    tag: 'Deep Reasoning',
    description: 'Advanced intelligence for strategic synthesis',
  },
  'gemini-3-flash-preview': {
    name: 'Gemini 3 Flash Preview',
    tag: 'Preview',
    description: 'Experimental next-gen Flash preview build',
  },
  'gemini-3.1-pro-preview': {
    name: 'Gemini 3.1 Pro Preview',
    tag: 'Pro Preview',
    description: 'Next-generation Pro analytical model preview',
  },
  'gemini-3.1-flash-lite': {
    name: 'Gemini 3.1 Flash-Lite',
    tag: 'Lightweight',
    description: 'Efficient lightweight Flash model',
  },
  'gemini-3.1-flash-lite-preview': {
    name: 'Gemini 3.1 Flash-Lite Preview',
    tag: 'Preview',
    description: 'Preview build of 3.1 Flash-Lite',
  },
};

export function getModelDisplayName(modelId: string): string {
  if (CUSTOMER_GEMINI_METADATA[modelId]) {
    return CUSTOMER_GEMINI_METADATA[modelId].name;
  }
  if (modelId.startsWith('meta/') || modelId.startsWith('local')) {
    const raw = modelId.split('/').pop() || modelId;
    return `LM Studio: ${raw}`;
  }
  return modelId
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export const DEFAULT_CUSTOMER_MODELS: ModelOption[] = [
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    tag: 'Latest & Recommended',
    description: 'Fastest reasoning model with multimodal capabilities',
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    tag: 'Production',
    description: 'Canonical production release for low-latency tasks',
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    tag: 'Fast & Versatile',
    description: 'High-throughput model with hybrid reasoning',
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    tag: 'Stable',
    description: 'Reliable, proven Flash production model',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    tag: 'High Quota',
    description: 'Standard model with generous rate limits',
  },
  {
    id: 'gemini-flash-lite-latest',
    name: 'Gemini Flash-Lite Latest',
    tag: 'Cost Effective',
    description: 'Ultra-lightweight production model for real-time analytics',
  },
  {
    id: 'gemini-3.5-flash-lite',
    name: 'Gemini 3.5 Flash-Lite',
    tag: 'Ultra Fast',
    description: 'Low-latency lightweight model for quick summaries',
  },
  {
    id: 'gemini-pro-latest',
    name: 'Gemini Pro Latest',
    tag: 'Deep Reasoning',
    description: 'Advanced intelligence for strategic synthesis',
  },
];

export interface WayFinderModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  className?: string;
}

export function WayFinderModelSelector({
  selectedModel,
  onModelChange,
  className = '',
}: WayFinderModelSelectorProps) {
  const [models, setModels] = useState<ModelOption[]>(DEFAULT_CUSTOMER_MODELS);
  const [, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadModels() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/wayfinder/models');
        if (res.ok) {
          const data = await res.json();
          const list: ModelOption[] = [];

          if (Array.isArray(data.geminiModels)) {
            data.geminiModels.forEach((m: string) => {
              const meta = CUSTOMER_GEMINI_METADATA[m];
              list.push({
                id: m,
                name: meta?.name || getModelDisplayName(m),
                tag: meta?.tag,
                description: meta?.description,
              });
            });
          }

          if (Array.isArray(data.lmStudioModels) && data.lmStudioModels.length > 0) {
            data.lmStudioModels.forEach((m: string) => {
              list.push({
                id: m,
                name: `LM Studio: ${m}`,
                tag: 'Local',
                description: 'Self-hosted local inference server',
              });
            });
          }

          if (list.length > 0) {
            setModels(list);
          }
        }
      } catch (err) {
        // Fall back to DEFAULT_CUSTOMER_MODELS
      } finally {
        setIsLoading(false);
      }
    }
    loadModels();
  }, []);

  const currentDisplay =
    models.find((m) => m.id === selectedModel)?.name ||
    getModelDisplayName(selectedModel) ||
    'Gemini 3.5 Flash';

  const handleSelect = async (modelId: string) => {
    onModelChange(modelId);
    // Also save globally to wayfinder settings
    try {
      await fetch('/api/wayfinder/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: modelId.includes('meta/') || modelId.includes('local') ? 'lmstudio' : 'google',
          model: modelId,
        }),
      });
    } catch {
      // Non-fatal
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-8 px-2.5 text-xs font-medium border-border/80 bg-card/80 hover:bg-accent gap-1.5 cursor-pointer shadow-xs ${className}`}
        >
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="truncate max-w-[150px] text-foreground/90 font-medium">{currentDisplay}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 text-xs p-1.5 shadow-lg border-border">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground flex items-center justify-between px-2 py-1">
          <span>AI Inference Model</span>
          <Cpu className="h-3.5 w-3.5 opacity-60" />
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        <div className="max-h-72 overflow-y-auto space-y-0.5 pr-0.5">
          {models.map((m) => {
            const isSelected = m.id === selectedModel;
            return (
              <DropdownMenuItem
                key={m.id}
                onClick={() => handleSelect(m.id)}
                className="flex items-center justify-between py-2 px-2.5 cursor-pointer rounded-md hover:bg-accent/80 transition-colors"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                  ) : (
                    <span className="w-3.5 shrink-0" />
                  )}
                  <div className="flex flex-col truncate">
                    <span className={isSelected ? 'font-semibold text-primary' : 'font-medium text-foreground'}>
                      {m.name}
                    </span>
                    {m.description && (
                      <span className="text-[10px] text-muted-foreground/80 truncate">
                        {m.description}
                      </span>
                    )}
                  </div>
                </div>
                {m.tag && (
                  <Badge
                    variant={isSelected ? 'default' : 'secondary'}
                    className="text-[9px] px-1.5 py-0 h-4 font-normal shrink-0 tracking-tight"
                  >
                    {m.tag}
                  </Badge>
                )}
              </DropdownMenuItem>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Backwards-compatible aliases
export const FpModelSelector = WayFinderModelSelector;
export type FpModelSelectorProps = WayFinderModelSelectorProps;
