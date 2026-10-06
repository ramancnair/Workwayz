'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useProject } from '@/context/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { generateSubtasksAndTestCasesAction } from '@/app/actions';
import { formatWorkItemType } from '@/types';
import { cn } from '@/lib/utils';

interface AiSubtaskTestCaseButtonProps {
  storyId?: string;
  itemType: string;
  title?: string;
  description?: string;
  acceptanceCriteria?: string;
  impactedSystemIds?: string[];
  sprintId?: string;
  releaseId?: string;
  onPreSaveStory?: () => Promise<string | null>;
  onSuccess?: (counts: { subTasksCount: number; testCasesCount: number; targetStoryId: string }) => void;
  className?: string;
}

export function AiSubtaskTestCaseButton({
  storyId,
  itemType,
  title,
  description,
  acceptanceCriteria,
  impactedSystemIds = [],
  sprintId,
  releaseId,
  onPreSaveStory,
  onSuccess,
  className,
}: AiSubtaskTestCaseButtonProps) {
  const { impactedSystems, addStory, addTestCase, updateStory } = useProject();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  // Feature is strictly for Story (and legacy Story aliases) and Feature Change
  const isEligible = [
    'Story',
    'User Story',
    'Requirement/Story',
    'Feature Change',
  ].includes(itemType);

  if (!isEligible) {
    return null;
  }

  const hasDescription = Boolean(description && description.trim().length > 0);
  const selectedSystems = impactedSystems.filter((s) =>
    impactedSystemIds.includes(s.id)
  );
  const hasImpactedSystems = selectedSystems.length > 0;
  const canGenerate = hasDescription && hasImpactedSystems;

  const tooltipText = !canGenerate
    ? !hasDescription && !hasImpactedSystems
      ? 'Add a description and select at least one impacted system to generate sub-tasks and test cases.'
      : !hasDescription
      ? 'Add a description to generate sub-tasks and test cases.'
      : 'Select at least one impacted system to generate sub-tasks and test cases.'
    : 'Generates sub tasks and test cases for this story';

  const handleGenerate = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!canGenerate || isGenerating) return;

    setIsGenerating(true);
    try {
      let targetStoryId = storyId;

      // If story is not saved yet (e.g. in Add Story dialog), save it first
      if (!targetStoryId && onPreSaveStory) {
        const createdId = await onPreSaveStory();
        if (!createdId) {
          setIsGenerating(false);
          return;
        }
        targetStoryId = createdId;
      }

      if (!targetStoryId) {
        toast({
          variant: 'destructive',
          title: 'Save Required',
          description: 'Please save the item first or provide a title to generate subtasks and test cases.',
        });
        setIsGenerating(false);
        return;
      }

      // If updating an existing story, persist the description & impacted systems to ensure database sync
      if (storyId && updateStory) {
        try {
          await updateStory(storyId, {
            description: (description || '').trim(),
            acceptanceCriteria: (acceptanceCriteria || '').trim(),
            impactedSystemIds: impactedSystemIds || [],
          });
        } catch (updateErr) {
          console.warn('Failed to pre-sync story updates:', updateErr);
        }
      }

      const res = await generateSubtasksAndTestCasesAction({
        storyTitle: (title || 'Story Item').trim(),
        storyDescription: (description || '').trim(),
        acceptanceCriteria: acceptanceCriteria?.trim(),
        itemType: formatWorkItemType(itemType),
        impactedSystems: selectedSystems.map((s) => ({
          id: s.id,
          name: s.name,
        })),
      });

      if ('error' in res) {
        toast({
          variant: 'destructive',
          title: 'AI Generation Failed',
          description: res.error,
        });
        setIsGenerating(false);
        return;
      }

      const { subTasks, testCases } = res;

      // 1. Add all generated subtasks linked to the parent story
      for (const task of subTasks) {
        const resolvedSystemId = selectedSystems.find((s) => s.id === task.impactedSystemId)?.id
          || selectedSystems.find((s) => s.name.toLowerCase() === (task.impactedSystemId || '').toLowerCase())?.id
          || selectedSystems[0]?.id;

        await addStory(
          {
            title: task.title,
            description: task.description || '',
            itemType: 'Sub Task',
            status: 'To Do',
            parentStoryId: targetStoryId,
            estimatedHours: task.estimatedHours || 2,
            impactedSystemId: resolvedSystemId,
            sprintId: sprintId && sprintId !== 'backlog' ? sprintId : (null as any),
            releaseId: releaseId && releaseId !== 'unassigned' ? releaseId : undefined,
          },
          'SUB'
        );
      }

      // 2. Add all generated test cases linked to the story
      for (const tc of testCases) {
        await addTestCase({
          title: tc.title,
          type: tc.type,
          description: tc.description,
          expectedResult: tc.expectedResult,
          storyId: targetStoryId,
          sprintId: sprintId && sprintId !== 'backlog' ? sprintId : undefined,
          releaseId: releaseId && releaseId !== 'unassigned' ? releaseId : undefined,
        });
      }

      toast({
        title: 'Subtasks & Test Cases Generated',
        description: `Successfully generated ${subTasks.length} subtask${
          subTasks.length > 1 ? 's' : ''
        } and ${testCases.length} test case${
          testCases.length > 1 ? 's' : ''
        }. You can inspect them in the tabs above.`,
      });

      onSuccess?.({
        subTasksCount: subTasks.length,
        testCasesCount: testCases.length,
        targetStoryId,
      });
    } catch (e: any) {
      console.error('Error generating subtasks and test cases:', e);
      toast({
        variant: 'destructive',
        title: 'Generation Error',
        description: e.message || 'Failed to auto-generate subtasks and test cases.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={cn('py-1', className)}>
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-block">
              <Button
                type="button"
                size="sm"
                variant="default"
                disabled={!canGenerate || isGenerating}
                onClick={handleGenerate}
                className={cn(
                  'h-8 px-3.5 text-xs font-semibold gap-1.5 shadow-sm transition-all',
                  !canGenerate && 'opacity-60 cursor-not-allowed hover:from-[#1d4ed8] hover:to-[#059669]'
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>AI sub-item gen</span>
                  </>
                )}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" align="start" className="max-w-xs text-xs">
            <p>{tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
