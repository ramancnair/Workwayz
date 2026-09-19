import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const maintenanceFile = path.join(dataDir, '.maintenance');

    if (fs.existsSync(maintenanceFile)) {
      return NextResponse.json({ status: 'maintenance' }, { status: 503 });
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
