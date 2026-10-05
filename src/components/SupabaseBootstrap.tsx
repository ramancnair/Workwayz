'use client';
import { useEffect } from 'react';
import { initSupabaseClient } from '@/lib/supabase';
import { initFirebaseClient } from '@/lib/firebase';
import { setRuntimeDbProvider } from '@/lib/db-provider';

// Bootstraps runtime config for both Supabase and Firebase on first render.
// Must be rendered inside RootLayout before any component that uses database services.
export function SupabaseBootstrap() {
    useEffect(() => {
        fetch('/api/runtime-config')
            .then(r => r.json())
            .then(data => {
                if (data.dbProvider) {
                    setRuntimeDbProvider(data.dbProvider);
                }
            })
            .catch(() => {});
        initSupabaseClient();
        initFirebaseClient();
    }, []);
    return null;
}
