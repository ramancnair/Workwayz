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

    // Try build-time env first (works in dev, or if passed as Docker build args)
    const buildUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const buildKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (buildUrl && buildKey && !buildUrl.includes('127.0.0.1')) {
        _client = createSupabaseClient(buildUrl, buildKey);
        return _client;
    }

    // Try cached runtime config (populated after first async fetch)
    if (_runtimeConfig?.supabaseUrl && _runtimeConfig?.supabaseAnonKey) {
        _client = createSupabaseClient(_runtimeConfig.supabaseUrl, _runtimeConfig.supabaseAnonKey);
        return _client;
    }

    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVER-SIDE: Initialize directly from process.env (works after restart)
// CLIENT-SIDE: Use a Proxy that defers initialization until runtime config loads
// ─────────────────────────────────────────────────────────────────────────────

function buildServerClient(): SupabaseClient | null {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) return createSupabaseClient(url, key);
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
