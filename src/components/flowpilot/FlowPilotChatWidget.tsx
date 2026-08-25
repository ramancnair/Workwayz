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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { FlowPilotActionCard } from './FlowPilotActionCard';
import type { FlowPilotActionItem } from '@/ai/flows/flowpilot-agent';
import { collection, getDocs, db } from '@/lib/db-provider';
import { executeFlowPilotActionOnClient } from '@/lib/flowpilot-client-executor';

import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  executedActions?: FlowPilotActionItem[];
  timestamp: Date;
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

export function FlowPilotChatWidget() {
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [aiDetails, setAiDetails] = useState<AiDetailsInfo | null>(null);
  const [availableModels, setAvailableModels] = useState<{
    lmStudioModels: string[];
    geminiModels: string[];
    isLmStudioRunning: boolean;
  }>({
    lmStudioModels: [],
    geminiModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
    isLmStudioRunning: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch active AI details & live model list from backend
  const refreshAiDetails = () => {
    fetch('/api/flowpilot/models')
      .then((r) => r.json())
      .then((d) => {
        if (d?.active) setAiDetails(d.active);
        if (d?.lmStudioModels) {
          setAvailableModels({
            lmStudioModels: d.lmStudioModels,
            geminiModels: d.geminiModels || ['gemini-2.5-flash', 'gemini-2.5-pro'],
            isLmStudioRunning: d.isLmStudioRunning,
          });
        }
      })
      .catch((e) => console.warn('Could not fetch AI models for header', e));
  };

  useEffect(() => {
    refreshAiDetails();
  }, [isOpen]);

  const handleSelectModel = async (provider: string, model: string) => {
    try {
      const res = await fetch('/api/flowpilot/models', {
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
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user from localStorage', e);
      }
    }

    // Fetch projects from DB
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
        .catch((err) => {
          console.warn('Could not load projects for FlowPilot switcher', err);
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
        id: `msg-cancelled-${Date.now()}`,
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
      id: `msg-${Date.now()}`,
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
      // Build request payload for backend
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/flowpilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          messages: apiMessages,
          currentProjectId: selectedProjectId || undefined,
          currentProjectName: selectedProjectName || undefined,
          currentUser: currentUser
            ? {
                empId: currentUser.empId,
                firstName: currentUser.firstName,
                lastName: currentUser.lastName,
                email: currentUser.email,
                accessLevel: currentUser.accessLevel,
              }
            : undefined,
        }),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        data = {};
      }

      if (data.aiDetails) {
        setAiDetails(data.aiDetails);
      }

      if (!res.ok && !data.reply) {
        throw new Error(data.error || `Server returned error ${res.status}`);
      }

      // Execute actions via authenticated client session if needed
      let finalActions = data.executedActions || [];
      if (finalActions.length > 0) {
        const processedActions: FlowPilotActionItem[] = [];
        for (const action of finalActions) {
          if (controller.signal.aborted) break;
          if (action.needsClientExecution) {
            try {
              const clientResult = await executeFlowPilotActionOnClient(action);
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
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        content: data.reply || data.error || 'Request completed.',
        executedActions: finalActions.length > 0 ? finalActions : undefined,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      if (error.name === 'AbortError' || controller.signal.aborted) {
        // Handled cleanly in handleStopExecution
        return;
      }
      console.error('Failed to communicate with FlowPilot:', error);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        content: `⚠️ Sorry, I encountered an issue executing your request: ${error.message || 'Could not connect to FlowPilot service.'}`,
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
                <span className="text-primary font-bold">•</span>
                <span>{line.slice(2)}</span>
              </div>
            );
          }

          // Numbered lists
          const numMatch = line.match(/^(\d+)\.\s+(.*)/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-1.5 ml-1">
                <span className="text-primary font-bold font-mono text-xs">{numMatch[1]}.</span>
                <span>{numMatch[2]}</span>
              </div>
            );
          }

          return <p key={idx}>{line}</p>;
        })}
      </div>
    );
  };

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
                  className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-xl hover:shadow-primary/25 hover:scale-105 active:scale-95 transition-all duration-300 ring-4 ring-primary/20"
                  aria-label="Open FlowPilot AI Copilot"
                >
                  <Bot className="w-7 h-7 transition-transform group-hover:rotate-6" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-background"></span>
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="font-medium bg-popover text-popover-foreground border-border shadow-md">
                <p className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Chat with FlowPilot AI
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
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-primary text-primary-foreground shadow-md shrink-0">
                <Bot className="w-5 h-5" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-card" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-sm leading-tight text-foreground">FlowPilot</h3>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary bg-primary/10 font-semibold">
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
                      className="flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hover:border-primary/40 hover:bg-primary/15 transition-all max-w-[170px] sm:max-w-[220px] truncate shadow-sm cursor-pointer"
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
                            <Cpu className="w-3.5 h-3.5 text-primary" />
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
                                        ? 'bg-primary/20 text-primary font-bold border border-primary/30'
                                        : 'hover:bg-accent hover:text-accent-foreground text-foreground/90'
                                    )}
                                  >
                                    <span className="truncate">{m}</span>
                                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
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
                          <div className="px-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Google Gemini (Cloud)
                          </div>
                          <div className="space-y-0.5">
                            {availableModels.geminiModels.map((m) => {
                              const isSelected = aiDetails?.provider === 'google' && aiDetails?.model === m;
                              return (
                                <button
                                  key={m}
                                  onClick={() => handleSelectModel('google', m)}
                                  className={cn(
                                    'w-full text-left px-2 py-1.5 rounded-md text-[11px] font-mono transition-colors flex items-center justify-between gap-1.5',
                                    isSelected
                                      ? 'bg-primary/20 text-primary font-bold border border-primary/30'
                                      : 'hover:bg-accent hover:text-accent-foreground text-foreground/90'
                                  )}
                                >
                                  <span className="truncate">{m}</span>
                                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
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
                    <FolderKanban className="w-3 h-3 text-primary shrink-0" />
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
                          !selectedProjectId && 'bg-primary/15 text-primary font-semibold'
                        )}
                      >
                        <span>🌐 Global (All Projects)</span>
                        {!selectedProjectId && <CheckCircle2 className="w-3.5 h-3.5" />}
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
                              selectedProjectId === p.id && 'bg-primary/15 text-primary font-semibold'
                            )}
                          >
                            <span className="truncate">{p.name}</span>
                            {selectedProjectId === p.id && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-1" />}
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

          {/* Messages Scroll Area */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3.5 text-xs bg-background/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3 my-auto">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20">
                  <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-foreground">
                    Hello{currentUser?.firstName ? `, ${currentUser.firstName}` : ''}!
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-[320px]">
                    I am <span className="font-semibold text-primary">FlowPilot</span>, your autonomous project copilot. Tell me what you need and I will implement it in ProjectFlow.
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
                        className="text-xs px-3 py-2 rounded-xl bg-card border border-border/70 hover:border-primary/40 hover:bg-primary/5 text-foreground transition-all duration-150 flex items-center justify-between group shadow-sm"
                      >
                        <span className="truncate pr-2">{prompt}</span>
                        <span className="text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">→</span>
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
                        ? 'bg-primary text-primary-foreground rounded-br-none'
                        : 'bg-muted/70 text-foreground border border-border/50 rounded-bl-none'
                    )}
                  >
                    {msg.role === 'model' ? renderFormattedText(msg.content) : msg.content}

                    {/* Executed Action Cards */}
                    {msg.executedActions && msg.executedActions.length > 0 && (
                      <div className="space-y-2 mt-2">
                        {msg.executedActions.map((action, idx) => (
                          <FlowPilotActionCard key={idx} action={action} onNavigate={() => setIsOpen(false)} />
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 px-1 mt-1 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-start gap-2">
                <div className="bg-muted/70 border border-border/50 rounded-lg rounded-bl-none px-3.5 py-2 shadow-sm flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>FlowPilot is executing actions...</span>
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
            <div className="flex items-end gap-2 bg-background border border-input rounded-lg p-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask FlowPilot (e.g. 'Create a critical bug for login failure')..."
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
                  className="w-8 h-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 shadow-sm disabled:opacity-40"
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
export const HermesChatWidget = FlowPilotChatWidget;

