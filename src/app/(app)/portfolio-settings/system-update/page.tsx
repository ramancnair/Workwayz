'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, RefreshCw, UploadCloud, Server, ShieldCheck, Activity, Github, Cpu, HardDrive } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function SystemUpdatePage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [lastError, setLastError] = useState<string | null>(null);

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [releases, setReleases] = useState<any[] | null>(null);
  const [selectedRelease, setSelectedRelease] = useState<any>(null);
  const [applying, setApplying] = useState(false);

  // Helper for simple semver comparison
  const isNewerVersion = (tag: string, current: string) => {
    const cleanTag = tag.replace(/^v/, '');
    const cleanCurrent = current.replace(/^v/, '');
    return cleanTag.localeCompare(cleanCurrent, undefined, { numeric: true, sensitivity: 'base' }) > 0;
  };

  // Config Form
  const [githubRepo, setGithubRepo] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/system-update');
      const data = await res.json();
      if (res.ok) {
        setDiagnostics(data.diagnostics);
        setConfig(data.config);
        setCurrentVersion(data.currentVersion);
        setLastError(data.lastError);
        
        setGithubRepo(data.config.githubRepo || '');
        setGithubToken(data.config.hasToken ? '********' : '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await fetch('/api/admin/system-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-config',
          config: { githubRepo, githubToken }
        })
      });
      if (res.ok) {
        toast({ title: 'Configuration Saved', description: 'GitHub settings have been updated.' });
        fetchData();
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setReleases(null);
    setSelectedRelease(null);
    try {
      const res = await fetch('/api/admin/system-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' })
      });
      const data = await res.json();
      
      if (res.ok) {
        // Filter to only newer versions
        const newerReleases = (data.releases || []).filter((r: any) => isNewerVersion(r.tagName, currentVersion));
        setReleases(newerReleases);
        if (newerReleases.length > 0) {
          setSelectedRelease(newerReleases[0]);
        }
      } else {
        toast({ title: 'Check Failed', description: data.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Check Failed', description: e.message, variant: 'destructive' });
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleApplyUpdate = async () => {
    if (!selectedRelease || !selectedRelease.asset) return;
    setApplying(true);
    try {
      const res = await fetch('/api/admin/system-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'apply', downloadUrl: selectedRelease.asset.downloadUrl })
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Update Failed', description: data.error, variant: 'destructive' });
        setApplying(false);
      } else {
        // If ok, trigger MaintenanceInterceptor immediately
        localStorage.setItem('pf_system_updating', 'true');
        window.dispatchEvent(new CustomEvent('pf_maintenance_start'));
      }
    } catch (e: any) {
      toast({ title: 'Update Failed', description: e.message, variant: 'destructive' });
      setApplying(false);
    }
  };

  if (loading) {
    return <div className="p-8 flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground w-8 h-8" /></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <PageHeader 
        title="System Update" 
        description="Manage application updates, server configuration, and release channels." 
      />

      {lastError && (
        <Alert variant="destructive">
          <Activity className="h-4 w-4" />
          <AlertTitle>Previous Update Failed</AlertTitle>
          <AlertDescription className="text-xs font-mono mt-2 bg-background/50 p-3 rounded">
            {lastError}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="status">Update Status</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  Current Installation
                </CardTitle>
                <CardDescription>Currently running version of ProjectFlow.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-muted/40 rounded-xl border border-border/50">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Version</span>
                    <span className="text-3xl font-bold tracking-tight">v{currentVersion}</span>
                  </div>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">Active</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-500" />
                  Available Updates
                </CardTitle>
                <CardDescription>Check GitHub for the latest releases.</CardDescription>
              </CardHeader>
              <CardContent>
                {!releases ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <Button onClick={handleCheckUpdate} disabled={checkingUpdate} className="w-full max-w-xs shadow-md">
                      {checkingUpdate ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Github className="w-4 h-4 mr-2" />}
                      {checkingUpdate ? 'Checking...' : 'Check for Updates'}
                    </Button>
                  </div>
                ) : releases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <ShieldCheck className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="font-semibold text-lg">System is up to date!</h3>
                    <p className="text-sm text-muted-foreground mt-2">You are running the latest available version.</p>
                    <Button variant="outline" onClick={handleCheckUpdate} disabled={checkingUpdate} className="mt-6">
                      Check Again
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {releases.map((release, idx) => (
                      <div 
                        key={release.tagName}
                        onClick={() => setSelectedRelease(release)}
                        className={`flex flex-col cursor-pointer p-4 rounded-xl border transition-all ${selectedRelease?.tagName === release.tagName ? 'border-primary bg-primary/5 ring-1 ring-primary/20' : 'hover:border-border hover:bg-muted/30'}`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-base">{release.tagName}</span>
                          {idx === 0 && <Badge variant="default" className="bg-blue-500 hover:bg-blue-600 text-[10px] px-2 py-0.5">Latest</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(release.publishedAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {selectedRelease && (
            <Card className="border-border/60 shadow-sm animate-in slide-in-from-bottom-4 fade-in duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b bg-muted/10">
                <div>
                  <CardTitle>Release Notes: {selectedRelease.tagName}</CardTitle>
                  <CardDescription className="mt-1">
                    {selectedRelease.name} • {new Date(selectedRelease.publishedAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="shadow-md" disabled={applying}>
                      {applying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UploadCloud className="w-4 h-4 mr-2" />}
                      {applying ? 'Installing...' : `Install ${selectedRelease.tagName}`}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Install {selectedRelease.tagName}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will download the selected release and initiate an automatic system restart.
                        A pre-update snapshot will be created automatically, and the system will roll back if the new version fails to boot.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleApplyUpdate}>Proceed with Installation</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="prose prose-sm dark:prose-invert max-w-none p-4 bg-muted/20 rounded-md border whitespace-pre-wrap font-mono text-xs max-h-96 overflow-y-auto">
                  {selectedRelease.body || 'No release notes provided.'}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>GitHub Repository Configuration</CardTitle>
              <CardDescription>Configure the source repository for software updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>GitHub Repository</Label>
                <Input 
                  value={githubRepo} 
                  onChange={e => setGithubRepo(e.target.value)} 
                  placeholder="e.g. ramancnair/ProjectFlow"
                />
                <p className="text-xs text-muted-foreground">Format: owner/repo</p>
              </div>
              <div className="space-y-2">
                <Label>Personal Access Token (For Private Repos)</Label>
                <Input 
                  type="password"
                  value={githubToken} 
                  onChange={e => setGithubToken(e.target.value)} 
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                />
                <p className="text-xs text-muted-foreground">Required to fetch releases and download assets from private repositories. Needs 'repo' scope.</p>
              </div>
              <Button onClick={handleSaveConfig} disabled={savingConfig}>
                {savingConfig && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="diagnostics">
          <Card>
            <CardHeader>
              <CardTitle>Server Hardware & Environment</CardTitle>
              <CardDescription>Real-time diagnostics of the host machine running ProjectFlow.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col p-4 bg-muted/30 rounded-lg border">
                  <Server className="w-5 h-5 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground uppercase">Platform</span>
                  <span className="font-semibold">{diagnostics?.platform} ({diagnostics?.arch})</span>
                </div>
                <div className="flex flex-col p-4 bg-muted/30 rounded-lg border">
                  <Cpu className="w-5 h-5 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground uppercase">CPU Cores</span>
                  <span className="font-semibold">{diagnostics?.cpuCores} Cores</span>
                </div>
                <div className="flex flex-col p-4 bg-muted/30 rounded-lg border">
                  <HardDrive className="w-5 h-5 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground uppercase">Memory</span>
                  <span className="font-semibold">{diagnostics?.totalMemoryGB} GB Total</span>
                </div>
                <div className="flex flex-col p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <RefreshCw className="w-5 h-5 text-primary mb-2" />
                  <span className="text-xs text-primary uppercase">Restart Strategy</span>
                  <span className="font-semibold text-primary/90 text-sm">{diagnostics?.restartStrategy}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
