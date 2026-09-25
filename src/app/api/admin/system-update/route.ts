import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { getSystemConfig, saveSystemConfig, getServerDiagnostics } from '@/lib/server-environment';
import { pipeline } from 'stream/promises';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // Allow long downloads

export async function GET(request: Request) {
  try {
    const config = getSystemConfig();
    const diagnostics = getServerDiagnostics();
    let currentVersion = '0.1.0';
    try {
      const pkgPath = path.join(process.cwd(), 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      currentVersion = pkg.version || '0.1.0';
    } catch (e) {
      console.warn('Could not parse package.json for version');
    }

    // Mask token for UI
    const maskedConfig = {
      ...config,
      githubToken: config.githubToken ? '*'.repeat(config.githubToken.length - 4) + config.githubToken.slice(-4) : '',
      hasToken: !!config.githubToken
    };

    let lastError = null;
    const errorLogPath = path.join(process.cwd(), 'data', 'update_error.log');
    if (fs.existsSync(errorLogPath)) {
      lastError = fs.readFileSync(errorLogPath, 'utf-8');
    }

    return NextResponse.json({
      config: maskedConfig,
      diagnostics,
      currentVersion,
      lastError
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'apply';

    if (action === 'save-config') {
      const updates = { ...body.config };
      if (updates.githubToken && updates.githubToken.startsWith('***')) {
        delete updates.githubToken;
      }
      const newConfig = saveSystemConfig(updates);
      return NextResponse.json({ success: true, message: 'Configuration saved', config: newConfig });
    }

    const config = getSystemConfig();
    const isDocker = fs.existsSync('/.dockerenv') || process.env.FORCE_DOCKER_MODE === 'true';

    const parseSemVer = (ver: string): [number, number, number] | null => {
      const match = ver.trim().replace(/^v/i, '').match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
      if (!match) return null;
      return [
        parseInt(match[1] || '0', 10),
        parseInt(match[2] || '0', 10),
        parseInt(match[3] || '0', 10)
      ];
    };

    const compareSemVer = (a: string, b: string): number => {
      const vA = parseSemVer(a);
      const vB = parseSemVer(b);
      if (!vA && !vB) return 0;
      if (!vA) return -1;
      if (!vB) return 1;
      if (vA[0] !== vB[0]) return vA[0] - vB[0];
      if (vA[1] !== vB[1]) return vA[1] - vB[1];
      return vA[2] - vB[2];
    };


    if (action === 'check') {
      if (isDocker) {
        // Fetch from Docker Hub API
        let repo = (config.githubRepo || 'ramancnair/projectflow').trim();
        if (!repo.includes('/')) {
          repo = `library/${repo}`;
        }
        const res = await fetch(`https://hub.docker.com/v2/repositories/${repo}/tags?page_size=15`);
        if (!res.ok) {
          if (res.status === 404) return NextResponse.json({ error: `Docker Hub repository "${repo}" not found` }, { status: 404 });
          return NextResponse.json({ error: `Docker Hub API Error: ${res.statusText}` }, { status: res.status });
        }

        const data = await res.json();
        const validTags = (data.results || [])
          .filter((t: any) => t.name !== 'latest' && /^v?\d+(\.\d+)*$/i.test(t.name))
          .sort((a: any, b: any) => compareSemVer(b.name, a.name)); // Descending order

        const latestTag = validTags.length > 0 ? validTags[0] : null;

        const availableReleases = latestTag ? [{
          tagName: latestTag.name,
          name: `Docker Image ${latestTag.name}`,
          publishedAt: latestTag.last_updated,
          body: `Docker Hub Release\nRepository: ${repo}\nTag: ${latestTag.name}\nSize: ${(latestTag.full_size / 1024 / 1024).toFixed(2)} MB`,
          asset: {
            name: `docker-image-${latestTag.name}`,
            size: latestTag.full_size || 0,
            downloadUrl: `docker compose pull`
          }
        }] : [];

        return NextResponse.json({ releases: availableReleases });
      } else {
        // Fetch from NPM Registry (Standalone)
        const npmPackageName = (config.npmPackage || '@ramancnair/projectflow').trim();
        const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(npmPackageName)}`);
        
        if (!res.ok) {
          if (res.status === 404) {
            return NextResponse.json({ 
              error: `NPM package "${npmPackageName}" not found on public registry yet. It will appear once your first release is published.` 
            }, { status: 404 });
          }
          return NextResponse.json({ error: `NPM API Error: ${res.statusText}` }, { status: res.status });
        }

        const data = await res.json();
        const versions = Object.keys(data.versions || {})
          .filter(v => /^v?\d+(\.\d+)*$/i.test(v))
          .sort((a, b) => compareSemVer(b, a));
        
        const latestVersion = versions.length > 0 ? versions[0] : null;
        
        let availableReleases = [];
        if (latestVersion) {
          const versionData = data.versions[latestVersion];
          const cleanVersion = latestVersion.replace(/^v/, '');
          availableReleases.push({
            tagName: `v${cleanVersion}`,
            name: `Standalone Update v${cleanVersion}`,
            publishedAt: data.time?.[latestVersion] || new Date().toISOString(),
            body: `NPM Release: ${versionData.name}@${cleanVersion}\nUnpack and hot-swap standalone binaries.`,
            asset: {
              name: `${versionData.name?.replace('/', '-')}-${cleanVersion}.tgz`,
              size: 0,
              downloadUrl: versionData.dist?.tarball
            }
          });
        }

        return NextResponse.json({ releases: availableReleases });
      }
    }

    if (action === 'apply') {
      // Backend Safety Guard: Never run in-app apply for Docker deployments
      if (isDocker) {
        return NextResponse.json({ 
          error: 'In-app automated apply is disabled for Docker deployments. Please run the Docker recreate commands shown in the UI on your host terminal.' 
        }, { status: 400 });
      }

      const { downloadUrl } = body;
      if (!downloadUrl) return NextResponse.json({ error: 'Missing downloadUrl' }, { status: 400 });

      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

      const updateTarballPath = path.join(dataDir, 'update.tgz');
      
      console.log(`Downloading standalone update from ${downloadUrl}...`);
      const response = await fetch(downloadUrl, { redirect: 'follow' });
      
      if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
      if (!response.body) throw new Error(`Download failed: empty response body`);

      // Write stream to update.tgz
      const fileStream = fs.createWriteStream(updateTarballPath);
      // @ts-ignore
      await pipeline(response.body, fileStream);
      
      // Clear previous error logs
      const errorLogPath = path.join(dataDir, 'update_error.log');
      if (fs.existsSync(errorLogPath)) fs.unlinkSync(errorLogPath);

      // Trigger Maintenance Mode
      const maintenanceFile = path.join(dataDir, '.maintenance');
      fs.writeFileSync(maintenanceFile, 'maintenance');

      // Spawn detached updater.js
      const updaterScript = path.join(process.cwd(), 'scripts', 'updater.js');
      
      const child = spawn(process.execPath, [updaterScript, '--server-pid', process.pid.toString(), '--cwd', process.cwd()], {
        detached: true,
        stdio: 'ignore',
        cwd: process.cwd()
      });
      child.unref();

      return NextResponse.json({ success: true, message: 'Update downloaded. System transitioning to maintenance.' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Update API failed:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
