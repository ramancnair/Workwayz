
'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useToast } from '@/hooks/use-toast';
import { type Sprint, type Story, type Epic, type User, type WorkItemType, type BugCriticality, type StoryStatus } from '@/types';
import { DatePicker } from '@/components/ui/datepicker';
import { format } from 'date-fns';
import { StoryCard } from '@/components/kanban/TaskCard'; // Re-using for consistency

const sprintSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

function SprintColumn({ sprint, stories }: { sprint: Sprint, stories: Story[] }) {
    return (
        <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col min-w-[320px] w-1/3">
            <h3 className="text-lg font-semibold mb-4">{sprint.title}</h3>
            <div className="flex-1 space-y-4 overflow-y-auto">
                {stories.map(story => (
                    <StoryCard key={story.id} story={story} />
                ))}
            </div>
        </div>
    )
}


export default function GroomingPage() {
    const { 
        stories, 
        sprints,
        projectSettings,
        addSprint,
        updateSprint,
        deleteSprint,
        setCurrentSprint,
    } = useProject();
    const { toast } = useToast();
    
    const [isSprintDialogOpen, setIsSprintDialogOpen] = useState(false);
    const [editingSprint, setEditingSprint] = useState<Sprint | null>(null);

    const backlogItems = useMemo(() => {
        return stories.filter(story => !story.sprintId && ['Requirement/Story', 'Development Task', 'Feature Change'].includes(story.itemType));
    }, [stories]);

    const sprintsWithStories = useMemo(() => {
        return sprints.map(sprint => ({
            ...sprint,
            stories: stories.filter(story => story.sprintId === sprint.id && ['Requirement/Story', 'Development Task', 'Feature Change'].includes(story.itemType)),
        })).sort((a,b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime());
    }, [sprints, stories]);


    const sprintForm = useForm<z.infer<typeof sprintSchema>>({
        resolver: zodResolver(sprintSchema),
        defaultValues: {
            title: '',
            startDate: undefined,
            endDate: undefined,
        },
    });

    const watchedStartDate = useWatch({ control: sprintForm.control, name: "startDate" });

    React.useEffect(() => {
        if (isSprintDialogOpen && editingSprint) {
            sprintForm.reset({
                title: editingSprint.title,
                startDate: editingSprint.startDate ? new Date(editingSprint.startDate) : undefined,
                endDate: editingSprint.endDate ? new Date(editingSprint.endDate) : undefined,
            });
        } else if (isSprintDialogOpen && !editingSprint) {
            sprintForm.reset({
                title: '',
                startDate: undefined,
                endDate: undefined,
            });
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
            <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
                {/* Backlog Column */}
                <div className="bg-muted/50 rounded-lg p-4 h-full flex flex-col min-w-[320px] w-1/3">
                    <h3 className="text-lg font-semibold mb-4">Backlog</h3>
                    <div className="flex-1 space-y-4 overflow-y-auto">
                        {backlogItems.map(story => (
                            <StoryCard key={story.id} story={story} />
                        ))}
                    </div>
                </div>

                {/* Sprint Columns */}
                {sprintsWithStories.map(sprint => (
                    <SprintColumn key={sprint.id} sprint={sprint} stories={sprint.stories} />
                ))}
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
        </>
    );
}
