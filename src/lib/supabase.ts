import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME CONFIG CACHE
// In a Docker standalone build, NEXT_PUBLIC_* vars are baked empty at build
// time. We solve this by fetching the active config from /api/runtime-config
// (which reads .env.local server-side at runtime) and caching it here.
// ─────────────────────────────────────────────────────────────────────────────

interface RuntimeConfig {
    supabaseUrl: string | null;
    supabaseAnonKey: string | null;
    dbProvider: string | null;
}

let _runtimeConfig: RuntimeConfig | null = null;
let _fetchPromise: Promise<RuntimeConfig> | null = null;
let _client: SupabaseClient | null = null;

function createSupabaseClient(url: string, key: string): SupabaseClient {
    return createClient(url, key, {
        global: {
            fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
        }
    });
}

async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
    if (_runtimeConfig) return _runtimeConfig;
    if (_fetchPromise) return _fetchPromise;

    _fetchPromise = fetch('/api/runtime-config')
        .then(r => r.json())
        .then(data => {
            _runtimeConfig = {
                supabaseUrl: data.supabaseUrl || null,
                supabaseAnonKey: data.supabaseAnonKey || null,
                dbProvider: data.dbProvider || null,
            };
            return _runtimeConfig!;
        })
        .catch(() => {
            _runtimeConfig = { supabaseUrl: null, supabaseAnonKey: null, dbProvider: null };
            return _runtimeConfig!;
        });

    return _fetchPromise;
}

function getClientSync(): SupabaseClient | null {
    if (_client) return _client;

    // 1. Try window.__PROJECTFLOW_CONFIG__ (injected directly into HTML by RootLayout at request time)
    if (typeof window !== 'undefined' && (window as any).__PROJECTFLOW_CONFIG__) {
        const winCfg = (window as any).__PROJECTFLOW_CONFIG__;
        if (winCfg.supabaseUrl && winCfg.supabaseAnonKey) {
            _client = createSupabaseClient(winCfg.supabaseUrl, winCfg.supabaseAnonKey);
            return _client;
        }
    }

    // 2. Try build-time env (works in dev, or if passed as Docker build args)
    const buildUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const buildKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (buildUrl && buildKey && !buildUrl.includes('127.0.0.1')) {
        _client = createSupabaseClient(buildUrl, buildKey);
        return _client;
    }

    // 3. Try cached runtime config (populated after async fetch)
    if (_runtimeConfig?.supabaseUrl && _runtimeConfig?.supabaseAnonKey) {
        _client = createSupabaseClient(_runtimeConfig.supabaseUrl, _runtimeConfig.supabaseAnonKey);
        return _client;
    }

    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER-SIDE: Initialize directly from process.env or connections.json/.env.local
// CLIENT-SIDE: Use a Proxy that defers initialization until runtime config loads
// ─────────────────────────────────────────────────────────────────────────────

function buildServerClient(): SupabaseClient | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) return createSupabaseClient(url, key);

    // Fallback on server: read connections.json directly if process.env isn't set
    if (typeof window === 'undefined') {
        try {
            const req = eval('require');
            const fs = req('fs');
            const path = req('path');
            const p = path.join(process.cwd(), 'connections.json');
            if (fs.existsSync(p)) {
                const conns = JSON.parse(fs.readFileSync(p, 'utf8'));
                const active = conns.database?.find((d: any) => d.isActive) || conns.database?.[0];
                if (active?.supabaseUrl && active?.supabaseAnonKey) {
                    return createSupabaseClient(active.supabaseUrl, active.supabaseAnonKey);
                }
            }
        } catch {}
    }

    return null;
}

// Exported async initializer — call this once at app startup on the client
export async function initSupabaseClient(): Promise<void> {
    if (typeof window === 'undefined') return; // server-side, skip
    if (_client) return; // already initialized
    const config = await fetchRuntimeConfig();
    if (config.supabaseUrl && config.supabaseAnonKey) {
        _client = createSupabaseClient(config.supabaseUrl, config.supabaseAnonKey);
    }
}

// Proxy — all callers (supabase-firestore-adapter, login page, etc.) use this.
// On first property access, it returns the live client if ready, or null.
const supabaseProxy = new Proxy({} as any, {
    get(_target, prop: string) {
        const client = typeof window === 'undefined'
            ? buildServerClient()
            : getClientSync();
        if (!client) return undefined;
        const value = (client as any)[prop];
        return typeof value === 'function' ? value.bind(client) : value;
    }
}) as SupabaseClient;

export const supabase = supabaseProxy;
