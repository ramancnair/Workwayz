
'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, ArrowUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  description?: string;
}

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required.'),
  description: z.string().optional(),
});

export default function ProjectsDashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>({ id: 'name', desc: false });
  const { toast } = useToast();

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (!db) return;
    const q = collection(db, 'projects');
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const projectsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Project, 'id'>),
      }));
      setProjects(projectsData);
      setIsLoading(false);
    });
    return () => unsubscribe();
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

  const handleSort = (columnId: string) => {
    if (sorting?.id === columnId) {
      setSorting({ ...sorting, desc: !sorting.desc });
    } else {
      setSorting({ id: columnId, desc: false });
    }
  };

  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter(p => 
      p.name.toLowerCase().includes(filterText.toLowerCase()) ||
      p.id.toLowerCase().includes(filterText.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(filterText.toLowerCase()))
    );

    if (sorting) {
      filtered.sort((a, b) => {
        const valA = (a as any)[sorting.id] || '';
        const valB = (b as any)[sorting.id] || '';
        
        const comparison = valA.localeCompare(valB, undefined, { numeric: true });
        return sorting.desc ? -comparison : comparison;
      });
    }
    return filtered;
  }, [projects, filterText, sorting]);
  
  const SortableHeader = ({ columnId, children, className }: { columnId: string; children: React.ReactNode, className?: string; }) => (
    <TableHead className={className}>
      <Button variant="ghost" onClick={() => handleSort(columnId)}>
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="p-4 border-b">
        <h1 className="text-2xl font-bold">Project Dashboard</h1>
      </header>
      <main className="p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Your Projects</h2>
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
        </div>
        
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
              <p className="p-4 text-center">Loading projects...</p>
            ) : (
            <Table>
                <TableHeader>
                <TableRow>
                    <SortableHeader columnId="id" className="w-[180px]">Project ID</SortableHeader>
                    <SortableHeader columnId="name">Project Name</SortableHeader>
                    <SortableHeader columnId="description">Description</SortableHeader>
                </TableRow>
                </TableHeader>
                <TableBody>
                {filteredAndSortedProjects.map((project) => (
                    <TableRow key={project.id} className="cursor-pointer">
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
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            )}
        </Card>
      </main>
    </div>
  );
}
