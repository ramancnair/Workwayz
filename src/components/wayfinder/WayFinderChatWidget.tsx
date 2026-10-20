'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import {
  Bot,
  Sparkles,
  X,
  Minus,
  Send,
  RotateCcw,
  Maximize2,
  Minimize2,
  ChevronDown,
  FolderKanban,
  CheckCircle2,
  Loader2,
  Lightbulb,
  Cpu,
  Square,
  Shield,
  Zap,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { WayFinderActionItem, FlowPilotActionItem } from '@/ai/flows/wayfinder-agent';
import { collection, getDocs, doc, getDoc, db } from '@/lib/db-provider';

import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  executedActions?: WayFinderActionItem[];
  tokenUsage?: {
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    costUsd?: number;
    modelCalls?: number;
    toolCalls?: number;
    toolsUsed?: string[];
  };
  timestamp: Date;
}

interface RateStats {
  currentRpm: number;
  limitRpm: number;
  percentRpm: number;
  currentTpm: number;
  limitTpm: number;
  percentTpm: number;
  lastPromptTokens: number;
  lastCompletionTokens: number;
  lastTotalTokens: number;
  lastCostUsd: number;
  lastModelCalls?: number;
  lastToolCalls?: number;
  lastToolsUsed?: string[];
  status: 'safe' | 'warning' | 'critical';
}

const ROLE_PERMISSIONS: Record<string, { desc: string; crud: string }> = {
  'Super Admin': {
    desc: 'Primary Root System Administrator',
    crud: 'Absolute CRUD across all modules, settings, and users; permanent account',
  },
  Administrator: {
    desc: 'Full Unrestricted Organization Access',
    crud: 'Full CRUD across all modules, settings, projects, and users',
  },
  'Senior Management': {
    desc: 'Executive Governance Scope',
    crud: 'Create/Read/Update across all modules; deletion is restricted',
  },
  'Project Manager': {
    desc: 'Project Delivery & Execution Lead',
    crud: 'Full CRUD on active Project, Stories, Sprints, Test Cases, and Trash',
  },
  Lead: {
    desc: 'Technical & Team Lead Scope',
    crud: 'Full CRUD on Stories, Subtasks, Test Cases, and RAID items',
  },
  'Team Member': {
    desc: 'Individual Contributor Scope',
    crud: 'View backlog, update assigned tasks/bugs on Kanban, log work',
  },
  PMO: {
    desc: 'PMO & Financial Governance Scope',
    crud: 'Full CRUD on Portfolios, Projects, Billing, Milestones, and BCP',
  },
};

export function getUserAccessLevel(user: any): string {
  if (!user) return 'Team Member';
  const raw = String(user.accessLevel || user.role || user.roleName || '').trim();
  const lower = raw.toLowerCase();

  if (lower === 'super admin' || lower === 'superadmin' || lower === 'super_admin') {
    return 'Super Admin';
  }
  if (lower === 'administrator' || lower === 'admin' || lower === 'superuser') {
    return 'Administrator';
  }
  if (lower === 'senior management' || lower === 'seniormanagement' || lower === 'senior_management' || lower === 'executive') {
    return 'Senior Management';
  }
  if (lower === 'project manager' || lower === 'projectmanager' || lower === 'pm') {
    return 'Project Manager';
  }
  if (lower === 'lead' || lower === 'tech lead' || lower === 'team lead') {
    return 'Lead';
  }
  if (lower === 'pmo') {
    return 'PMO';
  }
  if (lower === 'team member' || lower === 'teammember' || lower === 'developer' || lower === 'dev' || lower === 'qa') {
    return 'Team Member';
  }

  if (user.email && typeof user.email === 'string' && (user.email.toLowerCase().includes('admin') || user.isAdmin === true)) {
    return 'Administrator';
  }

  return raw || 'Team Member';
}

interface ProjectOption {
  id: string;
  name: string;
}

interface AiDetailsInfo {
  provider: string;
  model: string;
  displayName?: string;
  endpoint?: string;
}

const QUICK_PROMPTS = [
  'Create a critical bug for login failure',
  'Create a user story for payment checkout',
  'Create Sprint 3 starting next Monday',
  'Log a high priority risk for server downtime',
  'Summarize current project status',
];

const generateMessageId = (prefix = 'msg') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export function WayFinderChatWidget() {
  const pathname = usePathname();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('projectflow_user');
        return stored ? JSON.parse(stored) : null;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [aiDetails, setAiDetails] = useState<AiDetailsInfo | null>(null);
  const [availableModels, setAvailableModels] = useState<{
    lmStudioModels: string[];
    geminiModels: string[];
    isLmStudioRunning: boolean;
  }>({
    lmStudioModels: [],
    geminiModels: ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.5-flash', 'gemini-2.5-pro'],
    isLmStudioRunning: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [rateStats, setRateStats] = useState<RateStats>({
    currentRpm: 0,
    limitRpm: 15,
    percentRpm: 0,
    currentTpm: 0,
    limitTpm: 1000000,
    percentTpm: 0,
    lastPromptTokens: 0,
    lastCompletionTokens: 0,
    lastTotalTokens: 0,
    lastCostUsd: 0,
    status: 'safe',
  });
  const [isRatePopoverOpen, setIsRatePopoverOpen] = useState(false);
  const [isAccessPopoverOpen, setIsAccessPopoverOpen] = useState(false);

  const effectiveAccessLevel = getUserAccessLevel(currentUser);

  const refreshRateStats = () => {
    fetch('/api/agent/rate-utilization')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data.currentRpm === 'number') {
          setRateStats(data);
        }
      })
      .catch((err) => console.warn('Could not fetch rate stats', err));
  };

  // Fetch active AI details & live model list from backend
  const refreshAiDetails = () => {
    fetch('/api/wayfinder/models')
      .then((r) => r.json())
      .then((d) => {
        if (d?.active) setAiDetails(d.active);
        if (d?.lmStudioModels) {
          setAvailableModels({
            lmStudioModels: d.lmStudioModels,
            geminiModels: d.geminiModels || ['gemini-3.8-flash', 'gemini-flash-latest'],
            isLmStudioRunning: d.isLmStudioRunning,
          });
        }
      })
      .catch((e: any) => console.warn('Could not fetch AI models for header', e));
  };

  useEffect(() => {
    if (!currentUser) return;
    refreshAiDetails();
    if (isOpen) {
      refreshRateStats();
    }
  }, [isOpen, currentUser]);

  const handleSelectModel = async (provider: string, model: string) => {
    try {
      const res = await fetch('/api/wayfinder/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model }),
      });
      const data = await res.json();
      if (data?.active) {
        setAiDetails(data.active);
        toast({
          title: 'AI Model Switched',
          description: `Active model is now ${data.active.displayName || model}`,
        });
      }
      setIsModelDropdownOpen(false);
    } catch (err: any) {
      toast({
        title: 'Model Switch Failed',
        description: err.message || 'Could not switch AI model.',
        variant: 'destructive',
      });
    }
  };

  // Auto-detect current project from URL path e.g. /projects/[projectId]/...
  useEffect(() => {
    const match = pathname.match(/\/projects\/([^/]+)/);
    if (match && match[1]) {
      const urlProjectId = match[1];
      setSelectedProjectId(urlProjectId);
    }
  }, [pathname]);

  // Load user and project list
  useEffect(() => {
    const storedUser = localStorage.getItem('projectflow_user');
    if (!storedUser) {
      setCurrentUser(null);
      return;
    }

    try {
      setCurrentUser(JSON.parse(storedUser));
    } catch (e) {
      console.error('Failed to parse user from localStorage', e);
      setCurrentUser(null);
      return;
    }

    // Fetch projects from DB only when user is authenticated
    if (db) {
      getDocs(collection(db, 'projects'))
        .then((snapshot: any) => {
          const list: ProjectOption[] = snapshot.docs
            .filter((d: any) => !d.data().isDeleted)
            .map((d: any) => ({
              id: d.id,
              name: d.data().name || d.id,
            }));
          setProjects(list);

          // Update active project name if matched
          if (selectedProjectId) {
            const match = list.find((p) => p.id === selectedProjectId);
            if (match) setSelectedProjectName(match.name);
          }
        })
        .catch((err: any) => {
          // Gracefully suppress permission warning in local demo/unauthenticated environments
          if (err?.code !== 'permission-denied' && !err?.message?.includes('insufficient permissions')) {
            console.warn('Could not load projects for WayFinder switcher', err);
          }
        });
    }
  }, [selectedProjectId]);

  // Update selected project name when selectedProjectId changes
  useEffect(() => {
    if (selectedProjectId && projects.length > 0) {
      const match = projects.find((p) => p.id === selectedProjectId);
      setSelectedProjectName(match ? match.name : selectedProjectId);
    } else if (!selectedProjectId) {
      setSelectedProjectName(null);
    }
  }, [selectedProjectId, projects]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleStopExecution = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setMessages((prev) => [
      ...prev,
      {
        id: generateMessageId('msg-cancelled'),
        role: 'model',
        content: '🛑 *Execution was cancelled.*',
        timestamp: new Date(),
      },
    ]);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateMessageId('msg'),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Build live authenticated project snapshot if project is selected
      let activeProjectSnapshot: any = null;
      if (selectedProjectId && db) {
        try {
          const projectRef = doc(db, 'projects', selectedProjectId);
          const [pSnap, sysSnap, horSnap, storiesSnap, sprintsSnap, epicsSnap] = await Promise.all([
            getDoc(projectRef).catch(() => null),
            getDocs(collection(projectRef, 'initialImpactedSystems')).catch(() => null),
            getDocs(collection(projectRef, 'initialHorizontals')).catch(() => null),
            getDocs(collection(projectRef, 'stories')).catch(() => null),
            getDocs(collection(projectRef, 'sprints')).catch(() => null),
            getDocs(collection(projectRef, 'epics')).catch(() => null),
          ]);

          let impactedList = sysSnap?.docs?.map((d: any) => ({ id: d.id, ...d.data() })) || [];
          if (impactedList.length === 0) {
            const sysSnap2 = await getDocs(collection(projectRef, 'impactedSystems')).catch(() => null);
            impactedList = sysSnap2?.docs?.map((d: any) => ({ id: d.id, ...d.data() })) || [];
          }

          let horList = horSnap?.docs?.map((d: any) => ({ id: d.id, ...d.data() })) || [];
          if (horList.length === 0) {
            const horSnap2 = await getDocs(collection(projectRef, 'horizontals')).catch(() => null);
            horList = horSnap2?.docs?.map((d: any) => ({ id: d.id, ...d.data() })) || [];
          }

          const pData = pSnap?.data ? pSnap.data() : {};
          activeProjectSnapshot = {
            id: selectedProjectId,
            name: pData?.name || selectedProjectName,
            summary: pData?.summary || '',
            description: pData?.description || '',
            status: pData?.status || 'Active',
            pricingModel: pData?.pricingModel || 'Fixed Bid',
            impactedSystems: impactedList.map((s: any) => ({
              id: s.id,
              name: s.name,
              category: s.category || 'Technology',
              description: s.description || '',
              estimate: s.estimate || 0,
              dailyBillingRate: s.dailyBillingRate || 0,
            })),
            horizontals: horList.map((h: any) => ({
              id: h.id,
              name: h.name,
              weightage: h.weightage || 0,
              dailyBillingRate: h.dailyBillingRate || 0,
            })),
            stories: (storiesSnap?.docs || [])
              .filter((d: any) => !d.data().isDeleted)
              .map((d: any) => ({
                id: d.id,
                storyId: d.data().storyId,
                title: d.data().title,
                itemType: d.data().itemType,
                status: d.data().status,
                priority: d.data().priority,
              })),
            sprints: (sprintsSnap?.docs || []).map((d: any) => ({
              id: d.id,
              title: d.data().title,
              status: d.data().status,
            })),
            epics: (epicsSnap?.docs || []).map((d: any) => ({
              id: d.id,
              title: d.data().title,
            })),
          };
        } catch (snapErr) {
          console.warn('Could not build live project snapshot for WayFinder', snapErr);
        }
      }

      // Build request payload for backend
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/wayfinder/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: apiMessages,
          currentProjectId: selectedProjectId || undefined,
          currentProjectName: selectedProjectName || undefined,
          activeProjectSnapshot,
          currentUser: currentUser
            ? {
                empId: currentUser.empId,
                firstName: currentUser.firstName,
                lastName: currentUser.lastName,
                email: currentUser.email,
                accessLevel: effectiveAccessLevel,
                role: effectiveAccessLevel,
              }
            : {
                accessLevel: effectiveAccessLevel,
                role: effectiveAccessLevel,
              },
        }),
      });

      // Capture rate utilization headers
      const rpm = res.headers.get('x-rate-rpm');
      const rpmLimit = res.headers.get('x-rate-rpm-limit');
      const rpmPct = res.headers.get('x-rate-percent-rpm');
      const tpm = res.headers.get('x-rate-tpm');
      const tpmLimit = res.headers.get('x-rate-tpm-limit');
      const tpmPct = res.headers.get('x-rate-percent-tpm');
      const lastPrompt = res.headers.get('x-rate-last-prompt-tokens');
      const lastCompletion = res.headers.get('x-rate-last-completion-tokens');
      const lastTotal = res.headers.get('x-rate-last-total-tokens');
      const lastCost = res.headers.get('x-rate-last-cost-usd');
      const lastModelCallsHeader = res.headers.get('x-rate-last-model-calls');
      const lastToolCallsHeader = res.headers.get('x-rate-last-tool-calls');
      const rateStatus = (res.headers.get('x-rate-status') || 'safe') as any;

      if (rpm !== null && tpm !== null) {
        setRateStats((prev) => ({
          ...prev,
          currentRpm: parseInt(rpm, 10) || prev.currentRpm,
          limitRpm: parseInt(rpmLimit || '15', 10),
          percentRpm: parseFloat(rpmPct || '0'),
          currentTpm: parseInt(tpm, 10) || prev.currentTpm,
          limitTpm: parseInt(tpmLimit || '1000000', 10),
          percentTpm: parseFloat(tpmPct || '0'),
          lastPromptTokens: lastPrompt ? parseInt(lastPrompt, 10) : prev.lastPromptTokens,
          lastCompletionTokens: lastCompletion ? parseInt(lastCompletion, 10) : prev.lastCompletionTokens,
          lastTotalTokens: lastTotal ? parseInt(lastTotal, 10) : prev.lastTotalTokens,
          lastCostUsd: lastCost ? parseFloat(lastCost) : prev.lastCostUsd,
          lastModelCalls: lastModelCallsHeader ? parseInt(lastModelCallsHeader, 10) : prev.lastModelCalls,
          lastToolCalls: lastToolCallsHeader ? parseInt(lastToolCallsHeader, 10) : prev.lastToolCalls,
          status: rateStatus,
        }));
      }

      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }

      if (data.rateUtilization) {
        setRateStats(data.rateUtilization);
      }

      const rawTokenUsage = data.tokenUsage || (data.rateUtilization ? {
        promptTokens: data.rateUtilization.lastPromptTokens,
        completionTokens: data.rateUtilization.lastCompletionTokens,
        totalTokens: data.rateUtilization.lastTotalTokens,
        costUsd: data.rateUtilization.lastCostUsd,
        modelCalls: data.rateUtilization.lastModelCalls,
        toolCalls: data.rateUtilization.lastToolCalls,
        toolsUsed: data.rateUtilization.lastToolsUsed,
      } : (lastTotal ? {
        promptTokens: parseInt(lastPrompt || '0', 10),
        completionTokens: parseInt(lastCompletion || '0', 10),
        totalTokens: parseInt(lastTotal || '0', 10),
        costUsd: lastCost ? parseFloat(lastCost) : undefined,
        modelCalls: lastModelCallsHeader ? parseInt(lastModelCallsHeader, 10) : 1,
        toolCalls: lastToolCallsHeader ? parseInt(lastToolCallsHeader, 10) : 0,
      } : undefined));

      if (data.aiDetails) {
        setAiDetails(data.aiDetails);
      }

      if (!res.ok && !data.reply) {
        throw new Error(data.error || `Server returned error ${res.status}`);
      }

      // Execute actions via authenticated client session if needed
      let finalActions = data.executedActions || [];
      if (finalActions.length > 0) {
        const processedActions: WayFinderActionItem[] = [];
        for (const action of finalActions) {
          if (controller.signal.aborted) break;
          if (action.needsClientExecution) {
            try {
              const { executeWayFinderActionOnClient } = await import('@/lib/wayfinder-client-executor');
              const clientResult = await executeWayFinderActionOnClient(action);
              processedActions.push({
                ...action,
                ...clientResult,
                needsClientExecution: false,
              });
            } catch (execErr: any) {
              console.error('Client action execution failed:', execErr);
              processedActions.push(action);
            }
          } else {
            processedActions.push(action);
          }
        }
        finalActions = processedActions;
      }

      if (controller.signal.aborted) return;

      const assistantMessage: ChatMessage = {
        id: generateMessageId('msg'),
        role: 'model',
        content: data.reply || data.error || 'Request completed.',
        executedActions: finalActions.length > 0 ? finalActions : undefined,
        tokenUsage: rawTokenUsage,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        // Handled cleanly in handleStopExecution
        return;
      }
      console.error('Failed to communicate with WayFinder:', error);
      const errorMessage: ChatMessage = {
        id: generateMessageId('msg-err'),
        role: 'model',
        content: `⚠️ Sorry, I encountered an issue executing your request: ${error.message || 'Could not connect to WayFinder service.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  // Helper to render basic markdown formatting
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1.5" />;

          // Bullet points
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-1.5 ml-1">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{line.slice(2)}</span>
              </div>
            );
          }

          // Numbered lists
          const numMatch = line.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-1.5 ml-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono text-xs">{numMatch[1]}.</span>
                <span>{numMatch[2]}</span>
              </div>
            );
          }

          return <p key={idx}>{line}</p>;
        })}
      </div>
    );
  };

  if (!currentUser) {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('projectflow_user') : null;
    if (!stored) {
      return null;
    }
  }

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsOpen(true)}
                  className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-[#1d4ed8] via-[#0284c7] to-[#059669] text-white shadow-xl shadow-emerald-950/40 hover:shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all duration-300 ring-4 ring-emerald-500/25 border border-emerald-400/30 cursor-pointer"
                  aria-label="Open WayFinder AI Copilot"
                >
                  <Bot className="w-7 h-7 transition-transform group-hover:rotate-6 text-white" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-background"></span>
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="font-medium bg-popover text-popover-foreground border-border shadow-md">
                <p className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Chat with WayFinder AI
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Floating Chat Window Panel */}
      {isOpen && (
        <div
          className={cn(
            'fixed bottom-6 right-6 z-50 flex flex-col bg-background/95 backdrop-blur-xl border-2 border-border shadow-2xl rounded-lg overflow-hidden transition-all duration-200',
            isMaximized
              ? 'w-[94vw] md:w-[720px] h-[88vh]'
              : 'w-[94vw] sm:w-[420px] md:w-[460px] h-[600px] max-h-[85vh]'
          )}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-card text-card-foreground border-b border-border flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-r from-[#1d4ed8] via-[#0284c7] to-[#059669] text-white shadow-md shadow-emerald-950/30 shrink-0">
                <Bot className="w-5 h-5 text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-sm leading-tight text-foreground">WayFinder</h3>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-semibold">
                    AI
                  </Badge>

                  {/* Model Engine Selector Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setIsModelDropdownOpen(!isModelDropdownOpen);
                        setIsDropdownOpen(false);
                        refreshAiDetails();
                      }}
                      className="flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/15 transition-all max-w-[170px] sm:max-w-[220px] truncate shadow-sm cursor-pointer"
                      title="Click to switch AI Model"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      <span className="truncate">{aiDetails?.displayName || aiDetails?.model || 'AI Model'}</span>
                      <ChevronDown className="w-2.5 h-2.5 opacity-70 shrink-0" />
                    </button>

                    {isModelDropdownOpen && (
                      <div className="absolute top-7 left-0 z-50 w-72 p-2 bg-popover border border-border rounded-lg shadow-2xl text-xs space-y-2 text-popover-foreground animate-in fade-in-50 zoom-in-95">
                        <div className="flex items-center justify-between px-1 pb-1 border-b border-border">
                          <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-emerald-500" />
                            Select AI Inference Model
                          </span>
                          <span className="text-[9px] font-mono text-muted-foreground uppercase px-1.5 py-0.2 bg-muted rounded">
                            {aiDetails?.provider || 'auto'}
                          </span>
                        </div>

                        {/* LM Studio Local Models Section */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between px-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            <span>LM Studio (Local Server)</span>
                            {availableModels.isLmStudioRunning ? (
                              <span className="text-[9px] text-emerald-500 font-bold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Online (1234)
                              </span>
                            ) : (
                              <span className="text-[9px] text-amber-500">Offline</span>
                            )}
                          </div>

                          {availableModels.lmStudioModels.length > 0 ? (
                            <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5">
                              {availableModels.lmStudioModels.map((m) => {
                                const isSelected = aiDetails?.provider === 'lmstudio' && aiDetails?.model === m;
                                return (
                                  <button
                                    key={m}
                                    onClick={() => handleSelectModel('lmstudio', m)}
                                    className={cn(
                                      'w-full text-left px-2 py-1.5 rounded-md text-[11px] font-mono transition-colors flex items-center justify-between gap-1.5',
                                      isSelected
                                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30'
                                        : 'hover:bg-accent hover:text-accent-foreground text-foreground/90'
                                    )}
                                  >
                                    <span className="truncate">{m}</span>
                                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="px-2 py-1 text-[10px] text-muted-foreground italic">
                              {availableModels.isLmStudioRunning
                                ? 'No models loaded in LM Studio.'
                                : 'Start LM Studio & enable local server on port 1234.'}
                            </div>
                          )}
                        </div>

                        <div className="h-px bg-border my-1" />

                        {/* Google Gemini Cloud Section */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between px-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            <span>Google Gemini (Live API)</span>
                            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold">Cloud</span>
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-0.5 pr-0.5">
                            {availableModels.geminiModels.map((m) => {
                              const isSelected = aiDetails?.provider === 'google' && aiDetails?.model === m;
                              return (
                                <button
                                  key={m}
                                  onClick={() => handleSelectModel('google', m)}
                                  className={cn(
                                    'w-full text-left px-2 py-1.5 rounded-md text-[11px] font-mono transition-colors flex items-center justify-between gap-1.5',
                                    isSelected
                                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30'
                                      : 'hover:bg-accent hover:text-accent-foreground text-foreground/90'
                                  )}
                                >
                                  <span className="truncate">{m}</span>
                                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative flex items-center gap-1 mt-0.5">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors truncate max-w-[200px]"
                    title="Switch target project scope"
                  >
                    <FolderKanban className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span className="truncate">{selectedProjectName ? selectedProjectName : 'Global Scope'}</span>
                    <ChevronDown className="w-3 h-3 shrink-0 opacity-70" />
                  </button>

                  {/* Project Selector Dropdown */}
                  {isDropdownOpen && (
                    <div className="absolute top-6 left-0 z-50 w-56 p-1 bg-popover border border-border rounded-lg shadow-xl text-xs space-y-1 text-popover-foreground">
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Target Project Scope
                      </div>
                      <button
                        onClick={() => {
                          setSelectedProjectId(null);
                          setSelectedProjectName(null);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground flex items-center justify-between transition-colors',
                          !selectedProjectId && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold'
                        )}
                      >
                        <span>🌐 Global (All Projects)</span>
                        {!selectedProjectId && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                      </button>
                      <div className="h-px bg-border my-1" />
                      <div className="max-h-36 overflow-y-auto space-y-0.5">
                        {projects.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setSelectedProjectId(p.id);
                              setSelectedProjectName(p.name);
                              setIsDropdownOpen(false);
                            }}
                            className={cn(
                              'w-full text-left px-2 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground flex items-center justify-between truncate transition-colors',
                              selectedProjectId === p.id && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-semibold'
                            )}
                          >
                            <span className="truncate">{p.name}</span>
                            {selectedProjectId === p.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-1 text-emerald-500" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Window Action Controls */}
            <div className="flex items-center gap-1 text-muted-foreground">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearChat}
                className="w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-accent"
                title="Clear Conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMaximized(!isMaximized)}
                className="w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-accent"
                title={isMaximized ? 'Restore' : 'Maximize'}
              >
                {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 text-muted-foreground hover:text-foreground hover:bg-accent"
                title="Minimize Chat"
              >
                <Minus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Sub-Header Status Ribbon: Access Level & Quota Utilization Meter */}
          <div className="px-3 py-1.5 bg-muted/40 border-b border-border flex items-center justify-between gap-2 text-[11px] shrink-0 select-none">
            {/* Access Level Pill with Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsAccessPopoverOpen(!isAccessPopoverOpen);
                  setIsRatePopoverOpen(false);
                }}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-background border border-border/80 hover:border-emerald-500/50 text-muted-foreground hover:text-foreground font-medium transition-all shadow-xs cursor-pointer"
                title="Click to view permissions for your active access level"
              >
                <Shield className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="font-semibold text-foreground text-[10px]">
                  Role: {effectiveAccessLevel}
                </span>
                <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0" />
              </button>

              {isAccessPopoverOpen && (
                <div className="absolute top-7 left-0 z-50 w-72 p-3 bg-popover border border-border rounded-lg shadow-2xl text-xs space-y-2 text-popover-foreground animate-in fade-in-50 zoom-in-95">
                  <div className="flex items-center justify-between pb-1.5 border-b border-border">
                    <span className="font-bold flex items-center gap-1.5 text-foreground text-xs">
                      <Shield className="w-3.5 h-3.5 text-emerald-500" />
                      Active Access Level
                    </span>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      {effectiveAccessLevel}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 text-[11px]">
                    <div className="text-muted-foreground font-medium">
                      {ROLE_PERMISSIONS[effectiveAccessLevel]?.desc || 'User Role'}
                    </div>
                    <div className="p-2 rounded bg-muted/50 border border-border/50 text-[10px] space-y-1">
                      <div className="font-semibold text-foreground">Permitted Operations:</div>
                      <div className="text-muted-foreground leading-relaxed">
                        {ROLE_PERMISSIONS[effectiveAccessLevel]?.crud || 'Standard permissions'}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground italic leading-tight">
                      WayFinder enforces these activity restrictions matching Portfolio Access & CRUD settings.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Live Token & Request Utilization (TPM / RPM) Meter */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsRatePopoverOpen(!isRatePopoverOpen);
                  setIsAccessPopoverOpen(false);
                }}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono text-[10px] transition-all shadow-xs cursor-pointer',
                  rateStats.status === 'critical'
                    ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                    : rateStats.status === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                    : 'bg-background border-border/80 hover:border-emerald-500/50 text-muted-foreground hover:text-foreground'
                )}
                title="Click to view real-time TPM / RPM quota utilization"
              >
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    rateStats.status === 'critical'
                      ? 'bg-red-500 animate-ping'
                      : rateStats.status === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  )}
                />
                <Zap className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                <span>
                  {rateStats.currentTpm >= 1000 ? `${(rateStats.currentTpm / 1000).toFixed(1)}k` : rateStats.currentTpm} TPM
                </span>
                <span className="text-muted-foreground font-normal">·</span>
                <span>
                  {rateStats.currentRpm}/{rateStats.limitRpm} Calls
                </span>
              </button>

              {isRatePopoverOpen && (
                <div className="absolute top-7 right-0 z-50 w-72 p-3 bg-popover border border-border rounded-lg shadow-2xl text-xs space-y-2.5 text-popover-foreground animate-in fade-in-50 zoom-in-95">
                  <div className="flex items-center justify-between pb-1.5 border-b border-border">
                    <span className="font-bold flex items-center gap-1.5 text-foreground text-xs">
                      <Activity className="w-3.5 h-3.5 text-emerald-500" />
                      Live Quota Utilization (60s)
                    </span>
                    <span
                      className={cn(
                        'text-[9px] font-bold uppercase px-1.5 py-0.5 rounded',
                        rateStats.status === 'critical'
                          ? 'bg-red-500/20 text-red-500'
                          : rateStats.status === 'warning'
                          ? 'bg-amber-500/20 text-amber-500'
                          : 'bg-emerald-500/20 text-emerald-500'
                      )}
                    >
                      {rateStats.status}
                    </span>
                  </div>

                  {/* TPM Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground font-medium">Tokens Per Minute (TPM):</span>
                      <span className="font-mono font-semibold">
                        {rateStats.currentTpm.toLocaleString()} / {rateStats.limitTpm.toLocaleString()} ({rateStats.percentTpm}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          rateStats.percentTpm >= 85
                            ? 'bg-red-500'
                            : rateStats.percentTpm >= 60
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        )}
                        style={{ width: `${Math.min(100, Math.max(2, rateStats.percentTpm))}%` }}
                      />
                    </div>
                  </div>

                  {/* Calls / RPM Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground font-medium">Subagent & Model Calls (60s):</span>
                      <span className="font-mono font-semibold">
                        {rateStats.currentRpm} / {rateStats.limitRpm} ({rateStats.percentRpm}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          rateStats.percentRpm >= 85
                            ? 'bg-red-500'
                            : rateStats.percentRpm >= 60
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        )}
                        style={{ width: `${Math.min(100, Math.max(2, rateStats.percentRpm))}%` }}
                      />
                    </div>
                  </div>

                  {/* Last Query Execution Tokens & Calls */}
                  {rateStats.lastTotalTokens > 0 && (
                    <div className="p-2 bg-muted/40 border border-border/60 rounded-md space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-semibold text-foreground">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500" />
                          Last Query Execution:
                        </span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          {rateStats.lastTotalTokens.toLocaleString()} tokens
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] bg-background/60 px-1.5 py-1 rounded border border-border/40 font-mono">
                        <span className="text-muted-foreground">Actual Calls:</span>
                        <span className="text-foreground font-semibold">
                          {rateStats.lastModelCalls || 1} model call{(rateStats.lastModelCalls || 1) > 1 ? 's' : ''}
                          {rateStats.lastToolCalls ? ` (${rateStats.lastToolCalls} tool execution${rateStats.lastToolCalls > 1 ? 's' : ''})` : ''}
                        </span>
                      </div>
                      {rateStats.lastToolsUsed && rateStats.lastToolsUsed.length > 0 && (
                        <div className="text-[9px] text-muted-foreground space-y-0.5">
                          <div className="font-semibold text-foreground">Tools Invoked:</div>
                          <div className="flex flex-wrap gap-1">
                            {rateStats.lastToolsUsed.map((t) => (
                              <span key={t} className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded font-mono text-[9px]">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-1 text-[9px] text-muted-foreground pt-0.5 border-t border-border/30">
                        <div>Input: <span className="font-mono font-medium text-foreground">{rateStats.lastPromptTokens.toLocaleString()}</span></div>
                        <div>Output: <span className="font-mono font-medium text-foreground">{rateStats.lastCompletionTokens.toLocaleString()}</span></div>
                        <div className="col-span-2">Cost: <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">${rateStats.lastCostUsd.toFixed(5)} USD</span></div>
                      </div>
                    </div>
                  )}

                  <p className="text-[9px] text-muted-foreground leading-tight pt-1 border-t border-border">
                    Limits based on AI quota window. Complete execution includes system ontology, domain tools, and reasoning.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 text-xs bg-background/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 ring-1 ring-emerald-500/20">
                  <Sparkles className="w-6 h-6 text-emerald-500 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-foreground">
                    Hello{currentUser?.firstName ? `, ${currentUser.firstName}` : ''}!
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-[320px]">
                    I am <span className="font-semibold text-emerald-600 dark:text-emerald-400">WayFinder</span>, your autonomous project copilot. Tell me what you need and I will implement it in Workwayz.
                  </p>
                </div>

                <div className="w-full space-y-1.5 pt-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground px-1">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>Try asking:</span>
                  </div>
                  <div className="grid gap-1.5 text-left">
                    {QUICK_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSendMessage(prompt)}
                        className="text-xs px-3 py-2 rounded-xl bg-card border border-border/70 hover:border-emerald-500/40 hover:bg-emerald-500/5 text-foreground transition-all duration-150 flex items-center justify-between group shadow-sm"
                      >
                        <span className="truncate pr-2">{prompt}</span>
                        <span className="text-emerald-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex flex-col',
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-lg px-3.5 py-2.5 shadow-sm text-sm',
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-[#1d4ed8] via-[#0284c7] to-[#059669] text-white shadow-sm shadow-emerald-950/20 rounded-br-none'
                        : 'bg-muted/70 text-foreground border border-border/50 rounded-bl-none'
                    )}
                  >
                    {msg.role === 'model' ? renderFormattedText(msg.content) : msg.content}
                  </div>
                  <div className="flex items-center gap-2 px-1 mt-1">
                    <span className="text-[10px] text-muted-foreground/60 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.tokenUsage && msg.tokenUsage.totalTokens > 0 && (
                      <div
                        className="inline-flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50 shadow-2xs flex-wrap"
                        title={`Execution Metrics:\n• Total Model Calls: ${msg.tokenUsage.modelCalls ?? 1} call(s)\n• Subagent Tool Invocations: ${msg.tokenUsage.toolCalls ?? 0}${msg.tokenUsage.toolsUsed && msg.tokenUsage.toolsUsed.length > 0 ? ` (${msg.tokenUsage.toolsUsed.join(', ')})` : ''}\n• Input: ${msg.tokenUsage.promptTokens.toLocaleString()} tokens (ontology + tools + context)\n• Output: ${msg.tokenUsage.completionTokens.toLocaleString()} tokens\n• Total: ${msg.tokenUsage.totalTokens.toLocaleString()} tokens\n• Cost: $${(msg.tokenUsage.costUsd ?? 0).toFixed(5)} USD`}
                      >
                        <span className="flex items-center gap-1 text-foreground font-medium">
                          <Zap className="w-2.5 h-2.5 text-amber-500 shrink-0" />
                          <span>{msg.tokenUsage.totalTokens.toLocaleString()} tokens</span>
                        </span>
                        <span className="text-muted-foreground/50">·</span>
                        <span className="px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                          {(msg.tokenUsage.modelCalls ?? 1) > 1
                            ? `${msg.tokenUsage.modelCalls} calls (${msg.tokenUsage.toolCalls ?? ((msg.tokenUsage.modelCalls ?? 1) - 1)} tools)`
                            : (msg.tokenUsage.toolCalls && msg.tokenUsage.toolCalls > 0)
                            ? `${msg.tokenUsage.toolCalls} tool calls`
                            : `1 call`}
                        </span>
                        {msg.tokenUsage.costUsd !== undefined && (
                          <>
                            <span className="text-muted-foreground/50">·</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                              ${msg.tokenUsage.costUsd < 0.001 ? msg.tokenUsage.costUsd.toFixed(5) : msg.tokenUsage.costUsd.toFixed(4)}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="bg-muted/70 border border-border/50 rounded-lg rounded-bl-none px-3.5 py-2 shadow-sm flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                    <span>WayFinder is executing subagent actions & tool calls...</span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleStopExecution}
                    className="h-5 px-1.5 text-[10px] text-destructive hover:bg-destructive/10 hover:text-destructive font-semibold transition-colors"
                    title="Cancel execution"
                  >
                    <Square className="w-2.5 h-2.5 fill-current mr-1" />
                    Stop
                  </Button>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Area */}
          <div className="p-3 bg-card/60 border-t border-border shrink-0">
            <div className="flex items-end gap-2 bg-background border border-input rounded-lg p-1.5 focus-within:ring-2 focus-within:ring-emerald-500/30 focus-within:border-emerald-500 transition-all">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask WayFinder (e.g. 'Create a critical bug for login failure')..."
                rows={1}
                className="min-h-[38px] max-h-28 text-xs sm:text-sm resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent py-2 px-2"
              />
              {isLoading ? (
                <Button
                  size="icon"
                  onClick={handleStopExecution}
                  className="w-8 h-8 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 shrink-0 shadow-sm transition-all animate-pulse"
                  title="Stop execution"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </Button>
              ) : (
                <Button
                  size="icon"
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim()}
                  className="w-8 h-8 rounded-md bg-gradient-to-r from-[#1d4ed8] via-[#0284c7] to-[#059669] hover:from-[#1e40af] hover:via-[#0369a1] hover:to-[#047857] text-white shrink-0 shadow-sm shadow-emerald-950/20 disabled:opacity-40 disabled:hover:from-[#1d4ed8] disabled:hover:via-[#0284c7] disabled:hover:to-[#059669] cursor-pointer"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between px-2 pt-1.5 text-[10px] text-muted-foreground/70">
              <span>Press Enter to send, Shift+Enter for newline</span>
              <span className="font-mono text-[9px] opacity-75">
                Target: {selectedProjectName ? selectedProjectName : 'Global'}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Backwards compatibility alias
export const FlowPilotChatWidget = WayFinderChatWidget;
export const HermesChatWidget = WayFinderChatWidget;

