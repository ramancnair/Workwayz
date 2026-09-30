'use client';
import { useEffect } from 'react';
import { initSupabaseClient } from '@/lib/supabase';
import { initFirebaseClient } from '@/lib/firebase';

// Bootstraps runtime config for both Supabase and Firebase on first render.
// Must be rendered inside RootLayout before any component that uses database services.
export function SupabaseBootstrap() {
    useEffect(() => {
        initSupabaseClient();
        initFirebaseClient();
    }, []);
    return null;
}
