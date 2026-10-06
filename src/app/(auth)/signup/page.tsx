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

      if (runtimeDbProvider === 'supabase') {
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
          avatar: '',
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
          avatar: '',
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
          avatar: '',
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

  return (
    <Card className="w-full max-w-lg shadow-2xl shadow-black/50 bg-[#0d1624]/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl text-white">
      <CardHeader className="space-y-3 text-center">
        <div className="flex flex-col items-center mb-1 select-none">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-md shadow-black/50 ring-1 ring-white/10">
              <img
                src="/workwayz-icon.png"
                alt="Workwayz Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="font-bold text-2xl tracking-tight text-white">Workwayz</span>
          </div>
          <span className="text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
            Workwayz.in
          </span>
        </div>
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription className="text-slate-400">
          Enter your information to get started
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-slate-200">First Name *</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="John"
                required
                className="bg-[#080f1a] border-slate-700/80 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-slate-200">Last Name *</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Doe"
                required
                className="bg-[#080f1a] border-slate-700/80 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="empId" className="text-slate-200">Emp ID *</Label>
              <Input
                id="empId"
                type="text"
                placeholder="E001"
                required
                className="bg-[#080f1a] border-slate-700/80 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-200">Phone *</Label>
              <Input
                id="phone"
                type="text"
                placeholder="123-456-7890"
                required
                className="bg-[#080f1a] border-slate-700/80 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="experience" className="text-slate-200">Experience (years) *</Label>
              <Input
                id="experience"
                type="number"
                placeholder="5"
                min="0"
                required
                className="bg-[#080f1a] border-slate-700/80 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-200">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                className="bg-[#080f1a] border-slate-700/80 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-200">Password *</Label>
            <Input
              id="password"
              type="password"
              required
              className="bg-[#080f1a] border-slate-700/80 text-white focus-visible:ring-emerald-500"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-[#1d4ed8] via-[#0284c7] to-[#059669] hover:from-[#1e40af] hover:via-[#0369a1] hover:to-[#047857] text-white font-medium shadow-lg shadow-emerald-950/40 rounded-lg"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Sign up'}
          </Button>
          <div className="text-center text-sm text-slate-400 content-center">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 hover:underline font-semibold">
              Log in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

