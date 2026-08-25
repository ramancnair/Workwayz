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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { HermesActionCard } from './HermesActionCard';
import type { HermesActionItem } from '@/ai/flows/hermes-agent';
import { collection, getDocs, db } from '@/lib/db-provider';
import { executeHermesActionOnClient } from '@/lib/hermes-client-executor';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  executedActions?: HermesActionItem[];
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

export function HermesChatWidget() {
  const pathname = usePathname();
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
  const [aiDetails, setAiDetails] = useState<AiDetailsInfo | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch active AI details from backend
  const refreshAiDetails = () => {
    fetch('/api/hermes/chat')
      .then((r) => r.json())
      .then((d) => {
        if (d?.aiDetails) setAiDetails(d.aiDetails);
      })
      .catch((e) => console.warn('Could not fetch AI details for header', e));
  };

  useEffect(() => {
    refreshAiDetails();
  }, [isOpen]);

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
          console.warn('Could not load projects for Hermes switcher', err);
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

    try {
      // Build request payload for backend
      const apiMessages = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/hermes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        const processedActions: HermesActionItem[] = [];
        for (const action of finalActions) {
          if (action.needsClientExecution) {
            try {
              const clientResult = await executeHermesActionOnClient(action);
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

      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        content: data.reply || data.error || 'Request completed.',
        executedActions: finalActions.length > 0 ? finalActions : undefined,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('Failed to communicate with Hermes:', error);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'model',
        content: `⚠️ Sorry, I encountered an issue executing your request: ${error.message || 'Could not connect to Hermes service.'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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
                  className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-500 text-white shadow-xl hover:shadow-cyan-500/25 hover:scale-105 active:scale-95 transition-all duration-300 ring-4 ring-indigo-500/20"
                  aria-label="Open Hermes AI Assistant"
                >
                  <Bot className="w-7 h-7 transition-transform group-hover:rotate-6" />
                  <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-background"></span>
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="font-medium bg-slate-900 text-white border-slate-800">
                <p className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Chat with Hermes AI
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
            'fixed bottom-6 right-6 z-50 flex flex-col bg-background/95 backdrop-blur-xl border border-border/80 shadow-2xl rounded-2xl overflow-hidden transition-all duration-200',
            isMaximized
              ? 'w-[94vw] md:w-[720px] h-[88vh]'
              : 'w-[94vw] sm:w-[420px] md:w-[460px] h-[600px] max-h-[85vh]'
          )}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-indigo-950/90 via-slate-900/90 to-indigo-900/90 text-white border-b border-indigo-500/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 text-white shadow-md shrink-0">
                <Bot className="w-5 h-5" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-bold text-sm leading-tight text-slate-100">Hermes Agent</h3>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-cyan-400/40 text-cyan-300 bg-cyan-950/40 font-semibold">
                    AI
                  </Badge>

                  {/* Model Engine Pill */}
                  {aiDetails && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 max-w-[170px] sm:max-w-[210px] truncate cursor-help shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            <span className="truncate">{aiDetails.displayName || aiDetails.model}</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="bg-slate-900 text-white text-xs border-slate-700 space-y-1 p-2 shadow-xl">
                          <p className="font-bold text-cyan-300 flex items-center gap-1">
                            <Cpu className="w-3.5 h-3.5" />
                            Active Inference Engine
                          </p>
                          <p><span className="text-slate-400">Provider:</span> <span className="font-semibold uppercase text-slate-200">{aiDetails.provider}</span></p>
                          <p><span className="text-slate-400">Model:</span> <span className="font-mono text-emerald-400 font-semibold">{aiDetails.model}</span></p>
                          {aiDetails.endpoint && (
                            <p><span className="text-slate-400">Endpoint:</span> <span className="font-mono text-slate-300 text-[11px]">{aiDetails.endpoint}</span></p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>

                <div className="relative flex items-center gap-1 mt-0.5">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white transition-colors truncate max-w-[200px]"
                    title="Switch target project scope"
                  >
                    <FolderKanban className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="truncate">{selectedProjectName ? selectedProjectName : 'Global Scope'}</span>
                    <ChevronDown className="w-3 h-3 shrink-0 opacity-70" />
                  </button>

                  {/* Project Selector Dropdown */}
                  {isDropdownOpen && (
                    <div className="absolute top-6 left-0 z-50 w-56 p-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-xs space-y-1 text-slate-200">
                      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Target Project Scope
                      </div>
                      <button
                        onClick={() => {
                          setSelectedProjectId(null);
                          setSelectedProjectName(null);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          'w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-800 flex items-center justify-between',
                          !selectedProjectId && 'bg-indigo-600/30 text-cyan-300 font-semibold'
                        )}
                      >
                        <span>🌐 Global (All Projects)</span>
                        {!selectedProjectId && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                      <div className="h-px bg-slate-800 my-1" />
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
                              'w-full text-left px-2 py-1.5 rounded-md hover:bg-slate-800 flex items-center justify-between truncate',
                              selectedProjectId === p.id && 'bg-indigo-600/30 text-cyan-300 font-semibold'
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
            <div className="flex items-center gap-1 text-slate-300">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClearChat}
                className="w-7 h-7 text-slate-300 hover:text-white hover:bg-white/10"
                title="Clear Conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMaximized(!isMaximized)}
                className="w-7 h-7 text-slate-300 hover:text-white hover:bg-white/10 hidden sm:flex"
                title={isMaximized ? 'Restore Size' : 'Maximize'}
              >
                {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 text-slate-300 hover:text-white hover:bg-white/10"
                title="Close Chat"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col justify-center items-center text-center p-4 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600/20 to-cyan-500/20 flex items-center justify-center text-primary ring-1 ring-primary/20">
                  <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-base text-foreground">
                    Hello{currentUser?.firstName ? `, ${currentUser.firstName}` : ''}!
                  </h4>
                  <p className="text-xs text-muted-foreground max-w-[320px]">
                    I am <span className="font-semibold text-primary">Hermes</span>, your autonomous project copilot. Tell me what you need and I will implement it in ProjectFlow.
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
                      'max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm text-sm',
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
                          <HermesActionCard key={idx} action={action} onNavigate={() => setIsOpen(false)} />
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
                <div className="bg-muted/70 border border-border/50 rounded-2xl rounded-bl-none px-3.5 py-2.5 shadow-sm flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span>Hermes is executing actions & writing to DB...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Area */}
          <div className="p-3 bg-background/90 border-t border-border/70 shrink-0">
            <div className="flex items-end gap-2 bg-muted/40 border border-input rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Hermes (e.g. 'Create a critical bug for login failure')..."
                rows={1}
                className="min-h-[38px] max-h-28 text-xs sm:text-sm resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent py-2 px-2"
              />
              <Button
                size="icon"
                onClick={() => handleSendMessage()}
                disabled={!input.trim() || isLoading}
                className="w-8 h-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 shadow-sm disabled:opacity-40"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex items-center justify-between px-2 pt-1.5 text-[10px] text-muted-foreground/70">
              <span>Press <strong>Enter</strong> to send, <strong>Shift+Enter</strong> for newline</span>
              <span className="font-mono">{selectedProjectName ? `Target: ${selectedProjectName}` : 'Global Scope'}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
