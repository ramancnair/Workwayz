import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const getProfilesPath = () => path.join(process.cwd(), 'connections.json');

const autoSeedFromEnv = (conns: any): boolean => {
    let changed = false;
    let envPath = path.join(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
        envPath = path.join(process.cwd(), '.env');
        if (!fs.existsSync(envPath)) return false;
    }

    const envMap = new Map<string, string>();
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    lines.forEach(line => {
        if (!line || !line.includes('=')) return;
        const idx = line.indexOf('=');
        envMap.set(line.substring(0, idx).trim(), line.substring(idx + 1).trim().replace(/^"/, '').replace(/"$/, ''));
    });

    if (envMap.size === 0) return false;

    if (!conns.database || conns.database.length === 0) {
        let dbProvider = envMap.get('NEXT_PUBLIC_DB_PROVIDER') || envMap.get('NEXT_PUBLIC_DATABASE_PROVIDER') || (envMap.get('NEXT_PUBLIC_SUPABASE_URL') ? 'supabase' : (envMap.get('NEXT_PUBLIC_FIREBASE_PROJECT_ID') ? 'firebase' : null));
        if (dbProvider) {
            const db: any = { id: crypto.randomUUID(), profileName: 'Primary .env Connection', provider: dbProvider, isActive: true };
            if (dbProvider === 'firebase') {
                db.projectId = envMap.get('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
                db.apiKey = envMap.get('NEXT_PUBLIC_FIREBASE_API_KEY');
                db.authDomain = envMap.get('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
                db.storageBucket = envMap.get('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
                db.messagingSenderId = envMap.get('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
                db.appId = envMap.get('NEXT_PUBLIC_FIREBASE_APP_ID');
            } else if (dbProvider === 'supabase') {
                db.supabaseUrl = envMap.get('NEXT_PUBLIC_SUPABASE_URL');
                db.supabaseAnonKey = envMap.get('NEXT_PUBLIC_SUPABASE_ANON_KEY');
            }
            conns.database = [db];
            changed = true;
        }
    }

    if (!conns.ai || conns.ai.length === 0) {
        let aiProvider = envMap.get('NEXT_PUBLIC_AI_PROVIDER') || (envMap.get('GEMINI_API_KEY') ? 'google' : null);
        if (aiProvider) {
            const ai: any = { id: crypto.randomUUID(), profileName: 'Primary .env GenAI', provider: aiProvider, isActive: true };
            if (aiProvider === 'google') ai.apiKey = envMap.get('GEMINI_API_KEY');
            else if (aiProvider === 'openai') ai.apiKey = envMap.get('OPENAI_API_KEY');
            else if (aiProvider === 'anthropic') ai.apiKey = envMap.get('ANTHROPIC_API_KEY');
            else if (['lmstudio', 'ollama'].includes(aiProvider)) ai.baseUrl = envMap.get('LOCAL_AI_BASE_URL');
            
            if (envMap.get('AI_DEFAULT_MODEL')) ai.model = envMap.get('AI_DEFAULT_MODEL');
            conns.ai = [ai];
            changed = true;
        }
    }

    if (!conns.authentication || conns.authentication.length === 0) {
        let authProvider = envMap.get('NEXT_PUBLIC_AUTH_PROVIDER') || (envMap.get('NEXT_PUBLIC_SUPABASE_URL') ? 'supabase' : 'firebase');
        const auth: any = { 
             id: crypto.randomUUID(), 
             profileName: 'Primary .env Auth', 
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

const getConnections = () => {
    const p = getProfilesPath();
    let conns: any = { database: [], ai: [], authentication: [] };
    if (fs.existsSync(p)) {
        try {
            conns = JSON.parse(fs.readFileSync(p, 'utf8'));
        } catch (e) { }
    }
    
    // Auto-seed existing variables if arrays are empty so they appear on UI
    if (autoSeedFromEnv(conns)) {
        saveConnections(conns);
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
        const { type, profile } = body;

        if (!profile.id) {
            profile.id = crypto.randomUUID();
        }

        const conns: any = getConnections();
        if (!conns[type]) conns[type] = [];

        const idx = conns[type].findIndex((p: any) => p.id === profile.id);
        if (idx >= 0) {
            const existing = conns[type][idx];
            if (type === 'database') {
                if (profile.apiKey && profile.apiKey.includes('****')) profile.apiKey = existing.apiKey;
                if (profile.supabaseAnonKey && profile.supabaseAnonKey.includes('****')) profile.supabaseAnonKey = existing.supabaseAnonKey;
                if (profile.connectionString && profile.connectionString.includes('****')) profile.connectionString = existing.connectionString;
            } else {
                if (profile.apiKey && profile.apiKey.includes('****')) profile.apiKey = existing.apiKey;
            }
            conns[type][idx] = { ...existing, ...profile };
        } else {
            conns[type].push(profile);
        }

        saveConnections(conns);
        return NextResponse.json({ success: true, profile: maskProfile(conns[type].find((p: any) => p.id === profile.id), type) });
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
            conns[type] = conns[type].filter((p: any) => p.id !== id);
            saveConnections(conns);
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    }
}
