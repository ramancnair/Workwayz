'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAppVersion } from '@/hooks/use-app-version';
import {
  Info,
  CheckCircle2,
  AlertCircle,
  ArrowUpCircle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Server,
  Terminal,
  Package,
  Layers,
  ShieldCheck,
  Github,
  Globe,
  Radio,
} from 'lucide-react';

export default function AboutPage() {
  const { versionInfo, isChecking, error, checkNow } = useAppVersion();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const currentVersion = versionInfo?.currentVersion || '8.0.2';
  const latestVersion = versionInfo?.latestVersion;
  const hasUpdate = Boolean(versionInfo?.hasUpdate);
  const isOffline = Boolean(versionInfo?.isOffline);
  const deploymentType = versionInfo?.deploymentType || 'npm';

  const npmUpdateCmd = 'npm install -g workwayz@latest';
  const npxCmd = 'npx workwayz@latest';
  const dockerUpdateCmd = `docker pull workwayz/workwayz:latest && docker stop workwayz-web && docker rm workwayz-web && docker run -d -p 3000:3000 -v workwayz-data:/app/data --name workwayz-web --restart always workwayz/workwayz:latest`;

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="About Workwayz"
        description="Application version, release status, environment diagnostics, and update tools."
      />

      {/* Hero Header Card */}
      <Card className="border-border bg-card shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden shrink-0 shadow-md ring-2 ring-emerald-500/20 bg-background flex items-center justify-center">
              <img
                src="/workwayz-icon.png"
                alt="Workwayz"
                className="w-12 h-12 object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Workwayz</h2>
                <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                  v{currentVersion}
                </Badge>
                <Badge variant="secondary" className="text-xs uppercase tracking-wider font-semibold">
                  Stable
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 max-w-xl">
                The All-in-One AI-Powered Project & Portfolio Management Platform for Small & Medium Businesses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => checkNow()}
              disabled={isChecking}
              className="gap-2 shadow-sm font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin text-emerald-500' : ''}`} />
              {isChecking ? 'Checking...' : 'Check for Updates'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Version Status & Update Action Card */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-base font-semibold">Version & Release Status</CardTitle>
            </div>
            {versionInfo?.checkedAt && (
              <span className="text-xs text-muted-foreground">
                Last checked: {new Date(versionInfo.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <CardDescription>
            Live synchronization with the official Workwayz npm and Docker distribution registries.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          {error && (
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm font-semibold">Check Failed</AlertTitle>
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}

          {isOffline ? (
            <Alert className="border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle className="text-sm font-semibold">Offline Environment Detected</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground mt-1">
                Workwayz is running disconnected from the external internet. Your local instance is operating normally, but online update checking is unavailable.
              </AlertDescription>
            </Alert>
          ) : hasUpdate ? (
            <div className="space-y-4">
              <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                <ArrowUpCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="ml-2">
                  <AlertTitle className="text-sm font-bold flex items-center gap-2">
                    Update Available: v{latestVersion}
                    <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-300 text-[10px] px-1.5 py-0">
                      New Release
                    </Badge>
                  </AlertTitle>
                  <AlertDescription className="text-xs text-muted-foreground mt-1">
                    A newer release of Workwayz (v{latestVersion}) is published. You are currently on v{currentVersion}. Follow the update steps below to upgrade.
                  </AlertDescription>
                </div>
              </Alert>

              <div className="border border-border rounded-lg p-4 bg-muted/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recommended Update Commands
                  </span>
                  <a
                    href={versionInfo?.releaseUrl || 'https://github.com/ramancnair/Workwayz/releases'}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    View Release Notes <ExternalLink className="h-3 w-3" />
                  </a>
                </div>

                <Tabs defaultValue={deploymentType === 'docker' ? 'docker' : 'npm'} className="w-full">
                  <TabsList className="grid grid-cols-3 max-w-md bg-muted text-muted-foreground border border-border">
                    <TabsTrigger value="npm">NPM Global</TabsTrigger>
                    <TabsTrigger value="npx">NPX Run</TabsTrigger>
                    <TabsTrigger value="docker">Docker</TabsTrigger>
                  </TabsList>

                  <TabsContent value="npm" className="space-y-2 mt-3">
                    <div className="flex items-center justify-between bg-background border border-border rounded-md px-3 py-2 font-mono text-xs">
                      <span className="text-foreground">{npmUpdateCmd}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                        onClick={() => handleCopy(npmUpdateCmd, 'npm')}
                        aria-label="Copy NPM command"
                      >
                        {copiedKey === 'npm' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Upgrades the globally installed CLI package. Your local database and settings in ~/.workwayz remain preserved.
                    </p>
                  </TabsContent>

                  <TabsContent value="npx" className="space-y-2 mt-3">
                    <div className="flex items-center justify-between bg-background border border-border rounded-md px-3 py-2 font-mono text-xs">
                      <span className="text-foreground">{npxCmd}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                        onClick={() => handleCopy(npxCmd, 'npx')}
                        aria-label="Copy NPX command"
                      >
                        {copiedKey === 'npx' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Rerunning npx workwayz@latest automatically downloads and boots the latest release without permanent installation.
                    </p>
                  </TabsContent>

                  <TabsContent value="docker" className="space-y-2 mt-3">
                    <div className="flex items-center justify-between bg-background border border-border rounded-md px-3 py-2 font-mono text-xs overflow-x-auto">
                      <span className="text-foreground truncate mr-2">{dockerUpdateCmd}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                        onClick={() => handleCopy(dockerUpdateCmd, 'docker')}
                        aria-label="Copy Docker command"
                      >
                        {copiedKey === 'docker' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Pulls the latest image and restarts the container attached to the existing workwayz-data volume.
                    </p>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold">You are running the latest version of Workwayz</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Your installation (v{currentVersion}) matches the latest published release. No action required.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Diagnostics & Community Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Diagnostics Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-base font-semibold">System Diagnostics</CardTitle>
            </div>
            <CardDescription>
              Runtime environment and infrastructure details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1 text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground flex items-center gap-2">
                <Terminal className="h-3.5 w-3.5" /> Deployment Mode
              </span>
              <Badge variant="outline" className="font-mono text-xs uppercase">
                {deploymentType}
              </Badge>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground flex items-center gap-2">
                <Layers className="h-3.5 w-3.5" /> Node.js Runtime
              </span>
              <span className="font-mono text-xs text-foreground">
                {versionInfo?.nodeVersion || 'v22+'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/60">
              <span className="text-muted-foreground flex items-center gap-2">
                <Server className="h-3.5 w-3.5" /> Host Platform
              </span>
              <span className="font-mono text-xs text-foreground uppercase">
                {versionInfo?.platform || 'node.js'}
              </span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5" /> Software License
              </span>
              <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                Apache 2.0
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Resources & Repositories Card */}
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-base font-semibold">Resources & Registries</CardTitle>
            </div>
            <CardDescription>
              Official distributions, source code, and community support.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 pt-1">
            <a
              href="https://github.com/ramancnair/Workwayz"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Github className="h-4 w-4 text-foreground" />
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    GitHub Repository
                  </p>
                  <p className="text-[11px] text-muted-foreground">Source code, issues, and discussions</p>
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
            </a>

            <a
              href="https://www.npmjs.com/package/workwayz"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Package className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    NPM Registry
                  </p>
                  <p className="text-[11px] text-muted-foreground">Official npm package and CLI binary</p>
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
            </a>

            <a
              href="https://hub.docker.com/r/workwayz/workwayz"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 hover:bg-muted/50 transition-colors group"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs font-semibold text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                    Docker Hub Container
                  </p>
                  <p className="text-[11px] text-muted-foreground">Pre-built self-hosting container images</p>
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

