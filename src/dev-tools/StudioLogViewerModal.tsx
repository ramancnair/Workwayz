'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
  FileCode,
  Layers,
  Database,
} from 'lucide-react';
import { StudioLog, getActiveStudioItems } from './testDataEngine';

interface StudioLogViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studioLog: StudioLog | null;
  onWipeBatch?: (batchId: string) => void;
}

export function StudioLogViewerModal({
  open,
  onOpenChange,
  studioLog,
  onWipeBatch,
}: StudioLogViewerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('all-items');

  const activeItems = getActiveStudioItems(studioLog);
  const totalItems =
    activeItems.projectIds.length +
    activeItems.portfolioIds.length +
    activeItems.userIds.length;

  const handleCopyJson = () => {
    if (!studioLog) return;
    navigator.clipboard.writeText(JSON.stringify(studioLog, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const query = searchQuery.toLowerCase().trim();

  const filteredProjects = activeItems.projects.filter(
    (p) =>
      p.id.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query) ||
      (p.portfolioId && p.portfolioId.toLowerCase().includes(query))
  );

  const filteredPortfolios = activeItems.portfolios.filter(
    (p) =>
      p.id.toLowerCase().includes(query) ||
      p.name.toLowerCase().includes(query)
  );

  const filteredUsers = activeItems.users.filter(
    (u) =>
      u.id.toLowerCase().includes(query) ||
      u.name.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      (u.accessLevel && u.accessLevel.toLowerCase().includes(query))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b bg-muted/20 space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">
                  Test Data Studio Log & Manifest
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Persistent registry tracking all mock data created by generation runs.
                </DialogDescription>
              </div>
            </div>
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
              {totalItems} Tracked Items ({studioLog?.batches?.length || 0} Runs)
            </Badge>
          </div>

          {/* Storage Locations Notice */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap pt-1 font-mono">
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-blue-500" />
              Firestore: <code className="text-foreground">settings/test_data_studio_log</code>
            </span>
            <span>•</span>
            <span>
              Cache: <code className="text-foreground">localStorage: projectflow_test_studio_manifest</code>
            </span>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="flex-1 overflow-hidden flex flex-col p-5 space-y-3">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
              <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                <TabsTrigger value="all-items" className="text-xs">
                  All Assets ({totalItems})
                </TabsTrigger>
                <TabsTrigger value="by-run" className="text-xs">
                  By Run ({studioLog?.batches?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="raw-json" className="text-xs">
                  Raw JSON
                </TabsTrigger>
              </TabsList>

              {activeTab === 'all-items' && (
                <div className="relative w-full sm:w-56 mt-2 sm:mt-0">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID, name, email..."
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

            {/* TAB 1: ALL ASSETS */}
            <TabsContent value="all-items" className="flex-1 overflow-y-auto space-y-4 pr-1 mt-3">
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
                        className="bg-card border rounded p-2.5 text-xs flex flex-col justify-between space-y-1"
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
                        className="bg-card border rounded p-2.5 text-xs flex items-center justify-between gap-2"
                      >
                        <span className="text-foreground font-medium truncate" title={port.name}>
                          {port.name}
                        </span>
                        <code className="font-mono text-blue-600 dark:text-blue-400 text-[11px] shrink-0">
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
                    <Users className="w-3.5 h-3.5 text-green-500" />
                    Users ({filteredUsers.length})
                  </span>
                </div>
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic pl-5">No users found</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredUsers.map((u) => {
                      const isAdmin =
                        u.accessLevel === 'Administrator' || u.role === 'Administrator';
                      return (
                        <div
                          key={u.id}
                          className="bg-card border rounded p-2.5 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-semibold text-foreground truncate">{u.name}</span>
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

            {/* TAB 2: BY RUN */}
            <TabsContent value="by-run" className="flex-1 overflow-y-auto space-y-3 pr-1 mt-3">
              {(studioLog?.batches || []).length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-6 text-center">
                  No generation runs logged yet.
                </p>
              ) : (
                (studioLog?.batches || []).map((b, idx) => {
                  const batchAdmins =
                    b.users?.filter(
                      (u) => u.accessLevel === 'Administrator' || u.role === 'Administrator'
                    ).length || 0;

                  return (
                    <div
                      key={b.batchId}
                      className="border rounded-lg bg-card p-3.5 space-y-3 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">
                            Run #{idx + 1}
                          </span>
                          {b.preset && (
                            <Badge variant="outline" className="uppercase text-[10px]">
                              {b.preset} Preset
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground font-mono">
                            {new Date(b.timestamp).toLocaleString()}
                          </span>
                        </div>

                        {onWipeBatch && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onWipeBatch(b.batchId)}
                            className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete Run #{idx + 1}
                          </Button>
                        )}
                      </div>

                      {/* Assets in this run */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="bg-muted/40 rounded p-2 border">
                          <span className="text-[11px] text-muted-foreground block mb-1">
                            Projects ({b.projects?.length || 0})
                          </span>
                          <p className="font-mono text-[11px] text-foreground truncate">
                            {b.projects?.map((p) => p.id).join(', ') || 'None'}
                          </p>
                        </div>
                        <div className="bg-muted/40 rounded p-2 border">
                          <span className="text-[11px] text-muted-foreground block mb-1">
                            Portfolios ({b.portfolios?.length || 0})
                          </span>
                          <p className="font-mono text-[11px] text-foreground truncate">
                            {b.portfolios?.map((port) => port.id).join(', ') || 'None'}
                          </p>
                        </div>
                        <div className="bg-muted/40 rounded p-2 border">
                          <span className="text-[11px] text-muted-foreground block mb-1">
                            Users ({b.users?.length || 0})
                            {batchAdmins > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 font-semibold ml-1">
                                ({batchAdmins} Admin)
                              </span>
                            )}
                          </span>
                          <p className="font-mono text-[11px] text-foreground truncate">
                            {b.users?.map((u) => u.id).join(', ') || 'None'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>

            {/* TAB 3: RAW JSON */}
            <TabsContent value="raw-json" className="flex-1 overflow-hidden flex flex-col mt-3">
              <div className="text-xs text-muted-foreground mb-2 flex items-center justify-between">
                <span>
                  The raw JSON manifest stored in Firestore (<code>settings/test_data_studio_log</code>)
                </span>
              </div>
              <pre className="flex-1 overflow-auto p-3 bg-muted/60 border rounded-lg font-mono text-[11px] text-foreground leading-relaxed whitespace-pre select-all">
                {JSON.stringify(studioLog, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
