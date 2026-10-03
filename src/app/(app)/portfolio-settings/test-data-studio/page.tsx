'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { db, collection, getDocs } from '@/lib/db-provider';
import { cn } from '@/lib/utils';
import * as SliderPrimitive from '@radix-ui/react-slider';
import {
  Sparkles,
  Trash2,
  Loader2,
  Layers,
  Zap,
  Cpu,
  FolderKanban,
  Users,
  Briefcase,
  CheckCircle2,
  AlertTriangle,
  Info,
  ShieldCheck,
  Eye,
  Activity,
  PlayCircle,
  ExternalLink,
  RefreshCw,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Sliders,
} from 'lucide-react';
import {
  GeneratorConfig,
  PRESET_CONFIGS,
  PROJECT_NAME_TEMPLATES,
  generateEmployees,
  createStudioPortfolios,
  generateProjects,
  wipeWorkspaceTestData,
  getStudioLog,
  recordStudioLog,
  getActiveStudioItems,
  StudioLog,
  StudioLogBatch,
  StudioLogViewerModal,
  simulateProjectProgression,
} from '@/dev-tools';

interface ProjectSliderProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

function ProjectSlider({ value, onChange, disabled = false }: ProjectSliderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative group/slider w-full py-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <SliderPrimitive.Root
        min={0}
        max={100}
        step={25}
        value={[value]}
        disabled={disabled}
        onValueChange={([val]) => onChange(val)}
        onPointerDown={() => {
          setIsDragging(true);
          const handlePointerUp = () => {
            setIsDragging(false);
            window.removeEventListener('pointerup', handlePointerUp);
          };
          window.addEventListener('pointerup', handlePointerUp);
        }}
        className={cn(
          'relative flex w-full touch-none select-none items-center cursor-pointer',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary/80">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>

        {/* Step ticks at 0%, 25%, 50%, 75%, 100% */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-0.5 pointer-events-none">
          {[0, 25, 50, 75, 100].map((step) => (
            <span
              key={step}
              className={cn(
                'w-1 h-1 rounded-full transition-colors',
                value >= step ? 'bg-primary-foreground/90 dark:bg-background/90' : 'bg-muted-foreground/30'
              )}
            />
          ))}
        </div>

        <SliderPrimitive.Thumb className="relative block h-3.5 w-3.5 rounded-full border-2 border-primary bg-background shadow-xs hover:scale-125 active:scale-110 transition-transform focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-grab active:cursor-grabbing">
          {/* Mouse overlay / tooltip showing % */}
          <div
            className={cn(
              'absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-slate-900 text-white dark:bg-primary dark:text-primary-foreground font-mono text-[10px] font-bold shadow-md pointer-events-none transition-all duration-150 whitespace-nowrap z-30',
              isHovered || isDragging
                ? 'opacity-100 scale-100 translate-y-0'
                : 'opacity-0 scale-95 translate-y-1 group-hover/slider:opacity-100 group-hover/slider:scale-100 group-hover/slider:translate-y-0'
            )}
          >
            {value}%
            <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-0.5 border-4 border-transparent border-t-slate-900 dark:border-t-primary" />
          </div>
        </SliderPrimitive.Thumb>
      </SliderPrimitive.Root>
    </div>
  );
}

export default function TestDataStudioPage() {
  const { toast } = useToast();

  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<'presets' | 'custom' | 'autorun'>('presets');
  const [selectedPreset, setSelectedPreset] = useState<'minimal' | 'standard' | 'stress'>('standard');
  const [expandedPreset, setExpandedPreset] = useState<'minimal' | 'standard' | 'stress' | null>(null);
  const [projectSimProgress, setProjectSimProgress] = useState<Record<'minimal' | 'standard' | 'stress', number[]>>({
    minimal: [75, 75],
    standard: [75, 75, 75, 75, 75],
    stress: [75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75],
  });
  const [presetAutoRun, setPresetAutoRun] = useState<Record<'minimal' | 'standard' | 'stress', boolean>>({
    minimal: true,
    standard: true,
    stress: true,
  });

  // Configuration state
  const [config, setConfig] = useState<GeneratorConfig>(PRESET_CONFIGS.standard);

  // Studio Log state
  const [studioLog, setStudioLog] = useState<StudioLog | null>(null);
  const [loadingLog, setLoadingLog] = useState(true);

  const activeItems = getActiveStudioItems(studioLog);
  const hasActiveStudioData = activeItems.projectIds.length > 0 || activeItems.portfolioIds.length > 0 || activeItems.userIds.length > 0;
  const [showLogViewer, setShowLogViewer] = useState(false);
  const [selectedRun, setSelectedRun] = useState<{ batch: StudioLogBatch; runNumber: number } | null>(null);

  // Autorun Simulation state
  const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; name: string; status?: string }>>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [selectedSimProjectId, setSelectedSimProjectId] = useState<string>('');
  const [selectedSimStage, setSelectedSimStage] = useState<number>(75);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simProgressMsg, setSimProgressMsg] = useState<string | null>(null);
  const [simResult, setSimResult] = useState<{ updatedStories: number; updatedTestCases: number; projectId: string; stage: number } | null>(null);

  // Execution states
  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refreshLog = async () => {
    try {
      const log = await getStudioLog();
      setStudioLog(log);
    } catch (e) {
      console.warn('Error loading studio log:', e);
    } finally {
      setLoadingLog(false);
    }
  };

  const fetchAvailableProjects = async () => {
    if (!db) return;
    setLoadingProjects(true);
    try {
      const snap = await getDocs(collection(db, 'projects'));
      const list: Array<{ id: string; name: string; status?: string }> = [];
      snap.forEach((d: any) => {
        const data = typeof d.data === 'function' ? d.data() : d;
        if (!data.isDeleted) {
          list.push({
            id: d.id,
            name: data.name || 'Untitled Project',
            status: data.status || 'Active',
          });
        }
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      setAvailableProjects(list);
      if (list.length > 0 && !selectedSimProjectId) {
        setSelectedSimProjectId(list[0].id);
      }
    } catch (err) {
      console.warn('Failed to load projects for autorun simulation:', err);
    } finally {
      setLoadingProjects(false);
    }
  };

  useEffect(() => {
    // Authenticate admin access
    const storedUser = localStorage.getItem('projectflow_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.role === 'Administrator' || user.accessLevel === 'Administrator' || user.role === 'Super Admin' || user.accessLevel === 'Super Admin') {
          setIsAdmin(true);
        }
      } catch (e) {}
    }
    refreshLog();
    fetchAvailableProjects();
  }, []);

  const getPresetProgressLabel = (presetKey: 'minimal' | 'standard' | 'stress') => {
    if (!presetAutoRun[presetKey]) return 'Off';
    const projs = projectSimProgress[presetKey] || [];
    if (projs.length === 0) return '75%';
    const allSame = projs.every(p => p === projs[0]);
    if (allSame) return `${projs[0]}%`;
    const avg = Math.round(projs.reduce((a, b) => a + b, 0) / projs.length);
    return `Avg ${avg}%`;
  };

  const applyPreset = (presetKey: 'minimal' | 'standard' | 'stress') => {
    setSelectedPreset(presetKey);
    const projs = projectSimProgress[presetKey] || [];
    const avg = projs.length > 0 ? Math.round(projs.reduce((a, b) => a + b, 0) / projs.length) : 75;
    setConfig({
      ...PRESET_CONFIGS[presetKey],
      simulationProgress: avg,
      projectSimulationProgress: projs,
      autoRunSimulation: presetAutoRun[presetKey],
    });
  };

  const handleProjectSimChange = (presetKey: 'minimal' | 'standard' | 'stress', index: number, val: number) => {
    setProjectSimProgress(prev => {
      const updated = [...(prev[presetKey] || [])];
      updated[index] = val;
      const nextState = { ...prev, [presetKey]: updated };
      if (selectedPreset === presetKey) {
        const avg = Math.round(updated.reduce((a, b) => a + b, 0) / updated.length);
        setConfig(c => ({
          ...c,
          simulationProgress: avg,
          projectSimulationProgress: updated,
        }));
      }
      return nextState;
    });
  };

  const handlePresetAutoRunToggle = (presetKey: 'minimal' | 'standard' | 'stress', enabled: boolean) => {
    setPresetAutoRun(prev => ({ ...prev, [presetKey]: enabled }));
    if (selectedPreset === presetKey) {
      setConfig(prev => ({
        ...prev,
        autoRunSimulation: enabled,
      }));
    }
  };

  const togglePresetExpand = (presetKey: 'minimal' | 'standard' | 'stress') => {
    applyPreset(presetKey);
    setExpandedPreset(prev => (prev === presetKey ? null : presetKey));
  };

  const getPresetProjectList = (presetKey: 'minimal' | 'standard' | 'stress') => {
    const count = PRESET_CONFIGS[presetKey].projectCount;
    const pricingModel = PRESET_CONFIGS[presetKey].pricingModel;
    return Array.from({ length: count }).map((_, i) => {
      const name = PROJECT_NAME_TEMPLATES[i % PROJECT_NAME_TEMPLATES.length];
      const pricing = pricingModel === 'Mixed' ? (i % 2 === 0 ? 'Fixed Bid' : 'T&M') : pricingModel;
      return { name, pricing };
    });
  };

  const getProjectSimBadge = (pct: number, enabled: boolean) => {
    if (!enabled || pct === 0) return 'To Do';
    if (pct <= 25) return 'Sprint 1 Active';
    if (pct <= 50) return 'Sprint 1 Done';
    if (pct <= 75) return 'Sprint 2 Mid-Flight';
    return 'Release Done';
  };

  const handleRunSimulation = async () => {
    if (!selectedSimProjectId) {
      toast({
        variant: 'destructive',
        title: 'No Project Selected',
        description: 'Please select a project to simulate.',
      });
      return;
    }

    setIsSimulating(true);
    setSimResult(null);
    setSimProgressMsg(`Starting Agile simulation at ${selectedSimStage}% progression...`);

    try {
      const result = await simulateProjectProgression(
        selectedSimProjectId,
        selectedSimStage,
        msg => setSimProgressMsg(msg)
      );

      setSimResult({
        ...result,
        projectId: selectedSimProjectId,
        stage: selectedSimStage,
      });

      toast({
        title: 'Agile Simulation Complete',
        description: `Successfully simulated ${result.updatedStories} work items and ${result.updatedTestCases} test executions. Dashboards are ready!`,
      });
    } catch (err: any) {
      console.error('Simulation execution error:', err);
      toast({
        variant: 'destructive',
        title: 'Simulation Failed',
        description: err?.message || 'Could not complete simulation.',
      });
    } finally {
      setIsSimulating(false);
      setSimProgressMsg(null);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    setProgressMsg('Starting test data generation pipeline...');

    try {
      // 1. Generate Dedicated Users (Only new users are used)
      setProgressMsg('Generating users & provisioning auth identities...');
      const createdUsers = await generateEmployees(
        config.userCount,
        config.roleDistribution,
        msg => setProgressMsg(msg)
      );

      // 2. Create Brand New Dedicated Portfolios (strictly isolated)
      setProgressMsg('Preparing isolated demo portfolios...');
      const resolvedPortfolios = await createStudioPortfolios(
        config.portfolioCount,
        msg => setProgressMsg(msg)
      );
      const portfolioIdsToUse = resolvedPortfolios.map(p => p.id);

      // 3. Generate Projects with all subcollections (strictly using new users)
      setProgressMsg('Building projects with relational subcollections and agile telemetry...');
      const createdProjects = await generateProjects({
        count: config.projectCount,
        portfolioIds: portfolioIdsToUse,
        pricingModel: config.pricingModel,
        globalUsers: createdUsers,
        autoRunSimulation: config.autoRunSimulation ?? true,
        simulationProgress: config.simulationProgress ?? 75,
        projectSimulationProgress: config.projectSimulationProgress ?? projectSimProgress[selectedPreset],
        onProgress: msg => setProgressMsg(msg),
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
        text: `Successfully generated ${createdProjects.length} project(s) across ${resolvedPortfolios.length} isolated portfolio(s) using ${createdUsers.length} newly provisioned test user(s). Studio creation log updated. Refreshing workspace...`,
      });

      toast({
        title: 'Test Data Studio Generation Complete',
        description: `Populated ${createdProjects.length} project(s) across ${portfolioIdsToUse.length} new portfolio(s). Studio manifest recorded.`,
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error('Test data generation error:', err);
      setStatusMessage({
        type: 'error',
        text: `Generation failed: ${err?.message || 'Check browser console for error details.'}`,
      });
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: err?.message || 'Could not complete test data generation.',
      });
    } finally {
      setIsLoading(false);
      setProgressMsg(null);
    }
  };

  const handleWipe = async () => {
    const activeItems = getActiveStudioItems(studioLog);
    const hasLog = activeItems.projectIds.length > 0 || activeItems.portfolioIds.length > 0 || activeItems.userIds.length > 0;

    const confirmMessage = hasLog
      ? `Wipe studio test data? This will safely remove:
• ${activeItems.projectIds.length} project(s) created by the studio
• ${activeItems.portfolioIds.length} portfolio(s) created by the studio
• ${activeItems.userIds.length} user(s) created by the studio (including any studio-created admin users)

All original users, pre-existing projects, and genuine portfolios will remain completely untouched. The studio creation log will be removed after deletion.`
      : 'Wipe studio test data? This will purge only mock data created by the studio. Real user accounts and genuine projects/portfolios will be safely preserved.';

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
        onProgress: msg => setProgressMsg(msg),
      });

      setStudioLog(null);

      setStatusMessage({
        type: 'success',
        text: `Cleaned up ${deletedProjects} studio project(s), ${deletedPortfolios} studio test portfolio(s), and ${deletedUsers} studio user(s) (including studio admins). Studio log cleared. Reloading workspace...`,
      });

      toast({
        title: 'Workspace Reset Complete',
        description: `Wiped ${deletedProjects} projects, ${deletedPortfolios} portfolios, and ${deletedUsers} studio users. Original users and projects preserved.`,
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error('Wipe test data error:', err);
      setStatusMessage({
        type: 'error',
        text: `Wipe failed: ${err?.message || 'Check browser console.'}`,
      });
      toast({
        variant: 'destructive',
        title: 'Wipe Failed',
        description: err?.message || 'Could not wipe test data.',
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
        onProgress: msg => setProgressMsg(msg),
      });

      await refreshLog();

      setStatusMessage({
        type: 'success',
        text: `Cleaned up run ${batchId}: removed ${deletedProjects} project(s), ${deletedPortfolios} portfolio(s), and ${deletedUsers} user(s). Remaining studio logs updated.`,
      });

      toast({
        title: 'Studio Run Wiped',
        description: `Wiped ${deletedProjects} projects, ${deletedPortfolios} portfolios, and ${deletedUsers} users from this run.`,
      });

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error('Wipe batch error:', err);
      setStatusMessage({
        type: 'error',
        text: `Failed to wipe run: ${err?.message || 'Check console.'}`,
      });
      toast({
        variant: 'destructive',
        title: 'Run Wipe Failed',
        description: err?.message || 'Could not wipe this run.',
      });
    } finally {
      setIsLoading(false);
      setProgressMsg(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <Alert variant="destructive" className="max-w-2xl bg-red-50 text-red-900 border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-900">
          <Info className="h-4 w-4 text-red-600 dark:text-red-400" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You must be an Administrator to access Test Data Studio.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Test Data Studio"
        description="Configure, rapidly generate, or wipe relationally-linked mock datasets across portfolios, projects, and users."
      />

      {/* Status Notification Banner */}
      {statusMessage && (
        <Alert
          className={
            statusMessage.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-foreground dark:text-emerald-300'
              : 'border-destructive/40 bg-destructive/10 text-destructive'
          }
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
        <Alert className="border-primary/40 bg-primary/5 text-foreground flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
          <AlertDescription className="text-xs font-medium">{progressMsg}</AlertDescription>
        </Alert>
      )}

      {/* Embedded Studio Panel */}
      <Card>
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-primary" />
                Generator Controls &amp; Datasets
              </CardTitle>
              <CardDescription className="text-xs">
                Select a preset or fine-tune generation volume for mock data creation.
              </CardDescription>
            </div>
            {/* Mode Tabs */}
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
                <TabsTrigger value="autorun" className="gap-1.5 text-xs">
                  <PlayCircle className="w-3.5 h-3.5 text-primary" />
                  Auto-Run Simulation
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Dedicated Studio Portfolio Isolation Callout */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
              <Briefcase className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-foreground">Dedicated Studio Portfolios (Strict Isolation)</span>
                <Badge variant="outline" className="text-[10px] text-primary border-primary/30 bg-primary/10">
                  Isolated Environment
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All generated test data is strictly restricted to brand-new portfolios and projects created by the studio. Furthermore, all project team members, assignees, and worklog hours are strictly limited to newly created studio test users. Existing portfolios, real employees, and genuine worklogs remain completely untouched.
              </p>
            </div>
          </div>

          {/* Active Studio Test Data Manifest Log */}
          {hasActiveStudioData ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-semibold text-foreground">Active Studio Generation Log</span>
                  <Badge variant="outline" className="text-[10px] text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/10">
                    Tracked ({activeItems.projectIds.length + activeItems.portfolioIds.length + activeItems.userIds.length} items)
                  </Badge>
                </div>
                {studioLog?.lastUpdated && (
                  <span className="text-[11px] text-muted-foreground">
                    Last logged: {new Date(studioLog.lastUpdated).toLocaleTimeString()}
                  </span>
                )}
              </div>

              {/* Distinct Generation Runs Breakdown */}
              <div className="space-y-2 pt-2 border-t border-amber-500/20">
                <div className="text-[11px] font-semibold text-foreground uppercase tracking-wider flex items-center justify-between">
                  <span>Logged Studio Runs ({studioLog?.batches?.length || 0})</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Delete test data selectively per run or wipe all below
                  </span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {(studioLog?.batches || []).map((b, idx) => {
                    const batchAdmins = b.users?.filter(u => u.accessLevel === 'Administrator').length || 0;
                    return (
                      <div
                        key={b.batchId}
                        className="bg-card/90 border border-border rounded-md p-3 flex items-center justify-between gap-3 flex-wrap text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">
                              Run #{idx + 1} {b.preset ? `(${b.preset.toUpperCase()})` : ''}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(b.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
                            <span>{b.projects?.length || 0} Projects</span>
                            <span>•</span>
                            <span>{b.portfolios?.length || 0} Portfolios</span>
                            <span>•</span>
                            <span>{b.users?.length || 0} Users {batchAdmins > 0 ? `(${batchAdmins} Admin)` : ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRun({ batch: b, runNumber: idx + 1 });
                              setShowLogViewer(true);
                            }}
                            className="h-7 text-xs gap-1.5 border-border hover:bg-muted text-foreground font-medium"
                          >
                            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                            View Log
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isLoading}
                            onClick={() => handleWipeBatch(b.batchId)}
                            className="text-destructive hover:bg-destructive/10 border-destructive/30 text-xs h-7 gap-1.5"
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
            <div className="rounded-lg border border-border bg-muted/20 p-3.5 flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>No active studio test data logged. Workspace is clean.</span>
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                Clean State
              </Badge>
            </div>
          )}

          {/* TAB 1: PRESETS */}
          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
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
                      <span>Portfolios:</span> <span className="font-semibold text-foreground">1 New</span>
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

                <div className="mt-4 pt-3 border-t border-border space-y-2">
                  <div className="text-[11px] text-muted-foreground font-medium">
                    ~16 Work Items • 6 Sprints • 6 Test Cycles
                  </div>

                  {/* Expand / Collapse Button for Auto-Run Simulation */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePresetExpand('minimal');
                    }}
                    className={`w-full h-8 text-xs justify-between font-medium transition-colors ${
                      expandedPreset === 'minimal'
                        ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15'
                        : 'border-border/80 hover:bg-muted/70 text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                      <span>Auto-Run Simulation</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 font-mono font-semibold"
                      >
                        {getPresetProgressLabel('minimal')}
                      </Badge>
                    </span>
                    {expandedPreset === 'minimal' ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </Button>

                  {/* Expanded Section: Projects & Simulation Slider */}
                  {expandedPreset === 'minimal' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 pt-3 border-t border-border/80 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sim-toggle-minimal" className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-primary" />
                          Simulation Active
                        </Label>
                        <Switch
                          id="sim-toggle-minimal"
                          checked={presetAutoRun['minimal']}
                          onCheckedChange={(checked) => handlePresetAutoRunToggle('minimal', checked)}
                        />
                      </div>

                      {!presetAutoRun['minimal'] && (
                        <div className="p-2 rounded bg-muted/40 border border-border/50 text-[11px] text-muted-foreground">
                          Simulation disabled. Projects will be generated in fresh planning state with all work items in "To Do".
                        </div>
                      )}

                      <div className="space-y-1.5 pt-1 border-t border-border/60">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                          <span className="flex items-center gap-1">
                            <FolderKanban className="w-3.5 h-3.5 text-primary" />
                            Projects Included ({getPresetProjectList('minimal').length})
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono font-normal">
                            {presetAutoRun['minimal'] ? `${getPresetProgressLabel('minimal')} sim` : 'fresh'}
                          </span>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 pt-1">
                          {getPresetProjectList('minimal').map((proj, idx) => {
                            const projVal = projectSimProgress['minimal'][idx] ?? 75;
                            const isSimActive = presetAutoRun['minimal'];
                            return (
                              <div
                                key={idx}
                                className="p-2.5 rounded bg-card/90 border border-border/70 text-[11px] space-y-1.5 hover:border-primary/40 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <span className="font-medium text-foreground leading-snug">
                                    {idx + 1}. {proj.name}
                                  </span>
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 font-mono">
                                    {proj.pricing}
                                  </Badge>
                                </div>
                                <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                                  <span>3 Sprints • ~8 Stories</span>
                                  <span className="text-primary font-medium font-mono text-[9px]">
                                    {getProjectSimBadge(projVal, isSimActive)}
                                  </span>
                                </div>
                                <div className="pt-2 pb-0.5">
                                  <ProjectSlider
                                    value={isSimActive ? projVal : 0}
                                    disabled={!isSimActive}
                                    onChange={(val) => handleProjectSimChange('minimal', idx, val)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
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
                      <span>Portfolios:</span> <span className="font-semibold text-foreground">2 New</span>
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

                <div className="mt-4 pt-3 border-t border-border space-y-2">
                  <div className="text-[11px] text-muted-foreground font-medium">
                    ~40 Work Items • 15 Sprints • 15 Test Cycles
                  </div>

                  {/* Expand / Collapse Button for Auto-Run Simulation */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePresetExpand('standard');
                    }}
                    className={`w-full h-8 text-xs justify-between font-medium transition-colors ${
                      expandedPreset === 'standard'
                        ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15'
                        : 'border-border/80 hover:bg-muted/70 text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                      <span>Auto-Run Simulation</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 font-mono font-semibold"
                      >
                        {getPresetProgressLabel('standard')}
                      </Badge>
                    </span>
                    {expandedPreset === 'standard' ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </Button>

                  {/* Expanded Section: Projects & Simulation Slider */}
                  {expandedPreset === 'standard' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 pt-3 border-t border-border/80 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sim-toggle-standard" className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-primary" />
                          Simulation Active
                        </Label>
                        <Switch
                          id="sim-toggle-standard"
                          checked={presetAutoRun['standard']}
                          onCheckedChange={(checked) => handlePresetAutoRunToggle('standard', checked)}
                        />
                      </div>

                      {!presetAutoRun['standard'] && (
                        <div className="p-2 rounded bg-muted/40 border border-border/50 text-[11px] text-muted-foreground">
                          Simulation disabled. Projects will be generated in fresh planning state with all work items in "To Do".
                        </div>
                      )}

                      <div className="space-y-1.5 pt-1 border-t border-border/60">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                          <span className="flex items-center gap-1">
                            <FolderKanban className="w-3.5 h-3.5 text-primary" />
                            Projects Included ({getPresetProjectList('standard').length})
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono font-normal">
                            {presetAutoRun['standard'] ? `${getPresetProgressLabel('standard')} sim` : 'fresh'}
                          </span>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 pt-1">
                          {getPresetProjectList('standard').map((proj, idx) => {
                            const projVal = projectSimProgress['standard'][idx] ?? 75;
                            const isSimActive = presetAutoRun['standard'];
                            return (
                              <div
                                key={idx}
                                className="p-2.5 rounded bg-card/90 border border-border/70 text-[11px] space-y-1.5 hover:border-primary/40 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <span className="font-medium text-foreground leading-snug">
                                    {idx + 1}. {proj.name}
                                  </span>
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 font-mono">
                                    {proj.pricing}
                                  </Badge>
                                </div>
                                <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                                  <span>3 Sprints • ~8 Stories</span>
                                  <span className="text-primary font-medium font-mono text-[9px]">
                                    {getProjectSimBadge(projVal, isSimActive)}
                                  </span>
                                </div>
                                <div className="pt-2 pb-0.5">
                                  <ProjectSlider
                                    value={isSimActive ? projVal : 0}
                                    disabled={!isSimActive}
                                    onChange={(val) => handleProjectSimChange('standard', idx, val)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
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
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                      <Cpu className={`w-4 h-4 ${selectedPreset === 'stress' ? 'text-primary' : 'text-muted-foreground'}`} />
                      Enterprise Stress Test
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Heavy volume dataset to test pagination, graphs, and system limits.
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Portfolios:</span> <span className="font-semibold text-foreground">4 New</span>
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

                <div className="mt-4 pt-3 border-t border-border space-y-2">
                  <div className="text-[11px] text-muted-foreground font-medium">
                    ~96 Work Items • 36 Sprints • 36 Test Cycles
                  </div>

                  {/* Expand / Collapse Button for Auto-Run Simulation */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePresetExpand('stress');
                    }}
                    className={`w-full h-8 text-xs justify-between font-medium transition-colors ${
                      expandedPreset === 'stress'
                        ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15'
                        : 'border-border/80 hover:bg-muted/70 text-foreground'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-primary" />
                      <span>Auto-Run Simulation</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 font-mono font-semibold"
                      >
                        {getPresetProgressLabel('stress')}
                      </Badge>
                    </span>
                    {expandedPreset === 'stress' ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </Button>

                  {/* Expanded Section: Projects & Simulation Slider */}
                  {expandedPreset === 'stress' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-3 pt-3 border-t border-border/80 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200"
                    >
                      <div className="flex items-center justify-between">
                        <Label htmlFor="sim-toggle-stress" className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-primary" />
                          Simulation Active
                        </Label>
                        <Switch
                          id="sim-toggle-stress"
                          checked={presetAutoRun['stress']}
                          onCheckedChange={(checked) => handlePresetAutoRunToggle('stress', checked)}
                        />
                      </div>

                      {!presetAutoRun['stress'] && (
                        <div className="p-2 rounded bg-muted/40 border border-border/50 text-[11px] text-muted-foreground">
                          Simulation disabled. Projects will be generated in fresh planning state with all work items in "To Do".
                        </div>
                      )}

                      <div className="space-y-1.5 pt-1 border-t border-border/60">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-foreground">
                          <span className="flex items-center gap-1">
                            <FolderKanban className="w-3.5 h-3.5 text-primary" />
                            Projects Included ({getPresetProjectList('stress').length})
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono font-normal">
                            {presetAutoRun['stress'] ? `${getPresetProgressLabel('stress')} sim` : 'fresh'}
                          </span>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 pt-1">
                          {getPresetProjectList('stress').map((proj, idx) => {
                            const projVal = projectSimProgress['stress'][idx] ?? 75;
                            const isSimActive = presetAutoRun['stress'];
                            return (
                              <div
                                key={idx}
                                className="p-2.5 rounded bg-card/90 border border-border/70 text-[11px] space-y-1.5 hover:border-primary/40 transition-colors"
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <span className="font-medium text-foreground leading-snug">
                                    {idx + 1}. {proj.name}
                                  </span>
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 font-mono">
                                    {proj.pricing}
                                  </Badge>
                                </div>
                                <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                                  <span>3 Sprints • ~8 Stories</span>
                                  <span className="text-primary font-medium font-mono text-[9px]">
                                    {getProjectSimBadge(projVal, isSimActive)}
                                  </span>
                                </div>
                                <div className="pt-2 pb-0.5">
                                  <ProjectSlider
                                    value={isSimActive ? projVal : 0}
                                    disabled={!isSimActive}
                                    onChange={(val) => handleProjectSimChange('stress', idx, val)}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOM CONTROLS */}
          {activeTab === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                      <span>Number of New Portfolios:</span>
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
                      <span>Total New Members to Generate:</span>
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

                  <div className="p-3 bg-card rounded-md border border-border text-[11px] text-muted-foreground leading-relaxed flex items-start gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      Generates enterprise profiles across Administrator, Senior Management, Project Manager, Lead, and Team Member. Only these newly provisioned members are assigned to project teams, keeping real staff and actual worklogs unaffected.
                    </div>
                  </div>
                </div>
              </div>

              {/* Agile Simulation & Telemetry */}
              <div className="bg-muted/30 border border-border rounded-lg p-4 space-y-4 md:col-span-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                    <Activity className="w-4 h-4 text-primary" />
                    Agile Simulation &amp; Dashboard Telemetry
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="sim-toggle" className="text-xs text-muted-foreground cursor-pointer">
                      Auto-Run Simulation
                    </Label>
                    <Switch
                      id="sim-toggle"
                      checked={config.autoRunSimulation !== false}
                      onCheckedChange={checked => setConfig({ ...config, autoRunSimulation: checked })}
                    />
                  </div>
                </div>

                {config.autoRunSimulation !== false ? (
                  <div className="space-y-3 pt-1">
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>Target Simulation Progress:</span>
                      <Badge variant="secondary" className="font-semibold text-xs">
                        {config.simulationProgress ?? 75}% {config.simulationProgress === 75 ? '(Recommended)' : ''}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { pct: 25, label: '25% - Kickoff', desc: 'Sprint 1 active, burndown started' },
                        { pct: 50, label: '50% - Mid-Point', desc: 'Sprint 1 done (0h), Sprint 2 start' },
                        { pct: 75, label: '75% - Active Mid-Flight', desc: 'Sprint 1 done, Sprint 2 active, UAT active' },
                        { pct: 100, label: '100% - Finished', desc: 'All sprints complete, all tests passed' },
                      ].map(stage => (
                        <Button
                          key={stage.pct}
                          type="button"
                          variant={(config.simulationProgress ?? 75) === stage.pct ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setConfig({ ...config, simulationProgress: stage.pct })}
                          className="flex flex-col items-start h-auto py-2 text-left"
                        >
                          <span className="text-xs font-semibold">{stage.label}</span>
                          <span className="text-[10px] opacity-80 mt-0.5 leading-tight">{stage.desc}</span>
                        </Button>
                      ))}
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                      Staggers leaf story and subtask completion across working days, logs authentic weekday hours, and seeds SIT/UAT/Prod testing executions so Sprint Burndowns, Release Burnups, and PM Dashboards display realistic curves out of the box.
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Simulation disabled. Projects will be generated in fresh planning state with all work items in "To Do".
                  </p>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: AUTORUN SIMULATION */}
          {activeTab === 'autorun' && (
            <div className="space-y-6">
              <div className="bg-muted/30 border border-border rounded-lg p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-base">
                      <PlayCircle className="w-5 h-5 text-primary" />
                      Agile Simulation Engine (On-Demand)
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Simulate realistic sprint execution, leaf task completion across working days, authentic weekday worklog hours, and QA test executions on any project in your workspace. This populates all project dashboards (Sprint Burndown, Release Burnup, Kanban, PM Dashboard, Quality Dashboard) with clean, dynamic curves.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fetchAvailableProjects}
                    disabled={loadingProjects}
                    className="h-8 gap-1.5 text-xs shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingProjects ? 'animate-spin' : ''}`} />
                    Refresh Projects
                  </Button>
                </div>

                {/* Project Selector */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-xs font-semibold text-foreground">Select Target Project</Label>
                  {availableProjects.length > 0 ? (
                    <Select value={selectedSimProjectId} onValueChange={setSelectedSimProjectId}>
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Choose a project to simulate..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProjects.map(p => (
                          <SelectItem key={p.id} value={p.id} className="text-xs">
                            <span className="font-medium text-foreground">{p.name}</span>
                            <span className="ml-2 text-muted-foreground">({p.status})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-4 rounded-md border border-dashed border-border text-center text-xs text-muted-foreground space-y-2">
                      <p>No active projects found in workspace.</p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setActiveTab('presets')}
                        className="text-xs h-7"
                      >
                        Generate Projects using Presets
                      </Button>
                    </div>
                  )}
                </div>

                {/* Simulation Stage Cards */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <Label className="text-xs font-semibold text-foreground">Target Simulation Progression</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      {
                        pct: 25,
                        label: '25% - Kickoff',
                        desc: 'Sprint 1 is active. Leaf tasks initiated. Early burndown descending.',
                      },
                      {
                        pct: 50,
                        label: '50% - Sprint 1 Complete',
                        desc: 'Sprint 1 leaf items 100% Done (burndown hits 0h). Sprint 2 begins. SIT testing initialized.',
                      },
                      {
                        pct: 75,
                        label: '75% - Active Mid-Flight',
                        badge: 'Recommended',
                        desc: 'Sprint 1 done (0h). Sprint 2 actively mid-flight with tasks Done/In QA/In Progress. Release Burnup climbing. SIT passed, UAT active.',
                      },
                      {
                        pct: 100,
                        label: '100% - Release Complete',
                        desc: 'All sprints and releases 100% completed. Leaf items Done. Burndown hits 0h. All test cycles passed.',
                      },
                    ].map(stage => (
                      <div
                        key={stage.pct}
                        onClick={() => setSelectedSimStage(stage.pct)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col justify-between ${
                          selectedSimStage === stage.pct
                            ? 'border-2 border-primary bg-primary/5 shadow-sm'
                            : 'border-border bg-card hover:border-primary/40'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                            {stage.badge && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                {stage.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{stage.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulation In-Progress */}
                {isSimulating && simProgressMsg && (
                  <Alert className="border-primary/40 bg-primary/5 text-foreground flex items-center gap-3">
                    <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                    <AlertDescription className="text-xs font-medium">{simProgressMsg}</AlertDescription>
                  </Alert>
                )}

                {/* Simulation Result Banner with Deep Links */}
                {simResult && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-foreground font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Agile Simulation Successfully Applied ({simResult.stage}%)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Updated <strong className="text-foreground">{simResult.updatedStories}</strong> stories &amp; tasks and <strong className="text-foreground">{simResult.updatedTestCases}</strong> test executions. Sprint burndown and release burnup curves have been recalculated and calibrated up to today.
                    </p>
                    <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1.5 bg-background">
                        <Link href={`/projects/${simResult.projectId}/development/dashboard`}>
                          <BarChart2 className="w-3.5 h-3.5 text-primary" />
                          Sprint Burndown &amp; Burnup Dashboard
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1.5 bg-background">
                        <Link href={`/projects/${simResult.projectId}/development/kanban`}>
                          <FolderKanban className="w-3.5 h-3.5 text-primary" />
                          Kanban Board
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1.5 bg-background">
                        <Link href={`/projects/${simResult.projectId}/project-details/pm-dashboard`}>
                          <Briefcase className="w-3.5 h-3.5 text-primary" />
                          PM Dashboard
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs gap-1.5 bg-background">
                        <Link href={`/projects/${simResult.projectId}/testing/dashboard`}>
                          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                          Quality &amp; Testing Dashboard
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Autorun Action Button */}
                <div className="pt-2 flex justify-end">
                  <Button
                    type="button"
                    onClick={handleRunSimulation}
                    disabled={isSimulating || !selectedSimProjectId || availableProjects.length === 0}
                    className="gap-2"
                  >
                    {isSimulating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <PlayCircle className="w-4 h-4" />
                    )}
                    {isSimulating ? 'Simulating Progress...' : `Run Simulation (${selectedSimStage}%)`}
                  </Button>
                </div>
              </div>
            </div>
          )}


          {/* Actions */}
          <div className="flex justify-between items-center gap-3 pt-2 border-t flex-wrap">
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

            {activeTab !== 'autorun' && (
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
            )}
          </div>
        </CardContent>
      </Card>

      <StudioLogViewerModal
        open={showLogViewer}
        onOpenChange={setShowLogViewer}
        batch={selectedRun?.batch}
        runNumber={selectedRun?.runNumber}
        studioLog={studioLog}
        onWipeBatch={handleWipeBatch}
      />
    </div>
  );
}
