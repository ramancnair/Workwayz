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
import { auth, db } from '@/lib/firebase';
import { supabase } from '@/lib/supabase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!process.env.NEXT_PUBLIC_DATABASE_PROVIDER && (!auth || !db)) {
       toast({ title: 'Error', description: 'Database not configured properly.', variant: 'destructive' });
       return;
    }

    setIsLoading(true);
    
    try {
      const emailInput = (document.getElementById('email') as HTMLInputElement)?.value;
      const passwordInput = (document.getElementById('password') as HTMLInputElement)?.value;
      
      const dbProvider = process.env.NEXT_PUBLIC_DATABASE_PROVIDER || 'firebase';

      if (dbProvider === 'supabase') {
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

        // 2. Fetch user profile from Supabase 'employees' collection
        const { data: employees, error: fetchError } = await supabase
          .from('employees')
          .select('*')
          .eq('email', emailInput);

        let userData = {
          name: emailInput.split('@')[0],
          email: emailInput,
          accessLevel: 'Team Member',
          empId: '',
          uid: user.id
        };

        if (employees && employees.length > 0) {
          const data = employees[0];
          userData = {
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: data.email || emailInput,
            accessLevel: data.accessLevel || 'Team Member',
            empId: data.empId || data.id,
            uid: user.id
          };
        }

        // 3. Update localStorage
        localStorage.setItem('projectflow_user', JSON.stringify(userData));

      } else {
        if (!auth || !db) {
            throw new Error("Firebase not initialized properly.");
        }

        // 1. Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, emailInput, passwordInput);
        const user = userCredential.user;

        // 2. Fetch user profile from Firestore 'employees' collection
        const q = query(collection(db, 'employees'), where('email', '==', emailInput));
        const querySnapshot = await getDocs(q);
        
        let userData = {
          name: emailInput.split('@')[0],
          email: emailInput,
          accessLevel: 'Team Member',
          empId: '',
          uid: user.uid
        };
        
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const data = docSnap.data();
          userData = {
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: data.email || emailInput,
            accessLevel: data.accessLevel || 'Team Member',
            empId: data.empId || docSnap.id,
            uid: user.uid
          };
        }

        // 3. Update localStorage
        localStorage.setItem('projectflow_user', JSON.stringify(userData));
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      router.push('/project-home');
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
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Log in'}
          </Button>
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
