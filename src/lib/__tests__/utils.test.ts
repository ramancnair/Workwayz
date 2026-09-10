import { describe, it, expect } from 'vitest';
import {
  cn,
  getSprintDisplayId,
  generateNextSprintId,
  isValidUrl,
  formatUrl,
  getUserInitials,
  formatRateInput,
  matchSearchQuery,
} from '../utils';

describe('ProjectFlow Utility Functions (utils.ts)', () => {
  describe('cn (Tailwind class merging)', () => {
    it('should merge classes and handle conditionals correctly', () => {
      expect(cn('bg-red-500', 'text-white')).toBe('bg-red-500 text-white');
      expect(cn('p-4', false && 'p-8', 'text-sm')).toBe('p-4 text-sm');
      expect(cn('p-4', 'p-8')).toBe('p-8'); // twMerge precedence
    });
  });

  describe('getUserInitials', () => {
    it('should extract initials from first and last names', () => {
      expect(getUserInitials('Alex', 'Vance')).toBe('AV');
      expect(getUserInitials('John', 'Doe')).toBe('JD');
    });

    it('should extract initials from full name string', () => {
      expect(getUserInitials(null, null, 'Sarah Connor')).toBe('SC');
      expect(getUserInitials(undefined, undefined, 'Alan Mathison Turing')).toBe('AT');
    });

    it('should handle single names and empty fallbacks', () => {
      expect(getUserInitials('Madonna', '')).toBe('MA');
      expect(getUserInitials('', '', '')).toBe('?');
      expect(getUserInitials(null, null, null)).toBe('?');
    });
  });

  describe('URL validation & formatting (isValidUrl & formatUrl)', () => {
    it('should validate standard URLs with protocols', () => {
      expect(isValidUrl('https://google.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
      expect(isValidUrl('https://sub.domain.org/path?param=1')).toBe(true);
    });

    it('should validate URLs without protocol', () => {
      expect(isValidUrl('google.com')).toBe(true);
      expect(isValidUrl('sub.domain.org')).toBe(true);
    });

    it('should reject invalid strings and spaces', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('htt p://example.com')).toBe(false);
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl(null)).toBe(false);
    });

    it('should format URL with https protocol prefix if missing', () => {
      expect(formatUrl('example.com')).toBe('https://example.com');
      expect(formatUrl('https://example.com')).toBe('https://example.com');
      expect(formatUrl('http://localhost:3000')).toBe('http://localhost:3000');
    });
  });

  describe('formatRateInput', () => {
    it('should format numbers to 2 decimal places', () => {
      expect(formatRateInput(100)).toBe('100.00');
      expect(formatRateInput(55.5)).toBe('55.50');
      expect(formatRateInput(0)).toBe('0.00');
      expect(formatRateInput('12.345')).toBe('12.35');
    });

    it('should handle null, undefined, or empty values with fallback', () => {
      expect(formatRateInput(null, true)).toBe('0.00');
      expect(formatRateInput(null, false)).toBe('');
      expect(formatRateInput('', false)).toBe('');
    });
  });

  describe('Sprint ID helpers (getSprintDisplayId & generateNextSprintId)', () => {
    it('should parse and format sprint display ID', () => {
      expect(getSprintDisplayId({ id: 'sp-3', title: 'Sprint 3' })).toBe('sp-3');
      expect(getSprintDisplayId({ id: 'custom-id', sprintId: 'SP-5' })).toBe('SP-5');
      expect(getSprintDisplayId({ id: 'raw', title: 'Sprint 2' })).toBe('SP-2');
    });

    it('should generate next sequential sprint ID', () => {
      const sprints = [
        { id: '1', sprintId: 'SP-1' },
        { id: '2', sprintId: 'SP-2' },
        { id: '3', sprintId: 'SP-3' },
      ];
      expect(generateNextSprintId(sprints)).toBe('SP-4');
    });
  });

  describe('matchSearchQuery', () => {
    it('should match search query substrings and tokens', () => {
      expect(matchSearchQuery('Project Management Office', 'management')).toBe(true);
      expect(matchSearchQuery('Portfolio Governance', 'gov')).toBe(true);
      expect(matchSearchQuery('Feature Card', '')).toBe(true);
      expect(matchSearchQuery(null, 'test')).toBe(false);
    });
  });
});
