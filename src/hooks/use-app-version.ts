'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AppVersionInfo {
  currentVersion: string;
  latestVersion: string | null;
  hasUpdate: boolean;
  publishedAt: string | null;
  releaseUrl: string;
  npmUrl: string;
  dockerHubUrl: string;
  deploymentType: 'docker' | 'npm' | 'source';
  nodeVersion: string;
  platform: string;
  checkedAt: string;
  isOffline: boolean;
}

export function useAppVersion() {
  const [versionInfo, setVersionInfo] = useState<AppVersionInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVersion = useCallback(async (force = false) => {
    setIsChecking(true);
    setError(null);
    try {
      const url = force ? '/api/system/version?force=true' : '/api/system/version';
      const res = await fetch(url, {
        method: force ? 'POST' : 'GET',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        throw new Error(`Failed to load version metadata (${res.status})`);
      }
      const json: AppVersionInfo = await res.json();
      setVersionInfo(json);
      return json;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch version metadata';
      setError(msg);
      return null;
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    fetchVersion(false);
  }, [fetchVersion]);

  return {
    versionInfo,
    isChecking,
    error,
    checkNow: () => fetchVersion(true),
  };
}

