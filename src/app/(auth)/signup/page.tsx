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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';

const accessLevels = ['Administrator', 'Senior Management', 'Project Manager', 'Lead', 'Team Member', 'PMO'];

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [accessLevel, setAccessLevel] = useState<string>('Team Member');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const nameInput = (document.getElementById('name') as HTMLInputElement)?.value || 'New User';
      const emailInput = (document.getElementById('email') as HTMLInputElement)?.value;
      const passwordInput = (document.getElementById('password') as HTMLInputElement)?.value;
      
      const nameParts = nameInput.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      const dbProvider = process.env.NEXT_PUBLIC_DATABASE_PROVIDER || 'firebase';

      if (dbProvider === 'supabase') {
        if (!supabase) {
           throw new Error("Supabase is not initialized. Please check your Supabase URL and Key in the database settings.");
        }

        // 1. Create User in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: emailInput,
          password: passwordInput,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Could not create Supabase account.");

        const user = authData.user;

        // 2. Determine highest empId
        const { data: employees, error: fetchError } = await supabase.from('employees').select('empId');
        if (fetchError) {
             console.warn("Could not fetch employees (table might not exist yet):", fetchError);
        }
        
        let highestId = 0;
        if (employees) {
            employees.forEach((emp: any) => {
                if (emp.empId && emp.empId.startsWith('E')) {
                    const numPart = parseInt(emp.empId.substring(1));
                    if (!isNaN(numPart) && numPart > highestId) {
                        highestId = numPart;
                    }
                }
            });
        }
        const currentIdCounter = highestId + 1;
        const empId = `E${currentIdCounter.toString().padStart(3, '0')}`;

        // 3. Save to Supabase DB
        const newUser = {
            id: empId,
            empId,
            firstName,
            lastName,
            email: emailInput,
            phone: 'N/A',
            experience: 0,
            accessLevel: accessLevel,
            avatar: 'https://placehold.co/40x40.png',
            isDeleted: false,
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
          accessLevel: accessLevel,
          empId,
          uid: user.id
        }));

      } else {
        if (!auth || !db) {
            throw new Error("Firebase not initialized properly.");
        }

        // 1. Create User in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, emailInput, passwordInput);
        const user = userCredential.user;

        // 2. Determine highest empId
        const usersSnapshot = await getDocs(collection(db, 'employees'));
        let highestId = 0;
        usersSnapshot.forEach(docSnap => {
            const empId = docSnap.id;
            if (empId.startsWith('E')) {
                const numPart = parseInt(empId.substring(1));
                if (!isNaN(numPart) && numPart > highestId) {
                    highestId = numPart;
                }
            }
        });
        const currentIdCounter = highestId + 1;
        const empId = `E${currentIdCounter.toString().padStart(3, '0')}`;

        // 3. Save to Firestore
        const newUser = {
            empId,
            firstName,
            lastName,
            email: emailInput,
            phone: 'N/A',
            experience: 0,
            accessLevel: accessLevel,
            avatar: 'https://placehold.co/40x40.png',
            isDeleted: false,
            uid: user.uid
        };
        
        const userRef = doc(db, 'employees', empId);
        await setDoc(userRef, newUser);
        
        // 4. Update localStorage
        localStorage.setItem('projectflow_user', JSON.stringify({
          name: `${firstName} ${lastName}`.trim(),
          email: emailInput,
          accessLevel: accessLevel,
          empId,
          uid: user.uid
        }));
      }

      toast({
        title: "Account created!",
        description: "Welcome to ProjectFlow.",
      });
      router.push('/project-home');
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
           <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" type="text" placeholder="John Doe" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="m@example.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accessLevel">Access Level</Label>
            <select
              id="accessLevel"
              value={accessLevel}
              onChange={(e) => setAccessLevel(e.target.value)}
              className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center' }}
            >
              {accessLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Sign up'}
          </Button>
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
