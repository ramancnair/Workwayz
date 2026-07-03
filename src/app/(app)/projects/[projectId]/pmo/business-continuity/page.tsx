
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
import { type Environment, type CodeRepository } from '@/types';
import { format, parseISO } from 'date-fns';

const environmentFormSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  url: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  renewalDate: z.string().optional(),
});

const repositoryFormSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  url: z.string().url({ message: 'Please enter a valid URL.' }),
  expiryDate: z.string().optional(),
});

export default function BusinessContinuityPage() {
  const { 
    environments, 
    updateEnvironment, 
    codeRepositories, 
    addCodeRepository,
    updateCodeRepository,
    deleteCodeRepository,
    employees,
  } = useProject();
  const { toast } = useToast();
  
  const [isEnvDialogOpen, setIsEnvDialogOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | null>(null);

  const [isRepoDialogOpen, setIsRepoDialogOpen] = useState(false);
  const [editingRepository, setEditingRepository] = useState<CodeRepository | null>(null);

  const envForm = useForm<z.infer<typeof environmentFormSchema>>({
    resolver: zodResolver(environmentFormSchema),
  });

  const repoForm = useForm<z.infer<typeof repositoryFormSchema>>({
    resolver: zodResolver(repositoryFormSchema),
  });
  
  const bcpSupportResources = employees.filter(emp => emp.isBcpSupport);

  const safeParseDate = (dateVal: any) => {
    if (!dateVal) return new Date();
    if (typeof dateVal.toDate === 'function') return dateVal.toDate();
    if (typeof dateVal === 'string') return parseISO(dateVal);
    return new Date(dateVal);
  };

  useEffect(() => {
    if (isEnvDialogOpen) {
      if (editingEnvironment) {
        envForm.reset({
          name: editingEnvironment.name,
          url: editingEnvironment.url || '',
          renewalDate: editingEnvironment.renewalDate ? format(safeParseDate(editingEnvironment.renewalDate), 'yyyy-MM-dd') : '',
        });
      } else {
        envForm.reset({ name: '', url: '', renewalDate: '' });
      }
    }
  }, [isEnvDialogOpen, editingEnvironment, envForm]);

  useEffect(() => {
    if (isRepoDialogOpen) {
      if (editingRepository) {
        repoForm.reset({
          name: editingRepository.name,
          url: editingRepository.url,
          expiryDate: editingRepository.expiryDate ? format(safeParseDate(editingRepository.expiryDate), 'yyyy-MM-dd') : '',
        });
      } else {
        repoForm.reset({ name: '', url: '', expiryDate: '' });
      }
    }
  }, [isRepoDialogOpen, editingRepository, repoForm]);
  
  const openEnvDialog = (environment: Environment | null) => {
    setEditingEnvironment(environment);
    setIsEnvDialogOpen(true);
  };
  
  const onEnvSubmit = async (values: z.infer<typeof environmentFormSchema>) => {
    if (!editingEnvironment) return;
    const environmentData = {
      ...values,
      renewalDate: values.renewalDate ? new Date(values.renewalDate).toISOString() : undefined,
    };

    const success = await updateEnvironment(editingEnvironment.id, environmentData);

    if (success) {
      toast({ title: 'Success', description: 'Environment updated.' });
      setIsEnvDialogOpen(false);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save environment.' });
    }
  };

  const openRepoDialog = (repo: CodeRepository | null) => {
    setEditingRepository(repo);
    setIsRepoDialogOpen(true);
  };

  const onRepoSubmit = async (values: z.infer<typeof repositoryFormSchema>) => {
    const repoData = {
      ...values,
      expiryDate: values.expiryDate ? new Date(values.expiryDate).toISOString() : undefined,
    };

    const success = editingRepository
      ? await updateCodeRepository(editingRepository.id, repoData)
      : await addCodeRepository(repoData);

    if (success) {
      toast({ title: 'Success', description: `Repository ${editingRepository ? 'updated' : 'added'}.` });
      setIsRepoDialogOpen(false);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not save repository.' });
    }
  };

  const handleDeleteRepo = async (id: string) => {
    const success = await deleteCodeRepository(id);
    if(success) {
      toast({ title: 'Success', description: 'Repository deleted.' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete repository.' });
    }
  };


  const sortedEnvironments = [...environments].sort((a,b) => a.order - b.order);

  return (
    <>
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <PageHeader title="Business Continuity" description="Manage environment details, URLs, and renewal dates." />
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
                  <TableHead>Expiry Date</TableHead>
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
                      {env.renewalDate ? format(safeParseDate(env.renewalDate), 'PPP') : <span className="text-muted-foreground">Not set</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEnvDialog(env)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Code Repositories</CardTitle>
                <CardDescription>
                    Manage source code repository URLs and expiry dates.
                </CardDescription>
            </div>
            <Button onClick={() => openRepoDialog(null)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Repository
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codeRepositories.map(repo => (
                  <TableRow key={repo.id}>
                    <TableCell className="font-medium">{repo.name}</TableCell>
                    <TableCell>
                      <a href={repo.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {repo.url}
                      </a>
                    </TableCell>
                    <TableCell>
                      {repo.expiryDate ? format(safeParseDate(repo.expiryDate), 'PPP') : <span className="text-muted-foreground">Not set</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openRepoDialog(repo)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRepo(repo.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
            <CardHeader>
                <CardTitle>BCP Support Resources</CardTitle>
                <CardDescription>
                    A list of resources designated for Business Continuity Planning support.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Email</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bcpSupportResources.map(user => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                                <TableCell>{user.role || 'N/A'}</TableCell>
                                <TableCell>{user.phone}</TableCell>
                                <TableCell>{user.email}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

      </div>

      <Dialog open={isEnvDialogOpen} onOpenChange={setIsEnvDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Environment</DialogTitle>
          </DialogHeader>
          <Form {...envForm}>
            <form onSubmit={envForm.handleSubmit(onEnvSubmit)} className="space-y-4">
               <FormField
                control={envForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Staging" {...field} disabled />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={envForm.control}
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
                control={envForm.control}
                name="renewalDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certificate Expiry Date</FormLabel>
                    <FormControl>
                       <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isRepoDialogOpen} onOpenChange={setIsRepoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRepository ? 'Edit Repository' : 'Add New Repository'}</DialogTitle>
          </DialogHeader>
          <Form {...repoForm}>
            <form onSubmit={repoForm.handleSubmit(onRepoSubmit)} className="space-y-4">
               <FormField
                control={repoForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="E.g., Frontend App" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={repoForm.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL</FormLabel>
                    <FormControl>
                      <Input type="url" placeholder="https://github.com/user/repo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={repoForm.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expiry Date</FormLabel>
                    <FormControl>
                       <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">{editingRepository ? 'Save Changes' : 'Add Repository'}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
