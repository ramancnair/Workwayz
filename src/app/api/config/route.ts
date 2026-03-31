import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        // Define path to .env.local
        const envPath = path.join(process.cwd(), '.env.local');
        
        // Read existing .env.local if exists
        let envContent = '';
        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        const lines = envContent.split('\n');
        const envMap = new Map<string, string>();

        lines.forEach(line => {
            if (!line || !line.includes('=')) return;
            const idx = line.indexOf('=');
            const key = line.substring(0, idx).trim();
            const value = line.substring(idx + 1).trim();
            if (key) envMap.set(key, value);
        });

        const type = body.type;
        let payload = body.payload;

        // If activating from a saved profile, resolve the unmasked raw keys from connections.json
        if (body.makeActiveId) {
            const profilesPath = path.join(process.cwd(), 'connections.json');
            if (fs.existsSync(profilesPath)) {
                try {
                    const conns = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
                    if (conns[type]) {
                        const target = conns[type].find((p: any) => p.id === body.makeActiveId);
                        if (target) {
                            payload = target;
                        }
                    }
                } catch (e) {
                     console.error("Failed to parse connections.json during activation", e);
                }
            }
        }

        if (!payload) {
             throw new Error('No configuration payload provided or resolved.');
        }

        // Map incoming body settings to ENV vars based on what they sent
        if (type === 'database') {
            const db = payload;
            if (db.provider === 'firebase') {
                if (db.apiKey) envMap.set('NEXT_PUBLIC_FIREBASE_API_KEY', `"${db.apiKey}"`);
                if (db.authDomain) envMap.set('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', `"${db.authDomain}"`);
                if (db.projectId) envMap.set('NEXT_PUBLIC_FIREBASE_PROJECT_ID', `"${db.projectId}"`);
                if (db.storageBucket) envMap.set('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', `"${db.storageBucket}"`);
                if (db.messagingSenderId) envMap.set('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', `"${db.messagingSenderId}"`);
                if (db.appId) envMap.set('NEXT_PUBLIC_FIREBASE_APP_ID', `"${db.appId}"`);
            } else if (db.provider === 'supabase') {
                if (db.supabaseUrl) envMap.set('NEXT_PUBLIC_SUPABASE_URL', `"${db.supabaseUrl}"`);
                if (db.supabaseAnonKey) envMap.set('NEXT_PUBLIC_SUPABASE_ANON_KEY', `"${db.supabaseAnonKey}"`);
            } else if (['postgresql', 'mysql', 'mongodb'].includes(db.provider)) {
                if (db.connectionString) envMap.set('DATABASE_URL', `"${db.connectionString}"`);
            }
            envMap.set('NEXT_PUBLIC_DATABASE_PROVIDER', `"${db.provider}"`);
        }

        if (type === 'ai') {
            const ai = payload;
            if (['openai', 'anthropic', 'google'].includes(ai.provider)) {
                if (ai.apiKey && ai.provider === 'google') envMap.set('GEMINI_API_KEY', `"${ai.apiKey}"`);
                if (ai.apiKey && ai.provider === 'openai') envMap.set('OPENAI_API_KEY', `"${ai.apiKey}"`);
                if (ai.apiKey && ai.provider === 'anthropic') envMap.set('ANTHROPIC_API_KEY', `"${ai.apiKey}"`);
            } else if (['lmstudio', 'ollama'].includes(ai.provider)) {
                if (ai.baseUrl) envMap.set('LOCAL_AI_BASE_URL', `"${ai.baseUrl}"`);
            }
            if (ai.model) envMap.set('AI_DEFAULT_MODEL', `"${ai.model}"`);
            envMap.set('NEXT_PUBLIC_AI_PROVIDER', `"${ai.provider}"`);
        }

        // Update isActive flags in connections.json if we mapped via an ID
        if (body.makeActiveId) {
             const profilesPath = path.join(process.cwd(), 'connections.json');
             if (fs.existsSync(profilesPath)) {
                 try {
                     const conns = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
                     if (conns[type]) {
                         conns[type].forEach((p: any) => {
                             p.isActive = (p.id === body.makeActiveId);
                         });
                         fs.writeFileSync(profilesPath, JSON.stringify(conns, null, 2), 'utf8');
                     }
                 } catch (e) {
                     // Non fatal
                 }
             }
        }

        // Write back
        let newContent = '';
        envMap.forEach((val, key) => {
            newContent += `${key}=${val}\n`;
        });

        fs.writeFileSync(envPath, newContent, 'utf8');

        return NextResponse.json({ success: true, message: '.env.local updated successfully.' });
    } catch (e) {
        console.error('Failed to write setup config', e);
        return NextResponse.json({ success: false, error: 'Failed to write configuration.' }, { status: 500 });
    }
}

function maskKey(val: string) {
    if (!val) return val;
    val = val.replace(/^"/, '').replace(/"$/, ''); // strip quotes
    if (val.length < 8) return '****';
    return val.substring(0, 4) + '****' + val.substring(val.length - 4);
}

export async function GET() {
    try {
        const envPathLocal = path.join(process.cwd(), '.env.local');
        const envPathBase = path.join(process.cwd(), '.env');
        
        let envContent = '';
        if (fs.existsSync(envPathLocal)) envContent = fs.readFileSync(envPathLocal, 'utf8');
        else if (fs.existsSync(envPathBase)) envContent = fs.readFileSync(envPathBase, 'utf8');

        const envMap = new Map<string, string>();
        envContent.split('\n').forEach(line => {
            if (!line || !line.includes('=')) return;
            const idx = line.indexOf('=');
            envMap.set(line.substring(0, idx).trim(), line.substring(idx + 1).trim());
        });

        // Parse DB
        let dbProvider = envMap.get('NEXT_PUBLIC_DATABASE_PROVIDER')?.replace(/"/g, '');
        if (!dbProvider) {
            if (envMap.get('DATABASE_URL')) dbProvider = 'postgresql';
            else if (envMap.get('NEXT_PUBLIC_FIREBASE_PROJECT_ID')) dbProvider = 'firebase';
        }
        
        let db: any = null;
        if (dbProvider === 'firebase') {
            db = {
                provider: 'firebase',
                projectId: envMap.get('NEXT_PUBLIC_FIREBASE_PROJECT_ID')?.replace(/"/g, ''),
                apiKey: maskKey(envMap.get('NEXT_PUBLIC_FIREBASE_API_KEY') || ''),
            };
        } else if (dbProvider === 'supabase') {
            db = {
                provider: 'supabase',
                supabaseUrl: envMap.get('NEXT_PUBLIC_SUPABASE_URL')?.replace(/"/g, ''),
            };
        } else if (dbProvider) {
            db = {
                provider: dbProvider,
                connectionString: maskKey(envMap.get('DATABASE_URL') || ''),
            };
        }

        // Parse AI
        const aiProvider = envMap.get('NEXT_PUBLIC_AI_PROVIDER')?.replace(/"/g, '') || (envMap.get('GEMINI_API_KEY') ? 'google' : null);
        let ai: any = null;
        if (aiProvider === 'google') {
            ai = { provider: 'google', apiKey: maskKey(envMap.get('GEMINI_API_KEY') || '') };
        } else if (aiProvider === 'openai') {
            ai = { provider: 'openai', apiKey: maskKey(envMap.get('OPENAI_API_KEY') || '') };
        } else if (aiProvider === 'anthropic') {
            ai = { provider: 'anthropic', apiKey: maskKey(envMap.get('ANTHROPIC_API_KEY') || '') };
        } else if (['lmstudio', 'ollama'].includes(aiProvider || '')) {
            ai = { provider: aiProvider, baseUrl: envMap.get('LOCAL_AI_BASE_URL')?.replace(/"/g, '') };
        }
        if (ai && envMap.get('AI_DEFAULT_MODEL')) {
            ai.model = envMap.get('AI_DEFAULT_MODEL')?.replace(/"/g, '');
        }

        return NextResponse.json({ db, ai });
    } catch (e) {
        return NextResponse.json({ db: null, ai: null });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        
        const envPath = path.join(process.cwd(), '.env.local');
        if (!fs.existsSync(envPath)) return NextResponse.json({ success: true });

        const lines = fs.readFileSync(envPath, 'utf8').split('\n');
        const envMap = new Map<string, string>();
        lines.forEach(line => {
             if (!line || !line.includes('=')) return;
             const idx = line.indexOf('=');
             envMap.set(line.substring(0, idx).trim(), line.substring(idx + 1).trim());
        });

        const dbKeys = ['NEXT_PUBLIC_FIREBASE_API_KEY', 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', 'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', 'NEXT_PUBLIC_FIREBASE_APP_ID', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'DATABASE_URL', 'NEXT_PUBLIC_DATABASE_PROVIDER'];
        const aiKeys = ['GEMINI_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'LOCAL_AI_BASE_URL', 'AI_DEFAULT_MODEL', 'NEXT_PUBLIC_AI_PROVIDER'];

        if (type === 'database') {
            dbKeys.forEach(k => envMap.delete(k));
        } else if (type === 'ai') {
            aiKeys.forEach(k => envMap.delete(k));
        }

        let newContent = '';
        envMap.forEach((val, key) => { newContent += `${key}=${val}\n`; });
        fs.writeFileSync(envPath, newContent, 'utf8');

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
