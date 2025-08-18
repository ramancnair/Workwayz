
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProject } from '@/context/ProjectContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useToast } from '@/hooks/use-toast';
import { type Environment } from '@/types';
import { format, parseISO } from 'date-fns';
import { DatePicker } from '@/components/ui/datepicker';

const environmentFormSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  renewalDate: z.date().optional(),
});

export default function BusinessContinuityPage() {
  const { environments, addEnvironment, updateEnvironment, deleteEnvironment } = useProject();
  const { toast } = useToast();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);

  const form = useForm<z.infer<typeof environmentFormSchema>>({
    resolver: zodResolver(environmentFormSchema),
  });

  useEffect(() => {
    if (isDialogOpen) {
      if (editingEnvironment) {
        form.reset({
          name: editingEnvironment.name,
          url: editingEnvironment.url || '',
          renewalDate: editingEnvironment.renewalDate ? parseISO(editingEnvironment.renewalDate) : undefined,
        });
      } else {
        form.reset({ name: '', url: '', renewalDate: undefined });
      }
    }
  }, [isDialogOpen, editingEnvironment, form]);
  
  const openDialog = (environment: Environment | null) => {
    setEditingEnvironment(environment);
    setIsDialogOpen(true);
  };
  
  const onSubmit = async (values: z.infer<typeof environmentFormSchema>) => {
    const environmentData = {
      ...values,
      renewalDate: values.renewalDate?.toISOString(),
    };

    const success = editingEnvironment
      ? await updateEnvironment(editingEnvironment.id, environmentData)
      : await addEnvironment(environmentData);

    if (success) {
      toast({ title: 'Success', description: `Environment ${editingEnvironment ? 'updated' : 'added'}.` });
      setIsDialogOpen(false);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save environment.' });
    }
  };

  const handleDelete = async (id: string) => {
    const success = await deleteEnvironment(id);
    if(success) {
      toast({ title: 'Success', description: 'Environment deleted.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete environment.' });
    }
  };

  const sortedEnvironments = [...environments].sort((a,b) => a.order - b.order);

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Business Continuity" description="Manage environment details, URLs, and renewal dates.">
            <Button onClick={() => openDialog(null)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Environment
            </Button>
        </PageHeader>
        <Card>
          <CardHeader>
            <CardTitle>Environments</CardTitle>
            <CardDescription>
              List of all project environments, their access URLs, and certificate renewal dates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Renewal Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEnvironments.map(env => (
                  <TableRow key={env.id}>
                    <TableCell className="font-medium">{env.name}</TableCell>
                    <TableCell>
                      {env.url ? (
                        <a href={env.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                          {env.url}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {env.renewalDate ? format(parseISO(env.renewalDate), 'PPP') : <span className="text-muted-foreground">Not set</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openDialog(env)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(env.id)}>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Staging" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://staging.example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="renewalDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certificate Renewal Date</FormLabel>
                    <FormControl>
                       <DatePicker date={field.value} setDate={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">{editingEnvironment ? 'Save Changes' : 'Add Environment'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
