
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, onSnapshot, setDoc, doc, query, where, getDocs, writeBatch, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, ArrowUpDown, Trash2, Folder, Briefcase, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { deleteProjectAndSubcollections } from '@/lib/firebase-helpers';
import { PageHeader } from '@/components/PageHeader';
import { type Portfolio, type Project, type ProjectType, type ProjectMethodology, type PricingModel } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const projectTypes: ProjectType[] = ['Initial Estimation', 'Project', 'Support', 'Change Request'];
const projectMethodologies: ProjectMethodology[] = ['Agile', 'SDLC'];
const pricingModels: PricingModel[] = ['Fixed Bid', 'T&M', 'Fixed Capacity'];

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required.'),
  description: z.string().optional(),
  portfolioId: z.string().min(1, 'Portfolio is required.'),
  projectType: z.enum(projectTypes).optional(),
  methodology: z.enum(projectMethodologies).optional(),
  pricingModel: z.enum(pricingModels).optional(),
});

function ProjectDialogContent({
  form,
  onSubmit,
  editingProject,
  portfolios
}: {
  form: any;
  onSubmit: (values: z.infer<typeof projectSchema>) => void;
  editingProject: Project | null;
  portfolios: Portfolio[];
}) {
  const watchedProjectType = useWatch({
    control: form.control,
    name: 'projectType',
  });

  useEffect(() => {
    if (watchedProjectType === 'Initial Estimation') {
      form.setValue('methodology', undefined, { shouldValidate: true });
      form.setValue('pricingModel', undefined, { shouldValidate: true });
    } else if (watchedProjectType === 'Support') {
      form.setValue('methodology', 'Agile', { shouldValidate: true });
    }
  }, [watchedProjectType, form]);

  const isMethodologyDisabled = watchedProjectType === 'Initial Estimation' || watchedProjectType === 'Support';
  const isPricingModelDisabled = watchedProjectType === 'Initial Estimation';

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="portfolioId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Portfolio</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a portfolio" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {portfolios.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Name</FormLabel>
                <FormControl>
                  <Input placeholder="E.g., Q3 Marketing Campaign" {...field} />
                </FormControl>
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
                <FormControl>
                  <Textarea placeholder="Describe the project's goals..." {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="projectType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectTypes.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="methodology"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Methodology</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isMethodologyDisabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectMethodologies.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pricingModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pricing Model</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isPricingModelDisabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pricingModels.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="submit">{editingProject ? 'Save Changes' : 'Create Project'}</Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

export default function ProjectsDashboard() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [filterText, setFilterText] = useState('');
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>({ id: 'name', desc: false });
  const { toast } = useToast();

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: '', description: '', portfolioId: '', projectType: 'Project', methodology: 'Agile', pricingModel: 'T&M' },
  });
  
  useEffect(() => {
    if (!db) return;
    const portfolioUnsubscribe = onSnapshot(query(collection(db, 'portfolios'), where('isDeleted', '!=', true)), (snapshot) => {
      const portfoliosData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Portfolio, 'id'>),
      }));
      setPortfolios(portfoliosData);
    });
    
    const projectUnsubscribe = onSnapshot(query(collection(db, 'projects'), where('isDeleted', '!=', true)), (snapshot) => {
        const projectsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Project, 'id'>),
        }));
        setProjects(projectsData);
        setIsLoading(false);
    });

    return () => {
        portfolioUnsubscribe();
        projectUnsubscribe();
    };
  }, []);
  
  useEffect(() => {
    if (isDialogOpen) {
      if (editingProject) {
        form.reset(editingProject);
      } else {
        form.reset({ name: '', description: '', portfolioId: '', projectType: 'Project', methodology: 'Agile', pricingModel: 'T&M' });
      }
    }
  }, [isDialogOpen, editingProject, form]);


  const onSubmit = async (values: z.infer<typeof projectSchema>) => {
    if (!db) return;
    try {
      if (editingProject) {
        const projectRef = doc(db, 'projects', editingProject.id);
        await updateDoc(projectRef, values);
        toast({ title: 'Success', description: 'Project updated successfully.' });
      } else {
        const projectId = `P${Date.now()}`;
        const projectRef = doc(db, 'projects', projectId);
        await setDoc(projectRef, { ...values, id: projectId, isDeleted: false });
        toast({ title: 'Success', description: 'Project created successfully.' });
      }

      setIsDialogOpen(false);
      setEditingProject(null);
      form.reset();
    } catch (error) {
      console.error('Error saving project:', error);
      toast({ variant: 'destructive', title: 'Error', description: `Could not ${editingProject ? 'update' : 'create'} project.` });
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    try {
      // Soft delete the project
      const projectRef = doc(db, 'projects', deletingProject.id);
      await updateDoc(projectRef, { isDeleted: true, deletedAt: Timestamp.now() });
      toast({ title: 'Success', description: `Project "${deletingProject.name}" moved to Trash.` });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete project.' });
    } finally {
      setDeletingProject(null);
    }
  };
  
  const handleOpenDialog = (project: Project | null) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };


  const handleSort = (columnId: string) => {
    if (sorting?.id === columnId) {
      setSorting({ ...sorting, desc: !sorting.desc });
    } else {
      setSorting({ id: columnId, desc: false });
    }
  };

  const projectsByPortfolio = useMemo(() => {
    return portfolios.map(portfolio => {
        let filtered = projects.filter(p => 
            p.portfolioId === portfolio.id && (
                p.name.toLowerCase().includes(filterText.toLowerCase()) ||
                p.id.toLowerCase().includes(filterText.toLowerCase()) ||
                (p.description && p.description.toLowerCase().includes(filterText.toLowerCase()))
            )
        );

        if (sorting) {
            filtered.sort((a, b) => {
                const valA = (a as any)[sorting.id] || '';
                const valB = (b as any)[sorting.id] || '';
                const comparison = valA.localeCompare(valB, undefined, { numeric: true });
                return sorting.desc ? -comparison : comparison;
            });
        }
        return { ...portfolio, projects: filtered };
    });
  }, [projects, portfolios, filterText, sorting]);
  
  const SortableHeader = ({ columnId, children, className }: { columnId: string; children: React.ReactNode, className?: string; }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(columnId)}>
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  return (
    <>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="PM Dashboard" description="Manage all your portfolios and projects.">
          <Button onClick={() => handleOpenDialog(null)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </PageHeader>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <ProjectDialogContent 
            form={form} 
            onSubmit={onSubmit}
            editingProject={editingProject} 
            portfolios={portfolios}
          />
        </Dialog>

        <Card>
            <CardContent className="p-4">
                <Input 
                    placeholder="Filter projects by ID, name, or description..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="max-w-sm"
                />
            </CardContent>
             {isLoading ? (
              <p className="p-4 text-center">Loading...</p>
            ) : (
             <Accordion type="multiple" defaultValue={portfolios.map(p => p.id)} className="w-full">
                {projectsByPortfolio.map(portfolio => (
                   <AccordionItem value={portfolio.id} key={portfolio.id}>
                     <AccordionTrigger className="px-6 py-4 bg-muted/50 hover:bg-muted/80">
                       <div className="flex items-center gap-2">
                         <Folder className="h-5 w-5" />
                         <span className="font-semibold">{portfolio.name}</span>
                       </div>
                     </AccordionTrigger>
                     <AccordionContent className="p-0">
                       {portfolio.projects.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <SortableHeader columnId="id" className="w-[180px]">Project ID</SortableHeader>
                              <SortableHeader columnId="name">Project Name</SortableHeader>
                              <SortableHeader columnId="description">Description</SortableHeader>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {portfolio.projects.map((project) => (
                              <TableRow key={project.id}>
                                <TableCell className="font-medium">
                                  <Link href={`/projects/${project.id}/dashboard/development`} className="block w-full h-full">
                                    {project.id}
                                  </Link>
                                </TableCell>
                                <TableCell>
                                  <Link href={`/projects/${project.id}/dashboard/development`} className="block w-full h-full">
                                    {project.name}
                                  </Link>
                                </TableCell>
                                <TableCell>
                                  <Link href={`/projects/${project.id}/dashboard/development`} className="block w-full h-full">
                                    {project.description}
                                  </Link>
                                </TableCell>
                                <TableCell className="text-right">
                                   <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(project)}>
                                     <Edit className="h-4 w-4" />
                                   </Button>
                                   <Button variant="ghost" size="icon" onClick={() => setDeletingProject(project)}>
                                     <Trash2 className="h-4 w-4" />
                                   </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                       ) : (
                        <div className="text-center p-4 text-sm text-muted-foreground">
                            No projects found for this portfolio.
                        </div>
                       )}
                     </AccordionContent>
                   </AccordionItem>
                ))}
             </Accordion>
            )}
        </Card>
      </div>
    <AlertDialog open={!!deletingProject} onOpenChange={(isOpen) => !isOpen && setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the project "{deletingProject?.name}" to the Trash. It will be permanently deleted after 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProject}
              className={cn(buttonVariants({ variant: 'destructive' }))}
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
