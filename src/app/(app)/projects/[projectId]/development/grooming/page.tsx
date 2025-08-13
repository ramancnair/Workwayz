
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { PlusCircle, Edit, Trash2, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { type Sprint, type Story } from '@/types';
import { DatePicker } from '@/components/ui/datepicker';
import { cn } from '@/lib/utils';
import { StoryCard } from '@/components/kanban/TaskCard';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  Active,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';


const sprintSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

function SprintColumn({ 
  sprint, 
  stories,
  onEdit,
  onDelete,
  onSetCurrent,
  onPrev,
  onNext,
  showNav,
}: { 
  sprint: Sprint, 
  stories: Story[],
  onEdit: (sprint: Sprint) => void,
  onDelete: (sprint: Sprint) => void,
  onSetCurrent: (sprintId: string) => void,
  onPrev: () => void,
  onNext: () => void,
  showNav: boolean,
}) {
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
              <SortableContext items={stories.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {stories.map(story => (
                      <StoryCard key={story.id} story={story} />
                  ))}
              </SortableContext>
            </div>
        </div>
    )
}

function DroppableColumn({ id, title, children, items }: { id: string, title: string, children: React.ReactNode, items: Story[] }) {
  return (
    <div id={id} className="bg-muted/50 rounded-lg p-4 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="flex-1 space-y-4 overflow-y-auto">
        <SortableContext items={items.map(item => item.id)} strategy={verticalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </div>
  );
}


export default function GroomingPage() {
    const { 
        stories, 
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
    const [visibleSprintIndex, setVisibleSprintIndex] = useState(0);
    const [activeStory, setActiveStory] = useState<Story | null>(null);

    const backlogItems = useMemo(() => {
        return stories.filter(story => !story.sprintId && ['Requirement/Story', 'Development Task', 'Feature Change'].includes(story.itemType));
    }, [stories]);

    const sprintsWithStories = useMemo(() => {
        return sprints.map(sprint => ({
            ...sprint,
            stories: stories.filter(story => story.sprintId === sprint.id && ['Requirement/Story', 'Development Task', 'Feature Change'].includes(story.itemType)),
        })).sort((a,b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime());
    }, [sprints, stories]);
    
    const sensors = useSensors(useSensor(PointerSensor));

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
    
    const handleDragStart = (event: { active: Active }) => {
      const { active } = event;
      const story = stories.find(s => s.id === active.id);
      setActiveStory(story || null);
    };
    
    const handleDragEnd = (event: DragEndEvent) => {
        setActiveStory(null);
        const { active, over } = event;
    
        if (over && active.id !== over.id) {
            const storyId = active.id as string;
            // The droppable area for a sprint is now the sprint column itself, which has the sprint ID.
            const newSprintId = over.id === 'backlog-column' ? null : over.id as string;
            
            const story = stories.find(s => s.id === storyId);
            if (story && story.sprintId !== newSprintId) {
                moveStoryToSprint(storyId, newSprintId);
            }
        }
    };

    return (
        <>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
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
                    <DroppableColumn id="backlog-column" title="Backlog" items={backlogItems}>
                      {backlogItems.map(story => (
                        <StoryCard key={story.id} story={story} />
                      ))}
                    </DroppableColumn>

                    {/* Sprint Column */}
                    <div className="h-full flex flex-col">
                    {sprintsWithStories.length > 0 ? (
                        <DroppableColumn id={sprintsWithStories[visibleSprintIndex].id} title="" items={sprintsWithStories[visibleSprintIndex].stories}>
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
                          />
                        </DroppableColumn>
                    ) : (
                        <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col items-center justify-center">
                            <p className="text-muted-foreground">No sprints created yet.</p>
                        </div>
                    )}
                    </div>
                </div>
            </div>
            {createPortal(
                <DragOverlay>
                    {activeStory ? <StoryCard story={activeStory} /> : null}
                </DragOverlay>,
                document.body
            )}
        </DndContext>

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
        </>
    );
}

