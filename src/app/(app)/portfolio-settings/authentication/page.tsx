'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Save, Loader2, Key, Info, CheckCircle2, Bookmark } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';

type AuthProvider = 'firebase' | 'local';

interface AuthConfig {
    id?: string;
    profileName: string;
    provider?: string;
    keycloakUrl?: string;
    keycloakRealm?: string;
    keycloakClientId?: string;
    keycloakAdminClientSecret?: string;
    googleSso: boolean;
    facebookSso: boolean;
    appleSso: boolean;
    isActive?: boolean;
}

const defaultConfig: AuthConfig = {
    profileName: '',
    provider: 'firebase',
    googleSso: false,
    facebookSso: false,
    appleSso: false
};

export default function AuthenticationSettingsPage() {
    const [profiles, setProfiles] = useState<AuthConfig[]>([]);
    
    // UI states
    const [config, setConfig] = useState<AuthConfig>({ ...defaultConfig });
    const [showNewForm, setShowNewForm] = useState(false);
    const [showRestartDialog, setShowRestartDialog] = useState(false);
    
    // Execution states
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    
    // In-place editing state
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [editConfig, setEditConfig] = useState<AuthConfig | null>(null);

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
            const profRes = await fetch('/api/config/profiles');
            const profData = await profRes.json();
            setProfiles(profData.authentication || []);
            setIsLoading(false);
        } catch (e) {
            console.error("Failed to load configs", e);
            setIsLoading(false);
        }
    };

    // handleProviderChange removed as it is inherited

    const handleFieldChange = (field: keyof AuthConfig, value: any, forEdit = false) => {
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
            const res = await fetch('/api/config/profiles', {
                method: 'POST',
                body: JSON.stringify({ type: 'authentication', profile: { ...config } }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) throw new Error('Failed to save profile');
            const parsed = await res.json();
            if (parsed.success) {
                toast({ title: 'Profile Saved', description: 'Authentication profile added to pool.' });
                setShowNewForm(false);
                setConfig({ ...defaultConfig });
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
                body: JSON.stringify({ type: 'authentication', profile: { ...editConfig } }),
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
            const res = await fetch(`/api/config/profiles?type=authentication&id=${id}`, { method: 'DELETE' });
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
                body: JSON.stringify({ type: 'authentication', makeActiveId: id }),
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

    const initEditMode = (profile: AuthConfig) => {
        setEditConfig({ ...profile });
        setEditingProfileId(profile.id!);
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
                        You must be an Administrator to access the authentication configuration wizard. 
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    
    const activeProfile = profiles.find(p => p.isActive);

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Authentication Configuration" 
                description="Manage primary authentication methods and SSO options."
            >
                {!showNewForm && (
                     <Button onClick={() => setShowNewForm(true)} className="mr-2">
                         + Add New Setup
                     </Button>
                )}
            </PageHeader>



            {/* Saved Profiles List */}
            <div className="space-y-4">
                {profiles.map((profile) => (
                    <Card key={profile.id} className={`max-w-3xl ${profile.isActive ? 'border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20' : 'border-primary/20'}`}>
                        <CardHeader className={`${profile.isActive ? 'bg-emerald-500/10' : 'bg-primary/5'} pb-4 border-b border-primary/10`}>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Key className={`w-5 h-5 ${profile.isActive ? 'text-emerald-600' : 'text-primary'}`} /> 
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
                                        <Input value={editConfig.profileName} onChange={e => handleFieldChange('profileName', e.target.value, true)} placeholder="e.g. Prod Firebase Auth" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Primary Authentication Method</Label>
                                        <Select value={editConfig.provider || 'firebase'} onValueChange={v => handleFieldChange('provider', v, true)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="firebase">Firebase Auth</SelectItem>
                                                <SelectItem value="keycloak">Keycloak</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {editConfig.provider === 'keycloak' && (
                                        <>
                                            <div className="space-y-2 col-span-2">
                                                <Label>Keycloak URL</Label>
                                                <Input value={editConfig.keycloakUrl || ''} onChange={e => handleFieldChange('keycloakUrl', e.target.value, true)} placeholder="http://localhost:8080" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Realm</Label>
                                                <Input value={editConfig.keycloakRealm || ''} onChange={e => handleFieldChange('keycloakRealm', e.target.value, true)} placeholder="myrealm" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Client ID (Public)</Label>
                                                <Input value={editConfig.keycloakClientId || ''} onChange={e => handleFieldChange('keycloakClientId', e.target.value, true)} placeholder="myclient" />
                                            </div>
                                            <div className="space-y-2 col-span-2">
                                                <Label>Admin Client Secret (For User Autogen)</Label>
                                                <Input type="password" value={editConfig.keycloakAdminClientSecret || ''} onChange={e => handleFieldChange('keycloakAdminClientSecret', e.target.value, true)} placeholder="Enter service account secret" />
                                                <p className="text-xs text-muted-foreground mt-1">Required if you want to create Keycloak users directly from the ProjectFlow User panel.</p>
                                            </div>
                                        </>
                                    )}
                                    <div className="col-span-2 mt-4">
                                        <Label className="text-muted-foreground mb-4 block uppercase tracking-wider text-xs font-bold">Enabled SSO Providers</Label>
                                        <div className="flex flex-col gap-4 bg-muted/20 p-4 border rounded">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="google-sso" className="cursor-pointer">Google OAuth</Label>
                                                <Switch id="google-sso" checked={editConfig.googleSso} onCheckedChange={v => handleFieldChange('googleSso', v, true)} />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="facebook-sso" className="cursor-pointer">Facebook OAuth</Label>
                                                <Switch id="facebook-sso" checked={editConfig.facebookSso} onCheckedChange={v => handleFieldChange('facebookSso', v, true)} />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="apple-sso" className="cursor-pointer">Apple SSO</Label>
                                                <Switch id="apple-sso" checked={editConfig.appleSso} onCheckedChange={v => handleFieldChange('appleSso', v, true)} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-1">
                                        <span className="text-muted-foreground">Provider:</span>
                                        <p className="font-medium capitalize text-emerald-600">{profile.provider === 'keycloak' ? 'Keycloak' : 'Firebase Auth'}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-muted-foreground">SSO Configured:</span>
                                        <p className="font-medium">
                                            {[
                                                profile.googleSso && 'Google',
                                                profile.facebookSso && 'Facebook',
                                                profile.appleSso && 'Apple'
                                            ].filter(Boolean).join(', ') || 'None'}
                                        </p>
                                    </div>
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
                                            <Button variant="default" size="sm" onClick={() => handleMakeActive(profile.id!)} disabled={isLoading}>
                                                <Bookmark className="mr-2 h-4 w-4" /> Make Active Binding
                                            </Button>
                                        )}
                                        <Button variant="outline" size="sm" onClick={() => initEditMode(profile)} disabled={isLoading}>
                                            Edit
                                        </Button>
                                        <Button variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" size="sm" onClick={() => handleDeleteProfile(profile.id!)} disabled={isLoading}>
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
                         No saved authentication configurations found. Click "Add New Setup" to create one.
                     </div>
                )}
            </div>

            {/* Form for New Connection */}
            {showNewForm && (
                <Card className="max-w-3xl border-primary shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5 text-primary" /> New Authentication Setup
                        </CardTitle>
                        <CardDescription>Setup an authentication stack parameter base.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Project Name</Label>
                                <Input value={config.profileName} onChange={e => handleFieldChange('profileName', e.target.value)} placeholder="e.g. Firebase Staging Config" />
                            </div>
                            <div className="space-y-2">
                                <Label>Primary Method</Label>
                                <Select value={config.provider || 'firebase'} onValueChange={v => handleFieldChange('provider', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="firebase">Firebase Auth</SelectItem>
                                        <SelectItem value="keycloak">Keycloak</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {config.provider === 'keycloak' && (
                                <>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Keycloak URL</Label>
                                        <Input value={config.keycloakUrl || ''} onChange={e => handleFieldChange('keycloakUrl', e.target.value)} placeholder="http://localhost:8080" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Realm</Label>
                                        <Input value={config.keycloakRealm || ''} onChange={e => handleFieldChange('keycloakRealm', e.target.value)} placeholder="myrealm" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Client ID (Public)</Label>
                                        <Input value={config.keycloakClientId || ''} onChange={e => handleFieldChange('keycloakClientId', e.target.value)} placeholder="myclient" />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label>Admin Client Secret (For User Autogen)</Label>
                                        <Input type="password" value={config.keycloakAdminClientSecret || ''} onChange={e => handleFieldChange('keycloakAdminClientSecret', e.target.value)} placeholder="Enter service account secret" />
                                        <p className="text-xs text-muted-foreground mt-1">Required if you want to create Keycloak users directly from the ProjectFlow User panel.</p>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="col-span-2 mt-4 pt-4 border-t">
                            <Label className="text-muted-foreground mb-4 block uppercase tracking-wider text-xs font-bold">Configure SSO Integrations</Label>
                            <div className="flex flex-col gap-4 bg-muted/20 p-4 border rounded">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="new-google-sso" className="cursor-pointer flex flex-col">
                                        <span>Google OAuth</span>
                                        <span className="text-xs text-muted-foreground font-normal">Enable authenticating via Google identities</span>
                                    </Label>
                                    <Switch id="new-google-sso" checked={config.googleSso} onCheckedChange={v => handleFieldChange('googleSso', v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="new-facebook-sso" className="cursor-pointer flex flex-col">
                                        <span>Facebook OAuth</span>
                                        <span className="text-xs text-muted-foreground font-normal">Enable authenticating via Facebook identities</span>
                                    </Label>
                                    <Switch id="new-facebook-sso" checked={config.facebookSso} onCheckedChange={v => handleFieldChange('facebookSso', v)} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="new-apple-sso" className="cursor-pointer flex flex-col">
                                        <span>Apple SSO</span>
                                        <span className="text-xs text-muted-foreground font-normal">Enable authenticating via Apple identitites</span>
                                    </Label>
                                    <Switch id="new-apple-sso" checked={config.appleSso} onCheckedChange={v => handleFieldChange('appleSso', v)} />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex gap-2 border-t">
                            <Button variant="default" onClick={handleSaveNewProfile} disabled={isLoading}>
                               {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Setup
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
                        <AlertDialogTitle>Authentication Changed</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have successfully changed the active authentication bindings. 
                            To safely connect to the new identity provider, you must force reload the application securely. 
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
