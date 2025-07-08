'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { testCases as initialTestCases, stories, bugs as initialBugs } from '@/lib/mock-data';
import type { TestCase, TestCaseStatus, Bug } from '@/types';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { AiAssistantForm } from '@/components/AiAssistantForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProject } from '@/context/ProjectContext';

const statusStyles: Record<TestCaseStatus, string> = {
  'Pass': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Fail': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Not Run': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function TestCasesPage() {
  const [testCases] = useState<TestCase[]>(initialTestCases);
  const [bugs] = useState<Bug[]>(initialBugs);
  const [selectedTestCase, setSelectedTestCase] = useState<TestCase | null>(null);
  const { employees } = useProject();

  const getStoryTitle = (storyId: string) => {
    return stories.find(s => s.id === storyId)?.title || 'N/A';
  };
  
  const getBugsForTestCase = (testCaseId: string) => {
    return bugs.filter(b => b.testCaseId === testCaseId);
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Test Cases" description="Manage and track all test cases for the project." />
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Test Case
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>AI Assistant</DialogTitle>
              <DialogDescription>
                Get suggestions to improve your task or test case description.
              </DialogDescription>
            </DialogHeader>
            <AiAssistantForm projectContext="This is a project management application." />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
            <Card>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Story</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bugs</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {testCases.map((tc) => {
                      const assignee = employees.find(e => e.id === tc.assigneeId);
                      return (
                        <TableRow key={tc.id} onClick={() => setSelectedTestCase(tc)} className="cursor-pointer">
                            <TableCell className="font-medium">{tc.title}</TableCell>
                            <TableCell>{getStoryTitle(tc.storyId)}</TableCell>
                            <TableCell>
                              {assignee ? (
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={assignee.avatar} alt={`${assignee.firstName} ${assignee.lastName}`} data-ai-hint="tester avatar" />
                                        <AvatarFallback>{assignee.firstName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    {assignee.firstName} {assignee.lastName}
                                </div>
                              ) : "Unassigned"}
                            </TableCell>
                            <TableCell>
                            <Badge className={cn('font-semibold', statusStyles[tc.status])}>
                                {tc.status}
                            </Badge>
                            </TableCell>
                            <TableCell>
                                <Badge variant="destructive">{getBugsForTestCase(tc.id).length}</Badge>
                            </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
                </Table>
            </Card>
        </div>
        <div className="md:col-span-1">
          {selectedTestCase ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedTestCase.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{selectedTestCase.description}</p>
              </CardHeader>
              <CardContent>
                <h4 className="font-semibold mb-2">Linked Bugs</h4>
                {getBugsForTestCase(selectedTestCase.id).length > 0 ? (
                    <ul className="space-y-2">
                        {getBugsForTestCase(selectedTestCase.id).map(bug => (
                            <li key={bug.id} className="text-sm p-2 bg-muted/50 rounded-md">
                                <p className="font-semibold">{bug.title}</p>
                                <p className="text-xs text-muted-foreground">{bug.description}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">No bugs linked to this test case.</p>
                )}
              </CardContent>
            </Card>
          ) : (
             <Card className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Select a test case to see details</p>
             </Card>
          )}
        </div>
      </div>
    </div>
  );
}
