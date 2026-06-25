import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// This endpoint is called by the client to get runtime config.
// It reads .env.local server-side (works after container restart)
// and returns only the SAFE PUBLIC values needed for client-side initialization.
export async function GET() {
    try {
        const envMap = new Map<string, string>();

        // Read .env.local (written by setup wizard via docker volume symlink)
        const envPath = path.join(process.cwd(), '.env.local');
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

        // Return only non-secret, client-safe public config values
        const config = {
            dbProvider:        envMap.get('NEXT_PUBLIC_DB_PROVIDER') || envMap.get('NEXT_PUBLIC_DATABASE_PROVIDER') || null,
            authProvider:      envMap.get('NEXT_PUBLIC_AUTH_PROVIDER') || null,
            supabaseUrl:       envMap.get('NEXT_PUBLIC_SUPABASE_URL') || null,
            supabaseAnonKey:   envMap.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') || null,
            firebaseProjectId: envMap.get('NEXT_PUBLIC_FIREBASE_PROJECT_ID') || null,
            firebaseApiKey:    envMap.get('NEXT_PUBLIC_FIREBASE_API_KEY') || null,
            firebaseAuthDomain:envMap.get('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN') || null,
            firebaseAppId:     envMap.get('NEXT_PUBLIC_FIREBASE_APP_ID') || null,
            aiProvider:        envMap.get('NEXT_PUBLIC_AI_PROVIDER') || null,
        };

        return NextResponse.json(config);
    } catch (e) {
        return NextResponse.json({}, { status: 500 });
    }
}
