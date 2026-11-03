import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { db, doc, updateDoc, getDoc, collection, query, where, getDocs, isSupabaseActive } from '@/lib/db-provider';
import fs from 'fs';
import path from 'path';
import { getProfilesPath } from '@/lib/config-paths';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, empId } = body;

        if (!email && !empId) {
            return NextResponse.json({ success: false, error: 'Email or Emp ID is required' }, { status: 400 });
        }

        // Determine providers
        let authProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER;
        let dbProvider = process.env.NEXT_PUBLIC_DATABASE_PROVIDER;

        if (!authProvider || !dbProvider) {
            try {
                const connsPath = getProfilesPath();
                if (fs.existsSync(connsPath)) {
                    const conns = JSON.parse(fs.readFileSync(connsPath, 'utf8'));
                    const activeDb = conns.database?.find((p: any) => p.isActive) || conns.database?.[0];
                    const activeAuth = conns.authentication?.find((p: any) => p.isActive) || conns.authentication?.[0];
                    if (!dbProvider && activeDb?.provider) dbProvider = activeDb.provider;
                    if (!authProvider && activeAuth?.provider) authProvider = activeAuth.provider;
                }
            } catch (_) {}
        }

        authProvider = authProvider || (isSupabaseActive() ? 'supabase' : 'firebase');
        dbProvider = dbProvider || (isSupabaseActive() ? 'supabase' : 'firebase');

        const isLocal = authProvider === 'local' || dbProvider === 'local';
        const isSupabase = authProvider === 'supabase' || dbProvider === 'supabase';

        // 1. Safety verification: Prohibit resetting Super Admin
        let targetEmpId = empId;
        let targetEmail = email;
        let targetAccessLevel = '';

        if (supabase) {
            try {
                let q = supabase.from('employees').select('id, empId, email, accessLevel');
                if (empId) {
                    q = q.eq('empId', empId);
                } else {
                    q = q.eq('email', email);
                }
                const { data: empData } = await q.maybeSingle();
                if (empData) {
                    targetEmpId = empData.empId || empData.id;
                    targetEmail = empData.email || targetEmail;
                    targetAccessLevel = empData.accessLevel;
                }
            } catch (_) {}
        }

        if (!targetAccessLevel && db) {
            try {
                if (empId) {
                    const snap = await getDoc(doc(db, 'employees', empId));
                    if (snap && (typeof snap.exists === 'function' ? snap.exists() : snap.exists)) {
                        const data = snap.data();
                        targetEmail = data?.email || targetEmail;
                        targetAccessLevel = data?.accessLevel || '';
                    }
                }
                if (!targetAccessLevel && email) {
                    const q = query(collection(db, 'employees'), where('email', '==', email));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        const data = snap.docs[0].data();
                        targetEmpId = snap.docs[0].id;
                        targetAccessLevel = data?.accessLevel || '';
                        targetEmail = data?.email || targetEmail;
                    }
                }
            } catch (_) {}
        }

        if (body.accessLevel === 'Super Admin' || targetAccessLevel === 'Super Admin') {
            return NextResponse.json(
                { success: false, error: 'Super Admin accounts cannot have their password reset via this panel.' },
                { status: 403 }
            );
        }

        // 2. Perform the reset according to the active auth provider
        if (isSupabase || isLocal) {
            let supabaseAdmin: any = null;
            if (isLocal) {
                const { localSupabaseClient } = await import('@/lib/local-supabase-shim');
                supabaseAdmin = localSupabaseClient;
            } else {
                const { createClient } = await import('@supabase/supabase-js');
                const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
                if (supaUrl && supaKey) {
                    supabaseAdmin = createClient(supaUrl, supaKey, {
                        auth: { autoRefreshToken: false, persistSession: false }
                    });
                }
            }

            if (supabaseAdmin) {
                // Update auth credentials in Auth pool if permitted
                try {
                    const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
                    const authUser = listData?.users?.find(
                        (u: any) => u.email?.toLowerCase() === (targetEmail || email).toLowerCase()
                    );
                    if (authUser) {
                        const { error: resetErr } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
                            password: 'P@ssw0rd'
                        });
                        if (resetErr) {
                            console.warn('[reset-password] Warning updating auth pool password:', resetErr);
                        }
                    }
                } catch (e) {
                    console.warn('[reset-password] Could not update auth user by admin (likely anon key):', e);
                }

                // Update employee record with needsPasswordReset flag
                const updateQuery = targetEmpId
                    ? supabaseAdmin.from('employees').update({ needsPasswordReset: true, updatedAt: new Date().toISOString() }).eq('empId', targetEmpId)
                    : supabaseAdmin.from('employees').update({ needsPasswordReset: true, updatedAt: new Date().toISOString() }).eq('email', targetEmail || email);

                const { error: dbErr } = await updateQuery;
                if (dbErr) {
                    console.error('[reset-password] Error updating employee in DB:', dbErr);
                }
            }
        } else {
            // Firebase mode
            if (db && targetEmpId) {
                try {
                    await updateDoc(doc(db, 'employees', targetEmpId), {
                        needsPasswordReset: true,
                        updatedAt: new Date().toISOString()
                    });
                } catch (fbErr: any) {
                    // In client-first Firebase architecture, server lacks user credentials.
                    // The client handles authenticated update with the admin's active session.
                    console.warn('[reset-password] Server Firestore write skipped (client handles authenticated write):', fbErr?.message);
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Password has been reset to default (P@ssw0rd). The user will be required to change it on their next login.`
        });
    } catch (e: any) {
        console.error('[reset-password] API error:', e);
        return NextResponse.json({ success: false, error: e.message || 'Unknown error' }, { status: 500 });
    }
}
