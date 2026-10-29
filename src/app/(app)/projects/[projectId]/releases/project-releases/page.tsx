'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { PlusCircle, Edit, Trash2, ArrowUpDown, X, CheckCircle, Zap } from 'lucide-react';
import { type Release, type ReleaseItemType, type Sprint } from '@/types';
import { Label } from '@/components/ui/label';
import { getSprintDisplayId } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from 'date-fns';
import { ReleaseGanttChart } from '@/components/ReleaseGanttChart';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

const releaseSchemaBase = z.object({
  name: z.string().min(1, 'Name is required.').max(60, 'Release name cannot exceed 60 characters.'),
  description: z.string().max(300, 'Release description cannot exceed 300 characters.').optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  milestoneDate: z.string().optional(),
  parentReleaseId: z.string().optional(),
  isCompleted: z.boolean().optional(),
});

function SortableHeader({
  columnId,
  onSort,
  children,
}: {
  columnId: string;
  onSort: (columnId: string) => void;
  children: React.ReactNode;
}) {
  return (
    <TableHead>
      <Button variant="ghost" onClick={() => onSort(columnId)}>
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );
}

export default function ReleasesPage() {
  const { project, releasesAndMilestones, sprints, addReleaseOrMilestone, updateReleaseOrMilestone, deleteReleaseOrMilestone, updateSprint } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Release | null>(null);
  const [deletingItem, setDeletingItem] = useState<Release | null>(null);
  const [itemTypeToAdd, setItemTypeToAdd] = useState<ReleaseItemType>('Release');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showSprints, setShowSprints] = useState(false);
  const [editingSprintRelease, setEditingSprintRelease] = useState<Sprint | null>(null);
  const [selectedSprintReleaseId, setSelectedSprintReleaseId] = useState<string>('none');

  const [filters, setFilters] = useState({ search: '', itemType: 'all', parentReleaseId: 'all' });
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>(null);


  const releases = releasesAndMilestones.filter(item => item.itemType === 'Release');
  
  const dialogTitle = editingItem ? `Edit ${editingItem.itemType}` : `Add New ${itemTypeToAdd}`;
  const currentItemType = editingItem?.itemType || itemTypeToAdd;

  const getParentReleaseName = useCallback((parentReleaseId?: string) => {
    if (!parentReleaseId) return 'N/A';
    const parent = releases.find(r => r.id === parentReleaseId);
    return parent ? `(${parent.releaseId}) ${parent.name}` : 'N/A';
  }, [releases]);
  
  const projStart = project?.startDate ? format(parseISO(project.startDate), 'yyyy-MM-dd') : null;
  const projEnd = project?.endDate ? format(parseISO(project.endDate), 'yyyy-MM-dd') : null;

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
        if (data.startDate && projStart && data.startDate < projStart) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Start date cannot be earlier than project start date (${format(parseISO(project!.startDate!), 'dd MMM yyyy')}).`,
                path: ["startDate"],
            });
        }
        if (data.startDate && projEnd && data.startDate > projEnd) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Start date cannot be later than project end date (${format(parseISO(project!.endDate!), 'dd MMM yyyy')}).`,
                path: ["startDate"],
            });
        }
        if (data.endDate && projStart && data.endDate < projStart) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `End date cannot be earlier than project start date (${format(parseISO(project!.startDate!), 'dd MMM yyyy')}).`,
                path: ["endDate"],
            });
        }
        if (data.endDate && projEnd && data.endDate > projEnd) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `End date cannot be later than project end date (${format(parseISO(project!.endDate!), 'dd MMM yyyy')}).`,
                path: ["endDate"],
            });
        }
    }

    if (currentItemType === 'Milestone') {
         if (!data.milestoneDate) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Milestone date is required.", path: ["milestoneDate"]});
        }
        if (data.milestoneDate && projStart && data.milestoneDate < projStart) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Milestone date cannot be earlier than project start date (${format(parseISO(project!.startDate!), 'dd MMM yyyy')}).`,
                path: ["milestoneDate"],
            });
        }
        if (data.milestoneDate && projEnd && data.milestoneDate > projEnd) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Milestone date cannot be later than project end date (${format(parseISO(project!.endDate!), 'dd MMM yyyy')}).`,
                path: ["milestoneDate"],
            });
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
          name: (editingItem.name || '').slice(0, 60),
          description: (editingItem.description || '').slice(0, 300),
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
    let itemsToProcess: Array<Release & { originalSprint?: Sprint }> = [...releasesAndMilestones];

    if (showSprints) {
      sprints.forEach((sprint) => {
        const isAligned = sprint.releaseId && releases.some(r => r.id === sprint.releaseId);
        const parentReleaseId = isAligned ? sprint.releaseId : undefined;

        itemsToProcess.push({
          id: sprint.id,
          releaseId: getSprintDisplayId(sprint),
          name: sprint.title,
          description: `Sprint (${sprint.status || 'Planned'})`,
          itemType: 'Sprint' as any,
          parentReleaseId,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          isCompleted: sprint.status === 'Completed',
          originalSprint: sprint,
        });
      });
    }

    let filtered = itemsToProcess;
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
        if (filters.parentReleaseId === 'none') {
            filtered = filtered.filter(item => !item.parentReleaseId);
        } else {
            filtered = filtered.filter(item => item.parentReleaseId === filters.parentReleaseId);
        }
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
  }, [releasesAndMilestones, showSprints, sprints, releases, filters, sorting, getParentReleaseName]);

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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle>Release Timeline</CardTitle>
                <div className="flex items-center space-x-2">
                    <Switch
                        id="show-sprints-switch"
                        checked={showSprints}
                        onCheckedChange={setShowSprints}
                    />
                    <Label htmlFor="show-sprints-switch" className="text-sm font-medium cursor-pointer select-none">
                        Show Sprints
                    </Label>
                </div>
            </CardHeader>
            <CardContent>
                <ReleaseGanttChart
                    releases={releasesAndMilestones}
                    sprints={sprints}
                    showSprints={showSprints}
                />
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
                        {showSprints && <SelectItem value="Sprint">Sprint</SelectItem>}
                    </SelectContent>
                </Select>
                 <Select value={filters.parentReleaseId} onValueChange={(v) => handleFilterChange('parentReleaseId', v)}>
                    <SelectTrigger className="w-[220px]"><SelectValue placeholder="Filter by parent release..."/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Parent Releases</SelectItem>
                        {releases.map(r => <SelectItem key={r.id} value={r.id}>({r.releaseId}) {r.name}</SelectItem>)}
                        {showSprints && <SelectItem value="none">None (Non-Release)</SelectItem>}
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
                <SortableHeader columnId="releaseId" onSort={handleSort}>ID</SortableHeader>
                <SortableHeader columnId="name" onSort={handleSort}>Name</SortableHeader>
                <SortableHeader columnId="parentReleaseId" onSort={handleSort}>Parent Release</SortableHeader>
                <SortableHeader columnId="startDate" onSort={handleSort}>Start/Milestone Date</SortableHeader>
                <SortableHeader columnId="endDate" onSort={handleSort}>End Date</SortableHeader>
                <TableHead>Completed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedItems.map((item) => {
                const isSprint = (item.itemType as string) === 'Sprint';
                return (
                  <TableRow key={item.id} className={cn(isSprint && "bg-amber-500/[0.03] hover:bg-amber-500/[0.08]")}>
                    <TableCell className="font-medium">
                      <Badge
                        variant={
                          item.itemType === 'Release'
                            ? 'default'
                            : item.itemType === 'Stage'
                            ? 'secondary'
                            : isSprint
                            ? 'outline'
                            : 'outline'
                        }
                        className={cn(
                          isSprint && "border-amber-500/50 text-amber-400 bg-amber-500/10 font-mono"
                        )}
                      >
                        {item.releaseId}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {isSprint && <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                        <span className={cn(isSprint && "font-medium text-amber-200")}>{item.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isSprint ? (
                        item.parentReleaseId ? (
                          getParentReleaseName(item.parentReleaseId)
                        ) : (
                          <span className="text-muted-foreground italic text-xs">None (Non-Release)</span>
                        )
                      ) : (
                        (item.itemType === 'Stage' || item.itemType === 'Milestone') ? getParentReleaseName(item.parentReleaseId) : 'N/A'
                      )}
                    </TableCell>
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
                    <TableCell>
                      <Switch
                          checked={item.isCompleted}
                          onCheckedChange={async (checked) => {
                            if (isSprint) {
                              await updateSprint(item.id, {
                                title: item.name,
                                status: checked ? 'Completed' : 'Yet to Start',
                              });
                              toast({ title: 'Success', description: `Sprint ${item.name} marked as ${checked ? 'Completed' : 'active'}.` });
                            } else {
                              await updateReleaseOrMilestone(item.id, { isCompleted: checked });
                            }
                          }}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {isSprint ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Align Release"
                            onClick={() => {
                              setEditingSprintRelease((item as any).originalSprint);
                              setSelectedSprintReleaseId(item.parentReleaseId || 'none');
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(item, item.itemType)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeletingItem(item)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingItem(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] p-0 flex flex-col overflow-hidden" bypassScrollWrapper={true}>
          <DialogHeader className="px-6 py-4 border-b shrink-0">
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
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
                      <FormControl><Input placeholder={`E.g., Q3 2024 ${currentItemType}`} {...field} maxLength={60} /></FormControl>
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
                      <FormControl><Textarea placeholder="Describe the main goals..." {...field} rows={4} maxLength={300} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {currentItemType === 'Milestone' ? (
                  <FormField control={form.control} name="milestoneDate" render={({ field }) => (
                      <FormItem>
                          <FormLabel>Milestone Date</FormLabel>
                          <FormControl>
                              <Input
                                type="date"
                                {...field}
                                value={field.value ?? ''}
                                min={projStart || undefined}
                                max={projEnd || undefined}
                              />
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
                                  <Input
                                    type="date"
                                    {...field}
                                    value={field.value ?? ''}
                                    min={projStart || undefined}
                                    max={form.watch('endDate') || projEnd || undefined}
                                  />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                      <FormField control={form.control} name="endDate" render={({ field }) => (
                          <FormItem>
                              <FormLabel>End Date</FormLabel>
                              <FormControl>
                                  <Input
                                    type="date"
                                    {...field}
                                    value={field.value ?? ''}
                                    min={form.watch('startDate') || projStart || undefined}
                                    max={projEnd || undefined}
                                  />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                      )} />
                  </div>
                )}
                {project?.startDate && (
                  <p className="text-[11px] text-muted-foreground -mt-2">
                    Project timeline: {format(parseISO(project.startDate), 'dd MMM yyyy')}{project.endDate ? ` — ${format(parseISO(project.endDate), 'dd MMM yyyy')}` : ''}
                  </p>
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
              </div>
              <DialogFooter className="px-6 py-4 border-t bg-background shrink-0">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (editingItem ? 'Saving...' : 'Creating...') : (editingItem ? 'Save Changes' : `Create ${currentItemType}`)}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingSprintRelease} onOpenChange={(open) => !open && setEditingSprintRelease(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Align Sprint to Release</DialogTitle>
            <DialogDescription>
              Assign <strong>{editingSprintRelease?.title}</strong> to a specific project release.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sprint-release-select">Parent Release</Label>
              <Select
                value={selectedSprintReleaseId}
                onValueChange={setSelectedSprintReleaseId}
              >
                <SelectTrigger id="sprint-release-select">
                  <SelectValue placeholder="Select a release" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Auto-align by dates / None</SelectItem>
                  {releases.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      [{r.releaseId}] {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSprintRelease(null)}>Cancel</Button>
            <Button
              onClick={async () => {
                if (!editingSprintRelease) return;
                const success = await updateSprint(editingSprintRelease.id, {
                  title: editingSprintRelease.title,
                  releaseId: selectedSprintReleaseId === 'none' ? null : selectedSprintReleaseId,
                });
                if (success) {
                  toast({ title: 'Success', description: 'Sprint release alignment updated.' });
                  setEditingSprintRelease(null);
                } else {
                  toast({ variant: 'destructive', title: 'Error', description: 'Failed to update sprint alignment.' });
                }
              }}
            >
              Save Alignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingItem} onOpenChange={(isOpen) => !isOpen && setDeletingItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the {deletingItem?.itemType} &quot;{deletingItem?.name}&quot;.
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
