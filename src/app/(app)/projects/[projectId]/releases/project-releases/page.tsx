

'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { PlusCircle, Edit, Trash2, ArrowUpDown, X, CheckCircle } from 'lucide-react';
import { type Release, type ReleaseItemType } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from 'date-fns';
import { ReleaseGanttChart } from '@/components/ReleaseGanttChart';
import { Checkbox } from '@/components/ui/checkbox';

const releaseSchemaBase = z.object({
  name: z.string().min(1, 'Name is required.'),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  milestoneDate: z.string().optional(),
  parentReleaseId: z.string().optional(),
  isCompleted: z.boolean().optional(),
});


export default function ReleasesPage() {
  const { releasesAndMilestones, addReleaseOrMilestone, updateReleaseOrMilestone, deleteReleaseOrMilestone } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Release | null>(null);
  const [deletingItem, setDeletingItem] = useState<Release | null>(null);
  const [itemTypeToAdd, setItemTypeToAdd] = useState<ReleaseItemType>('Release');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [filters, setFilters] = useState({ search: '', itemType: 'all', parentReleaseId: 'all' });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>(null);


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
          isCompleted: editingItem.isCompleted || false,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          startDate: '',
          endDate: '',
          milestoneDate: '',
          parentReleaseId: undefined,
          isCompleted: false,
        });
      }
    }
  }, [isDialogOpen, editingItem, form]);
  
  const handleFilterChange = (filterName: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', itemType: 'all', parentReleaseId: 'all' });
  };
  
  const handleSort = (columnId: string) => {
    if (sorting?.id === columnId) {
      setSorting({ ...sorting, desc: !sorting.desc });
    } else {
      setSorting({ id: columnId, desc: false });
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...releasesAndMilestones];
    const searchTerm = filters.search.toLowerCase();

    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        (item.description && item.description.toLowerCase().includes(searchTerm)) ||
        item.releaseId.toLowerCase().includes(searchTerm)
      );
    }
    
    if (filters.itemType !== 'all') {
        filtered = filtered.filter(item => item.itemType === filters.itemType);
    }
    
    if (filters.parentReleaseId !== 'all') {
        filtered = filtered.filter(item => item.parentReleaseId === filters.parentReleaseId);
    }

    if (sorting) {
      filtered.sort((a, b) => {
        let valA: any, valB: any;
        if (sorting.id === 'parentReleaseId') {
            valA = getParentReleaseName(a.parentReleaseId);
            valB = getParentReleaseName(b.parentReleaseId);
        } else if (sorting.id === 'startDate') {
            valA = a.milestoneDate || a.startDate;
            valB = b.milestoneDate || b.startDate;
        } else {
             valA = (a as any)[sorting.id];
             valB = (b as any)[sorting.id];
        }

        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        
        if (['startDate', 'endDate'].includes(sorting.id)) {
          const dateA = new Date(valA).getTime();
          const dateB = new Date(valB).getTime();
          return sorting.desc ? dateB - dateA : dateA - dateB;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sorting.desc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        }
        
        return 0;
      });
    }

    return filtered;
  }, [releasesAndMilestones, filters, sorting]);

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
        isCompleted: values.isCompleted,
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
  
  const SortableHeader = ({ columnId, children }: { columnId: string, children: React.ReactNode }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => handleSort(columnId)}>
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );


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
                <CardTitle>Release Timeline</CardTitle>
            </CardHeader>
            <CardContent>
                <ReleaseGanttChart releases={releasesAndMilestones} />
            </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
             <div className="flex items-center gap-4 flex-wrap">
                <Input
                    placeholder="Filter by ID, name, or description..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="max-w-sm"
                />
                <Select value={filters.itemType} onValueChange={(v) => handleFilterChange('itemType', v)}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by type..."/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Item Types</SelectItem>
                        <SelectItem value="Release">Release</SelectItem>
                        <SelectItem value="Stage">Stage</SelectItem>
                        <SelectItem value="Milestone">Milestone</SelectItem>
                    </SelectContent>
                </Select>
                 <Select value={filters.parentReleaseId} onValueChange={(v) => handleFilterChange('parentReleaseId', v)}>
                    <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filter by parent release..."/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Parent Releases</SelectItem>
                        {releases.map(r => <SelectItem key={r.id} value={r.id}>({r.releaseId}) {r.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                 <Button variant="ghost" onClick={clearFilters}>
                    <X className="mr-2 h-4 w-4" /> Clear Filters
                </Button>
            </div>
          </CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <SortableHeader columnId="releaseId">ID</SortableHeader>
                <SortableHeader columnId="name">Name</SortableHeader>
                <SortableHeader columnId="parentReleaseId">Parent Release</SortableHeader>
                <TableHead className="w-[30%]">Description</TableHead>
                <SortableHeader columnId="startDate">Start/Milestone Date</SortableHeader>
                <SortableHeader columnId="endDate">End Date</SortableHeader>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">
                    <Badge variant={item.itemType === 'Release' ? 'default' : (item.itemType === 'Stage' ? 'secondary' : 'outline')}>
                        {item.releaseId}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                        {item.name}
                        {item.isCompleted && <CheckCircle className="h-4 w-4 text-green-500" />}
                    </div>
                  </TableCell>
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
                            <Input type="date" {...field} value={field.value ?? ''} />
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
                                <Input type="date" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="endDate" render={({ field }) => (
                        <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
              )}
              
                <FormField
                  control={form.control}
                  name="isCompleted"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Mark as Completed
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />


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
