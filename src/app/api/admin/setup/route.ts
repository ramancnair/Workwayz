import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getConnectionsPath } from '@/lib/config-path';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { adminEmail, adminPassword, adminName, dbProvider, fbApiKey, fbProjectId, supaUrl, supaKey, authProvider } = body;

        if (!adminEmail || !adminPassword) {
            return NextResponse.json({ success: false, error: 'Missing email or password' }, { status: 400 });
        }

        // Get unmasked firebase credentials
        let apiKey = (fbApiKey && !fbApiKey.includes('****')) ? fbApiKey : '';
        let projectId = (fbProjectId && !fbProjectId.includes('****')) ? fbProjectId : '';
        let effectiveSupaUrl = supaUrl || '';
        let effectiveSupaKey = supaKey || '';
        
        const profilesPath = getConnectionsPath();
        if (fs.existsSync(profilesPath)) {
            try {
                const conns = JSON.parse(fs.readFileSync(profilesPath, 'utf8'));
                if (conns.database) {
                    const activeDb = conns.database.find((p: any) => p.isActive);
                    if (activeDb && activeDb.provider === 'firebase') {
                        apiKey = activeDb.apiKey;
                        projectId = activeDb.projectId;
                    }
                    if (activeDb && activeDb.provider === 'supabase') {
                        effectiveSupaUrl = activeDb.supabaseUrl || supaUrl;
                        effectiveSupaKey = activeDb.supabaseAnonKey || supaKey;
                    }
                }
            } catch (e) { }
        }

        // Fallback to env file
        if (!apiKey || !projectId || !effectiveSupaUrl || !effectiveSupaKey) {
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
                if (!effectiveSupaUrl) effectiveSupaUrl = envMap.get('NEXT_PUBLIC_SUPABASE_URL') || '';
                if (!effectiveSupaKey) effectiveSupaKey = envMap.get('NEXT_PUBLIC_SUPABASE_ANON_KEY') || '';
            }
        }

        const isSupabase = authProvider === 'supabase' || dbProvider === 'supabase';

        if (!isSupabase) {
            if (!projectId) {
                return NextResponse.json({ success: false, error: 'Firebase Project ID is missing. Please configure it in the Database step.' }, { status: 400 });
            }
            if (!apiKey) {
                return NextResponse.json({ success: false, error: 'Firebase API Key is missing. Please configure it in the Database step.' }, { status: 400 });
            }
        }

        let uid = '';
        let empId = '';
        const nameParts = (adminName || 'Admin User').trim().split(' ');
        let firstName = nameParts[0];
        let lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        if (isSupabase) {
            const { createClient } = await import('@supabase/supabase-js');
            
            const finalSupaUrl = effectiveSupaUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
            const finalSupaKey = effectiveSupaKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

            if (!finalSupaUrl || !finalSupaKey) {
                return NextResponse.json({ success: false, error: 'Supabase URL or Publishable Key is missing.' }, { status: 400 });
            }

            const supabaseAdmin = createClient(finalSupaUrl, finalSupaKey);

            // 1. Authenticate / Create Admin in Supabase Auth
            let authData: any = null;
            let authError: any = null;

            try {
                const adminRes = await supabaseAdmin.auth.admin.createUser({
                    email: adminEmail,
                    password: adminPassword,
                    email_confirm: true
                });
                authData = adminRes.data;
                authError = adminRes.error;
            } catch (e) {
                authError = e;
            }

            if (authError || !authData?.user) {
                const signUpRes = await supabaseAdmin.auth.signUp({
                    email: adminEmail,
                    password: adminPassword,
                });
                authData = signUpRes.data;
                authError = signUpRes.error;
            }

            if (authError) {
                const errLower = (authError.message || '').toLowerCase();
                if (errLower.includes('already registered') || errLower.includes('already exists') || authError.status === 422) {
                    const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
                        email: adminEmail,
                        password: adminPassword,
                    });
                    if (signInError) {
                        throw new Error("An account with this email already exists in Supabase, but the password provided was incorrect.");
                    }
                    uid = signInData.user?.id || '';
                } else {
                    throw authError;
                }
            } else {
                uid = authData.user?.id || '';
            }

            // 2. Sync Admin into Supabase 'employees' table
            try {
                const { data: existingEmps } = await supabaseAdmin
                    .from('employees')
                    .select('*')
                    .eq('email', adminEmail);

                if (existingEmps && existingEmps.length > 0) {
                    empId = existingEmps[0].empId || existingEmps[0].id;
                    await supabaseAdmin
                        .from('employees')
                        .update({
                            accessLevel: 'Administrator',
                            isEnabled: true,
                            isDeleted: false,
                            uid: uid || existingEmps[0].uid
                        })
                        .eq('email', adminEmail);
                } else {
                    const { data: allEmps } = await supabaseAdmin.from('employees').select('empId');
                    let highestId = 0;
                    if (allEmps) {
                        allEmps.forEach((emp: any) => {
                            if (emp.empId && emp.empId.startsWith('E')) {
                                const num = parseInt(emp.empId.substring(1));
                                if (!isNaN(num) && num > highestId) highestId = num;
                            }
                        });
                    }
                    empId = `E${(highestId + 1).toString().padStart(3, '0')}`;
                    await supabaseAdmin.from('employees').insert([{
                        id: empId,
                        empId,
                        firstName,
                        lastName,
                        email: adminEmail,
                        phone: 'N/A',
                        experience: 0,
                        accessLevel: 'Administrator',
                        avatar: 'https://placehold.co/40x40.png',
                        isDeleted: false,
                        isEnabled: true,
                        uid
                    }]);
                }
            } catch (dbErr) {
                console.warn('Could not write to native employees table:', dbErr);
            }

            // 3. Also sync into firebase_compat table if present
            try {
                const { data: existingCompat } = await supabaseAdmin
                    .from('firebase_compat')
                    .select('*')
                    .eq('collection_name', 'employees')
                    .eq('data->>email', adminEmail)
                    .single();

                if (existingCompat) {
                    const updatedData = { ...existingCompat.data, accessLevel: 'Administrator', isEnabled: true, isDeleted: false, uid };
                    await supabaseAdmin.from('firebase_compat').update({ data: updatedData }).eq('path', existingCompat.path);
                } else if (empId) {
                    await supabaseAdmin.from('firebase_compat').insert([{
                        path: `employees/${empId}`,
                        collection_name: 'employees',
                        project_id: null,
                        data: {
                            id: empId,
                            empId,
                            firstName,
                            lastName,
                            email: adminEmail,
                            phone: 'N/A',
                            experience: 0,
                            accessLevel: 'Administrator',
                            avatar: 'https://placehold.co/40x40.png',
                            isDeleted: false,
                            isEnabled: true,
                            uid
                        }
                    }]);
                }
            } catch (e) { }

        } else {
            // Firebase Initialization
            const { initializeApp, deleteApp } = await import('firebase/app');
            const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('firebase/auth');
            const { getFirestore, doc, setDoc, getDocs, collection, query, where } = await import('firebase/firestore');

            const tempConfig = { apiKey, projectId, authDomain: `${projectId}.firebaseapp.com` };
            const tempApp = initializeApp(tempConfig, 'server-wizard-app-' + Date.now());
            const tempAuth = getAuth(tempApp);
            const tempDb = getFirestore(tempApp);

            let isNewUser = true;

            try {
                const userCred = await createUserWithEmailAndPassword(tempAuth, adminEmail, adminPassword);
                uid = userCred.user.uid;
            } catch (authError: any) {
                if (authError.code === 'auth/email-already-in-use') {
                    try {
                        const userCred = await signInWithEmailAndPassword(tempAuth, adminEmail, adminPassword);
                        uid = userCred.user.uid;
                        isNewUser = false;
                    } catch (signInErr) { 
                        throw new Error("Admin email exists, but the password provided is incorrect."); 
                    }
                } else {
                    throw authError;
                }
            }

            // Sync with Firestore employees collection
            if (!isNewUser) {
                const q = query(collection(tempDb, 'employees'), where('email', '==', adminEmail));
                const qSnap = await getDocs(q);
                if (!qSnap.empty) {
                    const docSnap = qSnap.docs[0];
                    empId = docSnap.id;
                    await setDoc(doc(tempDb, 'employees', docSnap.id), { accessLevel: 'Administrator', isEnabled: true, isDeleted: false }, { merge: true });
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
                    empId,
                    firstName,
                    lastName,
                    email: adminEmail,
                    phone: 'N/A',
                    experience: 0,
                    accessLevel: 'Administrator',
                    avatar: 'https://placehold.co/40x40.png',
                    isDeleted: false,
                    isEnabled: true,
                    uid
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
                uid
            }
        });

    } catch (error: any) {
        console.error('Admin setup error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
