'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Sparkles, Database, Key, Bot, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SetupWizard() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // DB State
  const [dbProvider, setDbProvider] = useState('postgresql');
  const [dbConnStr, setDbConnStr] = useState('');
  const [fbProjectId, setFbProjectId] = useState('');
  const [fbApiKey, setFbApiKey] = useState('');
  const [supaUrl, setSupaUrl] = useState('');
  const [supaKey, setSupaKey] = useState('');

  // Auth State
  const [authProvider, setAuthProvider] = useState('firebase');
  const [ssoGoogle, setSsoGoogle] = useState(false);
  const [ssoGithub, setSsoGithub] = useState(false);

  // AI State
  const [aiProvider, setAiProvider] = useState('google');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('');
  const [aiModel, setAiModel] = useState('');

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Prepare DB payload
      let dbProfile: any = { profileName: 'Wizard Database', provider: dbProvider, isActive: true };
      if (dbProvider === 'postgresql') dbProfile.connectionString = dbConnStr;
      else if (dbProvider === 'firebase') {
        dbProfile.projectId = fbProjectId;
        dbProfile.apiKey = fbApiKey;
      } else if (dbProvider === 'supabase') {
        dbProfile.supabaseUrl = supaUrl;
        dbProfile.supabaseAnonKey = supaKey;
      }

      // Prepare Auth payload
      let authProfile: any = {
        profileName: 'Wizard Authentication',
        provider: authProvider,
        googleSso: ssoGoogle,
        githubSso: ssoGithub,
        isActive: true,
      };

      // Prepare AI payload
      let aiProfile: any = {
        profileName: 'Wizard AI Config',
        provider: aiProvider,
        isActive: true,
      };
      if (['google', 'openai', 'anthropic'].includes(aiProvider)) {
        aiProfile.apiKey = aiApiKey;
      }
      if (['lmstudio', 'ollama'].includes(aiProvider)) {
        aiProfile.baseUrl = aiBaseUrl;
      }
      if (aiModel) aiProfile.model = aiModel;

      // Make API calls in sequence
      const dbRes = await fetch('/api/config/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'database', profile: dbProfile })
      });
      if (!dbRes.ok) throw new Error('Failed to save Database config');

      const authRes = await fetch('/api/config/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'authentication', profile: authProfile })
      });
      if (!authRes.ok) throw new Error('Failed to save Authentication config');

      const aiRes = await fetch('/api/config/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'ai', profile: aiProfile })
      });
      if (!aiRes.ok) throw new Error('Failed to save AI config');

      toast({
        title: "Setup Complete!",
        description: "Your configuration profiles have been saved.",
      });

      router.push('/project-home');
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
    { num: 3, title: 'AI Configuration', icon: Bot },
    { num: 4, title: 'Finish', icon: CheckCircle2 },
  ];

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-2">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome to ProjectFlow Setup</h1>
          <p className="text-muted-foreground text-lg">Let's configure your environment to get you started.</p>
        </div>

        {/* Stepper Header */}
        <div className="flex items-center justify-between relative px-2">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border -z-10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 ease-in-out" 
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />
          </div>
          {steps.map((s) => (
            <div key={s.num} className="flex flex-col items-center gap-2 bg-muted/20 p-1">
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
        <Card className="shadow-lg border-border/60">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              {steps[step - 1].title} Setup
            </CardTitle>
            <CardDescription>
              {step === 1 && "Configure your primary database connection."}
              {step === 2 && "Set up identity and authentication providers."}
              {step === 3 && "Enable intelligent features by connecting an AI provider."}
              {step === 4 && "Review and finalize your setup configuration."}
            </CardDescription>
          </CardHeader>
          <CardContent className="min-h-[300px]">
            {/* Step 1: DB */}
            {step === 1 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="space-y-2">
                  <Label>Database Provider</Label>
                  <Select onValueChange={setDbProvider} value={dbProvider}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Database Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="postgresql">PostgreSQL</SelectItem>
                      <SelectItem value="firebase">Firebase (Firestore)</SelectItem>
                      <SelectItem value="supabase">Supabase</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {dbProvider === 'postgresql' && (
                  <div className="space-y-2">
                    <Label>Connection String</Label>
                    <Input 
                      placeholder="postgresql://user:pass@host:5432/db" 
                      value={dbConnStr} 
                      onChange={e => setDbConnStr(e.target.value)} 
                    />
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
                      <Label>Supabase Anon Key</Label>
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
                      <SelectItem value="firebase">Firebase Auth</SelectItem>
                      <SelectItem value="local">Local JWT / Database</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Defines how users sign into ProjectFlow.
                  </p>
                </div>

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

            {/* Step 3: AI */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                
                <div className="space-y-2">
                   <Label>Default Model Override (Optional)</Label>
                   <Input placeholder="e.g. gpt-4o, gemini-1.5-pro" value={aiModel} onChange={e => setAiModel(e.target.value)} />
                </div>
              </div>
            )}

            {/* Step 4: Finish */}
            {step === 4 && (
              <div className="flex flex-col items-center justify-center text-center space-y-4 h-full animate-in zoom-in-95 duration-500 py-8">
                <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold">You're almost there!</h3>
                <p className="text-muted-foreground max-w-sm">
                  Click 'Complete Setup' below to save your configurations and boot up the ProjectFlow application.
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
                      <span className="text-muted-foreground">AI Integration:</span>
                      <span className="font-medium capitalize">{aiProvider}</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between border-t border-border/50 bg-muted/10 rounded-b-lg p-4">
            <Button 
              variant="outline" 
              onClick={handleBack} 
              disabled={step === 1 || isSaving}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            {step < 4 ? (
              <Button onClick={handleNext}>
                Next <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700 text-white">
                {isSaving ? "Saving..." : "Complete Setup"} <CheckCircle2 className="w-4 h-4 ml-2" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
