import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { email, accessLevel, firstName, lastName } = body;
        
        const authProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'firebase';
        const dbProvider = process.env.NEXT_PUBLIC_DATABASE_PROVIDER || 'firebase';
        
        if (authProvider === 'keycloak') {
            const keycloakUrl = (process.env.NEXT_PUBLIC_KEYCLOAK_URL || '').replace(/\/$/, '');
            const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
            const adminSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;
            const clientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'projectflow-admin';
            
            if (!keycloakUrl || !realm || !adminSecret) {
                return NextResponse.json({ error: 'Keycloak admin configuration is missing in the environment variables.' }, { status: 500 });
            }
            
            // 1. Get Admin Token
            const tokenParams = new URLSearchParams();
            tokenParams.append('client_id', clientId);
            tokenParams.append('client_secret', adminSecret);
            tokenParams.append('grant_type', 'client_credentials');
            
            const tokenRes = await fetch(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: tokenParams.toString()
            });
            
            if (!tokenRes.ok) {
                const text = await tokenRes.text();
                throw new Error(`Failed to get Keycloak token: ${text}`);
            }
            
            const tokenData = await tokenRes.json();
            const token = tokenData.access_token;
            
            // 2. Create User
            const userPayload = {
                username: email,
                email: email,
                firstName: firstName || 'New',
                lastName: lastName || 'User',
                enabled: true,
                credentials: [{
                    type: 'password',
                    value: 'P@ssw0rd',
                    temporary: false
                }]
            };
            
            const createRes = await fetch(`${keycloakUrl}/admin/realms/${realm}/users`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userPayload)
            });
            
            if (!createRes.ok && createRes.status !== 409) { // 409 = Conflict (User already exists)
                const text = await createRes.text();
                throw new Error(`Failed to create Keycloak user: ${text}`);
            }
            
            // 3. Look up user ID to assign roles
            const userLookupRes = await fetch(`${keycloakUrl}/admin/realms/${realm}/users?email=${encodeURIComponent(email)}&exact=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            const users = await userLookupRes.json();
            if (!users || users.length === 0) {
                 throw new Error("User was created but could not be found to assign roles.");
            }
            
            const userId = users[0].id;
            
            // 4. Assign Role (if accessLevel provided)
            if (accessLevel) {
                 const targetRole = accessLevel;
                 
                 let roleRes = await fetch(`${keycloakUrl}/admin/realms/${realm}/roles/${encodeURIComponent(targetRole)}`, {
                     headers: { 'Authorization': `Bearer ${token}` }
                 });
                 
                 if (!roleRes.ok && roleRes.status === 404) {
                     await fetch(`${keycloakUrl}/admin/realms/${realm}/roles`, {
                         method: 'POST',
                         headers: {
                             'Authorization': `Bearer ${token}`,
                             'Content-Type': 'application/json'
                         },
                         body: JSON.stringify({ name: targetRole })
                     });
                     
                     roleRes = await fetch(`${keycloakUrl}/admin/realms/${realm}/roles/${encodeURIComponent(targetRole)}`, {
                         headers: { 'Authorization': `Bearer ${token}` }
                     });
                 }
                 
                 if (roleRes.ok) {
                     const roleData = await roleRes.json();
                     
                     // Fetch and remove existing managed roles before assigning the new one
                     const existingRolesRes = await fetch(`${keycloakUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
                         headers: { 'Authorization': `Bearer ${token}` }
                     });
                     
                     if (existingRolesRes.ok) {
                         const existingRoles = await existingRolesRes.json();
                         const managedRoles = ['Administrator', 'Senior Management', 'Project Manager', 'Lead', 'Team Member', 'PMO'];
                         const rolesToRemove = existingRoles.filter((r: any) => managedRoles.includes(r.name) && r.name !== targetRole);
                         
                         if (rolesToRemove.length > 0) {
                             await fetch(`${keycloakUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
                                 method: 'DELETE',
                                 headers: {
                                     'Authorization': `Bearer ${token}`,
                                     'Content-Type': 'application/json'
                                 },
                                 body: JSON.stringify(rolesToRemove.map((r: any) => ({ id: r.id, name: r.name })))
                             });
                         }
                     }
                     
                     await fetch(`${keycloakUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`, {
                         method: 'POST',
                         headers: {
                             'Authorization': `Bearer ${token}`,
                             'Content-Type': 'application/json'
                         },
                         body: JSON.stringify([{
                             id: roleData.id,
                             name: roleData.name
                         }])
                     });
                 } else {
                     console.warn(`Role ${targetRole} could not be found or created in Keycloak.`);
                 }
            }
            
            return NextResponse.json({ success: true, message: 'Keycloak identity provisioned successfully' });
            
        } else {
            // Legacy Firebase/Supabase implementation
            if (dbProvider === 'supabase') {
                 if (!supabase) return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
                 
                 // Supabase Admin API to create user without logging in
                 // Warning: service_role key required for admin user creation.
                 // Assuming anon key for now (might not work depending on supabase settings, but matching original behavior)
                 const { error } = await supabase.auth.signUp({
                    email,
                    password: 'P@ssw0rd',
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
                    body: JSON.stringify({ email, password: 'P@ssw0rd', returnSecureToken: false })
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

        const authProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'firebase';
        const dbProvider = process.env.NEXT_PUBLIC_DATABASE_PROVIDER || 'firebase';

        if (authProvider === 'keycloak') {
            const keycloakUrl = (process.env.NEXT_PUBLIC_KEYCLOAK_URL || '').replace(/\/$/, '');
            const realm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
            const adminSecret = process.env.KEYCLOAK_ADMIN_CLIENT_SECRET;
            const clientId = process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'projectflow-admin';
            
            if (!keycloakUrl || !realm || !adminSecret) return NextResponse.json({ error: 'Keycloak config missing' }, { status: 500 });

            // 1. Get Token
            const tokenParams = new URLSearchParams();
            tokenParams.append('client_id', clientId);
            tokenParams.append('client_secret', adminSecret);
            tokenParams.append('grant_type', 'client_credentials');
            
            const tokenRes = await fetch(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: tokenParams.toString()
            });
            if (!tokenRes.ok) throw new Error('Failed to get token');
            const token = (await tokenRes.json()).access_token;

            // 2. Lookup user ID
            const lookupRes = await fetch(`${keycloakUrl}/admin/realms/${realm}/users?email=${encodeURIComponent(email)}&exact=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const users = await lookupRes.json();
            if (!users || users.length === 0) return NextResponse.json({ success: true, message: 'User not found in Keycloak' });

            // 3. Delete user
            const deleteRes = await fetch(`${keycloakUrl}/admin/realms/${realm}/users/${users[0].id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!deleteRes.ok) throw new Error('Failed to delete user');

            return NextResponse.json({ success: true, message: 'Keycloak user deleted' });
        } else {
            // Firebase / Supabase deletions would go here, 
            // but for Firebase we'd need firebase-admin SDK which isn't fully set up for deletion here.
            // For now, we return success so it doesn't block Firestore deletion.
            return NextResponse.json({ success: true, message: 'Auth provider ignored or not implemented' });
        }
    } catch (e: any) {
        console.error("User deletion API error:", e);
        return NextResponse.json({ success: false, error: e.message || 'Unknown error' }, { status: 500 });
    }
}
