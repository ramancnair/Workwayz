import { NextResponse } from 'next/server';
import { getAppVersion, detectDeploymentType, compareSemver } from '@/lib/version-utils';

interface VersionCache {
  latestVersion: string;
  publishedAt: string | null;
  checkedAt: number;
}

let versionCache: VersionCache | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

async function fetchLatestFromNpm(forceRefresh = false): Promise<{
  latestVersion: string | null;
  publishedAt: string | null;
  isOffline: boolean;
}> {
  const now = Date.now();
  if (!forceRefresh && versionCache && now - versionCache.checkedAt < CACHE_TTL_MS) {
    return {
      latestVersion: versionCache.latestVersion,
      publishedAt: versionCache.publishedAt,
      isOffline: false,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch('https://registry.npmjs.org/workwayz', {
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Registry returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const latestVersion = data['dist-tags']?.latest || null;
    const publishedAt = (latestVersion && data.time?.[latestVersion]) || null;

    if (latestVersion) {
      versionCache = {
        latestVersion,
        publishedAt,
        checkedAt: now,
      };
    }

    return {
      latestVersion,
      publishedAt,
      isOffline: false,
    };
  } catch (error) {
    // If not a forced refresh and cache exists from earlier, serve stale on network error
    if (!forceRefresh && versionCache) {
      return {
        latestVersion: versionCache.latestVersion,
        publishedAt: versionCache.publishedAt,
        isOffline: false,
      };
    }

    return {
      latestVersion: null,
      publishedAt: null,
      isOffline: true,
    };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';

  const currentVersion = getAppVersion();
  const deploymentType = detectDeploymentType();
  const { latestVersion, publishedAt, isOffline } = await fetchLatestFromNpm(force);

  const hasUpdate = Boolean(latestVersion && compareSemver(latestVersion, currentVersion) > 0);

  return NextResponse.json({
    currentVersion,
    latestVersion,
    hasUpdate,
    publishedAt,
    releaseUrl: 'https://github.com/ramancnair/Workwayz/releases',
    npmUrl: 'https://www.npmjs.com/package/workwayz',
    dockerHubUrl: 'https://hub.docker.com/r/workwayz/workwayz',
    deploymentType,
    nodeVersion: typeof process !== 'undefined' ? process.version : 'unknown',
    platform: typeof process !== 'undefined' ? process.platform : 'unknown',
    checkedAt: new Date().toISOString(),
    isOffline,
  });
}

export async function POST() {
  // Invalidate cache and fetch fresh
  versionCache = null;
  const currentVersion = getAppVersion();
  const deploymentType = detectDeploymentType();
  const { latestVersion, publishedAt, isOffline } = await fetchLatestFromNpm(true);

  const hasUpdate = Boolean(latestVersion && compareSemver(latestVersion, currentVersion) > 0);

  return NextResponse.json({
    currentVersion,
    latestVersion,
    hasUpdate,
    publishedAt,
    releaseUrl: 'https://github.com/ramancnair/Workwayz/releases',
    npmUrl: 'https://www.npmjs.com/package/workwayz',
    dockerHubUrl: 'https://hub.docker.com/r/workwayz/workwayz',
    deploymentType,
    nodeVersion: typeof process !== 'undefined' ? process.version : 'unknown',
    platform: typeof process !== 'undefined' ? process.platform : 'unknown',
    checkedAt: new Date().toISOString(),
    isOffline,
  });
}
