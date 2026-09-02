'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { format, eachDayOfInterval, parseISO, isSameDay } from 'date-fns';
import { cn, isValidUrl, formatUrl } from '@/lib/utils';
import type { TestCaseStatus, TestCaseType, TestPlanTestCase } from '@/types';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Timer,
  ChevronDown,
  Search,
  X,
  User,
  Save,
  CheckSquare,
  Paperclip,
  Plus,
  Trash2,
  Edit,
  Link as LinkIcon,
  Check,
} from 'lucide-react';

const statusStyles: Record<TestCaseStatus, string> = {
  'Passed': 'bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-200 border-green-300 dark:border-green-800',
  'Failed': 'bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-200 border-red-300 dark:border-red-800',
  'Blocked': 'bg-orange-100 text-orange-800 dark:bg-orange-900/80 dark:text-orange-200 border-orange-300 dark:border-orange-800',
  'Skipped': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-200 border-yellow-300 dark:border-yellow-800',
  'Not Run': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
};

const testCaseStatuses: TestCaseStatus[] = ['Not Run', 'Passed', 'Failed', 'Blocked', 'Skipped'];

export default function TestExecutionPage() {
  const {
    testCycles,
    testCycleTestCases,
    employees,
    stories,
    testCases,
    subscribeToTestCycleTestCases,
    updateTestCycleTestCase,
  } = useProject();

  const { toast } = useToast();

  // Filters State
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedTesterId, setSelectedTesterId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Selected Test Case for Right Column
  const [selectedTCId, setSelectedTCId] = useState<string | null>(null);

  // Collapsible Day State
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  // Timer State for Active Manual Testing
  const [timerTCId, setTimerTCId] = useState<string | null>(null);
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Form State for Selected Test Case Instance
  const [formStatus, setFormStatus] = useState<TestCaseStatus>('Not Run');
  const [formAssigneeId, setFormAssigneeId] = useState<string>('unassigned');
  const [formExecutionDate, setFormExecutionDate] = useState<string>('');
  const [formActualEffort, setFormActualEffort] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formExpectedResult, setFormExpectedResult] = useState<string>('');
  const [formAttachments, setFormAttachments] = useState<Array<{ name: string; url: string }>>([]);
  const [editingExecAttachmentIndices, setEditingExecAttachmentIndices] = useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Auto-select first test cycle if none selected
  useEffect(() => {
    if (!selectedPlanId && testCycles && testCycles.length > 0) {
      setSelectedPlanId(testCycles[0].id);
    }
  }, [testCycles, selectedPlanId]);

  // Subscribe to cycle test cases
  useEffect(() => {
    if (selectedPlanId) {
      const unsubscribe = subscribeToTestCycleTestCases(selectedPlanId);
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [selectedPlanId, subscribeToTestCycleTestCases]);

  const selectedPlan = useMemo(() => {
    return testCycles.find(p => p.id === selectedPlanId) || null;
  }, [testCycles, selectedPlanId]);

  // Get test cases for current cycle
  const planTestCases = useMemo(() => {
    if (!selectedPlanId) return [];
    return testCycleTestCases[selectedPlanId] || [];
  }, [selectedPlanId, testCycleTestCases]);

  // Selected Test Case Object
  const selectedTC = useMemo(() => {
    if (!selectedTCId) return null;
    return planTestCases.find(tc => tc.id === selectedTCId) || null;
  }, [selectedTCId, planTestCases]);

  // Sync Form State when selected test case changes
  useEffect(() => {
    if (selectedTC) {
      setFormStatus(selectedTC.status || 'Not Run');
      setFormAssigneeId(selectedTC.assigneeId || 'unassigned');
      setFormExecutionDate(selectedTC.executionDate ? format(parseISO(selectedTC.executionDate), 'yyyy-MM-dd') : '');
      setFormActualEffort(
        selectedTC.actualEffortHours !== undefined && selectedTC.actualEffortHours !== null
          ? String(selectedTC.actualEffortHours)
          : ''
      );
      setFormDescription(selectedTC.description || '');
      setFormExpectedResult(selectedTC.expectedResult || '');
      let initialAttachments = (selectedTC.attachments || []).map(a => ({ name: a.name || '', url: a.url || '' }));
      if (initialAttachments.length === 0 && selectedTC.attachment) {
        initialAttachments = [{ name: 'Attachment', url: selectedTC.attachment }];
      }
      setFormAttachments(initialAttachments);
      setEditingExecAttachmentIndices({});
    } else {
      setFormStatus('Not Run');
      setFormAssigneeId('unassigned');
      setFormExecutionDate('');
      setFormActualEffort('');
      setFormDescription('');
      setFormExpectedResult('');
      setFormAttachments([]);
      setEditingExecAttachmentIndices({});
    }
  }, [selectedTC]);

  // Active employees for tester dropdown
  const activeEmployees = useMemo(() => {
    return [...employees]
      .filter(emp => !emp.isDeleted && emp.isEnabled !== false && !!emp.empId && emp.empId.trim() !== '')
      .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true }));
  }, [employees]);

  // Calculate plan date interval
  const planDays = useMemo(() => {
    if (!selectedPlan?.startDate || !selectedPlan?.endDate) return [];
    try {
      const start = parseISO(selectedPlan.startDate);
      const end = parseISO(selectedPlan.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];
      return eachDayOfInterval({ start, end });
    } catch {
      return [];
    }
  }, [selectedPlan]);

  // Filter test cases by tester, search, and status
  const filteredTestCases = useMemo(() => {
    return planTestCases.filter(tc => {
      // Tester filter
      if (selectedTesterId !== 'all') {
        if (selectedTesterId === 'unassigned') {
          if (tc.assigneeId && tc.assigneeId !== 'unassigned') return false;
        } else {
          if (tc.assigneeId !== selectedTesterId) return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && tc.status !== statusFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesId = tc.testCaseId && tc.testCaseId.toLowerCase().includes(q);
        const matchesTitle = tc.title && tc.title.toLowerCase().includes(q);
        if (!matchesId && !matchesTitle) return false;
      }

      return true;
    });
  }, [planTestCases, selectedTesterId, statusFilter, searchQuery]);

  // Group filtered test cases by date
  const groupedExecutionCases = useMemo(() => {
    const dayMap: Record<string, TestPlanTestCase[]> = {};
    const unscheduled: TestPlanTestCase[] = [];

    // Initialize all plan days
    planDays.forEach(day => {
      const key = format(day, 'yyyy-MM-dd');
      dayMap[key] = [];
    });

    filteredTestCases.forEach(tc => {
      if (!tc.executionDate) {
        unscheduled.push(tc);
        return;
      }

      try {
        const tcDate = parseISO(tc.executionDate);
        if (isNaN(tcDate.getTime())) {
          unscheduled.push(tc);
          return;
        }

        const matchedDay = planDays.find(d => isSameDay(d, tcDate));
        if (matchedDay) {
          const key = format(matchedDay, 'yyyy-MM-dd');
          dayMap[key].push(tc);
        } else {
          unscheduled.push(tc);
        }
      } catch {
        unscheduled.push(tc);
      }
    });

    return { dayMap, unscheduled };
  }, [filteredTestCases, planDays]);

  // Auto select first test case if none is selected
  useEffect(() => {
    if (!selectedTCId && filteredTestCases.length > 0) {
      setSelectedTCId(filteredTestCases[0].id);
    } else if (selectedTCId && !filteredTestCases.some(tc => tc.id === selectedTCId)) {
      if (filteredTestCases.length > 0) {
        setSelectedTCId(filteredTestCases[0].id);
      } else {
        setSelectedTCId(null);
      }
    }
  }, [filteredTestCases, selectedTCId]);

  // Collapsible toggle helper
  const toggleDay = (dayKey: string) => {
    setOpenDays(prev => ({
      ...prev,
      [dayKey]: prev[dayKey] === undefined ? false : !prev[dayKey],
    }));
  };

  const isAnyCollapsed = useMemo(() => {
    return planDays.some(day => openDays[format(day, 'yyyy-MM-dd')] === false);
  }, [planDays, openDays]);

  const toggleAllDays = (collapse: boolean) => {
    const next: Record<string, boolean> = {};
    planDays.forEach(day => {
      next[format(day, 'yyyy-MM-dd')] = !collapse;
    });
    next['unscheduled'] = !collapse;
    setOpenDays(next);
  };

  // Timer interval handling (stops when browser is closed or component unmounts)
  useEffect(() => {
    if (timerState === 'running') {
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timerState]);

  // Helper to format stopwatch time HH:MM:SS
  const formatTimeDisplay = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Timer Controls
  const handleStartTimer = (tcId: string) => {
    if (timerTCId !== tcId) {
      setTimerTCId(tcId);
      setElapsedSeconds(0);
    }
    setTimerState('running');
  };

  const handlePauseTimer = () => {
    setTimerState('paused');
  };

  const handleResumeTimer = () => {
    setTimerState('running');
  };

  const handleResetTimer = () => {
    setTimerState('idle');
    setElapsedSeconds(0);
  };

  const handleStopAndSaveTimer = async () => {
    const activeId = timerTCId || selectedTC?.id;
    if (!selectedPlanId || !activeId || elapsedSeconds === 0) {
      setTimerState('idle');
      return;
    }

    const targetTC = planTestCases.find(tc => tc.id === activeId);
    if (!targetTC) {
      setTimerState('idle');
      return;
    }

    // Convert seconds to decimal hours rounded to 2 decimals
    const sessionHours = Math.round((elapsedSeconds / 3600) * 100) / 100;
    const currentActual = targetTC.actualEffortHours || 0;
    const updatedTotal = Math.round((currentActual + sessionHours) * 100) / 100;

    setIsSaving(true);
    const success = await updateTestCycleTestCase(selectedPlanId, targetTC.id, {
      actualEffortHours: updatedTotal,
    });
    setIsSaving(false);

    if (success) {
      if (selectedTCId === targetTC.id) {
        setFormActualEffort(String(updatedTotal));
      }
      toast({
        title: 'Testing Effort Saved',
        description: `Logged +${sessionHours}h (${formatTimeDisplay(elapsedSeconds)}) to actual effort. Total: ${updatedTotal}h.`,
      });
      setTimerState('idle');
      setElapsedSeconds(0);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save elapsed time to test case.',
      });
    }
  };

  // Save manual edits from right column form
  const handleSaveDetails = async () => {
    if (!selectedPlanId || !selectedTC) return;

    // Validate attachment URLs
    const invalidAttachment = formAttachments.find(
      a => a.url && a.url.trim() !== '' && !isValidUrl(a.url)
    );
    if (invalidAttachment) {
      toast({
        variant: 'destructive',
        title: 'Invalid URL',
        description: `Attachment "${invalidAttachment.name || 'Untitled'}" has an invalid URL format. Please enter a valid URL (e.g. https://example.com or www.example.com).`,
      });
      return;
    }

    setIsSaving(true);
    const parsedActual = formActualEffort.trim() !== '' ? parseFloat(formActualEffort) : undefined;

    const cleanedAttachments = formAttachments
      .map(a => ({ name: (a.name || '').trim(), url: a.url && a.url.trim() !== '' ? formatUrl(a.url) : '' }))
      .filter(a => a.name !== '' || a.url !== '');

    const payload: Partial<TestCycleTestCase> = {
      status: formStatus,
      assigneeId: formAssigneeId === 'unassigned' ? undefined : formAssigneeId,
      executionDate: formExecutionDate ? new Date(formExecutionDate).toISOString() : undefined,
      actualEffortHours: parsedActual !== undefined && !isNaN(parsedActual) ? parsedActual : undefined,
      description: formDescription,
      expectedResult: formExpectedResult,
      attachments: cleanedAttachments,
    };

    const success = await updateTestCycleTestCase(selectedPlanId, selectedTC.id, payload);
    setIsSaving(false);

    if (success) {
      toast({
        title: 'Test Case Updated',
        description: `Instance details for ${selectedTC.testCaseId} saved successfully.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not update test case details.',
      });
    }
  };

  // Summary Metrics for top bar
  const metrics = useMemo(() => {
    const passed = filteredTestCases.filter(tc => tc.status === 'Passed').length;
    const failed = filteredTestCases.filter(tc => tc.status === 'Failed').length;
    const notRun = filteredTestCases.filter(tc => tc.status === 'Not Run').length;
    const totalPlannedEffort = filteredTestCases.reduce((acc, tc) => acc + (tc.effortHours || 0), 0);
    const totalActualEffort = filteredTestCases.reduce((acc, tc) => acc + (tc.actualEffortHours || 0), 0);
    return {
      passed,
      failed,
      notRun,
      totalPlannedEffort: Math.round(totalPlannedEffort * 10) / 10,
      totalActualEffort: Math.round(totalActualEffort * 10) / 10,
    };
  }, [filteredTestCases]);

  const isTimerForSelected = selectedTC && timerTCId === selectedTC.id && timerState !== 'idle';

  return (
    <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6">
      {/* Top Header & Selectors */}
      <PageHeader
        title="Test Executions"
        description="Execute manual test cases and track testing effort in real time."
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* Test Cycle Dropdown */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Test Cycle:</Label>
            <Select onValueChange={setSelectedPlanId} value={selectedPlanId || ''}>
              <SelectTrigger className="w-[240px] h-9 text-xs">
                <SelectValue placeholder="Select a Test Cycle" />
              </SelectTrigger>
              <SelectContent>
                {testPlans?.map(plan => (
                  <SelectItem key={plan.id} value={plan.id}>
                    <span className="font-medium">{plan.name}</span>
                    <span className="ml-1 text-muted-foreground text-[11px]">({plan.testPlanId})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tester Dropdown */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Tester:</Label>
            <Select onValueChange={setSelectedTesterId} value={selectedTesterId}>
              <SelectTrigger className="w-[200px] h-9 text-xs">
                <SelectValue placeholder="All Testers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Testers</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {activeEmployees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.empId.trim()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PageHeader>

      {/* Metrics Row */}
      {selectedPlan && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 shrink-0">
          <Card className="p-3 bg-green-500/10 border-green-500/20 shadow-none">
            <div className="text-[11px] font-semibold text-green-700 dark:text-green-300 uppercase">Passed</div>
            <div className="text-xl font-bold text-green-700 dark:text-green-300 mt-0.5">{metrics.passed}</div>
          </Card>
          <Card className="p-3 bg-red-500/10 border-red-500/20 shadow-none">
            <div className="text-[11px] font-semibold text-red-700 dark:text-red-300 uppercase">Failed</div>
            <div className="text-xl font-bold text-red-700 dark:text-red-300 mt-0.5">{metrics.failed}</div>
          </Card>
          <Card className="p-3 bg-slate-500/10 border-slate-500/20 shadow-none">
            <div className="text-[11px] font-semibold text-muted-foreground uppercase">Not Run</div>
            <div className="text-xl font-bold mt-0.5">{metrics.notRun}</div>
          </Card>
          <Card className="p-3 bg-blue-500/10 border-blue-500/20 shadow-none">
            <div className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 uppercase">Planned Effort</div>
            <div className="text-xl font-bold text-blue-700 dark:text-blue-300 mt-0.5">{metrics.totalPlannedEffort} hrs</div>
          </Card>
          <Card className="p-3 bg-primary/10 border-primary/20 shadow-none">
            <div className="text-[11px] font-semibold text-primary uppercase">Actual Effort</div>
            <div className="text-xl font-bold text-primary mt-0.5">{metrics.totalActualEffort} hrs</div>
          </Card>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* Left Column (5 cols): Test Cases Grouped by Date */}
        <div className="lg:col-span-5 bg-muted/50 rounded-lg p-4 h-full flex flex-col min-h-0 space-y-3">
          {/* Header & Quick Controls */}
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base whitespace-nowrap">Test Cases</h3>
              <Badge variant="secondary" className="text-xs font-normal">
                {filteredTestCases.length} total
              </Badge>
            </div>
            {planDays.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleAllDays(isAnyCollapsed)}
                className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
              >
                {isAnyCollapsed ? 'Expand All' : 'Collapse All'}
              </Button>
            )}
          </div>

          {/* Filters: Search & Status */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search ID or Title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs bg-background"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-8 text-xs bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {testCaseStatuses.map(st => (
                  <SelectItem key={st} value={st}>
                    {st}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Collapsible List Container */}
          <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-0">
            {!selectedPlan ? (
              <div className="border rounded-lg p-6 text-center text-muted-foreground text-xs bg-background/50">
                Please select a Test Cycle from the dropdown above.
              </div>
            ) : filteredTestCases.length === 0 ? (
              <div className="border rounded-lg p-8 text-center text-muted-foreground text-xs bg-background/50">
                No test cases match the selected filters.
              </div>
            ) : (
              <>
                {/* Plan Days Groups */}
                {planDays.map((day, idx) => {
                  const dayKey = format(day, 'yyyy-MM-dd');
                  const dayTCs = groupedExecutionCases.dayMap[dayKey] || [];
                  const isOpen = openDays[dayKey] !== false;

                  if (dayTCs.length === 0 && (searchQuery || statusFilter !== 'all' || selectedTesterId !== 'all')) {
                    return null;
                  }

                  return (
                    <div key={dayKey} className="border rounded-lg overflow-hidden bg-card/60 shadow-sm">
                      {/* Collapsible Day Bar */}
                      <div
                        className="px-3 py-2 bg-muted/40 hover:bg-muted/60 transition-colors flex items-center justify-between cursor-pointer select-none border-b border-border/50"
                        onClick={() => toggleDay(dayKey)}
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={cn(
                              'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                              !isOpen && '-rotate-90'
                            )}
                          />
                          <span className="font-semibold text-xs">
                            Day {idx + 1} — {format(day, 'EEE, MMM d')}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-[11px] px-1.5 py-0 font-normal">
                          {dayTCs.length}
                        </Badge>
                      </div>

                      {/* Day Test Cases List */}
                      {isOpen && (
                        <div className="divide-y divide-border/40">
                          {dayTCs.length === 0 ? (
                            <div className="p-3 text-center text-[11px] text-muted-foreground bg-background/30">
                              No test cases scheduled for this date.
                            </div>
                          ) : (
                            dayTCs.map(tc => {
                              const isSelected = tc.id === selectedTCId;
                              const isTimerActive = timerTCId === tc.id && timerState !== 'idle';
                              const displayTestCaseId = tc.testCaseId.startsWith(selectedPlan.testPlanId)
                                ? tc.testCaseId
                                : `${selectedPlan.testPlanId}-${tc.testCaseId}`;

                              return (
                                <div
                                  key={tc.id}
                                  onClick={() => setSelectedTCId(tc.id)}
                                  className={cn(
                                    'p-3 cursor-pointer transition-all hover:bg-muted/60 flex flex-col gap-1.5',
                                    isSelected && 'bg-primary/10 border-l-4 border-l-primary hover:bg-primary/15'
                                  )}
                                >
                                  {/* Row Header */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="font-mono text-xs font-medium whitespace-nowrap">
                                        {displayTestCaseId}
                                      </Badge>
                                      {isTimerActive && (
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            'text-[10px] px-1.5 py-0 gap-1 animate-pulse border font-mono',
                                            timerState === 'running'
                                              ? 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500'
                                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500'
                                          )}
                                        >
                                          <Timer className="h-3 w-3" />
                                          {formatTimeDisplay(elapsedSeconds)}
                                        </Badge>
                                      )}
                                    </div>
                                    <Badge className={cn('text-[11px] px-1.5 py-0 whitespace-nowrap border', statusStyles[tc.status])}>
                                      {tc.status}
                                    </Badge>
                                  </div>

                                  {/* Title */}
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="text-xs font-medium text-foreground truncate" title={tc.title}>
                                      {tc.title}
                                    </div>
                                    {((tc.attachments && tc.attachments.length > 0) || !!tc.attachment) && (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded" title={`${(tc.attachments?.length || 1)} attachment(s)`}>
                                        <Paperclip className="h-2.5 w-2.5" />
                                        {tc.attachments && tc.attachments.length > 1 ? tc.attachments.length : ''}
                                      </span>
                                    )}
                                  </div>

                                  {/* Meta */}
                                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <User className="h-3 w-3 shrink-0" />
                                      <span className="truncate">
                                        {tc.assigneeId
                                          ? (() => {
                                              const emp = employees.find(e => e.id === tc.assigneeId);
                                              return emp ? `${emp.firstName} ${emp.lastName}` : 'Unassigned';
                                            })()
                                          : 'Unassigned'}
                                      </span>
                                    </div>

                                    {tc.actualEffortHours !== undefined && (
                                      <span className="font-medium text-foreground">
                                        {tc.actualEffortHours}h actual
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Unscheduled Group */}
                {groupedExecutionCases.unscheduled.length > 0 && (
                  <div className="border rounded-lg overflow-hidden bg-card/60 shadow-sm">
                    <div
                      className="px-3 py-2 bg-muted/40 hover:bg-muted/60 transition-colors flex items-center justify-between cursor-pointer select-none border-b border-border/50"
                      onClick={() => toggleDay('unscheduled')}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          className={cn(
                            'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                            openDays['unscheduled'] === false && '-rotate-90'
                          )}
                        />
                        <span className="font-semibold text-xs">Unscheduled / Other</span>
                      </div>
                      <Badge variant="secondary" className="text-[11px] px-1.5 py-0 font-normal">
                        {groupedExecutionCases.unscheduled.length}
                      </Badge>
                    </div>

                    {openDays['unscheduled'] !== false && (
                      <div className="divide-y divide-border/40">
                        {groupedExecutionCases.unscheduled.map(tc => {
                          const isSelected = tc.id === selectedTCId;
                          const isTimerActive = timerTCId === tc.id && timerState !== 'idle';
                          const displayTestCaseId = tc.testCaseId.startsWith(selectedPlan.testPlanId)
                            ? tc.testCaseId
                            : `${selectedPlan.testPlanId}-${tc.testCaseId}`;

                          return (
                            <div
                              key={tc.id}
                              onClick={() => setSelectedTCId(tc.id)}
                              className={cn(
                                'p-3 cursor-pointer transition-all hover:bg-muted/60 flex flex-col gap-1.5',
                                isSelected && 'bg-primary/10 border-l-4 border-l-primary hover:bg-primary/15'
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="font-mono text-xs font-medium whitespace-nowrap">
                                    {displayTestCaseId}
                                  </Badge>
                                  {isTimerActive && (
                                    <Badge
                                      variant="outline"
                                      className={cn(
                                        'text-[10px] px-1.5 py-0 gap-1 animate-pulse border font-mono',
                                        timerState === 'running'
                                          ? 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500'
                                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500'
                                      )}
                                    >
                                      <Timer className="h-3 w-3" />
                                      {formatTimeDisplay(elapsedSeconds)}
                                    </Badge>
                                  )}
                                </div>
                                <Badge className={cn('text-[11px] px-1.5 py-0 whitespace-nowrap border', statusStyles[tc.status])}>
                                  {tc.status}
                                </Badge>
                              </div>

                              {/* Title */}
                              <div className="flex items-center justify-between gap-1.5">
                                <div className="text-xs font-medium text-foreground truncate" title={tc.title}>
                                  {tc.title}
                                </div>
                                {((tc.attachments && tc.attachments.length > 0) || !!tc.attachment) && (
                                  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded" title={`${(tc.attachments?.length || 1)} attachment(s)`}>
                                    <Paperclip className="h-2.5 w-2.5" />
                                    {tc.attachments && tc.attachments.length > 1 ? tc.attachments.length : ''}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                                <div className="flex items-center gap-1.5 truncate">
                                  <User className="h-3 w-3 shrink-0" />
                                  <span className="truncate">
                                    {tc.assigneeId
                                      ? (() => {
                                          const emp = employees.find(e => e.id === tc.assigneeId);
                                          return emp ? `${emp.firstName} ${emp.lastName}` : 'Unassigned';
                                        })()
                                      : 'Unassigned'}
                                  </span>
                                </div>

                                {tc.actualEffortHours !== undefined && (
                                  <span className="font-medium text-foreground">
                                    {tc.actualEffortHours}h actual
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column (7 cols): Selected TC Instance Details & Live Stopwatch */}
        <div className="lg:col-span-7 bg-muted/50 rounded-lg p-5 h-full flex flex-col min-h-0 space-y-4 overflow-y-auto">
          {!selectedTC ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground border rounded-lg bg-card/40">
              <CheckSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <h4 className="font-semibold text-base">No Test Case Selected</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Select a test case from the list on the left to view details and use the manual testing timer.
              </p>
            </div>
          ) : (
            <>
              {/* Header Info & Timer Action Banner */}
              <div className="p-4 rounded-lg border bg-card shadow-sm flex flex-col gap-3 shrink-0">
                {/* Top Row: Meta Badges + Save Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="font-mono text-xs font-semibold px-2 py-0.5">
                      {selectedTC.testCaseId.startsWith(selectedPlan?.testPlanId || '')
                        ? selectedTC.testCaseId
                        : `${selectedPlan?.testPlanId || 'TP'}-${selectedTC.testCaseId}`}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-mono text-muted-foreground">
                      Ref: {testCases.find(t => t.id === selectedTC.originalTestCaseId)?.testCaseId || 'Original TC'}
                    </Badge>
                    <Badge variant="outline" className="text-xs bg-muted">
                      {selectedPlan?.name}
                    </Badge>
                  </div>

                  <Button
                    onClick={handleSaveDetails}
                    disabled={isSaving}
                    size="sm"
                    className="gap-1.5 h-8 text-xs font-semibold shadow-sm self-start sm:self-auto"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>

                {/* Title */}
                <h3 className="font-bold text-base text-foreground leading-snug">
                  {selectedTC.title}
                </h3>

                {/* Timer Control Bar (Start / Pause / Resume / Stop & Save Effort) */}
                <div className="mt-1 pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/30 p-3 rounded-md">
                  {/* Digital Display & Status */}
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-full shrink-0",
                      isTimerForSelected && timerState === 'running'
                        ? "bg-green-500/20 text-green-600 dark:text-green-400 animate-pulse"
                        : isTimerForSelected && timerState === 'paused'
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                        : "bg-primary/10 text-primary"
                    )}>
                      <Timer className="h-5 w-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                          Testing Timer:
                        </span>
                        {isTimerForSelected && timerState === 'running' && (
                          <Badge variant="secondary" className="text-[10px] bg-green-500/20 text-green-700 dark:text-green-300 font-semibold px-1.5 py-0 animate-pulse">
                            ● Running
                          </Badge>
                        )}
                        {isTimerForSelected && timerState === 'paused' && (
                          <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-semibold px-1.5 py-0">
                            Paused
                          </Badge>
                        )}
                        {(!isTimerForSelected || timerState === 'idle') && (
                          <span className="text-[11px] text-muted-foreground">Ready to start</span>
                        )}
                      </div>
                      <div className="font-mono text-2xl font-bold tracking-wider text-foreground">
                        {isTimerForSelected ? formatTimeDisplay(elapsedSeconds) : '00:00:00'}
                      </div>
                    </div>
                  </div>

                  {/* Buttons: Start / Pause / Resume / Stop / Reset */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {isTimerForSelected && timerState === 'running' ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handlePauseTimer}
                          className="gap-1.5 text-xs h-8 font-medium border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                        >
                          <Pause className="h-3.5 w-3.5" />
                          Pause
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={handleStopAndSaveTimer}
                          disabled={isSaving}
                          className="gap-1.5 text-xs h-8 font-semibold shadow-sm"
                        >
                          <Square className="h-3.5 w-3.5 fill-current" />
                          Stop & Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={handleResetTimer}
                          className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
                          title="Reset Timer without saving"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : isTimerForSelected && timerState === 'paused' ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResumeTimer}
                          className="gap-1.5 text-xs h-8 font-semibold border-green-500/50 text-green-700 dark:text-green-400 hover:bg-green-500/10"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          Resume
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={handleStopAndSaveTimer}
                          disabled={isSaving}
                          className="gap-1.5 text-xs h-8 font-semibold shadow-sm"
                        >
                          <Square className="h-3.5 w-3.5 fill-current" />
                          Stop & Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={handleResetTimer}
                          className="text-xs h-8 px-2 text-muted-foreground hover:text-foreground"
                          title="Reset Timer without saving"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleStartTimer(selectedTC.id)}
                        className="gap-1.5 text-xs h-8 px-3 font-semibold bg-green-600 hover:bg-green-700 text-white shadow-sm"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Start Timer
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Execution Controls Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-card/60">
                {/* Status Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Execution Status</Label>
                  <Select value={formStatus} onValueChange={(v: TestCaseStatus) => setFormStatus(v)}>
                    <SelectTrigger className={cn("h-9 font-medium text-xs border", statusStyles[formStatus])}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {testCaseStatuses.map(status => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignee Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Assignee / Tester</Label>
                  <Select value={formAssigneeId} onValueChange={setFormAssigneeId}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Assign a tester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {activeEmployees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.empId.trim()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Actual Effort Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">Actual Effort (Hours)</Label>
                    <span className="text-[11px] text-muted-foreground">
                      Planned: {selectedTC.effortHours !== undefined ? `${selectedTC.effortHours}h` : '—'}
                    </span>
                  </div>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={formActualEffort}
                    onChange={e => {
                      const val = e.target.value;
                      if (/^(0|[1-9]\d*)?(\.\d{0,2})?$/.test(val)) {
                        setFormActualEffort(val);
                      }
                    }}
                    className="h-9 text-xs font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Auto-accumulates from the stopwatch or edited directly
                  </p>
                </div>

                {/* Execution Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Execution Date</Label>
                  <Input
                    type="date"
                    value={formExecutionDate}
                    onChange={e => setFormExecutionDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Target or actual execution day
                  </p>
                </div>
              </div>

              {/* Related Story & Scope Reference */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg border bg-card/40 text-xs">
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Related Story
                  </Label>
                  <div className="mt-1 font-medium text-foreground truncate">
                    {selectedTC.storyId
                      ? (() => {
                          const story = stories.find(s => s.id === selectedTC.storyId);
                          return story ? `[${story.storyId}] ${story.title}` : 'N/A';
                        })()
                      : 'N/A (General Backlog)'}
                  </div>
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Test Case Type
                  </Label>
                  <div className="mt-1 font-medium text-foreground">
                    <Badge variant="outline">{selectedTC.type || 'Functional'}</Badge>
                  </div>
                </div>
              </div>

              {/* Steps / Description */}
              <div className="space-y-1.5 p-4 rounded-lg border bg-card/60">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Description / Execution Steps
                </Label>
                <Textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={4}
                  className="text-xs resize-y bg-background"
                  placeholder="Steps to reproduce / execute test case..."
                />
              </div>

              {/* Expected Result */}
              <div className="space-y-1.5 p-4 rounded-lg border bg-card/60">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Expected Result
                </Label>
                <Textarea
                  value={formExpectedResult}
                  onChange={e => setFormExpectedResult(e.target.value)}
                  rows={3}
                  className="text-xs resize-y bg-background"
                  placeholder="Expected behavior / acceptance criteria..."
                />
              </div>

              {/* Attachments Section */}
              <div className="space-y-3 p-4 rounded-lg border bg-card/60">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Attachments
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Add document links, test evidence, or specifications URLs.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs gap-1.5 border-dashed"
                    onClick={() => {
                      const nextIndex = formAttachments.length;
                      setFormAttachments(prev => [...prev, { name: '', url: '' }]);
                      setEditingExecAttachmentIndices(prev => ({ ...prev, [nextIndex]: true }));
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Attachment
                  </Button>
                </div>

                {formAttachments.length === 0 ? (
                  <div className="text-center py-4 border border-dashed rounded-md bg-muted/20 text-xs text-muted-foreground">
                    No attachments added yet. Click &quot;Add Attachment&quot; to link documents or test evidence.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formAttachments.map((att, index) => {
                      const isEditing = !!editingExecAttachmentIndices[index];

                      const handleRemoveAttachment = () => {
                        setFormAttachments(prev => prev.filter((_, i) => i !== index));
                        setEditingExecAttachmentIndices(prev => {
                          const next: Record<number, boolean> = {};
                          let newIdx = 0;
                          for (let i = 0; i < formAttachments.length; i++) {
                            if (i !== index) {
                              if (prev[i] !== undefined) {
                                next[newIdx] = prev[i];
                              }
                              newIdx++;
                            }
                          }
                          return next;
                        });
                      };

                      if (!isEditing) {
                        return (
                          <div key={index} className="p-3 rounded-md border bg-background/80 flex items-center justify-between gap-3 shadow-xs">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 min-w-0 flex-1">
                              <div className="min-w-[120px] max-w-[200px] truncate">
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Document Name</span>
                                <span className="text-xs font-medium text-foreground truncate block" title={att.name || 'Untitled Document'}>
                                  {att.name || 'Untitled Document'}
                                </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Location</span>
                                {att.url ? (
                                  <a
                                    href={att.url.startsWith('http://') || att.url.startsWith('https://') ? att.url : `https://${att.url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline inline-flex items-center gap-1.5 text-xs font-medium truncate max-w-full"
                                  >
                                    <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                                    <span>View Document</span>
                                  </a>
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">No URL provided</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => setEditingExecAttachmentIndices(prev => ({ ...prev, [index]: true }))}
                                title="Edit attachment"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={handleRemoveAttachment}
                                title="Remove attachment"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={index} className="p-3 rounded-md border bg-background/80 space-y-3 relative group">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                              Attachment #{index + 1}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                className="h-7 text-xs px-2.5 gap-1 font-medium bg-primary/10 hover:bg-primary/20 text-primary"
                                onClick={() => {
                                  if (att.url && att.url.trim() !== '' && !isValidUrl(att.url)) {
                                    toast({
                                      variant: 'destructive',
                                      title: 'Invalid URL',
                                      description: 'Please enter a valid URL (e.g. https://example.com or www.example.com)',
                                    });
                                    return;
                                  }
                                  setEditingExecAttachmentIndices(prev => ({ ...prev, [index]: false }));
                                }}
                              >
                                <Check className="h-3.5 w-3.5" />
                                Done
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={handleRemoveAttachment}
                                title="Remove attachment"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground font-medium">Document Name</Label>
                              <Input
                                placeholder="e.g. SOW, Test Evidence Screenshot"
                                value={att.name || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setFormAttachments(prev => {
                                    const next = [...prev];
                                    next[index] = { ...next[index], name: val };
                                    return next;
                                  });
                                }}
                                className="h-8 text-xs bg-background"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[11px] text-muted-foreground font-medium">Location (URL)</Label>
                              <Input
                                placeholder="https://example.com/your-document-link"
                                value={att.url || ''}
                                onChange={e => {
                                  const val = e.target.value;
                                  setFormAttachments(prev => {
                                    const next = [...prev];
                                    next[index] = { ...next[index], url: val };
                                    return next;
                                  });
                                }}
                                className={cn("h-8 text-xs bg-background font-mono", att.url && !isValidUrl(att.url) && "border-destructive focus-visible:ring-destructive")}
                              />
                              {att.url && !isValidUrl(att.url) && (
                                <p className="text-[10px] text-destructive">Invalid URL format (e.g. https://example.com or www.example.com)</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
