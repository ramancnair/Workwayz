'use client';
import { useEffect } from 'react';
import { initSupabaseClient } from '@/lib/supabase';

// Bootstraps the Supabase client from /api/runtime-config on first render.
// Must be rendered inside RootLayout before any component that uses supabase.
export function SupabaseBootstrap() {
    useEffect(() => {
        initSupabaseClient();
    }, []);
    return null;
}
