
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
import { type Release } from '@/types';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

const releaseSchema = z.object({
  name: z.string().min(1, 'Release name is required.'),
  description: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required.'),
  endDate: z.string().min(1, 'End date is required.'),
});

export default function ReleasesPage() {
  const { releases, addRelease, updateRelease, deleteRelease } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Release | null>(null);
  const [deletingRelease, setDeletingRelease] = useState<Release | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof releaseSchema>>({
    resolver: zodResolver(releaseSchema),
  });

  useEffect(() => {
    if (isDialogOpen) {
      if (editingRelease) {
        form.reset({
          name: editingRelease.name,
          description: editingRelease.description,
          startDate: format(new Date(editingRelease.startDate), 'yyyy-MM-dd'),
          endDate: format(new Date(editingRelease.endDate), 'yyyy-MM-dd'),
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
  }, [isDialogOpen, editingRelease, form]);

  const handleDialogOpen = (release: Release | null) => {
    setEditingRelease(release);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingRelease) return;
    const success = await deleteRelease(deletingRelease.id);
    if (success) {
      toast({ title: "Success", description: "Release deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete release." });
    }
    setDeletingRelease(null);
  };

  const onSubmit = async (values: z.infer<typeof releaseSchema>) => {
    setIsSubmitting(true);
    const releaseData = {
        name: values.name,
        description: values.description || '',
        startDate: new Date(values.startDate),
        endDate: new Date(values.endDate),
    };

    const success = editingRelease
      ? await updateRelease(editingRelease.id, releaseData)
      : await addRelease(releaseData);

    if (success) {
      toast({ title: "Success", description: `Release ${editingRelease ? 'updated' : 'added'} successfully.` });
      setIsDialogOpen(false);
      setEditingRelease(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingRelease ? 'update' : 'add'} release.` });
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Project Releases" description="Manage all project release cycles.">
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Release
          </Button>
        </PageHeader>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Release ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="w-[40%]">Description</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {releases.map((release) => (
                <TableRow key={release.id}>
                  <TableCell className="font-medium">{release.releaseId}</TableCell>
                  <TableCell>{release.name}</TableCell>
                  <TableCell className="break-words">{release.description}</TableCell>
                  <TableCell>{format(new Date(release.startDate), 'PPP')}</TableCell>
                  <TableCell>{format(new Date(release.endDate), 'PPP')}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(release)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingRelease(release)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingRelease(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRelease ? 'Edit Release' : 'Add New Release'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Release Name</FormLabel>
                    <FormControl><Input placeholder="E.g., Q3 2024 Release" {...field} /></FormControl>
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
                    <FormControl><Textarea placeholder="Describe the main goals of this release..." {...field} rows={4} /></FormControl>
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
                  {isSubmitting ? (editingRelease ? 'Saving...' : 'Creating...') : (editingRelease ? 'Save Changes' : 'Create Release')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingRelease} onOpenChange={(isOpen) => !isOpen && setDeletingRelease(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the release "{deletingRelease?.name}".
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
