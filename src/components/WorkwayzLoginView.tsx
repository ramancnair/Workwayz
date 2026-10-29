'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2 } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { db } from '@/lib/db-provider';
import { supabase } from '@/lib/supabase';
import { signInWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { collection, query, where, getDocs, setRuntimeDbProvider } from '@/lib/db-provider';
import { WorkwayzBackground } from './WorkwayzBackground';
import { validateSession, markBrowserSessionActive, USER_STORAGE_KEY, ACTIVITY_STORAGE_KEY } from '@/lib/session';

export function WorkwayzLoginCard() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState('');
  const [setupNotice, setSetupNotice] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  // Set once the user starts typing so a late session check never yanks them off the form.
  const userInteractedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      if (emailParam) {
        setEmail(emailParam);
      }
      if (params.get('setup') === 'complete') {
        setSetupNotice(true);
      }
    }
  }, []);

  // If already logged in with a valid, non-expired, non-timed-out session, redirect to application
  useEffect(() => {
    try {
      const { isValid } = validateSession(true);
      if (isValid && !userInteractedRef.current) {
        const savedRoute = typeof window !== 'undefined' ? sessionStorage.getItem('workwayz_real_route') : null;
        const targetRoute = savedRoute && savedRoute !== '/' && savedRoute !== '/login' ? savedRoute : '/my-projects';
        router.replace(targetRoute);
        return;
      }
    } catch (_) {}
    setIsCheckingSession(false);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const emailInput = (document.getElementById('email') as HTMLInputElement)?.value;
      const passwordInput = (document.getElementById('password') as HTMLInputElement)?.value;

      // Fetch runtime config to determine active provider
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

      if (runtimeDbProvider) {
        setRuntimeDbProvider(runtimeDbProvider);
      }

      if (runtimeDbProvider === 'supabase' || runtimeAuthProvider === 'supabase') {
        if (!supabase) {
          throw new Error('Supabase is not initialized. Please check your database settings.');
        }

        // 1. Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: emailInput,
          password: passwordInput,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Could not log in with Supabase.');

        const user = authData.user;

        // 2. Fetch user profile from 'employees' collection
        const q = query(collection(db, 'employees'), where('email', '==', emailInput));
        const querySnapshot = await getDocs(q);

        const loginTimestamp = Date.now();
        let userData = {
          name: emailInput.split('@')[0],
          email: emailInput,
          accessLevel: 'Team Member',
          empId: user.id,
          avatar: '',
          uid: user.id,
        };

        let docNeedsReset = false;
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          const data = docSnap.data();
          docNeedsReset = !!data.needsPasswordReset;
          userData = {
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: data.email || emailInput,
            accessLevel: data.accessLevel || 'Team Member',
            empId: data.empId || docSnap.id || user.id,
            avatar: data.avatar || '',
            uid: user.id,
          };
        }

        const isDefaultPassword = passwordInput === 'P@ssw0rd';
        const requiresPasswordReset = isDefaultPassword || docNeedsReset;

        localStorage.setItem(
          USER_STORAGE_KEY,
          JSON.stringify({
            ...userData,
            authProvider: 'supabase',
            issuedAt: loginTimestamp,
            needsPasswordReset: requiresPasswordReset,
            rememberMe: rememberMe,
          })
        );
        localStorage.setItem(ACTIVITY_STORAGE_KEY, loginTimestamp.toString());

        if (!rememberMe) {
          markBrowserSessionActive();
        }
      } else {
        // Firebase Flow
        const userCredential = await signInWithEmailAndPassword(auth, emailInput, passwordInput);
        const user = userCredential.user;

        const q = query(collection(db, 'employees'), where('email', '==', emailInput));
        const querySnapshot = await getDocs(q);

        const loginTimestamp = Date.now();
        let userData = {
          name: emailInput.split('@')[0],
          email: emailInput,
          accessLevel: 'Team Member',
          empId: user.uid,
          avatar: '',
          uid: user.uid,
        };

        let data: any = {};
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          data = docSnap.data();
          userData = {
            name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
            email: data.email || emailInput,
            accessLevel: data.accessLevel || 'Team Member',
            empId: data.empId || docSnap.id || user.uid,
            avatar: data.avatar || '',
            uid: user.uid,
          };
        }

        if (data.status === 'Suspended') {
          await firebaseSignOut(auth);
          throw new Error('Your account is currently suspended. Please contact your administrator.');
        }

        localStorage.setItem(
          USER_STORAGE_KEY,
          JSON.stringify({
            ...userData,
            authProvider: 'firebase',
            issuedAt: loginTimestamp,
            needsPasswordReset: passwordInput === 'P@ssw0rd' || !!data.needsPasswordReset,
            rememberMe: rememberMe,
          })
        );
        localStorage.setItem(ACTIVITY_STORAGE_KEY, loginTimestamp.toString());

        if (!rememberMe) {
          markBrowserSessionActive();
        }
      }

      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      router.push('/my-projects');
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (
        error.code === 'auth/invalid-credential' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/user-not-found'
      ) {
        errorMessage = 'Invalid email or password. Please try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.message) {
        errorMessage = error.message.replace('Firebase: ', '');
      }

      toast({
        title: 'Login failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isCheckingSession) {
    return (
      <div className="w-full max-w-[400px] flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[400px]">
      {/* Login Card with Workwayz Branding (Forgot Password removed) */}
      <div className="w-full bg-[#0d1624]/95 backdrop-blur-xl border border-slate-700/60 shadow-2xl shadow-black/50 rounded-2xl p-6 sm:p-8 text-white">
        {/* Workwayz Brand Header inside card */}
        <div className="flex flex-col items-center mb-6 select-none">
          <div className="flex items-center gap-3 mb-1.5">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-md shadow-black/50 ring-1 ring-white/10">
              <Image
                src="/workwayz-icon.png"
                alt="Workwayz Logo"
                fill
                sizes="40px"
                className="object-cover"
                priority
              />
            </div>
            <span className="font-bold text-2xl sm:text-3xl tracking-tight text-white">
              Workwayz
            </span>
          </div>
          <span className="text-[11px] font-semibold tracking-wider text-emerald-400 uppercase">
            Workwayz.in
          </span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Log in to your account
          </h1>
          <p className="text-sm text-slate-400 mt-1.5">
            Enter your email and password below to login
          </p>
        </div>

        {setupNotice && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Setup completed successfully! Please sign in with your administrator credentials.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-slate-200">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              value={email}
              onChange={(e) => {
                userInteractedRef.current = true;
                setEmail(e.target.value);
              }}
              required
              className="bg-[#080f1a] border-slate-700/80 text-white placeholder:text-slate-500 h-11 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-slate-200">
              Password
            </Label>
            {/* Note: "Forgot password?" is intentionally omitted for admin-managed resets */}
            <Input
              id="password"
              type="password"
              onChange={() => {
                userInteractedRef.current = true;
              }}
              required
              className="bg-[#080f1a] border-slate-700/80 text-white h-11 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1 pb-1">
            <Checkbox
              id="remember-me"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(!!checked)}
              className="border-slate-600 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
            />
            <Label
              htmlFor="remember-me"
              className="text-sm font-normal text-slate-300 cursor-pointer select-none leading-none"
            >
              Remember me on this computer
            </Label>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#1d4ed8] via-[#0284c7] to-[#059669] hover:from-[#1e40af] hover:via-[#0369a1] hover:to-[#047857] text-white h-11 text-base font-medium shadow-lg shadow-emerald-950/40 rounded-lg transition-all cursor-pointer"
          >
            {isLoading ? 'Logging in...' : 'Log in'}
          </Button>

          <div className="text-center text-sm text-slate-400 pt-3">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-emerald-400 hover:text-emerald-300 hover:underline font-semibold">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export function WorkwayzLoginView() {
  return (
    <WorkwayzBackground>
      <WorkwayzLoginCard />
    </WorkwayzBackground>
  );
}
