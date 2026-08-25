'use client';

import { useState } from 'react';
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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc, getDocs } from '@/lib/db-provider';
import Keycloak from 'keycloak-js';



export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const firstName = (document.getElementById('firstName') as HTMLInputElement)?.value.trim();
      const lastName = (document.getElementById('lastName') as HTMLInputElement)?.value.trim();
      const empId = (document.getElementById('empId') as HTMLInputElement)?.value.trim().toUpperCase();
      const emailInput = (document.getElementById('email') as HTMLInputElement)?.value.trim();
      const phone = (document.getElementById('phone') as HTMLInputElement)?.value.trim();
      const experience = parseInt((document.getElementById('experience') as HTMLInputElement)?.value || '0', 10);
      const passwordInput = (document.getElementById('password') as HTMLInputElement)?.value;

      if (!firstName || !lastName || !empId || !emailInput || !phone || isNaN(experience) || !passwordInput) {
        throw new Error("All fields are mandatory.");
      }

      const authProvider = process.env.NEXT_PUBLIC_AUTH_PROVIDER || 'supabase';

      // Override with runtime config to handle Docker standalone (NEXT_PUBLIC_ baked empty)
      let runtimeDbProvider = authProvider;
      try {
        const cfgRes = await fetch('/api/runtime-config');
        if (cfgRes.ok) {
          const cfg = await cfgRes.json();
          runtimeDbProvider = cfg.dbProvider || cfg.authProvider || authProvider;
        }
      } catch (_) { }

      if (runtimeDbProvider === 'keycloak') {
        throw new Error("Signup is managed by Keycloak. Please sign up via your organization's portal.");
      } else if (runtimeDbProvider === 'supabase') {
        if (!supabase) {
          throw new Error("Supabase is not initialized. Please check your Supabase URL and Key in the database settings.");
        }

        // Check if Employee ID already exists in Supabase
        const { data: employees, error: fetchError } = await supabase.from('employees').select('empId');
        if (fetchError) {
          console.warn("Could not fetch employees (table might not exist yet):", fetchError);
        }
        const isEmpIdTaken = employees?.some((emp: any) => emp.empId === empId);
        if (isEmpIdTaken) {
          throw new Error(`Employee ID ${empId} is already registered.`);
        }

        // 1. Create User in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: emailInput,
          password: passwordInput,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Could not create Supabase account.");

        const user = authData.user;

        // 3. Save to Supabase DB
        const newUser = {
          id: empId,
          empId,
          firstName,
          lastName,
          email: emailInput,
          phone,
          experience,
          avatar: 'https://placehold.co/40x40.png',
          isDeleted: false,
          isEnabled: false,
          uid: user.id
        };

        const { error: insertError } = await supabase.from('employees').insert([newUser]);
        if (insertError) {
          console.error("Supabase insert error:", JSON.stringify(insertError, null, 2));
          if (insertError.code === '42P01') {
            throw new Error("The 'employees' table does not exist in your Supabase database. Please create it first.");
          }
          throw new Error(`Database error: ${insertError.message || 'Failed to save user profile.'}`);
        }

        // 4. Update localStorage
        localStorage.setItem('projectflow_user', JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          email: emailInput,
          empId,
          avatar: '',
          uid: user.id,
          authProvider: 'supabase',
          issuedAt: Date.now(),
        }));
        localStorage.setItem('projectflow_last_activity', Date.now().toString());

      } else {
        if (!auth || !db) {
          throw new Error("Firebase not initialized properly.");
        }

        // Check if Employee ID already exists in Firestore
        const usersSnapshot = await getDocs(collection(db, 'employees'));
        const isEmpIdTaken = usersSnapshot.docs.some((docSnap: any) => docSnap.id === empId || docSnap.data().empId === empId);
        if (isEmpIdTaken) {
          throw new Error(`Employee ID ${empId} is already registered.`);
        }

        // 1. Create User in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
        const user = userCredential.user;

        // 3. Save to Firestore
        const newUser = {
          empId,
          firstName,
          lastName,
          email: emailInput,
          phone,
          experience,
          avatar: 'https://placehold.co/40x40.png',
          isDeleted: false,
          isEnabled: false,
          uid: user.uid
        };

        const userRef = doc(db, 'employees', empId);
        await setDoc(userRef, newUser);

        // 4. Update localStorage
        localStorage.setItem('projectflow_user', JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          email: emailInput,
          empId,
          avatar: 'https://placehold.co/40x40.png',
          uid: user.uid,
          authProvider: 'firebase',
          issuedAt: Date.now(),
        }));
        localStorage.setItem('projectflow_last_activity', Date.now().toString());
      }

      toast({
        title: "Account created!",
        description: "Welcome to ProjectFlow.",
      });
      router.push('/my-projects');
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: "Signup failed",
        description: error.message || "Could not create account.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeycloakRegister = async () => {
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

      await keycloak.init({ checkLoginIframe: false });
      await keycloak.register();
    } catch (error: any) {
      toast({ title: "Registration failed", description: error.message || "Could not redirect to Keycloak.", variant: "destructive" });
      setIsLoading(false);
    }
  };

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
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>
          Enter your information to get started
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'keycloak' ? (
            <div className="p-4 text-center text-sm text-muted-foreground border rounded-md bg-muted/20">
              Click the button below to create an account via your organization's portal.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" type="text" placeholder="John" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input id="lastName" type="text" placeholder="Doe" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="empId">Emp ID *</Label>
                  <Input id="empId" type="text" placeholder="E001" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone *</Label>
                  <Input id="phone" type="text" placeholder="123-456-7890" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience (years) *</Label>
                  <Input id="experience" type="number" placeholder="5" min="0" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" placeholder="m@example.com" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" required />
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          {process.env.NEXT_PUBLIC_AUTH_PROVIDER === 'keycloak' ? (
            <Button type="button" onClick={handleKeycloakRegister} className="w-full" disabled={isLoading}>
              {isLoading ? 'Redirecting...' : 'Register with Keycloak'}
            </Button>
          ) : (
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Sign up'}
            </Button>
          )}
          <div className="text-center text-sm text-muted-foreground content-center">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
