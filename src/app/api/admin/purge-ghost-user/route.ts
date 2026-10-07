import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getEnvPath } from '@/lib/config-paths';

/**
 * POST /api/admin/purge-ghost-user
 * 
 * Deletes a user from Firebase Auth who has no corresponding employee record.
 * Uses the Firebase REST Identity Toolkit API (no Admin SDK required).
 * 
 * Body: { email: string, password: string }
 * 
 * Flow:
 *  1. Sign the user in via Firebase REST API to get their idToken
 *  2. Use the idToken to call accounts:delete
 *  3. Return success
 * 
 * This endpoint is intentionally restricted — it can only delete the
 * account of the user whose credentials are provided. It cannot be used
 * to delete arbitrary accounts.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: 'Email and password are required.' },
                { status: 400 }
            );
        }

        // Resolve Firebase API key from env
        const envPath = getEnvPath();

        let apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '';
        let projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '';

        if (envPath) {
            const envMap = new Map<string, string>();
            fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
                if (!line || !line.includes('=')) return;
                const idx = line.indexOf('=');
                envMap.set(
                    line.substring(0, idx).trim(),
                    line.substring(idx + 1).trim().replace(/^"/, '').replace(/"$/, '')
                );
            });
            apiKey = envMap.get('NEXT_PUBLIC_FIREBASE_API_KEY') || apiKey;
            projectId = envMap.get('NEXT_PUBLIC_FIREBASE_PROJECT_ID') || projectId;
        }

        if (!apiKey || !projectId) {
            return NextResponse.json(
                { success: false, error: 'Firebase is not configured on this server.' },
                { status: 500 }
            );
        }

        const BASE = `https://identitytoolkit.googleapis.com/v1/accounts`;

        // Step 1: Sign in to get idToken
        const signInRes = await fetch(`${BASE}:signInWithPassword?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true }),
        });

        const signInData = await signInRes.json();

        if (!signInRes.ok || !signInData.idToken) {
            const msg = signInData?.error?.message || 'Authentication failed.';
            return NextResponse.json({ success: false, error: msg }, { status: 401 });
        }

        const { idToken, localId } = signInData;

        // Step 2: Verify this user has NO employee record in Firestore
        // (Safety check: only delete ghost users, not legitimate employees)
        const { initializeApp, deleteApp, getApps } = await import('firebase/app');
        const { getFirestore, collection, query, where, getDocs } = await import('firebase/firestore');

        const tempAppName = 'purge-check-' + Date.now();
        const tempApp = initializeApp(
            { apiKey, projectId, authDomain: `${projectId}.firebaseapp.com` },
            tempAppName
        );
        const tempDb = getFirestore(tempApp);

        const q = query(collection(tempDb, 'employees'), where('email', '==', email));
        const snap = await getDocs(q);
        await deleteApp(tempApp);

        if (!snap.empty) {
            return NextResponse.json(
                {
                    success: false,
                    error: `User "${email}" has an employee record and cannot be purged via this endpoint. Use the User Management panel to remove them.`,
                },
                { status: 403 }
            );
        }

        // Step 3: Delete the Firebase Auth account
        const deleteRes = await fetch(`${BASE}:delete?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });

        if (!deleteRes.ok) {
            const deleteData = await deleteRes.json();
            const msg = deleteData?.error?.message || 'Failed to delete Firebase Auth account.';
            return NextResponse.json({ success: false, error: msg }, { status: 500 });
        }

        console.log(`[SECURITY] Ghost Firebase Auth user "${email}" (uid: ${localId}) deleted by admin purge.`);

        return NextResponse.json({
            success: true,
            message: `Firebase Auth account for "${email}" has been permanently deleted. They can no longer log in.`,
            deletedUid: localId,
        });

    } catch (error: any) {
        console.error('[purge-ghost-user] Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error.' },
            { status: 500 }
        );
    }
}
