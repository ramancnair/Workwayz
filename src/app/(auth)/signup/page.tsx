'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LayoutDashboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
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
    if (!auth || !db) {
       toast({ title: 'Error', description: 'Firebase not initialized properly.', variant: 'destructive' });
       return;
    }

    setIsLoading(true);
    
    try {
      const nameInput = (document.getElementById('name') as HTMLInputElement)?.value || 'New User';
      const emailInput = (document.getElementById('email') as HTMLInputElement)?.value;
      const passwordInput = (document.getElementById('password') as HTMLInputElement)?.value;
      
      const nameParts = nameInput.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

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
            <Select value={accessLevel} onValueChange={setAccessLevel}>
              <SelectTrigger id="accessLevel">
                <SelectValue placeholder="Select Access Level" />
              </SelectTrigger>
              <SelectContent>
                {accessLevels.map(level => (
                  <SelectItem key={level} value={level}>{level}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
