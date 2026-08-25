'use client';

import React from 'react';
import Link from 'next/link';
import {
  Bug,
  BookOpen,
  CheckSquare,
  GitCommit,
  Rocket,
  ShieldAlert,
  HelpCircle,
  AlertTriangle,
  Link as LinkIcon,
  FolderKanban,
  FileCheck,
  ArrowUpRight,
  Sparkles,
  Layers,
  Calendar,
  DollarSign,
  UserCheck,
  Clock,
  Server,
  GitBranch,
  CreditCard,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { HermesActionItem } from '@/ai/flows/hermes-agent';

interface HermesActionCardProps {
  action: HermesActionItem;
  onNavigate?: () => void;
}

export function HermesActionCard({ action, onNavigate }: HermesActionCardProps) {
  const getItemIcon = () => {
    const itemType = action.itemType || action.raidType || action.toolName;
    switch (itemType) {
      case 'Bug':
        return <Bug className="w-4 h-4 text-red-500" />;
      case 'Requirement/Story':
        return <BookOpen className="w-4 h-4 text-blue-500" />;
      case 'Task':
      case 'Sub Task':
        return <CheckSquare className="w-4 h-4 text-emerald-500" />;
      case 'Feature Change':
        return <GitCommit className="w-4 h-4 text-amber-500" />;
      case 'createSprint':
      case 'updateSprint':
        return <Rocket className="w-4 h-4 text-purple-500" />;
      case 'createEpic':
      case 'assignStoryToSprint':
        return <Layers className="w-4 h-4 text-indigo-500" />;
      case 'createPortfolio':
        return <FolderKanban className="w-4 h-4 text-violet-500" />;
      case 'createProject':
        return <FolderKanban className="w-4 h-4 text-cyan-600" />;
      case 'createTestCase':
      case 'createTestPlan':
        return <FileCheck className="w-4 h-4 text-teal-500" />;
      case 'risk':
        return <ShieldAlert className="w-4 h-4 text-orange-500" />;
      case 'assumption':
        return <HelpCircle className="w-4 h-4 text-sky-500" />;
      case 'issue':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'updateProjectDetails':
      case 'updateProjectSummary':
      case 'updateProjectSpecifications':
        return <BookOpen className="w-4 h-4 text-indigo-500" />;
      case 'addImpactedSystem':
        return <Layers className="w-4 h-4 text-cyan-500" />;
      case 'addHorizontal':
        return <GitCommit className="w-4 h-4 text-purple-500" />;
      case 'createRelease':
        return <Calendar className="w-4 h-4 text-pink-500" />;
      case 'createPaymentMilestone':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'assignProjectResource':
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      case 'logWork':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'addEnvironment':
        return <Server className="w-4 h-4 text-slate-500" />;
      case 'addCodeRepository':
        return <GitBranch className="w-4 h-4 text-violet-600" />;
      case 'addFixedCost':
        return <CreditCard className="w-4 h-4 text-orange-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-primary" />;
    }
  };

  const getPriorityStyle = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300';
      case 'high':
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300';
      case 'medium':
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300';
      case 'low':
      case 'backburner':
        return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getActionTitle = () => {
    if (action.toolName === 'createWorkItem') {
      return `Created ${action.itemType || 'Work Item'}`;
    }
    if (action.toolName === 'updateWorkItem') {
      return `Updated ${action.itemType || 'Work Item'}`;
    }
    if (action.toolName === 'assignStoryToSprint') {
      return 'Assigned to Sprint';
    }
    if (action.toolName === 'createPortfolio') {
      return 'Created Portfolio';
    }
    if (action.toolName === 'createProject') {
      return 'Created Project';
    }
    if (action.toolName === 'updateProjectDetails' || action.toolName === 'updateProjectSummary') {
      return 'Updated Project Summary';
    }
    if (action.toolName === 'addImpactedSystem') {
      return 'Added Impacted System';
    }
    if (action.toolName === 'addHorizontal') {
      return 'Added Horizontal';
    }
    if (action.toolName === 'updateProjectSpecifications') {
      return 'Updated Specifications';
    }
    if (action.toolName === 'createSprint') {
      return 'Created Sprint';
    }
    if (action.toolName === 'updateSprint') {
      return 'Updated Sprint';
    }
    if (action.toolName === 'createEpic') {
      return 'Created Epic';
    }
    if (action.toolName === 'createTestCase') {
      return 'Created Test Case';
    }
    if (action.toolName === 'createTestPlan') {
      return 'Created Test Cycle';
    }
    if (action.toolName === 'createRaidItem') {
      return `Logged ${action.raidType?.toUpperCase() || 'RAID Item'}`;
    }
    if (action.toolName === 'updateRaidItem') {
      return `Updated ${action.raidType?.toUpperCase() || 'RAID Item'}`;
    }
    if (action.toolName === 'createRelease') {
      return `Created ${action.itemType || 'Release'}`;
    }
    if (action.toolName === 'createPaymentMilestone') {
      return 'Created Payment Milestone';
    }
    if (action.toolName === 'assignProjectResource') {
      return 'Assigned Resource';
    }
    if (action.toolName === 'logWork') {
      return 'Logged Timesheet Hours';
    }
    if (action.toolName === 'addEnvironment') {
      return 'Added Environment';
    }
    if (action.toolName === 'addCodeRepository') {
      return 'Linked Code Repository';
    }
    if (action.toolName === 'addFixedCost') {
      return 'Added Fixed Cost';
    }
    return 'Action Executed';
  };

  const displayId = action.storyId || action.itemId || action.testCaseId || action.id;
  const displayTitle = action.title || action.name || action.description;

  return (
    <div className="mt-2.5 p-3 rounded-lg border border-primary/20 bg-card/90 shadow-sm text-xs space-y-2.5 transition-all hover:border-primary/40">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold text-foreground">
          <div className="p-1 rounded-md bg-muted/80">{getItemIcon()}</div>
          <span>{getActionTitle()}</span>
        </div>
        {displayId && (
          <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
            {displayId}
          </span>
        )}
      </div>

      {displayTitle && (
        <div className="font-medium text-foreground line-clamp-2 text-xs">
          {displayTitle}
        </div>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-border/50 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {action.priority && (
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 h-4 border', getPriorityStyle(action.priority))}>
              {action.priority}
            </Badge>
          )}
          {action.severity && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300">
              Sev: {action.severity}
            </Badge>
          )}
          {action.status && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {action.status}
            </Badge>
          )}
        </div>

        {action.url && (
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px] font-medium text-primary hover:text-primary/90 hover:bg-primary/10"
            onClick={onNavigate}
          >
            <Link href={action.url} className="flex items-center gap-1">
              <span>View</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}

