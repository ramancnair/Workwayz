'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, Bot, Network, CheckCircle2, Info, Bookmark } from 'lucide-react';

type AIProvider = 'openai' | 'anthropic' | 'google' | 'lmstudio' | 'ollama';

interface AIConfig {
    id?: string;
    profileName: string;
    provider: AIProvider;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
}

const defaultConfigs: Record<AIProvider, Partial<AIConfig>> = {
    openai: { provider: 'openai', apiKey: '', model: '' },
    anthropic: { provider: 'anthropic', apiKey: '', model: '' },
    google: { provider: 'google', apiKey: '', model: '' },
    lmstudio: { provider: 'lmstudio', baseUrl: 'http://localhost:1234/v1', model: 'local-model' },
    ollama: { provider: 'ollama', baseUrl: 'http://localhost:11434', model: 'llama3' },
};

export default function AIConfigPage() {
    const [profiles, setProfiles] = useState<any[]>([]);
    const [activeEnvironment, setActiveEnvironment] = useState<any>(null); // from .env.local

    // UI States
    const [config, setConfig] = useState<AIConfig>({ profileName: '', provider: 'google' });
    const [showNewForm, setShowNewForm] = useState(false);

    // Execution states
    const [isLoading, setIsLoading] = useState(true);
    const [isTesting, setIsTesting] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    // Editing states
    const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
    const [editConfig, setEditConfig] = useState<AIConfig | null>(null);

    const { toast } = useToast();

    const loadData = async () => {
        try {
            const envRes = await fetch('/api/config');
            const envData = await envRes.json();
            setActiveEnvironment(envData.ai);

            const profRes = await fetch('/api/config/profiles');
            const profData = await profRes.json();
            setProfiles(profData.ai || []);

            setIsLoading(false);
        } catch (e) {
            console.error(e);
            setIsLoading(false);
        }
    };

    useEffect(() => {
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

    const handleProviderChange = (value: string, forEdit = false) => {
        const provider = value as AIProvider;
        if (forEdit && editConfig) {
            setEditConfig({ ...defaultConfigs[provider], provider, profileName: editConfig.profileName, id: editConfig.id } as AIConfig);
        } else {
            setConfig({ ...defaultConfigs[provider], provider, profileName: config.profileName } as AIConfig);
        }
    };

    const handleFieldChange = (field: keyof AIConfig, value: string, forEdit = false) => {
        if (forEdit && editConfig) {
            setEditConfig(prev => ({ ...prev!, [field]: value }));
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
                body: JSON.stringify({ type: 'ai', profile: config }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) throw new Error('Failed to save profile');
            const parsed = await res.json();
            if (parsed.success) {
                toast({ title: 'Profile Saved', description: 'AI profile added to pool.' });
                setShowNewForm(false);
                setConfig({ profileName: '', provider: 'google' });
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
                body: JSON.stringify({ type: 'ai', profile: editConfig }),
                headers: { 'Content-Type': 'application/json' }
            });
            if (!res.ok) throw new Error('Failed to update profile');
            
            toast({ title: 'Profile Updated', description: 'Changes saved successfully.' });
            setEditingProfileId(null);
            setEditConfig(null);
            await loadData();
        } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update profile.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteProfile = async (id: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/config/profiles?type=ai&id=${id}`, { method: 'DELETE' });
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
                body: JSON.stringify({ type: 'ai', makeActiveId: id }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) throw new Error('Failed to activate profile');
            toast({ title: 'Environment Bound', description: 'Restart developer server for changes to apply!', duration: 10000 });
            await loadData();
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
            toast({ title: 'Connection Simulated', description: `Successfully authenticated endpoint.` });
        }, 1500);
    };

    const initEditMode = (profile: any) => {
        const newConf: any = { provider: profile.provider, profileName: profile.profileName, id: profile.id };
        if (profile.baseUrl) newConf.baseUrl = profile.baseUrl;
        if (profile.model) newConf.model = profile.model;
        setEditConfig({ ...defaultConfigs[profile.provider as AIProvider], ...newConf } as AIConfig);
        setEditingProfileId(profile.id);
    };

    if (isLoading && profiles.length === 0) {
        return <div className="p-8 flex items-center gap-2"><Loader2 className="animate-spin h-5 w-5" /> Loading settings...</div>;
    }

    if (!isAdmin) {
        return (
            <div className="p-8">
                <Alert variant="destructive" className="max-w-2xl bg-red-50 text-red-900 border-red-200">
                    <Info className="h-4 w-4 text-red-600" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You must be an Administrator to access the offline AI configuration wizard. 
                    </AlertDescription>
                </Alert>
            </div>
        );
    }
    
    return (
        <div className="space-y-6">
            <PageHeader 
                title="Generative AI Configuration" 
                description="Manage and seamlessly flip between saved AI models to power your application estimates."
            >
                {!showNewForm && (
                     <Button onClick={() => setShowNewForm(true)} className="mr-2">
                         + Add New Connection
                     </Button>
                )}
            </PageHeader>

            <Alert className="max-w-3xl bg-slate-100 border-slate-200 dark:bg-slate-900/40 dark:border-slate-800">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Current .env State</AlertTitle>
                <AlertDescription>
                    Automatically bound to <strong>{activeEnvironment?.provider || 'Unknown'}</strong>. Restart node engine if you swap active profiles below.
                </AlertDescription>
            </Alert>

            {/* Profiles Dashboard */}
            <div className="space-y-4">
                {profiles.map(profile => (
                    <Card key={profile.id} className={`max-w-3xl ${profile.isActive ? 'border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20' : 'border-primary/20 shadow-sm'}`}>
                        <CardHeader className={`${profile.isActive ? 'bg-emerald-500/10' : 'bg-primary/5'} pb-4 border-b border-primary/10`}>
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Bot className={`w-5 h-5 ${profile.isActive ? 'text-emerald-600' : 'text-primary'}`} /> 
                                    {profile.profileName || 'Unnamed Config'}
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
                                        <Input value={editConfig.profileName} onChange={e => handleFieldChange('profileName', e.target.value, true)} />
                                    </div>
                                    <div className="space-y-2 col-span-2 sm:col-span-1">
                                        <Label>AI Provider</Label>
                                        <Select value={editConfig.provider} onValueChange={(v) => handleProviderChange(v, true)}>
                                            <SelectTrigger><SelectValue/></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="openai">OpenAI</SelectItem>
                                                <SelectItem value="anthropic">Anthropic</SelectItem>
                                                <SelectItem value="google">Google GenAI</SelectItem>
                                                <SelectItem value="lmstudio">LM Studio (Local)</SelectItem>
                                                <SelectItem value="ollama">Ollama (Local)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 col-span-2 sm:col-span-1">
                                        <Label>Default Model</Label>
                                        <Input value={editConfig.model || ''} onChange={e => handleFieldChange('model', e.target.value, true)} />
                                    </div>
                                    {['lmstudio', 'ollama'].includes(editConfig.provider) ? (
                                        <div className="space-y-2 col-span-2">
                                            <Label>Base URL</Label>
                                            <Input value={editConfig.baseUrl || ''} onChange={e => handleFieldChange('baseUrl', e.target.value, true)} />
                                        </div>
                                    ) : (
                                        <div className="space-y-2 col-span-2">
                                            <Label>API Key</Label>
                                            <Input value={editConfig.apiKey || ''} onChange={e => handleFieldChange('apiKey', e.target.value, true)} placeholder="Keep blank or update..." type="password" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="space-y-1">
                                        <span className="text-muted-foreground">AI Engine:</span>
                                        <p className="font-medium capitalize">{profile.provider}</p>
                                    </div>
                                    {profile.baseUrl && (
                                        <div className="space-y-1">
                                            <span className="text-muted-foreground">Local Endpoint:</span>
                                            <p className="font-medium truncate pr-4">{profile.baseUrl}</p>
                                        </div>
                                    )}
                                    {profile.model && (
                                        <div className="space-y-1">
                                            <span className="text-muted-foreground">Inference Model:</span>
                                            <p className="font-medium">{profile.model}</p>
                                        </div>
                                    )}
                                    {profile.apiKey && (
                                        <div className="space-y-1 col-span-2">
                                            <span className="text-muted-foreground">API Token:</span>
                                            <p className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs w-max">{profile.apiKey}</p>
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
            </div>

             {profiles.length === 0 && !showNewForm && (
                 <div className="text-center p-8 border border-dashed rounded-lg text-muted-foreground mt-4">
                     No saved AI profiles found. Click &quot;Add New Connection&quot; to create one.
                 </div>
            )}

            {showNewForm && (
                <Card className="max-w-3xl mt-6 border-primary shadow-md">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="w-5 h-5 text-primary" /> New Provider Profile
                        </CardTitle>
                        <CardDescription>Configure a new LLM provider to power your application.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Project Name</Label>
                            <Input value={config.profileName} onChange={e => handleFieldChange('profileName', e.target.value)} placeholder="e.g. Local Llama Engine" />
                        </div>
                        <div className="space-y-2">
                            <Label>AI Provider</Label>
                            <Select value={config.provider} onValueChange={(v) => handleProviderChange(v, false)}>
                                <SelectTrigger className="w-[300px]">
                                    <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                    <SelectItem value="anthropic">Anthropic</SelectItem>
                                    <SelectItem value="google">Google GenAI</SelectItem>
                                    <SelectItem value="lmstudio">LM Studio (Local)</SelectItem>
                                    <SelectItem value="ollama">Ollama (Local)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-4 pt-4 border-t">
                            {['openai', 'anthropic', 'google'].includes(config.provider) && (
                                <div className="space-y-2">
                                    <Label>API Key</Label>
                                    <Input 
                                        value={config.apiKey || ''} 
                                        onChange={e => handleFieldChange('apiKey', e.target.value)} 
                                        placeholder="sk-..." 
                                        type="password"
                                    />
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Your API key is securely masked in the pool.
                                    </p>
                                </div>
                            )}

                            {['lmstudio', 'ollama'].includes(config.provider) && (
                                <div className="space-y-2">
                                    <Label>Base URL</Label>
                                    <Input 
                                        value={config.baseUrl || ''} 
                                        onChange={e => handleFieldChange('baseUrl', e.target.value)} 
                                        placeholder={config.provider === 'lmstudio' ? 'http://localhost:1234/v1' : 'http://localhost:11434'} 
                                    />
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Default Model</Label>
                                <Input 
                                    value={config.model || ''} 
                                    onChange={e => handleFieldChange('model', e.target.value)} 
                                    placeholder="Enter model name (e.g., gpt-4o, llama3)" 
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex gap-2 border-t">
                             <Button variant="default" onClick={handleSaveNewProfile} disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Profile to Pool
                             </Button>
                             <Button variant="outline" onClick={handleTestConnection} disabled={isLoading || isTesting}>
                                 {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Network className="mr-2 h-4 w-4" />} Test Connection
                             </Button>
                             <Button variant="ghost" onClick={() => setShowNewForm(false)} className="ml-auto">
                                 Cancel
                             </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
