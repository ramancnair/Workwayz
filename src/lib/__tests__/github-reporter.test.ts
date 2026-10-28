import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildIssueTitle,
  buildIssueBody,
  createGitHubIssue,
  GitHubIssuePayload,
} from '../github-reporter';

describe('GitHub Issue Reporter (github-reporter.ts)', () => {
  describe('buildIssueTitle', () => {
    it('uses custom title if provided', () => {
      const payload: GitHubIssuePayload = {
        title: 'Custom Bug Title',
        errorMessage: 'Some error message',
      };
      expect(buildIssueTitle(payload)).toBe('Custom Bug Title');
    });

    it('prepends errorName to errorMessage when generating title', () => {
      const payload: GitHubIssuePayload = {
        errorName: 'ReferenceError',
        errorMessage: 'hasActiveStudioData is not defined',
      };
      expect(buildIssueTitle(payload)).toBe(
        '[User Bug]: ReferenceError: hasActiveStudioData is not defined'
      );
    });

    it('does not duplicate errorName if errorMessage already starts with it', () => {
      const payload: GitHubIssuePayload = {
        errorName: 'ReferenceError',
        errorMessage: 'ReferenceError: hasActiveStudioData is not defined',
      };
      expect(buildIssueTitle(payload)).toBe(
        '[User Bug]: ReferenceError: hasActiveStudioData is not defined'
      );
    });

    it('truncates title to 80 characters max for the message portion', () => {
      const longMessage = 'A'.repeat(120);
      const payload: GitHubIssuePayload = {
        errorMessage: longMessage,
      };
      const title = buildIssueTitle(payload);
      expect(title.startsWith('[User Bug]: ')).toBe(true);
      expect(title.length).toBeLessThanOrEqual(12 + 80);
    });
  });

  describe('buildIssueBody', () => {
    it('includes Error Type and Error Code / Digest in Context & Environment table', () => {
      const payload: GitHubIssuePayload = {
        errorName: 'ReferenceError',
        errorCode: 'DIGEST_12345',
        errorMessage: 'hasActiveStudioData is not defined',
        pageUrl: 'http://localhost:3000/portfolio-settings/test-data-studio',
        severity: 'high',
        userEmail: 'dev@workwayz.com',
      };

      const body = buildIssueBody(payload);

      expect(body).toContain('| **Error Type** | `ReferenceError` |');
      expect(body).toContain('| **Error Code / Digest** | `DIGEST_12345` |');
      expect(body).toContain('| **Page URL** | `http://localhost:3000/portfolio-settings/test-data-studio` |');
      expect(body).toContain('| **Reported By** | `dev@workwayz.com` |');
    });

    it('displays the full error code and stack trace directly without collapsed details tag', () => {
      const errorStack = `ReferenceError: hasActiveStudioData is not defined
    at TestDataStudioPage (webpack-internal:///(app-pages-browser)/./src/app/(app)/portfolio-settings/test-data-studio/page.tsx:539:29)
    at Object.react_stack_bottom_frame (test.js:1:1)`;

      const payload: GitHubIssuePayload = {
        errorName: 'ReferenceError',
        errorMessage: 'hasActiveStudioData is not defined',
        errorStack,
      };

      const body = buildIssueBody(payload);

      // Stack trace must NOT be hidden in collapsed <details> tag
      expect(body).not.toContain('<details>');
      expect(body).not.toContain('<summary>');

      // Stack trace must be visible in "Full Error Code & Call Stack" section
      expect(body).toContain('### 🔍 Full Error Code & Call Stack');
      expect(body).toContain('ReferenceError: hasActiveStudioData is not defined');
      expect(body).toContain('page.tsx:539:29');
    });

    it('includes React component stack when provided', () => {
      const payload: GitHubIssuePayload = {
        errorMessage: 'Component failure',
        componentStack: '\n    at TestDataStudioPage\n    at Layout\n    at App',
      };

      const body = buildIssueBody(payload);

      expect(body).toContain('### 🧩 React Component Stack');
      expect(body).toContain('at TestDataStudioPage');
      expect(body).toContain('at Layout');
    });

    it('falls back gracefully when no stack trace is available', () => {
      const payload: GitHubIssuePayload = {
        errorName: 'TypeError',
        errorMessage: 'Cannot read properties of undefined',
      };

      const body = buildIssueBody(payload);

      expect(body).toContain('### 🔍 Full Error Code & Call Stack');
      expect(body).toContain('TypeError: Cannot read properties of undefined');
    });
  });

  describe('createGitHubIssue', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.GITHUB_TOKEN;
    });

    afterEach(() => {
      process.env = originalEnv;
      vi.restoreAllMocks();
    });

    it('returns error when GITHUB_TOKEN is not configured', async () => {
      const result = await createGitHubIssue({
        errorMessage: 'Test error',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('GITHUB_TOKEN');
    });
  });
});
