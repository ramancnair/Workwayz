import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isRetriableAiError, getModelCascadeList, runPromptWithCascade } from '../ai/model-cascade';

vi.mock('@/ai/genkit', () => ({
  getActiveAiConfig: vi.fn(() => ({
    provider: 'google',
    apiKey: 'mock-key',
    model: 'gemini-3.8-flash',
  })),
}));

describe('model-cascade utility', () => {
  describe('isRetriableAiError', () => {
    it('identifies 503 Service Unavailable / High Demand', () => {
      const err = new Error('503 Service Unavailable: This model is currently experiencing high demand.');
      expect(isRetriableAiError(err)).toBe(true);
    });

    it('identifies 429 Quota Exceeded / Resource Exhausted', () => {
      const err = new Error('RESOURCE_EXHAUSTED: [429 Too Many Requests] You exceeded your current quota');
      expect(isRetriableAiError(err)).toBe(true);
    });

    it('identifies 404 Not Found / Deprecated model', () => {
      const err = new Error('[404 Not Found] This model is no longer available to new users.');
      expect(isRetriableAiError(err)).toBe(true);
    });

    it('does not classify syntax or argument errors as retriable', () => {
      const err = new Error('Invalid JSON format in user input');
      expect(isRetriableAiError(err)).toBe(false);
    });
  });

  describe('getModelCascadeList', () => {
    it('returns prioritized, deduplicated list without deprecated 2.5 models', () => {
      const list = getModelCascadeList();
      expect(list[0]).toBe('googleai/gemini-3.8-flash');
      expect(list).toContain('googleai/gemini-3.6-flash');
      expect(list).toContain('googleai/gemini-flash-lite-latest');
      expect(list).toContain('googleai/gemini-3.5-flash-lite');
      expect(list).toContain('googleai/gemini-flash-latest');
      expect(list.some((m) => m.includes('2.5-flash'))).toBe(false);
    });
  });

  describe('runPromptWithCascade', () => {
    it('returns output directly when primary model succeeds', async () => {
      const mockPrompt = vi.fn().mockResolvedValue({
        output: { result: 'estimation success' },
      });

      const res = await runPromptWithCascade(mockPrompt, { input: 'test' });
      expect(res).toEqual({ result: 'estimation success' });
      expect(mockPrompt).toHaveBeenCalledTimes(1);
    });

    it('cascades to second model when primary model hits 503 high demand', async () => {
      const mockPrompt = vi.fn()
        .mockRejectedValueOnce(new Error('503 Service Unavailable: High demand'))
        .mockResolvedValueOnce({ output: { result: 'cascaded success' } });

      const res = await runPromptWithCascade(mockPrompt, { input: 'test' });
      expect(res).toEqual({ result: 'cascaded success' });
      expect(mockPrompt).toHaveBeenCalledTimes(2);
    });

    it('throws clean user error if all models in cascade fail with 503', async () => {
      const mockPrompt = vi.fn().mockRejectedValue(new Error('503 High demand'));

      await expect(
        runPromptWithCascade(mockPrompt, { input: 'test' }, { customModels: ['model-1', 'model-2'] })
      ).rejects.toThrow(/Google AI endpoints are currently experiencing temporary high demand/);
      expect(mockPrompt).toHaveBeenCalledTimes(2);
    });

    it('throws immediately on non-retriable error without useless cascading', async () => {
      const mockPrompt = vi.fn().mockRejectedValue(new Error('Invalid authentication token'));

      await expect(
        runPromptWithCascade(mockPrompt, { input: 'test' })
      ).rejects.toThrow('Invalid authentication token');
      expect(mockPrompt).toHaveBeenCalledTimes(1);
    });
  });
});
