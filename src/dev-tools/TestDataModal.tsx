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
  wipeWorkspaceTestData
} from './testDataEngine';
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

  // Configuration state
  const [config, setConfig] = useState<GeneratorConfig>(PRESET_CONFIGS.standard);
  const [targetPortfolioId, setTargetPortfolioId] = useState<string>('auto');

  // Execution states
  const [isLoading, setIsLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load existing portfolios for dropdown selection
  useEffect(() => {
    if (!isOpen || !db) return;
    const fetchPortfolios = async () => {
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
    fetchPortfolios();
  }, [isOpen]);

  if (!isOpen) return null;

  const applyPreset = (presetKey: 'minimal' | 'standard' | 'stress') => {
    setSelectedPreset(presetKey);
    setConfig(PRESET_CONFIGS[presetKey]);
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    setProgressMsg('Starting test data generation pipeline...');

    try {
      // 1. Generate / Ensure Users
      setProgressMsg('Generating users & provisioning auth identities...');
      const createdUsers = await generateEmployees(
        config.userCount,
        config.roleDistribution,
        msg => setProgressMsg(msg)
      );

      // Fetch all available global users so they can be assigned to project teams
      const allUsersSnap = await getDocs(collection(db!, 'employees'));
      const allUsers = allUsersSnap.docs.map((d: any) => ({ ...d.data(), id: d.id }));

      // 2. Ensure / Select Portfolios
      let portfolioIdsToUse: string[] = [];
      if (targetPortfolioId && targetPortfolioId !== 'auto') {
        portfolioIdsToUse = [targetPortfolioId];
      } else {
        setProgressMsg('Preparing demo portfolios...');
        const resolvedPortfolios = await ensurePortfolios(
          config.portfolioCount,
          msg => setProgressMsg(msg)
        );
        portfolioIdsToUse = resolvedPortfolios.map(p => p.id);
      }

      // 3. Generate Projects with all subcollections
      setProgressMsg('Building projects with relational subcollections...');
      const createdProjects = await generateProjects({
        count: config.projectCount,
        portfolioIds: portfolioIdsToUse,
        pricingModel: config.pricingModel,
        globalUsers: allUsers.length > 0 ? allUsers : createdUsers,
        onProgress: msg => setProgressMsg(msg)
      });

      setStatusMessage({
        type: 'success',
        text: `Successfully generated ${createdProjects.length} projects and ${createdUsers.length} users. Refreshing workspace...`
      });

      toast({
        title: 'Test Data Studio Generation Complete',
        description: `Populated ${createdProjects.length} project(s) across ${portfolioIdsToUse.length} portfolio(s).`
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
    const confirmed = window.confirm(
      'Wipe test data? This will remove dummy autogenerated projects and mock users. Administrator user accounts will be safely kept.'
    );
    if (!confirmed) return;

    setIsLoading(true);
    setStatusMessage(null);
    setProgressMsg('Wiping dummy test data (Admins preserved)...');

    try {
      const { deletedProjects, deletedUsers } = await wipeWorkspaceTestData({
        wipeProjects: true,
        wipeUsers: true,
        onProgress: msg => setProgressMsg(msg)
      });

      setStatusMessage({
        type: 'success',
        text: `Cleaned up ${deletedProjects} project(s) and ${deletedUsers} mock user(s). Reloading workspace...`
      });

      toast({
        title: 'Workspace Reset Complete',
        description: `Wiped ${deletedProjects} projects and ${deletedUsers} test users. Admins preserved.`
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
            disabled={isLoading}
            className="text-destructive hover:bg-destructive/10 border-destructive/30 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Wipe Test Data (Keep Admins)
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
      </div>
    </div>
  );
}
