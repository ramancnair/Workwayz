'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Save, Server, Loader2, Database as DatabaseIcon, Info, CheckCircle2, Bookmark } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

type DatabaseProvider = 'firebase' | 'supabase';

interface DatabaseConfig {
    id?: string;
    profileName: string;
    provider: DatabaseProvider;
    // Firebase params
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    // Supabase params
    supabaseUrl?: string;
    supabaseAnonKey?: string;
}

const defaultConfigs: Record<DatabaseProvider, Partial<DatabaseConfig>> = {
    firebase: { provider: 'firebase', apiKey: '', authDomain: '', projectId: '', storageBucket: '', messagingSenderId: '', appId: '' },
    supabase: { provider: 'supabase', supabaseUrl: '', supabaseAnonKey: '' },
};

export default function DatabaseSettingsPage() {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [activeEnvironment, setActiveEnvironment] = useState<any>(null); // from .env.local
    
    // UI states
    const [config, setConfig] = useState<DatabaseConfig>({ profileName: '', provider: 'firebase' });
    const [showNewForm, setShowNewForm] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [showRestartDialog, setShowRestartDialog] = useState(false);
    
    // Execution states
    const [isLoading, setIsLoading] = useState(true);
    const [isTesting, setIsTesting] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    
    // In-place editing state
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [editConfig, setEditConfig] = useState<DatabaseConfig | null>(null);

    const { toast } = useToast();

    useEffect(() => {
        // Authenticate admin access
        const storedUser = localStorage.getItem('projectflow_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user.role === 'Administrator' || user.accessLevel === 'Administrator') {
                    setIsAdmin(true);
                }
            } catch (e) { }
        }
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // First fetch the raw environment config
            const envRes = await fetch('/api/config');
            const envData = await envRes.json();
            setActiveEnvironment(envData.db);

            // Fetch the stored profiles
            const profRes = await fetch('/api/config/profiles');
            const profData = await profRes.json();
            setProfiles(profData.database || []);
            
            setIsLoading(false);
        } catch (e) {
            console.error("Failed to load configs", e);
            setIsLoading(false);
        }
    };

    const handleProviderChange = (value: string, forEdit = false) => {
        const provider = value as DatabaseProvider;
        if (forEdit && editConfig) {
            setEditConfig({ ...defaultConfigs[provider], provider, profileName: editConfig.profileName, id: editConfig.id } as DatabaseConfig);
        } else {
            setConfig({ ...defaultConfigs[provider], provider, profileName: config.profileName } as DatabaseConfig);
        }
    };

    const handleFieldChange = (field: keyof DatabaseConfig, value: string, forEdit = false) => {
        if (forEdit && editConfig) {
            setEditConfig({ ...editConfig, [field]: value });
        } else {
            setConfig(prev => ({ ...prev, [field]: value }));
        }
    };

    const handleSaveNewProfile = async () => {
        if (!config.profileName) {
            toast({ variant: 'destructive', title: 'Missing Name', description: 'Please provide a Profile Alias.' });
            return;
        }
        
        setIsLoading(true);
        try {
            // Post to profiles
            const res = await fetch('/api/config/profiles', {
                method: 'POST',
                body: JSON.stringify({ type: 'database', profile: config }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) throw new Error('Failed to save profile');
            const parsed = await res.json();
            if (parsed.success) {
                toast({ title: 'Profile Saved', description: 'Connection profile added to pool.' });
                setShowNewForm(false);
                setConfig({ profileName: '', provider: 'firebase' });
                await loadData();
            }
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not save profile.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveEditProfile = async () => {
        if (!editConfig || !editConfig.profileName) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/config/profiles', {
                method: 'POST',
                body: JSON.stringify({ type: 'database', profile: editConfig }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error('Failed to update profile');
            
            const wasActive = profiles.find(p => p.id === editConfig.id)?.isActive;
            
            setEditingProfileId(null);
            setEditConfig(null);
            await loadData();
            
            if (wasActive) {
                setShowRestartDialog(true);
            } else {
                toast({ title: 'Profile Updated', description: 'Changes saved successfully.' });
            }
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update profile.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteProfile = async (id: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/config/profiles?type=database&id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');
            toast({ title: 'Profile Deleted' });
            await loadData();
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Delete failed.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleMakeActive = async (id: string) => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/config', {
                method: 'POST',
                body: JSON.stringify({ type: 'database', makeActiveId: id }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) throw new Error('Failed to activate profile');
            await loadData();
            setShowRestartDialog(true);
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to bind profile to environment.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestConnection = () => {
        setIsTesting(true);
        setTimeout(() => {
            setIsTesting(false);
            toast({ title: 'Connection Simulated', description: `Check complete.` });
        }, 1200);
    };

    const initEditMode = (profile: any) => {
        const newConf: any = { provider: profile.provider, profileName: profile.profileName, id: profile.id };
        if (profile.projectId) newConf.projectId = profile.projectId;
        if (profile.supabaseUrl) newConf.supabaseUrl = profile.supabaseUrl;
        setEditConfig({ ...defaultConfigs[profile.provider as DatabaseProvider], ...newConf } as DatabaseConfig);
        setEditingProfileId(profile.id);
    };

    if (isLoading && profiles.length === 0) {
        return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin h-5 w-5" /> Loading settings...</div>;
    }

    const performForcedRestart = async () => {
        try {
            if (auth) {
                await signOut(auth);
            }
        } catch(e) { }
        try {
            const { supabase } = await import('@/lib/supabase');
            await supabase?.auth.signOut();
        } catch(e) { }
        localStorage.removeItem('projectflow_user');
        window.location.href = '/';
    };

    if (!isAdmin) {
        return (
            <div className="p-8">
                <Alert variant="destructive" className="max-w-2xl bg-red-50 text-red-900 border-red-200">
                    <Info className="h-4 w-4 text-red-600" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You must be an Administrator to access the offline database configuration wizard. 
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <PageHeader 
                title="Database Configuration" 
                description="Manage and switch between saved database profiles for your environment."
            >
                {!showNewForm && (
                     <Button onClick={() => setShowNewForm(true)} className="mr-2">
                         + Add New Connection
                     </Button>
                )}
            </PageHeader>

            {/* Existing environment status */}
            <Alert className="max-w-3xl bg-slate-100 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Current .env State</AlertTitle>
                <AlertDescription>
                    Automatically bound to <strong>{activeEnvironment?.provider || 'Unknown'}</strong>. Restart node engine if you swap active profiles below.
                </AlertDescription>
            </Alert>

            {/* Saved Profiles List */}
            <div className="space-y-4">
                {profiles.map((profile) => (
                    <Card key={profile.id} className={`max-w-3xl ${profile.isActive ? 'border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20' : 'border-primary/20'}`}>
                        <CardHeader className={`${profile.isActive ? 'bg-emerald-500/10' : 'bg-primary/5'} pb-4 border-b border-primary/10`}>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Server className={`w-5 h-5 ${profile.isActive ? 'text-emerald-600' : 'text-primary'}`} /> 
                                    {profile.profileName || 'Unnamed Profile'}
                                </CardTitle>
                                {profile.isActive && (
                                    <span className="text-xs font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full border border-emerald-200">
                                        Active Binding
                                    </span>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            {editingProfileId === profile.id && editConfig ? (
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-2 col-span-2">
                                        <Label>Project Name</Label>
                                        <Input value={editConfig.profileName} onChange={e => handleFieldChange('profileName', e.target.value, true)} placeholder="e.g. Staging Database" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Provider</Label>
                                        <Select value={editConfig.provider} onValueChange={(val) => handleProviderChange(val, true)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="firebase">Firebase</SelectItem>
                                                <SelectItem value="supabase">Supabase</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {editConfig.provider === 'firebase' && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>Project ID</Label>
                                                <Input value={editConfig.projectId || ''} onChange={e => handleFieldChange('projectId', e.target.value, true)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>API Key</Label>
                                                <Input value={editConfig.apiKey || ''} onChange={e => handleFieldChange('apiKey', e.target.value, true)} placeholder="Keep blank or update..." />
                                            </div>
                                        </>
                                    )}
                                    {editConfig.provider === 'supabase' && (
                                        <>
                                            <div className="space-y-2">
                                                <Label>Supabase URL</Label>
                                                <Input value={editConfig.supabaseUrl || ''} onChange={e => handleFieldChange('supabaseUrl', e.target.value, true)} />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Supabase Publishable Key</Label>
                                                <Input value={editConfig.supabaseAnonKey || ''} onChange={e => handleFieldChange('supabaseAnonKey', e.target.value, true)} placeholder="Update..." type="password" />
                                            </div>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-1">
                                        <span className="text-muted-foreground">Provider:</span>
                                        <p className="font-medium capitalize">{profile.provider}</p>
                                    </div>
                                    {profile.projectId && (
                                        <div className="space-y-1">
                                            <span className="text-muted-foreground">Project ID:</span>
                                            <p className="font-medium">{profile.projectId}</p>
                                        </div>
                                    )}
                                    {profile.supabaseUrl && (
                                        <div className="space-y-1">
                                            <span className="text-muted-foreground">Endpoint:</span>
                                            <p className="font-medium">{profile.supabaseUrl}</p>
                                        </div>
                                    )}
                                    {profile.apiKey && (
                                        <div className="space-y-1">
                                            <span className="text-muted-foreground">API Key / Token:</span>
                                            <p className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">{profile.apiKey}</p>
                                        </div>
                                    )}
                                    {profile.connectionString && (
                                        <div className="space-y-1">
                                            <span className="text-muted-foreground">Connection Path:</span>
                                            <p className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs truncate w-full">{profile.connectionString}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="flex gap-2 pt-4 border-t">
                                {editingProfileId === profile.id ? (
                                    <>
                                        <Button size="sm" onClick={handleSaveEditProfile} disabled={isLoading}>
                                            <Save className="mr-2 h-4 w-4" /> Save Edits
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => setEditingProfileId(null)} disabled={isLoading}>
                                            Cancel
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        {!profile.isActive && (
                                            <Button variant="default" size="sm" onClick={() => handleMakeActive(profile.id)} disabled={isLoading}>
                                                <Bookmark className="mr-2 h-4 w-4" /> Make Active Binding
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" onClick={() => initEditMode(profile)} disabled={isLoading}>
                                            Edit
                                        </Button>
                                        <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" size="sm" onClick={() => handleDeleteProfile(profile.id)} disabled={isLoading}>
                                            Delete
                                        </Button>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {profiles.length === 0 && !showNewForm && (
                     <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground">
                         No saved database profiles found. Click "Add New Connection" to create one.
                     </div>
                )}
            </div>

            {/* Form for New Connection */}
            {showNewForm && (
                <Card className="max-w-3xl border-primary shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DatabaseIcon className="w-5 h-5 text-primary" /> Unbound Connection Template
                        </CardTitle>
                        <CardDescription>Setup a new configuration. It will be saved into the dormant pool.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Project Name</Label>
                                <Input value={config.profileName} onChange={e => handleFieldChange('profileName', e.target.value)} placeholder="e.g. Staging Supabase" />
                            </div>
                            <div className="space-y-2">
                                <Label>Database Provider</Label>
                                <Select value={config.provider} onValueChange={(v) => handleProviderChange(v, false)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select provider" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="firebase">Firebase</SelectItem>
                                        <SelectItem value="supabase">Supabase</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-4 pt-4 border-t">
                            {config.provider === 'firebase' && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Project ID</Label>
                                            <Input value={config.projectId || ''} onChange={e => handleFieldChange('projectId', e.target.value)} placeholder="project-id" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>API Key</Label>
                                            <Input value={config.apiKey || ''} onChange={e => handleFieldChange('apiKey', e.target.value)} placeholder="AIzaSy..." />
                                        </div>
                                        <div className="col-span-2 pt-4">
                                             <Button variant="ghost" onClick={() => setShowAdvanced(!showAdvanced)} className="w-full text-muted-foreground justify-center hover:bg-muted/50 border border-muted">
                                                 {showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}
                                             </Button>
                                        </div>
                                        {showAdvanced && (
                                            <div className="col-span-2 grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-md border border-muted mt-2">
                                                <div className="space-y-2">
                                                    <Label>Auth Domain</Label>
                                                    <Input value={config.authDomain || ''} onChange={e => handleFieldChange('authDomain', e.target.value)} placeholder="project-id.firebaseapp.com" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Storage Bucket</Label>
                                                    <Input value={config.storageBucket || ''} onChange={e => handleFieldChange('storageBucket', e.target.value)} placeholder="project-id.appspot.com" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Messaging Sender ID</Label>
                                                    <Input value={config.messagingSenderId || ''} onChange={e => handleFieldChange('messagingSenderId', e.target.value)} placeholder="1234567890" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>App ID</Label>
                                                    <Input value={config.appId || ''} onChange={e => handleFieldChange('appId', e.target.value)} placeholder="1:1234567890:web:abcdef..." />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {config.provider === 'supabase' && (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Supabase URL</Label>
                                        <Input value={config.supabaseUrl || ''} onChange={e => handleFieldChange('supabaseUrl', e.target.value)} placeholder="https://your-project.supabase.co" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Supabase Publishable Key</Label>
                                        <Input value={config.supabaseAnonKey || ''} onChange={e => handleFieldChange('supabaseAnonKey', e.target.value)} placeholder="eyJh..." type="password" />
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="pt-4 flex gap-2 border-t">
                            <Button variant="default" onClick={handleSaveNewProfile} disabled={isLoading}>
                               {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Profile to Pool
                            </Button>
                            <Button variant="outline" onClick={handleTestConnection} disabled={isLoading || isTesting}>
                                {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Server className="mr-2 h-4 w-4" />} Test Connection
                            </Button>
                            <Button variant="ghost" onClick={() => setShowNewForm(false)} className="ml-auto">
                                Cancel
                            </Button>
                        </div>
                     </CardContent>
                </Card>
            )}

            <AlertDialog open={showRestartDialog} onOpenChange={setShowRestartDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Environment Changed</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have successfully changed the active database bindings. 
                            To safely connect to the new framework, you must force reload the application securely. 
                            This will clear your local sessions and log you out.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={performForcedRestart} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Logout & Reload Environment
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
