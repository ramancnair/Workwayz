

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import type { Story, Epic, StoryStatus, User, WorkItemType, BugCriticality, KanbanColumn, Environment } from '@/types';
import { Columns, ChevronDown, Clock, BookOpen, Bug, CheckSquare, GitCommit, TrendingUp, Trash2, Ban, Edit } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';

const workItemIcons: Record<WorkItemType, React.ElementType> = {
  'Requirement/Story': BookOpen,
  Bug: Bug,
  'Development Task': CheckSquare,
  'Feature Change': GitCommit,
};

const bugCriticalities: BugCriticality[] = ['Low', 'Medium', 'High', 'Critical'];

const storyFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  epicId: z.string().optional(),
  parentStoryId: z.string().optional(),
  assigneeId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
  criticality: z.enum(bugCriticalities).optional(),
  environmentId: z.string().optional(),
});

function StoryCard({ story, epic, parentStory, columns, onStatusChange, onEdit, className, isMoveToDoneDisabled, subItems, onSubItemClick }: { story: Story; epic?: Epic; parentStory?: Story; columns: KanbanColumn[]; onStatusChange?: (newStatus: StoryStatus) => void; onEdit: () => void; className?: string; isMoveToDoneDisabled?: boolean; subItems?: Story[], onSubItemClick: (story: Story) => void; }) {

  const Icon = workItemIcons[story.itemType];
  const doneColumn = columns.find(c => c.isDoneColumn);
  
  const devTasks = subItems?.filter(i => i.itemType === 'Development Task') || [];
  const bugs = subItems?.filter(i => i.itemType === 'Bug') || [];

  return (
    <Collapsible>
    <Card className={cn("bg-card", className)}>
      <CardHeader>
        <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                <p className="text-xs font-semibold text-muted-foreground">
                {parentStory ? `${parentStory.storyId} > ${story.storyId}` : story.storyId}
                </p>
            </div>
             <div className="flex items-center gap-1">
                {epic && <Badge variant="secondary">{epic.title}</Badge>}
                 <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
                    <Edit className="h-4 w-4" />
                </Button>
            </div>
        </div>
        <CardTitle className="text-base">{story.title}</CardTitle>
      </CardHeader>
      <CardFooter className="flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4">
            {story.estimatedHours !== undefined && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{story.estimatedHours}h</span>
                </div>
            )}
             {(devTasks.length > 0 || bugs.length > 0) && (
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  {devTasks.length > 0 && (
                    <div className="flex items-center gap-1" title={`${devTasks.length} development tasks`}>
                      <CheckSquare className="h-3 w-3" />
                      <span>{devTasks.length}</span>
                    </div>
                  )}
                  {bugs.length > 0 && (
                    <div className="flex items-center gap-1" title={`${bugs.length} bugs`}>
                      <Bug className="h-3 w-3" />
                      <span>{bugs.length}</span>
                    </div>
                  )}
                </div>
              </CollapsibleTrigger>
            )}
        </div>
        <div className="flex items-center gap-1">
            {onStatusChange && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7">
                        Move <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {columns.filter(col => col.name !== story.status).map(col => {
                            const isDoneAndDisabled = doneColumn && col.id === doneColumn.id && isMoveToDoneDisabled;

                            if (isDoneAndDisabled) {
                                return (
                                    <TooltipProvider key={col.id}>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="w-full">
                                                    <DropdownMenuItem disabled>
                                                        <Ban className="mr-2 h-4 w-4" />
                                                        Move to {col.name}
                                                    </DropdownMenuItem>
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Complete all sub-items first.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )
                            }

                            return (
                                <DropdownMenuItem key={col.id} onClick={() => onStatusChange(col.name)}>
                                    Move to {col.name}
                                </DropdownMenuItem>
                            )
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
      </CardFooter>
      <CollapsibleContent>
        <div className="px-6 pb-4 space-y-2">
            {(devTasks.length > 0 || bugs.length > 0) && <Separator />}
            {[...devTasks, ...bugs].map(item => {
                const ItemIcon = workItemIcons[item.itemType];
                return (
                    <div key={item.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <ItemIcon className="h-3 w-3 text-muted-foreground" />
                            <span 
                                className="font-medium cursor-pointer hover:underline"
                                onClick={() => onSubItemClick(item)}
                            >
                                [{item.storyId}] {item.title}
                            </span>
                        </div>
                        <Badge variant="outline">{item.status}</Badge>
                    </div>
                )
            })}
        </div>
      </CollapsibleContent>
    </Card>
    </Collapsible>
  );
}


export default function KanbanPage() {
  const { stories, epics, sprints, kanbanColumns, moveStoryStatus, moveStoryToSprint, employees: users, updateStory, deleteStory, environments } = useProject();
  const { toast } = useToast();
  
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('all');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [deletingStory, setDeletingStory] = useState<Story | null>(null);
  const [isEditStorySubmitting, setEditStorySubmitting] = useState(false);

  const editStoryForm = useForm<z.infer<typeof storyFormSchema>>({
    resolver: zodResolver(storyFormSchema),
  });

  const allStoriesById = useMemo(() => stories.reduce((acc, story) => {
    acc[story.id] = story;
    return acc;
  }, {} as Record<string, Story>), [stories]);
  
  const subItemsByStoryId = useMemo(() => stories.reduce((acc, story) => {
    if (['Bug', 'Development Task'].includes(story.itemType) && story.epicId) {
        if (!acc[story.epicId]) {
            acc[story.epicId] = [];
        }
        acc[story.epicId].push(story);
    }
    return acc;
  }, {} as Record<string, Story[]>), [stories]);

  useEffect(() => {
    if (!selectedStory) {
      setEditStorySubmitting(false);
    } else {
      editStoryForm.reset({
        title: selectedStory.title,
        description: selectedStory.description || '',
        acceptanceCriteria: selectedStory.acceptanceCriteria || '',
        epicId: ['Requirement/Story', 'Feature Change'].includes(selectedStory.itemType) ? selectedStory.epicId || 'unassigned' : undefined,
        parentStoryId: ['Bug', 'Development Task'].includes(selectedStory.itemType) ? selectedStory.epicId || 'unassigned' : undefined,
        assigneeId: selectedStory.assigneeId || 'unassigned',
        estimatedHours: selectedStory.estimatedHours,
        criticality: selectedStory.criticality || 'Medium',
        environmentId: selectedStory.environmentId || 'unassigned',
      });
    }
  }, [selectedStory, editStoryForm]);

  const onEditStorySubmit = async (values: z.infer<typeof storyFormSchema>) => {
    if (!selectedStory) return;
    setEditStorySubmitting(true);
    
    const isSubItem = ['Bug', 'Development Task'].includes(selectedStory.itemType);

    const success = await updateStory(selectedStory.id, {
        title: values.title,
        description: values.description,
        acceptanceCriteria: values.acceptanceCriteria,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        epicId: !isSubItem ? (values.epicId === 'unassigned' ? undefined : values.epicId) : (values.parentStoryId === 'unassigned' ? undefined : values.parentStoryId),
        estimatedHours: values.estimatedHours,
        criticality: selectedStory.itemType === 'Bug' ? values.criticality : undefined,
        environmentId: values.environmentId === 'unassigned' ? undefined : values.environmentId,
    });
    if (success) {
      setSelectedStory(null);
    } else {
      toast({ variant: "destructive", title: `Error Editing ${selectedStory.itemType}`, description: "Could not save your changes." });
    }
    setEditStorySubmitting(false);
  };

  const handleDeleteStory = (storyId: string) => {
    setDeletingStory(null);
    deleteStory(storyId).then(success => {
        if (!success) toast({ variant: "destructive", title: "Error", description: "Could not delete story." });
    });
  };
  
  const currentSprint = useMemo(() => sprints.find((s) => s.isCurrent), [sprints]);
  
  const baseSprintStories = useMemo(() => currentSprint
      ? stories.filter((story) => story.sprintId === currentSprint.id)
      : [], [stories, currentSprint]);

  const sprintStories = useMemo(() => {
    const filteredByAssignee = selectedAssigneeId === 'all'
      ? baseSprintStories
      : baseSprintStories.filter(story => story.assigneeId === selectedAssigneeId);

    // Only show parent items (Stories/Feature Changes) or sub-items whose parent is not in the sprint
    return filteredByAssignee.filter(item => {
      const isSubItem = ['Bug', 'Development Task'].includes(item.itemType);
      if (!isSubItem) {
        return true; // Always show parent items
      }
      // Hide sub-item if its parent is also in the sprint
      return !baseSprintStories.some(parent => parent.id === item.epicId);
    });
  }, [baseSprintStories, selectedAssigneeId]);


 const selectedStorySubItems = useMemo(() => {
    if (!selectedStory) return { devTasks: [], bugs: [] };
    const allSubItems = subItemsByStoryId[selectedStory.id] || [];
    return {
      devTasks: allSubItems.filter(item => item.itemType === 'Development Task'),
      bugs: allSubItems.filter(item => item.itemType === 'Bug'),
    };
  }, [selectedStory, subItemsByStoryId]);
  
  const parentStories = useMemo(() => stories.filter(s => ['Requirement/Story', 'Feature Change'].includes(s.itemType)), [stories]);

  const sortedEnvironments = useMemo(() => [...environments].sort((a,b) => a.order - b.order), [environments]);


  if (!currentSprint) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col">
        <PageHeader title="Kanban Board" description="No active sprint found."></PageHeader>
        <div className="flex flex-1 items-center justify-center bg-muted/50 rounded-lg">
            <p className="text-lg text-muted-foreground">There is no active sprint. Please set a current sprint in the backlog.</p>
        </div>
      </div>
    );
  }

  const sprintAssigneeIds = new Set(baseSprintStories.map(story => story.assigneeId).filter(Boolean));
  const sprintAssignees = users.filter(emp => sprintAssigneeIds.has(emp.id));

  const sortedColumns = kanbanColumns.sort((a, b) => a.order - b.order);
  const doneColumnName = sortedColumns.find(c => c.isDoneColumn)?.name || 'Done';

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 h-full flex flex-col">
        <PageHeader title={`Kanban Board: ${currentSprint.title}`} description={`Move work items to change their status.`}>
          <div className="flex items-center gap-2">
            <Label htmlFor="assignee-filter" className="text-sm font-medium">View by</Label>
            <Select value={selectedAssigneeId} onValueChange={setSelectedAssigneeId}>
              <SelectTrigger id="assignee-filter" className="w-[200px]">
                <SelectValue placeholder="Filter by assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {sprintAssignees.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PageHeader>
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
          {sortedColumns.map((column) => {
            const itemsInColumn = sprintStories.filter((story) => story.status === column.name);
            return (
              <div key={column.id} className="bg-muted/50 rounded-lg p-4 h-full flex flex-col min-w-[320px] w-1/3">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Columns className="mr-2 h-5 w-5" />
                  {column.name}
                  <span className="ml-2 bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center text-sm">
                    {itemsInColumn.length}
                  </span>
                </h3>
                <div className="flex-1 space-y-4 overflow-y-auto">
                  {itemsInColumn.map((story) => {
                      const epic = epics.find(e => e.id === story.epicId);
                      const parentStory = story.epicId && !['Requirement/Story', 'Feature Change'].includes(story.itemType) ? allStoriesById[story.epicId] : undefined;
                      const subItems = subItemsByStoryId[story.id] || [];

                      const isMoveToDoneDisabled = ['Requirement/Story', 'Feature Change'].includes(story.itemType) && subItems.some(sub => sub.status !== doneColumnName);

                      return (
                        <div key={story.id}>
                          <StoryCard 
                            story={story} 
                            epic={epic}
                            parentStory={parentStory}
                            columns={sortedColumns}
                            onStatusChange={(newStatus) => moveStoryStatus(story.id, newStatus)} 
                            onEdit={() => setSelectedStory(story)}
                            isMoveToDoneDisabled={isMoveToDoneDisabled}
                            subItems={subItems}
                            onSubItemClick={setSelectedStory}
                          />
                        </div>
                      );
                  })}
                </div>
              </div>
          )})}
        </div>
      </div>

      <Dialog open={!!selectedStory} onOpenChange={setSelectedStory}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          {selectedStory && (
            <>
              <DialogHeader>
                <DialogTitle>Edit {selectedStory.itemType}</DialogTitle>
                <DialogDescription>
                  Make changes to your {selectedStory.itemType.toLowerCase()} here. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <Form {...editStoryForm}>
                <form onSubmit={editStoryForm.handleSubmit(onEditStorySubmit)} className="space-y-4">
                   <FormField
                        control={editStoryForm.control}
                        name="title"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                            <Input placeholder="Story title" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList>
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="related">
                                Related Items 
                                <Badge variant="secondary" className="ml-2">
                                    {selectedStorySubItems.devTasks.length + selectedStorySubItems.bugs.length}
                                </Badge>
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="details" className="pt-4">
                            <div className="space-y-4">
                                <FormField
                                    control={editStoryForm.control}
                                    name="description"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                        <Textarea placeholder="Describe the story..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <FormField
                                    control={editStoryForm.control}
                                    name="acceptanceCriteria"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Acceptance Criteria</FormLabel>
                                        <FormControl>
                                        <Textarea placeholder="Define acceptance criteria for this story..." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {['Requirement/Story', 'Feature Change'].includes(selectedStory.itemType) ? (
                                    <FormField
                                    control={editStoryForm.control}
                                    name="epicId"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Epic</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Assign to an epic" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                            <SelectItem value="unassigned">Unassigned</SelectItem>
                                            {epics.map((epic) => (
                                                <SelectItem key={epic.id} value={epic.id}>
                                                {epic.title}
                                                </SelectItem>
                                            ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                ) : (
                                    <FormField
                                    control={editStoryForm.control}
                                    name="parentStoryId"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Related Item</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Link to a story or feature change" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                            <SelectItem value="unassigned">None</SelectItem>
                                            {parentStories.map(story => (
                                                <SelectItem key={story.id} value={story.id}>[{story.storyId}] {story.title}</SelectItem>
                                            ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                )}
                                <FormField
                                    control={editStoryForm.control}
                                    name="assigneeId"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Assignee</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                        <FormControl>
                                            <SelectTrigger>
                                            <SelectValue placeholder="Assign to a resource" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="unassigned">Unassigned</SelectItem>
                                            {users.map((emp) => (
                                            <SelectItem key={emp.id} value={emp.id}>
                                                {emp.firstName} {emp.lastName}
                                            </SelectItem>
                                            ))}
                                        </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                                </div>
                                {selectedStory.itemType === 'Bug' && (
                                    <>
                                        <FormField
                                        control={editStoryForm.control}
                                        name="criticality"
                                        render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Criticality</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Set criticality" />
                                                </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                {bugCriticalities.map((c) => (
                                                    <SelectItem key={c} value={c}>
                                                    {c}
                                                    </SelectItem>
                                                ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                            </FormItem>
                                        )}
                                        />
                                         <FormField
                                            control={editStoryForm.control}
                                            name="environmentId"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel>Environment</FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                                                    <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select an environment" />
                                                    </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                    <SelectItem value="unassigned">None</SelectItem>
                                                    {sortedEnvironments.map(env => (
                                                        <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>
                                                    ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </>
                                )}
                                <FormField
                                    control={editStoryForm.control}
                                    name="estimatedHours"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Estimated Hours</FormLabel>
                                        <FormControl>
                                        <Input type="number" placeholder="0" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            </div>
                        </TabsContent>
                        <TabsContent value="related">
                             <div className="space-y-4 pt-4">
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Development Tasks</h4>
                                    {selectedStorySubItems.devTasks.length > 0 ? (
                                        <div className="space-y-2 rounded-md border p-2">
                                        {selectedStorySubItems.devTasks.map(item => {
                                            const ItemIcon = workItemIcons[item.itemType];
                                            return (
                                                <div key={item.id} className="flex items-center justify-between text-sm">
                                                    <div className='flex items-center gap-2'>
                                                        {ItemIcon && <ItemIcon className="h-4 w-4 text-muted-foreground" />}
                                                        <span className="cursor-pointer hover:underline" onClick={() => setSelectedStory(item)}>[{item.storyId}] {item.title}</span>
                                                    </div>
                                                    <Badge variant="outline">{item.status}</Badge>
                                                </div>
                                            )
                                        })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic px-2">No development tasks linked.</p>
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-sm font-medium mb-2">Bugs</h4>
                                    {selectedStorySubItems.bugs.length > 0 ? (
                                        <div className="space-y-2 rounded-md border p-2">
                                        {selectedStorySubItems.bugs.map(item => {
                                            const ItemIcon = workItemIcons[item.itemType];
                                            return (
                                                <div key={item.id} className="flex items-center justify-between text-sm">
                                                    <div className='flex items-center gap-2'>
                                                        {ItemIcon && <ItemIcon className="h-4 w-4 text-muted-foreground" />}
                                                        <span className="cursor-pointer hover:underline" onClick={() => setSelectedStory(item)}>[{item.storyId}] {item.title}</span>
                                                    </div>
                                                    <Badge variant="outline">{item.status}</Badge>
                                                </div>
                                            )
                                        })}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground italic px-2">No bugs linked.</p>
                                    )}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                  <DialogFooter className="flex justify-between items-center pt-4">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => {
                              if (selectedStory) {
                                  setDeletingStory(selectedStory);
                                  setSelectedStory(null);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete {selectedStory.itemType}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Delete {selectedStory.itemType}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <div className="flex items-center gap-2">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                              Move to Sprint <ChevronDown className="ml-2 h-4 w-4" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                              {selectedStory.sprintId !== null && (
                              <DropdownMenuItem onClick={() => {
                                  if (!selectedStory) return;
                                  moveStoryToSprint(selectedStory.id, null);
                                  setSelectedStory(null);
                              }}>
                                  Backlog
                              </DropdownMenuItem>
                              )}
                              {sprints
                              .filter((sprint) => sprint.id !== selectedStory.sprintId)
                              .map((sprint) => (
                                  <DropdownMenuItem
                                  key={sprint.id}
                                  onClick={() => {
                                      if (!selectedStory) return;
                                      moveStoryToSprint(selectedStory.id, sprint.id);
                                      setSelectedStory(null);
                                  }}
                                  >
                                  {sprint.title}
                                  </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                      </DropdownMenu>
                      <Button type="submit" disabled={isEditStorySubmitting}>
                        {isEditStorySubmitting ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingStory} onOpenChange={(isOpen) => !isOpen && setDeletingStory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the story "{deletingStory?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingStory && handleDeleteStory(deletingStory.id)}
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

