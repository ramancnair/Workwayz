
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { type TestCase, type TestCaseStatus, type TestCaseType } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

const testCaseFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  type: z.enum(['Functional', 'Non-functional']),
  description: z.string().min(1, 'Description is required.'),
  expectedResult: z.string().min(1, 'Expected result is required.'),
  status: z.enum(['Passed', 'Failed', 'Blocked', 'Not Run', 'Skipped']),
  assigneeId: z.string().optional(),
  storyId: z.string().optional(),
});

const statusStyles: Record<TestCaseStatus, string> = {
  'Passed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Failed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'Blocked': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Skipped': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Not Run': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

const testCaseStatuses: TestCaseStatus[] = ['Not Run', 'Passed', 'Failed', 'Blocked', 'Skipped'];
const testCaseTypes: TestCaseType[] = ['Functional', 'Non-functional'];


export default function TestCasesPage() {
  const { testCases, setTestCases, employees, stories } = useProject();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTestCase, setEditingTestCase] = useState<TestCase | null>(null);
  const [deletingTestCase, setDeletingTestCase] = useState<TestCase | null>(null);

  const testers = employees.filter(e => e.role === 'Tester');

  const form = useForm<z.infer<typeof testCaseFormSchema>>({
    resolver: zodResolver(testCaseFormSchema),
  });

  useEffect(() => {
    if (editingTestCase) {
      form.reset({
        ...editingTestCase,
        assigneeId: editingTestCase.assigneeId || 'unassigned',
        storyId: editingTestCase.storyId || 'unassigned',
      });
    } else {
      form.reset({
        title: '',
        type: 'Functional',
        description: '',
        expectedResult: '',
        status: 'Not Run',
        assigneeId: 'unassigned',
        storyId: 'unassigned',
      });
    }
  }, [editingTestCase, form]);

  const handleDialogOpen = (testCase: TestCase | null) => {
    setEditingTestCase(testCase);
    setIsDialogOpen(true);
  };
  
  const handleDelete = (testCaseId: string) => {
    setTestCases(testCases.filter((tc) => tc.id !== testCaseId));
    setDeletingTestCase(null);
  };

  const onSubmit = (values: z.infer<typeof testCaseFormSchema>) => {
    const testCaseData = {
        title: values.title,
        type: values.type,
        description: values.description,
        expectedResult: values.expectedResult,
        status: values.status,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        storyId: values.storyId === 'unassigned' ? undefined : values.storyId,
    };

    if (editingTestCase) {
      // Update existing test case
      setTestCases(
        testCases.map((tc) =>
          tc.id === editingTestCase.id ? { ...tc, ...testCaseData } : tc
        )
      );
    } else {
      // Add new test case
       const newIdNumber =
        testCases.length > 0
          ? Math.max(
              0,
              ...testCases
                .filter((s) => s.testCaseId && typeof s.testCaseId === 'string')
                .map((s) => parseInt(s.testCaseId.replace('TC-', ''), 10) || 0)
            ) + 1
          : 1;

      setTestCases([
        ...testCases,
        { id: crypto.randomUUID(), testCaseId: `TC-${newIdNumber}`, ...testCaseData },
      ]);
    }
    setIsDialogOpen(false);
    setEditingTestCase(null);
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Test Cases" description="Manage and track all test cases for the project.">
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Test Case
          </Button>
        </PageHeader>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Story</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testCases.map((tc) => {
                const assignee = employees.find(e => e.id === tc.assigneeId);
                const story = stories.find(s => s.id === tc.storyId);
                return (
                    <TableRow key={tc.id}>
                        <TableCell className="font-medium">{tc.testCaseId}</TableCell>
                        <TableCell>{tc.title}</TableCell>
                        <TableCell>{tc.type}</TableCell>
                        <TableCell>
                            <Badge className={cn('font-semibold', statusStyles[tc.status])}>
                                {tc.status}
                            </Badge>
                        </TableCell>
                        <TableCell>
                            {assignee ? (
                                <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage src={assignee.avatar} alt={`${assignee.firstName} ${assignee.lastName}`} data-ai-hint="tester avatar" />
                                    <AvatarFallback>{assignee.firstName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                {assignee.firstName}
                                </div>
                            ) : "Unassigned"}
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
                          ): 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(tc)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingTestCase(tc)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </TableCell>
                    </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingTestCase(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTestCase ? 'Edit Test Case' : 'Add New Test Case'}</DialogTitle>
            <DialogDescription>
              {editingTestCase ? 'Update the details for this test case.' : 'Fill in the details for the new test case.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl><Input placeholder="E.g., Verify user login with valid credentials" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Test Case Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                {testCaseTypes.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                                {testCaseStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                  )} />
              </div>
               <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Steps)</FormLabel>
                    <FormControl><Textarea placeholder="1. Navigate to login page..." {...field} rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
               <FormField control={form.control} name="expectedResult" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Result</FormLabel>
                    <FormControl><Textarea placeholder="User should be successfully logged in and redirected to the dashboard." {...field} rows={3} /></FormControl>
                    <FormMessage />
                  </FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="assigneeId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Assign to a tester" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="unassigned">Unassigned</SelectItem>
                                {testers.map(tester => <SelectItem key={tester.id} value={tester.id}>{tester.firstName} {tester.lastName}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                  )} />
                   <FormField control={form.control} name="storyId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Related Story (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Link to a story" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="unassigned">None</SelectItem>
                                {stories.map(story => <SelectItem key={story.id} value={story.id}>[{story.storyId}] {story.title}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                  )} />
              </div>
              <DialogFooter>
                <Button type="submit">{editingTestCase ? 'Save Changes' : 'Create Test Case'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingTestCase} onOpenChange={(isOpen) => !isOpen && setDeletingTestCase(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the test case "{deletingTestCase?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deletingTestCase && handleDelete(deletingTestCase.id)}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
