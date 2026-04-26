import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { adminEmail, adminPassword, adminName, dbProvider, fbApiKey, fbProjectId } = body;

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

        if (!projectId) {
            return NextResponse.json({ success: false, error: 'Firebase Project ID is missing. Please configure it in the Database step.' }, { status: 400 });
        }
        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'Firebase API Key is missing. Please configure it in the Database step.' }, { status: 400 });
        }

        // Initialize Firebase on Server
        const { initializeApp, deleteApp } = await import('firebase/app');
        const { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } = await import('firebase/auth');
        const { getFirestore, doc, setDoc, getDocs, collection, query, where } = await import('firebase/firestore');

        const tempConfig = {
            apiKey,
            projectId,
            authDomain: `${projectId}.firebaseapp.com`,
        };

        const tempAppName = 'server-wizard-app-' + Date.now();
        const tempApp = initializeApp(tempConfig, tempAppName);
        const tempAuth = getAuth(tempApp);
        const tempDb = getFirestore(tempApp);

        // Create or Sign-in user in Auth
        let userCred;
        let isNewUser = true;
        try {
            userCred = await createUserWithEmailAndPassword(tempAuth, adminEmail, adminPassword);
        } catch (authError: any) {
            if (authError.code === 'auth/email-already-in-use') {
                try {
                    userCred = await signInWithEmailAndPassword(tempAuth, adminEmail, adminPassword);
                    isNewUser = false;
                } catch (signInErr: any) {
                    throw new Error("Admin email already exists, but the password provided is incorrect.");
                }
            } else {
                throw authError;
            }
        }

        let empId = '';
        const nameParts = (adminName || 'Admin User').trim().split(' ');
        let firstName = nameParts[0];
        let lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

        if (!isNewUser) {
             const q = query(collection(tempDb, 'employees'), where('email', '==', adminEmail));
             const qSnap = await getDocs(q);
             if (!qSnap.empty) {
                  const docSnap = qSnap.docs[0];
                  const data = docSnap.data();
                  empId = docSnap.id;
                  firstName = data.firstName || firstName;
                  lastName = data.lastName || lastName;
                  
                  if (data.accessLevel !== 'Administrator') {
                      await setDoc(doc(tempDb, 'employees', docSnap.id), { accessLevel: 'Administrator' }, { merge: true });
                  }
             }
        }

        if (!empId) {
            // Get next employee ID
            const usersSnapshot = await getDocs(collection(tempDb, 'employees'));
            let highestId = 0;
            usersSnapshot.forEach(docSnap => {
                const id = docSnap.id;
                if (id.startsWith('E')) {
                    const num = parseInt(id.substring(1));
                    if (!isNaN(num) && num > highestId) highestId = num;
                }
            });
            empId = `E${(highestId + 1).toString().padStart(3, '0')}`;

            // Write to Firestore
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
                uid: userCred.user.uid
            });
        }

        await deleteApp(tempApp);

        return NextResponse.json({ 
            success: true, 
            user: {
                name: `${firstName} ${lastName}`.trim(),
                email: adminEmail,
                accessLevel: 'Administrator',
                empId,
                uid: userCred.user.uid
            }
        });

    } catch (error: any) {
        console.error('Admin setup error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
