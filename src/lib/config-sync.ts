import fs from 'fs';
import path from 'path';
import { getProfilesPath, getEnvPath, getEnvLocalPath, getDataDirectory } from './config-paths';

export { getProfilesPath, getEnvPath, getEnvLocalPath, getDataDirectory };

export function readEnvMap(): Map<string, string> {
    const envMap = new Map<string, string>();
    const envPath = getEnvPath();

    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            if (!line || !line.includes('=')) return;
            const idx = line.indexOf('=');
            const key = line.substring(0, idx).trim();
            const value = line.substring(idx + 1).trim();
            if (key) envMap.set(key, value);
        });
    }
    return envMap;
}

export function writeEnvMap(envMap: Map<string, string>): void {
    const envPath = getEnvLocalPath();
    let newContent = '';
    envMap.forEach((val, key) => {
        newContent += `${key}=${val}\n`;
        const cleanVal = val.replace(/^"/, '').replace(/"$/, '');
        process.env[key] = cleanVal;
    });
    fs.writeFileSync(envPath, newContent, 'utf8');
}

/**
 * Synchronizes the active profiles from connections.json directly into .env.local
 * and updates process.env in memory for the running Node server process.
 */
export function syncConnectionsToEnv(connsData?: any): void {
    let conns = connsData;
    const profilesPath = getProfilesPath();
    if (!conns && fs.existsSync(profilesPath)) {
        try {
            conns = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
        } catch (e) {
            return;
        }
    }
    if (!conns) return;

    const envMap = readEnvMap();

    // 1. Sync Database
    if (conns.database && Array.isArray(conns.database)) {
        const activeDb = conns.database.find((p: any) => p.isActive) || conns.database[0];
        if (activeDb) {
            const dbKeys = [
                'NEXT_PUBLIC_FIREBASE_API_KEY',
                'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
                'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
                'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
                'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
                'NEXT_PUBLIC_FIREBASE_APP_ID',
                'NEXT_PUBLIC_SUPABASE_URL',
                'NEXT_PUBLIC_SUPABASE_ANON_KEY',
                'NEXT_PUBLIC_DATABASE_PROVIDER',
                'NEXT_PUBLIC_DB_PROVIDER'
            ];
            dbKeys.forEach(k => envMap.set(k, '""'));

            if (activeDb.provider === 'firebase') {
                envMap.set('NEXT_PUBLIC_DB_PROVIDER', '"firebase"');
                envMap.set('NEXT_PUBLIC_DATABASE_PROVIDER', '"firebase"');
                if (activeDb.apiKey) envMap.set('NEXT_PUBLIC_FIREBASE_API_KEY', `"${activeDb.apiKey}"`);
                if (activeDb.projectId) envMap.set('NEXT_PUBLIC_FIREBASE_PROJECT_ID', `"${activeDb.projectId}"`);
                
                const authDomain = activeDb.authDomain || (activeDb.projectId ? `${activeDb.projectId}.firebaseapp.com` : '');
                if (authDomain) envMap.set('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', `"${authDomain}"`);
                
                const storageBucket = activeDb.storageBucket || (activeDb.projectId ? `${activeDb.projectId}.firebasestorage.app` : '');
                if (storageBucket) envMap.set('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', `"${storageBucket}"`);
                
                if (activeDb.messagingSenderId) envMap.set('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', `"${activeDb.messagingSenderId}"`);
                if (activeDb.appId) envMap.set('NEXT_PUBLIC_FIREBASE_APP_ID', `"${activeDb.appId}"`);
            } else if (activeDb.provider === 'supabase') {
                envMap.set('NEXT_PUBLIC_DB_PROVIDER', '"supabase"');
                envMap.set('NEXT_PUBLIC_DATABASE_PROVIDER', '"supabase"');
                if (activeDb.supabaseUrl) envMap.set('NEXT_PUBLIC_SUPABASE_URL', `"${activeDb.supabaseUrl}"`);
                if (activeDb.supabaseAnonKey) envMap.set('NEXT_PUBLIC_SUPABASE_ANON_KEY', `"${activeDb.supabaseAnonKey}"`);
            }
        }
    }

    // 2. Sync AI
    if (conns.ai && Array.isArray(conns.ai)) {
        const activeAi = conns.ai.find((p: any) => p.isActive) || conns.ai[0];
        if (activeAi) {
            if (activeAi.provider) envMap.set('NEXT_PUBLIC_AI_PROVIDER', `"${activeAi.provider}"`);
            if (activeAi.apiKey && activeAi.provider === 'google') envMap.set('GEMINI_API_KEY', `"${activeAi.apiKey}"`);
            if (activeAi.apiKey && activeAi.provider === 'openai') envMap.set('OPENAI_API_KEY', `"${activeAi.apiKey}"`);
            if (activeAi.apiKey && activeAi.provider === 'anthropic') envMap.set('ANTHROPIC_API_KEY', `"${activeAi.apiKey}"`);
            if (activeAi.baseUrl) envMap.set('LOCAL_AI_BASE_URL', `"${activeAi.baseUrl}"`);

            let targetModel = activeAi.model;
            if (!targetModel || (activeAi.provider === 'google' && (targetModel === 'local-model' || targetModel === 'gemini-2.5-flash' || targetModel === 'gemini-2.5-pro' || !targetModel.startsWith('gemini-')))) {
                if (activeAi.provider === 'google') targetModel = 'gemini-3.8-flash';
                else if (activeAi.provider === 'lmstudio') targetModel = 'meta/muse-glimmer';
                else if (activeAi.provider === 'openai') targetModel = 'gpt-4o';
                else if (activeAi.provider === 'anthropic') targetModel = 'claude-3-5-sonnet';
                else if (activeAi.provider === 'ollama') targetModel = 'llama3';
            }
            if (targetModel) envMap.set('AI_DEFAULT_MODEL', `"${targetModel}"`);
        }
    }

    // 3. Sync Authentication
    if (conns.authentication && Array.isArray(conns.authentication)) {
        const activeAuth = conns.authentication.find((p: any) => p.isActive) || conns.authentication[0];
        if (activeAuth) {
            // If DB provider is active, keep auth provider bound to DB provider unless Keycloak
            const activeDb = conns.database?.find((p: any) => p.isActive) || conns.database?.[0];
            const effectiveAuthProvider = (activeDb?.provider && activeAuth.provider !== 'keycloak')
                ? activeDb.provider
                : activeAuth.provider;

            if (effectiveAuthProvider) envMap.set('NEXT_PUBLIC_AUTH_PROVIDER', `"${effectiveAuthProvider}"`);
            envMap.set('NEXT_PUBLIC_AUTH_GOOGLE_SSO', activeAuth.googleSso ? '"true"' : '""');
            envMap.set('NEXT_PUBLIC_AUTH_FACEBOOK_SSO', activeAuth.facebookSso ? '"true"' : '""');
            envMap.set('NEXT_PUBLIC_AUTH_APPLE_SSO', activeAuth.appleSso ? '"true"' : '""');
        }
    }

    writeEnvMap(envMap);
}
