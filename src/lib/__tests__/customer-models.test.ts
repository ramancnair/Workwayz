import { describe, it, expect } from 'vitest';
import {
  CUSTOMER_GEMINI_METADATA,
  getModelDisplayName,
} from '@/components/wayfinder/WayFinderModelSelector';

describe('Customer-Usable AI Models', () => {
  it('should define clean metadata for standard customer Gemini models', () => {
    expect(CUSTOMER_GEMINI_METADATA['gemini-3.8-flash']).toBeDefined();
    expect(CUSTOMER_GEMINI_METADATA['gemini-3.8-flash'].name).toBe('Gemini 3.8 Flash');
    expect(CUSTOMER_GEMINI_METADATA['gemini-3.8-flash'].tag).toBe('Latest & Recommended');

    expect(CUSTOMER_GEMINI_METADATA['gemini-flash-latest']).toBeDefined();
    expect(CUSTOMER_GEMINI_METADATA['gemini-flash-latest'].name).toBe('Gemini Flash Latest');
    expect(CUSTOMER_GEMINI_METADATA['gemini-flash-latest'].tag).toBe('Production');

    expect(CUSTOMER_GEMINI_METADATA['gemini-3.5-flash']).toBeDefined();
    expect(CUSTOMER_GEMINI_METADATA['gemini-3.5-flash'].name).toBe('Gemini 3.5 Flash');
    expect(CUSTOMER_GEMINI_METADATA['gemini-3.5-flash'].tag).toBe('High Quota');
  });

  it('should not contain non-customer, audio, image, internal, or deprecated models', () => {
    const modelKeys = Object.keys(CUSTOMER_GEMINI_METADATA);

    // Audio/music models
    expect(modelKeys.some((k) => k.includes('lyria'))).toBe(false);
    expect(modelKeys.some((k) => k.includes('transcribe'))).toBe(false);
    expect(modelKeys.some((k) => k.includes('tts'))).toBe(false);

    // Image/vision models
    expect(modelKeys.some((k) => k.includes('image'))).toBe(false);
    expect(modelKeys.some((k) => k.includes('banana'))).toBe(false);

    // Internal developer preview / agent models
    expect(modelKeys.some((k) => k.includes('antigravity'))).toBe(false);
    expect(modelKeys.some((k) => k.includes('deep-research'))).toBe(false);
    expect(modelKeys.some((k) => k.includes('computer-use'))).toBe(false);
    expect(modelKeys.some((k) => k.includes('argon'))).toBe(false);
    expect(modelKeys.some((k) => k.includes('robotics'))).toBe(false);

    // Deprecated models
    expect(modelKeys.some((k) => k.includes('2.5-flash'))).toBe(false);
    expect(modelKeys.some((k) => k.includes('2.5-pro'))).toBe(false);
  });

  it('should format model display names accurately', () => {
    expect(getModelDisplayName('gemini-3.8-flash')).toBe('Gemini 3.8 Flash');
    expect(getModelDisplayName('gemini-flash-latest')).toBe('Gemini Flash Latest');
    expect(getModelDisplayName('gemini-3.5-flash')).toBe('Gemini 3.5 Flash');
    expect(getModelDisplayName('meta/muse-glimmer')).toBe('LM Studio: muse-glimmer');
  });
});
