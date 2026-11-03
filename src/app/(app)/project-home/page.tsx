

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { collection, onSnapshot, setDoc, doc, query, where, getDocs, writeBatch, updateDoc, Timestamp, isSupabaseActive } from '@/lib/db-provider';
import { db } from '@/lib/db-provider';
import { initFirebaseClient } from '@/lib/firebase';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, ArrowUpDown, Trash2, Folder, Briefcase, Edit, ChevronRight, ChevronDown, Archive, RotateCcw, Bot, Search, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { deleteProjectAndSubcollections } from '@/lib/firebase-helpers';
import { PageHeader } from '@/components/PageHeader';
import { isAssignableToProject } from '@/lib/permissions';
import { type Portfolio, type Project, type PricingModel, type User, type ProjectStatus, type RagStatus } from '@/types';
import { matchesProjectTab, getPortfolioTabStats, type ProjectDashboardTab } from '@/lib/project-tab-filter';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ThemedAutocomplete } from '@/components/ui/themed-autocomplete';

const pricingModels: PricingModel[] = ['Fixed Bid', 'T&M'];
const projectStatuses: ProjectStatus[] = ['Initial Estimation', 'Not Started', 'Active', 'On Hold', 'Completed', 'Cancelled'];

const statusStyles: Record<ProjectStatus, string> = {
  'Initial Estimation': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Not Started': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  'Active': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'On Hold': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const ragStatusStyles: Record<RagStatus, string> = {
  'Green': 'bg-green-500',
  'Amber': 'bg-yellow-500',
  'Red': 'bg-red-500',
};


const portfolioSchema = z.object({
  name: z.string().min(1, 'Portfolio name is required.').max(60, 'Portfolio name cannot exceed 60 characters.'),
  description: z.string().max(300, 'Portfolio description cannot exceed 300 characters.').optional(),
});

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required.').max(60, 'Project name cannot exceed 60 characters.'),
  portfolioId: z.string().min(1, 'Portfolio is required.'),
  projectManagerId: z.string().optional(),
  pricingModel: z.enum(['Fixed Bid', 'T&M'] as const).optional(),
  status: z.enum(['Initial Estimation', 'Not Started', 'Active', 'On Hold', 'Completed', 'Cancelled'] as const).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isArchived: z.boolean().optional(),
});

function HealthIndicator({ status, label }: { status?: RagStatus; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("h-3 w-3 rounded-full", status ? ragStatusStyles[status] : 'bg-gray-300')} />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function ProjectDialogContent({
  form,
  onSubmit,
  editingProject,
  portfolios,
  users,
}: {
  form: any;
  onSubmit: (values: z.infer<typeof projectSchema>) => void;
  editingProject: Project | null;
  portfolios: Portfolio[];
  users: User[];
}) {
  const pmOptions = useMemo(() => users
    .filter(user => !user.isDeleted && user.isEnabled !== false && !!user.empId && user.empId.trim() !== '' && isAssignableToProject(user))
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, undefined, { numeric: true, sensitivity: 'base' }))
    .map(user => ({
      value: user.id,
      label: `${user.firstName} ${user.lastName} (${user.empId.trim()})`
    })), [users]);

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
                    {[...portfolios].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })).map((p) => (
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
                  <Input placeholder="E.g., Q3 Marketing Campaign" {...field} maxLength={60} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="startDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Project Start Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="endDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Project End Date</FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="projectManagerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Manager</FormLabel>
                  <FormControl>
                    <ThemedAutocomplete
                      id="project-manager-autocomplete"
                      value={field.value}
                      onChange={field.onChange}
                      options={pmOptions}
                      placeholder="Select a Project Manager..."
                      emptyText="No matching project managers found."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {projectStatuses.map((p) => (
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="pricingModel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pricing Model</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
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
          {editingProject && form.watch('status') !== 'Initial Estimation' && form.watch('status') !== 'Active' && (
            <FormField
              control={form.control}
              name="isArchived"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-muted/30">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">Inactive Project</FormLabel>
                    <FormDescription className="text-xs">
                      Mark this project as inactive to move it to the Inactive Projects tab.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          )}
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
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPortfolioDialogOpen, setIsPortfolioDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [deletingPortfolio, setDeletingPortfolio] = useState<Portfolio | null>(null);
  const [archivingProject, setArchivingProject] = useState<Project | null>(null);
  const [filterText, setFilterText] = useState('');
  const [sorting, setSorting] = useState<{ id: string; desc: boolean } | null>({ id: 'name', desc: false });
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<ProjectDashboardTab>('active');

  const [activeExpanded, setActiveExpanded] = useState<string[]>([]);
  const [estimatesExpanded, setEstimatesExpanded] = useState<string[]>([]);
  const [archiveExpanded, setArchiveExpanded] = useState<string[]>([]);

  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: { name: '', portfolioId: '', pricingModel: 'T&M', projectManagerId: '', status: 'Initial Estimation', isArchived: false },
  });

  const portfolioForm = useForm<z.infer<typeof portfolioSchema>>({
    resolver: zodResolver(portfolioSchema),
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    let isMounted = true;
    let portfolioUnsubscribe = () => {};
    let projectUnsubscribe = () => {};
    let usersUnsubscribe = () => {};

    // Safety timeout: ensure loading state never hangs indefinitely
    const safetyTimer = setTimeout(() => {
      if (isMounted) setIsLoading(false);
    }, 3500);

    const setupListeners = async () => {
      if (!isSupabaseActive()) {
        try {
          await initFirebaseClient();
        } catch (_) {}
      }

      if (!isMounted) return;

      const portfolioCol = collection(db, 'portfolios');
      if (portfolioCol) {
        portfolioUnsubscribe = onSnapshot(query(portfolioCol, where('isDeleted', '!=', true)), (snapshot: any) => {
          if (!isMounted) return;
          const portfoliosData = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...(doc.data() as Omit<Portfolio, 'id'>),
          }));
          setPortfolios(portfoliosData);
        }, (err: any) => {
          console.warn('[ProjectHome] Portfolios listener error:', err);
        });
      }

      const projectCol = collection(db, 'projects');
      if (projectCol) {
        projectUnsubscribe = onSnapshot(query(projectCol, where('isDeleted', '!=', true)), (snapshot: any) => {
          if (!isMounted) return;
          clearTimeout(safetyTimer);
          const projectsData = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...(doc.data() as Omit<Project, 'id'>),
          }));
          setProjects(projectsData);
          setIsLoading(false);
        }, (err: any) => {
          console.warn('[ProjectHome] Projects listener error:', err);
          if (isMounted) setIsLoading(false);
        });
      } else {
        if (isMounted) setIsLoading(false);
      }

      const usersCol = collection(db, 'employees');
      if (usersCol) {
        usersUnsubscribe = onSnapshot(query(usersCol, where('isDeleted', '!=', true)), (snapshot: any) => {
          if (!isMounted) return;
          const usersData = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...(doc.data() as Omit<User, 'id'>),
          }));
          setUsers(usersData);
        }, (err: any) => {
          console.warn('[ProjectHome] Users listener error:', err);
        });
      }
    };

    setupListeners();

    return () => {
      isMounted = false;
      clearTimeout(safetyTimer);
      if (typeof portfolioUnsubscribe === 'function') portfolioUnsubscribe();
      if (typeof projectUnsubscribe === 'function') projectUnsubscribe();
      if (typeof usersUnsubscribe === 'function') usersUnsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isDialogOpen) {
      if (editingProject) {
        form.reset({
          ...editingProject,
          name: (editingProject.name || '').slice(0, 60),
          pricingModel: editingProject.pricingModel || 'T&M',
          projectManagerId: editingProject.projectManagerId || '',
          status: editingProject.status || 'Initial Estimation',
          startDate: editingProject.startDate ? format(parseISO(editingProject.startDate), 'yyyy-MM-dd') : '',
          endDate: editingProject.endDate ? format(parseISO(editingProject.endDate), 'yyyy-MM-dd') : '',
          isArchived: !!editingProject.isArchived,
        });
      } else {
        form.reset({ name: '', portfolioId: '', pricingModel: 'T&M', projectManagerId: '', status: 'Initial Estimation', startDate: '', endDate: '', isArchived: false });
      }
    }
  }, [isDialogOpen, editingProject, form]);


  useEffect(() => {
    if (isPortfolioDialogOpen) {
      if (editingPortfolio) {
        portfolioForm.reset({
          name: (editingPortfolio.name || '').slice(0, 60),
          description: (editingPortfolio.description || '').slice(0, 300),
        });
      } else {
        portfolioForm.reset({ name: '', description: '' });
      }
    }
  }, [isPortfolioDialogOpen, editingPortfolio, portfolioForm]);

  const onPortfolioSubmit = async (values: z.infer<typeof portfolioSchema>) => {
    if (!db) return;
    const isDuplicate = portfolios.some(
      p => p.name.trim().toLowerCase() === values.name.trim().toLowerCase() && p.id !== editingPortfolio?.id
    );
    if (isDuplicate) {
      portfolioForm.setError('name', {
        type: 'manual',
        message: 'A portfolio with this name already exists.',
      });
      return;
    }
    try {
      if (editingPortfolio) {
        const portfolioRef = doc(db, 'portfolios', editingPortfolio.id);
        await updateDoc(portfolioRef, { name: values.name, description: values.description || '' });
        toast({ title: 'Success', description: 'Portfolio updated successfully.' });
      } else {
        const portfoliosSnapshot = await getDocs(collection(db, 'portfolios'));
        const existingIds = portfoliosSnapshot.docs
          .map((doc: any) => parseInt(doc.id.replace('PF', ''), 10))
          .filter((num: number) => !isNaN(num));
        const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
        const portfolioId = `PF${nextId.toString().padStart(3, '0')}`;

        const newPortfolioRef = doc(db, 'portfolios', portfolioId);
        await setDoc(newPortfolioRef, {
          id: portfolioId,
          name: values.name,
          description: values.description || '',
          isDeleted: false,
          createdAt: Timestamp.now(),
        });
        toast({ title: 'Success', description: 'Portfolio created successfully.' });
      }
      setIsPortfolioDialogOpen(false);
      setEditingPortfolio(null);
      portfolioForm.reset();
    } catch (error) {
      console.error('Error saving portfolio:', error);
      toast({ variant: 'destructive', title: 'Error', description: `Could not ${editingPortfolio ? 'update' : 'create'} portfolio.` });
    }
  };

  const getPortfolioProjectStats = useCallback((portfolioId: string) => {
    const portfolioProjects = projects.filter(p => p.portfolioId === portfolioId && !p.isDeleted);
    return getPortfolioTabStats(portfolioProjects);
  }, [projects]);

  const getPortfolioProjectCount = useCallback((portfolioId: string) => {
    return projects.filter(p => p.portfolioId === portfolioId && !p.isDeleted).length;
  }, [projects]);

  const handleDeletePortfolio = async () => {
    if (!deletingPortfolio || !db) return;
    try {
      // Allow only empty portfolios to be deleted
      const portfolioProjects = projects.filter(p => p.portfolioId === deletingPortfolio.id && !p.isDeleted);
      if (portfolioProjects.length > 0) {
        const activeCount = portfolioProjects.filter(p => !p.isArchived).length;
        const inactiveCount = portfolioProjects.filter(p => !!p.isArchived).length;
        let detail = `${portfolioProjects.length} project(s)`;
        if (activeCount === 0 && inactiveCount > 0) {
          detail = `${inactiveCount} inactive project${inactiveCount === 1 ? '' : 's'} (under Inactive Projects tab)`;
        } else if (activeCount > 0 && inactiveCount > 0) {
          detail = `${portfolioProjects.length} projects (${activeCount} active, ${inactiveCount} inactive)`;
        } else if (activeCount > 0) {
          detail = `${activeCount} active project${activeCount === 1 ? '' : 's'}`;
        }

        toast({
          variant: 'destructive',
          title: 'Cannot Delete Portfolio',
          description: `Only empty portfolios can be deleted. "${deletingPortfolio.name}" currently contains ${detail}.`,
        });
        setDeletingPortfolio(null);
        return;
      }

      // Live database verification against race conditions
      const projectsSnapshot = await getDocs(
        query(collection(db, 'projects'), where('portfolioId', '==', deletingPortfolio.id))
      );
      const liveProjects = projectsSnapshot.docs.filter((d: any) => !d.data()?.isDeleted);
      if (liveProjects.length > 0) {
        const activeCount = liveProjects.filter((d: any) => !d.data()?.isArchived).length;
        const inactiveCount = liveProjects.filter((d: any) => !!d.data()?.isArchived).length;
        let detail = `${liveProjects.length} project(s)`;
        if (activeCount === 0 && inactiveCount > 0) {
          detail = `${inactiveCount} inactive project${inactiveCount === 1 ? '' : 's'} (under Inactive Projects tab)`;
        } else if (activeCount > 0 && inactiveCount > 0) {
          detail = `${liveProjects.length} projects (${activeCount} active, ${inactiveCount} inactive)`;
        } else if (activeCount > 0) {
          detail = `${activeCount} active project${activeCount === 1 ? '' : 's'}`;
        }

        toast({
          variant: 'destructive',
          title: 'Cannot Delete Portfolio',
          description: `Only empty portfolios can be deleted. "${deletingPortfolio.name}" currently contains ${detail}.`,
        });
        setDeletingPortfolio(null);
        return;
      }

      const portfolioRef = doc(db, 'portfolios', deletingPortfolio.id);
      await updateDoc(portfolioRef, { isDeleted: true, deletedAt: Timestamp.now() });

      toast({ title: 'Success', description: `Portfolio "${deletingPortfolio.name}" moved to Trash.` });
    } catch (error) {
      console.error('Error deleting portfolio:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete portfolio.' });
    } finally {
      setDeletingPortfolio(null);
    }
  };

  const onSubmit = async (values: z.infer<typeof projectSchema>) => {
    if (!db) return;
    try {
      if (!values.startDate) {
        form.setError('startDate', { type: 'manual', message: 'Start date is required.' });
        return;
      }
      if (!values.endDate) {
        form.setError('endDate', { type: 'manual', message: 'End date is required.' });
        return;
      }
      if (new Date(values.endDate) < new Date(values.startDate)) {
        form.setError('endDate', { type: 'manual', message: 'End date must be after or on the same day as the start date.' });
        return;
      }

      if (values.projectManagerId) {
        const pmUser = users.find(u => u.id === values.projectManagerId);
        if (pmUser && !isAssignableToProject(pmUser)) {
          toast({
            variant: 'destructive',
            title: 'Assignment Prohibited',
            description: 'Super Admin and Administrator users cannot be assigned to projects, even as Project Manager.',
          });
          return;
        }
      }

      if (editingProject) {
        const projectRef = doc(db, 'projects', editingProject.id);
        const updateData: any = {
          portfolioId: values.portfolioId,
          name: values.name,
          pricingModel: values.pricingModel as PricingModel | undefined,
          status: values.status as ProjectStatus | undefined,
          startDate: new Date(values.startDate).toISOString(),
          endDate: new Date(values.endDate).toISOString(),
          projectManagerId: values.projectManagerId || null,
        };
        if (values.status === 'Not Started' || values.status === 'Initial Estimation') {
          updateData.overallStatus = null;
          updateData.scopeStatus = null;
          updateData.costStatus = null;
          updateData.timeStatus = null;
          updateData.statusComments = '';
        }

        // Projects with status other than Initial Estimation or Active can be inactive
        if (values.status !== 'Initial Estimation' && values.status !== 'Active') {
          if (values.isArchived !== undefined) {
            updateData.isArchived = values.isArchived;
            updateData.archivedAt = values.isArchived ? (editingProject.archivedAt || new Date().toISOString()) : null;
          }
        } else {
          // If status is Initial Estimation or Active, it cannot be inactive
          updateData.isArchived = false;
          updateData.archivedAt = null;
        }

        await updateDoc(projectRef, updateData);
        toast({ title: 'Success', description: 'Project updated successfully.' });
      } else {
        const { projectManagerId, ...restValues } = values;
        const dataToSave: Partial<Project> = {
          ...restValues,
          pricingModel: restValues.pricingModel as PricingModel | undefined,
          status: restValues.status as ProjectStatus | undefined,
          startDate: new Date(values.startDate).toISOString(),
          endDate: new Date(values.endDate).toISOString(),
        };

        if (projectManagerId) {
          dataToSave.projectManagerId = projectManagerId;
        }

        const projectsSnapshot = await getDocs(collection(db, 'projects'));
        const currentYear = new Date().getFullYear().toString().slice(-2);

        const projectsFromThisYear = projectsSnapshot.docs
          .map((doc: any) => doc.id)
          .filter((id: string) => id.startsWith(`P${currentYear}`));

        const newIdNumber = projectsFromThisYear.length > 0
          ? Math.max(...projectsFromThisYear.map((id: string) => parseInt(id.substring(3), 10))) + 1
          : 1;

        const projectId = `P${currentYear}${newIdNumber.toString().padStart(5, '0')}`;
        const newProjectRef = doc(db, 'projects', projectId);
        await setDoc(newProjectRef, { ...dataToSave, id: projectId, isDeleted: false });

        // Automatically create project distro (distro name is project ID)
        try {
          const distroRef = doc(db, 'distros', projectId);
          await setDoc(distroRef, {
            id: projectId,
            name: projectId,
            projectId: projectId,
            projectName: dataToSave.name || '',
            createdAt: new Date().toISOString(),
          });
        } catch (distroErr) {
          console.warn('Failed to auto-create distro record:', distroErr);
        }

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
    if (!deletingProject || !db) return;
    try {
      // Soft delete the project
      const projectRef = doc(db!, 'projects', deletingProject.id);
      await updateDoc(projectRef, { isDeleted: true, deletedAt: Timestamp.now() });
      toast({ title: 'Success', description: `Project "${deletingProject.name}" moved to Trash.` });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not delete project.' });
    } finally {
      setDeletingProject(null);
    }
  };

  const handleArchiveProject = async () => {
    if (!archivingProject || !db) return;
    if (archivingProject.status === 'Initial Estimation' || archivingProject.status === 'Active') {
      toast({
        variant: 'destructive',
        title: 'Cannot Mark Inactive',
        description: 'Projects with status Initial Estimation or Active cannot be moved to inactive.',
      });
      setArchivingProject(null);
      return;
    }
    try {
      const projectRef = doc(db, 'projects', archivingProject.id);
      await updateDoc(projectRef, { isArchived: true, archivedAt: new Date().toISOString() });
      toast({ title: 'Success', description: `Project "${archivingProject.name}" marked as inactive.` });
    } catch (error) {
      console.error('Error marking project inactive:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not mark project as inactive.' });
    } finally {
      setArchivingProject(null);
    }
  };

  const handleRestoreProject = async (project: Project) => {
    if (!db) return;
    try {
      const projectRef = doc(db, 'projects', project.id);
      await updateDoc(projectRef, { isArchived: false, archivedAt: null, status: 'Active' });
      toast({ title: 'Success', description: `Project "${project.name}" reactivated successfully.` });
    } catch (error) {
      console.error('Error reactivating project:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not reactivate project.' });
    }
  };

  const handleOpenDialog = (project: Project | null) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  const handleEditPortfolio = (portfolio: Portfolio) => {
    setEditingPortfolio(portfolio);
    setIsPortfolioDialogOpen(true);
  };


  const handleSort = (columnId: string) => {
    if (sorting?.id === columnId) {
      setSorting({ ...sorting, desc: !sorting.desc });
    } else {
      setSorting({ id: columnId, desc: false });
    }
  };

  const getProjectsByPortfolio = useCallback((tab: ProjectDashboardTab) => {
    const userMap = new Map(users.map(u => [u.id, u]));
    const portfolioIds = new Set(portfolios.map(p => p.id));

    const sortProjects = (list: Project[]) => {
      if (!sorting) return list;
      return [...list].sort((a, b) => {
        let valA: any, valB: any;
        if (sorting.id === 'projectManagerId') {
          const pmA = userMap.get(a.projectManagerId || '');
          const pmB = userMap.get(b.projectManagerId || '');
          valA = pmA ? `${pmA.firstName} ${pmA.lastName}` : 'zzz';
          valB = pmB ? `${pmB.firstName} ${pmB.lastName}` : 'zzz';
        } else if (sorting.id === 'pricingModel') {
          valA = a.pricingModel || 'T&M';
          valB = b.pricingModel || 'T&M';
        } else {
          valA = (a as any)[sorting.id] || '';
          valB = (b as any)[sorting.id] || '';
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          const comparison = valA.localeCompare(valB, undefined, { numeric: true });
          return sorting.desc ? -comparison : comparison;
        }

        if (valA < valB) return sorting.desc ? 1 : -1;
        if (valA > valB) return sorting.desc ? -1 : 1;
        return 0;
      });
    };

    const matchesSearch = (p: Project) => (
      p.name.toLowerCase().includes(filterText.toLowerCase()) ||
      p.id.toLowerCase().includes(filterText.toLowerCase()) ||
      (p.summary && p.summary.toLowerCase().includes(filterText.toLowerCase()))
    );

    const result = portfolios.map(portfolio => {
      let filtered = projects.filter(p => (
        matchesProjectTab(p, tab) &&
        p.portfolioId === portfolio.id &&
        matchesSearch(p)
      ));
      return { ...portfolio, projects: sortProjects(filtered) };
    });

    // Check for any unassigned or general projects
    const unassigned = projects.filter(p => (
      matchesProjectTab(p, tab) &&
      (!p.portfolioId || !portfolioIds.has(p.portfolioId)) &&
      matchesSearch(p)
    ));

    if (unassigned.length > 0) {
      result.push({
        id: 'unassigned-portfolio',
        name: 'General Projects',
        description: 'Projects not assigned to a specific portfolio',
        projects: sortProjects(unassigned),
      } as any);
    }

    return result;
  }, [users, portfolios, projects, filterText, sorting]);

  const activeProjectsByPortfolio = useMemo(() => getProjectsByPortfolio('active'), [getProjectsByPortfolio]);
  const estimatesProjectsByPortfolio = useMemo(() => getProjectsByPortfolio('initial-estimates'), [getProjectsByPortfolio]);
  const archivedProjectsByPortfolio = useMemo(() => getProjectsByPortfolio('archive'), [getProjectsByPortfolio]);

  // Automatically expand all populated portfolios on initial data load
  const [hasInitializedActiveExpanded, setHasInitializedActiveExpanded] = useState(false);
  useEffect(() => {
    if (!hasInitializedActiveExpanded && activeProjectsByPortfolio.some(p => p.projects.length > 0)) {
      setActiveExpanded(activeProjectsByPortfolio.filter(p => p.projects.length > 0).map(p => p.id));
      setHasInitializedActiveExpanded(true);
    }
  }, [activeProjectsByPortfolio, hasInitializedActiveExpanded]);

  const [hasInitializedEstimatesExpanded, setHasInitializedEstimatesExpanded] = useState(false);
  useEffect(() => {
    if (!hasInitializedEstimatesExpanded && estimatesProjectsByPortfolio.some(p => p.projects.length > 0)) {
      setEstimatesExpanded(estimatesProjectsByPortfolio.filter(p => p.projects.length > 0).map(p => p.id));
      setHasInitializedEstimatesExpanded(true);
    }
  }, [estimatesProjectsByPortfolio, hasInitializedEstimatesExpanded]);

  // Automatically expand portfolios when actively searching/filtering so matching results are visible
  useEffect(() => {
    if (filterText.trim()) {
      const matchingActive = activeProjectsByPortfolio
        .filter(p => p.projects.length > 0)
        .map(p => p.id);
      const matchingEstimates = estimatesProjectsByPortfolio
        .filter(p => p.projects.length > 0)
        .map(p => p.id);
      const matchingArchive = archivedProjectsByPortfolio
        .filter(p => p.projects.length > 0)
        .map(p => p.id);
      setActiveExpanded(matchingActive);
      setEstimatesExpanded(matchingEstimates);
      setArchiveExpanded(matchingArchive);
    }
  }, [filterText, activeProjectsByPortfolio, estimatesProjectsByPortfolio, archivedProjectsByPortfolio]);

  const SortableHeader = ({ columnId, children, className }: { columnId: string; children: React.ReactNode, className?: string; }) => (
    <TableHead className={className}>
      <Button variant="ghost" className="-ml-4 px-4" onClick={() => handleSort(columnId)}>
        {children}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  return (
    <TooltipProvider>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <PageHeader title="Project Home" description="Manage all your portfolios and projects.">
          <div className="flex gap-2">
            <Button onClick={() => setIsPortfolioDialogOpen(true)}>
              <Folder className="mr-2 h-4 w-4" />
              New Portfolio
            </Button>
            <Button onClick={() => handleOpenDialog(null)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
        </PageHeader>

        <Dialog open={isPortfolioDialogOpen} onOpenChange={(open) => { setIsPortfolioDialogOpen(open); if (!open) setEditingPortfolio(null); }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingPortfolio ? 'Edit Portfolio' : 'Create New Portfolio'}</DialogTitle>
            </DialogHeader>
            <Form {...portfolioForm}>
              <form onSubmit={portfolioForm.handleSubmit(onPortfolioSubmit)} className="space-y-4">
                <FormField
                  control={portfolioForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portfolio Name</FormLabel>
                      <FormControl>
                        <Input placeholder="E.g., Q1 Strategic Initiatives" {...field} maxLength={60} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={portfolioForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe the portfolio..." {...field} maxLength={300} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">{editingPortfolio ? 'Save Changes' : 'Create Portfolio'}</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <ProjectDialogContent
            form={form}
            onSubmit={onSubmit}
            editingProject={editingProject}
            portfolios={portfolios}
            users={users}
          />
        </Dialog>

        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as ProjectDashboardTab)} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active Projects</TabsTrigger>
            <TabsTrigger value="initial-estimates">Initial Estimates</TabsTrigger>
            <TabsTrigger value="archive">Inactive Projects</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <Card>
              <CardContent className="p-4">
                <Input
                  placeholder="Filter active projects..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="max-w-sm"
                />
              </CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Loading projects...</span>
                </div>
              ) : activeProjectsByPortfolio.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed rounded-lg m-4 bg-muted/20">
                  <Folder className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <h3 className="text-base font-semibold mb-1">No portfolios or projects found</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">
                    Get started by creating your first portfolio or project, or use the Test Data Studio in Portfolio Settings to populate sample data.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button onClick={() => setIsPortfolioDialogOpen(true)}>
                      <Folder className="mr-2 h-4 w-4" />
                      New Portfolio
                    </Button>
                    <Button variant="outline" onClick={() => handleOpenDialog(null)}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      New Project
                    </Button>
                  </div>
                </div>
              ) : (
                <Accordion type="multiple" value={activeExpanded} onValueChange={setActiveExpanded} className="w-full">
                  {activeProjectsByPortfolio.map(portfolio => (
                    <AccordionItem value={portfolio.id} key={portfolio.id} className="group">
                      <AccordionTrigger className="px-6 py-4 bg-muted/50 hover:bg-muted/80" hideChevron>
                        <div className="flex items-center gap-4 flex-1">
                          <ChevronRight className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                          <Folder className="h-5 w-5" />
                          <span className="font-semibold">{portfolio.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{portfolio.projects.length} {portfolio.projects.length === 1 ? 'project' : 'projects'}</Badge>
                            {(() => {
                              const stats = getPortfolioProjectStats(portfolio.id);
                              if (stats.inactive > 0) {
                                return (
                                  <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-500">
                                    {stats.inactive} inactive
                                  </Badge>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          {portfolio.id !== 'unassigned-portfolio' && (
                            <div className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                                    onClick={() => handleEditPortfolio(portfolio)}
                                    aria-label={`Edit ${portfolio.name}`}
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Edit portfolio</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className={cn(
                                      "inline-flex items-center justify-center h-7 w-7 rounded-md transition-colors",
                                      getPortfolioProjectCount(portfolio.id) > 0
                                        ? "text-muted-foreground/40 hover:text-muted-foreground/60 cursor-not-allowed"
                                        : "hover:bg-accent hover:text-destructive cursor-pointer"
                                    )}
                                    onClick={() => setDeletingPortfolio(portfolio)}
                                    aria-label={`Delete ${portfolio.name}`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {(() => {
                                    const stats = getPortfolioProjectStats(portfolio.id);
                                    if (stats.total === 0) return 'Delete empty portfolio';
                                    if (stats.active === 0 && stats.inactive > 0) {
                                      return `Cannot delete: contains ${stats.inactive} inactive project${stats.inactive === 1 ? '' : 's'} (under Inactive Projects tab). Only empty portfolios can be deleted.`;
                                    }
                                    if (stats.active > 0 && stats.inactive > 0) {
                                      return `Cannot delete: contains ${stats.total} projects (${stats.active} active, ${stats.inactive} inactive). Only empty portfolios can be deleted.`;
                                    }
                                    return `Cannot delete: contains ${stats.active} active project${stats.active === 1 ? '' : 's'}. Only empty portfolios can be deleted.`;
                                  })()}
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-0">
                        {portfolio.projects.length > 0 ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <SortableHeader columnId="id" className="w-[120px]">Project ID</SortableHeader>
                                <SortableHeader columnId="name">Project Name</SortableHeader>
                                <TableHead className="w-[90px]">Health</TableHead>
                                <SortableHeader columnId="pricingModel">Pricing Model</SortableHeader>
                                <SortableHeader columnId="status">Status</SortableHeader>
                                <SortableHeader columnId="projectManagerId">Project Manager</SortableHeader>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {portfolio.projects.map((project) => {
                                const projectManager = users.find(u => u.id === project.projectManagerId);
                                const projectUrl = (project.status === 'Initial Estimation' || project.status === 'Not Started')
                                  ? `/projects/${project.id}/initial-estimation/specifications`
                                  : `/projects/${project.id}/development/dashboard`;
                                return (
                                  <TableRow key={project.id}>
                                    <TableCell className="font-medium">
                                      <Link href={projectUrl} className="block w-full h-full hover:underline">
                                        {project.id}
                                      </Link>
                                    </TableCell>
                                    <TableCell>
                                      <Link href={projectUrl} className="block w-full h-full">
                                        <div className="hover:underline font-medium">{project.name}</div>
                                        {project.summary && (
                                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2" title={project.summary}>
                                            {project.summary}
                                          </div>
                                        )}
                                      </Link>
                                    </TableCell>
                                    <TableCell>
                                      {project.status === 'Not Started' || project.status === 'Initial Estimation' || !project.overallStatus ? (
                                        <span className="text-xs text-muted-foreground font-medium pl-3">—</span>
                                      ) : (
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <button
                                              type="button"
                                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer border border-transparent hover:border-border"
                                              title={`Project Health: ${project.overallStatus}. Click to view details.`}
                                            >
                                              <div className={cn("h-3 w-3 rounded-full shrink-0", ragStatusStyles[project.overallStatus])} />
                                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground opacity-70" />
                                            </button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-96 p-4">
                                            <div className="space-y-3">
                                              <div className="flex items-center justify-between border-b pb-2">
                                                <div className="flex items-center gap-2">
                                                  <div className={cn("h-3 w-3 rounded-full shrink-0", ragStatusStyles[project.overallStatus])} />
                                                  <span className="text-sm font-semibold">{project.overallStatus}</span>
                                                </div>
                                                <Badge variant="outline" className="text-xs font-normal">Overall Health</Badge>
                                              </div>

                                              {project.statusComments ? (
                                                <div className="text-xs text-foreground bg-muted/40 p-2.5 rounded-md border">
                                                  <span className="text-[10px] uppercase font-semibold text-muted-foreground block mb-1">Status Comments</span>
                                                  <p className="whitespace-pre-wrap">{project.statusComments}</p>
                                                </div>
                                              ) : (
                                                <p className="text-xs text-muted-foreground italic">No comments recorded.</p>
                                              )}

                                              <div className="flex gap-4 border-b pb-2 pt-1">
                                                <HealthIndicator status={project.scopeStatus} label="Scope" />
                                                <HealthIndicator status={project.costStatus} label="Cost" />
                                                <HealthIndicator status={project.timeStatus} label="Time" />
                                              </div>

                                              {project.statusHistory && project.statusHistory.length > 0 && (
                                                <Accordion type="single" collapsible className="w-full">
                                                  <AccordionItem value="history" className="border-none">
                                                    <AccordionTrigger className="py-1 text-xs font-medium hover:no-underline">Status History ({project.statusHistory.length})</AccordionTrigger>
                                                    <AccordionContent>
                                                      <div className="max-h-56 overflow-y-auto pr-2 space-y-2 mt-1">
                                                        {[...project.statusHistory].reverse().map((historyItem, idx) => (
                                                          <div key={idx} className="text-xs p-2.5 bg-muted/50 rounded-md border">
                                                            <div className="flex justify-between items-center mb-1.5 text-muted-foreground border-b pb-1">
                                                              <span>{format(parseISO(historyItem.date), 'MMM dd, yyyy HH:mm')}</span>
                                                              {historyItem.overallStatus && <HealthIndicator status={historyItem.overallStatus} label={historyItem.overallStatus} />}
                                                            </div>
                                                            {historyItem.statusComments ? (
                                                              <p className="mt-1 text-foreground">{historyItem.statusComments}</p>
                                                            ) : (
                                                              <p className="mt-1 text-muted-foreground italic">No comments</p>
                                                            )}
                                                          </div>
                                                        ))}
                                                      </div>
                                                    </AccordionContent>
                                                  </AccordionItem>
                                                </Accordion>
                                              )}
                                            </div>
                                          </PopoverContent>
                                        </Popover>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Link href={projectUrl} className="block w-full h-full">
                                        <span className="text-xs font-medium">
                                          {project.pricingModel || 'T&M'}
                                        </span>
                                      </Link>
                                    </TableCell>
                                    <TableCell>
                                      <Link href={projectUrl} className="block w-full h-full">
                                        {project.status ? (
                                          <Badge className={cn('font-semibold', statusStyles[project.status])}>
                                            {project.status}
                                          </Badge>
                                        ) : 'N/A'}
                                      </Link>
                                    </TableCell>
                                    <TableCell>
                                      <Link href={projectUrl} className="block w-full h-full">
                                        {projectManager ? (
                                          <span>{projectManager.firstName} {projectManager.lastName}</span>
                                        ) : 'Unassigned'}
                                      </Link>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        {project.status !== 'Initial Estimation' && project.status !== 'Active' && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button variant="ghost" size="icon" onClick={() => setArchivingProject(project)}>
                                                <Archive className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Mark Inactive</TooltipContent>
                                          </Tooltip>
                                        )}
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(project)}>
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setDeletingProject(project)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="text-center p-4 text-sm text-muted-foreground">
                            No active projects found for this portfolio.
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="initial-estimates">
            <Card>
              <CardContent className="p-4">
                <Input
                  placeholder="Filter initial estimates..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="max-w-sm"
                />
              </CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Loading initial estimates...</span>
                </div>
              ) : estimatesProjectsByPortfolio.filter(p => p.projects.length > 0).length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed rounded-lg m-4 bg-muted/20">
                  <Folder className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <h3 className="text-base font-semibold mb-1">No initial estimate projects</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Projects in initial estimation will appear here.
                  </p>
                </div>
              ) : (
                <Accordion type="multiple" value={estimatesExpanded} onValueChange={setEstimatesExpanded} className="w-full">
                  {estimatesProjectsByPortfolio.map(portfolio => {
                    if (portfolio.projects.length === 0) return null;
                    return (
                      <AccordionItem value={portfolio.id} key={portfolio.id} className="group">
                        <AccordionTrigger className="px-6 py-4 bg-muted/50 hover:bg-muted/80" hideChevron>
                          <div className="flex items-center gap-4 flex-1">
                            <ChevronRight className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                            <Folder className="h-5 w-5 text-purple-400" />
                            <span className="font-semibold">{portfolio.name}</span>
                            <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border border-purple-500/30">
                              {portfolio.projects.length} {portfolio.projects.length === 1 ? 'project' : 'projects'}
                            </Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <SortableHeader columnId="id" className="w-[120px]">Project ID</SortableHeader>
                                <SortableHeader columnId="name">Project Name</SortableHeader>
                                <TableHead className="w-[90px]">Health</TableHead>
                                <SortableHeader columnId="pricingModel">Pricing Model</SortableHeader>
                                <SortableHeader columnId="status">Status</SortableHeader>
                                <SortableHeader columnId="projectManagerId">Project Manager</SortableHeader>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {portfolio.projects.map((project) => {
                                const projectManager = users.find(u => u.id === project.projectManagerId);
                                const projectUrl = `/projects/${project.id}/initial-estimation/specifications`;
                                return (
                                  <TableRow key={project.id}>
                                    <TableCell className="font-medium">
                                      <Link href={projectUrl} className="block w-full h-full hover:underline">
                                        {project.id}
                                      </Link>
                                    </TableCell>
                                    <TableCell>
                                      <Link href={projectUrl} className="block w-full h-full">
                                        <div className="hover:underline font-medium">{project.name}</div>
                                        {project.summary && (
                                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2" title={project.summary}>
                                            {project.summary}
                                          </div>
                                        )}
                                      </Link>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-xs text-muted-foreground font-medium pl-3">—</span>
                                    </TableCell>
                                    <TableCell>
                                      <Link href={projectUrl} className="block w-full h-full">
                                        <span className="text-xs font-medium">
                                          {project.pricingModel || 'T&M'}
                                        </span>
                                      </Link>
                                    </TableCell>
                                    <TableCell>
                                      <Link href={projectUrl} className="block w-full h-full">
                                        {project.status ? (
                                          <Badge className={cn('font-semibold', statusStyles[project.status])}>
                                            {project.status}
                                          </Badge>
                                        ) : 'N/A'}
                                      </Link>
                                    </TableCell>
                                    <TableCell>
                                      <Link href={projectUrl} className="block w-full h-full">
                                        {projectManager ? (
                                          <span>{projectManager.firstName} {projectManager.lastName}</span>
                                        ) : 'Unassigned'}
                                      </Link>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(project)} title="Edit Project">
                                          <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => setDeletingProject(project)} title="Delete Project">
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="archive">
            <Card>
              <CardContent className="p-4">
                <Input
                  placeholder="Filter inactive projects..."
                  value={filterText}
                  onChange={(e) => setFilterText(e.target.value)}
                  className="max-w-sm"
                />
              </CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center p-8 text-muted-foreground gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>Loading inactive projects...</span>
                </div>
              ) : archivedProjectsByPortfolio.filter(p => p.projects.length > 0).length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed rounded-lg m-4 bg-muted/20">
                  <Archive className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <h3 className="text-base font-semibold mb-1">No inactive projects</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Projects that are marked inactive will appear here.
                  </p>
                </div>
              ) : (
                <Accordion type="multiple" value={archiveExpanded} onValueChange={setArchiveExpanded} className="w-full">
                  {archivedProjectsByPortfolio.map(portfolio => {
                    if (portfolio.projects.length === 0) return null; // Only show portfolios with inactive projects
                    return (
                      <AccordionItem value={portfolio.id} key={portfolio.id} className="group">
                        <AccordionTrigger className="px-6 py-4 bg-muted/50 hover:bg-muted/80" hideChevron>
                          <div className="flex items-center gap-4 flex-1">
                            <ChevronRight className="h-5 w-5 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                            <Folder className="h-5 w-5 text-muted-foreground" />
                            <span className="font-semibold text-muted-foreground">{portfolio.name}</span>
                            <Badge variant="outline">{portfolio.projects.length} {portfolio.projects.length === 1 ? 'inactive project' : 'inactive projects'}</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-0">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <SortableHeader columnId="id" className="w-[120px]">Project ID</SortableHeader>
                                <SortableHeader columnId="name">Project Name</SortableHeader>
                                <SortableHeader columnId="pricingModel">Pricing Model</SortableHeader>
                                <SortableHeader columnId="status">Status</SortableHeader>
                                <SortableHeader columnId="archivedAt">Inactive Since</SortableHeader>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {portfolio.projects.map((project) => {
                                return (
                                  <TableRow key={project.id} className="opacity-70 grayscale">
                                    <TableCell className="font-medium">{project.id}</TableCell>
                                    <TableCell>{project.name}</TableCell>
                                    <TableCell>
                                      <span className="text-xs font-medium">{project.pricingModel || 'T&M'}</span>
                                    </TableCell>
                                    <TableCell>
                                      {project.status ? (
                                        <Badge className={cn('font-semibold', statusStyles[project.status])}>
                                          {project.status}
                                        </Badge>
                                      ) : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                      {project.archivedAt ? format(parseISO(project.archivedAt), 'MMM dd, yyyy') : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex items-center justify-end gap-1">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => handleRestoreProject(project)}>
                                              <RotateCcw className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Reactivate Project</TooltipContent>
                                        </Tooltip>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" onClick={() => setDeletingProject(project)}>
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Delete permanently</TooltipContent>
                                        </Tooltip>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <AlertDialog open={!!deletingProject} onOpenChange={(isOpen) => !isOpen && setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the project &quot;{deletingProject?.name}&quot; to the Trash. It will be permanently deleted after 30 days.
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
      <AlertDialog open={!!archivingProject} onOpenChange={(isOpen) => !isOpen && setArchivingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Project as Inactive</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark &quot;{archivingProject?.name}&quot; as inactive? You can reactivate it at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveProject}
            >
              Mark Inactive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deletingPortfolio} onOpenChange={(isOpen) => !isOpen && setDeletingPortfolio(null)}>
        <AlertDialogContent>
          {deletingPortfolio && getPortfolioProjectCount(deletingPortfolio.id) > 0 ? (
            (() => {
              const stats = getPortfolioProjectStats(deletingPortfolio.id);
              return (
                <>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      Cannot Delete Portfolio
                    </AlertDialogTitle>
                    <AlertDialogDescription className="space-y-2 pt-1 text-sm text-muted-foreground">
                      <span>
                        The portfolio <strong className="text-foreground">&quot;{deletingPortfolio.name}&quot;</strong> cannot be deleted because it contains{' '}
                        <strong className="text-foreground">
                          {(() => {
                            const parts: string[] = [];
                            if (stats.active > 0) parts.push(`${stats.active} active`);
                            if (stats.initialEstimates > 0) parts.push(`${stats.initialEstimates} initial estimate${stats.initialEstimates === 1 ? '' : 's'}`);
                            if (stats.inactive > 0) parts.push(`${stats.inactive} inactive`);
                            return `${stats.total} project${stats.total === 1 ? '' : 's'} (${parts.join(', ')})`;
                          })()}
                        </strong>.
                      </span>
                      {stats.inactive > 0 && (
                        <span className="block text-xs text-amber-500 font-medium">
                          {stats.inactive === 1 ? 'An inactive project is' : `${stats.inactive} inactive projects are`} stored under the &quot;Inactive Projects&quot; tab.
                        </span>
                      )}
                      <span className="block text-xs text-muted-foreground/90">
                        Only empty portfolios can be deleted. Please reassign or delete all projects belonging to this portfolio before deleting it.
                      </span>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="flex-row items-center justify-end gap-2">
                    <AlertDialogCancel onClick={() => setDeletingPortfolio(null)}>Close</AlertDialogCancel>
                    {stats.inactive > 0 && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          const targetPortfolioId = deletingPortfolio.id;
                          setDeletingPortfolio(null);
                          setActiveTab('archive');
                          setArchiveExpanded((prev) => Array.from(new Set([...prev, targetPortfolioId])));
                        }}
                      >
                        View Inactive Projects
                      </Button>
                    )}
                  </AlertDialogFooter>
                </>
              );
            })()
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Portfolio?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to move the empty portfolio &quot;{deletingPortfolio?.name}&quot; to the Trash? It will be permanently deleted after 30 days.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeletePortfolio}
                  className={cn(buttonVariants({ variant: 'destructive' }))}
                >
                  Move to Trash
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}







