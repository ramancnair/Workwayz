
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
import { type Release, type ReleaseItemType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { ReleaseGanttChart } from '@/components/ReleaseGanttChart';

const releaseSchemaBase = z.object({
  name: z.string().min(1, 'Name is required.'),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  milestoneDate: z.string().optional(),
  parentReleaseId: z.string().optional(),
});


export default function ReleasesPage() {
  const { releasesAndMilestones, addReleaseOrMilestone, updateReleaseOrMilestone, deleteReleaseOrMilestone } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Release | null>(null);
  const [deletingItem, setDeletingItem] = useState<Release | null>(null);
  const [itemTypeToAdd, setItemTypeToAdd] = useState<ReleaseItemType>('Release');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const releases = releasesAndMilestones.filter(item => item.itemType === 'Release');
  
  const dialogTitle = editingItem ? `Edit ${editingItem.itemType}` : `Add New ${itemTypeToAdd}`;
  const currentItemType = editingItem?.itemType || itemTypeToAdd;

  const getParentReleaseName = (parentReleaseId?: string) => {
    if (!parentReleaseId) return 'N/A';
    const parent = releases.find(r => r.id === parentReleaseId);
    return parent ? `(${parent.releaseId}) ${parent.name}` : 'N/A';
  };
  
  const refinedReleaseSchema = releaseSchemaBase.superRefine((data, ctx) => {
    if (currentItemType === 'Release' || currentItemType === 'Stage') {
        if (!data.startDate) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Start date is required.", path: ["startDate"]});
        }
        if (!data.endDate) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End date is required.", path: ["endDate"]});
        }
        if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End date must be on or after the start date.", path: ["endDate"]});
        }
    }

    if (currentItemType === 'Milestone') {
         if (!data.milestoneDate) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Milestone date is required.", path: ["milestoneDate"]});
        }
    }

    if (currentItemType === 'Stage' || currentItemType === 'Milestone') {
      if (!data.parentReleaseId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A parent release is required.", path: ["parentReleaseId"]});
      } else {
        const parentRelease = releases.find(r => r.id === data.parentReleaseId);
        if (parentRelease && parentRelease.startDate && parentRelease.endDate) {
          const releaseStart = new Date(parentRelease.startDate);
          const releaseEnd = new Date(parentRelease.endDate);

          if (currentItemType === 'Stage' && data.startDate && data.endDate) {
            const stageStart = new Date(data.startDate);
            const stageEnd = new Date(data.endDate);
            if (stageStart < releaseStart) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Start date must be on or after the release start date of ${format(releaseStart, 'PPP')}.`, path: ["startDate"]});
            }
            if (stageEnd > releaseEnd) {
              ctx.addIssue({ code: z.ZodIssueCode.custom, message: `End date must be on or before the release end date of ${format(releaseEnd, 'PPP')}.`, path: ["endDate"]});
            }
          }
          
          if (currentItemType === 'Milestone' && data.milestoneDate) {
              const milestoneDate = new Date(data.milestoneDate);
              if (milestoneDate < releaseStart || milestoneDate > releaseEnd) {
                  ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Milestone date must be between the release dates of ${format(releaseStart, 'PPP')} and ${format(releaseEnd, 'PPP')}.`, path: ["milestoneDate"]});
              }
          }
        }
      }
    }
  });
  
  const form = useForm<z.infer<typeof refinedReleaseSchema>>({
    resolver: zodResolver(refinedReleaseSchema),
  });


  useEffect(() => {
    if (isDialogOpen) {
      if (editingItem) {
        form.reset({
          name: editingItem.name,
          description: editingItem.description,
          startDate: editingItem.startDate ? format(new Date(editingItem.startDate), 'yyyy-MM-dd') : '',
          endDate: editingItem.endDate ? format(new Date(editingItem.endDate), 'yyyy-MM-dd') : '',
          milestoneDate: editingItem.milestoneDate ? format(new Date(editingItem.milestoneDate), 'yyyy-MM-dd') : '',
          parentReleaseId: editingItem.parentReleaseId,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          startDate: '',
          endDate: '',
          milestoneDate: '',
          parentReleaseId: undefined,
        });
      }
    }
  }, [isDialogOpen, editingItem, form]);

  const handleDialogOpen = (item: Release | null, type: ReleaseItemType) => {
    setEditingItem(item);
    setItemTypeToAdd(type);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    const success = await deleteReleaseOrMilestone(deletingItem.id);
    if (success) {
      toast({ title: "Success", description: `${deletingItem.itemType} deleted.` });
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not delete ${deletingItem.itemType}.` });
    }
    setDeletingItem(null);
  };

  const onSubmit = async (values: z.infer<typeof refinedReleaseSchema>) => {
    setIsSubmitting(true);
    const releaseData: Partial<Release> = {
        name: values.name,
        description: values.description || '',
        parentReleaseId: values.parentReleaseId || undefined,
        itemType: currentItemType,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
        milestoneDate: values.milestoneDate || undefined,
    };

    const success = editingItem
      ? await updateReleaseOrMilestone(editingItem.id, releaseData)
      : await addReleaseOrMilestone(releaseData as Omit<Release, 'id' | 'releaseId'>);

    if (success) {
      toast({ title: "Success", description: `${currentItemType} ${editingItem ? 'updated' : 'added'} successfully.` });
      setIsDialogOpen(false);
      setEditingItem(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingItem ? 'update' : 'add'} ${currentItemType}.` });
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Releases, Stages & Milestones" description="Manage all project release cycles and key milestones.">
          <Button onClick={() => handleDialogOpen(null, 'Release')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Release
          </Button>
           <Button onClick={() => handleDialogOpen(null, 'Stage')} disabled={releases.length === 0} title={releases.length === 0 ? "Create a Release first" : ""}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Stage
          </Button>
          <Button onClick={() => handleDialogOpen(null, 'Milestone')} disabled={releases.length === 0} title={releases.length === 0 ? "Create a Release first" : ""}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Milestone
          </Button>
        </PageHeader>
        <Card>
            <CardHeader>
                <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
                <ReleaseGanttChart releases={releasesAndMilestones} />
            </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Project Releases</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Parent Release</TableHead>
                  <TableHead className="w-[30%]">Description</TableHead>
                  <TableHead>Start/Milestone Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {releasesAndMilestones.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      <Badge variant={item.itemType === 'Release' ? 'default' : (item.itemType === 'Stage' ? 'secondary' : 'outline')}>
                          {item.releaseId}
                      </Badge>
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{(item.itemType === 'Stage' || item.itemType === 'Milestone') ? getParentReleaseName(item.parentReleaseId) : 'N/A'}</TableCell>
                    <TableCell className="break-words">{item.description}</TableCell>
                    <TableCell>
                      {item.itemType === 'Milestone' && item.milestoneDate && !isNaN(new Date(item.milestoneDate).getTime())
                          ? format(new Date(item.milestoneDate), 'PPP')
                          : (item.startDate && !isNaN(new Date(item.startDate).getTime()) ? format(new Date(item.startDate), 'PPP') : 'N/A')}
                    </TableCell>
                    <TableCell>
                      {item.itemType === 'Milestone'
                          ? 'N/A'
                          : (item.endDate && !isNaN(new Date(item.endDate).getTime()) ? format(new Date(item.endDate), 'PPP') : 'N/A')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(item, item.itemType)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingItem(item)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingItem(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
               {(currentItemType === 'Stage' || currentItemType === 'Milestone') && (
                  <FormField
                    control={form.control}
                    name="parentReleaseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent Release</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select a parent release..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            {releases.map(release => (
                              <SelectItem key={release.id} value={release.id}>
                                [{release.releaseId}] {release.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder={`E.g., Q3 2024 ${currentItemType}`} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Describe the main goals..." {...field} rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {currentItemType === 'Milestone' ? (
                <FormField control={form.control} name="milestoneDate" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Milestone Date</FormLabel>
                        <FormControl>
                            <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="startDate" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="endDate" render={({ field }) => (
                        <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
              )}

              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (editingItem ? 'Saving...' : 'Creating...') : (editingItem ? 'Save Changes' : `Create ${currentItemType}`)}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingItem} onOpenChange={(isOpen) => !isOpen && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {deletingItem?.itemType} "{deletingItem?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
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
