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
    const currentVersion = require('../../../../../package.json').version || '1.0.0';

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
      // Don't save if it's masked
      const updates = { ...body.config };
      if (updates.githubToken && updates.githubToken.startsWith('***')) {
        delete updates.githubToken;
      }
      const newConfig = saveSystemConfig(updates);
      return NextResponse.json({ success: true, message: 'Configuration saved' });
    }

    if (action === 'check') {
      const config = getSystemConfig();
      if (!config.githubRepo) return NextResponse.json({ error: 'GitHub Repo not configured' }, { status: 400 });

      const headers: any = {
        'User-Agent': 'ProjectFlow-Updater',
        'Accept': 'application/vnd.github.v3+json'
      };
      if (config.githubToken) {
        headers['Authorization'] = `token ${config.githubToken}`;
      }

      const res = await fetch(`https://api.github.com/repos/${config.githubRepo}/releases`, { headers });
      if (!res.ok) {
        if (res.status === 404) return NextResponse.json({ error: 'Releases not found or private repo missing token' }, { status: 404 });
        return NextResponse.json({ error: `GitHub API Error: ${res.statusText}` }, { status: res.status });
      }

      const releasesData = await res.json();
      
      const availableReleases = releasesData
        .map((data: any) => {
          const standaloneAsset = data.assets?.find((a: any) => a.name.includes('standalone') && a.name.endsWith('.zip'));
          if (!standaloneAsset) return null;
          return {
            tagName: data.tag_name,
            name: data.name,
            publishedAt: data.published_at,
            body: data.body,
            asset: {
              name: standaloneAsset.name,
              size: standaloneAsset.size,
              downloadUrl: standaloneAsset.url
            }
          };
        })
        .filter(Boolean);

      return NextResponse.json({
        releases: availableReleases
      });
    }

    if (action === 'apply') {
      const { downloadUrl } = body;
      if (!downloadUrl) return NextResponse.json({ error: 'Missing downloadUrl' }, { status: 400 });

      const config = getSystemConfig();
      const headers: any = {
        'User-Agent': 'ProjectFlow-Updater',
        'Accept': 'application/octet-stream'
      };
      if (config.githubToken) {
        headers['Authorization'] = `token ${config.githubToken}`;
      }

      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

      const updateZipPath = path.join(dataDir, 'update.zip');
      
      // Download file stream
      console.log(`Downloading update from ${downloadUrl}`);
      const response = await fetch(downloadUrl, { headers, redirect: 'follow' });
      
      if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
      if (!response.body) throw new Error(`Download failed: no body`);

      // Write stream to file
      const fileStream = fs.createWriteStream(updateZipPath);
      // @ts-ignore
      await pipeline(response.body, fileStream);
      
      // File downloaded, clear error logs
      const errorLogPath = path.join(dataDir, 'update_error.log');
      if (fs.existsSync(errorLogPath)) fs.unlinkSync(errorLogPath);

      // Trigger Maintenance and Spawn Updater
      const maintenanceFile = path.join(dataDir, '.maintenance');
      fs.writeFileSync(maintenanceFile, 'maintenance');

      const updaterScript = path.join(process.cwd(), 'scripts', 'updater.js');
      const child = spawn('node', [updaterScript, '--server-pid', process.pid.toString(), '--cwd', process.cwd()], {
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
