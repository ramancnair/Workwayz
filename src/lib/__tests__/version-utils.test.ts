import { describe, it, expect } from 'vitest';
import { compareSemver, getAppVersion, detectDeploymentType } from '../version-utils';

describe('version-utils', () => {
  describe('compareSemver', () => {
    it('correctly compares equal versions', () => {
      expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
      expect(compareSemver('v1.0.2', '1.0.2')).toBe(0);
      expect(compareSemver('8.0.2', '8.0.2')).toBe(0);
    });

    it('identifies newer versions correctly', () => {
      expect(compareSemver('1.0.3', '1.0.2')).toBe(1);
      expect(compareSemver('v1.1.0', '1.0.9')).toBe(1);
      expect(compareSemver('2.0.0', '1.9.9')).toBe(1);
      expect(compareSemver('8.1.0', '8.0.2')).toBe(1);
    });

    it('identifies older versions correctly', () => {
      expect(compareSemver('1.0.1', '1.0.2')).toBe(-1);
      expect(compareSemver('1.0.2', '8.0.2')).toBe(-1);
      expect(compareSemver('v0.9.9', '1.0.0')).toBe(-1);
    });

    it('handles pre-release tags and extra metadata', () => {
      expect(compareSemver('1.0.2-beta.1', '1.0.2')).toBe(0);
      expect(compareSemver('1.0.3-canary', '1.0.2')).toBe(1);
      expect(compareSemver('1.0.0+build123', '1.0.0')).toBe(0);
    });

    it('handles empty or invalid inputs gracefully', () => {
      expect(compareSemver('', '')).toBe(0);
      expect(compareSemver('1.0.0', '')).toBe(1);
      expect(compareSemver('', '1.0.0')).toBe(-1);
    });
  });

  describe('getAppVersion', () => {
    it('returns a valid semver string matching package.json', () => {
      const version = getAppVersion();
      expect(typeof version).toBe('string');
      expect(version.split('.').length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('detectDeploymentType', () => {
    it('returns one of the supported deployment types', () => {
      const type = detectDeploymentType();
      expect(['docker', 'npm', 'source']).toContain(type);
    });
  });
});

