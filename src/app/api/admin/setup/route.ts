import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getProfilesPath, getEnvPath } from '@/lib/config-paths';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        let {
            adminEmail,
            adminPassword,
            adminName,
            adminFirstName,
            adminLastName,
            dbProvider,
            fbApiKey,
            fbProjectId,
            supaUrl,
            supaKey,
            authProvider,
            mode = 'create', // 'create' | 'existing'
            action = 'setup', // 'setup' | 'verify'
        } = body;

        if (!adminEmail || !adminPassword) {
            return NextResponse.json({ success: false, code: 'MISSING_FIELDS', error: 'Missing email or password' }, { status: 400 });
        }

        // Get unmasked firebase credentials
        let apiKey = (fbApiKey && !fbApiKey.includes('****')) ? fbApiKey : '';
        let projectId = (fbProjectId && !fbProjectId.includes('****')) ? fbProjectId : '';
        let effectiveSupaUrl = supaUrl || '';
        let effectiveSupaKey = supaKey || '';
        
        const profilesPath = getProfilesPath();
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
            const envPath = getEnvPath();
            if (fs.existsSync(envPath)) {
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

        const isLocal = authProvider === 'local' || dbProvider === 'local';
        const isSupabase = authProvider === 'supabase' || dbProvider === 'supabase';

        if (!isSupabase && !isLocal) {
            if (!projectId) {
                return NextResponse.json({ success: false, code: 'CONFIG_MISSING', error: 'Firebase Project ID is missing. Please configure it in the Database step.' }, { status: 400 });
            }
            if (!apiKey) {
                return NextResponse.json({ success: false, code: 'CONFIG_MISSING', error: 'Firebase API Key is missing. Please configure it in the Database step.' }, { status: 400 });
            }
        }

        let uid = '';
        let empId = '';
        let firstName = (adminFirstName || '').trim();
        let lastName = (adminLastName || '').trim();
        if (!firstName && adminName) {
            const nameParts = adminName.trim().split(' ');
            firstName = nameParts[0] || 'Super';
            lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Admin';
        }
        if (!firstName) firstName = 'Super';
        if (!lastName) lastName = 'Admin';

        const isExistingMode = mode === 'existing' || action === 'verify';

        if (isSupabase || isLocal) {
            let supabaseAdmin: any;
            if (isLocal) {
                const { localSupabaseClient } = await import('@/lib/local-supabase-shim');
                supabaseAdmin = localSupabaseClient;
            } else {
                const { createClient } = await import('@supabase/supabase-js');
                
                const finalSupaUrl = effectiveSupaUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                const finalSupaKey = effectiveSupaKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

                if (!finalSupaUrl || !finalSupaKey) {
                    return NextResponse.json({ success: false, code: 'CONFIG_MISSING', error: 'Supabase URL or Publishable Key is missing.' }, { status: 400 });
                }

                supabaseAdmin = createClient(finalSupaUrl, finalSupaKey);
            }

            if (isExistingMode) {
                // Authenticate existing credentials
                const { data: signInData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
                    email: adminEmail,
                    password: adminPassword,
                });

                if (signInError || !signInData?.user) {
                    return NextResponse.json({
                        success: false,
                        code: 'AUTH_FAILED',
                        error: 'Invalid email or password for existing database.'
                    }, { status: 400 });
                }

                uid = signInData.user.id;

                // Check employee profile in database
                const { data: existingEmps, error: empQueryErr } = await supabaseAdmin
                    .from('employees')
                    .select('*')
                    .eq('email', adminEmail);

                if (empQueryErr || !existingEmps || existingEmps.length === 0) {
                    return NextResponse.json({
                        success: false,
                        code: 'NOT_SUPER_ADMIN',
                        currentRole: 'None',
                        error: 'This account was authenticated, but no employee record was found in the database. Only existing Super Admins can be linked.'
                    }, { status: 400 });
                }

                const emp = existingEmps[0];
                if (emp.accessLevel !== 'Super Admin') {
                    return NextResponse.json({
                        success: false,
                        code: 'NOT_SUPER_ADMIN',
                        currentRole: emp.accessLevel || 'User',
                        error: `This account exists with the role "${emp.accessLevel || 'User'}", not "Super Admin". Only existing Super Admins can be linked.`
                    }, { status: 400 });
                }

                firstName = emp.firstName || firstName;
                lastName = emp.lastName || lastName;
                empId = emp.empId || emp.id;

                // If executing setup, ensure the Super Admin is enabled
                if (action === 'setup') {
                    try {
                        await supabaseAdmin
                            .from('employees')
                            .update({ isEnabled: true, isDeleted: false, uid })
                            .eq('email', adminEmail);
                    } catch (_) {}
                }

                return NextResponse.json({
                    success: true,
                    isExisting: true,
                    user: {
                        name: `${firstName} ${lastName}`.trim() || 'Super Admin',
                        firstName,
                        lastName,
                        email: adminEmail,
                        accessLevel: 'Super Admin',
                        empId,
                        uid
                    }
                });
            }

            // Fresh Creation Flow
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
                    return NextResponse.json({
                        success: false,
                        code: 'EMAIL_EXISTS',
                        error: 'An account with this email already exists in the database. Please select "Use Existing Credentials" or choose a different email.'
                    }, { status: 400 });
                }
                throw authError;
            }

            uid = authData.user?.id || '';

            // Sync Admin into Supabase 'employees' table
            try {
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
                    accessLevel: 'Super Admin',
                    avatar: 'https://placehold.co/40x40.png',
                    isDeleted: false,
                    isEnabled: true,
                    uid
                }]);
            } catch (dbErr) {
                console.warn('Could not write to native employees table:', dbErr);
            }
        } else {
            // Firebase Initialization
            const { initializeApp, deleteApp } = await import('firebase/app');
            const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('firebase/auth');
            const { getFirestore, doc, setDoc, getDocs, collection, query, where } = await import('firebase/firestore');

            const tempConfig = { apiKey, projectId, authDomain: `${projectId}.firebaseapp.com` };
            const tempApp = initializeApp(tempConfig, 'server-wizard-app-' + Date.now());
            const tempAuth = getAuth(tempApp);
            const tempDb = getFirestore(tempApp);

            if (isExistingMode) {
                let userCred: any = null;
                try {
                    userCred = await signInWithEmailAndPassword(tempAuth, adminEmail, adminPassword);
                    uid = userCred.user.uid;
                } catch (signInErr: any) {
                    try { await deleteApp(tempApp); } catch (_) {}
                    return NextResponse.json({
                        success: false,
                        code: 'AUTH_FAILED',
                        error: 'Invalid email or password for existing database.'
                    }, { status: 400 });
                }

                // Query Firestore employees collection
                const q = query(collection(tempDb, 'employees'), where('email', '==', adminEmail));
                const qSnap = await getDocs(q);

                if (qSnap.empty) {
                    try { await deleteApp(tempApp); } catch (_) {}
                    return NextResponse.json({
                        success: false,
                        code: 'NOT_SUPER_ADMIN',
                        currentRole: 'None',
                        error: 'This account was authenticated, but no employee record was found in Firestore. Only existing Super Admins can be linked.'
                    }, { status: 400 });
                }

                const docSnap = qSnap.docs[0];
                const empData = docSnap.data();

                if (empData.accessLevel !== 'Super Admin') {
                    try { await deleteApp(tempApp); } catch (_) {}
                    return NextResponse.json({
                        success: false,
                        code: 'NOT_SUPER_ADMIN',
                        currentRole: empData.accessLevel || 'User',
                        error: `This account exists with the role "${empData.accessLevel || 'User'}", not "Super Admin". Only existing Super Admins can be linked.`
                    }, { status: 400 });
                }

                firstName = empData.firstName || firstName;
                lastName = empData.lastName || lastName;
                empId = empData.empId || docSnap.id;

                if (action === 'setup') {
                    try {
                        await setDoc(doc(tempDb, 'employees', docSnap.id), {
                            isEnabled: true,
                            isDeleted: false,
                            uid
                        }, { merge: true });
                    } catch (_) {}
                }

                try { await deleteApp(tempApp); } catch (_) {}

                return NextResponse.json({
                    success: true,
                    isExisting: true,
                    user: {
                        name: `${firstName} ${lastName}`.trim() || 'Super Admin',
                        firstName,
                        lastName,
                        email: adminEmail,
                        accessLevel: 'Super Admin',
                        empId,
                        uid
                    }
                });
            }

            // Fresh Creation Flow
            try {
                const userCred = await createUserWithEmailAndPassword(tempAuth, adminEmail, adminPassword);
                uid = userCred.user.uid;
            } catch (authError: any) {
                try { await deleteApp(tempApp); } catch (_) {}
                if (authError.code === 'auth/email-already-in-use') {
                    return NextResponse.json({
                        success: false,
                        code: 'EMAIL_EXISTS',
                        error: 'An account with this email already exists in the database. Please select "Use Existing Credentials" or choose a different email.'
                    }, { status: 400 });
                }
                throw authError;
            }

            let highestId = 0;
            try {
                const usersSnapshot = await getDocs(collection(tempDb, 'employees'));
                usersSnapshot.forEach(docSnap => {
                    if (docSnap.id.startsWith('E')) {
                        const num = parseInt(docSnap.id.substring(1));
                        if (!isNaN(num) && num > highestId) highestId = num;
                    }
                });
            } catch (e) {
                console.warn('Could not query employees collection:', e);
            }
            empId = `E${(highestId + 1).toString().padStart(3, '0')}`;
            try {
                await setDoc(doc(tempDb, 'employees', empId), {
                    empId,
                    firstName,
                    lastName,
                    email: adminEmail,
                    phone: 'N/A',
                    experience: 0,
                    accessLevel: 'Super Admin',
                    avatar: 'https://placehold.co/40x40.png',
                    isDeleted: false,
                    isEnabled: true,
                    uid
                });
            } catch (dbErr) {
                console.warn('Could not write employee to Firestore:', dbErr);
            }

            try {
                await deleteApp(tempApp);
            } catch (_) {}
        }

        return NextResponse.json({ 
            success: true, 
            user: {
                name: `${firstName} ${lastName}`.trim(),
                firstName,
                lastName,
                email: adminEmail,
                accessLevel: 'Super Admin',
                empId,
                uid
            }
        });

    } catch (error: any) {
        console.error('Admin setup error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
