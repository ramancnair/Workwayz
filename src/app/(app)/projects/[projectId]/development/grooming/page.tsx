
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { PlusCircle, Edit, Trash2, Star, ChevronLeft, ChevronRight, ChevronDown, BookOpen, Bug, CheckSquare, GitCommit, Clock, FolderUp, Library, Tag, ChevronsRight, CornerDownRight, Flag } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { type Sprint, type Story, type Epic, type WorkItemType, User } from '@/types';
import { DatePicker } from '@/components/ui/datepicker';
import { cn } from '@/lib/utils';
import { Card, CardFooter, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';


const sprintSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

const workItemIcons: Record<WorkItemType, React.ElementType> = {
  'Requirement/Story': BookOpen,
  Bug: Bug,
  'Development Task': CheckSquare,
  'Feature Change': GitCommit,
};

function StoryItemCard({ 
    story, 
    epic,
    assignee,
    subItems,
    onMove, 
    onEdit
}: { 
    story: Story, 
    epic?: Epic, 
    assignee?: User,
    subItems?: Story[],
    onMove: (sprintId: string | null) => void,
    onEdit: () => void;
}) {
  const { sprints } = useProject();
  const Icon = workItemIcons[story.itemType];
  const bugEffort = subItems?.filter(i => i.itemType === 'Bug').reduce((sum, i) => sum + (i.estimatedHours || 0), 0) || 0;
  const bugCount = subItems?.filter(i => i.itemType === 'Bug').length || 0;
  const hasEffort = story.estimatedHours && story.estimatedHours > 0;
  const sprint = sprints.find(s => s.id === story.sprintId);
  
  return (
    <Card className="bg-card cursor-pointer transition-all hover:bg-muted/80 hover:shadow-md relative group">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
      >
        <Edit className="h-4 w-4" />
      </Button>
      <CardHeader className="p-4" onClick={onEdit}>
        <div className="flex justify-between items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
              <p className="text-xs font-semibold text-muted-foreground">{story.storyId}</p>
              {hasEffort && <Flag className="h-4 w-4 text-green-500" />}
            </div>
            <p className="font-semibold break-words">{story.title}</p>
          </div>
          {assignee && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={assignee.avatar}
                      alt={`${assignee.firstName} ${assignee.lastName}`}
                      data-ai-hint="developer avatar"
                    />
                    <AvatarFallback>{assignee.firstName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Assigned to {assignee.firstName} {assignee.lastName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0" onClick={onEdit}>
        <div className="flex justify-between items-center text-xs text-muted-foreground">
            <div className='flex items-center gap-2'>
                {epic && <Badge variant="secondary">{epic.title}</Badge>}
                {sprint ? (
                    <Badge variant="outline" className="border-blue-500 text-blue-500">
                        <FolderUp className="h-3 w-3 mr-1" />
                        {sprint.title}
                    </Badge>
                ) : (
                    <Badge variant="outline" className="border-blue-500 text-blue-500">
                        <Library className="h-3 w-3 mr-1" />
                        Backlog
                    </Badge>
                )}
                {story.status && (
                     <Badge variant="outline">
                        <Tag className="h-3 w-3 mr-1" />
                        {story.status}
                    </Badge>
                )}
            </div>
            <div className="flex items-center gap-4">
                {story.estimatedHours !== undefined && (
                <div className="flex items-center gap-1" title="Development effort">
                    <CheckSquare className="h-3 w-3" />
                    <span>{story.estimatedHours}h</span>
                </div>
                )}
                {bugCount > 0 && (
                <div className="flex items-center gap-1" title={`${bugCount} bugs, ${bugEffort}h total effort`}>
                    <Bug className="h-3 w-3" />
                    <span>{bugCount} ({bugEffort}h)</span>
                </div>
                )}
            </div>
        </div>
      </CardContent>
       <CardFooter className="flex justify-end p-4 pt-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7">
              Move to <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {story.sprintId !== null && (
              <DropdownMenuItem onClick={() => onMove(null)}>
                Backlog
              </DropdownMenuItem>
            )}
            {sprints
              .filter((sprint) => sprint.id !== story.sprintId)
              .map((sprint) => (
                <DropdownMenuItem key={sprint.id} onClick={() => onMove(sprint.id)}>
                  {sprint.title}
                </DropdownMenuItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}

function SubItemsDisplay({ items, onCardClick, users, title }: { items: Story[], onCardClick: (story: Story) => void, users: User[], title: string }) {
    if (items.length === 0) return null;

    return (
        <Collapsible>
            <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-start mt-1 text-xs text-muted-foreground">
                    <ChevronsRight className="h-4 w-4 mr-2" />
                    {items.length} {title}
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="pl-6 pt-2 space-y-2">
                    {items.map(subItem => {
                        const subItemAssignee = users.find((d) => d.id === subItem.assigneeId);
                        return (
                            <div key={subItem.id} className="flex items-start gap-2">
                                <CornerDownRight className="h-4 w-4 mt-5 text-muted-foreground" />
                                <div className="flex-1">
                                    <StoryItemCard
                                        story={subItem}
                                        assignee={subItemAssignee}
                                        onEdit={() => onCardClick(subItem)}
                                        onMove={() => {}} // Move is handled at parent level
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function SprintColumn({ 
  sprint, 
  stories,
  onEdit,
  onDelete,
  onSetCurrent,
  onPrev,
  onNext,
  showNav,
  onMoveStory,
  onEditStory
}: { 
  sprint: Sprint, 
  stories: Story[],
  onEdit: (sprint: Sprint) => void,
  onDelete: (sprint: Sprint) => void,
  onSetCurrent: (sprintId: string) => void,
  onPrev: () => void,
  onNext: () => void,
  showNav: boolean,
  onMoveStory: (storyId: string, sprintId: string | null) => void;
  onEditStory: (story: Story) => void;
}) {
    const { epics, employees, stories: allStories } = useProject();

     const subItemsByStoryId = useMemo(() => allStories.reduce((acc, story) => {
        if (['Bug', 'Development Task'].includes(story.itemType) && story.epicId) {
            if (!acc[story.epicId]) {
                acc[story.epicId] = [];
            }
            acc[story.epicId].push(story);
        }
        return acc;
      }, {} as Record<string, Story[]>), [allStories]);

    return (
        <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col min-w-[320px] w-full">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                {showNav && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPrev}>
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                )}
                <h3 className="text-lg font-semibold">{sprint.title}</h3>
                 {showNav && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onNext}>
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onSetCurrent(sprint.id)}>
                  <Star className={cn("h-4 w-4", sprint.isCurrent && "fill-yellow-400 text-yellow-500")} />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(sprint)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(sprint)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto">
                {stories.map(story => {
                     const epic = epics.find(e => e.id === story.epicId);
                     const assignee = employees.find(e => e.id === story.assigneeId);
                     const subItems = subItemsByStoryId[story.id] || [];
                     return (
                        <div key={story.id}>
                            <StoryItemCard 
                                story={story} 
                                epic={epic}
                                assignee={assignee}
                                subItems={subItems}
                                onMove={(newSprintId) => onMoveStory(story.id, newSprintId)}
                                onEdit={() => onEditStory(story)}
                            />
                            <SubItemsDisplay items={subItems} onCardClick={onEditStory} users={employees} title="Related Items" />
                        </div>
                     );
                })}
            </div>
        </div>
    )
}

export default function GroomingPage() {
    const { 
        stories, 
        epics,
        employees,
        sprints,
        projectSettings,
        moveStoryToSprint,
        addSprint,
        updateSprint,
        deleteSprint,
        setCurrentSprint,
    } = useProject();
    const { toast } = useToast();
    
    const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false);
    const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);
    const [deletingSprint, setDeletingSprint] = useState<Sprint | null>(null);
    const [editingStory, setEditingStory] = useState<Story | null>(null);
    const [visibleSprintIndex, setVisibleSprintIndex] = useState(0);

    const backlogItems = useMemo(() => {
        return stories.filter(story => !story.sprintId && ['Requirement/Story', 'Development Task', 'Feature Change'].includes(story.itemType));
    }, [stories]);
    
    const subItemsByStoryId = useMemo(() => stories.reduce((acc, story) => {
        if (['Bug', 'Development Task'].includes(story.itemType) && story.epicId) {
            if (!acc[story.epicId]) {
                acc[story.epicId] = [];
            }
            acc[story.epicId].push(story);
        }
        return acc;
    }, {} as Record<string, Story[]>), [stories]);

    const sprintsWithStories = useMemo(() => {
        return sprints.map(sprint => ({
            ...sprint,
            stories: stories.filter(story => story.sprintId === sprint.id && ['Requirement/Story', 'Development Task', 'Feature Change'].includes(story.itemType)),
        })).sort((a,b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime());
    }, [sprints, stories]);
    
    useEffect(() => {
        const currentSprintIdx = sprintsWithStories.findIndex(s => s.isCurrent);
        if (currentSprintIdx !== -1) {
            setVisibleSprintIndex(currentSprintIdx);
        } else if (sprintsWithStories.length > 0) {
            setVisibleSprintIndex(0);
        }
    }, [sprintsWithStories]);

    const sprintForm = useForm<z.infer<typeof sprintSchema>>({
        resolver: zodResolver(sprintSchema),
        defaultValues: {
            title: '',
        },
    });

    const watchedStartDate = useWatch({ control: sprintForm.control, name: "startDate" });

    React.useEffect(() => {
        if (isSprintDialogOpen) {
            if (editingSprint) {
                sprintForm.reset({
                    title: editingSprint.title,
                    startDate: editingSprint.startDate ? new Date(editingSprint.startDate) : undefined,
                    endDate: editingSprint.endDate ? new Date(editingSprint.endDate) : undefined,
                });
            } else {
                sprintForm.reset({
                    title: '',
                    startDate: undefined,
                    endDate: undefined,
                });
            }
        }
    }, [isSprintDialogOpen, editingSprint, sprintForm]);


    React.useEffect(() => {
        if (watchedStartDate && projectSettings?.sprintDurationInWeeks) {
            const newEndDate = new Date(watchedStartDate);
            newEndDate.setDate(newEndDate.getDate() + projectSettings.sprintDurationInWeeks * 7 - 1);
            sprintForm.setValue("endDate", newEndDate);
        }
    }, [watchedStartDate, projectSettings?.sprintDurationInWeeks, sprintForm]);
    
    const handleSprintSubmit = async (values: z.infer<typeof sprintSchema>) => {
        const success = editingSprint
            ? await updateSprint(editingSprint.id, values)
            : await addSprint(values);

        if (success) {
            toast({ title: 'Success', description: `Sprint ${editingSprint ? 'updated' : 'created'}.` });
            setIsSprintDialogOpen(false);
            setEditingSprint(null);
        } else {
            toast({ variant: 'destructive', title: 'Error', description: `Could not ${editingSprint ? 'update' : 'create'} sprint.` });
        }
    };
    
    const handleDeleteConfirm = async () => {
        if (!deletingSprint) return;
        const success = await deleteSprint(deletingSprint.id);
        if (success) {
            toast({ title: 'Success', description: 'Sprint deleted.' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete sprint.' });
        }
        setDeletingSprint(null);
    }
    
    const handleSetCurrentSprint = async (sprintId: string) => {
        const success = await setCurrentSprint(sprintId);
        if (success) {
            toast({ title: 'Success', description: 'Current sprint updated.' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not set current sprint.' });
        }
    };

    const nextSprint = () => {
        setVisibleSprintIndex((prevIndex) => (prevIndex + 1) % sprintsWithStories.length);
    };

    const prevSprint = () => {
        setVisibleSprintIndex((prevIndex) => (prevIndex - 1 + sprintsWithStories.length) % sprintsWithStories.length);
    };

    return (
        <>
            <div className="flex-1 flex flex-col space-y-4 p-4 md:p-8 pt-6 h-full">
                <PageHeader
                    title="Grooming Board"
                    description="Plan your sprints by organizing the backlog."
                >
                    <Button onClick={() => { setEditingSprint(null); setIsSprintDialogOpen(true); }}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create Sprint
                    </Button>
                </PageHeader>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 overflow-hidden">
                    {/* Backlog Column */}
                    <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col">
                        <h3 className="text-lg font-semibold mb-4">Backlog</h3>
                        <div className="flex-1 space-y-4 overflow-y-auto">
                            {backlogItems.map(story => {
                                const epic = epics.find(e => e.id === story.epicId);
                                const assignee = employees.find(e => e.id === story.assigneeId);
                                const subItems = subItemsByStoryId[story.id] || [];
                                return (
                                    <div key={story.id}>
                                        <StoryItemCard 
                                            story={story} 
                                            epic={epic}
                                            assignee={assignee}
                                            subItems={subItems}
                                            onMove={(newSprintId) => moveStoryToSprint(story.id, newSprintId)}
                                            onEdit={() => setEditingStory(story)}
                                        />
                                        <SubItemsDisplay items={subItems} onCardClick={setEditingStory} users={employees} title="Related Items" />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Sprint Column */}
                    <div className="h-full flex flex-col">
                    {sprintsWithStories.length > 0 ? (
                        <SprintColumn 
                            key={sprintsWithStories[visibleSprintIndex].id} 
                            sprint={sprintsWithStories[visibleSprintIndex]} 
                            stories={sprintsWithStories[visibleSprintIndex].stories} 
                            onEdit={(sprint) => { setEditingSprint(sprint); setIsSprintDialogOpen(true); }}
                            onDelete={(sprint) => setDeletingSprint(sprint)}
                            onSetCurrent={handleSetCurrentSprint}
                            onPrev={prevSprint}
                            onNext={nextSprint}
                            showNav={sprintsWithStories.length > 1}
                            onMoveStory={moveStoryToSprint}
                            onEditStory={setEditingStory}
                        />
                    ) : (
                        <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col items-center justify-center">
                            <p className="text-muted-foreground">No sprints created yet.</p>
                        </div>
                    )}
                    </div>
                </div>
            </div>

        <Dialog open={isSprintDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) setEditingSprint(null); setIsSprintDialogOpen(isOpen); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingSprint ? 'Edit Sprint' : 'Create New Sprint'}</DialogTitle>
                </DialogHeader>
                <Form {...sprintForm}>
                    <form onSubmit={sprintForm.handleSubmit(handleSprintSubmit)} className="space-y-4">
                        <FormField
                            control={sprintForm.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sprint Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="E.g., Sprint 1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={sprintForm.control}
                            name="startDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Start Date</FormLabel>
                                    <FormControl>
                                        <DatePicker date={field.value} setDate={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={sprintForm.control}
                            name="endDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>End Date</FormLabel>
                                    <FormControl>
                                        <DatePicker date={field.value} setDate={field.onChange} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">{editingSprint ? 'Save Changes' : 'Create Sprint'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
        
        <AlertDialog open={!!deletingSprint} onOpenChange={(isOpen) => !isOpen && setDeletingSprint(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the sprint and move all its items back to the backlog.
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

        <Dialog open={!!editingStory} onOpenChange={(isOpen) => !isOpen && setEditingStory(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Story</DialogTitle>
                </DialogHeader>
                <p>Story editing form would go here. For now, it just shows that clicking the card works.</p>
                <DialogFooter>
                    <Button onClick={() => setEditingStory(null)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
        </>
    );
}
