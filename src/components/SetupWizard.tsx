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
import { Database, Key, Bot, ArrowRight, ArrowLeft, CheckCircle2, User, X, Save, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [dbProjectName, setDbProjectName] = useState('Wizard Database');
  const [dbProvider, setDbProvider] = useState('supabase');
  const [fbProjectId, setFbProjectId] = useState('');
  const [fbApiKey, setFbApiKey] = useState('');
  const [supaUrl, setSupaUrl] = useState('');
  const [supaKey, setSupaKey] = useState('');

  // Auth State
  const [authProvider, setAuthProvider] = useState('supabase');
  const [ssoGoogle, setSsoGoogle] = useState(false);
  const [ssoGithub, setSsoGithub] = useState(false);

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
    if (val === 'supabase') {
      setAuthProvider('supabase');
    } else if (val === 'firebase') {
      setAuthProvider('firebase');
    }
  };

  useEffect(() => {
    fetch('/api/config/profiles')
      .then(res => res.json())
      .then(data => {
        const dbSetup = Array.isArray(data.database) && data.database.length > 0;
        const authSetup = Array.isArray(data.authentication) && data.authentication.length > 0;
        const aiSetup = Array.isArray(data.ai) && data.ai.length > 0;

        if (dbSetup || authSetup || aiSetup) {
          setIsFirstRun(false);

          if (!onClose) {
            const storedUser = typeof window !== 'undefined' ? localStorage.getItem('projectflow_user') : null;
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

  const handleNext = () => {
    if (step === 3) {
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
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSave = async () => {
    // Validate admin inputs if creating or updating admin credentials
    if (!onClose || (adminEmail || adminPassword)) {
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
            adminEmail,
            adminPassword,
            adminFirstName,
            adminLastName,
            adminName: `${adminFirstName} ${adminLastName}`.trim(),
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
          throw new Error(setupData.error || 'Failed to create admin user');
        }

        if (setupData.user) {
          const userSession = {
            name: setupData.user.name || `${adminFirstName} ${adminLastName}`.trim(),
            firstName: adminFirstName,
            lastName: adminLastName,
            email: adminEmail,
            accessLevel: 'Super Admin',
            empId: setupData.user.empId || 'E001',
            uid: setupData.user.uid || '',
            authProvider: authProvider,
            issuedAt: Date.now(),
            rememberMe: true,
            needsPasswordReset: false,
          };

          // Store local storage session and cookie for immediate authorization
          localStorage.setItem('projectflow_user', JSON.stringify(userSession));
          localStorage.setItem('projectflow_last_activity', Date.now().toString());
          document.cookie = 'projectflow_session_active=true; path=/';

          // Client SDK authentication to populate client auth session
          if (authProvider === 'firebase') {
            try {
              const { auth } = await import('@/lib/firebase');
              if (auth) {
                const { signInWithEmailAndPassword } = await import('firebase/auth');
                await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
              }
            } catch (clientAuthErr) {
              console.warn('[SetupWizard] Client Firebase sign-in warning:', clientAuthErr);
            }
          } else if (authProvider === 'supabase') {
            try {
              const { supabase } = await import('@/lib/supabase');
              if (supabase) {
                await supabase.auth.signInWithPassword({
                  email: adminEmail,
                  password: adminPassword,
                });
              }
            } catch (clientAuthErr) {
              console.warn('[SetupWizard] Client Supabase sign-in warning:', clientAuthErr);
            }
          }

          window.dispatchEvent(new Event('user-profile-updated'));
        }
      }

      // Persist active dbProvider in localStorage for instant client initialization
      localStorage.setItem('projectflow_db_provider', dbProvider);
      if (dbProvider === 'firebase' && fbProjectId) {
        localStorage.setItem('projectflow_firebase_config', JSON.stringify({
          projectId: fbProjectId,
          apiKey: fbApiKey,
          authDomain: `${fbProjectId}.firebaseapp.com`,
          storageBucket: `${fbProjectId}.firebasestorage.app`,
        }));
      } else if (dbProvider === 'supabase') {
        localStorage.removeItem('projectflow_firebase_config');
      }

      toast({
        title: "Setup Complete!",
        description: onClose ? "Your configuration profiles have been saved." : "Your environment is ready. Logging in...",
      });

      // Redirect cleanly to /my-projects or reload if inside settings modal
      if (onClose) {
        onClose();
        window.location.reload();
      } else {
        window.location.href = '/my-projects';
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
              {step === 3 && "Create the master Super Admin account for the system."}
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
                      <SelectItem value="supabase">Supabase</SelectItem>
                      <SelectItem value="firebase">Firebase (Firestore)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                      <SelectItem value="supabase">Supabase Auth</SelectItem>
                      <SelectItem value="firebase">Firebase Auth</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Defines how users sign into Workwayz.
                  </p>
                </div>

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
                  Click &apos;Complete Setup&apos; below to save your configurations and boot up the Workwayz application.
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
                        {adminEmail ? `${adminFirstName ? `${adminFirstName} ${adminLastName}`.trim() : 'Super Admin'} (${adminEmail})` : 'Pending'}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="text-muted-foreground">Role:</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">Super Admin</span>
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
