
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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { type Release, type ReleaseItemType } from '@/types';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

const releaseSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().min(1, 'End date is required.'),
});

export default function ReleasesPage() {
  const { releasesAndMilestones, addReleaseOrMilestone, updateReleaseOrMilestone, deleteReleaseOrMilestone } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Release | null>(null);
  const [deletingItem, setDeletingItem] = useState<Release | null>(null);
  const [itemTypeToAdd, setItemTypeToAdd] = useState<ReleaseItemType>('Release');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof releaseSchema>>({
    resolver: zodResolver(releaseSchema),
  });
  
  const dialogTitle = editingItem ? `Edit ${editingItem.itemType}` : `Add New ${itemTypeToAdd}`;

  useEffect(() => {
    if (isDialogOpen) {
      if (editingItem) {
        form.reset({
          name: editingItem.name,
          description: editingItem.description,
          startDate: format(new Date(editingItem.startDate), 'yyyy-MM-dd'),
          endDate: format(new Date(editingItem.endDate), 'yyyy-MM-dd'),
        });
      } else {
        form.reset({
          name: '',
          description: '',
          startDate: '',
          endDate: '',
        });
      }
    }
  }, [isDialogOpen, editingItem, form]);

  const handleDialogOpen = (item: Release | null, type: ReleaseItemType = 'Release') => {
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

  const onSubmit = async (values: z.infer<typeof releaseSchema>) => {
    setIsSubmitting(true);
    const releaseData = {
        name: values.name,
        description: values.description || '',
        startDate: new Date(values.startDate),
        endDate: new Date(values.endDate),
    };

    const currentItemType = editingItem?.itemType || itemTypeToAdd;

    const success = editingItem
      ? await updateReleaseOrMilestone(editingItem.id, releaseData)
      : await addReleaseOrMilestone({ ...releaseData, itemType: currentItemType });

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
        <PageHeader title="Releases & Milestones" description="Manage all project release cycles and key milestones.">
          <Button onClick={() => handleDialogOpen(null, 'Release')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Release
          </Button>
           <Button onClick={() => handleDialogOpen(null, 'Milestone')}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Milestone
          </Button>
        </PageHeader>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[40%]">Description</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releasesAndMilestones.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.releaseId}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell className="break-words">{item.description}</TableCell>
                  <TableCell>{format(new Date(item.startDate), 'PPP')}</TableCell>
                  <TableCell>{format(new Date(item.endDate), 'PPP')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(item)}>
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
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl><Input placeholder={`E.g., Q3 2024 ${editingItem?.itemType || itemTypeToAdd}`} {...field} /></FormControl>
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
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (editingItem ? 'Saving...' : 'Creating...') : (editingItem ? 'Save Changes' : `Create ${editingItem?.itemType || itemTypeToAdd}`)}
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
