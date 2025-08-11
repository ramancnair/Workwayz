
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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { type Environment } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";

const environmentSchema = z.object({
  name: z.string().min(1, 'Environment name is required.'),
});

export default function EnvironmentsPage() {
  const { environments, addEnvironment, updateEnvironment, deleteEnvironment } = useProject();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);
  const [deletingEnvironment, setDeletingEnvironment] = useState<Environment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof environmentSchema>>({
    resolver: zodResolver(environmentSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (isDialogOpen) {
      if (editingEnvironment) {
        form.reset({ name: editingEnvironment.name });
      } else {
        form.reset({ name: '' });
      }
    }
  }, [isDialogOpen, editingEnvironment, form]);

  const handleDialogOpen = (environment: Environment | null) => {
    setEditingEnvironment(environment);
    setIsDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEnvironment) return;
    const success = await deleteEnvironment(deletingEnvironment.id);
    if (success) {
      toast({ title: "Success", description: "Environment deleted." });
    } else {
      toast({ variant: "destructive", title: "Error", description: "Could not delete environment." });
    }
    setDeletingEnvironment(null);
  };

  const onSubmit = async (values: z.infer<typeof environmentSchema>) => {
    setIsSubmitting(true);
    const success = editingEnvironment
      ? await updateEnvironment(editingEnvironment.id, values)
      : await addEnvironment(values);

    if (success) {
      toast({ title: "Success", description: `Environment ${editingEnvironment ? 'updated' : 'added'} successfully.` });
      setIsDialogOpen(false);
      setEditingEnvironment(null);
    } else {
      toast({ variant: "destructive", title: "Error", description: `Could not ${editingEnvironment ? 'update' : 'add'} environment.` });
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Environments" description="Manage common testing environments for the project.">
          <Button onClick={() => handleDialogOpen(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Environment
          </Button>
        </PageHeader>
        <Card>
          <CardContent className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {environments.map((env) => (
                  <TableRow key={env.id}>
                    <TableCell className="font-medium">{env.name}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(env)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeletingEnvironment(env)}>
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

      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) setEditingEnvironment(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEnvironment ? 'Edit Environment' : 'Add New Environment'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Environment Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Staging" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (editingEnvironment ? 'Saving...' : 'Creating...') : (editingEnvironment ? 'Save Changes' : 'Add Environment')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!deletingEnvironment} onOpenChange={(isOpen) => !isOpen && setDeletingEnvironment(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the environment.
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
