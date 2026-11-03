'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Database, Key, Bot, ArrowRight, ArrowLeft, CheckCircle2, User, X, Save, Eye, EyeOff, UserPlus, KeyRound, AlertTriangle, AlertCircle, ShieldCheck, ShieldAlert, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearSession } from '@/lib/session';

export function SetupWizard({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isFirstRun, setIsFirstRun] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  // Profile IDs for editing
  const [dbProfileId, setDbProfileId] = useState<string>('');
  const [authProfileId, setAuthProfileId] = useState<string>('');
  const [aiProfileId, setAiProfileId] = useState<string>('');

  // DB State
  const [dbProjectName, setDbProjectName] = useState('Local Workspace DB');
  const [dbProvider, setDbProvider] = useState('local');
  const [fbProjectId, setFbProjectId] = useState('');
  const [fbApiKey, setFbApiKey] = useState('');
  const [supaUrl, setSupaUrl] = useState('');
  const [supaKey, setSupaKey] = useState('');

  // Auth State
  const [authProvider, setAuthProvider] = useState('local');
  const [ssoGoogle, setSsoGoogle] = useState(false);
  const [ssoGithub, setSsoGithub] = useState(false);

  // Admin Credentials & Mode
  const [adminMode, setAdminMode] = useState<'create' | 'existing'>('create');
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);
  const [verifiedAdminProfile, setVerifiedAdminProfile] = useState<{
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    accessLevel: string;
    empId?: string;
    uid?: string;
  } | null>(null);
  const [adminVerifyError, setAdminVerifyError] = useState<{
    code: string;
    message: string;
    currentRole?: string;
  } | null>(null);

  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [showAdminConfirmPassword, setShowAdminConfirmPassword] = useState(false);

  // AI State
  const [aiProjectName, setAiProjectName] = useState('Wizard AI Config');
  const [aiProvider, setAiProvider] = useState('google');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiModel, setAiModel] = useState('');

  const handleDbProviderChange = (val: string) => {
    setDbProvider(val);
    if (val === 'local') {
      setAuthProvider('local');
    } else if (val === 'supabase') {
      setAuthProvider('supabase');
    } else if (val === 'firebase') {
      setAuthProvider('firebase');
    }
  };

  useEffect(() => {
    fetch('/api/config/profiles')
      .then(res => res.json())
      .then(data => {
        const dbSetup = Array.isArray(data.database) && data.database.some((d: any) => Boolean(d.provider));
        const authSetup = Array.isArray(data.authentication) && data.authentication.some((a: any) => Boolean(a.provider));
        const aiSetup = Array.isArray(data.ai) && data.ai.length > 0;

        if (dbSetup) {
          setIsFirstRun(false);

          const isForced = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('force') === 'true';
          if (!onClose && !isForced) {
            const storedUser = typeof window !== 'undefined' ? localStorage.getItem('workwayz_user') : null;
            if (storedUser) {
              try {
                const user = JSON.parse(storedUser);
                if (user?.email && (user?.uid || user?.empId)) {
                  router.replace('/my-projects');
                  return;
                }
              } catch (_) {}
            }
            router.replace('/login');
            return;
          }

          if (dbSetup) {
            const activeDb = data.database.find((d: any) => d.isActive) || data.database[0];
            if (activeDb) {
              setDbProfileId(activeDb.id);
              setDbProjectName(activeDb.profileName || 'Wizard Database');
              setDbProvider(activeDb.provider || 'supabase');
              if (activeDb.provider === 'firebase') {
                setFbProjectId(activeDb.projectId || '');
                setFbApiKey(activeDb.apiKey || '');
              } else if (activeDb.provider === 'supabase') {
                setSupaUrl(activeDb.supabaseUrl || '');
                setSupaKey(activeDb.supabaseAnonKey || '');
              }
            }
          }

          if (authSetup) {
            const activeAuth = data.authentication.find((a: any) => a.isActive) || data.authentication[0];
            if (activeAuth) {
              setAuthProfileId(activeAuth.id);
              setAuthProvider(activeAuth.provider || 'supabase');
              setSsoGoogle(!!activeAuth.googleSso);
              setSsoGithub(!!activeAuth.githubSso);
            }
          }

          if (aiSetup) {
            const activeAi = data.ai.find((a: any) => a.isActive) || data.ai[0];
            if (activeAi) {
              setAiProfileId(activeAi.id);
              setAiProjectName(activeAi.profileName || 'Wizard AI Config');
              setAiProvider(activeAi.provider || 'google');
              if (['google', 'openai', 'anthropic'].includes(activeAi.provider)) {
                setAiApiKey(activeAi.apiKey || '');
              } else {
                setAiBaseUrl(activeAi.baseUrl || '');
              }
              setAiModel(activeAi.model || '');
            }
          }
        }
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load profiles", err);
        setIsLoading(false);
      });
  }, [onClose, router]);

  const verifyExistingAdmin = async (emailToVerify?: string, passwordToVerify?: string): Promise<boolean> => {
    const email = (emailToVerify ?? adminEmail).trim();
    const password = passwordToVerify ?? adminPassword;

    if (!email) {
      toast({ title: "Validation Error", description: "Email ID is required.", variant: "destructive" });
      return false;
    }
    if (!password) {
      toast({ title: "Validation Error", description: "Password is required.", variant: "destructive" });
      return false;
    }

    setIsVerifyingAdmin(true);
    setAdminVerifyError(null);

    try {
      const res = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify',
          mode: 'existing',
          adminEmail: email,
          adminPassword: password,
          dbProvider,
          authProvider,
          fbProjectId,
          fbApiKey,
          supaUrl,
          supaKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setVerifiedAdminProfile(null);
        setAdminVerifyError({
          code: data.code || 'UNKNOWN_ERROR',
          message: data.error || 'Failed to verify account.',
          currentRole: data.currentRole,
        });
        toast({
          title: data.code === 'NOT_SUPER_ADMIN' ? "Not a Super Admin" : "Verification Failed",
          description: data.error || "Could not link this existing account.",
          variant: "destructive"
        });
        return false;
      }

      setVerifiedAdminProfile(data.user);
      setAdminVerifyError(null);
      toast({
        title: "Account Verified!",
        description: `Welcome back, ${data.user.name}. Super Admin privileges confirmed.`,
      });
      return true;
    } catch (err: any) {
      setVerifiedAdminProfile(null);
      setAdminVerifyError({
        code: 'NETWORK_ERROR',
        message: err.message || 'Network error verifying credentials.',
      });
      toast({
        title: "Network Error",
        description: err.message || 'Could not verify credentials with server.',
        variant: "destructive"
      });
      return false;
    } finally {
      setIsVerifyingAdmin(false);
    }
  };

  const handleNext = async () => {
    if (step === 3) {
      if (adminMode === 'existing') {
        if (!adminEmail.trim()) {
          toast({ title: "Validation Error", description: "Email ID is required.", variant: "destructive" });
          return;
        }
        if (!adminPassword) {
          toast({ title: "Validation Error", description: "Password is required.", variant: "destructive" });
          return;
        }
        // If not already verified with the current credentials, verify now
        if (!verifiedAdminProfile || verifiedAdminProfile.email !== adminEmail.trim()) {
          const ok = await verifyExistingAdmin();
          if (!ok) return;
        }
      } else {
        if (!adminFirstName.trim()) {
          toast({ title: "Validation Error", description: "First Name is required.", variant: "destructive" });
          return;
        }
        if (!adminLastName.trim()) {
          toast({ title: "Validation Error", description: "Last Name is required.", variant: "destructive" });
          return;
        }
        if (!adminEmail.trim()) {
          toast({ title: "Validation Error", description: "Email ID is required.", variant: "destructive" });
          return;
        }
        if (!adminPassword) {
          toast({ title: "Validation Error", description: "Password is required.", variant: "destructive" });
          return;
        }
        if (adminPassword !== adminConfirmPassword) {
          toast({ title: "Validation Error", description: "Passwords do not match.", variant: "destructive" });
          return;
        }
      }
    }
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSave = async () => {
    // Validate admin inputs if creating or updating admin credentials
    if (!onClose || (adminEmail || adminPassword)) {
      if (adminMode === 'create') {
        if (!adminFirstName.trim()) {
          toast({ title: "Validation Error", description: "Admin First Name is required.", variant: "destructive" });
          setStep(3);
          return;
        }
        if (!adminLastName.trim()) {
          toast({ title: "Validation Error", description: "Admin Last Name is required.", variant: "destructive" });
          setStep(3);
          return;
        }
        if (!adminEmail.trim()) {
          toast({ title: "Validation Error", description: "Admin Email ID is required.", variant: "destructive" });
          setStep(3);
          return;
        }
        if (!adminPassword) {
          toast({ title: "Validation Error", description: "Admin Password is required.", variant: "destructive" });
          setStep(3);
          return;
        }
        if (adminPassword !== adminConfirmPassword) {
          toast({ title: "Validation Error", description: "Admin Passwords do not match.", variant: "destructive" });
          setStep(3);
          return;
        }
      } else {
        if (!adminEmail.trim()) {
          toast({ title: "Validation Error", description: "Admin Email ID is required.", variant: "destructive" });
          setStep(3);
          return;
        }
        if (!adminPassword) {
          toast({ title: "Validation Error", description: "Admin Password is required.", variant: "destructive" });
          setStep(3);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      // Prepare DB payload
      let dbProfile: any = { profileName: dbProjectName || 'Wizard Database', provider: dbProvider, isActive: true };
      if (dbProfileId) dbProfile.id = dbProfileId;
      if (dbProvider === 'firebase') {
        dbProfile.projectId = fbProjectId;
        dbProfile.apiKey = fbApiKey;
      } else if (dbProvider === 'supabase') {
        dbProfile.supabaseUrl = supaUrl;
        dbProfile.supabaseAnonKey = supaKey;
      }

      // Prepare Auth payload
      let authProfile: any = {
        profileName: dbProjectName || 'Wizard Authentication',
        provider: authProvider,
        googleSso: ssoGoogle,
        githubSso: ssoGithub,
        isActive: true,
      };
      if (authProfileId) authProfile.id = authProfileId;

      // Prepare AI payload
      let aiProfile: any = {
        profileName: aiProjectName || 'Wizard AI Config',
        provider: aiProvider,
        isActive: true,
      };
      if (aiProfileId) aiProfile.id = aiProfileId;
      if (['google', 'openai', 'anthropic'].includes(aiProvider)) {
        aiProfile.apiKey = aiApiKey;
      }
      if (['lmstudio', 'ollama'].includes(aiProvider)) {
        aiProfile.baseUrl = aiBaseUrl;
      }
      if (aiModel) aiProfile.model = aiModel;

      // 1. Save all profiles atomically in a single batch request
      const configRes = await fetch('/api/config/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch: [
            { type: 'database', profile: dbProfile },
            { type: 'authentication', profile: authProfile },
            { type: 'ai', profile: aiProfile },
          ]
        })
      });
      if (!configRes.ok) throw new Error('Failed to save configuration profiles');

      // 2. Setup Super Admin User
      if (adminEmail && adminPassword) {
        const setupRes = await fetch('/api/admin/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: adminMode,
            action: 'setup',
            adminEmail,
            adminPassword,
            adminFirstName: adminMode === 'existing' ? (verifiedAdminProfile?.firstName || '') : adminFirstName,
            adminLastName: adminMode === 'existing' ? (verifiedAdminProfile?.lastName || '') : adminLastName,
            adminName: adminMode === 'existing' ? (verifiedAdminProfile?.name || '') : `${adminFirstName} ${adminLastName}`.trim(),
            dbProvider,
            authProvider,
            fbProjectId,
            fbApiKey,
            supaUrl,
            supaKey,
          })
        });

        const setupData = await setupRes.json();
        if (!setupRes.ok || !setupData.success) {
          if (setupData.code === 'EMAIL_EXISTS') {
            setAdminVerifyError({
              code: 'EMAIL_EXISTS',
              message: setupData.error || 'An account with this email already exists in the database.',
            });
            setStep(3);
          } else if (setupData.code === 'NOT_SUPER_ADMIN') {
            setAdminVerifyError({
              code: 'NOT_SUPER_ADMIN',
              message: setupData.error,
              currentRole: setupData.currentRole,
            });
            setStep(3);
          } else if (setupData.code === 'AUTH_FAILED') {
            setAdminVerifyError({
              code: 'AUTH_FAILED',
              message: setupData.error,
            });
            setStep(3);
          }
          throw new Error(setupData.error || 'Failed to setup admin user');
        }
      }

      // Persist active dbProvider in localStorage for instant client initialization
      localStorage.setItem('workwayz_db_provider', dbProvider);
      if (dbProvider === 'firebase' && fbProjectId) {
        localStorage.setItem('workwayz_firebase_config', JSON.stringify({
          projectId: fbProjectId,
          apiKey: fbApiKey,
          authDomain: `${fbProjectId}.firebaseapp.com`,
          storageBucket: `${fbProjectId}.firebasestorage.app`,
        }));
      } else if (dbProvider === 'supabase' || dbProvider === 'local') {
        localStorage.removeItem('workwayz_firebase_config');
      }

      if (onClose) {
        toast({
          title: "Setup Complete!",
          description: "Your configuration profiles have been saved.",
        });
        onClose();
        window.location.reload();
      } else {
        // Require manual sign in: ensure any active session is cleared
        clearSession();

        toast({
          title: "Setup Complete!",
          description: "Your environment has been configured. Please sign in with your admin credentials.",
        });

        window.location.href = `/login?setup=complete&email=${encodeURIComponent(adminEmail || '')}`;
      }
    } catch (err: any) {
      toast({
        title: "Error saving setup",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const steps = [
    { num: 1, title: 'Database', icon: Database },
    { num: 2, title: 'Authentication', icon: Key },
    { num: 3, title: 'Admin User', icon: User },
    { num: 4, title: 'AI Configuration', icon: Bot },
    { num: 5, title: 'Finish', icon: CheckCircle2 },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4", onClose && "fixed inset-0 z-50 bg-background/60 backdrop-blur-sm")}>
      <div className={cn("w-full max-w-3xl space-y-8", onClose && "bg-background border rounded-xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col")}>
        {onClose && (
          <Button variant="ghost" size="icon" className="absolute right-4 top-4 z-10" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
        <div className="text-center space-y-2 pt-4 shrink-0">
          <div className="inline-flex items-center justify-center mb-2">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-xl shadow-black/50 ring-1 ring-white/10 border border-slate-700/60 bg-[#0d1624]">
              <Image
                src="/workwayz-icon.png"
                alt="Workwayz Logo"
                fill
                sizes="56px"
                className="object-cover"
                priority
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Workwayz Setup</h1>
          <p className="text-muted-foreground text-lg">Let&apos;s configure your environment to get you started.</p>
        </div>

        {/* Stepper Header */}
        <div className="flex items-center justify-between relative px-2 shrink-0">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border -z-10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500 ease-in-out"
              style={{ width: `${((step - 1) / 4) * 100}%` }}
            />
          </div>
          {steps.map((s) => (
            <div
              key={s.num}
              className={cn("flex flex-col items-center flex-1 gap-2 text-center transition-transform", onClose || step >= s.num ? "cursor-pointer hover:scale-105" : "cursor-not-allowed opacity-70")}
              onClick={() => {
                if (onClose || step >= s.num) setStep(s.num);
              }}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                  step >= s.num
                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                    : "bg-background border-border text-muted-foreground"
                )}
              >
                <s.icon className="w-5 h-5" />
              </div>
              <span className={cn(
                "text-xs font-semibold hidden sm:block",
                step >= s.num ? "text-primary" : "text-muted-foreground"
              )}>{s.title}</span>
            </div>
          ))}
        </div>

        {/* Forms */}
        <Card className="shadow-lg border-border/60 flex flex-col min-h-0">
          <CardHeader className="shrink-0">
            <CardTitle className="text-xl flex items-center gap-2">
              {steps[step - 1].title} Setup
            </CardTitle>
            <CardDescription>
              {step === 1 && "Configure your primary database connection."}
              {step === 2 && "Set up identity and authentication providers."}
              {step === 3 && (adminMode === 'existing' ? "Connect to an existing Super Admin account from your database." : "Create the master Super Admin account for the system.")}
              {step === 4 && "Enable intelligent features by connecting an AI provider."}
              {step === 5 && "Review and finalize your setup configuration."}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px] overflow-y-auto flex-1 p-6">
            {/* Step 1: DB */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input placeholder="e.g. My Production DB" value={dbProjectName} onChange={e => setDbProjectName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Database Provider</Label>
                  <Select onValueChange={handleDbProviderChange} value={dbProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Database Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Embedded Database (Built-in / Zero-Config)</SelectItem>
                      <SelectItem value="supabase">Supabase</SelectItem>
                      <SelectItem value="firebase">Firebase (Firestore)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {dbProvider === 'local' && (
                  <div className="p-4 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 text-sm rounded-lg border border-emerald-500/30 space-y-1.5">
                    <p className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      Ready Out-of-the-Box (Zero External Setup Required)
                    </p>
                    <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      Your portfolios, projects, stories, and team data will be stored locally on this machine (<code className="font-mono">~/.workwayz</code>). No external cloud database account, URL, or API key is required.
                    </p>
                  </div>
                )}

                {dbProvider === 'firebase' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Firebase Project ID</Label>
                      <Input placeholder="my-project-id" value={fbProjectId} onChange={e => setFbProjectId(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Firebase API Key</Label>
                      <Input type="password" placeholder="AIza..." value={fbApiKey} onChange={e => setFbApiKey(e.target.value)} />
                    </div>
                  </div>
                )}

                {dbProvider === 'supabase' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Supabase URL</Label>
                      <Input placeholder="https://xyz.supabase.co" value={supaUrl} onChange={e => setSupaUrl(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Supabase Publishable Key</Label>
                      <Input type="password" placeholder="eyJhbG..." value={supaKey} onChange={e => setSupaKey(e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Auth */}
            {step === 2 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <Label>Authentication Provider</Label>
                  <Select onValueChange={setAuthProvider} value={authProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Authentication Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Built-in Auth</SelectItem>
                      <SelectItem value="supabase">Supabase Auth</SelectItem>
                      <SelectItem value="firebase">Firebase Auth</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Defines how users sign into Workwayz.
                  </p>
                </div>

                {authProvider === 'local' && (
                  <div className="p-4 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 text-sm rounded-md border border-emerald-500/30">
                    Local Built-in Auth securely hashes and stores user credentials directly inside your local Workwayz database with zero external setup.
                  </div>
                )}

                {authProvider === 'supabase' && (
                  <div className="p-4 bg-emerald-50 text-emerald-800 text-sm rounded-md border border-emerald-200">
                    Supabase Auth leverages the project URL and publishable key configured in Step 1.
                  </div>
                )}

                <div className="space-y-4 pt-4 border-t border-border">
                  <h4 className="text-sm font-semibold">Single Sign-On (SSO)</h4>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sso-google" className="cursor-pointer">Enable Google SSO</Label>
                    <Switch id="sso-google" checked={ssoGoogle} onCheckedChange={setSsoGoogle} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sso-github" className="cursor-pointer">Enable GitHub SSO</Label>
                    <Switch id="sso-github" checked={ssoGithub} onCheckedChange={setSsoGithub} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Admin */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Mode Selector Toggle */}
                <div className="flex p-1 bg-muted rounded-lg border border-border/60">
                  <button
                    type="button"
                    onClick={() => {
                      setAdminMode('create');
                      setAdminVerifyError(null);
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-medium rounded-md transition-all",
                      adminMode === 'create'
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create New Super Admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminMode('existing');
                      setAdminVerifyError(null);
                    }}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-medium rounded-md transition-all",
                      adminMode === 'existing'
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Use Existing Credentials</span>
                  </button>
                </div>

                <div className="text-xs text-muted-foreground">
                  {adminMode === 'create' ? (
                    <span>Create a fresh master Super Admin account for your system.</span>
                  ) : (
                    <span>Reconnecting after reinstallation? Link your existing Super Admin account without resetting data.</span>
                  )}
                </div>

                {/* Error Banner: NOT_SUPER_ADMIN */}
                {adminVerifyError && adminVerifyError.code === 'NOT_SUPER_ADMIN' && (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">Account is not a Super Admin</p>
                        <p className="text-amber-800 dark:text-amber-300">
                          This account has the role <span className="font-bold underline">{adminVerifyError.currentRole || 'User'}</span>. For security, only accounts with the &quot;Super Admin&quot; role can be linked during setup.
                        </p>
                      </div>
                    </div>
                    <div className="pt-1 flex items-center justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-amber-500/40 hover:bg-amber-500/10 text-amber-900 dark:text-amber-100 text-xs"
                        onClick={() => {
                          setAdminMode('create');
                          setAdminVerifyError(null);
                        }}
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                        Create New Super Admin
                      </Button>
                    </div>
                  </div>
                )}

                {/* Error Banner: AUTH_FAILED */}
                {adminVerifyError && adminVerifyError.code === 'AUTH_FAILED' && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-950 dark:text-red-200 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-sm text-red-900 dark:text-red-100">Authentication Failed</p>
                        <p className="text-red-800 dark:text-red-300">
                          Email or password doesn&apos;t match the existing database credentials.
                        </p>
                      </div>
                    </div>
                    <div className="pt-1 flex items-center justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-red-500/40 hover:bg-red-500/10 text-red-900 dark:text-red-100 text-xs"
                        onClick={() => {
                          setAdminMode('create');
                          setAdminVerifyError(null);
                        }}
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                        Create New Super Admin
                      </Button>
                    </div>
                  </div>
                )}

                {/* Error Banner: EMAIL_EXISTS (when create fails because already taken) */}
                {adminVerifyError && adminVerifyError.code === 'EMAIL_EXISTS' && (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-sm text-amber-900 dark:text-amber-100">Account Already Exists</p>
                        <p className="text-amber-800 dark:text-amber-300">
                          {adminVerifyError.message}
                        </p>
                      </div>
                    </div>
                    <div className="pt-1 flex items-center justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-amber-500/40 hover:bg-amber-500/10 text-amber-900 dark:text-amber-100 text-xs"
                        onClick={() => {
                          setAdminMode('existing');
                          setAdminVerifyError(null);
                        }}
                      >
                        <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                        Use Existing Credentials
                      </Button>
                    </div>
                  </div>
                )}

                {/* Error Banner: Generic / Network */}
                {adminVerifyError && !['NOT_SUPER_ADMIN', 'AUTH_FAILED', 'EMAIL_EXISTS'].includes(adminVerifyError.code) && (
                  <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-950 dark:text-red-200 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 text-xs">
                        <p className="font-semibold text-sm text-red-900 dark:text-red-100">Verification Error</p>
                        <p className="text-red-800 dark:text-red-300">
                          {adminVerifyError.message}
                        </p>
                      </div>
                    </div>
                    <div className="pt-1 flex items-center justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-red-500/40 hover:bg-red-500/10 text-red-900 dark:text-red-100 text-xs"
                        onClick={() => {
                          setAdminMode('create');
                          setAdminVerifyError(null);
                        }}
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                        Create New Super Admin
                      </Button>
                    </div>
                  </div>
                )}

                {/* Verified Profile Success Card */}
                {adminMode === 'existing' && verifiedAdminProfile && (
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-950 dark:text-emerald-200 space-y-2.5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-semibold text-sm text-emerald-900 dark:text-emerald-100">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Super Admin Verified</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-medium">
                        {verifiedAdminProfile.empId || 'Super Admin'}
                      </span>
                    </div>
                    <div className="text-xs space-y-1 text-emerald-800 dark:text-emerald-300/90">
                      <p><strong className="text-emerald-950 dark:text-emerald-100">Name:</strong> {verifiedAdminProfile.name}</p>
                      <p><strong className="text-emerald-950 dark:text-emerald-100">Email:</strong> {verifiedAdminProfile.email}</p>
                      <p><strong className="text-emerald-950 dark:text-emerald-100">Role:</strong> Super Admin</p>
                    </div>
                  </div>
                )}

                {/* Form Fields: Create Mode */}
                {adminMode === 'create' ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input placeholder="John" value={adminFirstName} onChange={e => setAdminFirstName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input placeholder="Doe" value={adminLastName} onChange={e => setAdminLastName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Email ID *</Label>
                      <Input type="email" placeholder="admin@example.com" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Input value="Super Admin" disabled className="bg-muted text-foreground font-semibold" />
                    </div>
                    <div className="space-y-2">
                      <Label>Password *</Label>
                      <div className="relative">
                        <Input
                          type={showAdminPassword ? "text" : "password"}
                          placeholder=""
                          value={adminPassword}
                          onChange={e => setAdminPassword(e.target.value)}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Re-enter Password *</Label>
                      <div className="relative">
                        <Input
                          type={showAdminConfirmPassword ? "text" : "password"}
                          placeholder=""
                          value={adminConfirmPassword}
                          onChange={e => setAdminConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminConfirmPassword(!showAdminConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showAdminConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Form Fields: Existing Mode */
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Existing Super Admin Email *</Label>
                      <Input
                        type="email"
                        placeholder="admin@example.com"
                        value={adminEmail}
                        onChange={e => {
                          setAdminEmail(e.target.value);
                          if (verifiedAdminProfile) setVerifiedAdminProfile(null);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Existing Super Admin Password *</Label>
                      <div className="relative">
                        <Input
                          type={showAdminPassword ? "text" : "password"}
                          placeholder="Enter your existing password"
                          value={adminPassword}
                          onChange={e => {
                            setAdminPassword(e.target.value);
                            if (verifiedAdminProfile) setVerifiedAdminProfile(null);
                          }}
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showAdminPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 pt-1">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => verifyExistingAdmin()}
                        disabled={isVerifyingAdmin || !adminEmail.trim() || !adminPassword}
                        className="gap-2"
                      >
                        {isVerifyingAdmin ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        {isVerifyingAdmin ? "Verifying Credentials..." : "Verify Credentials"}
                      </Button>
                      {verifiedAdminProfile && (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: AI */}
            {step === 4 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  <Input placeholder="e.g. Main AI Config" value={aiProjectName} onChange={e => setAiProjectName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>AI Provider</Label>
                  <Select onValueChange={setAiProvider} value={aiProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select AI Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google">Google Gemini</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                      <SelectItem value="lmstudio">LM Studio (Local)</SelectItem>
                      <SelectItem value="ollama">Ollama (Local)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {['google', 'openai', 'anthropic'].includes(aiProvider) && (
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input type="password" placeholder="Enter API Key" value={aiApiKey} onChange={e => setAiApiKey(e.target.value)} />
                    <p className="text-xs text-muted-foreground">Your key is stored securely in your local environment.</p>
                  </div>
                )}

                {['lmstudio', 'ollama'].includes(aiProvider) && (
                  <div className="space-y-2">
                    <Label>Base Node URL</Label>
                    <Input placeholder="http://localhost:11434" value={aiBaseUrl} onChange={e => setAiBaseUrl(e.target.value)} />
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Finish */}
            {step === 5 && (
              <div className="flex flex-col items-center justify-center text-center space-y-4 h-full animate-in zoom-in-95 duration-500 py-8">
                <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold">You&apos;re almost there!</h3>
                <p className="text-muted-foreground max-w-sm">
                  {onClose
                    ? "Click 'Save Changes' below to update your environment configurations."
                    : "Click 'Complete Setup' below to save your configurations and proceed to sign in."}
                </p>
                <div className="w-full bg-muted/30 p-4 rounded-lg mt-6 text-left border">
                  <h4 className="font-semibold text-sm mb-2 text-primary">Summary:</h4>
                  <ul className="text-sm space-y-2">
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Database:</span>
                      <span className="font-medium capitalize">{dbProvider}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Authentication:</span>
                      <span className="font-medium capitalize">{authProvider}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Admin Account:</span>
                      <span className="font-medium truncate max-w-[240px]">
                        {adminMode === 'existing'
                          ? (verifiedAdminProfile
                              ? `${verifiedAdminProfile.name} (${verifiedAdminProfile.email})`
                              : (adminEmail ? `${adminEmail} (Existing)` : 'Pending'))
                          : (adminEmail
                              ? `${adminFirstName ? `${adminFirstName} ${adminLastName}`.trim() : 'Super Admin'} (${adminEmail})`
                              : 'Pending')}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Admin Mode:</span>
                      <span className="font-medium">
                        {adminMode === 'existing' ? 'Linked Existing Account' : 'New Account Creation'}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Role:</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">
                        Super Admin {adminMode === 'existing' && verifiedAdminProfile ? '(Verified)' : ''}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">AI Integration:</span>
                      <span className="font-medium capitalize">{aiProvider}</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="shrink-0 flex justify-between border-t border-border/50 bg-muted/10 rounded-b-lg p-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1 || isSaving}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>

            <div className="flex gap-2">
              {onClose && step < 5 && (
                <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white">
                  {isSaving ? "Saving..." : "Save Changes"} <Save className="w-4 h-4 ml-2" />
                </Button>
              )}
              {step < 5 ? (
                <Button onClick={handleNext}>
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white">
                  {isSaving ? "Saving..." : (onClose ? "Save Changes" : "Complete Setup")}
                  {onClose ? <Save className="w-4 h-4 ml-2" /> : <CheckCircle2 className="w-4 h-4 ml-2" />}
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
