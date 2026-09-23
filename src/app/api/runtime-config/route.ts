import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getConnectionsPath } from '@/lib/config-path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// This endpoint is called by the client to get runtime config.
// It reads .env.local or .env server-side (works after container restart)
// and returns only the SAFE PUBLIC values needed for client-side initialization.
export function getServerRuntimeConfig() {
    const envMap = new Map<string, string>();

    // 1. Read .env.local or .env
    const cwd = process.cwd();
    const envCandidates = [
        path.join(cwd, '.env.local'),
        path.join(cwd, '.env'),
    ];

    for (const p of envCandidates) {
        if (fs.existsSync(p)) {
            try {
                const lines = fs.readFileSync(p, 'utf8').split('\n');
                lines.forEach(line => {
                    if (!line || !line.includes('=')) return;
                    const idx = line.indexOf('=');
                    const key = line.substring(0, idx).trim();
                    const val = line.substring(idx + 1).trim().replace(/^"/, '').replace(/"$/, '');
                    if (key && !envMap.has(key)) envMap.set(key, val);
                });
            } catch {}
        }
    }

    // 2. Read connections.json if present
    let connsDb: any = null;
    let connsAuth: any = null;
    let connsAi: any = null;
    try {
        const connsPath = getConnectionsPath();
        if (fs.existsSync(connsPath)) {
            const conns = JSON.parse(fs.readFileSync(connsPath, 'utf8'));
            connsDb = conns.database?.find((p: any) => p.isActive) || conns.database?.[0];
            connsAuth = conns.authentication?.find((p: any) => p.isActive) || conns.authentication?.[0];
            connsAi = conns.ai?.find((p: any) => p.isActive) || conns.ai?.[0];
        }
    } catch {}

    const dbProvider =
        envMap.get('NEXT_PUBLIC_DB_PROVIDER') ||
        envMap.get('NEXT_PUBLIC_DATABASE_PROVIDER') ||
        connsDb?.provider ||
        (connsDb?.supabaseUrl ? 'supabase' : null) ||
        (envMap.get('NEXT_PUBLIC_SUPABASE_URL') ? 'supabase' : null) ||
        process.env.NEXT_PUBLIC_DB_PROVIDER ||
        process.env.NEXT_PUBLIC_DATABASE_PROVIDER ||
        'supabase';

    const authProvider =
        envMap.get('NEXT_PUBLIC_AUTH_PROVIDER') ||
        connsAuth?.provider ||
        dbProvider ||
        'supabase';

    const supabaseUrl =
        envMap.get('NEXT_PUBLIC_SUPABASE_URL') ||
        connsDb?.supabaseUrl ||
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
        null;

    const supabaseAnonKey =
        envMap.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
        connsDb?.supabaseAnonKey ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        null;

    const firebaseProjectId =
        envMap.get('NEXT_PUBLIC_FIREBASE_PROJECT_ID') ||
        connsDb?.projectId ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
        null;

    const firebaseApiKey =
        envMap.get('NEXT_PUBLIC_FIREBASE_API_KEY') ||
        connsDb?.apiKey ||
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
        null;

    const firebaseAuthDomain =
        envMap.get('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN') ||
        connsDb?.authDomain ||
        (firebaseProjectId ? `${firebaseProjectId}.firebaseapp.com` : null) ||
        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
        null;

    const firebaseAppId =
        envMap.get('NEXT_PUBLIC_FIREBASE_APP_ID') ||
        connsDb?.appId ||
        process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
        null;

    const aiProvider =
        envMap.get('NEXT_PUBLIC_AI_PROVIDER') ||
        connsAi?.provider ||
        process.env.NEXT_PUBLIC_AI_PROVIDER ||
        null;

    return {
        dbProvider,
        authProvider,
        supabaseUrl,
        supabaseAnonKey,
        firebaseProjectId,
        firebaseApiKey,
        firebaseAuthDomain,
        firebaseAppId,
        aiProvider,
    };
}

export async function GET() {
    try {
        const config = getServerRuntimeConfig();
        return NextResponse.json(config);
    } catch (e) {
        return NextResponse.json({}, { status: 500 });
    }
}
