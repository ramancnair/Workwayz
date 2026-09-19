'use client';

import { useState, useEffect } from 'react';
import {
  Sparkles,
  Trash2,
  X,
  Loader2,
  Layers,
  Zap,
  Cpu,
  FolderKanban,
  Users,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/db-provider';
import { collection, getDocs } from '@/lib/db-provider';
import {
  GeneratorConfig,
  PRESET_CONFIGS,
  generateEmployees,
  ensurePortfolios,
  generateProjects,
  wipeWorkspaceTestData,
  getStudioLog,
  recordStudioLog,
  getActiveStudioItems,
  StudioLog,
  StudioLogBatch,
} from './testDataEngine';
import { StudioLogViewerModal } from './StudioLogViewerModal';
import type { Portfolio } from '@/types';

interface TestDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TestDataModal({ isOpen, onClose }: TestDataModalProps) {
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>('presets');
  const [selectedPreset, setSelectedPreset] = useState<'minimal' | 'standard' | 'stress'>('standard');
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);

  // Studio Log state
  const [studioLog, setStudioLog] = useState<StudioLog | null>(null);
  const [loadingLog, setLoadingLog] = useState(true);

  const [showLogViewer, setShowLogViewer] = useState(false);
  const [selectedRun, setSelectedRun] = useState<{ batch: StudioLogBatch; runNumber: number } | null>(null);

  // Configuration state
  const [config, setConfig] = useState<GeneratorConfig>(PRESET_CONFIGS.standard);
  const [targetPortfolioId, setTargetPortfolioId] = useState<string>('auto');

  // Execution states
  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load existing portfolios and studio log
  useEffect(() => {
    if (!isOpen) return;
    const fetchPortfolios = async () => {
      if (!db) return;
      try {
        const snap = await getDocs(collection(db, 'portfolios'));
        const list: Portfolio[] = [];
        snap.forEach((d: any) => {
          const data = d.data();
          if (!data.isDeleted) list.push({ ...data, id: d.id });
        });
        setPortfolios(list);
      } catch (err) {
        console.warn('Failed to load portfolios for Test Data Studio', err);
      }
    };

    const fetchStudioLog = async () => {
      try {
        const log = await getStudioLog();
        setStudioLog(log);
      } catch (err) {
        console.warn('Failed to load studio log:', err);
      } finally {
        setLoadingLog(false);
      }
    };

    fetchPortfolios();
    fetchStudioLog();
  }, [isOpen]);

  if (!isOpen) return null;

  const activeItems = getActiveStudioItems(studioLog);
  const hasActiveStudioData = activeItems.projectIds.length > 0 || activeItems.portfolioIds.length > 0 || activeItems.userIds.length > 0;

  const applyPreset = (presetKey: 'minimal' | 'standard' | 'stress') => {
    setSelectedPreset(presetKey);
    setConfig(PRESET_CONFIGS[presetKey]);
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    setProgressMsg('Starting test data generation pipeline...');

    try {
      // 1. Generate Dedicated Users
      setProgressMsg('Generating users & provisioning auth identities...');
      const createdUsers = await generateEmployees(
        config.userCount,
        config.roleDistribution,
        msg => setProgressMsg(msg)
      );

      // 2. Create Brand New Dedicated Portfolios (strictly isolated)
      setProgressMsg('Preparing isolated demo portfolios...');
      const resolvedPortfolios = await ensurePortfolios(
        config.portfolioCount,
        msg => setProgressMsg(msg)
      );
      const portfolioIdsToUse = resolvedPortfolios.map(p => p.id);

      // 3. Generate Projects with all subcollections (strictly using new users)
      setProgressMsg('Building projects with relational subcollections...');
      const createdProjects = await generateProjects({
        count: config.projectCount,
        portfolioIds: portfolioIdsToUse,
        pricingModel: config.pricingModel,
        globalUsers: createdUsers,
        onProgress: msg => setProgressMsg(msg)
      });

      // 4. Record to Studio Creation Log manifest
      setProgressMsg('Recording created items to Studio manifest log...');
      const savedLog = await recordStudioLog({
        projects: createdProjects,
        portfolios: resolvedPortfolios,
        users: createdUsers,
        preset: activeTab === 'presets' ? selectedPreset : 'custom',
      });
      setStudioLog(savedLog);

      setStatusMessage({
        type: 'success',
        text: `Successfully generated ${createdProjects.length} projects and ${createdUsers.length} users. Studio creation log updated. Refreshing workspace...`
      });

      toast({
        title: 'Test Data Studio Generation Complete',
        description: `Populated ${createdProjects.length} project(s) across ${portfolioIdsToUse.length} portfolio(s). Studio manifest recorded.`
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error('Test data generation error:', err);
      setStatusMessage({
        type: 'error',
        text: `Generation failed: ${err?.message || 'Check browser console for error details.'}`
      });
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: err?.message || 'Could not complete test data generation.'
      });
    } finally {
      setIsLoading(false);
      setProgressMsg(null);
    }
  };

  const handleWipe = async () => {
    const confirmMessage = hasActiveStudioData
      ? `Wipe studio test data? This will safely remove:
• ${activeItems.projectIds.length} project(s) created by the studio
• ${activeItems.portfolioIds.length} portfolio(s) created by the studio
• ${activeItems.userIds.length} user(s) created by the studio (including any studio-created admin users)

All original users, pre-existing projects, and genuine portfolios will remain completely untouched. The studio creation log will be removed after deletion.`
      : 'Wipe studio test data? This will remove mock test data created by the studio. Real user accounts and genuine data are safely preserved.';

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    setIsLoading(true);
    setStatusMessage(null);
    setProgressMsg('Reading studio creation log and wiping studio assets...');

    try {
      const { deletedProjects, deletedUsers, deletedPortfolios } = await wipeWorkspaceTestData({
        wipeProjects: true,
        wipeUsers: true,
        wipePortfolios: true,
        onProgress: msg => setProgressMsg(msg)
      });

      setStudioLog(null);

      setStatusMessage({
        type: 'success',
        text: `Cleaned up ${deletedProjects} studio project(s), ${deletedPortfolios} portfolio(s), and ${deletedUsers} mock user(s) (including studio admins). Studio log cleared. Reloading workspace...`
      });

      toast({
        title: 'Workspace Reset Complete',
        description: `Wiped ${deletedProjects} projects, ${deletedPortfolios} portfolios, and ${deletedUsers} test users. Original users and projects preserved.`
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error('Wipe test data error:', err);
      setStatusMessage({
        type: 'error',
        text: `Wipe failed: ${err?.message || 'Check browser console.'}`
      });
      toast({
        variant: 'destructive',
        title: 'Wipe Failed',
        description: err?.message || 'Could not wipe test data.'
      });
    } finally {
      setIsLoading(false);
      setProgressMsg(null);
    }
  };

  const handleWipeBatch = async (batchId: string) => {
    const batch = studioLog?.batches?.find(b => b.batchId === batchId);
    if (!batch) return;

    const numProjects = batch.projects?.length || 0;
    const numPortfolios = batch.portfolios?.length || 0;
    const numUsers = batch.users?.length || 0;
    const numAdmins = batch.users?.filter(u => u.accessLevel === 'Administrator').length || 0;

    const confirmed = window.confirm(
      `Wipe test data for this specific run (${batch.preset ? `${batch.preset.toUpperCase()} preset` : 'custom'}, generated at ${new Date(batch.timestamp).toLocaleTimeString()})?

This will remove:
• ${numProjects} project(s) created in this run
• ${numPortfolios} portfolio(s) created in this run
• ${numUsers} user(s) created in this run ${numAdmins > 0 ? `(including ${numAdmins} studio admin)` : ''}

Other studio runs, original users, and genuine projects/portfolios will remain completely untouched.`
    );
    if (!confirmed) return;

    setIsLoading(true);
    setStatusMessage(null);
    setProgressMsg(`Wiping studio test data for run ${batchId}...`);

    try {
      const { deletedProjects, deletedUsers, deletedPortfolios } = await wipeWorkspaceTestData({
        batchId,
        wipeProjects: true,
        wipeUsers: true,
        wipePortfolios: true,
        onProgress: msg => setProgressMsg(msg)
      });

      const updatedLog = await getStudioLog();
      setStudioLog(updatedLog);

      setStatusMessage({
        type: 'success',
        text: `Cleaned up run ${batchId}: removed ${deletedProjects} project(s), ${deletedPortfolios} portfolio(s), and ${deletedUsers} user(s). Remaining studio logs updated.`
      });

      toast({
        title: 'Studio Run Wiped',
        description: `Wiped ${deletedProjects} projects, ${deletedPortfolios} portfolios, and ${deletedUsers} users from this run.`
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error('Wipe batch error:', err);
      setStatusMessage({
        type: 'error',
        text: `Failed to wipe run: ${err?.message || 'Check console.'}`
      });
      toast({
        variant: 'destructive',
        title: 'Run Wipe Failed',
        description: err?.message || 'Could not wipe this run.'
      });
    } finally {
      setIsLoading(false);
      setProgressMsg(null);
    }
  };

  // Live Summary Stats
  const estPortfolios = targetPortfolioId === 'auto' ? config.portfolioCount : 1;
  const estProjects = config.projectCount;
  const estWorkItems = estProjects * 8;
  const estSprints = estProjects * 3;
  const estTestCycles = estProjects * 3;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[99999] p-4 animate-in fade-in duration-200">
      <div className="bg-card text-card-foreground border border-border rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 relative">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-border mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-foreground">Test Data Studio</h2>
                <Badge variant="secondary" className="text-xs">
                  DEV &amp; QA
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Populate relationally linked test datasets across Portfolios, Projects, Sprints, Stories, and Members.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <Alert
            className={`mb-5 ${
              statusMessage.type === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-foreground dark:text-emerald-300'
                : 'border-destructive/40 bg-destructive/10 text-destructive'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
            )}
            <AlertTitle>{statusMessage.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
            <AlertDescription className="text-xs">{statusMessage.text}</AlertDescription>
          </Alert>
        )}

        {/* Live In-Progress Banner */}
        {isLoading && progressMsg && (
          <Alert className="mb-5 border-primary/40 bg-primary/5 text-foreground flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
            <AlertDescription className="text-xs font-medium">{progressMsg}</AlertDescription>
          </Alert>
        )}

        {/* Active Studio Test Data Manifest Log */}
        {hasActiveStudioData ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-3.5 mb-6 space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-foreground">Active Studio Generation Log</span>
                <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
                  Tracked ({activeItems.projectIds.length + activeItems.portfolioIds.length + activeItems.userIds.length} items)
                </Badge>
              </div>
              {studioLog?.lastUpdated && (
                <span className="text-[10px] text-muted-foreground">
                  Logged: {new Date(studioLog.lastUpdated).toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Distinct Generation Runs Breakdown */}
            <div className="space-y-2 pt-2 border-t border-amber-500/20">
              <div className="text-[10px] font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Logged Studio Runs ({studioLog?.batches?.length || 0})</span>
                <span className="text-[10px] text-muted-foreground font-normal">
                  Wipe selectively per run or all below
                </span>
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {(studioLog?.batches || []).map((b, idx) => {
                  const batchAdmins = b.users?.filter(u => u.accessLevel === 'Administrator').length || 0;
                  return (
                    <div
                      key={b.batchId}
                      className="bg-card/90 border border-border rounded p-2.5 flex items-center justify-between gap-2 flex-wrap text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground text-xs">
                            Run #{idx + 1} {b.preset ? `(${b.preset.toUpperCase()})` : ''}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(b.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5 flex-wrap">
                          <span>{b.projects?.length || 0} Proj</span>
                          <span>•</span>
                          <span>{b.portfolios?.length || 0} Port</span>
                          <span>•</span>
                          <span>{b.users?.length || 0} Users {batchAdmins > 0 ? `(${batchAdmins} Admin)` : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRun({ batch: b, runNumber: idx + 1 });
                            setShowLogViewer(true);
                          }}
                          className="h-6 text-[11px] px-2 gap-1 border-border hover:bg-muted text-foreground"
                        >
                          <Eye className="w-3 h-3 text-muted-foreground" />
                          View Log
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isLoading}
                          onClick={() => handleWipeBatch(b.batchId)}
                          className="text-destructive hover:bg-destructive/10 border-destructive/30 text-[11px] h-6 px-2 gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete Run #{idx + 1}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border bg-muted/20 p-3 mb-6 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>No active studio test data logged. Workspace is clean.</span>
            </div>
            <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              Clean State
            </Badge>
          </div>
        )}

        {/* Target Portfolio Selection */}
        <div className="space-y-2 mb-6">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Target Portfolio Destination
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTargetPortfolioId('auto')}
              className={`p-3 rounded-md border text-left text-xs transition-colors flex items-center gap-3 ${
                targetPortfolioId === 'auto'
                  ? 'border-primary bg-primary/5 text-foreground ring-1 ring-primary/30'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40'
              }`}
            >
              <Briefcase className={`w-4 h-4 shrink-0 ${targetPortfolioId === 'auto' ? 'text-primary' : 'text-muted-foreground'}`} />
              <div>
                <div className="font-medium text-foreground">Auto-create / Balance Portfolios</div>
                <div className="text-[11px] text-muted-foreground">Scaffolds demo portfolios automatically</div>
              </div>
            </button>

            <Select
              value={targetPortfolioId}
              onValueChange={(val) => setTargetPortfolioId(val)}
            >
              <SelectTrigger className="h-full min-h-[48px]">
                <SelectValue placeholder="Select target portfolio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-create / Balance Portfolios</SelectItem>
                {portfolios.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="mb-6">
          <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
            <TabsList>
              <TabsTrigger value="presets" className="gap-1.5 text-xs">
                <Zap className="w-3.5 h-3.5" />
                Quick Presets
              </TabsTrigger>
              <TabsTrigger value="custom" className="gap-1.5 text-xs">
                <Layers className="w-3.5 h-3.5" />
                Custom Sliders
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* TAB 1: PRESETS */}
        {activeTab === 'presets' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Minimal Starter */}
            <div
              onClick={() => applyPreset('minimal')}
              className={`p-4 rounded-md border transition-all cursor-pointer flex flex-col justify-between ${
                selectedPreset === 'minimal'
                  ? 'border-2 border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                    <Zap className={`w-4 h-4 ${selectedPreset === 'minimal' ? 'text-primary' : 'text-muted-foreground'}`} />
                    Minimal Starter
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Fast setup for quick UI smoke checks and lightweight flows.
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Portfolios:</span> <span className="font-semibold text-foreground">1</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Projects:</span> <span className="font-semibold text-foreground">2</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Users:</span> <span className="font-semibold text-foreground">8 Members</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Pricing:</span> <span className="font-semibold text-foreground">T&amp;M</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground font-medium">
                ~16 Work Items • 6 Sprints • 6 Test Cycles
              </div>
            </div>

            {/* Standard Demo */}
            <div
              onClick={() => applyPreset('standard')}
              className={`p-4 rounded-md border transition-all cursor-pointer flex flex-col justify-between ${
                selectedPreset === 'standard'
                  ? 'border-2 border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                    <Sparkles className={`w-4 h-4 ${selectedPreset === 'standard' ? 'text-primary' : 'text-muted-foreground'}`} />
                    Standard Demo
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                    Recommended
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Balanced relational baseline for stakeholder presentations &amp; QA.
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Portfolios:</span> <span className="font-semibold text-foreground">2</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Projects:</span> <span className="font-semibold text-foreground">5</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Users:</span> <span className="font-semibold text-foreground">16 Members</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Pricing:</span> <span className="font-semibold text-foreground">Mixed</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground font-medium">
                ~40 Work Items • 15 Sprints • 15 Test Cycles
              </div>
            </div>

            {/* Enterprise Stress Test */}
            <div
              onClick={() => applyPreset('stress')}
              className={`p-4 rounded-md border transition-all cursor-pointer flex flex-col justify-between ${
                selectedPreset === 'stress'
                  ? 'border-2 border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              <div>
                <div className="flex items-center gap-2 font-semibold text-sm text-foreground mb-2">
                  <Cpu className={`w-4 h-4 ${selectedPreset === 'stress' ? 'text-primary' : 'text-muted-foreground'}`} />
                  Enterprise Stress Test
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Heavy volume dataset to test pagination, graphs, and system limits.
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Portfolios:</span> <span className="font-semibold text-foreground">4</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Projects:</span> <span className="font-semibold text-foreground">12</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Users:</span> <span className="font-semibold text-foreground">32 Members</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Pricing:</span> <span className="font-semibold text-foreground">Mixed</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-border text-[11px] text-muted-foreground font-medium">
                ~96 Work Items • 36 Sprints • 36 Test Cycles
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CUSTOM CONTROLS */}
        {activeTab === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* Projects & Scope */}
            <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <FolderKanban className="w-4 h-4 text-primary" />
                Projects &amp; Portfolios
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between text-muted-foreground mb-2">
                    <span>Number of Projects to Create:</span>
                    <Badge variant="outline" className="font-mono text-xs">{config.projectCount}</Badge>
                  </div>
                  <Slider
                    min={1}
                    max={20}
                    step={1}
                    value={[config.projectCount]}
                    onValueChange={([val]) => setConfig({ ...config, projectCount: val })}
                  />
                </div>

                <div>
                  <div className="flex justify-between text-muted-foreground mb-2">
                    <span>Number of Portfolios:</span>
                    <Badge variant="outline" className="font-mono text-xs">{config.portfolioCount}</Badge>
                  </div>
                  <Slider
                    min={1}
                    max={6}
                    step={1}
                    value={[config.portfolioCount]}
                    onValueChange={([val]) => setConfig({ ...config, portfolioCount: val })}
                  />
                </div>

                <div>
                  <Label className="block text-muted-foreground mb-2 text-xs">Pricing Model</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Fixed Bid', 'T&M', 'Mixed'] as const).map(model => (
                      <Button
                        key={model}
                        type="button"
                        variant={config.pricingModel === model ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setConfig({ ...config, pricingModel: model })}
                        className="text-xs h-8"
                      >
                        {model}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Users & Roles */}
            <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                <Users className="w-4 h-4 text-primary" />
                Users &amp; Team Distribution
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between text-muted-foreground mb-2">
                    <span>Total Members to Generate:</span>
                    <Badge variant="outline" className="font-mono text-xs">{config.userCount} Members</Badge>
                  </div>
                  <Slider
                    min={4}
                    max={40}
                    step={2}
                    value={[config.userCount]}
                    onValueChange={([val]) => setConfig({ ...config, userCount: val })}
                  />
                </div>

                <div className="p-3 bg-card rounded-md border border-border text-[11px] text-muted-foreground leading-relaxed">
                  Generates enterprise profiles across Administrator, Senior Management, Project Manager, Lead, Team Member, and PMO. Each user is assigned cost rates ($60k - $120k) and auto-provisioned into the Auth Identity pool.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Payload Summary Banner */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Estimated Payload Summary
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-card border border-border rounded-md p-3 text-center">
              <div className="text-xl font-bold text-foreground">{estPortfolios}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Portfolios</div>
            </div>
            <div className="bg-card border border-border rounded-md p-3 text-center">
              <div className="text-xl font-bold text-foreground">{estProjects}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Projects</div>
            </div>
            <div className="bg-card border border-border rounded-md p-3 text-center">
              <div className="text-xl font-bold text-foreground">~{estWorkItems}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Stories &amp; Tasks</div>
            </div>
            <div className="bg-card border border-border rounded-md p-3 text-center">
              <div className="text-xl font-bold text-foreground">~{estTestCycles}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Test Cycles</div>
            </div>
            <div className="bg-card border border-border rounded-md p-3 text-center">
              <div className="text-xl font-bold text-foreground">{config.userCount}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Users (Auth Sync)</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center gap-3 pt-3 border-t border-border flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="default"
            onClick={handleWipe}
            disabled={isLoading || (!hasActiveStudioData && !loadingLog)}
            className="text-destructive hover:bg-destructive/10 border-destructive/30 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {hasActiveStudioData
              ? `Wipe Studio Test Data (${activeItems.projectIds.length + activeItems.portfolioIds.length + activeItems.userIds.length} tracked)`
              : 'Wipe Studio Test Data'}
          </Button>

          <Button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="flex items-center gap-2 ml-auto"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {isLoading ? 'Generating Datasets...' : 'Generate & Populate'}
          </Button>
        </div>

        <StudioLogViewerModal
          open={showLogViewer}
          onOpenChange={setShowLogViewer}
          batch={selectedRun?.batch}
          runNumber={selectedRun?.runNumber}
          studioLog={studioLog}
          onWipeBatch={handleWipeBatch}
        />
      </div>
    </div>
  );
}
