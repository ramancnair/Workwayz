import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AboutPage from '../page';

// Mock useAppVersion
vi.mock('@/hooks/use-app-version', () => ({
  useAppVersion: vi.fn(() => ({
    versionInfo: {
      currentVersion: '1.0.2',
      latestVersion: '1.0.2',
      hasUpdate: false,
      publishedAt: '2026-11-05T00:00:00.000Z',
      releaseUrl: 'https://github.com/ramancnair/Workwayz/releases',
      npmUrl: 'https://www.npmjs.com/package/workwayz',
      dockerHubUrl: 'https://hub.docker.com/r/workwayz/workwayz',
      deploymentType: 'npm',
      nodeVersion: 'v22.14.0',
      platform: 'win32',
      checkedAt: '2026-11-05T12:00:00.000Z',
      isOffline: false,
    },
    isChecking: false,
    error: null,
    checkNow: vi.fn(),
  })),
}));

describe('AboutPage', () => {
  it('renders application branding, title, and current version', () => {
    render(<AboutPage />);

    expect(screen.getByText('About Workwayz')).toBeDefined();
    expect(screen.getByText('v1.0.2')).toBeDefined();
    expect(screen.getByText('Check for Updates')).toBeDefined();
    expect(screen.getByText('System Diagnostics')).toBeDefined();
    expect(screen.getByText('Resources & Registries')).toBeDefined();
    expect(screen.getByText('You are running the latest version of Workwayz')).toBeDefined();
  });

  it('renders links to GitHub, NPM, and Docker Hub', () => {
    render(<AboutPage />);

    expect(screen.getByText('GitHub Repository')).toBeDefined();
    expect(screen.getByText('NPM Registry')).toBeDefined();
    expect(screen.getByText('Docker Hub Container')).toBeDefined();
  });
});

