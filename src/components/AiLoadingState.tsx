'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Bot, Layers, Cpu, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AiLoadingStep {
  label: string;
  detail?: string;
}

const DEFAULT_STACK_STEPS: AiLoadingStep[] = [
  { label: 'Connecting to AI service', detail: 'Initiating secure model connection' },
  { label: 'Sending project scope & prompt', detail: 'Packaging technical requirements for tech stack analysis' },
  { label: 'Waiting for AI model response', detail: 'Model is synthesizing architectural options & effort estimates' },
  { label: 'Still processing request', detail: 'AI inference may take 10-20s during peak traffic periods' },
  { label: 'Receiving & structuring response', detail: 'Formatting systems, effort and daily rates' },
];

const DEFAULT_HORIZONTAL_STEPS: AiLoadingStep[] = [
  { label: 'Connecting to AI service', detail: 'Initiating secure model connection' },
  { label: 'Sending project scope & baseline', detail: 'Packaging requirements for horizontal strategy analysis' },
  { label: 'Waiting for AI model response', detail: 'Model is synthesizing delivery strategies & weightages' },
  { label: 'Still processing request', detail: 'AI inference may take 10-20s during peak traffic periods' },
  { label: 'Receiving & structuring response', detail: 'Formatting governance, effort and rate distributions' },
];

const DEFAULT_GENERAL_STEPS: AiLoadingStep[] = [
  { label: 'Connecting to AI service', detail: 'Initiating secure model connection' },
  { label: 'Sending request to AI model', detail: 'Transferring input parameters' },
  { label: 'Waiting for AI model response', detail: 'Model is processing reasoning and generating response' },
  { label: 'Still processing request', detail: 'AI inference in progress' },
  { label: 'Receiving & structuring response', detail: 'Validating output structure' },
];

interface AiLoadingStateProps {
  type?: 'stack' | 'horizontals' | 'general';
  steps?: AiLoadingStep[];
  intervalMs?: number;
  className?: string;
}

export function AiLoadingState({
  type = 'general',
  steps: customSteps,
  intervalMs = 2400,
  className,
}: AiLoadingStateProps) {
  const steps =
    customSteps ||
    (type === 'stack'
      ? DEFAULT_STACK_STEPS
      : type === 'horizontals'
      ? DEFAULT_HORIZONTAL_STEPS
      : DEFAULT_GENERAL_STEPS);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < steps.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [steps.length, intervalMs]);

  const activeStep = steps[currentStepIndex] || steps[0];
  const progressPercent = Math.min(
    95,
    Math.round(((currentStepIndex + 1) / steps.length) * 100)
  );

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center select-none',
        className
      )}
    >
      {/* Animated Multi-ring AI Orb */}
      <div className="relative flex items-center justify-center w-20 h-20 mb-5">
        {/* Ambient Pulsing Glow */}
        <div className="absolute inset-0 rounded-full bg-primary/25 blur-lg animate-pulse" />

        {/* Outer Spinning Dashed Orbit */}
        <div
          className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin"
          style={{ animationDuration: '2.8s' }}
        />

        {/* Inner Counter-spinning Orbit */}
        <div
          className="absolute inset-2 rounded-full border border-dashed border-primary/30 border-b-primary/70 animate-spin"
          style={{ animationDirection: 'reverse', animationDuration: '4.5s' }}
        />

        {/* Core AI Icon Badge */}
        <div className="relative flex items-center justify-center w-11 h-11 rounded-full bg-background border border-primary/30 shadow-md">
          {type === 'stack' ? (
            <Layers className="w-5 h-5 text-primary animate-pulse" />
          ) : type === 'horizontals' ? (
            <Cpu className="w-5 h-5 text-primary animate-pulse" />
          ) : (
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          )}
        </div>
      </div>

      {/* Main Status Text with Bouncing Dots */}
      <div className="flex items-center justify-center text-sm md:text-base font-medium text-foreground transition-all duration-300">
        <span>{activeStep.label}</span>
        <span className="inline-flex items-center gap-1 ml-1.5 translate-y-[2px]">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.32s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.16s]" />
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
        </span>
      </div>

      {/* Detail Subtext */}
      {activeStep.detail && (
        <p className="text-xs text-muted-foreground mt-1.5 max-w-sm transition-opacity duration-300">
          {activeStep.detail}
        </p>
      )}

      {/* Progress Track */}
      <div className="w-56 h-1.5 bg-muted rounded-full overflow-hidden mt-4 relative">
        <div
          className="h-full bg-gradient-to-r from-primary/70 via-primary to-primary/90 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step Counter Indicator */}
      <div className="flex items-center justify-center gap-1.5 mt-3">
        {steps.map((_, idx) => (
          <span
            key={idx}
            className={cn(
              'w-1.5 h-1.5 rounded-full transition-all duration-300',
              idx === currentStepIndex
                ? 'w-4 bg-primary'
                : idx < currentStepIndex
                ? 'bg-primary/50'
                : 'bg-muted-foreground/25'
            )}
          />
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground/60 mt-3 font-normal">
        Awaiting response from AI model • Status updates while request is in-flight
      </p>
    </div>
  );
}
