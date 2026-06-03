import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { adminEmail, adminPassword, adminName, dbProvider, fbApiKey, fbProjectId, supaUrl, supaKey, authProvider, kcUrl, kcRealm, kcClientId, kcAdminSecret } = body;

        if (!adminEmail || !adminPassword) {
            return NextResponse.json({ success: false, error: 'Missing email or password' }, { status: 400 });
        }

        // Get unmasked firebase credentials
        let apiKey = (fbApiKey && !fbApiKey.includes('****')) ? fbApiKey : '';
        let projectId = (fbProjectId && !fbProjectId.includes('****')) ? fbProjectId : '';
        
        const profilesPath = path.join(process.cwd(), 'connections.json');
        if (fs.existsSync(profilesPath)) {
            const conns = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
            if (conns.database) {
                const activeDb = conns.database.find((p: any) => p.isActive);
                if (activeDb && activeDb.provider === 'firebase') {
                    apiKey = activeDb.apiKey;
                    projectId = activeDb.projectId;
                }
            }
            
            let finalSupaUrl = supaUrl;
            let finalSupaKey = supaKey;
            if (conns.database) {
                const activeDb = conns.database.find((p: any) => p.isActive);
                if (activeDb && activeDb.provider === 'supabase') {
                    finalSupaUrl = activeDb.supabaseUrl || supaUrl;
                    finalSupaKey = activeDb.supabaseAnonKey || supaKey;
                }
            }
            // Assign to new let variables to avoid const assignment errors in SWC transpilation
            let effectiveSupaUrl = finalSupaUrl;
            let effectiveSupaKey = finalSupaKey;

        }

        // Fallback to env file if connections.json doesn't have it (e.g. they only chose Postgres)
        if (!apiKey || !projectId) {
            const envPathLocal = path.join(process.cwd(), '.env.local');
            const envPathBase = path.join(process.cwd(), '.env');
            const envPath = fs.existsSync(envPathLocal) ? envPathLocal : fs.existsSync(envPathBase) ? envPathBase : null;
            
            if (envPath) {
                const envMap = new Map<string, string>();
                fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
                    if (!line || !line.includes('=')) return;
                    const idx = line.indexOf('=');
                    envMap.set(line.substring(0, idx).trim(), line.substring(idx + 1).trim().replace(/^"/, '').replace(/"$/, ''));
                });
                if (!apiKey) apiKey = envMap.get('NEXT_PUBLIC_FIREBASE_API_KEY') || '';
                if (!projectId) projectId = envMap.get('NEXT_PUBLIC_FIREBASE_PROJECT_ID') || '';
            }
        }

        if (dbProvider !== 'supabase' && authProvider !== 'supabase') {
            if (!projectId) {
                return NextResponse.json({ success: false, error: 'Firebase Project ID is missing. Please configure it in the Database step.' }, { status: 400 });
            }
            if (!apiKey) {
                return NextResponse.json({ success: false, error: 'Firebase API Key is missing. Please configure it in the Database step.' }, { status: 400 });
            }
        }

        // Dynamic initialization based on DB provider
        let uid = '';
        let isNewUser = true;
        let empId = '';
        const nameParts = (adminName || 'Admin User').trim().split(' ');
        let firstName = nameParts[0];
        let lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        if (authProvider === 'supabase' || dbProvider === 'supabase') {
            const { createClient } = await import('@supabase/supabase-js');
            
            const finalSupaUrl = effectiveSupaUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
            const finalSupaKey = effectiveSupaKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

            if (!finalSupaUrl) {
                return NextResponse.json({ success: false, error: 'Supabase URL is missing.' }, { status: 400 });
            }

            const supAdmin = createClient(finalSupaUrl, finalSupaKey);

            // Supabase Auth
            let authData, authError;
            // Try admin.createUser first (requires service role key)
            const adminRes = await supAdmin.auth.admin.createUser({
                email: adminEmail,
                password: adminPassword,
                email_confirm: true
            });
            if (adminRes.error) {
                // Fallback to regular signUp
                const signUpRes = await supAdmin.auth.signUp({
                    email: adminEmail,
                    password: adminPassword,
                });
                authData = signUpRes.data;
                authError = signUpRes.error;
            } else {
                authData = adminRes.data;
                authError = adminRes.error;
            }


            if (authError) {
                if (authError.message.includes('already registered') || authError.status === 422) {
                    const { data: signInData, error: signInError } = await supAdmin.auth.signInWithPassword({
                        email: adminEmail,
                        password: adminPassword,
                    });
                    if (signInError) throw new Error("Admin email already exists, but password provided is incorrect.");
                    uid = signInData.user?.id || '';
                    isNewUser = false;
                } else {
                    throw authError;
                }
            } else {
                uid = authData.user?.id || '';
            }

            // Supabase DB (using the firebase_compat adapter approach, or native table if using native)
            // Wait, earlier we created an `employees` table? No, we created `firebase_compat` table.
            // But login/page.tsx queries `supabase.from('employees')`. We need to make sure the adapter is used, or write natively.
            // Actually, we can just use our adapter to write to firebase_compat!
            
            // To make it simple, we'll write directly to `firebase_compat`
            let existingEmp = null;
            if (!isNewUser) {
                const { data: existing } = await supAdmin.from('firebase_compat')
                    .select('*')
                    .eq('collection_name', 'employees')
                    .eq('data->>email', adminEmail)
                    .single();
                if (existing) {
                    existingEmp = existing;
                    empId = existing.path.split('/').pop() || '';
                    if (existing.data.accessLevel !== 'Administrator') {
                        const updatedData = { ...existing.data, accessLevel: 'Administrator' };
                        await supAdmin.from('firebase_compat').update({ data: updatedData }).eq('path', existing.path);
                    }
                }
            }

            if (!empId) {
                // Get highest ID
                const { data: allEmps } = await supAdmin.from('firebase_compat').select('path').eq('collection_name', 'employees');
                let highestId = 0;
                if (allEmps) {
                    allEmps.forEach((row: any) => {
                        const id = row.path.split('/').pop() || '';
                        if (id.startsWith('E')) {
                            const num = parseInt(id.substring(1));
                            if (!isNaN(num) && num > highestId) highestId = num;
                        }
                    });
                }
                empId = `E${(highestId + 1).toString().padStart(3, '0')}`;

                await supAdmin.from('firebase_compat').insert({
                    path: `employees/${empId}`,
                    collection_name: 'employees',
                    project_id: null,
                    data: {
                        empId,
                        firstName,
                        lastName,
                        email: adminEmail,
                        phone: 'N/A',
                        experience: 0,
                        accessLevel: 'Administrator',
                        avatar: 'https://placehold.co/40x40.png',
                        isDeleted: false,
                        uid: uid
                    }
                });
            }
        } else {
            // Firebase Initialize
            const { initializeApp, deleteApp } = await import('firebase/app');
            const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('firebase/auth');
            const { getFirestore, doc, setDoc, getDocs, collection, query, where } = await import('firebase/firestore');

            const tempConfig = { apiKey, projectId, authDomain: `${projectId}.firebaseapp.com` };
            const tempApp = initializeApp(tempConfig, 'server-wizard-app-' + Date.now());
            const tempAuth = getAuth(tempApp);
            const tempDb = getFirestore(tempApp);

            // Auth (Keycloak or Firebase)
            if (authProvider === 'keycloak') {
                // ... keycloak logic ...
                if (!kcUrl || !kcRealm || !kcAdminSecret || !kcClientId) throw new Error('Keycloak config missing');
                const tokenParams = new URLSearchParams();
                tokenParams.append('client_id', kcClientId);
                tokenParams.append('client_secret', kcAdminSecret);
                tokenParams.append('grant_type', 'client_credentials');
                const tokenRes = await fetch(`${kcUrl.replace(/\/$/, '')}/realms/${kcRealm}/protocol/openid-connect/token`, {
                    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: tokenParams.toString()
                });
                if (!tokenRes.ok) throw new Error('Failed to get Keycloak token');
                const token = (await tokenRes.json()).access_token;
                
                const userPayload = { username: adminEmail, email: adminEmail, firstName, lastName, enabled: true, credentials: [{ type: 'password', value: adminPassword, temporary: false }] };
                const createRes = await fetch(`${kcUrl.replace(/\/$/, '')}/admin/realms/${kcRealm}/users`, {
                    method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(userPayload)
                });
                if (!createRes.ok && createRes.status !== 409) throw new Error('Failed to create Keycloak user');
                if (createRes.status === 409) isNewUser = false;
                
                const lookupRes = await fetch(`${kcUrl.replace(/\/$/, '')}/admin/realms/${kcRealm}/users?email=${encodeURIComponent(adminEmail)}&exact=true`, { headers: { 'Authorization': `Bearer ${token}` } });
                const users = await lookupRes.json();
                if (users && users.length > 0) {
                    uid = users[0].id;
                    let roleRes = await fetch(`${kcUrl.replace(/\/$/, '')}/admin/realms/${kcRealm}/roles/Administrator`, { headers: { 'Authorization': `Bearer ${token}` } });
                    if (!roleRes.ok && roleRes.status === 404) {
                         await fetch(`${kcUrl.replace(/\/$/, '')}/admin/realms/${kcRealm}/roles`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Administrator' }) });
                         roleRes = await fetch(`${kcUrl.replace(/\/$/, '')}/admin/realms/${kcRealm}/roles/Administrator`, { headers: { 'Authorization': `Bearer ${token}` } });
                    }
                    if (roleRes.ok) {
                         const roleData = await roleRes.json();
                         await fetch(`${kcUrl.replace(/\/$/, '')}/admin/realms/${kcRealm}/users/${uid}/role-mappings/realm`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify([{ id: roleData.id, name: roleData.name }]) });
                    }
                } else uid = adminEmail;
            } else {
                try {
                    const userCred = await createUserWithEmailAndPassword(tempAuth, adminEmail, adminPassword);
                    uid = userCred.user.uid;
                } catch (authError: any) {
                    if (authError.code === 'auth/email-already-in-use') {
                        try {
                            const userCred = await signInWithEmailAndPassword(tempAuth, adminEmail, adminPassword);
                            uid = userCred.user.uid;
                            isNewUser = false;
                        } catch (signInErr) { throw new Error("Admin email exists, but password provided is incorrect."); }
                    } else throw authError;
                }
            }

            // Firestore DB
            if (!isNewUser) {
                 const q = query(collection(tempDb, 'employees'), where('email', '==', adminEmail));
                 const qSnap = await getDocs(q);
                 if (!qSnap.empty) {
                      const docSnap = qSnap.docs[0];
                      const data = docSnap.data();
                      empId = docSnap.id;
                      if (data.accessLevel !== 'Administrator') await setDoc(doc(tempDb, 'employees', docSnap.id), { accessLevel: 'Administrator' }, { merge: true });
                 }
            }

            if (!empId) {
                const usersSnapshot = await getDocs(collection(tempDb, 'employees'));
                let highestId = 0;
                usersSnapshot.forEach(docSnap => {
                    if (docSnap.id.startsWith('E')) {
                        const num = parseInt(docSnap.id.substring(1));
                        if (!isNaN(num) && num > highestId) highestId = num;
                    }
                });
                empId = `E${(highestId + 1).toString().padStart(3, '0')}`;
                await setDoc(doc(tempDb, 'employees', empId), {
                    empId, firstName, lastName, email: adminEmail, phone: 'N/A', experience: 0, accessLevel: 'Administrator', avatar: 'https://placehold.co/40x40.png', isDeleted: false, uid
                });
            }
            await deleteApp(tempApp);
        }


        return NextResponse.json({ 
            success: true, 
            user: {
                name: `${firstName} ${lastName}`.trim(),
                email: adminEmail,
                accessLevel: 'Administrator',
                empId,
                uid: uid
            }
        });

    } catch (error: any) {
        console.error('Admin setup error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
