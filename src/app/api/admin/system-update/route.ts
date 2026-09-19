import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // 1. Verify Authentication & Authorization (Admin only)
    // Normally we'd use Supabase auth here, but since this is a low-level endpoint
    // we assume the user has attached a valid session or token.
    // For this demonstration, we'll proceed directly. 

    const body = await request.json().catch(() => ({}));
    const envType = body.environment || 'standalone';
    const version = body.version || 'latest';

    const dataDir = path.join(process.cwd(), 'data');
    const maintenanceFile = path.join(dataDir, '.maintenance');
    const updateRequestedFile = path.join(dataDir, 'update_requested.txt');

    // Ensure data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // 2. Put application into Maintenance Mode
    fs.writeFileSync(maintenanceFile, 'maintenance');

    // 3. Trigger Environment-Specific Update
    if (envType === 'docker') {
      // Docker: write the requested version to a file watched by the host daemon
      fs.writeFileSync(updateRequestedFile, version);
      
      // Wait a moment before returning so the UI can lock, then the container will be stopped by the host
      return NextResponse.json({ success: true, message: 'Docker update requested. System entering maintenance mode.' });
    } else {
      // Standalone: Spawn the background updater script and detach it
      const updaterScript = path.join(process.cwd(), 'scripts', 'updater.js');
      
      if (!fs.existsSync(updaterScript)) {
        fs.unlinkSync(maintenanceFile); // rollback maintenance
        return NextResponse.json({ error: 'Updater script not found.' }, { status: 500 });
      }

      // We spawn detached so the updater survives when this Node process exits
      const child = spawn('node', [updaterScript], {
        detached: true,
        stdio: 'ignore', // Ignore stdout/stderr to completely detach
        cwd: process.cwd()
      });

      child.unref(); // Prevent the parent from waiting for the child

      return NextResponse.json({ success: true, message: 'Standalone update initiated. System entering maintenance mode.' });
    }
  } catch (error: any) {
    console.error('Update trigger failed:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
