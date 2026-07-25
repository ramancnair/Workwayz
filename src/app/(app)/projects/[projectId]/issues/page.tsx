

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
  DialogTrigger,
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
import { PlusCircle, Edit, Trash2, Bot } from 'lucide-react';
import { type Issue, type IssuePriority, type IssueStatus } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';

const issueSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']),
  assigneeId: z.string().optional(),
  resolvedDate: z.string().optional(),
});


const priorities: IssuePriority[] = ['Low', 'Medium', 'High', 'Critical'];
const statuses: IssueStatus[] = ['Open', 'In Progress', 'Resolved', 'Closed'];

const priorityStyles: Record<IssuePriority, string> = {
  'Low': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  'Medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'High': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'Critical': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const statusStyles: Record<IssueStatus, string> = {
  'Open': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'In Progress': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Resolved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Closed': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};


export default function IssuesPage() {
  const { issues, employees: users, addIssue, updateIssue, deleteIssue } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [deletingIssue, setDeletingIssue] = useState<Issue | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const form = useForm<z.infer<typeof issueSchema>>({
    resolver: zodResolver(issueSchema),
  });


  useEffect(() => {
    if (isDialogOpen) {
      if (editingIssue) {
        form.reset({
          ...editingIssue,
          assigneeId: editingIssue.assigneeId || 'unassigned',
          resolvedDate: editingIssue.resolvedDate ? format(new Date(editingIssue.resolvedDate), 'yyyy-MM-dd') : '',
        });
      } else {
        form.reset({
          description: '',
          priority: 'Medium',
          status: 'Open',
          assigneeId: 'unassigned',
          resolvedDate: '',
        });
      }
    }
  }, [isDialogOpen, editingIssue, form]);


  const handleDialogOpen = (issue: Issue | null) => {
    setEditingIssue(issue);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingIssue) return;
    const success = await deleteIssue(deletingIssue.id);
    if (success) {
      toast({ title: "Success", description: "Issue moved to trash." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not move issue to trash." });
    }
    setDeletingIssue(null);
  };

  const handleBulkDeleteConfirm = async () => {
    if (selectedIssues.length === 0) return;

    const promises = selectedIssues.map(id => deleteIssue(id));
    const results = await Promise.all(promises);

    const successCount = results.filter(Boolean).length;
    if (successCount > 0) {
      toast({ title: "Success", description: `${successCount} issue(s) moved to trash.` });
    }
    if (successCount < selectedIssues.length) {
      toast({ variant: "destructive", title: "Error", description: `Could not move ${selectedIssues.length - successCount} issue(s) to trash.` });
    }

    setSelectedIssues([]);
    setShowBulkDeleteConfirm(false);
  };

  const onSubmit = async (values: z.infer<typeof issueSchema>) => {
    setIsSubmitting(true);
    const issueData = {
      ...values,
      assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
      resolvedDate: values.resolvedDate ? new Date(values.resolvedDate) : undefined,
    };

    let success = false;
    if (editingIssue) {
      success = await updateIssue(editingIssue.id, issueData);
    } else {
      success = await addIssue({ ...issueData, reportedDate: new Date() });
    }

    if (success) {
      toast({ title: "Success", description: `Issue ${editingIssue ? 'updated' : 'added'} successfully.` });
      setIsDialogOpen(false);
      setEditingIssue(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingIssue ? 'update' : 'add'} issue.` });
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Issues" description="Manage and track all project issues.">
          {selectedIssues.length > 0 && (
            <Button variant="destructive" onClick={() => setShowBulkDeleteConfirm(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected ({selectedIssues.length})
            </Button>
          )}
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Issue
          </Button>
        </PageHeader>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={issues.length > 0 && selectedIssues.length === issues.length}
                    onCheckedChange={(value) =>
                      setSelectedIssues(value ? issues.map(item => item.id) : [])
                    }
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="whitespace-nowrap">ID</TableHead>
                <TableHead className="w-[40%]">Description</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>Reported</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((issue) => {
                const assignee = users.find(e => e.id === issue.assigneeId);
                return (
                  <TableRow key={issue.id} data-state={selectedIssues.includes(issue.id) && "selected"}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIssues.includes(issue.id)}
                        onCheckedChange={(value) =>
                          setSelectedIssues(
                            value
                              ? [...selectedIssues, issue.id]
                              : selectedIssues.filter((id) => id !== issue.id)
                          )
                        }
                        aria-label="Select row"
                      />
                    </TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{issue.issueId}</TableCell>
                    <TableCell className="break-words">{issue.description}</TableCell>
                    <TableCell>
                      <Badge className={cn('font-semibold', priorityStyles[issue.priority])}>
                        {issue.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn('font-semibold', statusStyles[issue.status])}>
                        {issue.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{assignee ? `${assignee.firstName} ${assignee.lastName}` : 'N/A'}</TableCell>
                    <TableCell>{format(new Date(issue.reportedDate), 'PPP')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(issue)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingIssue(issue)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingIssue(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>{editingIssue ? 'Edit Issue' : 'Add New Issue'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Description</FormLabel>
                    <FormControl><Textarea placeholder="Describe the issue..." {...field} rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>
                          {priorities.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
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
                          {statuses.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
<<<<<<< HEAD

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="assigneeId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assignee</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Assign someone" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {users.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="resolvedDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resolved Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
=======
                
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="assigneeId" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Assignee</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Assign someone" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="unassigned">Unassigned</SelectItem>
                                    {[...users].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' })).map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="resolvedDate" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Resolved Date</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
>>>>>>> 7fdef9f (Bugs 1 and Enhancement)
                </div>
              </div>
              <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (editingIssue ? 'Saving...' : 'Creating...') : (editingIssue ? 'Save Changes' : 'Create Issue')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingIssue} onOpenChange={(isOpen) => !isOpen && setDeletingIssue(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the issue to the trash. It will be permanently deleted after 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the selected {selectedIssues.length} issue(s) to the trash.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Delete Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
