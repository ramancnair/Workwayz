'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ShieldCheck,
  FolderKanban,
  Briefcase,
  Users,
  Copy,
  Check,
  Search,
  Trash2,
  Database,
  X,
} from 'lucide-react';
import {
  StudioLog,
  StudioLogBatch,
  StudioProjectRef,
  StudioPortfolioRef,
  StudioUserRef,
  getActiveStudioItems,
} from './testDataEngine';

interface StudioLogViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch?: StudioLogBatch | null;
  runNumber?: number;
  studioLog?: StudioLog | null;
  onWipeBatch?: (batchId: string) => void;
}

export function StudioLogViewerModal({
  open,
  onOpenChange,
  batch,
  runNumber,
  studioLog,
  onWipeBatch,
}: StudioLogViewerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'items' | 'raw-json'>('items');

  // If a specific batch is provided, scope everything to that batch; otherwise fallback to the consolidated log
  const projects: StudioProjectRef[] = batch
    ? batch.projects || []
    : getActiveStudioItems(studioLog).projects;

  const portfolios: StudioPortfolioRef[] = batch
    ? batch.portfolios || []
    : getActiveStudioItems(studioLog).portfolios;

  const users: StudioUserRef[] = batch
    ? batch.users || []
    : getActiveStudioItems(studioLog).users;

  const totalItems = projects.length + portfolios.length + users.length;
  const adminUsersCount = users.filter(
    (u) => u.accessLevel === 'Administrator' || u.role === 'Administrator'
  ).length;

  const jsonPayload = batch || studioLog;

  const handleCopyJson = () => {
    if (!jsonPayload) return;
    navigator.clipboard.writeText(JSON.stringify(jsonPayload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const query = searchQuery.toLowerCase().trim();

  const filteredProjects = projects.filter(
    (p) =>
      p.id.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query) ||
      (p.portfolioId && p.portfolioId.toLowerCase().includes(query))
  );

  const filteredPortfolios = portfolios.filter(
    (p) =>
      p.id.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query)
  );

  const filteredUsers = users.filter(
    (u) =>
      u.id.toLowerCase().includes(query) ||
      (u.firstName && u.firstName.toLowerCase().includes(query)) ||
      (u.lastName && u.lastName.toLowerCase().includes(query)) ||
      u.email.toLowerCase().includes(query) ||
      (u.accessLevel && u.accessLevel.toLowerCase().includes(query))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col p-0 overflow-hidden" bypassScrollWrapper>
        {/* Header */}
        <div className="p-5 border-b bg-muted/20 space-y-2 shrink-0 relative">
          <div className="flex items-center justify-between gap-3 pr-10 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-lg font-bold truncate">
                  {batch
                    ? `Run #${runNumber ?? 1} Creation Log`
                    : 'Test Data Studio Log & Manifest'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {batch
                    ? `Generated on ${new Date(batch.timestamp).toLocaleString()}${
                        batch.preset ? ` (${batch.preset.toUpperCase()} Preset)` : ''
                      }`
                    : 'Persistent registry tracking all mock data created by generation runs.'}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {batch?.preset && (
                <Badge variant="outline" className="text-xs uppercase">
                  {batch.preset}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                {totalItems} Items Created
              </Badge>
            </div>
          </div>

          <DialogClose className="absolute right-4 top-4 shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-secondary-foreground shadow-sm transition-all hover:bg-secondary/80 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Close</span>
          </DialogClose>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-1 font-medium">
            <span className="flex items-center gap-1.5 text-foreground">
              <Briefcase className="w-3.5 h-3.5 text-primary" />
              {projects.length} Projects
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-foreground">
              <FolderKanban className="w-3.5 h-3.5 text-blue-500" />
              {portfolios.length} Portfolios
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-foreground">
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              {users.length} Users {adminUsersCount > 0 ? `(${adminUsersCount} Admin)` : ''}
            </span>
            {batch?.batchId && (
              <>
                <span>•</span>
                <span className="font-mono text-[10px] text-muted-foreground">ID: {batch.batchId}</span>
              </>
            )}
          </div>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-hidden flex flex-col p-5 space-y-3">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
              <TabsList className="grid grid-cols-2 w-full sm:w-auto">
                <TabsTrigger value="items" className="text-xs">
                  Created Assets ({totalItems})
                </TabsTrigger>
                <TabsTrigger value="raw-json" className="text-xs">
                  Raw JSON
                </TabsTrigger>
              </TabsList>

              {activeTab === 'items' && (
                <div className="relative w-full sm:w-64 mt-2 sm:mt-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search ID, name, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>
              )}

              {activeTab === 'raw-json' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyJson}
                  className="h-8 text-xs gap-1.5"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-500" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy JSON
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* TAB 1: CREATED ASSETS */}
            <TabsContent value="items" className="flex-1 overflow-y-auto space-y-4 pr-1 mt-3">
              {/* Projects */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-primary" />
                    Projects ({filteredProjects.length})
                  </span>
                </div>
                {filteredProjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic pl-5">No projects found</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredProjects.map((p) => (
                      <div
                        key={p.id}
                        className="bg-card border rounded p-2.5 text-xs flex flex-col justify-between space-y-1.5 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <code className="font-bold text-primary text-[11px]">{p.id}</code>
                          {p.portfolioId && (
                            <Badge variant="outline" className="text-[10px] font-mono">
                              Port: {p.portfolioId}
                            </Badge>
                          )}
                        </div>
                        <p className="text-foreground font-medium truncate" title={p.name}>
                          {p.name}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Portfolios */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-blue-500" />
                    Portfolios ({filteredPortfolios.length})
                  </span>
                </div>
                {filteredPortfolios.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic pl-5">No portfolios found</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredPortfolios.map((port) => (
                      <div
                        key={port.id}
                        className="bg-card border rounded p-2.5 text-xs flex items-center justify-between gap-2 shadow-sm"
                      >
                        <p className="text-foreground font-medium truncate" title={port.name}>
                          {port.name}
                        </p>
                        <code className="font-bold text-blue-600 dark:text-blue-400 text-[11px] shrink-0 font-mono">
                          {port.id}
                        </code>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Users */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between text-xs font-semibold text-foreground uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    Users ({filteredUsers.length})
                    {adminUsersCount > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 font-normal ml-1">
                        ({adminUsersCount} Administrator)
                      </span>
                    )}
                  </span>
                </div>
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic pl-5">No users found</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredUsers.map((u) => {
                      const isAdmin =
                        u.accessLevel === 'Administrator' || u.role === 'Administrator';
                      const displayName =
                        `${u.firstName || ''} ${u.lastName || ''}`.trim() ||
                        u.email?.split('@')[0] ||
                        u.id;
                      return (
                        <div
                          key={u.id}
                          className={`bg-card border rounded p-2.5 text-xs flex flex-col justify-between space-y-1.5 shadow-sm ${
                            isAdmin ? 'border-amber-500/40 bg-amber-500/5' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-foreground truncate">{displayName}</span>
                            <Badge
                              variant={isAdmin ? 'default' : 'secondary'}
                              className={`text-[10px] ${
                                isAdmin
                                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                                  : ''
                              }`}
                            >
                              {u.accessLevel || u.role || 'Member'}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                            <span className="truncate">{u.email}</span>
                            <span className="shrink-0 ml-1">{u.id}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB 2: RAW JSON */}
            <TabsContent value="raw-json" className="flex-1 overflow-hidden flex flex-col mt-3">
              <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                <span>
                  Exact JSON payload for this generation run:
                </span>
              </div>
              <pre className="flex-1 overflow-auto p-3 bg-muted/60 border rounded-lg font-mono text-[11px] text-foreground leading-relaxed whitespace-pre select-all">
                {JSON.stringify(jsonPayload, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="p-3 px-5 border-t bg-muted/20 flex items-center justify-between shrink-0">
          {onWipeBatch && batch?.batchId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onWipeBatch(batch.batchId);
                onOpenChange(false);
              }}
              className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs h-8 gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete This Run
            </Button>
          ) : (
            <div />
          )}

          <DialogClose asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
