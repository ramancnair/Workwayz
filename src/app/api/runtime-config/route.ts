import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getProfilesPath, getEnvPath } from '@/lib/config-paths';

// This endpoint is called by the client to get runtime config.
// It reads .env.local and connections.json server-side at runtime
// and returns only the SAFE PUBLIC values needed for client-side initialization.
export async function GET() {
    try {
        const envMap = new Map<string, string>();

        // 1. Read .env.local or .env if exists
        const envPath = getEnvPath();

        if (fs.existsSync(envPath)) {
            const lines = fs.readFileSync(envPath, 'utf8').split('\n');
            lines.forEach(line => {
                if (!line || !line.includes('=')) return;
                const idx = line.indexOf('=');
                const key = line.substring(0, idx).trim();
                const val = line.substring(idx + 1).trim().replace(/^"/, '').replace(/"$/, '');
                if (key) envMap.set(key, val);
            });
        }

        // 2. Read connections.json (supports UI profile switching & wizard setup)
        const connsPath = getProfilesPath();
        if (fs.existsSync(connsPath)) {
            try {
                const conns = JSON.parse(fs.readFileSync(connsPath, 'utf8'));
                if (conns.database && Array.isArray(conns.database)) {
                    const activeDb = conns.database.find((p: any) => p.isActive) || conns.database[0];
                    if (activeDb) {
                        if (!envMap.get('NEXT_PUBLIC_DB_PROVIDER')) {
                            envMap.set('NEXT_PUBLIC_DB_PROVIDER', activeDb.provider);
                        }
                        if (activeDb.provider === 'supabase') {
                            if (!envMap.get('NEXT_PUBLIC_SUPABASE_URL') && activeDb.supabaseUrl) {
                                envMap.set('NEXT_PUBLIC_SUPABASE_URL', activeDb.supabaseUrl);
                            }
                            if (!envMap.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') && activeDb.supabaseAnonKey) {
                                envMap.set('NEXT_PUBLIC_SUPABASE_ANON_KEY', activeDb.supabaseAnonKey);
                            }
                        } else if (activeDb.provider === 'firebase') {
                            if (!envMap.get('NEXT_PUBLIC_FIREBASE_PROJECT_ID') && activeDb.projectId) {
                                envMap.set('NEXT_PUBLIC_FIREBASE_PROJECT_ID', activeDb.projectId);
                            }
                            if (!envMap.get('NEXT_PUBLIC_FIREBASE_API_KEY') && activeDb.apiKey) {
                                envMap.set('NEXT_PUBLIC_FIREBASE_API_KEY', activeDb.apiKey);
                            }
                            if (!envMap.get('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN') && activeDb.projectId) {
                                envMap.set('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', activeDb.authDomain || `${activeDb.projectId}.firebaseapp.com`);
                            }
                            if (!envMap.get('NEXT_PUBLIC_FIREBASE_APP_ID') && activeDb.appId) {
                                envMap.set('NEXT_PUBLIC_FIREBASE_APP_ID', activeDb.appId);
                            }
                        }
                    }
                }
                if (conns.authentication && Array.isArray(conns.authentication)) {
                    const activeAuth = conns.authentication.find((a: any) => a.isActive) || conns.authentication[0];
                    if (activeAuth && !envMap.get('NEXT_PUBLIC_AUTH_PROVIDER')) {
                        envMap.set('NEXT_PUBLIC_AUTH_PROVIDER', activeAuth.provider);
                    }
                }
            } catch (e) {
                // Non-fatal parse failure
            }
        }

        // 3. Fallback to process.env (for direct environment variable injection)
        const getEnv = (key: string): string | null => {
            return envMap.get(key) || process.env[key] || null;
        };

        let dbProvider = getEnv('NEXT_PUBLIC_DB_PROVIDER') || getEnv('NEXT_PUBLIC_DATABASE_PROVIDER');
        if (!dbProvider) {
            if (getEnv('NEXT_PUBLIC_SUPABASE_URL')) {
                dbProvider = 'supabase';
            } else if (getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID')) {
                dbProvider = 'firebase';
            } else {
                dbProvider = 'local';
            }
        }

        let authProvider = getEnv('NEXT_PUBLIC_AUTH_PROVIDER');
        if (!authProvider) {
            if (getEnv('NEXT_PUBLIC_SUPABASE_URL')) {
                authProvider = 'supabase';
            } else if (getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID')) {
                authProvider = 'firebase';
            } else {
                authProvider = 'local';
            }
        }

        // Return only non-secret, client-safe public config values
        const config = {
            dbProvider:        dbProvider || 'local',
            authProvider:      authProvider || 'local',
            supabaseUrl:       getEnv('NEXT_PUBLIC_SUPABASE_URL') || null,
            supabaseAnonKey:   getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || null,
            firebaseProjectId: getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID') || null,
            firebaseApiKey:    getEnv('NEXT_PUBLIC_FIREBASE_API_KEY') || null,
            firebaseAuthDomain:getEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN') || (getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID') ? `${getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID')}.firebaseapp.com` : null),
            firebaseAppId:     getEnv('NEXT_PUBLIC_FIREBASE_APP_ID') || null,
            aiProvider:        getEnv('NEXT_PUBLIC_AI_PROVIDER') || null,
        };

        return NextResponse.json(config);
    } catch (e) {
        return NextResponse.json({}, { status: 500 });
    }
}
