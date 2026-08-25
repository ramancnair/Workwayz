'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LayoutDashboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { db } from '@/lib/db-provider';
import { supabase } from '@/lib/supabase';
import { signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc } from '@/lib/db-provider';
import Keycloak from 'keycloak-js';
import { Checkbox } from '@/components/ui/checkbox';

const determineAccessLevel = (keycloak: any) => {
    const roles = keycloak.realmAccess?.roles || [];
    const lowerRoles = roles.map((r: string) => r.toLowerCase());
    
    if (lowerRoles.includes('admin') || lowerRoles.includes('administrator')) return 'Administrator';
    if (lowerRoles.includes('senior management') || lowerRoles.includes('seniormanagement')) return 'Senior Management';
    if (lowerRoles.includes('project manager') || lowerRoles.includes('pm')) return 'Project Manager';
    if (lowerRoles.includes('lead')) return 'Lead';
    if (lowerRoles.includes('pmo')) return 'PMO';
    
    return 'Team Member'; // Default for Dev, QA, or unassigned
};

const syncKeycloakUserWithDatabase = async (userProfile: any, accessLevel: string, subject: string) => {
    let empId = subject;
    let finalUserData = {
        name: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.username,
        email: userProfile.email,
        accessLevel: accessLevel,
        empId: subject,
        uid: subject
    };

    if (false) {
        // Obsolete separate path for supabase. We now use the polyfill for everything!
    } else {
        if (!db) return finalUserData;
        const q = query(collection(db, 'employees'), where('email', '==', userProfile.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const data = docSnap.data();
            return {
                name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || userProfile.username,
                email: data.email || userProfile.email,
                accessLevel: data.accessLevel || accessLevel,
                empId: docSnap.id,
                uid: subject
            };
        }
        
        // Create new user in Firestore
        const usersSnapshot = await getDocs(collection(db, 'employees'));
        let highestId = 0;
        usersSnapshot.forEach((docSnap: any) => {
            const id = docSnap.id;
            if (id.startsWith('E')) {
                const numPart = parseInt(id.substring(1));
                if (!isNaN(numPart) && numPart > highestId) highestId = numPart;
            }
        });
        empId = `E${(highestId + 1).toString().padStart(3, '0')}`;
        
        const firstName = userProfile.firstName || userProfile.username || 'Keycloak User';
        const lastName = userProfile.lastName || '';
        
        await setDoc(doc(db, 'employees', empId), {
            empId,
            firstName,
            lastName,
            email: userProfile.email,
            phone: 'N/A',
            experience: 0,
            accessLevel,
            avatar: 'https://placehold.co/40x40.png',
            isDeleted: false,
            uid: subject
        });
        
        return { name: `${firstName} ${lastName}`.trim(), email: userProfile.email, accessLevel, empId, uid: subject };
    }
};

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const emailInput = (document.getElementById('email') as HTMLInputElement)?.value;
      const passwordInput = (document.getElementById('password') as HTMLInputElement)?.value;

      // Fetch runtime config to determine active provider (avoids NEXT_PUBLIC_ build-time baking issue)
      let runtimeDbProvider = 'supabase';
      let runtimeAuthProvider = 'supabase';
      try {
        const cfgRes = await fetch('/api/runtime-config');
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          runtimeDbProvider = cfg.dbProvider || 'supabase';
          runtimeAuthProvider = cfg.authProvider || cfg.dbProvider || 'supabase';
        }
      } catch (_) {}

      if (runtimeAuthProvider === 'keycloak') {
         throw new Error("Keycloak should use the dedicated login button.");
      } else if (runtimeDbProvider === 'supabase') {
        if (!supabase) {
           throw new Error("Supabase is not initialized. Please check your Supabase URL and Key in the database settings.");
        }

        // 1. Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: emailInput,
          password: passwordInput,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Could not log in with Supabase.");

        const user = authData.user;

        // 2. Fetch user profile from 'employees' collection using polyfill
        const q = query(collection(db, 'employees'), where('email', '==', emailInput));
        const querySnapshot = await getDocs(q);

        let userData = {
          name: emailInput.split('@')[0],
          email: emailInput,
          accessLevel: 'Team Member',
          empId: '',
          avatar: '',
          uid: user.id
        };

        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const data = docSnap.data();
          userData = {
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: data.email || emailInput,
            accessLevel: data.accessLevel || 'Team Member',
            empId: data.empId || docSnap.id,
            avatar: data.avatar || '',
            uid: user.id
          };
        }

        // 3. Update localStorage
        localStorage.setItem('projectflow_user', JSON.stringify({
          ...userData,
          authProvider: 'supabase',
          issuedAt: Date.now(),
          needsPasswordReset: passwordInput === 'P@ssw0rd',
          rememberMe: rememberMe
        }));
        localStorage.setItem('projectflow_last_activity', Date.now().toString());

        if (!rememberMe) {
          document.cookie = "projectflow_session_active=true; path=/";
        }

      } else {
        if (!auth || !db) {
            throw new Error("Firebase not initialized properly.");
        }

        // 1. Sign in with Firebase Auth (password verification only)
        const userCredential = await signInWithEmailAndPassword(auth, emailInput, passwordInput);
        const user = userCredential.user;

        // 2. Cross-reference against the app's employees collection.
        //    Firebase Auth is ONLY used for password verification.
        //    If the user has no employee record, they are not authorised
        //    to access this application — revoke the Firebase session immediately.
        const q = query(collection(db, 'employees'), where('email', '==', emailInput));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          // Revoke the Firebase session so the user can't exploit it later
          await firebaseSignOut(auth);
          throw new Error('Your account is not registered in this system. Please contact your administrator.');
        }

        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        const userData = {
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || emailInput.split('@')[0],
          email: data.email || emailInput,
          accessLevel: data.accessLevel || 'Team Member',
          empId: data.empId || docSnap.id,
          avatar: data.avatar || '',
          uid: user.uid
        };

        // 3. Write session only after DB authorisation confirmed
        localStorage.setItem('projectflow_user', JSON.stringify({
          ...userData,
          authProvider: 'firebase',
          issuedAt: Date.now(),
          needsPasswordReset: passwordInput === 'P@ssw0rd',
          rememberMe: rememberMe
        }));
        localStorage.setItem('projectflow_last_activity', Date.now().toString());

        if (!rememberMe) {
          document.cookie = "projectflow_session_active=true; path=/";
        }
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('user-profile-updated'));
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      router.push('/my-projects');
    } catch (error: any) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        errorMessage = "Invalid email or password. Please try again.";
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many failed attempts. Please try again later.";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Please enter a valid email address.";
      } else if (error.message) {
        errorMessage = error.message.replace('Firebase: ', '');
      }

      toast({
        title: "Login failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeycloakLogin = async () => {
    setIsLoading(true);
    try {
        const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL;
        const keycloakRealm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
        const keycloakClientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
        
        if (!keycloakUrl || !keycloakRealm || !keycloakClientId) {
             throw new Error("Keycloak configuration is missing.");
        }

        const keycloak = new Keycloak({
            url: keycloakUrl,
            realm: keycloakRealm,
            clientId: keycloakClientId
        });

        // Initialize keycloak first, without forcing redirect on load
        const authenticated = await keycloak.init({ checkLoginIframe: false });
        
        if (!authenticated) {
             // Force redirect to Keycloak login page
             await keycloak.login();
        } else {
            // If already authenticated (e.g. they hit the button after returning from a redirect)
            const userProfile = await keycloak.loadUserProfile();
            const level = determineAccessLevel(keycloak);
            const userData = await syncKeycloakUserWithDatabase(userProfile, level, keycloak.subject || '');
            
            localStorage.setItem('projectflow_user', JSON.stringify({
              ...userData,
              authProvider: 'keycloak',
              issuedAt: Date.now(),
            }));
            localStorage.setItem('projectflow_last_activity', Date.now().toString());
            toast({ title: "Welcome back!", description: "You have successfully logged in via Keycloak." });
            router.push('/my-projects');
        }
    } catch (error: any) {
        toast({ title: "Login failed", description: error.message || "Could not authenticate with Keycloak.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
     if (process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'keycloak') {
         // Always initialize on load to catch hash fragments (#state=..., #code=...)
         const keycloakUrl = process.env.NEXT_PUBLIC_KEYCLOAK_URL;
         const keycloakRealm = process.env.NEXT_PUBLIC_KEYCLOAK_REALM;
         const keycloakClientId = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID;
         
         if (keycloakUrl && keycloakRealm && keycloakClientId) {
             const keycloak = new Keycloak({
                 url: keycloakUrl,
                 realm: keycloakRealm,
                 clientId: keycloakClientId
             });

             keycloak.init({ checkLoginIframe: false }).then(authenticated => {
                 if (authenticated) {
                     keycloak.loadUserProfile().then(async userProfile => {
                         const level = determineAccessLevel(keycloak);
                         const userData = await syncKeycloakUserWithDatabase(userProfile, level, keycloak.subject || '');
                         
                         localStorage.setItem('projectflow_user', JSON.stringify({
                           ...userData,
                           authProvider: 'keycloak',
                           issuedAt: Date.now(),
                         }));
                         localStorage.setItem('projectflow_last_activity', Date.now().toString());
                         toast({ title: "Welcome back!", description: "You have successfully logged in via Keycloak." });
                         router.push('/my-projects');
                     });
                 }
             }).catch(e => {
                 console.error("Keycloak auto-login failed", e);
             });
         }
     }
  }, []);

  return (
    <Card className="w-full shadow-lg border-border/50">
      <CardHeader className="space-y-3 text-center">
        <div className="flex justify-center mb-2">
            <Link href="/" className="inline-flex items-center gap-2">
               <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
                  <LayoutDashboard className="h-5 w-5" />
               </div>
               <span className="font-bold text-xl">ProjectFlow</span>
            </Link>
        </div>
        <CardTitle className="text-2xl font-bold">Log in to your account</CardTitle>
        <CardDescription>
          Enter your email and password below to login
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'keycloak' ? (
              <div className="p-4 text-center text-sm text-muted-foreground border rounded-md bg-muted/20">
                  Authentication is managed by Keycloak. Click the button below to sign in via your organization's portal.
              </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="m@example.com" required />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="#" className="text-sm font-medium text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input id="password" type="password" required />
              </div>
              <div className="flex items-center space-x-2 pt-1">
                <Checkbox 
                  id="remember-me" 
                  checked={rememberMe} 
                  onCheckedChange={(checked) => setRememberMe(!!checked)} 
                />
                <Label htmlFor="remember-me" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                  Remember me on this computer
                </Label>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          {process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'keycloak' ? (
              <Button type="button" onClick={handleKeycloakLogin} className="w-full" disabled={isLoading}>
                {isLoading ? 'Redirecting...' : 'Sign in with Keycloak'}
              </Button>
          ) : (
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Log in'}
              </Button>
          )}
          <div className="text-center text-sm text-muted-foreground content-center">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
