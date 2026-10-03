import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;
        
        const authProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'firebase';
        const dbProvider = process.env.NEXT_PUBLIC_DATABASE_PROVIDER || 'firebase';
        
        if (authProvider === 'supabase' || dbProvider === 'supabase') {
            if (!supabase) return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
            
            const { error } = await supabase.auth.signUp({
                email,
                password: password || 'P@ssw0rd',
            });
            if (error && error.message !== 'User already registered') {
                throw new Error(`Supabase Auth creation failed: ${error.message}`);
            }
            return NextResponse.json({ success: true, message: 'Supabase identity provisioned' });
        } else {
            const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
            if (!apiKey) return NextResponse.json({ error: 'Firebase config missing' }, { status: 500 });
            
            const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: password || 'P@ssw0rd', returnSecureToken: false })
            });
            
            if (!res.ok) {
                const data = await res.json();
                if (data?.error?.message === 'EMAIL_EXISTS') {
                    return NextResponse.json({ success: true, message: 'User exists' });
                }
                throw new Error(`Firebase identity creation failed: ${data?.error?.message}`);
            }
            return NextResponse.json({ success: true, message: 'Firebase identity provisioned' });
        }
    } catch (e: any) {
        console.error("User creation API error:", e);
        return NextResponse.json({ success: false, error: e.message || 'Unknown error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const email = searchParams.get('email');
        if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

        // Reject if target user is Super Admin
        const authProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'firebase';
        const dbProvider = process.env.NEXT_PUBLIC_DATABASE_PROVIDER || 'firebase';
        if (authProvider === 'supabase' || dbProvider === 'supabase') {
            if (supabase) {
                const { data } = await supabase.from('employees').select('accessLevel').eq('email', email).maybeSingle();
                if (data?.accessLevel === 'Super Admin') {
                    return NextResponse.json({ success: false, error: 'Super Admin users cannot be deleted via the application.' }, { status: 403 });
                }
            }
        }

        return NextResponse.json({ success: true, message: 'Auth provider deletion handled' });
    } catch (e: any) {
        console.error("User deletion API error:", e);
        return NextResponse.json({ success: false, error: e.message || 'Unknown error' }, { status: 500 });
    }
}
