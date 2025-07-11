
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import type { Story, Epic, StoryStatus, Employee, WorkItemType, BugCriticality, KanbanColumn } from '@/types';
import { Columns, ChevronDown, Clock, BookOpen, Bug, CheckSquare, GitCommit, TrendingUp, Trash2, Ban } from 'lucide-react';
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

const workItemIcons: Record<WorkItemType, React.ElementType> = {
  Story: BookOpen,
  Bug: Bug,
  Task: CheckSquare,
  Change: GitCommit,
  Improvement: TrendingUp,
};

const bugCriticalities: BugCriticality[] = ['Low', 'Medium', 'High', 'Critical'];

const storyFormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  epicId: z.string().optional(),
  assigneeId: z.string().optional(),
  estimatedHours: z.coerce.number().optional(),
  criticality: z.enum(bugCriticalities).optional(),
});

function StoryCard({ story, epic, parentStory, columns, onStatusChange, onClick, className, isMoveToDoneDisabled }: { story: Story; epic?: Epic; parentStory?: Story; columns: KanbanColumn[]; onStatusChange?: (newStatus: StoryStatus) => void; onClick: () => void; className?: string; isMoveToDoneDisabled?: boolean; }) {

  const Icon = workItemIcons[story.itemType];
  const doneColumn = columns.find(c => c.isDoneColumn);

  return (
    <Card className={cn("bg-card cursor-pointer", className)} onClick={onClick}>
      <CardHeader>
        <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            <p className="text-xs font-semibold text-muted-foreground">
              {parentStory ? `${parentStory.storyId} > ${story.storyId}` : story.storyId}
            </p>
        </div>
        <CardTitle className="text-base">{story.title}</CardTitle>
        <CardDescription>{story.description}</CardDescription>
      </CardHeader>
      <CardFooter className="flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-4">
            {epic && <Badge variant="secondary">{epic.title}</Badge>}
            {story.estimatedHours !== undefined && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{story.estimatedHours}h</span>
                </div>
            )}
        </div>
        {onStatusChange && (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
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
      </CardFooter>
    </Card>
  );
}


export default function KanbanPage() {
  const { stories, epics, sprints, kanbanColumns, moveStoryStatus, moveStoryToSprint, employees, updateStory, deleteStory } = useProject();
  const { toast } = useToast();
  
  const [selectedAssigneeId, setSelectedAssigneeId] = useState('all');
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [deletingStory, setDeletingStory] = useState<Story | null>(null);
  const [isEditStorySubmitting, setEditStorySubmitting] = useState(false);

  const editStoryForm = useForm<z.infer<typeof storyFormSchema>>({
    resolver: zodResolver(storyFormSchema),
  });

  const allStoriesById = stories.reduce((acc, story) => {
    acc[story.id] = story;
    return acc;
  }, {} as Record<string, Story>);
  
  const subItemsByStoryId = stories.reduce((acc, story) => {
    if (['Bug', 'Task'].includes(story.itemType) && story.epicId) {
        if (!acc[story.epicId]) {
            acc[story.epicId] = [];
        }
        acc[story.epicId].push(story);
    }
    return acc;
  }, {} as Record<string, Story[]>);

  useEffect(() => {
    if (!selectedStory) {
      setEditStorySubmitting(false);
    } else {
      editStoryForm.reset({
        title: selectedStory.title,
        description: selectedStory.description || '',
        acceptanceCriteria: selectedStory.acceptanceCriteria || '',
        epicId: selectedStory.epicId || 'unassigned',
        assigneeId: selectedStory.assigneeId || 'unassigned',
        estimatedHours: selectedStory.estimatedHours,
        criticality: selectedStory.criticality || 'Medium',
      });
    }
  }, [selectedStory, editStoryForm]);

  const onEditStorySubmit = async (values: z.infer<typeof storyFormSchema>) => {
    if (!selectedStory) return;
    setEditStorySubmitting(true);
    
    const isSubItem = ['Bug', 'Task'].includes(selectedStory.itemType);
    const relatedStoryId = isSubItem ? (values.epicId === 'unassigned' ? undefined : values.epicId) : undefined;

    const success = await updateStory(selectedStory.id, {
        title: values.title,
        description: values.description,
        acceptanceCriteria: values.acceptanceCriteria,
        assigneeId: values.assigneeId === 'unassigned' ? undefined : values.assigneeId,
        epicId: !isSubItem ? (values.epicId === 'unassigned' ? undefined : values.epicId) : relatedStoryId,
        estimatedHours: values.estimatedHours,
        criticality: selectedStory.itemType === 'Bug' ? values.criticality : undefined,
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
  
  const currentSprint = sprints.find((s) => s.isCurrent);
  
  const baseSprintStories = currentSprint
      ? stories.filter((story) => story.sprintId === currentSprint.id)
      : [];

  const sprintStories = selectedAssigneeId === 'all'
    ? baseSprintStories
    : baseSprintStories.filter(story => story.assigneeId === selectedAssigneeId);

  const selectedStorySubItems = selectedStory && subItemsByStoryId[selectedStory.id] ? subItemsByStoryId[selectedStory.id] : [];


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
  const sprintAssignees = employees.filter(emp => sprintAssigneeIds.has(emp.id));

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
                {sprintAssignees.map(employee => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </PageHeader>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {sortedColumns.map((column) => {
            const itemsInColumn = sprintStories.filter((story) => story.status === column.name);
            return (
              <div key={column.id} className="bg-muted/50 rounded-lg p-4 h-full flex flex-col">
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
                      const parentStory = story.epicId ? allStoriesById[story.epicId] : undefined;

                      const subItems = subItemsByStoryId[story.id] || [];
                      const isMoveToDoneDisabled = story.itemType === 'Story' && subItems.some(sub => sub.status !== doneColumnName);

                      return (
                        <div key={story.id}>
                          <StoryCard 
                            story={story} 
                            epic={epic}
                            parentStory={parentStory}
                            columns={sortedColumns}
                            onStatusChange={(newStatus) => moveStoryStatus(story.id, newStatus)} 
                            onClick={() => setSelectedStory(story)}
                            isMoveToDoneDisabled={isMoveToDoneDisabled}
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
                   <FormItem>
                    <FormLabel>ID</FormLabel>
                    <FormControl>
                      <Input readOnly value={selectedStory.storyId} />
                    </FormControl>
                  </FormItem>
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
                  {['Bug', 'Task'].includes(selectedStory.itemType) ? (
                     <FormField
                      control={editStoryForm.control}
                      name="epicId"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Related Story</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || 'unassigned'}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder="Link to a story" />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                              <SelectItem value="unassigned">None</SelectItem>
                              {stories.filter(s => s.itemType === 'Story').map(story => (
                                  <SelectItem key={story.id} value={story.id}>[{story.storyId}] {story.title}</SelectItem>
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
                            {employees.map((emp) => (
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

                  {selectedStory.itemType === 'Story' && selectedStorySubItems.length > 0 && (
                    <div>
                        <Separator className="my-4" />
                        <h4 className="text-sm font-medium mb-2">Related Items</h4>
                        <div className="space-y-2 rounded-md border p-2">
                        {selectedStorySubItems.map(item => {
                            const ItemIcon = workItemIcons[item.itemType];
                            return (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                    <div className='flex items-center gap-2'>
                                        {ItemIcon && <ItemIcon className="h-4 w-4 text-muted-foreground" />}
                                        <span>{item.storyId}: {item.title}</span>
                                    </div>
                                    <Badge variant="outline">{item.status}</Badge>
                                </div>
                            )
                        })}
                        </div>
                    </div>
                  )}

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
