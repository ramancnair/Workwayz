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
import { Loader2, RefreshCw, UploadCloud, Server, ShieldCheck, Activity, Github, Cpu, HardDrive, Copy, Check, Terminal, ExternalLink } from 'lucide-react';
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

  // Docker Host OS tab & copy feedback
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  // Helper for numeric SemVer comparison
  const parseSemVer = (ver: string): [number, number, number] | null => {
    if (!ver) return null;
    const match = ver.trim().replace(/^v/i, '').match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
    if (!match) return null;
    return [
      parseInt(match[1] || '0', 10),
      parseInt(match[2] || '0', 10),
      parseInt(match[3] || '0', 10)
    ];
  };

  const isNewerVersion = (tag: string, current: string) => {
    const vTag = parseSemVer(tag);
    const vCurr = parseSemVer(current);
    if (!vTag || !vCurr) return false;
    
    if (vTag[0] !== vCurr[0]) return vTag[0] > vCurr[0];
    if (vTag[1] !== vCurr[1]) return vTag[1] > vCurr[1];
    return vTag[2] > vCurr[2];
  };

  // Config Form
  const [githubRepo, setGithubRepo] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [npmPackage, setNpmPackage] = useState('@ramancnair/projectflow');
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
        setNpmPackage(data.config.npmPackage || '@ramancnair/projectflow');
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
          config: { githubRepo, githubToken, npmPackage }
        })
      });
      if (res.ok) {
        toast({ title: 'Configuration Saved', description: 'Update settings have been updated.' });
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

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCommand(id);
    setTimeout(() => setCopiedCommand(null), 2500);
    toast({ title: 'Copied to clipboard', description: 'Command ready to paste into your host terminal.' });
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

  const getActionType = () => {
    if (!selectedRelease) return 'Install';
    const cleanTag = selectedRelease.tagName.replace(/^v/, '');
    const cleanCurrent = (currentVersion || '').replace(/^v/, '');
    if (cleanTag === cleanCurrent) return 'Reinstall';
    if (isNewerVersion(selectedRelease.tagName, currentVersion || '')) return 'Install';
    return 'Downgrade to';
  };
  const actionType = getActionType();

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
                <CardDescription>
                  {diagnostics?.restartStrategy === 'Docker Container Managed' 
                    ? 'Check Docker Hub for the latest application images.' 
                    : 'Check NPM registry for the latest standalone releases.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(!releases) ? (
                  <div className="flex flex-col items-center justify-center py-6">
                    <Button onClick={handleCheckUpdate} disabled={checkingUpdate} className="w-full max-w-xs shadow-md">
                      {checkingUpdate ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      {checkingUpdate ? 'Checking...' : 'Check for Updates'}
                    </Button>
                  </div>
                ) : (releases.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <ShieldCheck className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="font-semibold text-lg">System is up to date!</h3>
                    <p className="text-sm text-muted-foreground mt-2">You are running the latest available version.</p>
                    <Button variant="outline" onClick={handleCheckUpdate} disabled={checkingUpdate} className="mt-6">
                      Check Again
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col p-4 rounded-xl border border-primary bg-primary/5 ring-1 ring-primary/20">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex flex-col">
                        <span className="font-semibold text-lg">Update Available</span>
                        <span className="text-sm font-medium">{releases[0]?.tagName}</span>
                      </div>
                      <Badge variant="default" className="bg-emerald-500 hover:bg-emerald-600">Latest</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground mb-4">
                      Published: {releases[0]?.publishedAt ? new Date(releases[0].publishedAt).toLocaleDateString() : 'Unknown'}
                    </span>
                    <Button variant="outline" size="sm" onClick={handleCheckUpdate} disabled={checkingUpdate} className="w-full">
                      {checkingUpdate ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                      Check Again
                    </Button>
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
                      {applying ? 'Installing...' : (diagnostics?.restartStrategy === 'Docker Container Managed' ? 'View Update Instructions' : `${actionType} ${selectedRelease.tagName}`)}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className={diagnostics?.restartStrategy === 'Docker Container Managed' ? 'max-w-2xl sm:max-w-2xl' : 'max-w-md'}>
                    <AlertDialogHeader>
                      {diagnostics?.restartStrategy === 'Docker Container Managed' ? (
                        <div className="flex items-start justify-between pr-2">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                              <Terminal className="w-5 h-5" />
                            </div>
                            <div>
                              <AlertDialogTitle className="text-lg font-semibold">
                                Host Terminal Instructions
                              </AlertDialogTitle>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Ordered commands to upgrade container to <span className="font-semibold text-foreground font-mono">{selectedRelease.tagName}</span>
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="font-mono text-xs px-2.5 py-1 bg-muted/40">
                            {selectedRelease.tagName}
                          </Badge>
                        </div>
                      ) : (
                        <AlertDialogTitle>{`${actionType} ${selectedRelease.tagName}?`}</AlertDialogTitle>
                      )}

                      <AlertDialogDescription asChild>
                        {diagnostics?.restartStrategy === 'Docker Container Managed' ? (
                              <div className="space-y-4 pt-3 text-left">
                                <p className="text-xs text-muted-foreground">
                                  Run the following command in the directory where your <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] font-semibold text-foreground">docker-compose.yml</code> file is located on the host:
                                </p>
                                
                                <div className="relative rounded-lg bg-zinc-950 p-4 text-zinc-100 font-mono text-xs shadow-inner border border-zinc-800">
                                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3 text-[11px] text-zinc-400">
                                    <span className="flex items-center gap-1.5 font-sans">
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                      Update Command
                                    </span>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      className="h-7 text-xs gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                                      onClick={() => copyToClipboard('docker compose pull && docker compose up -d', 'simplified')}
                                    >
                                      {copiedCommand === 'simplified' ? (
                                        <>
                                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                                          Copied!
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3.5 h-3.5" />
                                          Copy Command
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                  <div className="text-emerald-400 font-bold select-all overflow-x-auto">
                                    docker compose pull && docker compose up -d
                                  </div>
                                </div>

                            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-900 dark:text-blue-200">
                              <p className="font-medium flex items-center gap-1.5 mb-1 text-xs">
                                <ShieldCheck className="w-4 h-4 text-blue-500 flex-shrink-0" /> Data Safety Guarantee
                              </p>
                              <p className="text-[11px] opacity-90 leading-normal">
                                Your application database, settings, and file uploads reside in the persistent <code className="bg-blue-500/20 px-1 py-0.5 rounded font-mono font-semibold">projectflow-data</code> volume and remain 100% intact throughout the recreation.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span>
                            This will download the selected release and initiate an automatic system restart.
                            A pre-update snapshot will be created automatically, and the system will roll back if the new version fails to boot.
                          </span>
                        )}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-2">
                      {diagnostics?.restartStrategy === 'Docker Container Managed' ? (
                        <AlertDialogAction>Done</AlertDialogAction>
                      ) : (
                        <>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleApplyUpdate}>
                            Proceed with {actionType === 'Reinstall' ? 'Reinstallation' : actionType === 'Downgrade to' ? 'Downgrade' : 'Installation'}
                          </AlertDialogAction>
                        </>
                      )}
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
              <CardTitle>
                {diagnostics?.restartStrategy === 'Docker Container Managed' 
                  ? 'Docker Hub Repository Configuration' 
                  : 'GitHub Repository Configuration'}
              </CardTitle>
              <CardDescription>
                {diagnostics?.restartStrategy === 'Docker Container Managed'
                  ? 'Configure the Docker Hub repository where application images are published.'
                  : 'Configure the source repository for software updates.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {diagnostics?.restartStrategy === 'Docker Container Managed' ? (
                <div className="space-y-2">
                  <Label>Docker Hub Repository / Image</Label>
                  <Input 
                    value={githubRepo} 
                    onChange={e => setGithubRepo(e.target.value)} 
                    placeholder="e.g. ramancnair/projectflow or library/node"
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: namespace/repo (e.g. ramancnair/projectflow) or official image name (e.g. library/node)
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>NPM Package Name (Primary Update Source)</Label>
                    <Input 
                      value={npmPackage} 
                      onChange={e => setNpmPackage(e.target.value)} 
                      placeholder="e.g. @pf_test1999/projectflow or projectflow-standalone"
                    />
                    <p className="text-xs text-muted-foreground">
                      The package registry name on npmjs.org used to poll and download standalone updates.
                    </p>
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <Label>GitHub Repository (Fallback Source)</Label>
                    <Input 
                      value={githubRepo} 
                      onChange={e => setGithubRepo(e.target.value)} 
                      placeholder="e.g. ashdkr99/ash_test_repo1"
                    />
                    <p className="text-xs text-muted-foreground">
                      Repository used for manual releases and backup assets.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>GitHub Personal Access Token (For Private Repos)</Label>
                    <Input 
                      type="password"
                      value={githubToken} 
                      onChange={e => setGithubToken(e.target.value)} 
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    />
                    <p className="text-xs text-muted-foreground">Optional: Required only if fetching from private GitHub repositories.</p>
                  </div>
                </>
              )}
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
