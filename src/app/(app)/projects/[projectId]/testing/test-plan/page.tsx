
'use client';

import { useMemo } from 'react';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { TestCase, TestCaseStatus } from '@/types';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const statusStyles: Record<TestCaseStatus, string> = {
  'Passed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Failed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Blocked': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Skipped': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Not Run': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function TestPlanPage() {
  const { testCases, employees, releasesAndMilestones, stories } = useProject();
  const releases = releasesAndMilestones.filter(r => r.itemType === 'Release');

  const groupedByRelease = useMemo(() => {
    const groups: Record<string, TestCase[]> = {
      unassigned: [],
    };

    releases.forEach(r => {
      groups[r.id] = [];
    });

    testCases.forEach(tc => {
      if (tc.releaseId && groups[tc.releaseId]) {
        groups[tc.releaseId].push(tc);
      } else {
        groups.unassigned.push(tc);
      }
    });

    return groups;
  }, [testCases, releases]);
  
  const releaseOrder = useMemo(() => {
    const orderedIds = releases.sort((a,b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime()).map(r => r.id);
    if(groupedByRelease.unassigned.length > 0) {
        orderedIds.push('unassigned');
    }
    return orderedIds;
  }, [releases, groupedByRelease.unassigned]);


  const TestCaseTable = ({ cases }: { cases: TestCase[] }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID</TableHead>
          <TableHead className="w-2/5">Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>Story</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {cases.map(tc => {
          const assignee = employees.find(e => e.id === tc.assigneeId);
          const story = stories.find(s => s.id === tc.storyId);
          return (
            <TableRow key={tc.id}>
              <TableCell className="font-medium">{tc.testCaseId}</TableCell>
              <TableCell>{tc.title}</TableCell>
              <TableCell>
                <Badge className={cn('font-semibold', statusStyles[tc.status])}>
                  {tc.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{tc.type}</Badge>
              </TableCell>
              <TableCell>
                {assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={assignee.avatar} alt={assignee.firstName} data-ai-hint="tester avatar" />
                      <AvatarFallback>{assignee.firstName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {assignee.firstName}
                  </div>
                ) : 'Unassigned'}
              </TableCell>
              <TableCell>
                {story ? (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge variant="secondary">{story.storyId}</Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{story.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : 'N/A'}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <PageHeader
        title="Test Plan"
        description="View test cases organized by release."
      />
      <Accordion type="multiple" defaultValue={releaseOrder} className="w-full space-y-4">
        {releaseOrder.map(releaseId => {
          const release = releases.find(r => r.id === releaseId);
          const cases = groupedByRelease[releaseId];

          if (cases.length === 0) return null;

          const title = release ? `(${release.releaseId}) ${release.name}` : 'Unassigned';

          return (
            <AccordionItem value={releaseId} key={releaseId} className="border-b-0 rounded-lg bg-card shadow-sm">
              <AccordionTrigger className="px-6 py-4">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-lg">{title}</span>
                  <Badge variant="secondary">{cases.length} test cases</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-0">
                <div className="border-t">
                  <TestCaseTable cases={cases} />
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
