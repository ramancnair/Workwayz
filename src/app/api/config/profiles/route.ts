import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { syncConnectionsToEnv } from '@/lib/config-sync';
import { getProfilesPath, getEnvPath } from '@/lib/config-paths';

const autoSeedFromEnv = (conns: any): boolean => {
    let changed = false;
    const envPath = getEnvPath();
    const envMap = new Map<string, string>();

    if (fs.existsSync(envPath)) {
        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        lines.forEach(line => {
            if (!line || !line.includes('=')) return;
            const idx = line.indexOf('=');
            envMap.set(line.substring(0, idx).trim(), line.substring(idx + 1).trim().replace(/^"/, '').replace(/"$/, ''));
        });
    }

    const getVal = (key: string): string | undefined => envMap.get(key) || process.env[key];

    if (!conns.database || conns.database.length === 0) {
        let dbProvider = getVal('NEXT_PUBLIC_DB_PROVIDER') || getVal('NEXT_PUBLIC_DATABASE_PROVIDER') ||
            (getVal('NEXT_PUBLIC_SUPABASE_URL') ? 'supabase' : (getVal('NEXT_PUBLIC_FIREBASE_PROJECT_ID') ? 'firebase' : null));
        if (dbProvider) {
            const db: any = {
                id: crypto.randomUUID(),
                profileName: dbProvider === 'local' ? 'Embedded Local Database' : 'Primary Database Connection',
                provider: dbProvider,
                isActive: true
            };
            if (dbProvider === 'firebase') {
                db.projectId = getVal('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
                db.apiKey = getVal('NEXT_PUBLIC_FIREBASE_API_KEY');
                db.authDomain = getVal('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
                db.storageBucket = getVal('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
                db.messagingSenderId = getVal('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
                db.appId = getVal('NEXT_PUBLIC_FIREBASE_APP_ID');
            } else if (dbProvider === 'supabase') {
                db.supabaseUrl = getVal('NEXT_PUBLIC_SUPABASE_URL');
                db.supabaseAnonKey = getVal('NEXT_PUBLIC_SUPABASE_ANON_KEY');
            }
            conns.database = [db];
            changed = true;
        }
    }

    if (!conns.ai || conns.ai.length === 0) {
        let aiProvider = getVal('NEXT_PUBLIC_AI_PROVIDER') || (getVal('GEMINI_API_KEY') ? 'google' : null);
        if (aiProvider) {
            const ai: any = { id: crypto.randomUUID(), profileName: 'Primary GenAI', provider: aiProvider, isActive: true };
            if (aiProvider === 'google') ai.apiKey = getVal('GEMINI_API_KEY');
            else if (aiProvider === 'openai') ai.apiKey = getVal('OPENAI_API_KEY');
            else if (aiProvider === 'anthropic') ai.apiKey = getVal('ANTHROPIC_API_KEY');
            else if (['lmstudio', 'ollama'].includes(aiProvider)) ai.baseUrl = getVal('LOCAL_AI_BASE_URL');

            if (getVal('AI_DEFAULT_MODEL')) ai.model = getVal('AI_DEFAULT_MODEL');
            conns.ai = [ai];
            changed = true;
        }
    }

    if (!conns.authentication || conns.authentication.length === 0) {
        let authProvider = getVal('NEXT_PUBLIC_AUTH_PROVIDER') ||
            (getVal('NEXT_PUBLIC_SUPABASE_URL') ? 'supabase' : (getVal('NEXT_PUBLIC_FIREBASE_PROJECT_ID') ? 'firebase' : null));
        const auth: any = {
            id: crypto.randomUUID(),
            profileName: authProvider === 'local' ? 'Local Embedded Authentication' : 'Primary Auth',
            provider: authProvider,
            googleSso: false,
            facebookSso: false,
            appleSso: false,
            isActive: true
        };
        conns.authentication = [auth];
        changed = true;
    }

    return changed;
};

const getConnections = (): any => {
    let conns: any = { database: [], ai: [], authentication: [] };
    const p = getProfilesPath();
    if (fs.existsSync(p)) {
        try {
            conns = JSON.parse(fs.readFileSync(p, 'utf8'));
        } catch (e) { }
    }

    // Auto-seed existing variables if arrays are empty so they appear on UI
    if (autoSeedFromEnv(conns)) {
        try {
            saveConnections(conns);
        } catch (_) {}
    }

    return conns;
};

const saveConnections = (data: any) => {
    fs.writeFileSync(getProfilesPath(), JSON.stringify(data, null, 2), 'utf8');
};

function maskKey(val: string | undefined) {
    if (!val) return val;
    val = val.replace(/^"/, '').replace(/"$/, '');
    if (val.length < 8) return '****';
    return val.substring(0, 4) + '****' + val.substring(val.length - 4);
}

function maskProfile(profile: any, type: 'database' | 'ai') {
    const p = { ...profile };
    if (type === 'database') {
        if (p.apiKey) p.apiKey = maskKey(p.apiKey);
        if (p.supabaseAnonKey) p.supabaseAnonKey = maskKey(p.supabaseAnonKey);
        if (p.connectionString) p.connectionString = maskKey(p.connectionString);
    } else {
        if (p.apiKey) p.apiKey = maskKey(p.apiKey);
    }
    return p;
}

export async function GET() {
    try {
        const conns = getConnections();
        const maskedDb = (conns.database || []).map((p: any) => maskProfile(p, 'database'));
        const maskedAi = (conns.ai || []).map((p: any) => maskProfile(p, 'ai'));
        const auth = (conns.authentication || []);
        return NextResponse.json({ database: maskedDb, ai: maskedAi, authentication: auth });
    } catch (e) {
        return NextResponse.json({ database: [], ai: [], authentication: [] });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const conns: any = getConnections();

        const items: Array<{ type: string; profile: any }> = Array.isArray(body.batch)
            ? body.batch
            : (body.type && body.profile ? [{ type: body.type, profile: body.profile }] : []);

        if (items.length === 0) {
            return NextResponse.json({ success: false, error: 'No profile data provided' }, { status: 400 });
        }

        let lastSavedProfile: any = null;
        let lastType: string = '';

        for (const item of items) {
            const { type, profile } = item;
            if (!['database', 'ai', 'authentication'].includes(type) || !profile) {
                continue;
            }

            if (!conns[type]) conns[type] = [];

            if (!profile.id) profile.id = crypto.randomUUID();

            const existingIdx = conns[type].findIndex((p: any) => p.id === profile.id);
            const idx = existingIdx >= 0 ? existingIdx : conns[type].findIndex((p: any) => p.profileName === profile.profileName);

            const shouldBeActive = profile.isActive === true;

            if (idx >= 0) {
                const existing = conns[type][idx];
                if (type === 'database') {
                    if (existing.provider === 'firebase') {
                        if (!profile.apiKey || profile.apiKey.includes('****')) profile.apiKey = existing.apiKey;
                    } else if (existing.provider === 'supabase' || existing.provider === 'postgres') {
                        if (!profile.apiKey || profile.apiKey.includes('****')) profile.apiKey = existing.apiKey;
                        if (profile.supabaseAnonKey && profile.supabaseAnonKey.includes('****')) profile.supabaseAnonKey = existing.supabaseAnonKey;
                        if (profile.connectionString && profile.connectionString.includes('****')) profile.connectionString = existing.connectionString;
                    }
                } else {
                    if (!profile.apiKey || profile.apiKey.includes('****')) profile.apiKey = existing.apiKey;
                }
                conns[type][idx] = { ...existing, ...profile };
            } else {
                conns[type].push(profile);
            }

            if (shouldBeActive) {
                conns[type].forEach((p: any) => {
                    p.isActive = (p.id === profile.id);
                });
            }

            lastSavedProfile = conns[type].find((p: any) => p.id === profile.id);
            lastType = type;
        }

        saveConnections(conns);
        syncConnectionsToEnv(conns);

        const masked = lastSavedProfile && (lastType === 'database' || lastType === 'ai')
            ? maskProfile(lastSavedProfile, lastType as any)
            : lastSavedProfile;

        return NextResponse.json({ success: true, profile: masked });
    } catch (e) {
        console.error('Failed to save profile', e);
        return NextResponse.json({ success: false, error: 'Failed to save profile' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') as 'database' | 'ai';
        const id = searchParams.get('id');

        if (!type || !id) return NextResponse.json({ success: false, error: 'Missing type or id' }, { status: 400 });

        const conns: any = getConnections();
        if (conns[type]) {
            const wasActive = conns[type].find((p: any) => p.id === id)?.isActive;
            conns[type] = conns[type].filter((p: any) => p.id !== id);
            if (wasActive && conns[type].length > 0) {
                conns[type][0].isActive = true;
            }
            saveConnections(conns);
            syncConnectionsToEnv(conns);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    }
}
