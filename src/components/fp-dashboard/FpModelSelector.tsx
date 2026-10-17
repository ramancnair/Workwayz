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

interface FpModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  className?: string;
}

const DEFAULT_MODELS = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', tag: 'Latest & Recommended' },
  { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', tag: 'Production' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', tag: 'High Quota' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', tag: 'Preview' },
];

export function FpModelSelector({
  selectedModel,
  onModelChange,
  className = '',
}: FpModelSelectorProps) {
  const [models, setModels] = useState<Array<{ id: string; name: string; tag?: string }>>(DEFAULT_MODELS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadModels() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/wayfinder/models');
        if (res.ok) {
          const data = await res.json();
          const list: Array<{ id: string; name: string; tag?: string }> = [];

          if (Array.isArray(data.geminiModels)) {
            data.geminiModels.forEach((m: string) => {
              let tag = '';
              if (m.includes('3.5')) tag = 'Recommended';
              else if (m.includes('2.5-flash')) tag = 'Standard';
              else if (m.includes('latest')) tag = 'Production';
              list.push({ id: m, name: m, tag });
            });
          }

          if (Array.isArray(data.lmStudioModels) && data.lmStudioModels.length > 0) {
            data.lmStudioModels.forEach((m: string) => {
              list.push({ id: m, name: `LM Studio: ${m}`, tag: 'Local' });
            });
          }

          if (list.length > 0) {
            setModels(list);
          }
        }
      } catch (err) {
        // Fall back to DEFAULT_MODELS
      } finally {
        setIsLoading(false);
      }
    }
    loadModels();
  }, []);

  const currentDisplay =
    models.find((m) => m.id === selectedModel)?.name || selectedModel || 'Gemini 3.5 Flash';

  const handleSelect = async (modelId: string) => {
    onModelChange(modelId);
    // Also save globally to flowpilot settings
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
          <span className="truncate max-w-[140px] text-foreground/90">{currentDisplay}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 text-xs">
        <DropdownMenuLabel className="text-[11px] text-muted-foreground flex items-center justify-between">
          <span>AI Inference Model</span>
          <Cpu className="h-3 w-3 opacity-60" />
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {models.map((m) => {
          const isSelected = m.id === selectedModel;
          return (
            <DropdownMenuItem
              key={m.id}
              onClick={() => handleSelect(m.id)}
              className="flex items-center justify-between py-1.5 cursor-pointer"
            >
              <div className="flex items-center gap-1.5 truncate">
                {isSelected ? (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}
                <span className={isSelected ? 'font-semibold text-primary' : 'text-foreground'}>
                  {m.name}
                </span>
              </div>
              {m.tag && (
                <Badge
                  variant={isSelected ? 'default' : 'secondary'}
                  className="text-[9px] px-1 py-0 h-4 font-normal"
                >
                  {m.tag}
                </Badge>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
