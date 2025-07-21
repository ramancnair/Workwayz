
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, onSnapshot, setDoc, doc, query, where, getDocs, writeBatch } from 'firebase/firestore';
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
import { PlusCircle, ArrowUpDown, Trash2, Folder, Briefcase } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { deleteProjectAndSubcollections } from '@/lib/firebase-helpers';
import { PageHeader } from '@/components/PageHeader';
import { type Portfolio } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Project {
  id: string;
  name: string;
  description?: string;
  portfolioId: string;
}

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required.'),
  description: z.string().optional(),
  portfolioId: z.string().min(1, 'Portfolio is required.'),
});

export default function ProjectsDashboard() {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [filterText, setFilterText] = useState('');
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>({ id: 'name', desc: false });
  const { toast } = useToast();

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: '', description: '', portfolioId: '' },
  });
  
  useEffect(() => {
    if (!db) return;
    const portfolioUnsubscribe = onSnapshot(collection(db, 'portfolios'), (snapshot) => {
      const portfoliosData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Portfolio, 'id'>),
      }));
      setPortfolios(portfoliosData);
    });
    
    const projectUnsubscribe = onSnapshot(collection(db, 'projects'), (snapshot) => {
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

  const onSubmit = async (values: z.infer<typeof projectSchema>) => {
    if (!db) return;
    try {
      const projectId = `P${Date.now()}`;
      const projectRef = doc(db, 'projects', projectId);
      
      await setDoc(projectRef, values);

      toast({ title: 'Success', description: 'Project created successfully.' });
      setIsDialogOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error creating project:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not create project.' });
    }
  };

  const handleDeleteProject = async () => {
    if (!deletingProject) return;
    try {
      await deleteProjectAndSubcollections(deletingProject.id);
      toast({ title: 'Success', description: `Project "${deletingProject.name}" has been deleted.` });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete project.' });
    } finally {
      setDeletingProject(null);
    }
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
    }).filter(p => p.projects.length > 0);
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
           <Link href="/portfolios">
              <Button variant="outline">
                <Briefcase className="mr-2 h-4 w-4" />
                Manage Portfolios
              </Button>
            </Link>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="portfolioId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Portfolio</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a portfolio" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {portfolios.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
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
                          <Textarea placeholder="Describe the project's goals..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="submit">Create Project</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </PageHeader>
        
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
                                 <Button variant="ghost" size="icon" onClick={() => setDeletingProject(project)}>
                                   <Trash2 className="h-4 w-4" />
                                 </Button>
                               </TableCell>
                             </TableRow>
                           ))}
                         </TableBody>
                       </Table>
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
              This action cannot be undone. This will permanently delete the project "{deletingProject?.name}" and all of its associated data (stories, tasks, test cases, etc.).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProject}
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
